import { supabase } from '../../lib/supabase'

export default async function TestPage() {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, barcode, price, stock_quantity')
    .limit(10)

  return (
    <main style={{ padding: 30 }}>
      <h1>Supabase Connection Test</h1>

      {error && (
        <>
          <h2>Error</h2>
          <pre>{JSON.stringify(error, null, 2)}</pre>
        </>
      )}

      {data && (
        <>
          <h2>Products from Supabase</h2>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </>
      )}
    </main>
  )
}