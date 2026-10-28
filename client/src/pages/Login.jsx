import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { AuthShell, Field, SubmitButton, useAuthRedirect } from './AuthShared.jsx'

export default function Login() {
  const { login } = useAuth()
  const redirectAfterLogin = useAuthRedirect()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [pending, setPending] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setFieldErrors({})
    setFormError('')
    setPending(true)
    try {
      await login(email, password)
      redirectAfterLogin()
    } catch (err) {
      setFieldErrors(err.fields || {})
      if (!err.fields) setFormError(err.message)
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to continue where you left off."
      footer={
        <>
          New here?{' '}
          <Link to="/signup" className="font-medium text-emerald-700 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {formError && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {formError}
          </div>
        )}
        <Field
          label="Email"
          type="email"
          id="login-email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
          required
        />
        <Field
          label="Password"
          type="password"
          id="login-password"
          autoComplete="current-password"
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          required
        />
        <SubmitButton pending={pending}>Log in</SubmitButton>
      </form>
    </AuthShell>
  )
}
