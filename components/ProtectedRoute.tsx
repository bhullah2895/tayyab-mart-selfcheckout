'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

type StaffProfile = {
  full_name: string
  role: 'manager' | 'cashier' | 'admin'
  is_active: boolean
}

export default function ProtectedRoute({
  allowedRoles,
  children,
}: {
  allowedRoles: Array<'manager' | 'cashier' | 'admin'>
  children: React.ReactNode
}) {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<StaffProfile | null>(null)

  useEffect(() => {
    async function checkAccess() {
      const { data: userData } = await supabase.auth.getUser()

      if (!userData.user) {
        router.push('/login')
        return
      }

      const { data: staffProfile, error } = await supabase
        .from('staff_profiles')
        .select('full_name, role, is_active')
        .eq('id', userData.user.id)
        .single()

      if (error || !staffProfile) {
        await supabase.auth.signOut()
        router.push('/login')
        return
      }

      if (!staffProfile.is_active) {
        await supabase.auth.signOut()
        router.push('/login')
        return
      }

      if (!allowedRoles.includes(staffProfile.role)) {
        router.push('/login')
        return
      }

      setProfile(staffProfile as StaffProfile)
      setLoading(false)
    }

    checkAccess()
  }, [router, allowedRoles])

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-2xl bg-white p-6 font-bold shadow">
          Checking access...
        </div>
      </main>
    )
  }

  return (
    <>
      <div className="border-b bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <p className="text-sm font-bold text-gray-900">
              {profile?.full_name}
            </p>
            <p className="text-xs uppercase text-gray-500">
              {profile?.role}
            </p>
          </div>

          <button
            type="button"
            onClick={logout}
            className="rounded-xl bg-gray-950 px-4 py-2 text-sm font-bold text-white hover:bg-gray-800"
          >
            Logout
          </button>
        </div>
      </div>

      {children}
    </>
  )
}