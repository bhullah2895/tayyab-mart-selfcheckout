'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { Html5Qrcode } from 'html5-qrcode'
import QRCode from 'qrcode'

type Product = {
  id: string
  name: string
  barcode: string
  price: number
  stock_quantity: number
  unit_type: string
  image_url: string | null
}

type CartItem = {
  id: string
  session_id: string
  product_id: string
  quantity: number
  price_at_time: number
  products: Product
}

export default function CustomerCart({
  sessionId,
  customerName,
  phoneLast4,
  token,
  initialStatus,
  initialPaidAt,
}: {
  sessionId: string
  customerName: string
  phoneLast4: string
  token: string
  initialStatus: string
  initialPaidAt: string | null
}) {
  const [barcode, setBarcode] = useState('')
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>(
    'info'
  )

  const [sessionStatus, setSessionStatus] = useState(initialStatus)
  const [paidAt, setPaidAt] = useState<string | null>(initialPaidAt)

  const [checkoutQr, setCheckoutQr] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scanning, setScanning] = useState(false)

  const scannerRef = useRef<Html5Qrcode | null>(null)

  const isPaid = sessionStatus === 'paid'

  const total = cartItems.reduce((sum, item) => {
    return sum + Number(item.quantity) * Number(item.price_at_time)
  }, 0)

  function showMessage(text: string, type: 'success' | 'error' | 'info') {
    setMessage(text)
    setMessageType(type)
  }

  async function loadCart() {
    const { data, error } = await supabase
      .from('cart_items')
      .select(`
        id,
        session_id,
        product_id,
        quantity,
        price_at_time,
        products (
          id,
          name,
          barcode,
          price,
          stock_quantity,
          unit_type,
          image_url
        )
      `)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (error) {
      showMessage(error.message, 'error')
      return
    }

    setCartItems((data as any) || [])
  }

  useEffect(() => {
    loadCart()
  }, [])

  useEffect(() => {
    async function makeQr() {
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL || window.location.origin

      const checkoutUrl = `${appUrl}/customer/${token}`
      const qr = await QRCode.toDataURL(checkoutUrl)

      setCheckoutQr(qr)
    }

    makeQr()
  }, [token])

  useEffect(() => {
    const channel = supabase
      .channel(`checkout-session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'checkout_sessions',
          filter: `id=eq.${sessionId}`,
        },
        async (payload) => {
          const updatedSession = payload.new as any

          setSessionStatus(updatedSession.status)
          setPaidAt(updatedSession.paid_at)

          if (updatedSession.status === 'paid') {
            await stopScanner()
            await loadCart()
            showMessage('Payment confirmed. Thank you for shopping!', 'success')
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId])

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})

        try {
          scannerRef.current.clear()
        } catch {
          // ignore cleanup error
        }
      }
    }
  }, [])

  async function addProductToCartByBarcode(cleanBarcode: string) {
    if (isPaid) {
      showMessage('This session is closed. Payment is already completed.', 'error')
      return
    }

    if (!cleanBarcode) {
      showMessage('Please enter a barcode.', 'error')
      return
    }

    setLoading(true)
    setMessage('')

    // First try to find active product using case-insensitive search
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .ilike('barcode', cleanBarcode)
      .eq('is_active', true)
      .single()

    if (productError || !product) {
      // If not found with is_active=true, check if product exists at all
      const { data: existingProduct } = await supabase
        .from('products')
        .select('*')
        .ilike('barcode', cleanBarcode)
        .maybeSingle()

      setLoading(false)

      if (existingProduct) {
        showMessage('This product has been deactivated.', 'error')
      } else {
        showMessage(`Product not found: ${cleanBarcode}`, 'error')
      }
      return
    }

    if (Number(product.stock_quantity) <= 0) {
      setLoading(false)
      showMessage('This product is out of stock.', 'error')
      return
    }

    const { data: existingItem, error: existingError } = await supabase
      .from('cart_items')
      .select('*')
      .eq('session_id', sessionId)
      .eq('product_id', product.id)
      .maybeSingle()

    if (existingError) {
      setLoading(false)
      showMessage(existingError.message, 'error')
      return
    }

    if (existingItem) {
      const newQuantity = Number(existingItem.quantity) + 1

      if (newQuantity > Number(product.stock_quantity)) {
        setLoading(false)
        showMessage('Not enough stock available.', 'error')
        return
      }

      const { error: updateError } = await supabase
        .from('cart_items')
        .update({
          quantity: newQuantity,
        })
        .eq('id', existingItem.id)

      if (updateError) {
        setLoading(false)
        showMessage(updateError.message, 'error')
        return
      }
    } else {
      const { error: insertError } = await supabase.from('cart_items').insert([
        {
          session_id: sessionId,
          product_id: product.id,
          quantity: 1,
          price_at_time: product.price,
        },
      ])

      if (insertError) {
        setLoading(false)
        showMessage(insertError.message, 'error')
        return
      }
    }

    setBarcode('')
    showMessage(`${product.name} added to cart.`, 'success')
    await loadCart()
    setLoading(false)
  }

  async function addProductByBarcode(e: React.FormEvent) {
    e.preventDefault()
    await addProductToCartByBarcode(barcode.trim())
  }

  async function addProductByScannedBarcode(scannedBarcode: string) {
    await addProductToCartByBarcode(scannedBarcode.trim())
  }

  async function increaseQuantity(item: CartItem) {
    if (isPaid) return

    const newQuantity = Number(item.quantity) + 1

    if (newQuantity > Number(item.products.stock_quantity)) {
      showMessage('Not enough stock available.', 'error')
      return
    }

    const { error } = await supabase
      .from('cart_items')
      .update({
        quantity: newQuantity,
      })
      .eq('id', item.id)

    if (error) {
      showMessage(error.message, 'error')
      return
    }

    await loadCart()
  }

  async function decreaseQuantity(item: CartItem) {
    if (isPaid) return

    const newQuantity = Number(item.quantity) - 1

    if (newQuantity <= 0) {
      await removeItem(item.id)
      return
    }

    const { error } = await supabase
      .from('cart_items')
      .update({
        quantity: newQuantity,
      })
      .eq('id', item.id)

    if (error) {
      showMessage(error.message, 'error')
      return
    }

    await loadCart()
  }

  async function removeItem(itemId: string) {
    if (isPaid) return

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', itemId)

    if (error) {
      showMessage(error.message, 'error')
      return
    }

    showMessage('Item removed from cart.', 'success')
    await loadCart()
  }

  async function startScanner() {
    if (isPaid) {
      showMessage('This session is closed. Payment is already completed.', 'error')
      return
    }

    setScannerOpen(true)
    setScanning(true)
    setMessage('')

    setTimeout(async () => {
      try {
        const scannerElementId = 'barcode-scanner'

        if (!scannerRef.current) {
          scannerRef.current = new Html5Qrcode(scannerElementId)
        }

        await scannerRef.current.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: {
              width: 250,
              height: 160,
            },
          },
          async (decodedText: string) => {
            await stopScanner()
            await addProductByScannedBarcode(decodedText)
          },
          () => {}
        )
      } catch (error: any) {
        setScanning(false)
        setScannerOpen(false)

        showMessage(
          error?.message ||
            'Camera could not start. Use HTTPS or enter barcode manually.',
          'error'
        )
      }
    }, 300)
  }

  async function stopScanner() {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop()

        try {
          scannerRef.current.clear()
        } catch {
          // ignore clear error
        }

        scannerRef.current = null
      }
    } catch {
      // ignore scanner stop errors
    }

    setScanning(false)
    setScannerOpen(false)
  }

  function downloadReceipt() {
    const receiptDate = paidAt
      ? new Date(paidAt).toLocaleString()
      : new Date().toLocaleString()

    const lines = [
      'TAYYAB MART',
      'Self Checkout Receipt',
      '------------------------------',
      `Customer: ${customerName}`,
      `Phone Last 4: ${phoneLast4}`,
      `Session: ${token}`,
      `Date: ${receiptDate}`,
      '------------------------------',
      ...cartItems.map((item) => {
        const itemTotal =
          Number(item.quantity) * Number(item.price_at_time)

        return `${item.products.name}
Barcode: ${item.products.barcode}
Qty: ${item.quantity}
Price: Rs. ${Number(item.price_at_time).toFixed(2)}
Subtotal: Rs. ${itemTotal.toFixed(2)}
`
      }),
      '------------------------------',
      `TOTAL: Rs. ${total.toFixed(2)}`,
      'Payment Status: PAID',
      '------------------------------',
      'Thank you for shopping with Tayyab Mart.',
    ]

    const receiptText = lines.join('\n')

    const blob = new Blob([receiptText], {
      type: 'text/plain;charset=utf-8',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `tayyab-mart-receipt-${token.slice(0, 8)}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
  }

  if (isPaid) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-5">
        <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-gray-200">
          <div className="bg-gradient-to-br from-green-600 to-green-800 p-8 text-center text-white">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white text-4xl">
              ✅
            </div>

            <h1 className="mt-6 text-3xl font-black">
              Payment Confirmed
            </h1>

            <p className="mt-2 text-green-100">
              Thank you for shopping, {customerName}.
            </p>
          </div>

          <div className="p-6">
            <div className="rounded-2xl bg-gray-50 p-5">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Paid</span>
                <span className="font-black text-gray-900">
                  Rs. {total.toFixed(2)}
                </span>
              </div>

              <div className="mt-3 flex justify-between">
                <span className="text-gray-600">Items</span>
                <span className="font-bold text-gray-900">
                  {cartItems.length}
                </span>
              </div>

              {paidAt && (
                <div className="mt-3 flex justify-between gap-4">
                  <span className="text-gray-600">Paid At</span>
                  <span className="text-right text-sm font-bold text-gray-900">
                    {new Date(paidAt).toLocaleString()}
                  </span>
                </div>
              )}

              <div className="mt-3 flex justify-between">
                <span className="text-gray-600">Session</span>
                <span className="font-bold text-green-700">
                  Closed
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={downloadReceipt}
              className="mt-6 w-full rounded-2xl bg-gray-950 p-4 font-bold text-white hover:bg-gray-800"
            >
              Download Receipt
            </button>

            <p className="mt-4 text-center text-sm text-gray-500">
              You may now close this page.
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-md pb-32">
        <div className="bg-gradient-to-br from-gray-950 to-gray-800 px-5 py-6 text-white shadow-lg">
          <div className="rounded-2xl bg-white/10 p-5 backdrop-blur">
            <p className="text-sm uppercase tracking-wide text-gray-300">
              Tayyab Mart
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Welcome, {customerName}
            </h1>

            <p className="mt-2 text-sm text-gray-300">
              Scan product barcodes and review your cart before checkout.
            </p>
          </div>
        </div>

        <div className="p-4">
          <form
            onSubmit={addProductByBarcode}
            className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200"
          >
            <label className="mb-2 block text-sm font-semibold text-gray-800">
              Product Barcode
            </label>

            <input
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Enter barcode manually"
              className="w-full rounded-xl border border-gray-300 bg-gray-50 p-4 text-lg outline-none focus:border-black focus:bg-white"
            />

            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full rounded-xl bg-gray-950 p-4 text-base font-bold text-white shadow-sm hover:bg-gray-800 disabled:bg-gray-500"
            >
              {loading ? 'Adding...' : 'Add to Cart'}
            </button>

            <button
              type="button"
              onClick={startScanner}
              className="mt-3 w-full rounded-xl bg-blue-700 p-4 text-base font-bold text-white shadow-sm hover:bg-blue-800"
            >
              Scan Barcode with Camera
            </button>

            {message && (
              <div
                className={`mt-4 rounded-xl p-3 text-sm font-medium ${
                  messageType === 'success'
                    ? 'bg-green-100 text-green-800'
                    : messageType === 'error'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-blue-100 text-blue-800'
                }`}
              >
                {message}
              </div>
            )}
          </form>

          {scannerOpen && (
            <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  Camera Scanner
                </h2>

                <button
                  type="button"
                  onClick={stopScanner}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white"
                >
                  Close
                </button>
              </div>

              <div
                id="barcode-scanner"
                className="overflow-hidden rounded-xl border border-gray-300"
              />

              {scanning && (
                <p className="mt-3 text-center text-sm text-gray-600">
                  Point your camera at a product barcode.
                </p>
              )}
            </div>
          )}

          <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Your Cart</h2>

              <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700">
                {cartItems.length} item(s)
              </span>
            </div>

            {cartItems.length === 0 ? (
              <div className="mt-4 rounded-xl bg-gray-50 p-5 text-center">
                <p className="font-medium text-gray-700">
                  Your cart is empty.
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Scan your first product to begin.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                  >
                    <div className="flex justify-between gap-3">
                      <div className="flex gap-3">
                        {item.products.image_url ? (
                          <img
                            src={item.products.image_url}
                            alt={item.products.name}
                            className="h-16 w-16 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gray-200 text-xs text-gray-500">
                            No Img
                          </div>
                        )}

                        <div>
                          <h3 className="font-bold text-gray-900">
                            {item.products.name}
                          </h3>

                          <p className="mt-1 text-sm text-gray-500">
                            Rs. {Number(item.price_at_time).toFixed(2)} each
                          </p>
                        </div>
                      </div>

                      <div className="text-right font-bold text-gray-900">
                        Rs.{' '}
                        {(
                          Number(item.quantity) * Number(item.price_at_time)
                        ).toFixed(2)}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 rounded-xl bg-white p-2">
                        <button
                          type="button"
                          onClick={() => decreaseQuantity(item)}
                          className="h-9 w-9 rounded-lg bg-gray-200 text-xl font-bold"
                        >
                          -
                        </button>

                        <span className="min-w-8 text-center font-bold">
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() => increaseQuantity(item)}
                          className="h-9 w-9 rounded-lg bg-gray-200 text-xl font-bold"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="rounded-lg px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-gray-200">
            <h2 className="text-xl font-bold text-gray-900">
              Checkout QR
            </h2>

            <p className="mt-1 text-sm text-gray-600">
              Show this QR code to the cashier.
            </p>

            {checkoutQr && (
              <img
                src={checkoutQr}
                alt="Checkout QR Code"
                className="mx-auto mt-4 h-56 w-56 rounded-2xl border bg-white p-3 shadow-sm"
              />
            )}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t bg-white p-4 shadow-2xl">
        <div className="mx-auto max-w-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Cart Total
              </p>
              <p className="text-xs text-gray-400">
                Pay at cashier counter
              </p>
            </div>

            <span className="text-3xl font-black text-gray-950">
              Rs. {total.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </main>
  )
}