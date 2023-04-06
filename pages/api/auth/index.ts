import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, PutCommandInput } from '@aws-sdk/lib-dynamodb'
import { OAuth2Client, TokenPayload } from 'google-auth-library'
import { NextApiRequest, NextApiResponse } from 'next'

const oAuth2Client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

const dynamoDb = new DynamoDBClient({})
const ddbDocClient = DynamoDBDocumentClient.from(dynamoDb)

type AuthRequest = {
  idToken: string
  accessToken: string
  issuedAt: number
  expiresIn: number
}

const verifyIdToken = async (idToken: string): Promise<string> => {
  const ticket = await oAuth2Client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  })
  const payload = ticket.getPayload() as TokenPayload
  return payload.sub
}

const storeAccessToken = async (
  userId: string,
  accessToken: string,
  issuedAt: number,
  expiresIn: number
) => {
  const expiresAt = issuedAt + expiresIn

  const params: PutCommandInput = {
    TableName: process.env.ACCESS_TOKEN_TABLE_NAME,
    Item: {
      accessToken,
      userId,
      expiresAt,
    },
  }

  const command = new PutCommand(params)
  await ddbDocClient.send(command)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { idToken, accessToken, issuedAt, expiresIn } = req.body as AuthRequest

    if (!idToken || !accessToken || !issuedAt || !expiresIn) {
      res.status(400).json({ message: 'Missing parameters' })
      return
    }

    try {
      const userId = await verifyIdToken(idToken)
      await storeAccessToken(userId, accessToken, issuedAt, expiresIn)
      res.status(200).json({ userId })
    } catch (error) {
      res.status(401).json({ message: 'Invalid token' })
    }
  } else {
    res.setHeader('Allow', ['POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
