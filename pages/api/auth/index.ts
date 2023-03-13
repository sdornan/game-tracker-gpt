import { Redis } from '@upstash/redis'
import { OAuth2Client, TokenPayload } from 'google-auth-library'
import { NextApiRequest, NextApiResponse } from 'next'

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    let userId

    if (!req.body.idToken) {
      res.status(400).json({ message: 'Missing idToken parameter' })
      return
    }

    if (!req.body.accessToken) {
      res.status(400).json({ message: 'Missing accessToken parameter' })
      return
    }

    try {
      const ticket = await client.verifyIdToken({
        idToken: req.body.idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      })
      const payload = ticket.getPayload() as TokenPayload

      userId = payload['sub']
    } catch (error) {
      res.status(401).json({ message: 'Invalid token' })
      return
    }

    // If they get this far, they're authenticated

    const accessToken = req.body.accessToken

    // Store access token for one day
    redis.setex(`accessToken:${accessToken}`, 60 * 60 * 24, userId)

    res.status(200).json({ userId })
  }
}
