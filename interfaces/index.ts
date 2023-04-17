export type User = {
  id: string
  email: string
  firstName: string
  lastName: string
}

export type ResponseError = {
  message: string
}

export type CollectionStatus = 'playing' | 'paused' | 'completed' | 'abandoned' | 'wishlist'

export type IgdbGame = {
  id: number
  name: string
  slug: string
  rating_count: number
  cover: {
    image_id: string
  }
  relevancy?: number
}
