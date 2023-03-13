import { fetchTwitchAppAccessToken } from '@/lib/helpers'
import igdb from 'igdb-api-node'
import { NextApiRequest, NextApiResponse } from 'next'
import relevancy from 'relevancy'

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<any> {
  if (req.method === 'POST') {
    delete req.cookies.twitchAppAccessToken

    let twitchAppAccessToken = req.cookies.twitchAppAccessToken

    if (!twitchAppAccessToken) {
      twitchAppAccessToken = await fetchTwitchAppAccessToken()
      res.setHeader('Set-Cookie', `twitchAppAccessToken=${twitchAppAccessToken}`)
    }

    const { name } = req.body
    if (!name) {
      return res.status(400).json({ message: 'Missing name parameter' })
    }

    const _makeIgdbRequest = async () => {
      const client = igdb(process.env.TWITCH_CLIENT_ID, twitchAppAccessToken)

      const response = await client
        .fields(['id', 'name', 'slug', 'rating_count', 'cover.image_id'])
        .where('version_parent = null & category = 0')
        .search(name)
        .request('/games')

      response.data = response.data.map((g) => ({
        ...g,
        relevancy: relevancy.weight(name, g.name),
      }))

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
