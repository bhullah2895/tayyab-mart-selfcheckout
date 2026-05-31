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
      let imageUrl = null

      if (imageFile) {
        imageUrl = await uploadProductImage(imageFile)
      }

      const { error } = await supabase.from('products').insert([
        {
          name: formData.name,
          barcode: formData.barcode,
          sku: formData.sku || null,
          price: Number(formData.price),
          cost_price: Number(formData.cost_price),
          stock_quantity: Number(formData.stock_quantity),
          low_stock_threshold: Number(formData.low_stock_threshold),
          unit_type: formData.unit_type,
          image_url: imageUrl,
          is_active: true,
        },
      ])

      setLoading(false)

      if (error) {
        alert(error.message)
        return
      }

      alert('Product added successfully')
      router.push('/admin/products')
    } catch (error: any) {
      setLoading(false)
      alert(error.message || 'Image upload failed')
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-2xl rounded-xl bg-white p-8 shadow">
        <h1 className="mb-6 text-3xl font-bold text-gray-900">
          Add Product
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2block font-medium text-gray-900">Product Name</label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full rounded-lg border p-3"
            />
          </div>

          <div>
            <label className="mb-2block font-medium text-gray-900">Barcode</label>
            <input
              type="text"
              name="barcode"
              required
              value={formData.barcode}
              onChange={handleChange}
              className="w-full rounded-lg border p-3"
            />
          </div>

          <div>
            <label className="mb-2block font-medium text-gray-900">SKU</label>
            <input
              type="text"
              name="sku"
              value={formData.sku}
              onChange={handleChange}
              className="w-full rounded-lg border p-3"
            />
          </div>

          <div>
            <label className="mb-2block font-medium text-gray-900">Product Image</label>

            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              className="w-full rounded-lg border p-3"
            />

            {imageFile && (
              <p className="mt-2 text-sm text-gray-500">
                Selected: {imageFile.name}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2block font-medium text-gray-900">Selling Price</label>
              <input
                type="number"
                step="0.01"
                name="price"
                required
                value={formData.price}
                onChange={handleChange}
                className="w-full rounded-lg border p-3"
              />
            </div>

            <div>
              <label className="mb-2block font-medium text-gray-900">Cost Price</label>
              <input
                type="number"
                step="0.01"
                name="cost_price"
                required
                value={formData.cost_price}
                onChange={handleChange}
                className="w-full rounded-lg border p-3"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2block font-medium text-gray-900">
                Stock Quantity
              </label>
              <input
                type="number"
                step="0.01"
                name="stock_quantity"
                required
                value={formData.stock_quantity}
                onChange={handleChange}
                className="w-full rounded-lg border p-3"
              />
            </div>

            <div>
              <label className="mb-2block font-medium text-gray-900">
                Low Stock Threshold
              </label>
              <input
                type="number"
                step="0.01"
                name="low_stock_threshold"
                required
                value={formData.low_stock_threshold}
                onChange={handleChange}
                className="w-full rounded-lg border p-3"
              />
            </div>
          </div>

          <div>
            <label className="mb-2block font-medium text-gray-900">Unit Type</label>

            <select
              name="unit_type"
              value={formData.unit_type}
              onChange={handleChange}
              className="w-full rounded-lg border p-3"
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
              className="w-full rounded-lg bg-gray-200 p-4 text-center font-semibold text-gray-900 hover:bg-gray-300"
            >
              Cancel / Back
            </a>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-black p-4 font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-500"
            >
              {loading ? 'Adding Product...' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}