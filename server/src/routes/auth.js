import { Router } from 'express'
import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import { httpError } from '../utils/errors.js'
import { signToken, requireAuth } from '../middleware/auth.js'

const router = Router()

const EMAIL_RE = /^\S+@\S+\.\S+$/
const MIN_PASSWORD_LENGTH = 8
const BCRYPT_ROUNDS = 10

// POST /api/auth/signup  { name, email, password }
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body || {}

  const fields = {}
  if (!name || name.trim().length < 2) {
    fields.name = 'Enter your name (at least 2 characters).'
  }
  if (!email || !EMAIL_RE.test(email.trim())) {
    fields.email = 'Enter a valid email address.'
  }
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    fields.password = `Passwords must be at least ${MIN_PASSWORD_LENGTH} characters.`
  }
  if (Object.keys(fields).length > 0) {
    throw httpError(400, 'Please check the highlighted fields.', fields)
  }

  const normalizedEmail = email.trim().toLowerCase()

  const existing = await User.findOne({ email: normalizedEmail })
  if (existing) {
    throw httpError(409, 'An account with this email already exists.', {
      email: 'This email is already registered. Try logging in instead.',
    })
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
  })

  res.status(201).json({ token: signToken(user), user })
})

// POST /api/auth/login  { email, password }
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {}

  const fields = {}
  if (!email || !EMAIL_RE.test(email.trim())) {
    fields.email = 'Enter a valid email address.'
  }
  if (!password) {
    fields.password = 'Enter your password.'
  }
  if (Object.keys(fields).length > 0) {
    throw httpError(400, 'Please check the highlighted fields.', fields)
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() })

  // Same message for unknown email and wrong password: no account enumeration.
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw httpError(401, 'Incorrect email or password.')
  }

  res.json({ token: signToken(user), user })
})

// GET /api/auth/me  (requires auth)
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})

export default router
