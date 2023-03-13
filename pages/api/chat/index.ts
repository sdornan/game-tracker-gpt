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
        content:
          "You are a helpful assistant responsible for keeping track of a user's video game collection and ratings on a 10 point scale. Respond in this format in valid JSON with no comments: action: [actions taken, can be array (rate, add, remove)], game: [name of game], rating: [rating given to game]",
      },
      {
        role: 'user',
        content: userMessage,
      },
    ]

    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: messages,
    })

    const data = JSON.parse(response?.data?.choices?.[0]?.message?.content)

    res.status(200).json(data)
  }
}

export default withAuth(handler)
