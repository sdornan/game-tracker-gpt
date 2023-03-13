import { Redis } from '@upstash/redis'
import { NextApiRequest, NextApiResponse } from 'next'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export const withAuth = (handler: any) => async (req: NextApiRequest, res: NextApiResponse) => {
  const authHeader = req.headers.authorization

  const accessToken = authHeader?.split(' ')?.[1]

  if (!accessToken) {
    res.status(401).json({ message: 'Missing authorization header' })
    return
  }

  const userId = await redis.get(`accessToken:${accessToken}`)

  console.log(userId)

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
