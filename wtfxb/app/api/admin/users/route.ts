import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const admin = createSupabaseAdmin()

  // 联合查询用户资料、点数、报告数
  const { data: profiles } = await admin
    .from('user_profiles')
    .select(`
      id,
      display_name,
      created_at,
      user_credits (credits, total_recharged, total_spent)
    `)
    .order('created_at', { ascending: false })
    .limit(500)

  // 获取每个用户的报告数
  const { data: reportCounts } = await admin
    .from('reports')
    .select('user_id')

  const countMap: Record<string, number> = {}
  ;(reportCounts || []).forEach(r => {
    countMap[r.user_id] = (countMap[r.user_id] || 0) + 1
  })

  // 获取用户邮箱（通过admin auth API）
  const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 500 })
  const emailMap: Record<string, string> = {}
  ;(authUsers?.users || []).forEach(u => { emailMap[u.id] = u.email || '' })

  const users = (profiles || []).map((p: any) => ({
    id: p.id,
    email: emailMap[p.id] || '',
    display_name: p.display_name,
    created_at: p.created_at,
    credits: p.user_credits?.[0]?.credits ?? 0,
    total_recharged: p.user_credits?.[0]?.total_recharged ?? 0,
    total_spent: p.user_credits?.[0]?.total_spent ?? 0,
    report_count: countMap[p.id] || 0,
  }))

  return NextResponse.json({ users })
}
