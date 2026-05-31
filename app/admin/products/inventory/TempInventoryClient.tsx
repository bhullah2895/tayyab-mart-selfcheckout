'use client'

import { useMemo, useState } from 'react'
import { removeProductFromInventory } from './actions'

type Product = {
  id: string
  name: string
  barcode: string
  price: number
  cost_price: number
  stock_quantity: number
  low_stock_threshold: number
  unit_type: string
  image_url: string | null
  is_active: boolean
  categories?: {
    name?: string
  }[] | null
}

export default function InventoryClient({ products }: { products: Product[] }) {
  const [search, setSearch] = useState('')
  const [showRemoved, setShowRemoved] = useState(false)

  const filteredProducts = useMemo(() => {
    const text = search.toLowerCase().trim()

    return products.filter((product) => {
      const categoryName = product.categories?.[0]?.name || ''

      const matchesSearch =
        product.name?.toLowerCase().includes(text) ||
        product.barcode?.toLowerCase().includes(text) ||
        categoryName.toLowerCase().includes(text)

      const matchesStatus = showRemoved ? true : product.is_active

      return matchesSearch && matchesStatus
    })
  }, [products, search, showRemoved])

  const totalProducts = products.filter((product) => product.is_active).length

  const lowStockProducts = products.filter(
    (product) =>
      product.is_active &&
      Number(product.stock_quantity) <= Number(product.low_stock_threshold)
  ).length

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Product Inventory
              </p>

              <h1 className="mt-1 text-3xl font-bold text-gray-950">
                Inventory Products
              </h1>

              <p className="mt-2 text-gray-600">
                Search products, edit stock, and remove discontinued items from
                active inventory.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="/admin/products"
                className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-bold text-gray-800 hover:bg-gray-50"
              >
                Back
              </a>

              <a
                href="/admin/products/add"
                className="rounded-xl bg-green-600 px-5 py-3 text-sm font-bold text-white hover:bg-green-700"
              >
                Add Product
              </a>

              <a
                href="/admin"
                className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-bold text-white hover:bg-black"
              >
                Admin Dashboard
              </a>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-gray-100 p-5">
              <p className="text-sm font-semibold text-gray-500">
                Active Products
              </p>

              <p className="mt-2 text-3xl font-bold text-gray-950">
                {totalProducts}
              </p>
            </div>

            <div className="rounded-2xl bg-red-50 p-5">
              <p className="text-sm font-semibold text-red-600">
                Low Stock Items
              </p>

              <p className="mt-2 text-3xl font-bold text-red-700">
                {lowStockProducts}
              </p>
            </div>

            <div className="rounded-2xl bg-blue-50 p-5">
              <p className="text-sm font-semibold text-blue-600">
                Showing Results
              </p>

              <p className="mt-2 text-3xl font-bold text-blue-700">
                {filteredProducts.length}
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="w-full md:max-w-xl">
              <label className="mb-2 block text-sm font-bold text-gray-700">
                Search Product
              </label>

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by product name, barcode, or category..."
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
              />
            </div>

            <label className="flex items-center gap-3 rounded-xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={showRemoved}
                onChange={(event) => setShowRemoved(event.target.checked)}
                className="h-4 w-4"
              />
              Show removed products
            </label>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse text-left">
              <thead>
                <tr className="bg-gray-950 text-white">
                  <th className="p-4 text-sm font-bold">Product</th>
                  <th className="p-4 text-sm font-bold">Barcode</th>
                  <th className="p-4 text-sm font-bold">Category</th>
                  <th className="p-4 text-sm font-bold">Price</th>
                  <th className="p-4 text-sm font-bold">Stock</th>
                  <th className="p-4 text-sm font-bold">Unit</th>
                  <th className="p-4 text-sm font-bold">Status</th>
                  <th className="p-4 text-sm font-bold">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-10 text-center">
                      <p className="text-lg font-bold text-gray-800">
                        No products found
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        Try searching with another product name or barcode.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => {
                    const isLowStock =
                      Number(product.stock_quantity) <=
                      Number(product.low_stock_threshold)

                    const categoryName =
                      product.categories?.[0]?.name || 'No Category'

                    return (
                      <tr
                        key={product.id}
                        className={`border-b border-gray-200 ${
                          product.is_active
                            ? 'hover:bg-gray-50'
                            : 'bg-gray-50 opacity-70'
                        }`}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="h-14 w-14 rounded-xl border border-gray-200 object-cover"
                              />
                            ) : (
                              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gray-200 text-xs font-semibold text-gray-500">
                                No Img
                              </div>
                            )}

                            <div>
                              <p className="font-bold text-gray-950">
                                {product.name}
                              </p>

                              {isLowStock && product.is_active && (
                                <p className="mt-1 text-xs font-bold text-red-600">
                                  Low stock alert
                                </p>
                              )}

                              {!product.is_active && (
                                <p className="mt-1 text-xs font-bold text-gray-500">
                                  Removed from inventory
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="p-4 text-sm font-medium text-gray-600">
                          {product.barcode}
                        </td>

                        <td className="p-4 text-sm font-medium text-gray-600">
                          {categoryName}
                        </td>

                        <td className="p-4 font-bold text-gray-950">
                          Rs. {product.price}
                        </td>

                        <td className="p-4">
                          <span
                            className={`rounded-full px-3 py-1 text-sm font-bold ${
                              isLowStock
                                ? 'bg-red-100 text-red-700'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {product.stock_quantity}
                          </span>
                        </td>

                        <td className="p-4 text-sm font-medium text-gray-600">
                          {product.unit_type}
                        </td>

                        <td className="p-4">
                          {product.is_active ? (
                            <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-bold text-green-700">
                              Active
                            </span>
                          ) : (
                            <span className="rounded-full bg-gray-200 px-3 py-1 text-sm font-bold text-gray-700">
                              Removed
                            </span>
                          )}
                        </td>

                        <td className="p-4">
                          <div className="flex flex-wrap gap-2">
                            <a
                              href={`/admin/products/${product.id}/edit`}
                              className="rounded-xl bg-gray-950 px-4 py-2 text-sm font-bold text-white hover:bg-black"
                            >
                              Edit / Restock
                            </a>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  )
}