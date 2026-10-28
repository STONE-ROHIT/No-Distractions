import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { BrandMark } from '../components/AppLayout.jsx'
import { Spinner } from '../components/common.jsx'

/** Shared shell for the login and signup pages. */
export function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-4 py-10">
      <Link to="/" className="mb-8 flex items-center gap-2.5">
        <BrandMark />
        <span className="text-[15px] font-semibold tracking-tight text-stone-900">
          No Distractions
        </span>
      </Link>

      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-xl font-semibold tracking-tight text-stone-900">{title}</h1>
        <p className="mt-1 text-sm text-stone-500">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>

      <p className="mt-6 text-sm text-stone-500">{footer}</p>
    </div>
  )
}

/** Form fields with label + error message. */
export function Field({ label, type, id, value, onChange, error, autoComplete, ...rest }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-stone-700">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        aria-invalid={error ? 'true' : undefined}
        className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none ${
          error
            ? 'border-red-300 focus:border-red-500'
            : 'border-stone-300 focus:border-emerald-500'
        }`}
        {...rest}
      />
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}

/** After login/signup, continue to where the user was heading. */
export function useAuthRedirect() {
  const navigate = useNavigate()
  const location = useLocation()
  return () => {
    const intended = location.state?.from || '/app'
    navigate(intended, { replace: true })
  }
}

export function SubmitButton({ pending, children }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  )
}
