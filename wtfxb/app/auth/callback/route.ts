import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = cookies()
    const sb = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (n: string) => cookieStore.get(n)?.value,
          set: (n: string, v: string, o: any) => cookieStore.set({ name: n, value: v, ...o }),
          remove: (n: string, o: any) => cookieStore.set({ name: n, value: '', ...o }),
        },
      }
    )
    await sb.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(new URL('/dashboard', req.url))
}
