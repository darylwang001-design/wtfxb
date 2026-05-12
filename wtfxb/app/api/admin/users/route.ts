import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const admin = createSupabaseAdmin()

  const { data: profiles } = await admin
    .from('user_profiles')
    .select('id, display_name, created_at, user_credits (credits, total_recharged, total_spent)')
    .order('created_at', { ascending: false })
    .limit(500)

  const { data: reportCounts } = await admin
    .from('reports')
    .select('user_id')

  const countMap: Record<string, number> = {}
  const rcList = (reportCounts || []) as { user_id: string }[]
  rcList.forEach(r => {
    countMap[r.user_id] = (countMap[r.user_id] || 0) + 1
  })

  const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 500 })
  const emailMap: Record<string, string> = {}
  const auList = (authUsers?.users || []) as { id: string; email?: string }[]
  auList.forEach(u => {
    emailMap[u.id] = u.email || ''
  })

  const users = (profiles || []).map((p: any) => ({
    id: p.id,
    email: emailMap[p.id] || '',
    displa
