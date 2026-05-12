import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseBrowser, createSupabaseAdmin } from '@/lib/supabase'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  // 获取当前登录用户
  const cookieStore = cookies()
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  )

  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const { filename, csvText } = await req.json()
  if (!csvText) return NextResponse.json({ error: '数据为空' }, { status: 400 })

  // 简单解析CSV元数据（不用PapaParse，服务端简单处理）
  const lines = csvText.split('\n').filter(Boolean)
  const header = lines[0] || ''
  
  // 检测必要字段
  const requiredFields = ['数据年月', '商品名称', '美元']
  const hasRequired = requiredFields.every(f => header.includes(f))
  if (!hasRequired) {
    return NextResponse.json({ 
      error: '文件缺少必要字段，请确认包含：数据年月、商品名称、商品编码、贸易伙伴名称、注册地名称、美元' 
    }, { status: 400 })
  }

  // 提取简单元数据（第一行数据行）
  const dataLine = lines[1] || ''
  const headers = header.split(',').map(h => h.trim().replace(/"/g, ''))
  const values = dataLine.split(',').map(v => v.trim().replace(/"/g, ''))
  
  const getVal = (field: string) => {
    const idx = headers.indexOf(field)
    return idx >= 0 ? values[idx] : ''
  }
  
  const productName = getVal('商品名称') || filename.replace('.csv', '')
  const hsCode = getVal('商品编码') || ''
  const firstMonth = getVal('数据年月') || ''

  // 计算数据周期（找所有年月）
  const monthSet = new Set<string>()
  lines.slice(1).forEach(line => {
    const cols = line.split(',')
    const idx = headers.indexOf('数据年月')
    if (idx >= 0 && cols[idx]) monthSet.add(cols[idx].trim().replace(/"/g, ''))
  })
  const months = [...monthSet].sort()
  const periodDesc = months.length > 1 
    ? `${months[0]} ~ ${months[months.length-1]}（${months.length}个月）`
    : months[0] || '未知周期'

  // 保存到数据库（不保存原始CSV，只保存元数据）
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

  // 把CSV文本存到Supabase Storage（用于后续解锁时生成报告）
  // 文件名：userId/reportId.csv，只有本人可读
  const { error: storageError } = await admin.storage
    .from('report-data')
    .upload(`${user.id}/${report.id}.csv`, csvText, {
      contentType: 'text/csv',
      upsert: false,
    })

  if (storageError) {
    // Storage失败不影响主流程，只记录日志
    console.error('Storage upload failed:', storageError)
  }

  return NextResponse.json({ reportId: report.id })
}
