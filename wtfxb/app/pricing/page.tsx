'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase'
import { CREDIT_PACKAGES } from '@/lib/supabase'

export default function PricingPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [credits, setCredits] = useState<number | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const sb = createSupabaseBrowser()

  useEffect(() => {
    sb.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user)
        sb.from('user_credits').select('credits').eq('user_id', data.user.id).single()
          .then(({ data: c }) => setCredits(c?.credits ?? 0))
      }
    })
  }, [])

  async function handleBuy(pkgId: string) {
    if (!user) { router.push('/login'); return }
    setLoading(pkgId)

    const res = await fetch('/api/payment/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageId: pkgId }),
    })
    const { url, error } = await res.json()
    if (error) { alert('创建支付失败：' + error); setLoading(null); return }
    window.location.href = url
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* 导航 */}
      <nav className="nav">
        <Link href="/" className="nav-logo">
          <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="13" stroke="#e8b84b" strokeWidth="1.5"/>
            <path d="M14 4 L14 24 M4 14 L24 14" stroke="#e8b84b" strokeWidth="1.2" strokeLinecap="round"/>
            <path d="M14 4 L18 10 L14 8 L10 10 Z" fill="#e8b84b"/>
            <circle cx="14" cy="14" r="2.5" fill="#e8b84b"/>
          </svg>
          外贸风向标
        </Link>
        <div className="nav-right">
          {user ? (
            <>
              <div className="nav-credits">⚡ {credits ?? '—'} 点</div>
              <Link href="/dashboard" className="btn btn-ghost-white btn-sm">工作台</Link>
            </>
          ) : (
            <Link href="/login" className="btn btn-ghost-white btn-sm">登录</Link>
          )}
        </div>
      </nav>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '60px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1 style={{
            fontFamily: "'Noto Serif SC', serif",
            fontSize: 34, fontWeight: 700, color: 'var(--navy)', marginBottom: 10,
          }}>充值点数</h1>
          <p style={{ fontSize: 16, color: 'var(--text2)', marginBottom: 8 }}>
            每次解锁完整报告消耗 <strong style={{ color: 'var(--gold)' }}>3点</strong>，越充越划算
          </p>
          {user && credits !== null && (
            <p style={{ fontSize: 14, color: 'var(--text3)' }}>
              当前余额：<strong style={{ color: 'var(--navy)' }}>{credits}点</strong>
              &nbsp;≈ 可解锁 <strong style={{ color: 'var(--gold)' }}>{Math.floor(credits / 3)}</strong> 份报告
            </p>
          )}
        </div>

        {/* 套餐卡片 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: 16, marginBottom: 48 }}>
          {CREDIT_PACKAGES.map(pkg => (
            <div key={pkg.id} style={{
              background: '#fff',
              border: pkg.popular ? '2px solid var(--gold)' : '1px solid var(--border)',
              borderRadius: 16,
              padding: '28px 20px',
              textAlign: 'center',
              position: 'relative',
              boxShadow: pkg.popular ? '0 4px 20px rgba(200,144,42,0.15)' : '0 2px 8px rgba(0,0,0,0.04)',
            }}>
              {pkg.popular && (
                <div style={{
                  position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                  background: 'var(--gold)', color: '#fff',
                  fontSize: 11, fontWeight: 700, padding: '3px 16px',
                  borderRadius: 10, whiteSpace: 'nowrap',
                }}>⭐ 最受欢迎</div>
              )}

              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>
                {pkg.name}
              </div>

              <div style={{ fontSize: 38, fontWeight: 800, color: 'var(--navy)', lineHeight: 1, marginBottom: 4 }}>
                ¥{pkg.price}
              </div>

              <div style={{
                fontSize: 26, fontWeight: 700, color: 'var(--gold)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                marginBottom: 6,
              }}>
                ⚡ {pkg.credits.toLocaleString()}
                <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text2)' }}>点</span>
              </div>

              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>
                约 ¥{(pkg.price / (pkg.credits / 3)).toFixed(2)}/次查询
              </div>

              <div style={{
                fontSize: 11, color: 'var(--text3)', marginBottom: 20,
                padding: '4px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
              }}>
                {pkg.desc}
              </div>

              <button
                className={`btn ${pkg.popular ? 'btn-primary' : 'btn-navy'}`}
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => handleBuy(pkg.id)}
                disabled={loading === pkg.id}
              >
                {loading === pkg.id
                  ? <><span className="spinner" />处理中…</>
                  : user ? '立即充值' : '登录后购买'
                }
              </button>
            </div>
          ))}
        </div>

        {/* 说明 */}
        <div className="card" style={{ maxWidth: 560, margin: '0 auto' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)', marginBottom: 14 }}>
            常见问题
          </h3>
          {[
            ['点数如何使用？', '每次解锁一份完整报告消耗3点，解锁后可无限次在线查看和下载该报告（Word/PDF格式）。'],
            ['点数会过期吗？', '点数永久有效，不设过期时间，放心购买。'],
            ['支持哪些支付方式？', '支持国际信用卡（Visa/Mastercard）在线支付。'],
            ['可以退款吗？', '虚拟产品一经充值不支持退款，请根据实际需求选择套餐。'],
          ].map(([q, a]) => (
            <div key={q} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>Q: {q}</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>A: {a}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
