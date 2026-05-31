import { supabase } from '../../../../lib/supabase'
import InventoryClient from './TempInventoryClient'

export default async function InventoryPage() {
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
      <main className="min-h-screen bg-gray-100 p-8">
        <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-red-600">
            Error loading inventory
          </h1>

          <pre className="mt-4 overflow-auto rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {JSON.stringify(error, null, 2)}
          </pre>
        </div>
      </main>
    )
  }

  return <InventoryClient products={products || []} />
}