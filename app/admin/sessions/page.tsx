'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

type Product = {
  name: string
  barcode: string
  price: number
}

type CartItem = {
  id: string
  quantity: number
  price_at_time: number
  products: Product
}

type CheckoutSession = {
  id: string
  customer_name: string
  phone_last4: string
  qr_token: string
  status: 'active' | 'paid' | 'expired' | 'abandoned'
  expires_at: string
  created_at: string
  paid_at: string | null
  cart_items: CartItem[]
}

type StatusFilter = 'all' | 'active' | 'paid' | 'expired' | 'abandoned'
type SessionStats = Pick<CheckoutSession, 'id' | 'status' | 'expires_at' | 'paid_at'>

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<CheckoutSession[]>([])
  const [statsSessions, setStatsSessions] = useState<SessionStats[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedSession, setSelectedSession] =
    useState<CheckoutSession | null>(null)

  function isExpired(session: Pick<CheckoutSession, 'expires_at'>) {
    return new Date(session.expires_at) <= new Date()
  }

  function canBeAbandoned(
    session: Pick<CheckoutSession, 'status' | 'expires_at' | 'paid_at'>
  ) {
    return (
      session.status !== 'paid' &&
      session.paid_at === null &&
      (session.status === 'active' || session.status === 'expired') &&
      isExpired(session)
    )
  }

  function getDisplayStatus(session: CheckoutSession) {
    if (session.status === 'paid') return 'PAID'
    if (session.status === 'abandoned') return 'ABANDONED'
    if (canBeAbandoned(session)) return 'EXPIRED'
    return 'ACTIVE'
  }

  function getStatusBadgeClass(session: CheckoutSession) {
    const displayStatus = getDisplayStatus(session)

    if (displayStatus === 'ACTIVE') return 'bg-green-100 text-green-800'
    if (displayStatus === 'PAID') return 'bg-blue-100 text-blue-800'
    if (displayStatus === 'EXPIRED') return 'bg-orange-100 text-orange-800'
    return 'bg-red-100 text-red-800'
  }

  async function loadSessions() {
    setLoading(true)
    setMessage('')

    const nowIso = new Date().toISOString()

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
        paid_at,
        cart_items (
          id,
          quantity,
          price_at_time,
          products (
            name,
            barcode,
            price
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (statusFilter === 'active') {
      // Active filter should only show sessions that are still inside their allowed time.
      query = query.eq('status', 'active').gt('expires_at', nowIso)
    }

    if (statusFilter === 'paid') {
      query = query.eq('status', 'paid')
    }

    if (statusFilter === 'expired') {
      // Expired means unpaid sessions whose allowed checkout time has passed.
      // This includes active rows that have crossed expires_at and rows already marked expired.
      query = query
        .in('status', ['active', 'expired'])
        .is('paid_at', null)
        .lte('expires_at', nowIso)
    }

    if (statusFilter === 'abandoned') {
      query = query.eq('status', 'abandoned')
    }

    const { data, error } = await query

    setLoading(false)

    if (error) {
      setMessage(error.message)
      return
    }

    setSessions((data as any) || [])
  }

  async function loadSessionStats() {
    const { data, error } = await supabase
      .from('checkout_sessions')
      .select('id, status, expires_at, paid_at')

    if (error) {
      setMessage(error.message)
      return
    }

    setStatsSessions((data as SessionStats[]) || [])
  }

  async function refreshPage() {
    await Promise.all([loadSessions(), loadSessionStats()])
  }

  useEffect(() => {
    refreshPage()
  }, [statusFilter])

  function getSessionTotal(session: CheckoutSession) {
    return (
      session.cart_items?.reduce((sum, item) => {
        return sum + Number(item.quantity) * Number(item.price_at_time)
      }, 0) || 0
    )
  }

  function getItemCount(session: CheckoutSession) {
    return (
      session.cart_items?.reduce((sum, item) => {
        return sum + Number(item.quantity)
      }, 0) || 0
    )
  }

  async function markAsAbandoned(sessionId: string) {
    const confirmed = confirm(
      ''
    )

    if (!confirmed) return

    const nowIso = new Date().toISOString()

    const { data, error } = await supabase
      .from('checkout_sessions')
      .update({
        status: 'abandoned',
      })
      .eq('id', sessionId)
      .in('status', ['active', 'expired'])
      .is('paid_at', null)
      .lte('expires_at', nowIso)
      .select('id')

    if (error) {
      setMessage(error.message)
      return
    }

    if (!data || data.length === 0) {
      setMessage(
        'No session was changed. Only expired unpaid sessions can be abandoned. Paid sessions are protected.'
      )
      return
    }

    setMessage('Session marked as abandoned.')
    await refreshPage()
  }

  async function markExpiredSessionsAsAbandoned() {
    const confirmed = confirm(
      'Mark all expired unpaid sessions as abandoned? Paid sessions will not be changed.'
    )

    if (!confirmed) return

    const nowIso = new Date().toISOString()

    const { data, error } = await supabase
      .from('checkout_sessions')
      .update({
        status: 'abandoned',
      })
      .in('status', ['active', 'expired'])
      .is('paid_at', null)
      .lte('expires_at', nowIso)
      .select('id')

    if (error) {
      setMessage(error.message)
      return
    }

    const updatedCount = data?.length || 0

    if (updatedCount === 0) {
      setMessage('No expired unpaid sessions were found. Paid sessions are protected.')
    } else {
      setMessage(`${updatedCount} expired unpaid session(s) marked as abandoned.`)
    }

    await refreshPage()
  }

  const activeCount = statsSessions.filter(
    (s) => s.status === 'active' && !isExpired(s)
  ).length
  const paidCount = statsSessions.filter((s) => s.status === 'paid').length
  const expiredCount = statsSessions.filter((s) => canBeAbandoned(s)).length
  const abandonedCount = statsSessions.filter(
    (s) => s.status === 'abandoned'
  ).length

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="bg-gray-950 px-5 py-6 text-white shadow">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm uppercase tracking-wide text-gray-400">
            Tayyab Mart Admin
          </p>

          <h1 className="mt-1 text-3xl font-black">
            Checkout Sessions
          </h1>

          <p className="mt-2 text-gray-300">
            Monitor active, paid, expired, and abandoned customer sessions.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl p-4 md:p-6">
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <p className="text-sm font-semibold text-gray-500">
              Active
            </p>
            <h2 className="mt-2 text-3xl font-black text-green-700">
              {activeCount}
            </h2>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <p className="text-sm font-semibold text-gray-500">
              Paid
            </p>
            <h2 className="mt-2 text-3xl font-black text-blue-700">
              {paidCount}
            </h2>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <p className="text-sm font-semibold text-gray-500">
              Expired Unpaid
            </p>
            <h2 className="mt-2 text-3xl font-black text-orange-700">
              {expiredCount}
            </h2>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <p className="text-sm font-semibold text-gray-500">
              Abandoned
            </p>
            <h2 className="mt-2 text-3xl font-black text-red-700">
              {abandonedCount}
            </h2>
          </div>
        </div>

        <div className="mb-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 lg:items-end">
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">
                Filter by Status
              </label>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="w-full rounded-2xl border border-gray-300 bg-gray-50 p-4 outline-none focus:border-gray-950 focus:bg-white"
              >
                <option value="all">All Sessions</option>
                <option value="active">Active</option>
                <option value="paid">Paid</option>
                <option value="expired">Expired Unpaid</option>
                <option value="abandoned">Abandoned</option>
              </select>
            </div>

            <button
              type="button"
              onClick={refreshPage}
              disabled={loading}
              className="rounded-2xl bg-gray-950 p-4 font-bold text-white hover:bg-gray-800 disabled:bg-gray-500"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('expired')}
              className="rounded-2xl bg-orange-600 p-4 font-bold text-white hover:bg-orange-700"
            >
              Show Expired
            </button>

            <button
              type="button"
              onClick={markExpiredSessionsAsAbandoned}
              className="rounded-2xl bg-red-600 p-4 font-bold text-white hover:bg-red-700"
            >
              Mark Expired Abandoned
            </button>

            <a
              href="/admin"
              className="rounded-2xl bg-gray-200 p-4 text-center font-bold text-gray-800 hover:bg-gray-300"
            >
              Back to Admin
            </a>
          </div>

          <p className="mt-4 text-sm font-semibold text-gray-600">
            Expired Unpaid means the checkout time has passed and the customer has not paid.
            Paid sessions are never included in abandoned updates.
          </p>

          {message && (
            <div className="mt-4 rounded-2xl bg-blue-100 p-4 font-semibold text-blue-800">
              {message}
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-black text-gray-900">
              Session Records
            </h2>

            <span className="rounded-full bg-gray-100 px-4 py-2 text-sm font-bold text-gray-700">
              {sessions.length} record(s)
            </span>
          </div>

          {loading ? (
            <div className="rounded-2xl bg-gray-50 p-8 text-center font-bold text-gray-600">
              Loading sessions...
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-2xl bg-gray-50 p-8 text-center">
              <p className="font-bold text-gray-700">
                No sessions found.
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Start a checkout from the kiosk page to see sessions here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => {
                const total = getSessionTotal(session)
                const itemCount = getItemCount(session)
                const displayStatus = getDisplayStatus(session)

                return (
                  <div
                    key={session.id}
                    className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-black text-gray-900">
                            {session.customer_name}
                          </h3>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusBadgeClass(
                              session
                            )}`}
                          >
                            {displayStatus}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-gray-500">
                          Phone ending: {session.phone_last4}
                        </p>

                        <p className="text-sm text-gray-500">
                          Created: {new Date(session.created_at).toLocaleString()}
                        </p>

                        <p className="text-sm text-gray-500">
                          Expires: {new Date(session.expires_at).toLocaleString()}
                        </p>

                        {session.paid_at && (
                          <p className="text-sm text-gray-500">
                            Paid: {new Date(session.paid_at).toLocaleString()}
                          </p>
                        )}
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
                        <div className="rounded-2xl bg-white p-4">
                          <p className="text-xs font-bold text-gray-500">
                            Items
                          </p>
                          <p className="text-2xl font-black text-gray-900">
                            {itemCount}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white p-4">
                          <p className="text-xs font-bold text-gray-500">
                            Cart Total
                          </p>
                          <p className="text-2xl font-black text-green-700">
                            Rs. {total.toFixed(2)}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white p-4">
                          <p className="text-xs font-bold text-gray-500">
                            Products
                          </p>
                          <p className="text-2xl font-black text-gray-900">
                            {session.cart_items?.length || 0}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => setSelectedSession(session)}
                        className="rounded-2xl bg-gray-950 px-5 py-3 font-bold text-white hover:bg-gray-800"
                      >
                        View Cart
                      </button>

                      {canBeAbandoned(session) && (
                        <button
                          type="button"
                          onClick={() => markAsAbandoned(session.id)}
                          className="rounded-2xl bg-red-600 px-5 py-3 font-bold text-white hover:bg-red-700"
                        >
                          Mark Abandoned
                        </button>
                      )}

                      <a
                        href={`/customer/${session.qr_token}`}
                        target="_blank"
                        className="rounded-2xl bg-gray-200 px-5 py-3 text-center font-bold text-gray-800 hover:bg-gray-300"
                      >
                        Open Customer Page
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-5 shadow-xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-gray-900">
                  {selectedSession.customer_name}&apos;s Cart
                </h2>

                <p className="text-sm text-gray-500">
                  Session status: {getDisplayStatus(selectedSession)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSession(null)}
                className="rounded-xl bg-gray-200 px-4 py-2 font-bold text-gray-800 hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            {!selectedSession.cart_items ||
            selectedSession.cart_items.length === 0 ? (
              <div className="rounded-2xl bg-gray-50 p-8 text-center">
                <p className="font-bold text-gray-700">
                  This cart is empty.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-gray-200">
                <table className="w-full min-w-[650px] text-left text-sm">
                  <thead className="bg-gray-950 text-white">
                    <tr>
                      <th className="p-3">Product</th>
                      <th className="p-3">Barcode</th>
                      <th className="p-3">Qty</th>
                      <th className="p-3">Price</th>
                      <th className="p-3">Subtotal</th>
                    </tr>
                  </thead>

                  <tbody>
                    {selectedSession.cart_items.map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="p-3 font-bold text-gray-900">
                          {item.products?.name || 'Unknown Product'}
                        </td>

                        <td className="p-3 text-gray-600">
                          {item.products?.barcode || 'N/A'}
                        </td>

                        <td className="p-3 text-gray-600">
                          {item.quantity}
                        </td>

                        <td className="p-3 text-gray-600">
                          Rs. {Number(item.price_at_time).toFixed(2)}
                        </td>

                        <td className="p-3 font-bold text-gray-900">
                          Rs.{' '}
                          {(
                            Number(item.quantity) *
                            Number(item.price_at_time)
                          ).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-5 rounded-2xl bg-gray-950 p-5 text-white">
              <div className="flex justify-between">
                <span className="text-lg">Total</span>
                <span className="text-2xl font-black">
                  Rs. {getSessionTotal(selectedSession).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
