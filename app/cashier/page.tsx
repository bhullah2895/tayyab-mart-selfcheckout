'use client'

import { useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Html5Qrcode } from 'html5-qrcode'

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

type CheckoutSession = {
  id: string
  customer_name: string
  phone_last4: string
  qr_token: string
  status: string
  expires_at: string
  created_at: string
  paid_at: string | null
}

export default function CashierPage() {
  const [tokenInput, setTokenInput] = useState('')
  const [session, setSession] = useState<CheckoutSession | null>(null)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)
  const [paying, setPaying] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>(
    'info'
  )

  const [scannerOpen, setScannerOpen] = useState(false)
  const [scanning, setScanning] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const [itemBarcode, setItemBarcode] = useState('')
  const [addingItem, setAddingItem] = useState(false)
  const [itemScannerOpen, setItemScannerOpen] = useState(false)
  const [itemScanning, setItemScanning] = useState(false)
  const itemScannerRef = useRef<Html5Qrcode | null>(null)
  const itemInputRef = useRef<HTMLInputElement | null>(null)

  function showMessage(text: string, type: 'success' | 'error' | 'info') {
    setMessage(text)
    setMessageType(type)
  }

  function extractToken(value: string) {
    const cleanValue = value.trim()

    if (cleanValue.includes('/customer/')) {
      return cleanValue.split('/customer/')[1]?.split('?')[0]?.split('#')[0]
    }

    return cleanValue
  }

  const total = cartItems.reduce((sum, item) => {
    return sum + Number(item.quantity) * Number(item.price_at_time)
  }, 0)

  async function loadSessionAndCartFromToken(rawValue: string) {
    const token = extractToken(rawValue)

    if (!token) {
      showMessage('Please scan or enter a customer QR code.', 'error')
      return
    }

    setLoading(true)
    setMessage('')
    setSession(null)
    setCartItems([])

    const { data: sessionData, error: sessionError } = await supabase
      .from('checkout_sessions')
      .select('*')
      .eq('qr_token', token)
      .single()

    if (sessionError || !sessionData) {
      setLoading(false)
      showMessage('Session not found. Please scan again.', 'error')
      return
    }

    setSession(sessionData)

    if (sessionData.status !== 'active') {
      setLoading(false)
      showMessage(`This session is already ${sessionData.status}.`, 'error')
      return
    }

    const isExpired = new Date(sessionData.expires_at) < new Date()

    if (isExpired) {
      setLoading(false)
      showMessage('This session has expired.', 'error')
      return
    }

    const { data: cartData, error: cartError } = await supabase
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
      .eq('session_id', sessionData.id)
      .order('created_at', { ascending: true })

    setLoading(false)

    if (cartError) {
      showMessage(cartError.message, 'error')
      return
    }

    setCartItems((cartData as any) || [])
    showMessage('Customer cart loaded successfully.', 'success')
  }

  async function loadSessionAndCart(e?: React.FormEvent) {
    if (e) e.preventDefault()
    await loadSessionAndCartFromToken(tokenInput)
  }

  async function refreshCart() {
    if (!session) return

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
      .eq('session_id', session.id)
      .order('created_at', { ascending: true })

    if (error) {
      showMessage(error.message, 'error')
      return
    }

    setCartItems((data as any) || [])
  }

  async function addProductToCartByBarcode(rawBarcode: string) {
    if (!session) {
      showMessage('Load a customer session first.', 'error')
      return
    }

    if (session.status !== 'active') {
      showMessage('This session is not active. You cannot add items.', 'error')
      return
    }

    const cleanBarcode = rawBarcode.trim()

    if (!cleanBarcode) {
      showMessage('Please enter or scan a product barcode.', 'error')
      return
    }

    setAddingItem(true)
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

      setAddingItem(false)

      if (existingProduct) {
        showMessage('This product has been deactivated.', 'error')
      } else {
        showMessage(`Product not found: ${cleanBarcode}`, 'error')
      }
      return
    }

    if (Number(product.stock_quantity) <= 0) {
      setAddingItem(false)
      showMessage('This product is out of stock.', 'error')
      return
    }

    const { data: existingItem, error: existingError } = await supabase
      .from('cart_items')
      .select('*')
      .eq('session_id', session.id)
      .eq('product_id', product.id)
      .maybeSingle()

    if (existingError) {
      setAddingItem(false)
      showMessage(existingError.message, 'error')
      return
    }

    if (existingItem) {
      const newQuantity = Number(existingItem.quantity) + 1

      if (newQuantity > Number(product.stock_quantity)) {
        setAddingItem(false)
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
        setAddingItem(false)
        showMessage(updateError.message, 'error')
        return
      }
    } else {
      const { error: insertError } = await supabase.from('cart_items').insert([
        {
          session_id: session.id,
          product_id: product.id,
          quantity: 1,
          price_at_time: product.price,
        },
      ])

      if (insertError) {
        setAddingItem(false)
        showMessage(insertError.message, 'error')
        return
      }
    }

    setItemBarcode('')
    showMessage(`${product.name} added to customer cart.`, 'success')
    await refreshCart()
    setAddingItem(false)
  }

  async function addProductFromForm(e: React.FormEvent) {
    e.preventDefault()
    await addProductToCartByBarcode(itemBarcode)
  }

  async function startItemCameraScanner() {
    if (!session) {
      showMessage('Load a customer session first.', 'error')
      return
    }

    if (session.status !== 'active') {
      showMessage('This session is not active. You cannot add items.', 'error')
      return
    }

    setItemScannerOpen(true)
    setItemScanning(true)
    setMessage('')

    setTimeout(async () => {
      try {
        const scannerElementId = 'cashier-item-scanner'

        if (!itemScannerRef.current) {
          itemScannerRef.current = new Html5Qrcode(scannerElementId)
        }

        await itemScannerRef.current.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: {
              width: 260,
              height: 160,
            },
          },
          async (decodedText: string) => {
            await stopItemCameraScanner()
            setItemBarcode(decodedText)
            await addProductToCartByBarcode(decodedText)
          },
          () => {}
        )
      } catch (error: any) {
        setItemScanning(false)
        setItemScannerOpen(false)

        showMessage(
          error?.message ||
            'Camera could not start. Use HTTPS or enter barcode manually.',
          'error'
        )
      }
    }, 300)
  }

  async function stopItemCameraScanner() {
    try {
      if (itemScannerRef.current) {
        await itemScannerRef.current.stop()

        try {
          itemScannerRef.current.clear()
        } catch {
          // ignore clear error
        }

        itemScannerRef.current = null
      }
    } catch {
      // ignore stop error
    }

    setItemScanning(false)
    setItemScannerOpen(false)
  }

  async function increaseQuantity(item: CartItem) {
    const newQuantity = Number(item.quantity) + 1

    if (newQuantity > Number(item.products.stock_quantity)) {
      showMessage('Not enough stock available.', 'error')
      return
    }

    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: newQuantity })
      .eq('id', item.id)

    if (error) {
      showMessage(error.message, 'error')
      return
    }

    await refreshCart()
  }

  async function decreaseQuantity(item: CartItem) {
    const newQuantity = Number(item.quantity) - 1

    if (newQuantity <= 0) {
      await removeItem(item.id)
      return
    }

    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: newQuantity })
      .eq('id', item.id)

    if (error) {
      showMessage(error.message, 'error')
      return
    }

    await refreshCart()
  }

  async function removeItem(itemId: string) {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', itemId)

    if (error) {
      showMessage(error.message, 'error')
      return
    }

    showMessage('Item removed from cart.', 'success')
    await refreshCart()
  }

  async function markAsPaid() {
    if (!session) {
      showMessage('No session loaded.', 'error')
      return
    }

    if (cartItems.length === 0) {
      showMessage('Cart is empty. Cannot mark as paid.', 'error')
      return
    }

    const confirmed = confirm(
      `Confirm payment?\n\nCustomer: ${session.customer_name}\nTotal: Rs. ${total.toFixed(
        2
      )}`
    )

    if (!confirmed) return

    setPaying(true)
    setMessage('')

    const { error } = await supabase.rpc('mark_session_paid', {
      p_session_id: session.id,
      p_cashier_id: null,
      p_payment_method: 'cash',
    })

    setPaying(false)

    if (error) {
      showMessage(error.message, 'error')
      return
    }

    showMessage(`Payment completed successfully.`, 'success')

    setSession({
      ...session,
      status: 'paid',
      paid_at: new Date().toISOString(),
    })
  }

  async function startCameraScanner() {
    setScannerOpen(true)
    setScanning(true)
    setMessage('')

    setTimeout(async () => {
      try {
        const scannerElementId = 'cashier-qr-scanner'

        if (!scannerRef.current) {
          scannerRef.current = new Html5Qrcode(scannerElementId)
        }

        await scannerRef.current.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: {
              width: 260,
              height: 260,
            },
          },
          async (decodedText: string) => {
            await stopCameraScanner()
            setTokenInput(decodedText)
            await loadSessionAndCartFromToken(decodedText)
          },
          () => {}
        )
      } catch (error: any) {
        setScanning(false)
        setScannerOpen(false)
        showMessage(
          error?.message ||
            'Camera could not start. Use HTTPS or enter the token manually.',
          'error'
        )
      }
    }, 300)
  }

  async function stopCameraScanner() {
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
      // ignore stop error
    }

    setScanning(false)
    setScannerOpen(false)
  }

  function resetCashier() {
    setTokenInput('')
    setItemBarcode('')
    setSession(null)
    setCartItems([])
    setMessage('')
    inputRef.current?.focus()
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="bg-gray-950 px-5 py-5 text-white shadow">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-gray-400">
              Tayyab Mart
            </p>
            <h1 className="text-3xl font-black">Cashier Checkout</h1>
          </div>

          <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-gray-200">
            Scan customer checkout QR to load cart
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl p-4 md:p-6">
        <form
          onSubmit={loadSessionAndCart}
          className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200 md:p-6"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1">
              <label className="mb-2 block text-sm font-bold text-gray-800">
                Customer QR / Session URL
              </label>

              <input
                ref={inputRef}
                autoFocus
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Scan with QR machine or paste customer URL"
                className="w-full rounded-2xl border border-gray-300 bg-gray-50 p-4 text-base text-gray-900 outline-none focus:border-gray-950 focus:bg-white"
              />

              <p className="mt-2 text-xs text-gray-500">
                Desktop QR scanner: click this box once, then scan the customer QR.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="rounded-2xl bg-gray-950 px-6 py-4 font-bold text-white hover:bg-gray-800 disabled:bg-gray-500"
            >
              {loading ? 'Loading...' : 'Load Cart'}
            </button>

            <button
              type="button"
              onClick={startCameraScanner}
              className="rounded-2xl bg-blue-700 px-6 py-4 font-bold text-white hover:bg-blue-800 md:hidden"
            >
              Use Camera
            </button>
          </div>

          <button
            type="button"
            onClick={startCameraScanner}
            className="mt-4 hidden w-full rounded-2xl bg-blue-700 p-4 font-bold text-white hover:bg-blue-800 md:block lg:hidden"
          >
            Use Camera Scanner
          </button>

          {message && (
            <div
              className={`mt-4 rounded-2xl p-4 text-sm font-semibold ${
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
          <div className="mt-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-900">
                Scan Customer QR
              </h2>

              <button
                type="button"
                onClick={stopCameraScanner}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white"
              >
                Close
              </button>
            </div>

            <div
              id="cashier-qr-scanner"
              className="overflow-hidden rounded-2xl border border-gray-300"
            />

            {scanning && (
              <p className="mt-3 text-center text-sm text-gray-600">
                Point the camera at the customer checkout QR.
              </p>
            )}
          </div>
        )}

        {session && (
          <>
            {session.status === 'active' && (
              <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200 md:p-6">
                <div className="mb-4">
                  <h2 className="text-2xl font-black text-gray-900">
                    Add Item to Customer Cart
                  </h2>

                  <p className="mt-1 text-sm text-gray-600">
                    Use desktop barcode scanner, manual barcode entry, or mobile camera.
                  </p>
                </div>

                <form
                  onSubmit={addProductFromForm}
                  className="flex flex-col gap-3 md:flex-row md:items-end"
                >
                  <div className="flex-1">
                    <label className="mb-2 block text-sm font-bold text-gray-800">
                      Product Barcode
                    </label>

                    <input
                      ref={itemInputRef}
                      value={itemBarcode}
                      onChange={(e) => setItemBarcode(e.target.value)}
                      placeholder="Scan product barcode or type manually"
                      className="w-full rounded-2xl border border-gray-300 bg-gray-50 p-4 text-base text-gray-900 outline-none focus:border-gray-950 focus:bg-white"
                    />

                    <p className="mt-2 text-xs text-gray-500">
                      Desktop scanner: click this box once, then scan the product barcode.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={addingItem}
                    className="rounded-2xl bg-gray-950 px-6 py-4 font-bold text-white hover:bg-gray-800 disabled:bg-gray-500"
                  >
                    {addingItem ? 'Adding...' : 'Add Item'}
                  </button>

                  <button
                    type="button"
                    onClick={startItemCameraScanner}
                    className="rounded-2xl bg-blue-700 px-6 py-4 font-bold text-white hover:bg-blue-800"
                  >
                    Scan Item
                  </button>
                </form>

                {itemScannerOpen && (
                  <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-black text-gray-900">
                        Product Barcode Scanner
                      </h3>

                      <button
                        type="button"
                        onClick={stopItemCameraScanner}
                        className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white"
                      >
                        Close
                      </button>
                    </div>

                    <div
                      id="cashier-item-scanner"
                      className="overflow-hidden rounded-2xl border border-gray-300 bg-white"
                    />

                    {itemScanning && (
                      <p className="mt-3 text-center text-sm text-gray-600">
                        Point the camera at the product barcode.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              <section className="lg:col-span-2">
                <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200 md:p-6">
                  <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-2xl font-black text-gray-900">
                        Customer Cart
                      </h2>
                      <p className="text-gray-600">
                        {session.customer_name} • Phone ending {session.phone_last4}
                      </p>
                    </div>

                    <span
                      className={`w-fit rounded-full px-4 py-2 text-sm font-bold ${
                        session.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {session.status.toUpperCase()}
                    </span>
                  </div>

                  {cartItems.length === 0 ? (
                    <div className="rounded-2xl bg-gray-50 p-8 text-center">
                      <p className="font-bold text-gray-700">Cart is empty.</p>
                      <p className="mt-1 text-sm text-gray-500">
                        Ask customer to add items before payment.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {cartItems.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
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
                                <h3 className="text-lg font-black text-gray-900">
                                  {item.products.name}
                                </h3>

                                <p className="mt-1 text-sm text-gray-500">
                                  Barcode: {item.products.barcode}
                                </p>

                                <p className="text-sm text-gray-500">
                                  Price: Rs. {Number(item.price_at_time).toFixed(2)}
                                </p>

                                <p className="text-sm text-gray-500">
                                  Stock: {item.products.stock_quantity}{' '}
                                  {item.products.unit_type}
                                </p>
                              </div>
                            </div>

                            <div className="text-left md:text-right">
                              <p className="text-xl font-black text-gray-900">
                                Rs.{' '}
                                {(
                                  Number(item.quantity) *
                                  Number(item.price_at_time)
                                ).toFixed(2)}
                              </p>
                            </div>
                          </div>

                          {session.status === 'active' && (
                            <div className="mt-4 flex items-center justify-between">
                              <div className="flex items-center gap-3 rounded-2xl bg-white p-2">
                                <button
                                  type="button"
                                  onClick={() => decreaseQuantity(item)}
                                  className="h-10 w-10 rounded-xl bg-gray-200 text-xl font-black text-gray-900"
                                >
                                  -
                                </button>

                                <span className="min-w-10 text-center font-black text-gray-900">
                                  {item.quantity}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => increaseQuantity(item)}
                                  className="h-10 w-10 rounded-xl bg-gray-200 text-xl font-black text-gray-900"
                                >
                                  +
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => removeItem(item.id)}
                                className="rounded-xl px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50"
                              >
                                Remove
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <aside>
                <div className="sticky top-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200 md:p-6">
                  <h2 className="text-2xl font-black text-gray-900">
                    Payment Summary
                  </h2>

                  <div className="mt-5 space-y-4">
                    <div className="flex justify-between text-gray-700">
                      <span>Customer</span>
                      <span className="font-bold">{session.customer_name}</span>
                    </div>

                    <div className="flex justify-between text-gray-700">
                      <span>Items</span>
                      <span className="font-bold">{cartItems.length}</span>
                    </div>

                    <div className="border-t pt-5">
                      <div className="flex justify-between">
                        <span className="text-lg font-bold text-gray-700">
                          Total
                        </span>
                        <span className="text-3xl font-black text-gray-950">
                          Rs. {total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {session.status === 'active' ? (
                    <button
                      type="button"
                      onClick={markAsPaid}
                      disabled={paying || cartItems.length === 0}
                      className="mt-6 w-full rounded-2xl bg-green-700 p-4 text-lg font-black text-white hover:bg-green-800 disabled:bg-gray-400"
                    >
                      {paying ? 'Processing...' : 'Mark as Paid'}
                    </button>
                  ) : (
                    <div className="mt-6 rounded-2xl bg-green-100 p-4 text-center font-black text-green-800">
                      Payment completed
                    </div>
                  )}


                  <button
                    type="button"
                    onClick={resetCashier}
                    className="mt-3 w-full rounded-2xl bg-gray-950 p-4 font-bold text-white hover:bg-gray-800"
                  >
                    New Customer
                  </button>
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </main>
  )
}