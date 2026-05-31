export default function ProductsPage() {
  return (
    <main className="min-h-screen bg-gray-100 p-6 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Store Admin
            </p>

            <h1 className="mt-1 text-3xl font-bold text-gray-950">
              Product Management
            </h1>

            <p className="mt-2 max-w-2xl text-gray-600">
              Manage product inventory, add new products, and return to the
              admin dashboard.
            </p>
          </div>

          <a
            href="/admin"
            className="w-fit rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-bold text-gray-800 shadow-sm hover:bg-gray-50"
          >
            Back to Admin
          </a>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <a
            href="/admin/products/inventory"
            className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-900 text-2xl text-white">
              📦
            </div>

            <h2 className="text-xl font-bold text-gray-950">
              Product Inventory
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              View all products, search by name or barcode, and edit or restock
              existing products.
            </p>

            <div className="mt-6 font-bold text-gray-900 group-hover:underline">
              Open Inventory →
            </div>
          </a>

          <a
            href="/admin/products/add"
            className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-600 text-2xl text-white">
              +
            </div>

            <h2 className="text-xl font-bold text-gray-950">Add Product</h2>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              Add a new product with barcode, price, stock quantity, category,
              and image.
            </p>

            <div className="mt-6 font-bold text-green-700 group-hover:underline">
              Add New Product →
            </div>
          </a>

          <a
            href="/admin"
            className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-200 text-2xl text-gray-900">
              ←
            </div>

            <h2 className="text-xl font-bold text-gray-950">Go Back</h2>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              Return to the main admin dashboard for products, sessions, sales,
              and low stock.
            </p>

            <div className="mt-6 font-bold text-gray-900 group-hover:underline">
              Back to Admin →
            </div>
          </a>
        </div>
      </div>
    </main>
  )
}