import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createSupabaseAdmin } from '@/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook验签失败:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const { userId, orderId, creditsToAdd } = session.metadata!

    const admin = createSupabaseAdmin()

    // 幂等：检查订单是否已处理
    const { data: order } = await admin
      .from('recharge_orders').select('status').eq('id', orderId).single()

    if (order?.status === 'paid') {
      return NextResponse.json({ ok: true, skipped: true })
    }

    const credits = parseInt(creditsToAdd)

    // 获取当前余额
    const { data: creditRow } = await admin
      .from('user_credits').select('credits, total_recharged').eq('user_id', userId).single()

    const newBalance = (creditRow?.credits ?? 0) + credits

    // 更新余额 + 订单状态 + 流水记录
    await Promise.all([
      admin.from('user_credits').update({
        credits: newBalance,
        total_recharged: (creditRow?.total_recharged ?? 0) + credits,
        updated_at: new Date().toISOString(),
      }).eq('user_id', userId),

      admin.from('recharge_orders').update({
        status: 'paid',
        stripe_payment_intent: session.payment_intent as string,
        paid_at: new Date().toISOString(),
      }).eq('id', orderId),

      admin.from('credit_transactions').insert({
        user_id: userId,
        type: 'recharge',
        amount: credits,
        balance_after: newBalance,
        description: `充值成功（订单 ${orderId.slice(0,8)}…）`,
        order_id: orderId,
      }),
    ])

    console.log(`✅ 充值成功: user=${userId}, +${credits}点, 余额=${newBalance}`)
  }

  return NextResponse.json({ received: true })
}
