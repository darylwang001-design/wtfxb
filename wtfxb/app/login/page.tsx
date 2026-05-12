'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const sb = createSupabaseBrowser()
    const { error } = await sb.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message.includes('Invalid') ? '邮箱或密码错误' : error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(160deg, var(--navy) 0%, #0a1f35 100%)`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      {/* Logo */}
      <Link href="/" style={{
        fontFamily: "'Noto Serif SC', serif",
        fontSize: 22, fontWeight: 700,
        color: 'var(--gold-light)',
        textDecoration: 'none',
        marginBottom: 36,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="13" stroke="#e8b84b" strokeWidth="1.5"/>
          <path d="M14 4 L14 24 M4 14 L24 14" stroke="#e8b84b" strokeWidth="1.2" strokeLinecap="round"/>
          <path d="M14 4 L18 10 L14 8 L10 10 Z" fill="#e8b84b"/>
          <circle cx="14" cy="14" r="2.5" fill="#e8b84b"/>
        </svg>
        外贸风向标
      </Link>

      {/* 登录卡片 */}
      <div style={{
        background: '#fff',
        borderRadius: 16,
        padding: '36px 40px',
        width: '100%', maxWidth: 420,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--navy)', marginBottom: 6 }}>
          欢迎回来
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 28 }}>
          登录你的账号，继续分析出口数据
        </p>

        {error && (
          <div style={{
            background: '#fef0f0', border: '1px solid #f5c6c6',
            borderRadius: 8, padding: '10px 14px',
            fontSize: 14, color: '#b02020', marginBottom: 20,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">邮箱</label>
            <input
              type="email" className="form-input"
              placeholder="your@email.com"
              value={email} onChange={e => setEmail(e.target.value)}
              required autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <span>密码</span>
              <Link href="/forgot-password" style={{
                float: 'right', fontSize: 12,
                color: 'var(--navy-light)', textDecoration: 'none',
              }}>
                忘记密码？
              </Link>
            </label>
            <input
              type="password" className="form-input"
              placeholder="请输入密码"
              value={password} onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-navy btn-lg"
            style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
            disabled={loading}>
            {loading ? <><span className="spinner" />登录中…</> : '登录'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text2)', marginTop: 24 }}>
          还没有账号？
          <Link href="/register" style={{ color: 'var(--navy-light)', fontWeight: 500, marginLeft: 4 }}>
            免费注册
          </Link>
        </p>
      </div>
    </div>
  )
}
