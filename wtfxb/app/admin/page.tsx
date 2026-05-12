'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createSupabaseBrowser } from '@/lib/supabase'

type UserRow = {
  id: string
  email: string
  display_name: string
  created_at: string
  credits: number
  total_recharged: number
  total_spent: number
  report_count: number
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [users, setUsers] = useState<UserRow[]>([])
  const [stats, setStats] = useState({ totalUsers: 0, totalRevenue: 0, totalReports: 0, totalCreditsIssued: 0 })
  const [search, setSearch] = useState('')
  const sb = createSupabaseBrowser()

  useEffect(() => {
    checkAdmin()
  }, [])

  async function checkAdmin() {
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { window.location.href = '/login'; return }

    const res = await fetch('/api/admin/check')
    if (!res.ok) { setLoading(false); return }
    setAuthorized(true)
    loadStats()
    loadUsers()
  }

  async function loadStats() {
    const res = await fetch('/api/admin/stats')
    const data = await res.json()
    setStats(data)
  }

  async function loadUsers() {
    const res = await fetch('/api/admin/users')
    const data = await res.json()
    setUsers(data.users || [])
    setLoading(false)
  }

  const filtered = users.filter(u =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.display_name?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner spinner-dark" style={{ width: 32, height: 32 }} />
    </div>
  )

  if (!authorized) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 48 }}>🚫</div>
      <p style={{ fontSize: 18, color: 'var(--text2)' }}>无管理员权限</p>
      <Link href="/" className="btn btn-navy">返回首页</Link>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <nav className="nav">
        <a href="/" className="nav-logo">
          <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="13" stroke="#e8b84b" strokeWidth="1.5"/>
            <path d="M14 4 L14 24 M4 14 L24 14" stroke="#e8b84b" strokeWidth="1.2" strokeLinecap="round"/>
            <path d="M14 4 L18 10 L14 8 L10 10 Z" fill="#e8b84b"/>
            <circle cx="14" cy="14" r="2.5" fill="#e8b84b"/>
          </svg>
          外贸风向标 · 管理后台
        </a>
        <div className="nav-right">
          <Link href="/dashboard" className="btn btn-ghost-white btn-sm">返回工作台</Link>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--navy)', marginBottom: 24 }}>
          数据总览
        </h1>

        {/* 统计卡片 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
          {[
            { label: '注册用户总数', value: stats.totalUsers, icon: '👤', color: 'var(--navy)' },
            { label: '累计收入（元）', value: `¥${stats.totalRevenue}`, icon: '💰', color: 'var(--gold)' },
            { label: '报告生成次数', value: stats.totalReports, icon: '📊', color: '#27ae60' },
            { label: '发放点数总计', value: stats.totalCreditsIssued, icon: '⚡', color: '#8e44ad' },
          ].map(s => (
            <div key={s.label} className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* 用户列表 */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--navy)', flex: 1 }}>用户列表</h2>
            <input
              style={{ padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, width: 220, outline: 'none' }}
              placeholder="搜索邮箱或昵称…"
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8f9fb' }}>
                  {['昵称', '邮箱', '注册时间', '当前点数', '累计充值（点）', '累计消耗（点）', '报告数'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text2)', fontWeight: 500, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => (
                  <tr key={u.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                    <td style={{ padding: '10px 14px', color: 'var(--navy)', fontWeight: 500 }}>{u.display_name || '—'}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text2)' }}>{u.email}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                      {new Date(u.created_at).toLocaleDateString('zh-CN')}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: u.credits > 0 ? 'var(--up)' : 'var(--text3)' }}>
                      {u.credits}
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--gold)' }}>{u.total_recharged}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text2)' }}>{u.total_spent}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text2)' }}>{u.report_count}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)' }}>暂无用户数据</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
