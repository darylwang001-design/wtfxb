import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createSupabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'

const UNLOCK_COST = 3

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n: string) => cookieStore.get(n)?.value } }
  )

  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const { reportId } = await req.json()
  if (!reportId) return NextResponse.json({ error: '缺少reportId' }, { status: 400 })

  const admin = createSupabaseAdmin()

  const { data: report } = await admin
    .from('reports').select('*').eq('id', reportId).eq('user_id', user.id).single()

  if (!report) return NextResponse.json({ error: '报告不存在' }, { status: 404 })
  if (report.status === 'unlocked') return NextResponse.json({ ok: true, alreadyUnlocked: true })

  const { data: creditRow } = await admin
    .from('user_credits').select('credits, total_spent').eq('user_id', user.id).single()

  const currentCredits = creditRow?.credits ?? 0
  if (currentCredits < UNLOCK_COST) {
    return NextResponse.json({ error: '点数不足，请先充值', code: 'INSUFFICIENT_CREDITS' }, { status: 402 })
  }

  const newBalance = currentCredits - UNLOCK_COST

  await Promise.all([
    admin.from('user_credits').update({
      credits: newBalance,
      total_spent: (creditRow?.total_spent ?? 0) + UNLOCK_COST,
      updated_at: new Date().toISOString(),
    }).eq('user_id', user.id),

    admin.from('reports').update({
      status: 'unlocked',
      credits_cost: UNLOCK_COST,
      unlocked_at: new Date().toISOString(),
    }).eq('id', reportId),

    admin.from('credit_transactions').insert({
      user_id: user.id,
      type: 'consume',
      amount: -UNLOCK_COST,
      balance_after: newBalance,
      description: `解锁报告：${report.filename}`,
      report_id: reportId,
    }),
  ])

  return NextResponse.json({ ok: true, newBalance })
}
