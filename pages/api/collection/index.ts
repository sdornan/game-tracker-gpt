import { CollectionStatus, ResponseError } from '@/interfaces'
import { withAuth } from '@/lib/helpers'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
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

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any | ResponseError>,
  userId: string
) {
  if (req.method === 'GET') {
    const params = {
      TableName: process.env.COLLECTION_TABLE_NAME,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
    }

    try {
      const command = new QueryCommand(params)
      const result = await ddbDocClient.send(command)
      res.status(200).json(result.Items)
    } catch (error) {
      res.status(500).json({ message: 'Error fetching collection' })
    }
  } else if (req.method === 'POST') {
    const { gameId, rating, status } = req.body as UpdateCollectionRequest

    if (!gameId) {
      res.status(400).json({ message: 'Missing gameId' })
      return
    }

    const params = {
      TableName: process.env.COLLECTION_TABLE_NAME as string,
      Item: {
        userId,
        gameId,
        rating: rating || null,
        status: status || null,
      },
    }

    try {
      const command = new PutCommand(params)
      await ddbDocClient.send(command)
      res.status(201).json({ gameId, rating, status })
    } catch (error) {
      res.status(500).json({ message: 'Error adding game to collection' })
    }
  } else if (req.method === 'PUT') {
    const { gameId, rating, status } = req.body as UpdateCollectionRequest

    if (!gameId) {
      res.status(400).json({ message: 'Missing gameId' })
      return
    }

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

    const params = {
      TableName: process.env.COLLECTION_TABLE_NAME as string,
      Key: {
        userId,
        gameId,
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }

    console.log(params)

    try {
      const command = new UpdateCommand(params)
      await ddbDocClient.send(command)
      res.status(200).json({ gameId, rating, status })
    } catch (error) {
      res.status(500).json({ message: 'Error updating game in collection' })
    }
  } else if (req.method === 'DELETE') {
    const { gameId } = req.body as DeleteCollectionRequest

    if (!gameId) {
      res.status(400).json({ message: 'Missing gameId' })
      return
    }

    const params = {
      TableName: process.env.COLLECTION_TABLE_NAME,
      Key: {
        userId,
        gameId,
      },
    }

    try {
      const command = new DeleteCommand(params)
      await ddbDocClient.send(command)
      res.status(204)
    } catch (error) {
      res.status(500).json({ message: 'Error deleting game from collection' })
    }
  }
}

export default withAuth(handler)
