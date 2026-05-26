import { supabase } from '../../../lib/supabase'

export default async function ProductsPage() {
  const { data: products, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      barcode,
      price,
      cost_price,
      stock_quantity,
      low_stock_threshold,
      unit_type,
      image_url,
      is_active,
      categories (
        name
      )
    `)
    .order('name', { ascending: true })

  if (error) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold text-red-600">Error loading products</h1>
        <pre className="mt-4 rounded bg-red-100 p-4 text-sm">
          {JSON.stringify(error, null, 2)}
        </pre>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Products</h1>
          <p className="text-gray-600">
            View all products, prices, stock levels, and low stock alerts.
          </p>
        </div>

        <div className="flex gap-3">
          <a
            href="/admin"
            className="rounded-lg bg-gray-200 px-4 py-2 font-semibold text-gray-800 hover:bg-gray-300"
          >
            Back to Admin
          </a>

          <a
            href="/admin/products/add"
            className="rounded-lg bg-black px-4 py-2 font-semibold text-white hover:bg-gray-800"
          >
            Add Product
          </a>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow">
        <table className="w-full border-collapse text-left">
          <thead className="bg-gray-900 text-white">
            <tr>
              <th className="p-4">Product</th>
              <th className="p-4">Barcode</th>
              <th className="p-4">Category</th>
              <th className="p-4">Price</th>
              <th className="p-4">Stock</th>
              <th className="p-4">Unit</th>
              <th className="p-4">Status</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>

          <tbody>
            {products?.map((product: any) => {
              const isLowStock =
                Number(product.stock_quantity) <=
                Number(product.low_stock_threshold)

              return (
                <tr key={product.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-200 text-xs text-gray-500">
                          No Img
                        </div>
                      )}

                      <div>
                        <p className="font-medium text-gray-900">
                          {product.name}
                        </p>

                        {isLowStock && (
                          <p className="text-xs font-semibold text-red-600">
                            Low stock
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="p-4 text-gray-600">
                    {product.barcode}
                  </td>

                  <td className="p-4 text-gray-600">
                    {product.categories?.name || 'No Category'}
                  </td>

                  <td className="p-4 font-semibold">
                    Rs. {product.price}
                  </td>

                  <td className="p-4">
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-medium ${
                        isLowStock
                          ? 'bg-red-100 text-red-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {product.stock_quantity}
                    </span>
                  </td>

                  <td className="p-4 text-gray-600">
                    {product.unit_type}
                  </td>

                  <td className="p-4">
                    {product.is_active ? (
                      <span className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-700">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-200 px-3 py-1 text-sm text-gray-700">
                        Inactive
                      </span>
                    )}
                  </td>

                  <td className="p-4">
                    <a
                      href={`/admin/products/${product.id}/edit`}
                      className="rounded-lg bg-black px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                    >
                      Edit / Restock
                    </a>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </main>
  )
}