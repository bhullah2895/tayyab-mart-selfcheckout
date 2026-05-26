'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

type SaleItem = {
  id: string
  product_name: string
  barcode: string
  quantity: number
  price_at_time: number
  subtotal: number
}

type Sale = {
  id: string
  total_amount: number
  payment_method: string
  created_at: string
  checkout_sessions: {
    customer_name: string
    phone_last4: string
    qr_token: string
  } | null
  sale_items: SaleItem[]
}

export default function SalesReportPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  async function loadSales() {
    setLoading(true)
    setMessage('')

    let query = supabase
      .from('sales')
      .select(`
        id,
        total_amount,
        payment_method,
        created_at,
        checkout_sessions (
          customer_name,
          phone_last4,
          qr_token
        ),
        sale_items (
          id,
          product_name,
          barcode,
          quantity,
          price_at_time,
          subtotal
        )
      `)
      .order('created_at', { ascending: false })

    if (fromDate) {
      query = query.gte('created_at', `${fromDate}T00:00:00`)
    }

    if (toDate) {
      query = query.lte('created_at', `${toDate}T23:59:59`)
    }

    const { data, error } = await query

    setLoading(false)

    if (error) {
      setMessage(error.message)
      return
    }

    setSales((data as any) || [])
  }

  useEffect(() => {
    loadSales()
  }, [])

  const totalRevenue = sales.reduce((sum, sale) => {
    return sum + Number(sale.total_amount)
  }, 0)

  const totalTransactions = sales.length

  const totalItemsSold = sales.reduce((sum, sale) => {
    const itemCount = sale.sale_items?.reduce((itemSum, item) => {
      return itemSum + Number(item.quantity)
    }, 0)

    return sum + Number(itemCount || 0)
  }, 0)

  const averageOrderValue =
    totalTransactions > 0 ? totalRevenue / totalTransactions : 0

  function clearFilters() {
    setFromDate('')
    setToDate('')
    setTimeout(() => {
      loadSales()
    }, 100)
  }

  function downloadCSV() {
    if (sales.length === 0) {
      alert('No sales to export.')
      return
    }

    const rows = [
      [
        'Sale ID',
        'Date',
        'Customer',
        'Phone Last 4',
        'Payment Method',
        'Product',
        'Barcode',
        'Quantity',
        'Unit Price',
        'Subtotal',
        'Sale Total',
      ],
    ]

    sales.forEach((sale) => {
      if (sale.sale_items && sale.sale_items.length > 0) {
        sale.sale_items.forEach((item) => {
          rows.push([
            sale.id,
            new Date(sale.created_at).toLocaleString(),
            sale.checkout_sessions?.customer_name || '',
            sale.checkout_sessions?.phone_last4 || '',
            sale.payment_method,
            item.product_name,
            item.barcode,
            String(item.quantity),
            String(item.price_at_time),
            String(item.subtotal),
            String(sale.total_amount),
          ])
        })
      } else {
        rows.push([
          sale.id,
          new Date(sale.created_at).toLocaleString(),
          sale.checkout_sessions?.customer_name || '',
          sale.checkout_sessions?.phone_last4 || '',
          sale.payment_method,
          '',
          '',
          '',
          '',
          '',
          String(sale.total_amount),
        ])
      }
    })

    const csvContent = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n')

    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `tayyab-mart-sales-report-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="bg-gray-950 px-5 py-6 text-white shadow">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm uppercase tracking-wide text-gray-400">
            Tayyab Mart Admin
          </p>

          <h1 className="mt-1 text-3xl font-black">
            Sales Report
          </h1>

          <p className="mt-2 text-gray-300">
            View completed transactions, revenue, and sold items.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl p-4 md:p-6">
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <p className="text-sm font-semibold text-gray-500">
              Total Revenue
            </p>
            <h2 className="mt-2 text-3xl font-black text-gray-950">
              Rs. {totalRevenue.toFixed(2)}
            </h2>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <p className="text-sm font-semibold text-gray-500">
              Transactions
            </p>
            <h2 className="mt-2 text-3xl font-black text-gray-950">
              {totalTransactions}
            </h2>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <p className="text-sm font-semibold text-gray-500">
              Items Sold
            </p>
            <h2 className="mt-2 text-3xl font-black text-gray-950">
              {totalItemsSold}
            </h2>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <p className="text-sm font-semibold text-gray-500">
              Average Order
            </p>
            <h2 className="mt-2 text-3xl font-black text-gray-950">
              Rs. {averageOrderValue.toFixed(2)}
            </h2>
          </div>
        </div>

        <div className="mb-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div className="grid gap-4 md:grid-cols-4 md:items-end">
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full rounded-2xl border border-gray-300 bg-gray-50 p-4 outline-none focus:border-gray-950 focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full rounded-2xl border border-gray-300 bg-gray-50 p-4 outline-none focus:border-gray-950 focus:bg-white"
              />
            </div>

            <button
              type="button"
              onClick={loadSales}
              disabled={loading}
              className="rounded-2xl bg-gray-950 p-4 font-bold text-white hover:bg-gray-800 disabled:bg-gray-500"
            >
              {loading ? 'Loading...' : 'Apply Filter'}
            </button>

            <button
              type="button"
              onClick={clearFilters}
              className="rounded-2xl bg-gray-200 p-4 font-bold text-gray-800 hover:bg-gray-300"
            >
              Clear Filter
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:justify-between">
            <a
              href="/admin"
              className="rounded-2xl bg-white px-5 py-3 text-center font-bold text-gray-800 ring-1 ring-gray-300 hover:bg-gray-50"
            >
              Back to Admin
            </a>

            <button
              type="button"
              onClick={downloadCSV}
              className="rounded-2xl bg-green-700 px-5 py-3 font-bold text-white hover:bg-green-800"
            >
              Download CSV Report
            </button>
          </div>

          {message && (
            <div className="mt-4 rounded-2xl bg-red-100 p-4 font-semibold text-red-800">
              {message}
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-black text-gray-900">
              Completed Sales
            </h2>

            <span className="rounded-full bg-gray-100 px-4 py-2 text-sm font-bold text-gray-700">
              {sales.length} record(s)
            </span>
          </div>

          {loading ? (
            <div className="rounded-2xl bg-gray-50 p-8 text-center font-bold text-gray-600">
              Loading sales...
            </div>
          ) : sales.length === 0 ? (
            <div className="rounded-2xl bg-gray-50 p-8 text-center">
              <p className="font-bold text-gray-700">
                No sales found.
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Complete a checkout from the cashier page to see reports here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sales.map((sale) => (
                <div
                  key={sale.id}
                  className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-lg font-black text-gray-900">
                        {sale.checkout_sessions?.customer_name || 'Unknown Customer'}
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        Phone ending: {sale.checkout_sessions?.phone_last4 || 'N/A'}
                      </p>

                      <p className="text-sm text-gray-500">
                        Date: {new Date(sale.created_at).toLocaleString()}
                      </p>

                      <p className="text-sm text-gray-500">
                        Payment: {sale.payment_method}
                      </p>
                    </div>

                    <div className="text-left md:text-right">
                      <p className="text-sm font-semibold text-gray-500">
                        Total
                      </p>

                      <p className="text-2xl font-black text-green-700">
                        Rs. {Number(sale.total_amount).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 overflow-x-auto rounded-2xl bg-white">
                    <table className="w-full min-w-[650px] text-left text-sm">
                      <thead className="bg-gray-950 text-white">
                        <tr>
                          <th className="p-3">Product</th>
                          <th className="p-3">Barcode</th>
                          <th className="p-3">Qty</th>
                          <th className="p-3">Unit Price</th>
                          <th className="p-3">Subtotal</th>
                        </tr>
                      </thead>

                      <tbody>
                        {sale.sale_items?.map((item) => (
                          <tr key={item.id} className="border-b">
                            <td className="p-3 font-semibold text-gray-900">
                              {item.product_name}
                            </td>

                            <td className="p-3 text-gray-600">
                              {item.barcode}
                            </td>

                            <td className="p-3 text-gray-600">
                              {item.quantity}
                            </td>

                            <td className="p-3 text-gray-600">
                              Rs. {Number(item.price_at_time).toFixed(2)}
                            </td>

                            <td className="p-3 font-bold text-gray-900">
                              Rs. {Number(item.subtotal).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}