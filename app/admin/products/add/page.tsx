'use client'

import { useState } from 'react'
import { supabase } from '../../../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function AddProductPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    sku: '',
    category_id: '',
    price: '',
    cost_price: '',
    stock_quantity: '',
    low_stock_threshold: '',
    unit_type: 'piece',
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  async function uploadProductImage(file: File) {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${fileExt}`

    const filePath = `products/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, file)

    if (uploadError) {
      throw uploadError
    }

    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath)

    return data.publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const barcode = formData.barcode.trim()

      const { data: existingProduct, error: checkError } = await supabase
        .from('products')
        .select('id, name, barcode, is_active')
        .eq('barcode', barcode)
        .maybeSingle()

      if (checkError) {
        setLoading(false)
        alert(checkError.message)
        return
      }

      let imageUrl: string | null = null

      if (imageFile) {
        imageUrl = await uploadProductImage(imageFile)
      }

      const productData = {
        name: formData.name.trim(),
        barcode: barcode,
        sku: formData.sku.trim() || null,
        category_id: formData.category_id || null,
        price: Number(formData.price),
        cost_price: Number(formData.cost_price),
        stock_quantity: Number(formData.stock_quantity),
        low_stock_threshold: Number(formData.low_stock_threshold),
        unit_type: formData.unit_type,
        image_url: imageUrl,
        is_active: true,
      }

      if (existingProduct) {
        const confirmUpdate = window.confirm(
          `A product with this barcode already exists: "${existingProduct.name}". Do you want to update/reactivate this existing product instead?`
        )

        if (!confirmUpdate) {
          setLoading(false)
          router.push(`/admin/products/${existingProduct.id}/edit`)
          return
        }

        const { error: updateError } = await supabase
          .from('products')
          .update(productData)
          .eq('id', existingProduct.id)

        setLoading(false)

        if (updateError) {
          alert(updateError.message)
          return
        }

        alert('Existing product updated and activated successfully')
        router.push('/admin/products/inventory')
        router.refresh()
        return
      }

      const { error: insertError } = await supabase
        .from('products')
        .insert([productData])

      setLoading(false)

      if (insertError) {
        alert(insertError.message)
        return
      }

      alert('Product added successfully')
      router.push('/admin/products/inventory')
      router.refresh()
    } catch (error: any) {
      setLoading(false)
      alert(error.message || 'Product add failed')
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-sm md:p-8">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Product Management
          </p>

          <h1 className="mt-1 text-3xl font-bold text-gray-950">
            Add Product
          </h1>

          <p className="mt-2 text-gray-600">
            Add a new product. If the barcode already exists, the old product
            will be updated/reactivated instead of creating a duplicate.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block font-bold text-gray-900">
              Product Name
            </label>

            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full rounded-xl border border-gray-300 p-3 text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
            />
          </div>

          <div>
            <label className="mb-2 block font-bold text-gray-900">
              Barcode
            </label>

            <input
              type="text"
              name="barcode"
              required
              value={formData.barcode}
              onChange={handleChange}
              className="w-full rounded-xl border border-gray-300 p-3 text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
            />
          </div>

          <div>
            <label className="mb-2 block font-bold text-gray-900">
              SKU
            </label>

            <input
              type="text"
              name="sku"
              value={formData.sku}
              onChange={handleChange}
              className="w-full rounded-xl border border-gray-300 p-3 text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
            />
          </div>

          <div>
            <label className="mb-2 block font-bold text-gray-900">
              Product Image
            </label>

            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              className="w-full rounded-xl border border-gray-300 p-3 text-gray-900"
            />

            {imageFile && (
              <p className="mt-2 text-sm font-medium text-gray-500">
                Selected: {imageFile.name}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block font-bold text-gray-900">
                Selling Price
              </label>

              <input
                type="number"
                step="0.01"
                name="price"
                required
                value={formData.price}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-300 p-3 text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
              />
            </div>

            <div>
              <label className="mb-2 block font-bold text-gray-900">
                Cost Price
              </label>

              <input
                type="number"
                step="0.01"
                name="cost_price"
                required
                value={formData.cost_price}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-300 p-3 text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block font-bold text-gray-900">
                Stock Quantity
              </label>

              <input
                type="number"
                step="0.01"
                name="stock_quantity"
                required
                value={formData.stock_quantity}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-300 p-3 text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
              />
            </div>

            <div>
              <label className="mb-2 block font-bold text-gray-900">
                Low Stock Threshold
              </label>

              <input
                type="number"
                step="0.01"
                name="low_stock_threshold"
                required
                value={formData.low_stock_threshold}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-300 p-3 text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block font-bold text-gray-900">
              Unit Type
            </label>

            <select
              name="unit_type"
              value={formData.unit_type}
              onChange={handleChange}
              className="w-full rounded-xl border border-gray-300 p-3 text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
            >
              <option value="piece">Piece</option>
              <option value="kg">KG</option>
              <option value="gram">Gram</option>
              <option value="liter">Liter</option>
              <option value="ml">ML</option>
              <option value="pack">Pack</option>
            </select>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href="/admin/products"
              className="w-full rounded-xl bg-gray-200 p-4 text-center font-bold text-gray-900 hover:bg-gray-300"
            >
              Cancel / Back
            </a>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-black p-4 font-bold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-500"
            >
              {loading ? 'Saving Product...' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}