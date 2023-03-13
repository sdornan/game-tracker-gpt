import { ResponseError } from '@/interfaces'
import { withAuth } from '@/lib/helpers'
import { Redis } from '@upstash/redis'
import { NextApiRequest, NextApiResponse } from 'next'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any | ResponseError>,
  userId: string
) {
  if (req.method === 'GET') {
    const collection = await redis.zrange(`user:${userId}:collection`, 0, -1, {
      withScores: true,
    })

    const gameIds = collection.filter((_, index) => index % 2 === 0)
    const ratings = collection.filter((_, index) => index % 2 === 1)

    const games = gameIds.map((gameId, index) => ({ gameId, rating: ratings[index] }))

    console.log(games)

    res.status(200).json(games)
  } else if (req.method === 'POST' || req.method === 'PUT') {
    const { gameId, rating } = req.body

    if (!gameId) {
      res.status(400).json({ message: 'Missing gameId' })
      return
    }

    await redis.zadd(`user:${userId}:collection`, {
      score: rating ?? 0,
      member: gameId,
    })

    res.status(201).json({ gameId, rating })
  } else if (req.method === 'DELETE') {
    const { gameId } = req.body

    if (!gameId) {
      res.status(400).json({ message: 'Missing gameId' })
      return
    }

    const numGamesRemoved = await redis.zrem(`user:${userId}:collection`, gameId)

    res.status(200).json(numGamesRemoved)
  }
}

export default withAuth(handler)
