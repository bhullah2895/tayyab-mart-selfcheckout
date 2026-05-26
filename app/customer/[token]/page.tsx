import { supabase } from '../../../lib/supabase'
import CustomerCart from './CustomerCart'

export default async function CustomerSessionPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const { data: session, error } = await supabase
    .from('checkout_sessions')
    .select('*')
    .eq('qr_token', token)
    .single()

  if (error || !session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
        <div className="max-w-md rounded-xl bg-white p-8 text-center shadow">
          <h1 className="text-2xl font-bold text-red-600">
            Invalid Session
          </h1>

          <p className="mt-3 text-gray-600">
            This checkout session was not found. Please return to the kiosk and start again.
          </p>
        </div>
      </main>
    )
  }

  const isExpired = new Date(session.expires_at) < new Date()

  if (isExpired && session.status !== 'paid') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
        <div className="max-w-md rounded-xl bg-white p-8 text-center shadow">
          <h1 className="text-2xl font-bold text-red-600">
            Session Expired
          </h1>

          <p className="mt-3 text-gray-600">
            This checkout session has expired.
          </p>
        </div>
      </main>
    )
  }

  return (
    <CustomerCart
      sessionId={session.id}
      customerName={session.customer_name}
      phoneLast4={session.phone_last4}
      token={token}
      initialStatus={session.status}
      initialPaidAt={session.paid_at}
    />
  )
}