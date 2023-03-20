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
