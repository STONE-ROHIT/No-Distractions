import mongoose from 'mongoose'

/**
 * Connect to MongoDB and log a clear message on failure.
 * Called once from src/index.js when the server starts.
 */
export async function connectDatabase(uri) {
  mongoose.set('strictQuery', true)

  mongoose.connection.on('connected', () => {
    console.log('[db] Connected to MongoDB')
  })
  mongoose.connection.on('error', (err) => {
    console.error('[db] MongoDB connection error:', err.message)
  })
  mongoose.connection.on('disconnected', () => {
    console.warn('[db] Disconnected from MongoDB')
  })

  await mongoose.connect(uri)
}
