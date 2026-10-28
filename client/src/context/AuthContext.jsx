import { createContext, useContext, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { api, getToken, setToken } from '../lib/api.js'
import { clearCache, clearQueue } from '../lib/offline.js'
import { Spinner } from '../components/common.jsx'

/**
 * Holds the logged-in user. On mount it verifies any stored token with
 * GET /api/auth/me. A "nd:unauthorized" event (fired by the api wrapper
 * when a request comes back 401) logs the user out automatically.
 */
const AuthContext = createContext(null)

/** Mirror of the logged-in user for offline restores (display data only). */
const USER_KEY = 'nd_user'

function setCachedUser(user) {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
  else localStorage.removeItem(USER_KEY)
}

function getCachedUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null')
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function restoreSession() {
      if (!getToken()) {
        setReady(true)
        return
      }
      try {
        const data = await api('/auth/me')
        if (!cancelled) {
          setUser(data.user)
          setCachedUser(data.user)
        }
      } catch (err) {
        if (err.offline) {
          // Offline (or server unreachable): keep the session using the
          // locally mirrored profile. The next online /auth/me re-verifies.
          if (!cancelled) setUser(getCachedUser())
        } else {
          // Invalid or expired stored token: drop it.
          setToken(null)
          setCachedUser(null)
        }
      } finally {
        if (!cancelled) setReady(true)
      }
    }

    restoreSession()

    function handleUnauthorized() {
      setToken(null)
      setUser(null)
      setCachedUser(null)
      clearQueue()
      clearCache()
    }
    window.addEventListener('nd:unauthorized', handleUnauthorized)

    return () => {
      cancelled = true
      window.removeEventListener('nd:unauthorized', handleUnauthorized)
    }
  }, [])

  async function signup(name, email, password) {
    const data = await api('/auth/signup', {
      method: 'POST',
      body: { name, email, password },
    })
    setToken(data.token)
    setUser(data.user)
    setCachedUser(data.user)
  }

  async function login(email, password) {
    const data = await api('/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    setToken(data.token)
    setUser(data.user)
    setCachedUser(data.user)
  }

  function logout() {
    setToken(null)
    setUser(null)
    setCachedUser(null)
    // Offline data belongs to this account only — never let a queued
    // progress write or a cached library leak into the next session.
    clearQueue()
    clearCache()
  }

  return (
    <AuthContext.Provider value={{ user, ready, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return context
}

/** Guards private routes: waits for the session check, then redirects. */
export function RequireAuth({ children }) {
  const { user, ready } = useAuth()

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    )
  }
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return children
}
