import { fetchTwitchAppAccessToken } from '@/lib/helpers'
import igdb from 'igdb-api-node'
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<any> {
  if (req.method === 'POST') {
    delete req.cookies.twitchAppAccessToken

    let twitchAppAccessToken = req.cookies.twitchAppAccessToken

    if (!twitchAppAccessToken) {
      twitchAppAccessToken = await fetchTwitchAppAccessToken()
      res.setHeader('Set-Cookie', `twitchAppAccessToken=${twitchAppAccessToken}`)
    }

    const id = req.body.id

    if (!id) {
      return res.status(400).json({ message: 'Missing id parameter' })
    }

    const _makeIgdbRequest = async () => {
      const client = igdb(process.env.TWITCH_CLIENT_ID, twitchAppAccessToken)

      const response = await client
        .fields(['id', 'name', 'slug', 'rating_count', 'cover.image_id'])
        .where(`id = (${id.join(',')})`)
        .limit(500)
        .request('/games')

      return response
    }

    try {
      const response = await _makeIgdbRequest()

      return res.status(200).json(response.data)
    } catch (error: any) {
      if (error?.status === 401) {
        twitchAppAccessToken = await fetchTwitchAppAccessToken()
        const response = await _makeIgdbRequest()
        res.status(200).json(response.data)
      } else {
        res.status(error.status || 500).json(error.response.data || 'Something went wrong')
      }
    }
  }
}
