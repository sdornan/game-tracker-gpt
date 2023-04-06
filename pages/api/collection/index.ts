import { CollectionStatus, ResponseError } from '@/interfaces'
import { withAuth } from '@/lib/helpers'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DeleteCommand,
  DeleteCommandInput,
  DynamoDBDocumentClient,
  PutCommand,
  PutCommandInput,
  QueryCommand,
  QueryCommandInput,
  UpdateCommand,
  UpdateCommandInput,
} from '@aws-sdk/lib-dynamodb'
import { NextApiRequest, NextApiResponse } from 'next'

const dynamoDb = new DynamoDBClient({})
const ddbDocClient = DynamoDBDocumentClient.from(dynamoDb)

type UpdateCollectionRequest = {
  gameId: string
  rating?: string
  status?: CollectionStatus
}

type DeleteCollectionRequest = {
  gameId: string
}

const getCollection = async (userId: string) => {
  const params: QueryCommandInput = {
    TableName: process.env.COLLECTION_TABLE_NAME,
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId,
    },
  }

  const command = new QueryCommand(params)
  return ddbDocClient.send(command)
}

const addGameToCollection = async (userId: string, body: UpdateCollectionRequest) => {
  const { gameId, rating, status } = body

  const params: PutCommandInput = {
    TableName: process.env.COLLECTION_TABLE_NAME,
    Item: {
      userId,
      gameId,
      rating: rating || null,
      status: status || null,
    },
  }

  const command = new PutCommand(params)
  return ddbDocClient.send(command)
}

const updateGameInCollection = async (userId: string, body: UpdateCollectionRequest) => {
  const { gameId, rating, status } = body

  // Initialize update expression, attribute names, and attribute values
  let updateExpression = 'SET'
  const expressionAttributeNames: { [key: string]: string } = {}
  const expressionAttributeValues: { [key: string]: any } = {}

  // Add the rating attribute if it's defined
  if (rating) {
    updateExpression += ' #rating = :rating,'
    expressionAttributeNames['#rating'] = 'rating'
    expressionAttributeValues[':rating'] = rating
  }

  // Add the status attribute if it's defined
  if (status) {
    updateExpression += ' #status = :status,'
    expressionAttributeNames['#status'] = 'status'
    expressionAttributeValues[':status'] = status
  }

  // Remove the trailing comma
  updateExpression = updateExpression.slice(0, -1)

  const params: UpdateCommandInput = {
    TableName: process.env.COLLECTION_TABLE_NAME,
    Key: {
      userId,
      gameId,
    },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW',
  }

  const command = new UpdateCommand(params)
  return ddbDocClient.send(command)
}

const deleteGameFromCollection = async (userId: string, body: DeleteCollectionRequest) => {
  const { gameId } = body

  const params: DeleteCommandInput = {
    TableName: process.env.COLLECTION_TABLE_NAME,
    Key: {
      userId,
      gameId,
    },
  }

  const command = new DeleteCommand(params)
  return ddbDocClient.send(command)
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any | ResponseError>,
  userId: string
) {
  try {
    switch (req.method) {
      case 'GET':
        const { Items: games } = await getCollection(userId)
        res.status(200).json(games)
        break
      case 'POST':
        const addedGame = await addGameToCollection(userId, req.body)
        res.status(201).json(addedGame)
        break
      case 'PUT':
        const updatedGame = await updateGameInCollection(userId, req.body)
        res.status(200).json(updatedGame)
        break
      case 'DELETE':
        await deleteGameFromCollection(userId, req.body)
        res.status(200).json({ message: 'Game deleted from collection' })
        break
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE'])
        res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (error) {
    res.status(500).json({ message: 'An error occurred' })
  }
}

export default withAuth(handler)
