import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient } from '@supabase/ssr'
import { createSupabaseAdmin, CREDIT_PACKAGES } from '@/lib/supabase'
import { cookies } from 'next/headers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n: string) => cookieStore.get(n)?.value } }
  )
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const { packageId } = await req.json()
  const pkg = CREDIT_PACKAGES.find(p => p.id === packageId)
  if (!pkg) return NextResponse.json({ error: '套餐不存在' }, { status: 400 })

  const admin = createSupabaseAdmin()

  const { data: order } = await admin.from('recharge_orders').insert({
    user_id: user.id,
    package_id: pkg.id,
    amount_fen: pkg.price * 100,
    credits_to_add: pkg.credits,
    status: 'pending',
  }).select().single()

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'cny',
        product_data: {
          name: `外贸风向标 · ${pkg.name}`,
          description: `${pkg.credits}点 - ${pkg.desc}`,
        },
        unit_amount: pkg.price * 100,
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?payment=success&order=${order!.id}`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pricing?payment=cancelled`,
    metadata: {
      userId: user.id,
      orderId: order!.id,
      packageId: pkg.id,
      creditsToAdd: pkg.credits.toString(),
    },
    customer_email: user.email,
  })

  await admin.from('recharge_orders')
    .update({ stripe_session_id: session.id })
    .eq('id', order!.id)

  return NextResponse.json({ url: session.url })
}
