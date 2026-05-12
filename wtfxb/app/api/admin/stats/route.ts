import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  // 需配合 /api/admin/check 的权限验证使用
  const admin = createSupabaseAdmin()

  const [
    { count: totalUsers },
    { data: orders },
    { count: totalReports },
    { data: credits },
  ] = await Promise.all([
    admin.from('user_profiles').select('*', { count: 'exact', head: true }),
    admin.from('recharge_orders').select('amount_fen').eq('status', 'paid'),
    admin.from('reports').select('*', { count: 'exact', head: true }),
    admin.from('credit_transactions').select('amount').eq('type', 'recharge'),
  ])

  const totalRevenue = (orders || []).reduce((s, o) => s + o.amount_fen, 0) / 100
  const totalCreditsIssued = (credits || []).reduce((s, c) => s + c.amount, 0)

  return NextResponse.json({ totalUsers, totalRevenue, totalReports, totalCreditsIssued })
}
