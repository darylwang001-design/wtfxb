'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase'

type Report = {
  id: string
  filename: string
  product_name: string
  period_desc: string
  status: 'preview' | 'unlocked'
  credits_cost: number
  unlocked_at: string | null
  last_download_format: string | null
  last_download_at: string | null
  created_at: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [credits, setCredits] = useState<number | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const sb = createSupabaseBrowser()

  useEffect(() => {
    sb.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUser(data.user)
      loadData(data.user.id)
    })
  }, [])

  async function loadData(userId: string) {
    const [{ data: cred }, { data: reps }] = await Promise.all([
      sb.from('user_credits').select('credits').eq('user_id', userId).single(),
      sb.from('reports').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    ])
    setCredits(cred?.credits ?? 0)
    setReports(reps ?? [])
    setLoading(false)
  }

  async function handleFileUpload(file: File) {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setUploadError('请上传 .csv 格式文件'); return
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('文件不超过 10MB'); return
    }
    setUploading(true)
    setUploadError('')

    const text = await file.text()
    const res = await fetch('/api/report/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: file.name, csvText: text }),
    })

    const json = await res.json()
    if (!res.ok) {
      setUploadError(json.error || '上传失败，请重试')
      setUploading(false)
      return
    }
    // 存入sessionStorage，报告页直接读取，无需再下载
    sessionStorage.setItem(`csv_${json.reportId}`, text)
    router.push(`/report/${json.reportId}`)
  }

  async function handleLogout() {
    await sb.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner spinner-dark" style={{ width: 32, height: 32 }} />
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* 导航 */}
      <nav className="nav">
        <a href="/" className="nav-logo">
          <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="13" stroke="#e8b84b" strokeWidth="1.5"/>
            <path d="M14 4 L14 24 M4 14 L24 14" stroke="#e8b84b" strokeWidth="1.2" strokeLinecap="round"/>
            <path d="M14 4 L18 10 L14 8 L10 10 Z" fill="#e8b84b"/>
            <circle cx="14" cy="14" r="2.5" fill="#e8b84b"/>
          </svg>
          外贸风向标
        </a>
        <div className="nav-right">
          <div className="nav-credits">⚡ {credits ?? '—'} 点</div>
          <Link href="/pricing" className="btn btn-primary btn-sm">充值</Link>
          <button onClick={handleLogout} className="btn btn-ghost-white btn-sm">退出</button>
        </div>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        {/* 欢迎行 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--navy)' }}>
              你好，{user?.user_metadata?.display_name || '用户'} 👋
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text2)', marginTop: 4 }}>
              上传 CSV 数据源，生成出口市场分析报告
            </p>
          </div>
          {credits !== null && credits < 3 && (
            <Link href="/pricing" className="btn btn-primary btn-sm">
              点数不足，去充值
            </Link>
          )}
        </div>

        {/* 点数卡片 */}
        <div style={{
          background: `linear-gradient(135deg, var(--navy) 0%, var(--navy-mid) 100%)`,
          borderRadius: 14, padding: '24px 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 28, flexWrap: 'wrap', gap: 16,
        }}>
          <div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>当前点数余额</div>
            <div style={{ fontSize: 40, fontWeight: 700, color: 'var(--gold-light)', lineHeight: 1 }}>
              {credits ?? '—'}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>
              解锁一份完整报告 = 3点 · 注册赠3点可直接使用
            </div>
          </div>
          <Link href="/pricing" className="btn btn-primary">
            充值点数 →
          </Link>
        </div>

        {/* 上传区域 */}
        <div
          style={{
            background: '#fff',
            border: '2px dashed var(--border)',
            borderRadius: 14,
            padding: '48px 32px',
            textAlign: 'center',
            cursor: 'pointer',
            marginBottom: 28,
            transition: 'border-color 0.2s',
          }}
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--navy-mid)' }}
          onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
          onDrop={e => {
            e.preventDefault()
            e.currentTarget.style.borderColor = 'var(--border)'
            const file = e.dataTransfer.files[0]
            if (file) handleFileUpload(file)
          }}
        >
          {uploading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div className="spinner spinner-dark" style={{ width: 32, height: 32 }} />
              <p style={{ color: 'var(--text2)' }}>正在解析数据，请稍候…</p>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 42, marginBottom: 12 }}>📊</div>
              <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--navy)', marginBottom: 8 }}>
                点击或拖拽上传 CSV 文件
              </div>
              <div style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.7 }}>
                需包含字段：数据年月、商品名称、商品编码、贸易伙伴名称、注册地名称、<br/>
                贸易方式名称、第一数量、第一计量单位、美元<br/>
                <strong style={{ color: 'var(--navy)' }}>仅支持 .csv 格式 · 最大10MB · 支持 UTF-8 / GBK 编码</strong>
              </div>
            </>
          )}
          <input ref={fileRef} type="file" accept=".csv"
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }}
          />
        </div>

        {uploadError && (
          <div style={{
            background: '#fef0f0', border: '1px solid #f5c6c6',
            borderRadius: 8, padding: '12px 16px',
            fontSize: 14, color: '#b02020', marginBottom: 20,
          }}>
            ⚠ {uploadError}
          </div>
        )}

        {/* 历史记录 */}
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--navy)', marginBottom: 14 }}>
            历史报告
          </h2>

          {reports.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text3)' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📂</div>
              <p>还没有报告记录，上传第一份数据开始分析吧</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {reports.map(rep => (
                <div key={rep.id} className="card" style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', padding: '16px 20px',
                  gap: 12, flexWrap: 'wrap',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span className={`badge badge-${rep.status}`}>
                        {rep.status === 'unlocked' ? '✓ 已解锁' : '预览'}
                      </span>
                      <span style={{
                        fontSize: 15, fontWeight: 500, color: 'var(--navy)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {rep.product_name || rep.filename}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <span>📁 {rep.filename}</span>
                      {rep.period_desc && <span>📅 {rep.period_desc}</span>}
                      <span>🕐 上传：{new Date(rep.created_at).toLocaleString('zh-CN')}</span>
                      {rep.last_download_at && (
                        <span>⬇ 最近下载：{new Date(rep.last_download_at).toLocaleString('zh-CN')} ({rep.last_download_format?.toUpperCase()})</span>
                      )}
                    </div>
                  </div>
                  <Link href={`/report/${rep.id}`}
                    className="btn btn-outline btn-sm"
                    style={{ flexShrink: 0 }}>
                    {rep.status === 'unlocked' ? '查看报告' : '查看预览'}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
