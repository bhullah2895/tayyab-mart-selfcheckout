'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

type LoginMode = 'admin' | 'cashier' | null

export default function LoginPage() {
  const router = useRouter()

  const [loginMode, setLoginMode] = useState<LoginMode>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'error' | 'success'>('error')

  const [loggedInRole, setLoggedInRole] = useState<string | null>(null)
  const [loggedInName, setLoggedInName] = useState<string | null>(null)

  function showMessage(text: string, type: 'error' | 'success' = 'error') {
    setMessage(text)
    setMessageType(type)
  }

  function resetForm(mode: LoginMode) {
    setLoginMode(mode)
    setEmail('')
    setPassword('')
    setMessage('')
    setLoggedInRole(null)
    setLoggedInName(null)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()

    if (!loginMode) {
      showMessage('Please select login type.')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error || !data.user) {
        setLoading(false)
        showMessage(error?.message || 'Login failed')
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('staff_profiles')
        .select('full_name, role, is_active')
        .eq('id', data.user.id)
        .single()

      setLoading(false)

      if (profileError || !profile) {
        showMessage('No staff profile found for this account.')
        await supabase.auth.signOut()
        return
      }

      if (!profile.is_active) {
        showMessage('This staff account is disabled.')
        await supabase.auth.signOut()
        return
      }

      if (loginMode === 'cashier') {
        if (
          profile.role === 'cashier' ||
          profile.role === 'manager' ||
          profile.role === 'admin'
        ) {
          router.push('/cashier')
          return
        }

        showMessage('This account is not allowed to access cashier portal.')
        await supabase.auth.signOut()
        return
      }

      if (loginMode === 'admin') {
        if (profile.role === 'manager' || profile.role === 'admin') {
          setLoggedInRole(profile.role)
          setLoggedInName(profile.full_name)
          return
        }

        showMessage('Cashier accounts cannot access admin portal.')
        await supabase.auth.signOut()
        return
      }
    } catch (error: any) {
      setLoading(false)
      showMessage(
        'Login request failed. Check your internet connection, Supabase URL, and anon key.'
      )
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
        showMessage('Enter your email first, then click Forgot Password.')
        return
    }

    setResetLoading(true)
    setMessage('')

    try {
        const appUrl =
        process.env.NEXT_PUBLIC_APP_URL || window.location.origin

        const redirectUrl = `${appUrl}/reset-password`

        console.log('Reset redirect URL:', redirectUrl)

        const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
            redirectTo: redirectUrl,
        }
        )

        if (error) {
        showMessage(error.message)
        setResetLoading(false)
        return
        }

        showMessage(
        'Password reset email sent. Please check your inbox.',
        'success'
        )

        setResetLoading(false)
    } catch (error) {
        console.error('Forgot password failed:', error)

        showMessage(
        'Could not contact Supabase Auth. Check Supabase URL, anon key, internet, and Auth settings.'
        )

        setResetLoading(false)
    }
    }

  async function logout() {
    await supabase.auth.signOut()
    setLoginMode(null)
    setEmail('')
    setPassword('')
    setMessage('')
    setLoggedInRole(null)
    setLoggedInName(null)
  }

  if (loggedInRole === 'manager' || loggedInRole === 'admin') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl ring-1 ring-gray-200">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-wide text-gray-500">
              Tayyab Mart
            </p>

            <h1 className="mt-2 text-3xl font-black text-gray-950">
              Welcome, {loggedInName}
            </h1>

            <p className="mt-2 text-gray-600">
              Choose where you want to go.
            </p>
          </div>

          <div className="mt-8 space-y-4">
            <button
              type="button"
              onClick={() => router.push('/admin')}
              className="w-full rounded-2xl bg-gray-950 p-5 text-xl font-black text-white hover:bg-gray-800"
            >
              Go to Admin Portal
            </button>

            <button
              type="button"
              onClick={() => router.push('/cashier')}
              className="w-full rounded-2xl bg-blue-700 p-5 text-xl font-black text-white hover:bg-blue-800"
            >
              Go to Cashier Portal
            </button>

            <button
              type="button"
              onClick={logout}
              className="w-full rounded-2xl bg-gray-200 p-4 font-bold text-gray-800 hover:bg-gray-300"
            >
              Logout
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl ring-1 ring-gray-200">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-wide text-gray-500">
            Tayyab Mart
          </p>

          <h1 className="mt-2 text-3xl font-black text-gray-950">
            Staff Login
          </h1>

          <p className="mt-2 text-gray-600">
            Select portal type to continue.
          </p>
        </div>

        {!loginMode && (
          <div className="mt-8 space-y-4">
            <button
              type="button"
              onClick={() => resetForm('admin')}
              className="w-full rounded-2xl bg-gray-950 p-5 text-xl font-black text-white hover:bg-gray-800"
            >
              Admin / Manager Login
            </button>

            <button
              type="button"
              onClick={() => resetForm('cashier')}
              className="w-full rounded-2xl bg-blue-700 p-5 text-xl font-black text-white hover:bg-blue-800"
            >
              Cashier Login
            </button>
          </div>
        )}

        {loginMode && (
          <>
            <div className="mt-8 rounded-2xl bg-gray-100 p-4 text-center">
              <p className="text-sm font-semibold text-gray-600">
                Logging in as
              </p>

              <p className="mt-1 text-xl font-black text-gray-950">
                {loginMode === 'admin' ? 'Admin / Manager' : 'Cashier'}
              </p>
            </div>

            <form onSubmit={handleLogin} className="mt-6 space-y-5">
              <div>
                <label className="mb-2 block font-semibold text-gray-900">
                  Email
                </label>

                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-gray-300 bg-white p-4 text-gray-900 outline-none focus:border-black"
                  placeholder={
                    loginMode === 'admin'
                      ? 'manager@tayyabmart.com'
                      : 'cashier1@tayyabmart.com'
                  }
                />
              </div>

              <div>
                <label className="mb-2 block font-semibold text-gray-900">
                  Password
                </label>

                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-gray-300 bg-white p-4 text-gray-900 outline-none focus:border-black"
                  placeholder="Enter password"
                />
              </div>

              {message && (
                <div
                  className={`rounded-2xl p-4 font-semibold ${
                    messageType === 'success'
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
                {loading ? 'Logging in...' : 'Login'}
              </button>

              <button
            type="button"
            onClick={() => router.push('/forgot-password')}
            className="w-full rounded-2xl bg-white p-4 font-bold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-50"
          >
            Forgot Password?
               </button>
              <button
                type="button"
                onClick={() => resetForm(null)}
                className="w-full rounded-2xl bg-gray-200 p-4 font-bold text-gray-800 hover:bg-gray-300"
              >
                Back
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  )
}