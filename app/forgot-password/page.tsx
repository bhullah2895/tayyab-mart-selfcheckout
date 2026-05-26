'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function ForgotPasswordPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)

  async function sendResetEmail(e: React.FormEvent) {
    e.preventDefault()

    if (!email.trim()) {
      setMessage('Please enter your email.')
      return
    }

    setLoading(true)
    setMessage('')
    setSuccess(false)

    try {
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL || window.location.origin

      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${appUrl}/reset-password`,
        }
      )

      setLoading(false)

      if (error) {
        setMessage(error.message)
        return
      }

      setSuccess(true)
      setMessage('Password reset email sent. Please check your inbox.')
    } catch {
      setLoading(false)
      setMessage('Could not send reset email. Please try again.')
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl ring-1 ring-gray-200">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-wide text-gray-500">
            Tayyab Mart
          </p>

          <h1 className="mt-2 text-3xl font-black text-gray-950">
            Forgot Password
          </h1>

          <p className="mt-2 text-gray-600">
            Enter your staff email and we will send a password reset link.
          </p>
        </div>

        <form onSubmit={sendResetEmail} className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block font-semibold text-gray-900">
              Staff Email
            </label>

            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-gray-300 bg-white p-4 text-gray-900 outline-none focus:border-black"
              placeholder="cashier1@tayyabmart.com"
            />
          </div>

          {message && (
            <div
              className={`rounded-2xl p-4 font-semibold ${
                success
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-gray-950 p-4 font-black text-white hover:bg-gray-800 disabled:bg-gray-500"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>

          <button
            type="button"
            onClick={() => router.push('/login')}
            className="w-full rounded-2xl bg-gray-200 p-4 font-bold text-gray-800 hover:bg-gray-300"
          >
            Back to Login
          </button>
        </form>
      </div>
    </main>
  )
}