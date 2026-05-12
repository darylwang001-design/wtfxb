'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase'

export default function HomePage() {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const sb = createSupabaseBrowser()
    sb.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* 导航 */}
      <nav className="nav">
        <a href="/" className="nav-logo">
          <svg className="nav-logo-icon" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="13" stroke="#e8b84b" strokeWidth="1.5"/>
            <path d="M14 4 L14 24 M4 14 L24 14" stroke="#e8b84b" strokeWidth="1.2" strokeLinecap="round"/>
            <path d="M14 4 L18 10 L14 8 L10 10 Z" fill="#e8b84b"/>
            <circle cx="14" cy="14" r="2.5" fill="#e8b84b"/>
          </svg>
          外贸风向标
        </a>
        <div className="nav-right">
          {user ? (
            <Link href="/dashboard" className="btn btn-primary btn-sm">进入工作台</Link>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost-white btn-sm">登录</Link>
              <Link href="/register" className="btn btn-primary btn-sm">免费注册</Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero区域 */}
      <section style={{
        background: `linear-gradient(160deg, var(--navy) 0%, #0a1f35 50%, #112840 100%)`,
        padding: '80px 24px 100px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* 背景装饰 */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: 'radial-gradient(circle, #e8b84b 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

        <div style={{ position: 'relative', maxWidth: 700, margin: '0 auto' }}>
          <div style={{
            display: 'inline-block',
            background: 'rgba(200,144,42,0.15)',
            border: '1px solid rgba(200,144,42,0.3)',
            color: 'var(--gold-light)',
            padding: '5px 16px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.5px',
            marginBottom: 24,
          }}>
            📊 海关数据 · 智能分析 · 出口洞察
          </div>

          <h1 style={{
            fontFamily: "'Noto Serif SC', serif",
            fontSize: 'clamp(32px, 5vw, 52px)',
            fontWeight: 700,
            color: '#fff',
            lineHeight: 1.25,
            marginBottom: 20,
          }}>
            上传数据，秒出<br/>
            <span style={{ color: 'var(--gold-light)' }}>专业出口市场分析报告</span>
          </h1>

          <p style={{
            fontSize: 17,
            color: 'rgba(255,255,255,0.65)',
            lineHeight: 1.8,
            marginBottom: 40,
          }}>
            基于海关出口数据，自动生成覆盖<strong style={{ color: 'rgba(255,255,255,0.9)' }}>目标市场排名、价格趋势、省份分析</strong>等9大维度的完整分析报告，支持下载 Word / PDF
          </p>

          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/register" className="btn btn-primary btn-lg">
              免费开始使用 →
            </Link>
            <Link href="#how" className="btn btn-lg" style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1.5px solid rgba(255,255,255,0.2)',
              color: 'rgba(255,255,255,0.85)',
            }}>
              查看示例报告
            </Link>
          </div>

          <p style={{ marginTop: 20, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
            注册即赠 3 点体验额度 · 无需信用卡
          </p>
        </div>
      </section>

      {/* 功能特性 */}
      <section id="how" style={{ padding: '80px 24px', maxWidth: 1000, margin: '0 auto' }}>
        <h2 style={{
          fontFamily: "'Noto Serif SC', serif",
          fontSize: 30,
          fontWeight: 600,
          textAlign: 'center',
          color: 'var(--navy)',
          marginBottom: 12,
        }}>
          三步获取完整报告
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text2)', marginBottom: 48 }}>
          无需任何数据分析技能，上传即用
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {[
            { step: '01', icon: '📤', title: '上传CSV数据源', desc: '支持标准格式的海关出口数据CSV，自动识别商品名称、贸易伙伴、金额等字段，无需预处理' },
            { step: '02', icon: '👁', title: '免费预览核心指标', desc: '注册即可免费查看核心KPI概览，了解报告质量。解锁后获得9大板块完整分析内容' },
            { step: '03', icon: '📥', title: '解锁下载完整报告', desc: '消耗3点即可解锁完整报告，支持在线查看和下载 Word、PDF 格式，数据保留在账号中' },
          ].map(item => (
            <div key={item.step} className="card" style={{ textAlign: 'center', padding: '32px 24px' }}>
              <div style={{
                width: 56, height: 56,
                background: 'var(--navy)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, margin: '0 auto 16px',
              }}>
                {item.icon}
              </div>
              <div style={{
                fontSize: 11, fontWeight: 700, letterSpacing: 2,
                color: 'var(--gold)', marginBottom: 8,
              }}>STEP {item.step}</div>
              <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 10, color: 'var(--navy)' }}>
                {item.title}
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7 }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 报告板块展示 */}
      <section style={{ background: 'var(--navy)', padding: '80px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{
            fontFamily: "'Noto Serif SC', serif",
            fontSize: 28, fontWeight: 600,
            color: '#fff', textAlign: 'center', marginBottom: 12,
          }}>
            9大分析维度，全面覆盖出口市场
          </h2>
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', marginBottom: 40 }}>
            前1项免费预览，后8项解锁后可见
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {[
              { n: '01', name: '核心数据概览', free: true },
              { n: '02', name: '出口目标市场 TOP20（金额）', free: false },
              { n: '03', name: '出口目标市场 TOP20（数量）', free: false },
              { n: '04', name: '大洲出口格局分析', free: false },
              { n: '05', name: '环比/同比趋势对比', free: false },
              { n: '06', name: 'TOP10市场单价趋势', free: false },
              { n: '07', name: '国内省份排名 TOP20', free: false },
              { n: '08', name: 'TOP10省市单价趋势', free: false },
              { n: '09', name: '贸易方式结构分析', free: false },
            ].map(item => (
              <div key={item.n} style={{
                background: item.free ? 'rgba(200,144,42,0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${item.free ? 'rgba(200,144,42,0.3)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 8,
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}>
                <span style={{ fontSize: 10, color: item.free ? 'var(--gold-light)' : 'rgba(255,255,255,0.3)', fontWeight: 700, minWidth: 20 }}>
                  {item.n}
                </span>
                <span style={{ fontSize: 13, color: item.free ? '#fff' : 'rgba(255,255,255,0.6)', flex: 1 }}>
                  {item.name}
                </span>
                <span style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 600,
                  background: item.free ? 'rgba(200,144,42,0.3)' : 'rgba(255,255,255,0.08)',
                  color: item.free ? 'var(--gold-light)' : 'rgba(255,255,255,0.4)',
                }}>
                  {item.free ? '免费' : '付费'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 定价 */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{
            fontFamily: "'Noto Serif SC', serif",
            fontSize: 28, fontWeight: 600,
            color: 'var(--navy)', textAlign: 'center', marginBottom: 8,
          }}>
            透明定价
          </h2>
          <p style={{ textAlign: 'center', color: 'var(--text2)', marginBottom: 8 }}>
            每次解锁报告消耗 3 点 · 越充越划算
          </p>
          <p style={{ textAlign: 'center', marginBottom: 40 }}>
            <Link href="/pricing" style={{ color: 'var(--navy-light)', fontSize: 14 }}>查看完整定价详情 →</Link>
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16 }}>
            {[
              { name: '体验包', price: 2, credits: 3, per: '2.00', popular: false },
              { name: '小包', price: 10, credits: 55, per: '0.55', popular: false },
              { name: '中包', price: 100, credits: 800, per: '0.38', popular: true },
              { name: '大包', price: 200, credits: 2500, per: '0.24', popular: false },
            ].map(pkg => (
              <div key={pkg.name} className="card" style={{
                textAlign: 'center', padding: '28px 20px',
                border: pkg.popular ? '2px solid var(--gold)' : undefined,
                position: 'relative',
              }}>
                {pkg.popular && (
                  <div style={{
                    position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                    background: 'var(--gold)', color: '#fff',
                    fontSize: 11, fontWeight: 700, padding: '3px 14px', borderRadius: 10,
                    whiteSpace: 'nowrap',
                  }}>最受欢迎</div>
                )}
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', marginBottom: 4 }}>
                  {pkg.name}
                </div>
                <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--navy)', marginBottom: 2 }}>
                  ¥{pkg.price}
                </div>
                <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--gold)', marginBottom: 8 }}>
                  {pkg.credits} 点
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                  约 ¥{pkg.per}/次查询
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{
        background: `linear-gradient(135deg, var(--navy) 0%, var(--navy-mid) 100%)`,
        padding: '60px 24px',
        textAlign: 'center',
      }}>
        <h2 style={{
          fontFamily: "'Noto Serif SC', serif",
          fontSize: 28, fontWeight: 600, color: '#fff', marginBottom: 12,
        }}>
          开始分析你的出口市场
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 32 }}>
          注册即赠 3 点，立刻体验完整报告
        </p>
        <Link href="/register" className="btn btn-primary btn-lg">
          立即免费注册 →
        </Link>
      </section>

      {/* 页脚 */}
      <footer style={{
        background: '#081624',
        padding: '32px 24px',
        textAlign: 'center',
        color: 'rgba(255,255,255,0.3)',
        fontSize: 13,
      }}>
        <p style={{ marginBottom: 8 }}>
          <span style={{ color: 'var(--gold-light)', fontFamily: "'Noto Serif SC', serif" }}>外贸风向标</span>
          &nbsp;·&nbsp;海关数据市场分析平台
        </p>
        <p style={{ fontSize: 12 }}>
          数据来源：用户上传 · 本平台不存储原始数据文件 · 仅处理分析结果
        </p>
      </footer>
    </div>
  )
}
