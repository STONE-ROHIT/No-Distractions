import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { httpError } from '../utils/errors.js'

const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  console.error(
    '[auth] JWT_SECRET is not set. Copy server/.env.example to server/.env and set a long random value.',
  )
  process.exit(1)
}

/**
 * Create a signed token for a user. The token carries only the user id
 * ("sub" claim) and an expiry; the user document is loaded fresh on
 * every authenticated request.
 */
export function signToken(user) {
  return jwt.sign({ sub: user._id.toString() }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  })
}

/**
 * Route middleware: verifies the "Authorization: Bearer <token>" header
 * and attaches the matching user document to req.user.
 */
export async function requireAuth(req, res, next) {
  try {
    const header = req.get('authorization') || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null

    if (!token) {
      throw httpError(401, 'You must be logged in to do that.')
    }

    let payload
    try {
      payload = jwt.verify(token, JWT_SECRET)
    } catch {
      throw httpError(401, 'Your session is invalid or has expired. Please log in again.')
    }

    const user = await User.findById(payload.sub)
    if (!user) {
      throw httpError(401, 'This account no longer exists.')
    }

    req.user = user
    next()
  } catch (err) {
    next(err)
  }
}
