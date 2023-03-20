import { withAuth } from '@/lib/helpers'
import { NextApiRequest, NextApiResponse } from 'next'
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from 'openai'

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
})
const openai = new OpenAIApi(configuration)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { message: userMessage } = req.body

    const messages: ChatCompletionRequestMessage[] = [
      {
        role: 'system',
        content: `You are a helpful assistant responsible for tracking a user's video game collection with statuses and ratings on a 10 point scale.
          Respond in this format in valid JSON with no comments:
          {
            category: 'collection' | 'query',
            action (if category === 'collection', update if rating or setting status without adding): 'add' | 'remove' | 'update',
            game: [name of game],
            rating (if category === 'collection', default is null): [rating given to game],
            status (if category === 'collection', default is null): 'playing' | 'paused' | 'completed' | 'abandoned' | 'wishlist'
          }

          If the message doesn't seem to be related to the game collection, respond with:
          {
            category: 'error',
            message: 'I don't understand your message.'
          }
          `,
      },
      {
        role: 'user',
        content: userMessage,
      },
    ]

    try {
      const response = await openai.createChatCompletion({
        model: 'gpt-4',
        messages: messages,
      })

      const data = JSON.parse(response?.data?.choices?.[0]?.message?.content)

      res.status(200).json(data)
    } catch (error: any) {
      res.status(error.status || 500).json(error.response?.data || 'Something went wrong')
    }
  }
}

export default withAuth(handler)
