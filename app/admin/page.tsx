export default function AdminPage() {
  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>

      <p className="mt-2 text-gray-600">
        Manage products, inventory, sessions, and sales.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <a
          href="/admin/products"
          className="rounded-xl bg-white p-6 shadow hover:bg-gray-50"
        >
          <h2 className="text-xl font-semibold text-gray-900">Products</h2>
          <p className="mt-2 text-gray-600">View and manage inventory.</p>
        </a>

        <a
          href="/admin/sessions"
          className="rounded-xl bg-white p-6 shadow hover:bg-gray-50"
        >
          <h2 className="text-xl font-semibold text-gray-900">Sessions</h2>
          <p className="mt-2 text-gray-600">View active customer sessions.</p>
        </a>

        <a
          href="/admin/sales"
          className="rounded-xl bg-white p-6 shadow hover:bg-gray-50"
        >
          <h2 className="text-xl font-semibold text-gray-900">Sales</h2>
          <p className="mt-2 text-gray-600">View completed transactions.</p>
        </a>

        <a
          href="/admin/low-stock"
          className="rounded-xl bg-white p-6 shadow hover:bg-gray-50"
        >
          <h2 className="text-xl font-semibold text-gray-900">Low Stock</h2>
          <p className="mt-2 text-gray-600">Check products needing restock.</p>
        </a>
      </div>
    </main>
  )
}