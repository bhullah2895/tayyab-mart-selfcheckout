import { supabase } from '../../../lib/supabase'

export default async function LowStockPage() {
  const { data: products, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      barcode,
      price,
      stock_quantity,
      low_stock_threshold,
      unit_type,
      image_url,
      is_active,
      categories (
        name
      )
    `)
    .eq('is_active', true)
    .order('stock_quantity', { ascending: true })

  if (error) {
    return (
      <main className="p-8">
        <h1>Error loading low stock products</h1>
        <pre>{JSON.stringify(error, null, 2)}</pre>
      </main>
    )
  }

  const lowStockProducts =
    products?.filter(
      (product: any) =>
        Number(product.stock_quantity) <=
        Number(product.low_stock_threshold)
    ) || []

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Low Stock Products
          </h1>
          <p className="text-gray-600">
            Products that need restocking soon.
          </p>
        </div>

        <a
          href="/admin"
          className="rounded-lg bg-black px-4 py-2 text-white hover:bg-gray-800"
        >
          Back to Admin
        </a>
      </div>

      <div className="mb-6 rounded-xl bg-red-100 p-5 text-red-800">
        <h2 className="text-xl font-semibold">
          {lowStockProducts.length} product(s) need restocking
        </h2>
      </div>

      {lowStockProducts.length === 0 ? (
        <div className="rounded-xl bg-white p-8 shadow">
          <h2 className="text-2xl font-bold text-green-700">
            All stock levels are healthy
          </h2>
          <p className="mt-2 text-gray-600">
            No products are currently below their low stock threshold.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow">
          <table className="w-full border-collapse text-left">
            <thead className="bg-red-700 text-white">
              <tr>
                <th className="p-4">Product</th>
                <th className="p-4">Barcode</th>
                <th className="p-4">Category</th>
                <th className="p-4">Current Stock</th>
                <th className="p-4">Low Stock Limit</th>
                <th className="p-4">Unit</th>
                <th className="p-4">Suggested Action</th>
              </tr>
            </thead>

            <tbody>
              {lowStockProducts.map((product: any) => (
                <tr key={product.id} className="border-b hover:bg-red-50">
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
                        <p className="text-xs font-semibold text-red-600">
                          Low stock
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="p-4 text-gray-600">
                    {product.barcode}
                  </td>

                  <td className="p-4 text-gray-600">
                    {product.categories?.name || 'No Category'}
                  </td>

                  <td className="p-4">
                    <span className="rounded-full bg-red-100 px-3 py-1 font-semibold text-red-700">
                      {product.stock_quantity}
                    </span>
                  </td>

                  <td className="p-4">
                    {product.low_stock_threshold}
                  </td>

                  <td className="p-4">
                    {product.unit_type}
                  </td>

                  <td className="p-4">
                    <a
                      href={`/admin/products/${product.id}/edit`}
                      className="rounded-lg bg-black px-3 py-2 text-sm text-white hover:bg-gray-800"
                    >
                      Restock / Edit
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}