'use client'

import { useState } from 'react'
import QRCode from 'qrcode'
import { supabase } from '../../lib/supabase'

type ResumeSession = {
  id: string
  customer_name: string
  phone_last4: string
  qr_token: string
  status: string
  expires_at: string
  created_at: string
  cart_items?: {
    id: string
    quantity: number
    price_at_time: number
  }[]
}

export default function KioskPage() {
  const [mode, setMode] = useState<'home' | 'start' | 'resume'>('home')

  const [customerName, setCustomerName] = useState('')
  const [phoneLast4, setPhoneLast4] = useState('')

  const [resumeName, setResumeName] = useState('')
  const [resumePhoneLast4, setResumePhoneLast4] = useState('')
  const [resumeSessions, setResumeSessions] = useState<ResumeSession[]>([])

  const [loading, setLoading] = useState(false)
  const [qrImage, setQrImage] = useState('')
  const [sessionUrl, setSessionUrl] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  function generateToken() {
    return crypto.randomUUID()
  }

  function getAppUrl() {
    return process.env.NEXT_PUBLIC_APP_URL || window.location.origin
  }

  async function generateSessionQr(token: string) {
    const url = `${getAppUrl()}/customer/${token}`
    const qr = await QRCode.toDataURL(url)

    setSessionUrl(url)
    setQrImage(qr)
  }

  function resetMessages() {
    setErrorMessage('')
    setSuccessMessage('')
  }

  function goHome() {
    setMode('home')
    setCustomerName('')
    setPhoneLast4('')
    setResumeName('')
    setResumePhoneLast4('')
    setResumeSessions([])
    setQrImage('')
    setSessionUrl('')
    resetMessages()
  }

  async function createCheckoutSession(e: React.FormEvent) {
    e.preventDefault()

    resetMessages()
    setQrImage('')
    setSessionUrl('')

    if (!customerName.trim()) {
      setErrorMessage('Please enter customer name.')
      return
    }

    if (!/^\d{4}$/.test(phoneLast4)) {
      setErrorMessage('Phone last 4 digits must be exactly 4 numbers.')
      return
    }

    setLoading(true)

    const token = generateToken()

    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 3)

    const { error } = await supabase.from('checkout_sessions').insert([
      {
        customer_name: customerName.trim(),
        phone_last4: phoneLast4,
        qr_token: token,
        status: 'active',
        expires_at: expiresAt.toISOString(),
      },
    ])

    if (error) {
      setLoading(false)
      setErrorMessage(error.message)
      return
    }

    await generateSessionQr(token)

    setLoading(false)
    setSuccessMessage('Session created successfully. Scan the QR code with your phone.')
  }

  async function findResumeSessions(e: React.FormEvent) {
    e.preventDefault()

    resetMessages()
    setResumeSessions([])
    setQrImage('')
    setSessionUrl('')

    if (!/^\d{4}$/.test(resumePhoneLast4)) {
      setErrorMessage('Phone last 4 digits must be exactly 4 numbers.')
      return
    }

    setLoading(true)

    let query = supabase
      .from('checkout_sessions')
      .select(`
        id,
        customer_name,
        phone_last4,
        qr_token,
        status,
        expires_at,
        created_at,
        cart_items (
          id,
          quantity,
          price_at_time
        )
      `)
      .eq('phone_last4', resumePhoneLast4)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (resumeName.trim()) {
      query = query.ilike('customer_name', `%${resumeName.trim()}%`)
    }

    const { data, error } = await query

    setLoading(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    if (!data || data.length === 0) {
      setErrorMessage(
        'No active session found. Please check the phone digits, or start a new checkout.'
      )
      return
    }

    setResumeSessions((data as any) || [])

    if (data.length === 1) {
      setSuccessMessage('One session found. Select it below to resume checkout.')
    } else {
      setSuccessMessage(
        `${data.length} sessions found with these phone digits. Please select your session by name, time, or cart total.`
      )
    }
  }

  async function resumeSelectedSession(session: ResumeSession) {
    resetMessages()
    setLoading(true)

    await generateSessionQr(session.qr_token)

    setLoading(false)
    setSuccessMessage('Session found. Scan the QR code to continue shopping.')
  }

  function getSessionTotal(session: ResumeSession) {
    return (
      session.cart_items?.reduce((sum, item) => {
        return sum + Number(item.quantity) * Number(item.price_at_time)
      }, 0) || 0
    )
  }

  function getSessionItemCount(session: ResumeSession) {
    return (
      session.cart_items?.reduce((sum, item) => {
        return sum + Number(item.quantity)
      }, 0) || 0
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-3xl rounded-3xl bg-white p-8 shadow-xl ring-1 ring-gray-200">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-wide text-gray-900">
            Tayyab Mart
          </p>

          <h1 className="mt-2 text-4xl font-black text-gray-950">
            Self Checkout
          </h1>

          <p className="mt-3 text-gray-700">
            Start a new shopping session or resume an existing one.
          </p>
        </div>

        {mode === 'home' && (
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setMode('start')
                resetMessages()
              }}
              className="rounded-3xl bg-gray-950 p-8 text-left text-white shadow hover:bg-gray-800"
            >
              <h2 className="text-2xl font-black">
                Start Self Checkout
              </h2>

              <p className="mt-3 text-gray-300">
                Create a new checkout session and scan QR with your phone.
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('resume')
                resetMessages()
              }}
              className="rounded-3xl bg-blue-700 p-8 text-left text-white shadow hover:bg-blue-800"
            >
              <h2 className="text-2xl font-black">
                Resume Checkout
              </h2>

              <p className="mt-3 text-blue-100">
                Continue your previous active cart using your name and phone digits.
              </p>
            </button>
          </div>
        )}

        {mode === 'start' && !qrImage && (
          <form onSubmit={createCheckoutSession} className="mt-8 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-gray-950">
                Start New Checkout
              </h2>

              <button
                type="button"
                onClick={goHome}
                className="rounded-xl bg-gray-200 px-4 py-2 font-bold text-gray-800 hover:bg-gray-300"
              >
                Back
              </button>
            </div>

            <div>
              <label className="mb-2 block text-lg font-semibold text-gray-900">
                Customer Name
              </label>

              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter your name"
                className="w-full rounded-2xl border border-gray-300 bg-white p-5 text-lg text-gray-900 placeholder:text-gray-500 outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="mb-2 block text-lg font-semibold text-gray-900">
                Last 4 Digits of Phone
              </label>

              <input
                type="text"
                inputMode="numeric"
                value={phoneLast4}
                onChange={(e) =>
                  setPhoneLast4(e.target.value.replace(/\D/g, '').slice(0, 4))
                }
                placeholder="1234"
                maxLength={4}
                className="w-full rounded-2xl border border-gray-300 bg-white p-5 text-lg text-gray-900 placeholder:text-gray-500 outline-none focus:border-black"
              />
            </div>

            {errorMessage && (
              <div className="rounded-2xl bg-red-100 p-4 font-semibold text-red-800">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-gray-950 p-5 text-xl font-black text-white hover:bg-gray-800 disabled:bg-gray-500"
            >
              {loading ? 'Creating Session...' : 'Create QR Code'}
            </button>
          </form>
        )}

        {mode === 'resume' && !qrImage && (
          <div className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-gray-950">
                Resume Checkout
              </h2>

              <button
                type="button"
                onClick={goHome}
                className="rounded-xl bg-gray-200 px-4 py-2 font-bold text-gray-800 hover:bg-gray-300"
              >
                Back
              </button>
            </div>

            <form onSubmit={findResumeSessions} className="mt-5 space-y-5">
              <div>
                <label className="mb-2 block text-lg font-semibold text-gray-900">
                  Customer Name
                </label>

                <input
                  type="text"
                  value={resumeName}
                  onChange={(e) => setResumeName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full rounded-2xl border border-gray-300 bg-white p-5 text-lg text-gray-900 placeholder:text-gray-500 outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="mb-2 block text-lg font-semibold text-gray-900">
                  Last 4 Digits of Phone
                </label>

                <input
                  type="text"
                  inputMode="numeric"
                  value={resumePhoneLast4}
                  onChange={(e) =>
                    setResumePhoneLast4(
                      e.target.value.replace(/\D/g, '').slice(0, 4)
                    )
                  }
                  placeholder="1234"
                  maxLength={4}
                  className="w-full rounded-2xl border border-gray-300 bg-white p-5 text-lg text-gray-900 placeholder:text-gray-500 outline-none focus:border-black"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-blue-700 p-5 text-xl font-black text-white hover:bg-blue-800 disabled:bg-gray-500"
              >
                {loading ? 'Searching...' : 'Find My Session'}
              </button>
            </form>

            {errorMessage && (
              <div className="mt-5 rounded-2xl bg-red-100 p-4 font-semibold text-red-800">
                {errorMessage}
              </div>
            )}

            {successMessage && resumeSessions.length > 0 && (
              <div className="mt-5 rounded-2xl bg-green-100 p-4 font-semibold text-green-800">
                {successMessage}
              </div>
            )}

            {resumeSessions.length > 0 && (
              <div className="mt-5 space-y-4">
                {resumeSessions.map((session) => (
                  <div
                    key={session.id}
                    className="rounded-2xl border border-gray-200 bg-gray-50 p-5"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-xl font-black text-gray-950">
                          {session.customer_name}
                        </h3>

                        <p className="mt-1 text-sm text-gray-600">
                          Started: {new Date(session.created_at).toLocaleString()}
                        </p>

                        <p className="text-sm text-gray-600">
                          Expires: {new Date(session.expires_at).toLocaleString()}
                        </p>

                        <p className="mt-2 text-sm font-bold text-gray-900">
                          Items: {getSessionItemCount(session)} • Total: Rs.{' '}
                          {getSessionTotal(session).toFixed(2)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => resumeSelectedSession(session)}
                        className="rounded-2xl bg-gray-950 px-6 py-4 font-black text-white hover:bg-gray-800"
                      >
                        Resume This Session
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {qrImage && (
          <div className="mt-8 text-center">
            <h2 className="text-3xl font-black text-gray-950">
              Scan this QR code with your phone
            </h2>

            <p className="mt-2 text-gray-700">
              Your cart will open exactly where you left it.
            </p>

            <div className="mt-6 flex justify-center">
              <img
                src={qrImage}
                alt="Checkout QR Code"
                className="h-80 w-80 rounded-3xl border bg-white p-4 shadow"
              />
            </div>

            {successMessage && (
              <div className="mt-6 rounded-2xl bg-green-100 p-4 font-semibold text-green-800">
                {successMessage}
              </div>
            )}

            {errorMessage && (
              <div className="mt-6 rounded-2xl bg-red-100 p-4 font-semibold text-red-800">
                {errorMessage}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 md:flex-row md:justify-center">
              <button
                type="button"
                onClick={goHome}
                className="rounded-2xl bg-gray-950 px-6 py-4 font-black text-white hover:bg-gray-800"
              >
                Back to Home
              </button>

              <button
                type="button"
                onClick={() => {
                  setQrImage('')
                  setSessionUrl('')
                  resetMessages()

                  if (mode === 'start') {
                    setCustomerName('')
                    setPhoneLast4('')
                  }
                }}
                className="rounded-2xl bg-gray-200 px-6 py-4 font-black text-gray-800 hover:bg-gray-300"
              >
                Start Another Action
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}