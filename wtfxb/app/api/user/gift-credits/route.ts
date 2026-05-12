import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

// 新用户注册后调用，赠送3点
export async function POST(req: NextRequest) {
  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  const admin = createSupabaseAdmin()

  // 检查是否已经赠送过（幂等）
  const { data: existing } = await admin
    .from('credit_transactions')
    .select('id')
    .eq('user_id', userId)
    .eq('type', 'recharge')
    .eq('description', '新用户注册赠送')
    .single()

  if (existing) return NextResponse.json({ ok: true, skipped: true })

  // 赠送3点
  const { data: credits } = await admin
    .from('user_credits')
    .select('credits')
    .eq('user_id', userId)
    .single()

  const newBalance = (credits?.credits ?? 0) + 3

  await admin.from('user_credits').upsert({
    user_id: userId,
    credits: newBalance,
    total_recharged: 3,
    updated_at: new Date().toISOString(),
  })

  await admin.from('credit_transactions').insert({
    user_id: userId,
    type: 'recharge',
    amount: 3,
    balance_after: newBalance,
    description: '新用户注册赠送',
  })

  return NextResponse.json({ ok: true, balance: newBalance })
}
