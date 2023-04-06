import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, GetCommandInput } from '@aws-sdk/lib-dynamodb'
import { NextApiRequest, NextApiResponse } from 'next'

const dynamoDb = new DynamoDBClient({})
const ddbDocClient = DynamoDBDocumentClient.from(dynamoDb)

type HandlerFunction = (req: NextApiRequest, res: NextApiResponse, userId: string) => Promise<void>

const getUserIdFromAccessToken = async (accessToken: string): Promise<string | null> => {
  const params: GetCommandInput = {
    TableName: process.env.ACCESS_TOKEN_TABLE_NAME,
    Key: {
      accessToken,
    },
  }

  const command = new GetCommand(params)
  const { Item } = await ddbDocClient.send(command)

  return Item?.userId || null
}

export const withAuth =
  (handler: HandlerFunction) => async (req: NextApiRequest, res: NextApiResponse) => {
    const authHeader = req.headers.authorization
    const accessToken = authHeader?.split(' ')?.[1]

    if (!accessToken) {
      res.status(401).json({ message: 'Missing authorization header' })
      return
    }

    const userId = await getUserIdFromAccessToken(accessToken)

    if (!userId) {
      res.status(401).json({ message: 'Invalid access token' })
      return
    }

    return handler(req, res, userId)
  }

export const fetchTwitchAppAccessToken = async () => {
  const response = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: process.env.TWITCH_CLIENT_ID,
      client_secret: process.env.TWITCH_CLIENT_SECRET,
      grant_type: 'client_credentials',
    }),
  })

  const data = await response.json()
  return data.access_token
}
