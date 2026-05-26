'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault()

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters.')
      return
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.')
      return
    }

    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.updateUser({
      password,
    })

    setLoading(false)

    if (error) {
      setMessage(error.message)
      return
    }

    setSuccess(true)
    setMessage('Password updated successfully.')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl ring-1 ring-gray-200">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-wide text-gray-500">
            Tayyab Mart
          </p>

          <h1 className="mt-2 text-3xl font-black text-gray-950">
            Reset Password
          </h1>
        </div>

        <form onSubmit={updatePassword} className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block font-semibold text-gray-900">
              New Password
            </label>

            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-gray-300 bg-white p-4 text-gray-900 outline-none focus:border-black"
              placeholder="Enter new password"
            />
          </div>

          <div>
            <label className="mb-2 block font-semibold text-gray-900">
              Confirm Password
            </label>

            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-2xl border border-gray-300 bg-white p-4 text-gray-900 outline-none focus:border-black"
              placeholder="Confirm new password"
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

          {!success ? (
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-gray-950 p-4 font-black text-white hover:bg-gray-800 disabled:bg-gray-500"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="w-full rounded-2xl bg-blue-700 p-4 font-black text-white hover:bg-blue-800"
            >
              Back to Login
            </button>
          )}
        </form>
      </div>
    </main>
  )
}