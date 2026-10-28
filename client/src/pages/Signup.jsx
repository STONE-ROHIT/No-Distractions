import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { AuthShell, Field, SubmitButton, useAuthRedirect } from './AuthShared.jsx'

export default function Signup() {
  const { signup } = useAuth()
  const redirectAfterLogin = useAuthRedirect()

  const [name, setName] = useState('')
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
      await signup(name, email, password)
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
      title="Create your study space"
      subtitle="A calm place for the videos you actually want to learn from."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-emerald-700 hover:underline">
            Log in
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
          label="Name"
          type="text"
          id="signup-name"
          autoComplete="name"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={fieldErrors.name}
          required
        />
        <Field
          label="Email"
          type="email"
          id="signup-email"
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
          id="signup-password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          minLength={8}
          required
        />
        <SubmitButton pending={pending}>Create account</SubmitButton>
      </form>
    </AuthShell>
  )
}
