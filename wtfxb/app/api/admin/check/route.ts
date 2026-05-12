import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createSupabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  const cookieStore = cookies()
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n: string) => cookieStore.get(n)?.value } }
  )
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const isAdminEmail = user.email === process.env.ADMIN_EMAIL
  if (!isAdminEmail) {
    const admin = createSupabaseAdmin()
    const { data: profile } = await admin
      .from('user_profiles').select('is_admin').eq('id', user.id).single()
    if (!profile?.is_admin) return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  return NextResponse.json({ ok: true })
}
