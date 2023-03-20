import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    let userId: string

    if (!req.body.idToken) {
      res.status(400).json({ message: 'Missing idToken parameter' })
      return
    }

    if (!req.body.accessToken) {
      res.status(400).json({ message: 'Missing accessToken parameter' })
      return
    }

    if (!req.body.issuedAt) {
      res.status(400).json({ message: 'Missing issuedAt parameter' })
    }

    if (!req.body.expiresIn) {
      res.status(400).json({ message: 'Missing expiresIn parameter' })
    }

    const { idToken, accessToken, issuedAt, expiresIn } = req.body as AuthRequest

    try {
      const ticket = await oAuth2Client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      })
      const payload = ticket.getPayload() as TokenPayload

      userId = payload.sub
    } catch (error) {
      res.status(401).json({ message: 'Invalid token' })
      return
    }

    // If they get this far, they're authenticated

    // Store access token until expiration
    const expiresAt = issuedAt + expiresIn

    const params = {
      TableName: process.env.ACCESS_TOKEN_TABLE_NAME,
      Item: {
        accessToken,
        userId,
        expiresAt,
      },
    }

    const command = new PutCommand(params)

    await ddbDocClient.send(command)

    res.status(200).json({ userId })
  }
}
