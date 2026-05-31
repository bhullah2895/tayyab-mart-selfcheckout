'use server'

import { revalidatePath } from 'next/cache'
import { supabase } from '../../../../lib/supabase'

export async function removeProductFromInventory(formData: FormData) {
  const productId = formData.get('productId')

  if (!productId) {
    throw new Error('Product ID is missing')
  }

  const { error } = await supabase
    .from('products')
    .update({
      is_active: false,
    })
    .eq('id', productId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin/products/inventory')
}