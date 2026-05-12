import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n: string) => cookieStore.get(n)?.value } }
  )

  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const { filename, csvText } = await req.json()
  if (!csvText) return NextResponse.json({ error: '数据为空' }, { status: 400 })

  const lines = csvText.split('\n').filter(Boolean)
  const header = lines[0] || ''

  // 只检测最核心的字段，宽松匹配
  if (!header.includes('数据年月') || !header.includes('美元')) {
    return NextResponse.json({
      error: '文件格式不符，请确认是海关出口CSV数据（需含数据年月、美元等字段）'
    }, { status: 400 })
  }

  const dataLine = lines[1] || ''
  const headers = header.split(',').map((h: string) => h.trim().replace(/"/g, ''))
  const values = dataLine.split(',').map((v: string) => v.trim().replace(/"/g, ''))

  const getVal = (field: string) => {
    const idx = headers.findIndex((h: string) => h.includes(field))
    return idx >= 0 ? values[idx] : ''
  }

  const productName = getVal('商品名称') || getVal('商品') || filename.replace('.csv', '')
  const hsCode = getVal('商品编码') || getVal('编码') || ''

  const monthSet = new Set<string>()
  const monthIdx = headers.findIndex((h: string) => h.includes('数据年月'))
  if (monthIdx >= 0) {
    lines.slice(1).forEach((line: string) => {
      const cols = line.split(',')
      if (cols[monthIdx]) monthSet.add(cols[monthIdx].trim().replace(/"/g, ''))
    })
  }
  const months = Array.from(monthSet).sort()
  const periodDesc = months.length > 1
    ? `${months[0]} ~ ${months[months.length - 1]}（${months.length}个月）`
    : months[0] || '未知周期'

  const admin = createSupabaseAdmin()
  const { data: report, error } = await admin.from('reports').insert({
    user_id: user.id,
    filename,
    product_name: productName,
    hs_code: hsCode,
    period_desc: periodDesc,
    status: 'preview',
    credits_cost: 0,
  }).select().single()

  if (error) return NextResponse.json({ error: '保存失败：' + error.message }, { status: 500 })

  await admin.storage
    .from('report-data')
    .upload(`${user.id}/${report.id}.csv`, csvText, {
      contentType: 'text/csv',
      upsert: false,
    })

  return NextResponse.json({ reportId: report.id })
}
