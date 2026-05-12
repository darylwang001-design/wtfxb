// lib/supabase.ts - 客户端和服务端 Supabase 实例

import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 浏览器端（用于客户端组件）
export function createSupabaseBrowser() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// 服务端管理员客户端（用于API路由，有完整权限）
export function createSupabaseAdmin() {
  return createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// =============================================
// 充值套餐配置（与数据库视图保持一致）
// =============================================
export const CREDIT_PACKAGES = [
  { id: 'trial',  name: '体验包', price: 2,   credits: 3,   desc: '适合试用',     popular: false },
  { id: 'small',  name: '小包',   price: 10,  credits: 55,  desc: '性价比之选',   popular: false },
  { id: 'medium', name: '中包',   price: 100, credits: 800, desc: '高频用户推荐', popular: true  },
  { id: 'large',  name: '大包',   price: 200, credits: 2500,desc: '企业用户专属', popular: false },
] as const

export type PackageId = typeof CREDIT_PACKAGES[number]['id']

// 每次解锁报告消耗点数
export const UNLOCK_COST = 3
