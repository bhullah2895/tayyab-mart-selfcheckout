'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../../../lib/supabase'
import { useParams, useRouter } from 'next/navigation'

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)

  const [product, setProduct] = useState<any>(null)

  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    sku: '',
    price: '',
    cost_price: '',
    stock_quantity: '',
    low_stock_threshold: '',
    unit_type: 'piece',
    image_url: '',
    is_active: true,
  })

  const [stockToAdd, setStockToAdd] = useState('')
  const [reason, setReason] = useState('Restock from admin panel')

  useEffect(() => {
    async function loadProduct() {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single()

      if (error) {
        alert(error.message)
        setLoading(false)
        return
      }

      setProduct(data)

      setFormData({
        name: data.name || '',
        barcode: data.barcode || '',
        sku: data.sku || '',
        price: String(data.price || ''),
        cost_price: String(data.cost_price || ''),
        stock_quantity: String(data.stock_quantity || ''),
        low_stock_threshold: String(data.low_stock_threshold || ''),
        unit_type: data.unit_type || 'piece',
        image_url: data.image_url || '',
        is_active: data.is_active,
      })

      setLoading(false)
    }

    loadProduct()
  }, [productId])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const target = e.target

    if (target.name === 'is_active') {
      const checkbox = target as HTMLInputElement

      setFormData({
        ...formData,
        is_active: checkbox.checked,
      })

      return
    }

    setFormData({
      ...formData,
      [target.name]: target.value,
    })
  }

  async function uploadProductImage(file: File) {
    const fileExt = file.name.split('.').pop()
    const fileName = `${productId}-${Date.now()}.${fileExt}`
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

  const updateProductDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      let imageUrl = formData.image_url || null

      if (imageFile) {
        imageUrl = await uploadProductImage(imageFile)
      }

      const { error } = await supabase
        .from('products')
        .update({
          name: formData.name,
          barcode: formData.barcode,
          sku: formData.sku || null,
          price: Number(formData.price),
          cost_price: Number(formData.cost_price),
          stock_quantity: Number(formData.stock_quantity),
          low_stock_threshold: Number(formData.low_stock_threshold),
          unit_type: formData.unit_type,
          image_url: imageUrl,
          is_active: formData.is_active,
        })
        .eq('id', productId)

      setSaving(false)

      if (error) {
        alert(error.message)
        return
      }

      alert('Product updated successfully')
      router.push('/admin/products')
    } catch (error: any) {
      setSaving(false)
      alert(error.message || 'Image upload failed')
    }
  }

  const addStock = async (e: React.FormEvent) => {
    e.preventDefault()

    const addQty = Number(stockToAdd)

    if (!addQty || addQty <= 0) {
      alert('Enter a valid stock quantity')
      return
    }

    const currentStock = Number(product.stock_quantity)
    const newStock = currentStock + addQty

    setSaving(true)

    const { error: productError } = await supabase
      .from('products')
      .update({
        stock_quantity: newStock,
      })
      .eq('id', productId)

    if (productError) {
      setSaving(false)
      alert(productError.message)
      return
    }

    const { error: movementError } = await supabase
      .from('inventory_movements')
      .insert([
        {
          product_id: productId,
          change_quantity: addQty,
          movement_type: 'restock',
          reason: reason || 'Stock added from admin panel',
        },
      ])

    setSaving(false)

    if (movementError) {
      alert(movementError.message)
      return
    }

    alert('Stock added successfully')
    router.push('/admin/products')
  }

  if (loading) {
    return <main className="p-8">Loading product...</main>
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <a href="/admin/products" className="text-blue-600 underline">
            Back to Products
          </a>

          <h1 className="mt-4 text-3xl font-bold text-gray-900">
            Edit Product / Update Stock
          </h1>

          <p className="text-gray-600">
            Update product details and add new inventory stock.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <form
            onSubmit={updateProductDetails}
            className="rounded-xl bg-white p-6 shadow"
          >
            <h2 className="mb-4 text-xl font-bold">Product Details</h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block font-medium">Product Name</label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full rounded-lg border p-3"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block font-medium">Barcode</label>
                <input
                  name="barcode"
                  value={formData.barcode}
                  onChange={handleChange}
                  className="w-full rounded-lg border p-3"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block font-medium">SKU</label>
                <input
                  name="sku"
                  value={formData.sku}
                  onChange={handleChange}
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div>
                <label className="mb-1 block font-medium">Product Image</label>

                {formData.image_url ? (
                  <img
                    src={formData.image_url}
                    alt={formData.name}
                    className="mb-3 h-32 w-32 rounded-xl object-cover"
                  />
                ) : (
                  <div className="mb-3 flex h-32 w-32 items-center justify-center rounded-xl bg-gray-200 text-sm text-gray-500">
                    No Image
                  </div>
                )}

                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="w-full rounded-lg border p-3"
                />

                {imageFile && (
                  <p className="mt-2 text-sm text-gray-500">
                    New image selected: {imageFile.name}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-medium">Price</label>
                  <input
                    type="number"
                    step="0.01"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    className="w-full rounded-lg border p-3"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block font-medium">Cost Price</label>
                  <input
                    type="number"
                    step="0.01"
                    name="cost_price"
                    value={formData.cost_price}
                    onChange={handleChange}
                    className="w-full rounded-lg border p-3"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-medium">Current Stock</label>
                  <input
                    type="number"
                    step="0.01"
                    name="stock_quantity"
                    value={formData.stock_quantity}
                    onChange={handleChange}
                    className="w-full rounded-lg border p-3"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block font-medium">
                    Low Stock Limit
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="low_stock_threshold"
                    value={formData.low_stock_threshold}
                    onChange={handleChange}
                    className="w-full rounded-lg border p-3"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block font-medium">Unit Type</label>
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

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                />
                Active Product
              </label>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-black p-3 text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-500"
              >
                {saving ? 'Saving...' : 'Save Product Details'}
              </button>
            </div>
          </form>

          <form
            onSubmit={addStock}
            className="rounded-xl bg-white p-6 shadow"
          >
            <h2 className="mb-4 text-xl font-bold">Add Stock</h2>

            <div className="mb-4 rounded-lg bg-gray-100 p-4">
              <p className="text-sm text-gray-600">Current Stock</p>
              <p className="text-3xl font-bold">
                {product.stock_quantity} {product.unit_type}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block font-medium">
                  Quantity to Add
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={stockToAdd}
                  onChange={(e) => setStockToAdd(e.target.value)}
                  className="w-full rounded-lg border p-3"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block font-medium">
                  Reason / Note
                </label>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-green-700 p-3 text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-green-400"
              >
                {saving ? 'Adding Stock...' : 'Add Stock'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}