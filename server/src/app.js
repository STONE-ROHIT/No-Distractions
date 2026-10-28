/**
 * The Express application, separated from the server startup in index.js
 * so the automated tests (server/tests) can boot it in-process against a
 * test database instead of spawning a real server.
 */
import express from 'express'
import cors from 'cors'
import { connectDatabase } from './config/db.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { rateLimit } from './middleware/rateLimit.js'
import authRoutes from './routes/auth.js'
import videosRoutes from './routes/videos.js'
import libraryRoutes from './routes/library.js'
import playlistsRoutes from './routes/playlists.js'
import notesRoutes from './routes/notes.js'
import bookmarksRoutes from './routes/bookmarks.js'
import statsRoutes from './routes/stats.js'

const app = express()

// The sandbox gateway/Caddy sits in front of the API; trust one proxy hop
// so req.ip reflects the real client instead of the proxy.
app.set('trust proxy', 1)

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  }),
)
app.use(express.json())

// Small, deliberate header set for a JSON API. We set these by hand instead
// of pulling in helmet's eleven sub-packages: this server only ever serves
// JSON, so a broad header sweep adds no real protection.
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff')
  res.set('Referrer-Policy', 'no-referrer')
  next()
})

// Simple health endpoint used by the dev tooling.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Routes are mounted here as they are added:
// Credential endpoints are rate-limited: they run bcrypt (cost) and are
// the natural target of brute-force attempts.
app.use('/api/auth', rateLimit({ max: 20, windowMs: 60_000, message: 'Too many attempts. Please wait a minute and try again.' }), authRoutes)
app.use('/api/videos', videosRoutes)
app.use('/api/library', libraryRoutes)
app.use('/api/playlists', playlistsRoutes)
app.use('/api/notes', notesRoutes)
app.use('/api/bookmarks', bookmarksRoutes)
app.use('/api/stats', statsRoutes)

app.use(notFoundHandler)
app.use(errorHandler)


export default app
