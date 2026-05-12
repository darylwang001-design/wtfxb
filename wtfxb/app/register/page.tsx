'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '', confirm: '', name: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirm) { setError('两次密码不一致'); return }
    if (form.password.length < 8) { setError('密码至少8位'); return }

    setLoading(true)
    const sb = createSupabaseBrowser()

    const { data, error } = await sb.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { display_name: form.name || form.email.split('@')[0] },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      }
    })

    if (error) {
      setError(error.message.includes('already') ? '该邮箱已注册，请直接登录' : error.message)
      setLoading(false)
      return
    }

    // 赠送新用户3点
    if (data.user) {
      await fetch('/api/user/gift-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: data.user.id }),
      })
    }

    setDone(true)
    setLoading(false)
  }

  if (done) return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(160deg, var(--navy) 0%, #0a1f35 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '40px',
        width: '100%', maxWidth: 420, textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--navy)', marginBottom: 10 }}>
          注册成功！
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 24 }}>
          验证邮件已发送至 <strong>{form.email}</strong><br/>
          点击邮件中的链接激活账号，即可获得 <strong style={{ color: 'var(--gold)' }}>3点</strong> 体验额度
        </p>
        <p style={{ fontSize: 12, color: 'var(--text3)' }}>
          没收到？检查垃圾邮件，或
          <button onClick={() => { setDone(false) }} style={{
            background: 'none', border: 'none', color: 'var(--navy-light)',
            cursor: 'pointer', fontSize: 12, padding: 0, marginLeft: 4,
          }}>重新注册</button>
        </p>
      </div>
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(160deg, var(--navy) 0%, #0a1f35 100%)`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <Link href="/" style={{
        fontFamily: "'Noto Serif SC', serif",
        fontSize: 22, fontWeight: 700,
        color: 'var(--gold-light)', textDecoration: 'none',
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

      <div style={{
        background: '#fff', borderRadius: 16, padding: '36px 40px',
        width: '100%', maxWidth: 420,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        {/* 注册赠点提示 */}
        <div style={{
          background: 'var(--gold-pale)', border: '1px solid rgba(200,144,42,0.3)',
          borderRadius: 8, padding: '10px 14px',
          fontSize: 13, color: '#7a5a10', marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          🎁 新用户注册赠 <strong>3点</strong>，可立即解锁1份完整报告
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--navy)', marginBottom: 6 }}>
          创建账号
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 28 }}>
          使用邮箱快速注册，免费开始分析
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

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label className="form-label">昵称（可选）</label>
            <input type="text" className="form-input"
              placeholder="你的名字或昵称"
              value={form.name} onChange={e => set('name', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">邮箱</label>
            <input type="email" className="form-input"
              placeholder="your@email.com"
              value={form.email} onChange={e => set('email', e.target.value)}
              required autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">密码（至少8位）</label>
            <input type="password" className="form-input"
              placeholder="设置登录密码"
              value={form.password} onChange={e => set('password', e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">确认密码</label>
            <input type="password" className="form-input"
              placeholder="再次输入密码"
              value={form.confirm} onChange={e => set('confirm', e.target.value)}
              required
            />
          </div>

          <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16, lineHeight: 1.6 }}>
            注册即表示同意
            <a href="/terms" style={{ color: 'var(--navy-light)', marginLeft: 3 }}>《服务条款》</a>
            和
            <a href="/privacy" style={{ color: 'var(--navy-light)', marginLeft: 3 }}>《隐私政策》</a>
          </p>

          <button type="submit" className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={loading}>
            {loading ? <><span className="spinner" />注册中…</> : '免费注册并获得3点'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text2)', marginTop: 24 }}>
          已有账号？
          <Link href="/login" style={{ color: 'var(--navy-light)', fontWeight: 500, marginLeft: 4 }}>
            直接登录
          </Link>
        </p>
      </div>
    </div>
  )
}
