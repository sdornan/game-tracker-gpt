import { fetchTwitchAppAccessToken } from '@/lib/helpers'
import igdb from 'igdb-api-node'
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<any> {
  if (req.method === 'GET') {
    delete req.cookies.twitchAppAccessToken

    let twitchAppAccessToken = req.cookies.twitchAppAccessToken

    if (!twitchAppAccessToken) {
      twitchAppAccessToken = await fetchTwitchAppAccessToken()
      res.setHeader('Set-Cookie', `twitchAppAccessToken=${twitchAppAccessToken}`)
    }

    const { id } = req.query

    if (!id) {
      return res.status(400).json({ message: 'Missing id parameter' })
    }

    const _makeIgdbRequest = async () => {
      const client = igdb(process.env.TWITCH_CLIENT_ID, twitchAppAccessToken)

      const response = await client
        .fields([
          'id',
          'name',
          'summary',
          'screenshots.image_id',
          'cover.image_id',
          'release_dates.human',
          'release_dates.date',
          'involved_companies.company.name',
          'involved_companies.developer',
          'involved_companies.publisher',
          'genres.name',
          'platforms.name',
        ])
        .where(`id = ${id}`)
        .request('/games')

      return response.data[0]
    }

    try {
      const response = await _makeIgdbRequest()

      return res.status(200).json(response)
    } catch (error: any) {
      if (error?.status === 401) {
        twitchAppAccessToken = await fetchTwitchAppAccessToken()
        const response = await _makeIgdbRequest()
        res.status(200).json(response)
      } else {
        res.status(error.status || 500).json(error.response?.data || 'Something went wrong')
      }
    }
  }
}
