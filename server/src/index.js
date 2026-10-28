import 'dotenv/config'
import { connectDatabase } from './config/db.js'
import app from './app.js'

const PORT = process.env.PORT || 4000
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/no-distractions'

async function start() {
  try {
    await connectDatabase(MONGO_URI)
  } catch (err) {
    console.error('[server] Could not connect to MongoDB:', err.message)
    console.error('[server] Make sure MongoDB is running (see README.md).')
    process.exit(1)
  }

  app.listen(PORT, () => {
    console.log(`[server] API listening on http://localhost:${PORT}`)
  })
}

start()
