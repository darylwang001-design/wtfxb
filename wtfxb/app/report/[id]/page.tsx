'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowser } from '@/lib/supabase'

export default function ReportPage() {
  const { id } = useParams()
  const router = useRouter()
  const [report, setReport] = useState<any>(null)
  const [credits, setCredits] = useState<number>(0)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [unlocking, setUnlocking] = useState(false)
  const [csvText, setCsvText] = useState<string>('')
  const [reportReady, setReportReady] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const sb = createSupabaseBrowser()

  useEffect(() => {
    sb.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUser(data.user)
      loadReport(data.user.id)
    })
  }, [])

  async function loadReport(userId: string) {
    const [{ data: rep }, { data: cred }] = await Promise.all([
      sb.from('reports').select('*').eq('id', id).eq('user_id', userId).single(),
      sb.from('user_credits').select('credits').eq('user_id', userId).single(),
    ])
    if (!rep) { router.push('/dashboard'); return }
    setReport(rep)
    setCredits(cred?.credits ?? 0)

    // 从 Storage 取 CSV
    const { data: blob } = await sb.storage
      .from('report-data')
      .download(`${userId}/${id}.csv`)
    if (blob) {
      const text = await blob.text()
      setCsvText(text)
    }
    setLoading(false)
  }

  // CSV加载好后渲染iframe
  useEffect(() => {
    if (!csvText || !report) return
    buildIframe()
  }, [csvText, report])

  function buildIframe() {
    const iframe = iframeRef.current
    if (!iframe) return

    const isUnlocked = report?.status === 'unlocked'

    // 读取原始HTML分析引擎，注入CSV并控制显示范围
    const engineHTML = getEngineHTML(csvText, isUnlocked)
    const blob = new Blob([engineHTML], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    iframe.src = url
    iframe.onload = () => {
      setReportReady(true)
      URL.revokeObjectURL(url)
    }
  }

  async function handleUnlock() {
    if (credits < 3) { router.push('/pricing'); return }
    setUnlocking(true)
    const res = await fetch('/api/report/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportId: id }),
    })
    const json = await res.json()
    if (json.ok) {
      setCredits(json.newBalance)
      setReport((r: any) => ({ ...r, status: 'unlocked' }))
      // 重新渲染iframe（解锁模式）
      setTimeout(() => buildIframe(), 100)
    } else {
      alert(json.error || '解锁失败')
    }
    setUnlocking(false)
  }

  function handleDownload(format: 'word' | 'pdf') {
    const iframe = iframeRef.current
    if (!iframe?.contentWindow) return
    // 通知iframe内部执行下载
    iframe.contentWindow.postMessage({ action: format === 'word' ? 'downloadWord' : 'downloadPDF' }, '*')
    // 记录下载时间
    sb.from('reports').update({
      last_download_format: format,
      last_download_at: new Date().toISOString(),
    }).eq('id', id).then(() => {})
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner spinner-dark" style={{ width: 32, height: 32 }} />
    </div>
  )

  const isUnlocked = report?.status === 'unlocked'

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
          <div className="nav-credits">⚡ {credits} 点</div>
          <Link href="/dashboard" className="btn btn-ghost-white btn-sm">← 返回工作台</Link>
        </div>
      </nav>

      {/* 工具栏 */}
      <div style={{
        background: '#fff', borderBottom: '1px solid var(--border)',
        padding: '12px 24px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--navy)' }}>
            {report?.product_name || report?.filename}
          </span>
          {report?.period_desc && (
            <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 12 }}>
              📅 {report.period_desc}
            </span>
          )}
          <span className={`badge badge-${isUnlocked ? 'unlocked' : 'preview'}`} style={{ marginLeft: 10 }}>
            {isUnlocked ? '✓ 已解锁' : '预览模式'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {isUnlocked ? (
            <>
              <button onClick={() => handleDownload('word')} className="btn btn-outline btn-sm">
                ⬇ 下载 Word
              </button>
              <button onClick={() => handleDownload('pdf')} className="btn btn-outline btn-sm">
                ⬇ 下载 PDF
              </button>
            </>
          ) : (
            <button
              onClick={handleUnlock}
              className="btn btn-primary"
              disabled={unlocking}
              style={{ gap: 8 }}
            >
              {unlocking
                ? <><span className="spinner" />解锁中…</>
                : <>🔓 解锁完整报告（消耗3点）</>
              }
            </button>
          )}
        </div>
      </div>

      {/* 预览提示条 */}
      {!isUnlocked && (
        <div style={{
          background: 'linear-gradient(135deg, var(--navy) 0%, var(--navy-mid) 100%)',
          padding: '14px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 12,
        }}>
          <div style={{ color: '#fff', fontSize: 14 }}>
            <strong>👁 预览模式</strong>
            <span style={{ opacity: 0.75, marginLeft: 8 }}>
              当前仅显示第1项「核心数据概览」，其余8项内容已隐藏
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: 'var(--gold-light)', fontSize: 13 }}>
              当前余额：{credits} 点 {credits < 3 && '（不足）'}
            </span>
            {credits < 3 ? (
              <Link href="/pricing" className="btn btn-primary btn-sm">去充值</Link>
            ) : (
              <button onClick={handleUnlock} className="btn btn-primary btn-sm" disabled={unlocking}>
                {unlocking ? '解锁中…' : '立即解锁（3点）'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 报告主体 iframe */}
      <div style={{ position: 'relative' }}>
        {!reportReady && (
          <div style={{
            position: 'absolute', inset: 0, background: '#fff',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            minHeight: 400, gap: 16, zIndex: 10,
          }}>
            <div className="spinner spinner-dark" style={{ width: 32, height: 32 }} />
            <p style={{ color: 'var(--text2)', fontSize: 14 }}>正在生成报告…</p>
          </div>
        )}
        <iframe
          ref={iframeRef}
          style={{
            width: '100%',
            minHeight: '100vh',
            border: 'none',
            display: 'block',
            opacity: reportReady ? 1 : 0,
            transition: 'opacity 0.3s',
          }}
          title="市场分析报告"
          sandbox="allow-scripts allow-same-origin allow-downloads allow-popups"
        />
      </div>
    </div>
  )
}

// ============================================================
// 生成嵌入了CSV数据的完整分析引擎HTML
// ============================================================
function getEngineHTML(csvText: string, isUnlocked: boolean): string {
  const escapedCSV = csvText.replace(/`/g, '\\`').replace(/\\/g, '\\\\').replace(/\$/g, '\\$')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>市场分析报告</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<style>
:root{--navy:#1a3a5c;--navy-light:#2a5a8c;--navy-pale:#e8f0f8;--accent:#6a9dc8;--text:#1a1a1a;--text2:#555;--text3:#888;--bg:#f7f8fa;--bg2:#ffffff;--border:#e0e4ea;--up:#27ae60;--down:#c0392b;--radius:10px;}
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'PingFang SC','Microsoft YaHei','Helvetica Neue',sans-serif;background:var(--bg);color:var(--text);}
.main{max-width:900px;margin:0 auto;padding:24px;}
.wm-overlay{position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9;overflow:hidden;}
.wm-tile{position:absolute;font-size:14px;font-weight:600;color:rgba(26,58,92,0.07);white-space:nowrap;transform:rotate(-28deg);letter-spacing:1px;}
.report{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:36px 40px;}
.rh{border-bottom:2px solid var(--navy);padding-bottom:18px;margin-bottom:24px;}
.rbadge{display:inline-block;background:var(--navy);color:#e8f0f8;font-size:11px;padding:4px 12px;border-radius:3px;letter-spacing:1.5px;margin-bottom:12px;}
.rt{font-size:22px;font-weight:700;color:var(--navy);line-height:1.4;}
.rs{font-size:13px;color:var(--text2);margin-top:6px;}
.rm{font-size:12px;color:var(--text3);margin-top:8px;}
.sec{margin-bottom:28px;}
.stitle{font-size:12px;font-weight:600;color:var(--text2);letter-spacing:2.5px;border-left:3px solid var(--navy);padding-left:10px;margin-bottom:14px;display:block;}
.kpi-tbl{width:100%;border-collapse:separate;border-spacing:8px;margin-bottom:6px;table-layout:fixed;}
.kcard{background:#f4f7fb;border-radius:8px;padding:13px 15px;vertical-align:top;}
.klabel{font-size:11px;color:var(--text2);margin-bottom:5px;display:block;}
.kval{font-size:20px;font-weight:600;color:var(--navy);display:block;}
.kch{font-size:12px;margin-top:5px;display:block;}
.kdown{color:var(--down);}.kup{color:var(--up);}.kna{color:var(--text3);}
.summary-box{background:#fff8ee;border:1.5px solid #e8c87a;border-radius:8px;padding:14px 18px;margin-bottom:14px;font-size:13px;line-height:2;}
.s-label{font-weight:600;color:var(--navy);margin-right:6px;}
.cbox{background:#fff;border:1px solid var(--border);border-radius:10px;padding:16px 18px;margin-bottom:12px;}
.ctitle{font-size:13px;font-weight:500;color:var(--text);margin-bottom:3px;display:block;}
.cdesc{font-size:12px;color:var(--text3);margin-bottom:12px;display:block;}
.bar-tbl{width:100%;border-collapse:collapse;}
.bar-tbl td{padding:2px 3px;vertical-align:middle;}
.td-num{width:22px;text-align:center;font-size:11px;color:var(--text3);}
.td-lbl{width:84px;text-align:right;font-size:12px;color:var(--text2);white-space:nowrap;overflow:hidden;}
.bar-outer{background:#f0f2f5;border-radius:3px;height:18px;width:100%;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.bar-inner{height:18px;border-radius:3px;display:inline-block;vertical-align:top;min-width:44px;text-align:right;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.bar-inner span{font-size:10px;font-weight:600;color:#fff;line-height:18px;padding-right:6px;white-space:nowrap;}
.legrow{font-size:12px;color:var(--text2);margin-bottom:10px;}
.legdot{width:10px;height:10px;border-radius:2px;display:inline-block;vertical-align:middle;margin-right:3px;}
.anlys{background:#f0f5fb;border-left:3px solid var(--navy);padding:12px 16px;border-radius:0 6px 6px 0;font-size:13px;color:var(--text);line-height:1.9;margin-top:10px;white-space:pre-line;}
.twocol-tbl{width:100%;border-collapse:separate;border-spacing:10px;}
.twocol-tbl td{vertical-align:top;width:50%;}
.canvas-wrap{position:relative;width:100%;height:280px;}
.foot{font-size:11px;color:var(--text3);text-align:center;margin-top:28px;padding-top:16px;border-top:1px solid var(--border);line-height:1.9;}

/* 付费锁定遮罩 */
.locked-overlay{position:relative;overflow:hidden;border-radius:var(--radius);}
.locked-mask{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(255,255,255,0) 0%,rgba(255,255,255,0.85) 30%,rgba(255,255,255,0.97) 100%);display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding-bottom:32px;z-index:10;}
.locked-blur{filter:blur(4px);user-select:none;pointer-events:none;}
.lock-badge{background:var(--navy);color:#fff;border-radius:12px;padding:12px 28px;font-size:14px;font-weight:600;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.2);}
.lock-sub{font-size:12px;opacity:0.7;margin-top:4px;}

@media print{
  body{background:#fff;}
  .main{max-width:100%;padding:0;}
  .report{border:none;padding:20px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .locked-mask{display:none!important;}
  .locked-blur{filter:none!important;}
}
</style>
</head>
<body>
<div class="wm-overlay" id="wmOverlay"></div>
<div class="main">
  <div class="report" id="reportBody"><div style="padding:40px;text-align:center;color:#888">正在生成报告...</div></div>
</div>

<script>
const IS_UNLOCKED = ${isUnlocked};
const CSV_TEXT = \`${escapedCSV}\`;
let G = {};
const BLUES20=['#1a3a5c','#1f4878','#245c94','#2a6daf','#3379c0','#4387c6','#5295cc','#5e9fd0','#3a6e9e','#2d6a9f','#34709f','#3b7691','#427c8a','#498285','#508880','#578e7b','#5e9476','#659a71','#3a726e','#416878'];
const LINE10=['#1a3a5c','#e67e22','#27ae60','#c0392b','#8e44ad','#2980b9','#d35400','#16a085','#7f8c8d','#f39c12'];
const WM='外贸风向标';

// 接收父页面消息（下载指令）
window.addEventListener('message', function(e) {
  if(e.data && e.data.action === 'downloadWord') downloadWord();
  if(e.data && e.data.action === 'downloadPDF') downloadPDF();
});

window.onload = function() {
  buildWatermark();
  // 自动解析CSV
  const hasValidChinese = CSV_TEXT.includes('数据年月') || CSV_TEXT.includes('商品名称');
  const hasGarbled = CSV_TEXT.includes('\\uFFFD');
  parseCSV(CSV_TEXT, 'report.csv');
};

function buildWatermark(){
  const el=document.getElementById('wmOverlay');if(!el)return;
  el.innerHTML='';
  for(let r=0;r<20;r++)for(let c=0;c<8;c++){
    const d=document.createElement('div');d.className='wm-tile';
    d.style.top=(r*120-60)+'px';d.style.left=(c*260-80)+'px';
    d.textContent=WM;el.appendChild(d);
  }
}

function parseCSV(text, fn){
  Papa.parse(text,{header:true,skipEmptyLines:true,
    complete:res=>{try{buildReport(res.data,fn);}catch(err){
      document.getElementById('reportBody').innerHTML='<div style="padding:40px;color:#c0392b">数据解析失败：'+err.message+'</div>';
      console.error(err);
    }},
    error:err=>{document.getElementById('reportBody').innerHTML='<div style="padding:40px;color:#c0392b">CSV解析错误：'+err.message+'</div>';}
  });
}

function groupBy(rows,field){const map={};rows.forEach(r=>{const k=r[field]||'未知';if(!map[k])map[k]={name:k,usd:0,qty:0};map[k].usd+=r._usd;map[k].qty+=r._qty;});return Object.values(map);}

function fmtUSD(v){if(v>=1e8)return'$'+(v/1e8).toFixed(2)+'亿';if(v>=1e4)return'$'+(v/1e4).toFixed(2)+'万';return'$'+v.toFixed(0);}
function fmtQTY(v,u){if(v>=1e8)return(v/1e8).toFixed(2)+'亿'+u;if(v>=1e4)return(v/1e4).toFixed(2)+'万'+u;return v.toLocaleString()+u;}
function fmtBar(v,isUSD,u){if(isUSD){if(v>=1e4)return'$'+(v/1e4).toFixed(1)+'万';return'$'+v.toFixed(0);}else{if(v>=1e4)return(v/1e4).toFixed(1)+'万'+u;return v.toFixed(0)+u;}}
function fmtYM(ym){const s=ym.toString();return s.slice(0,4)+'-'+s.slice(4);}
function pct(a,b){return b>0?((a-b)/b*100).toFixed(1)+'%':'—';}

function detectPeriod(months){
  const n=months.length;
  if(n===1)return'single';
  const yrs=[...new Set(months.map(m=>Math.floor(m/100)))].sort();
  if(yrs.length===1){
    if(n===12)return'year';
    if(n===6)return'halfyear';
    if(n===3)return'quarter';
    if(n===2)return'twoMonth';
    return'customPeriod';
  }
  if(yrs.length===2){
    const c=months.filter(m=>Math.floor(m/100)===yrs[1]).length;
    const b=months.filter(m=>Math.floor(m/100)===yrs[0]).length;
    if(c===12&&b===12)return'twoYear';
    if(c===b){if(c===6)return'yoyHalfyear';if(c===3)return'yoyQuarter';return'yoyMonth';}
    return'yoyMonth';
  }
  return'customPeriod';
}

function getPeriodDesc(){
  const{months,periodType,curYear,baseYear,latest}=G;
  if(periodType==='single')return fmtYM(latest);
  if(periodType==='twoYear')return baseYear+'年 vs '+curYear+'年（年度同比）';
  if(periodType==='twoMonth')return fmtYM(months[0])+' vs '+fmtYM(months[1])+'（月度环比）';
  if(periodType==='yoyMonth')return fmtYM(months.find(m=>Math.floor(m/100)===baseYear))+' vs '+fmtYM(months.find(m=>Math.floor(m/100)===curYear))+'（月度同比）';
  if(periodType==='yoyQuarter')return baseYear+'年同期季度 vs '+curYear+'年同期季度（同比）';
  if(periodType==='yoyHalfyear')return baseYear+'年同期半年 vs '+curYear+'年同期半年（同比）';
  if(periodType==='year')return Math.floor(months[0]/100)+'年度（1-12月）';
  if(periodType==='quarter'){const q=getQuarterLabel(months);return Math.floor(months[0]/100)+'年'+q+'季度';}
  if(periodType==='halfyear')return Math.floor(months[0]/100)+'年'+(months[0]%100<=6?'上':'下')+'半年';
  return fmtYM(months[0])+'~'+fmtYM(months[months.length-1])+'（'+months.length+'个月）';
}
function getQuarterLabel(months){const mo=months[0]%100;return mo<=3?'第一':mo<=6?'第二':mo<=9?'第三':'第四';}

const CONTINENT_MAP={'中国':'亚洲','日本':'亚洲','韩国':'亚洲','印度':'亚洲','越南':'亚洲','泰国':'亚洲','印度尼西亚':'亚洲','马来西亚':'亚洲','菲律宾':'亚洲','新加坡':'亚洲','缅甸':'亚洲','巴基斯坦':'亚洲','孟加拉国':'亚洲','斯里兰卡':'亚洲','阿富汗':'亚洲','柬埔寨':'亚洲','老挝':'亚洲','哈萨克斯坦':'亚洲','乌兹别克斯坦':'亚洲','伊朗':'亚洲','伊拉克':'亚洲','沙特阿拉伯':'亚洲','阿联酋':'亚洲','科威特':'亚洲','卡塔尔':'亚洲','巴林':'亚洲','阿曼':'亚洲','也门':'亚洲','以色列':'亚洲','约旦':'亚洲','叙利亚':'亚洲','黎巴嫩':'亚洲','土耳其':'亚洲','中国香港':'亚洲','中国台湾':'亚洲','蒙古':'亚洲','朝鲜':'亚洲','不丹':'亚洲','文莱':'亚洲','东帝汶':'亚洲','马尔代夫':'亚洲','尼泊尔':'亚洲','格鲁吉亚':'亚洲','亚美尼亚':'亚洲','阿塞拜疆':'亚洲','吉布提':'亚洲','吉尔吉斯斯坦':'亚洲','塔吉克斯坦':'亚洲','土库曼斯坦':'亚洲','巴勒斯坦':'亚洲','中国澳门':'亚洲','德国':'欧洲','英国':'欧洲','法国':'欧洲','意大利':'欧洲','西班牙':'欧洲','荷兰':'欧洲','比利时':'欧洲','波兰':'欧洲','瑞典':'欧洲','挪威':'欧洲','丹麦':'欧洲','芬兰':'欧洲','瑞士':'欧洲','奥地利':'欧洲','捷克':'欧洲','斯洛伐克':'欧洲','匈牙利':'欧洲','罗马尼亚':'欧洲','保加利亚':'欧洲','希腊':'欧洲','葡萄牙':'欧洲','爱尔兰':'欧洲','卢森堡':'欧洲','斯洛文尼亚':'欧洲','克罗地亚':'欧洲','塞尔维亚':'欧洲','乌克兰':'欧洲','白俄罗斯':'欧洲','俄罗斯':'欧洲','立陶宛':'欧洲','拉脱维亚':'欧洲','爱沙尼亚':'欧洲','冰岛':'欧洲','塞浦路斯':'欧洲','马耳他':'欧洲','阿尔巴尼亚':'欧洲','北马其顿':'欧洲','黑山':'欧洲','摩尔多瓦':'欧洲','南非':'非洲','尼日利亚':'非洲','埃及':'非洲','肯尼亚':'非洲','埃塞俄比亚':'非洲','加纳':'非洲','坦桑尼亚':'非洲','坦桑尼亚联合共和国':'非洲','喀麦隆':'非洲','科特迪瓦':'非洲','安哥拉':'非洲','莫桑比克':'非洲','赞比亚':'非洲','津巴布韦':'非洲','乌干达':'非洲','刚果共和国':'非洲','刚果民主共和国':'非洲','马达加斯加':'非洲','塞内加尔':'非洲','苏丹':'非洲','突尼斯':'非洲','摩洛哥':'非洲','利比亚':'非洲','阿尔及利亚':'非洲','纳米比亚':'非洲','卢旺达':'非洲','美国':'北美洲','加拿大':'北美洲','墨西哥':'北美洲','古巴':'北美洲','危地马拉':'北美洲','洪都拉斯':'北美洲','哥斯达黎加':'北美洲','巴拿马':'北美洲','巴西':'南美洲','阿根廷':'南美洲','哥伦比亚':'南美洲','智利':'南美洲','秘鲁':'南美洲','委内瑞拉':'南美洲','厄瓜多尔':'南美洲','玻利维亚':'南美洲','澳大利亚':'大洋洲','新西兰':'大洋洲','巴布亚新几内亚':'大洋洲','斐济':'大洋洲'};
function getContinent(c){return CONTINENT_MAP[c?.trim()]||'其他';}

function buildContinentData(sourceRows){
  const map={};
  sourceRows.forEach(r=>{const c=getContinent(r['贸易伙伴名称']||'');if(!map[c])map[c]={name:c,usd:0,qty:0,countries:new Set()};map[c].usd+=r._usd;map[c].qty+=r._qty;map[c].countries.add(r['贸易伙伴名称']);});
  return Object.values(map).map(c=>({...c,countryCount:c.countries.size})).sort((a,b)=>b.usd-a.usd);
}
function buildContinentBars(continents){
  const maxV=continents[0]?.usd||1;
  return'<table class="bar-tbl">'+continents.map((c,i)=>{
    const pct=Math.max((c.usd/maxV*100),0).toFixed(1);
    return\`<tr><td class="td-num">\${i+1}</td><td class="td-lbl" title="\${c.name}">\${c.name}</td><td><div class="bar-outer"><div class="bar-inner" style="width:\${pct}%;background:\${BLUES20[i]}"><span>\${fmtBar(c.usd,true,'')}</span></div></div></td><td style="font-size:11px;color:#888;padding-left:6px;white-space:nowrap">\${c.countryCount}国</td></tr>\`;
  }).join('')+'</table>';
}
function buildContinentAnalysis(continents){
  if(!continents.length)return'大洲数据不足。';
  const top=continents[0];const total=continents.reduce((s,c)=>s+c.usd,0);
  const topPct=(top.usd/total*100).toFixed(1);
  let t=\`【大洲格局分析】\${top.name}以\${topPct}%出口额占比位居首位，覆盖\${top.countryCount}个贸易伙伴国，是最核心的目标市场大洲。\`;
  if(continents.length>1){const sec=continents[1];t+=\`\${sec.name}以\${(sec.usd/total*100).toFixed(1)}%位居第二。\`;}
  t+=\`\\n多大洲布局有助于分散市场风险，建议重点巩固优势大洲，同时关注增长潜力较大的新兴大洲市场。\`;
  return t;
}

function buildBarsHTML(data,field,fmtFn,maxVal){
  return'<table class="bar-tbl">'+data.map((d,i)=>{
    const v=d[field],pct=Math.max((v/maxVal*100),0).toFixed(1);
    return\`<tr><td class="td-num">\${i+1}</td><td class="td-lbl" title="\${d.name}">\${d.name}</td><td><div class="bar-outer"><div class="bar-inner" style="width:\${pct}%;background:\${BLUES20[i]}"><span>\${fmtFn(v)}</span></div></div></td></tr>\`;
  }).join('')+'</table>';
}

function buildSummary(){
  const{rows,months,productName,hsCode,isMultiProduct,unit,partnerCount,rankLabel}=G;
  const totalUSD=rows.reduce((s,r)=>s+r._usd,0),totalQTY=rows.reduce((s,r)=>s+r._qty,0);
  const avgP=totalQTY>0?(totalUSD/totalQTY):0;
  return\`<div class="summary-box">
    <span class="s-label">产品：</span>\${isMultiProduct?hsCode:(productName.length>30?productName.slice(0,30)+'…':productName)}
    <span class="s-label" style="margin-left:16px">数据周期：</span>\${getPeriodDesc()}（\${months.length}个月）
    <span class="s-label" style="margin-left:16px">记录数：</span>\${rows.length.toLocaleString()}条
    <br><span class="s-label">累计出口额：</span>\${fmtUSD(totalUSD)}
    <span class="s-label" style="margin-left:16px">累计出口量：</span>\${fmtQTY(totalQTY,unit)}
    <span class="s-label" style="margin-left:16px">综合均价：</span>$\${avgP.toFixed(4)}/\${unit}
    <br><span class="s-label">覆盖贸易伙伴国：</span>\${partnerCount}个
    <span class="s-label" style="margin-left:16px">排名基准：</span>\${rankLabel}
  </div>\`;
}

function buildKpiHTML(){
  const{compareMode,latest,prev,monthly,unit,rankRows,prevPeriodRows,curYear,baseYear}=G;
  const totalUSD=Object.values(G.monthly).reduce((s,v)=>s+v.usd,0);
  const totalQTY=Object.values(G.monthly).reduce((s,v)=>s+v.qty,0);
  if(compareMode==='mom'){
    const lu=monthly[latest]?.usd||0,lq=monthly[latest]?.qty||0,pu=monthly[prev]?.usd||0,pq=monthly[prev]?.qty||0;
    const mu=(lu-pu)/pu*100,mq=(lq-pq)/pq*100;
    G._mu=mu;G._mq=mq;G._lu=lu;G._lq=lq;G._pu=pu;G._pq=pq;
    return\`<table class="kpi-tbl"><tr>
      <td class="kcard"><span class="klabel">\${fmtYM(prev)}出口额（基准）</span><span class="kval">\${fmtUSD(pu)}</span><span class="kch kna">基准月</span></td>
      <td class="kcard"><span class="klabel">\${fmtYM(latest)}出口额</span><span class="kval">\${fmtUSD(lu)}</span><span class="kch \${mu>=0?'kup':'kdown'}">\${mu>=0?'▲':'▼'} 环比 \${Math.abs(mu).toFixed(1)}%</span></td>
      <td class="kcard"><span class="klabel">\${fmtYM(prev)}出口量</span><span class="kval">\${fmtQTY(pq,unit)}</span><span class="kch kna">基准月</span></td>
      <td class="kcard"><span class="klabel">\${fmtYM(latest)}出口量</span><span class="kval">\${fmtQTY(lq,unit)}</span><span class="kch \${mq>=0?'kup':'kdown'}">\${mq>=0?'▲':'▼'} 环比 \${Math.abs(mq).toFixed(1)}%</span></td>
    </tr></table>\`;
  }
  if(compareMode==='yoy'){
    const curU=rankRows.reduce((s,r)=>s+r._usd,0),curQ=rankRows.reduce((s,r)=>s+r._qty,0);
    const basU=(prevPeriodRows||[]).reduce((s,r)=>s+r._usd,0),basQ=(prevPeriodRows||[]).reduce((s,r)=>s+r._qty,0);
    const yoyU=basU>0?(curU-basU)/basU*100:null,yoyQ=basQ>0?(curQ-basQ)/basQ*100:null;
    G._curU=curU;G._curQ=curQ;G._basU=basU;G._basQ=basQ;G._yoyU=yoyU;G._yoyQ=yoyQ;
    const cL=G.periodType==='twoYear'?\`\${curYear}年度\`:\`\${curYear}年同期\`;
    const bL=G.periodType==='twoYear'?\`\${baseYear}年度\`:\`\${baseYear}年同期\`;
    return\`<table class="kpi-tbl"><tr>
      <td class="kcard"><span class="klabel">\${bL}出口额</span><span class="kval">\${fmtUSD(basU)}</span><span class="kch kna">基准期</span></td>
      <td class="kcard"><span class="klabel">\${cL}出口额</span><span class="kval">\${fmtUSD(curU)}</span><span class="kch \${yoyU>=0?'kup':'kdown'}">\${yoyU>=0?'▲':'▼'} 同比 \${yoyU!=null?Math.abs(yoyU).toFixed(1)+'%':'—'}</span></td>
      <td class="kcard"><span class="klabel">\${bL}出口量</span><span class="kval">\${fmtQTY(basQ,unit)}</span><span class="kch kna">基准期</span></td>
      <td class="kcard"><span class="klabel">\${cL}出口量</span><span class="kval">\${fmtQTY(curQ,unit)}</span><span class="kch \${yoyQ>=0?'kup':'kdown'}">\${yoyQ>=0?'▲':'▼'} 同比 \${yoyQ!=null?Math.abs(yoyQ).toFixed(1)+'%':'—'}</span></td>
    </tr></table>\`;
  }
  return\`<table class="kpi-tbl"><tr>
    <td class="kcard"><span class="klabel">期间累计出口额</span><span class="kval">\${fmtUSD(totalUSD)}</span><span class="kch kna">\${getPeriodDesc()}</span></td>
    <td class="kcard"><span class="klabel">期间累计出口量</span><span class="kval">\${fmtQTY(totalQTY,unit)}</span><span class="kch kna">\${getPeriodDesc()}</span></td>
  </tr></table>\`;
}

function buildKpiAnalysis(){
  const{compareMode,latest,monthly,unit}=G;
  if(compareMode==='mom'){
    const mu=G._mu||0,mq=G._mq||0,lu=G._lu||0,lq=G._lq||0,pu=G._pu||0,pq=G._pq||0;
    let t=\`【出口整体走势】\${fmtYM(latest)}出口额环比\${mu>=0?'增长':'下降'}\${Math.abs(mu).toFixed(1)}%（\${fmtUSD(pu)}→\${fmtUSD(lu)}），出口量环比\${mq>=0?'增长':'下降'}\${Math.abs(mq).toFixed(1)}%。\`;
    if(mu>0&&mq>0)t+=\`量价双升，出口景气度良好。\`;else if(mu<0&&mq<0)t+=\`金额与数量同步回落，需排查市场需求变化。\`;
    return t;
  }
  if(compareMode==='yoy'){
    const yoyU=G._yoyU,yoyQ=G._yoyQ,curU=G._curU||0,basU=G._basU||0;
    const cL=G.periodType==='twoYear'?\`\${G.curYear}年度\`:\`\${G.curYear}年同期\`;
    let t=\`【同比整体走势】\${cL}出口额同比\${yoyU>=0?'增长':'下降'}\${yoyU!=null?Math.abs(yoyU).toFixed(1)+'%':'—'}（\${fmtUSD(basU)}→\${fmtUSD(curU)}）。\`;
    if(yoyU>0&&yoyQ>0)t+=\`量价齐升，年度出口总体向好。\`;
    return t;
  }
  const tu=Object.values(G.monthly).reduce((s,v)=>s+v.usd,0),tq=Object.values(G.monthly).reduce((s,v)=>s+v.qty,0);
  const avgP=tq>0?(tu/tq):0;
  return\`【出口整体概况】本期（\${getPeriodDesc()}）累计出口总额\${fmtUSD(tu)}，累计出口量\${fmtQTY(tq,G.unit)}，期间均价约 $\${avgP.toFixed(4)}/\${G.unit}。\`;
}

function buildCountryAnalysis(type){
  const{cAmt,cQty,rankLabel,unit}=G;
  const data=type==='amt'?cAmt:cQty;const field=type==='amt'?'usd':'qty';
  if(!data.length)return'数据不足。';
  const top=data[0];const total=data.reduce((s,d)=>s+d[field],0);
  const topPct=(top[field]/total*100).toFixed(1);
  return\`【目标市场分析（按\${type==='amt'?'金额':'数量'}）】\${rankLabel}，\${top.name}以\${topPct}%占比排名第一，是核心目标市场。TOP5市场合计占比\${(data.slice(0,5).reduce((s,d)=>s+d[field],0)/total*100).toFixed(1)}%，市场集中度\${parseFloat(topPct)>50?'较高':'较为分散'}。建议持续深耕头部市场，同时关注排名上升的新兴市场开拓机会。\`;
}

function buildProvinceAnalysis(type){
  const{pAmt,pQty,rankLabel}=G;
  const data=type==='amt'?pAmt:pQty;const field=type==='amt'?'usd':'qty';
  if(!data.length)return'数据不足。';
  const top=data[0];const total=data.reduce((s,d)=>s+d[field],0);
  return\`【国内省份分析（按\${type==='amt'?'金额':'数量'}）】\${rankLabel}，\${top.name}以\${(top[field]/total*100).toFixed(1)}%占比排名第一，是最主要的出口货源地。TOP3省份合计占比\${(data.slice(0,3).reduce((s,d)=>s+d[field],0)/total*100).toFixed(1)}%，供应链地域集中度\${(data[0][field]/total)>0.4?'偏高':'相对均衡'}。\`;
}

function buildTradeModeAnalysis(){
  const{tmode}=G;const total=tmode.reduce((s,t)=>s+t.usd,0),top=tmode[0];
  const top1pct=(top.usd/total*100).toFixed(1);
  return\`【贸易方式结构分析】\${top.name}占比\${top1pct}%，\${parseFloat(top1pct)>85?'绝对主导该品类出口格局，高度集中于一般贸易。':'贸易方式呈现一定多元化。'}贸易方式越多元，说明出口企业类型越丰富；建议根据目标客户偏好，针对性设计产品和服务方案。\`;
}

function buildTradeBars(){
  const{tmode}=G;const maxV=tmode[0]?.usd||1;
  return'<table class="bar-tbl">'+tmode.slice(0,8).map((t,i)=>{
    const pct=Math.max((t.usd/maxV*100),0).toFixed(1);
    return\`<tr><td class="td-num">\${i+1}</td><td class="td-lbl" title="\${t.name}">\${t.name}</td><td><div class="bar-outer"><div class="bar-inner" style="width:\${pct}%;background:\${BLUES20[i]}"><span>\${fmtBar(t.usd,true,'')}</span></div></div></td></tr>\`;
  }).join('')+'</table>';
}

function priceStats(priceMap,name,mths){
  const vals=mths.map(m=>priceMap[name]?.[m]||0).filter(v=>v>0);
  if(!vals.length)return null;
  return{min:Math.min(...vals),max:Math.max(...vals),avg:vals.reduce((a,b)=>a+b,0)/vals.length};
}
function weightedAvgPrice(name,field,mths){
  const filtered=G.rows.filter(r=>r[field]===name&&mths.includes(r._ym));
  const tu=filtered.reduce((s,r)=>s+r._usd,0),tq=filtered.reduce((s,r)=>s+r._qty,0);
  return tq>0?tu/tq:0;
}
function buildPriceTable(names,priceMap,mths,entityLabel,rowField){
  const rows=names.map(n=>({name:n,stats:priceStats(priceMap,n,mths),wavg:weightedAvgPrice(n,rowField,mths)})).filter(r=>r.stats);
  if(!rows.length)return'';
  rows.sort((a,b)=>b.wavg-a.wavg);
  let html=\`<table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:10px;"><thead><tr style="background:#1a3a5c;color:#fff;"><th style="padding:7px 9px;text-align:left;border:1px solid #2a5a8c;">排名</th><th style="padding:7px 9px;text-align:left;border:1px solid #2a5a8c;">\${entityLabel||'国家/地区'}</th><th style="padding:7px 9px;text-align:right;border:1px solid #2a5a8c;">综合均价</th><th style="padding:7px 9px;text-align:right;border:1px solid #2a5a8c;color:#90ee90;">区间最低价</th><th style="padding:7px 9px;text-align:right;border:1px solid #2a5a8c;color:#ffb3b3;">区间最高价</th><th style="padding:7px 9px;text-align:right;border:1px solid #2a5a8c;">价格幅度</th></tr></thead><tbody>\`;
  rows.forEach((r,i)=>{
    const bg=i%2===0?'#fff':'#f9fafb';
    const range=r.stats.min>0?((r.stats.max-r.stats.min)/r.stats.min*100).toFixed(1):'—';
    html+=\`<tr style="background:\${bg}"><td style="padding:5px 9px;border:1px solid #e0e4ea;color:#888;text-align:center;">\${i+1}</td><td style="padding:5px 9px;border:1px solid #e0e4ea;font-weight:600;color:#1a3a5c;">\${r.name}</td><td style="padding:5px 9px;border:1px solid #e0e4ea;text-align:right;font-weight:600;">\${r.wavg>0?'$'+r.wavg.toFixed(4):'—'}</td><td style="padding:5px 9px;border:1px solid #e0e4ea;text-align:right;color:#27ae60;">$\${r.stats.min.toFixed(4)}</td><td style="padding:5px 9px;border:1px solid #e0e4ea;text-align:right;color:#c0392b;">$\${r.stats.max.toFixed(4)}</td><td style="padding:5px 9px;border:1px solid #e0e4ea;text-align:right;color:#666;">±\${range}%</td></tr>\`;
  });
  return html+'</tbody></table>';
}

function buildPriceAnalysis(scope){
  const names=scope==='prov'?G.top10prov:G.top10names;
  const prMap=scope==='prov'?G.priceByProvMonth:G.priceByCountryMonth;
  const entity=scope==='prov'?'省市':'市场';
  const rowField=scope==='prov'?'注册地名称':'贸易伙伴名称';
  const statMths=G.priceMonths;
  const statList=names.map(n=>({name:n,s:priceStats(prMap,n,statMths),wavg:weightedAvgPrice(n,rowField,statMths)})).filter(x=>x.s);
  if(!statList.length)return'价格数据不足。';
  const maxE=statList.reduce((a,b)=>a.s.max>b.s.max?a:b);
  const minE=statList.reduce((a,b)=>a.s.min<b.s.min?a:b);
  const allRows=G.rows.filter(r=>names.includes(r[rowField])&&statMths.includes(r._ym));
  const totalUSD=allRows.reduce((s,r)=>s+r._usd,0),totalQTY=allRows.reduce((s,r)=>s+r._qty,0);
  const trueAvg=totalQTY>0?totalUSD/totalQTY:0;
  let txt=\`【TOP10\${entity}单价分析】\\n最高单价市场：\${maxE.name}（区间 $\${maxE.s.min.toFixed(4)}~$\${maxE.s.max.toFixed(4)}/\${G.unit}）。\\n最低单价市场：\${minE.name}（区间 $\${minE.s.min.toFixed(4)}~$\${minE.s.max.toFixed(4)}/\${G.unit}）。\`;
  if(trueAvg>0)txt+=\`\\nTOP10\${entity}综合均价 $\${trueAvg.toFixed(4)}/\${G.unit}。\`;
  return txt+buildPriceTable(names,prMap,statMths,scope==='prov'?'出口省市':'国家/地区',rowField);
}

function buildReport(rows, fn){
  rows=rows.filter(r=>r['数据年月']&&r['美元']);
  rows.forEach(r=>{r._usd=parseFloat((r['美元']||'').toString().replace(/,/g,''))||0;r._qty=parseInt((r['第一数量']||'').toString().replace(/,/g,''))||0;r._ym=parseInt(r['数据年月'])||0;});
  const months=[...new Set(rows.map(r=>r._ym))].filter(Boolean).sort();
  const allCodes=[...new Set(rows.map(r=>(r['商品编码']||'').toString().trim()).filter(Boolean))];
  const allNames=[...new Set(rows.map(r=>(r['商品名称']||'').toString().trim()).filter(Boolean))];
  const hsCode=allCodes.length===1?allCodes[0]:allCodes.length>1?allCodes.map(c=>'HS'+c).join('+'):'';
  const productName=allNames.length===1?allNames[0]:allNames.length>1?\`多品类合并（\${allCodes.map(c=>'HS'+c).join('+')}）\`:'未知商品';
  const isMultiProduct=allCodes.length>1;
  const unit=rows[0]?.['第一计量单位']||'件';
  const periodType=detectPeriod(months);
  const monthly={};
  months.forEach(m=>{const mr=rows.filter(r=>r._ym===m);monthly[m]={usd:mr.reduce((s,r)=>s+r._usd,0),qty:mr.reduce((s,r)=>s+r._qty,0)};});
  const latest=months[months.length-1],prev=months.length>1?months[months.length-2]:null;
  const YOY_TYPES=['twoYear','yoyMonth','yoyQuarter','yoyHalfyear'];
  const PURE_TYPES=['single','year','quarter','halfyear','customPeriod'];
  const isPurePeriod=PURE_TYPES.includes(periodType);
  const isYoY=YOY_TYPES.includes(periodType);
  const compareMode=isPurePeriod?'none':(isYoY?'yoy':'mom');
  const yrs=[...new Set(months.map(m=>Math.floor(m/100)))].sort();
  const curYear=yrs[yrs.length-1],baseYear=yrs.length>1?yrs[yrs.length-2]:null;
  const curMonths=months.filter(m=>Math.floor(m/100)===curYear);
  const baseMonths=months.filter(m=>Math.floor(m/100)===(baseYear||curYear));
  let rankRows,rankLabel,priceMonths,prevPeriodRows;
  if(isPurePeriod){rankRows=rows;priceMonths=months;prevPeriodRows=null;rankLabel=periodType==='single'?fmtYM(latest):periodType==='year'?\`\${Math.floor(latest/100)}年度合计\`:\`\${fmtYM(months[0])}~\${fmtYM(latest)}合计\`;}
  else if(isYoY){rankRows=rows.filter(r=>Math.floor(r._ym/100)===curYear);prevPeriodRows=rows.filter(r=>Math.floor(r._ym/100)===baseYear);priceMonths=curMonths;rankLabel=periodType==='twoYear'?\`\${curYear}年度合计（同比\${baseYear}年）\`:\`\${curYear}年同期（对比\${baseYear}年）\`;}
  else{rankRows=rows.filter(r=>r._ym===latest);prevPeriodRows=null;priceMonths=months;rankLabel=\`\${fmtYM(latest)}（最新月）\`;}
  const cAmt=groupBy(rankRows,'贸易伙伴名称').sort((a,b)=>b.usd-a.usd).slice(0,20);
  const cQty=groupBy(rankRows,'贸易伙伴名称').sort((a,b)=>b.qty-a.qty).slice(0,20);
  const pAmt=groupBy(rankRows,'注册地名称').sort((a,b)=>b.usd-a.usd).slice(0,20);
  const pQty=groupBy(rankRows,'注册地名称').sort((a,b)=>b.qty-a.qty).slice(0,20);
  const tmode=groupBy(rows,'贸易方式名称').sort((a,b)=>b.usd-a.usd);
  const top10names=cAmt.slice(0,10).map(c=>c.name);
  const top10prov=pAmt.slice(0,10).map(p=>p.name);
  const priceByCountryMonth={};
  top10names.forEach(n=>{priceByCountryMonth[n]={};months.forEach(m=>{const mr=rows.filter(r=>r._ym===m&&r['贸易伙伴名称']===n);const usd=mr.reduce((s,r)=>s+r._usd,0),qty=mr.reduce((s,r)=>s+r._qty,0);priceByCountryMonth[n][m]=qty>0?(usd/qty):0;});});
  const priceByProvMonth={};
  top10prov.forEach(p=>{priceByProvMonth[p]={};months.forEach(m=>{const mr=rows.filter(r=>r._ym===m&&r['注册地名称']===p);const usd=mr.reduce((s,r)=>s+r._usd,0),qty=mr.reduce((s,r)=>s+r._qty,0);priceByProvMonth[p][m]=qty>0?(usd/qty):0;});});
  const trendAmt={},trendQty={};
  if(compareMode==='mom'){top10names.forEach(n=>{trendAmt[n]={};trendQty[n]={};months.slice(-2).forEach(m=>{const mr=rows.filter(r=>r._ym===m&&r['贸易伙伴名称']===n);trendAmt[n][m]=mr.reduce((s,r)=>s+r._usd,0);trendQty[n][m]=mr.reduce((s,r)=>s+r._qty,0);});});}
  else if(compareMode==='yoy'){top10names.forEach(n=>{const curR=rankRows.filter(r=>r['贸易伙伴名称']===n);const basR=(prevPeriodRows||[]).filter(r=>r['贸易伙伴名称']===n);trendAmt[n]={cur:curR.reduce((s,r)=>s+r._usd,0),base:basR.reduce((s,r)=>s+r._usd,0)};trendQty[n]={cur:curR.reduce((s,r)=>s+r._qty,0),base:basR.reduce((s,r)=>s+r._qty,0)};});}
  const partnerCount=[...new Set(rows.map(r=>r['贸易伙伴名称']))].filter(Boolean).length;
  G={rows,months,monthly,productName,hsCode,isMultiProduct,unit,periodType,isPurePeriod,isYoY,rankRows,rankLabel,priceMonths,compareMode,latest,prev,curYear,baseYear,curMonths,baseMonths,prevPeriodRows,cAmt,cQty,pAmt,pQty,tmode,top10names,top10prov,trendAmt,trendQty,priceByCountryMonth,priceByProvMonth,fn,partnerCount};
  renderReport();
}

function renderReport(){
  const{productName,hsCode,isMultiProduct,unit,months,compareMode,latest,prev,rankLabel,cAmt,cQty,pAmt,pQty,tmode,top10names,curYear,baseYear,isPurePeriod,periodType}=G;
  const el=document.getElementById('reportBody');
  const pd=getPeriodDesc();
  const pubDate=new Date().toLocaleDateString('zh-CN',{year:'numeric',month:'long',day:'numeric'});

  // ── 第1板块：核心数据概览（始终可见）────────────────────────
  const sec1=\`<div class="sec">
    <span class="stitle">核心数据概览</span>
    \${buildSummary()}
    \${buildKpiHTML()}
    <div class="anlys">\${buildKpiAnalysis()}</div>
  </div>\`;

  if(!IS_UNLOCKED){
    // 预览模式：只显示第1板块，其余8个板块用遮罩
    el.innerHTML=\`
    <div class="rh">
      <div class="rbadge">精准分析，高效出海</div>
      <div class="rt">\${isMultiProduct?\`多品类合并出口市场分析报告<br><span style="font-size:15px;font-weight:500;color:#2a6daf">\${hsCode}</span>\`:\`\${productName.length>40?productName.slice(0,40)+'…':productName}<br>出口市场分析报告\${hsCode?'（HS '+hsCode+'）':''}\`}</div>
      <div class="rm">数据周期：\${pd}</div>
    </div>
    \${sec1}
    <div style="background:#f4f7fb;border:2px dashed #c5d8ec;border-radius:12px;padding:40px;text-align:center;margin-top:16px;">
      <div style="font-size:32px;margin-bottom:12px;">🔒</div>
      <div style="font-size:17px;font-weight:600;color:#1a3a5c;margin-bottom:8px;">还有 8 个分析板块待解锁</div>
      <div style="font-size:13px;color:#666;line-height:2;margin-bottom:4px;">
        出口目标市场排名 TOP20 · 大洲格局分析 · 环比/同比趋势<br>
        TOP10市场单价链路 · 省份排名 TOP20 · 省市单价趋势 · 贸易方式结构
      </div>
      <div style="font-size:12px;color:#999;margin-top:8px;">解锁后可在线查看全部内容 + 下载 Word / PDF</div>
    </div>\`;
    return;
  }

  // ── 已解锁：显示全部9个板块 ─────────────────────────────────
  let trendSection='';
  if(compareMode==='mom'&&months.length>=2){
    const m1=months[months.length-2],m2=months[months.length-1];
    trendSection=\`<div class="sec">
      <span class="stitle">环比趋势：TOP 10 市场</span>
      <div class="cbox">
        <span class="ctitle">出口金额环比（\${fmtYM(m1)} vs \${fmtYM(m2)}，万美元）</span>
        <div class="legrow"><span class="legdot" style="background:#1a3a5c"></span>\${fmtYM(m1)}&nbsp;&nbsp;<span class="legdot" style="background:#6a9dc8"></span>\${fmtYM(m2)}</div>
        <div class="canvas-wrap"><canvas id="trendAmtChart"></canvas></div>
      </div>
      <div class="cbox" style="margin-top:12px">
        <span class="ctitle">出口数量环比（\${fmtYM(m1)} vs \${fmtYM(m2)}，万\${unit}）</span>
        <div class="legrow"><span class="legdot" style="background:#245c94"></span>\${fmtYM(m1)}&nbsp;&nbsp;<span class="legdot" style="background:#80c9e8"></span>\${fmtYM(m2)}</div>
        <div class="canvas-wrap"><canvas id="trendQtyChart"></canvas></div>
      </div>
    </div>\`;
  } else if(compareMode==='yoy'){
    const cL=G.periodType==='twoYear'?\`\${curYear}年度\`:\`\${curYear}年同期\`;
    const bL=G.periodType==='twoYear'?\`\${baseYear}年度\`:\`\${baseYear}年同期\`;
    trendSection=\`<div class="sec">
      <span class="stitle">同比对比：TOP 10 市场</span>
      <div class="cbox">
        <span class="ctitle">出口金额同比（\${bL} vs \${cL}，万美元）</span>
        <div class="legrow"><span class="legdot" style="background:#1a3a5c"></span>\${bL}&nbsp;&nbsp;<span class="legdot" style="background:#6a9dc8"></span>\${cL}</div>
        <div class="canvas-wrap"><canvas id="trendAmtChart"></canvas></div>
      </div>
      <div class="cbox" style="margin-top:12px">
        <span class="ctitle">出口数量同比（\${bL} vs \${cL}，万\${unit}）</span>
        <div class="legrow"><span class="legdot" style="background:#245c94"></span>\${bL}&nbsp;&nbsp;<span class="legdot" style="background:#80c9e8"></span>\${cL}</div>
        <div class="canvas-wrap"><canvas id="trendQtyChart"></canvas></div>
      </div>
    </div>\`;
  }

  el.innerHTML=\`
    <div class="rh">
      <div class="rbadge">精准分析，高效出海</div>
      <div class="rt">\${isMultiProduct?\`多品类合并出口市场分析报告<br><span style="font-size:15px;font-weight:500;color:#2a6daf">\${hsCode}</span>\`:\`\${productName.length>40?productName.slice(0,40)+'…':productName}<br>出口市场分析报告\${hsCode?'（HS '+hsCode+'）':''}\`}</div>
      <div class="rm">数据周期：\${pd} | 报告生成：\${pubDate}</div>
    </div>
    \${sec1}
    <div class="sec">
      <span class="stitle">出口目标市场排名 TOP 20（\${rankLabel}）</span>
      <div class="cbox">
        <span class="ctitle">按出口金额（美元）TOP 20</span>
        <span class="cdesc">数量单位：\${unit}</span>
        \${buildBarsHTML(cAmt,'usd',v=>fmtBar(v,true,''),cAmt[0]?.usd||1)}
      </div>
      <div class="anlys">\${buildCountryAnalysis('amt')}</div>
      <div class="cbox" style="margin-top:12px">
        <span class="ctitle">按出口数量（\${unit}）TOP 20</span>
        \${buildBarsHTML(cQty,'qty',v=>fmtBar(v,false,unit),cQty[0]?.qty||1)}
      </div>
      <div class="anlys">\${buildCountryAnalysis('qty')}</div>
      <div class="cbox" style="margin-top:12px">
        <span class="ctitle">大洲出口金额排名</span>
        <span class="cdesc">\${rankLabel}</span>
        \${(()=>{const c=buildContinentData(G.rankRows);return buildContinentBars(c);})()}
      </div>
      <div class="anlys">\${(()=>{const c=buildContinentData(G.rankRows);return buildContinentAnalysis(c);})()}</div>
    </div>
    \${trendSection}
    <div class="sec">
      <span class="stitle">TOP 10 市场单价链路趋势（美元/\${unit}）</span>
      <div class="cbox">
        <span class="ctitle">各市场出口单价月度走势</span>
        <span class="cdesc">数据周期：\${pd}</span>
        <div class="canvas-wrap" style="height:380px"><canvas id="priceChart"></canvas></div>
      </div>
      <div class="anlys">\${buildPriceAnalysis()}</div>
    </div>
    <div class="sec">
      <span class="stitle">国内出口省份排名 TOP 20（\${rankLabel}）</span>
      <div class="cbox">
        <span class="ctitle">按出口金额（美元）TOP 20</span>
        \${buildBarsHTML(pAmt,'usd',v=>fmtBar(v,true,''),pAmt[0]?.usd||1)}
      </div>
      <div class="anlys">\${buildProvinceAnalysis('amt')}</div>
      <div class="cbox" style="margin-top:12px">
        <span class="ctitle">按出口数量（\${unit}）TOP 20</span>
        \${buildBarsHTML(pQty,'qty',v=>fmtBar(v,false,unit),pQty[0]?.qty||1)}
      </div>
      <div class="anlys">\${buildProvinceAnalysis('qty')}</div>
    </div>
    <div class="sec">
      <span class="stitle">TOP 10 省市单价链路趋势（美元/\${unit}）</span>
      <div class="cbox">
        <span class="ctitle">各省市出口单价月度走势</span>
        <div class="canvas-wrap" style="height:380px"><canvas id="provPriceChart"></canvas></div>
      </div>
      <div class="anlys">\${buildPriceAnalysis('prov')}</div>
    </div>
    <div class="sec">
      <span class="stitle">贸易方式结构</span>
      <table class="twocol-tbl"><tr>
        <td><div class="cbox">
          <span class="ctitle">各贸易方式出口额占比</span>
          <div class="legrow" id="pieLegend"></div>
          <div class="canvas-wrap" style="height:200px"><canvas id="pieChart"></canvas></div>
        </div></td>
        <td><div class="cbox">
          <span class="ctitle">各方式出口额（万美元）</span>
          \${buildTradeBars()}
        </div></td>
      </tr></table>
      <div class="anlys">\${buildTradeModeAnalysis()}</div>
    </div>
    <div class="foot">外贸风向标 · 海关数据市场分析平台 · 数据仅供参考，请结合实际业务判断</div>
  \`;
  setTimeout(()=>drawAllCharts(),100);
}

function drawAllCharts(){
  const{top10names,top10prov,trendAmt,trendQty,months,compareMode,tmode,priceByCountryMonth,priceByProvMonth,unit,priceMonths,isPurePeriod,periodType,monthly}=G;
  const m1=months[months.length-2],m2=months[months.length-1];

  // 趋势图
  if(compareMode==='mom'&&months.length>=2){
    const labels=top10names;
    const mkBar=(data,colors,yLabel)=>({type:'bar',data:{labels,datasets:data},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>\`\${ctx.raw.toFixed(2)}万\${yLabel}\`}}},scales:{x:{ticks:{font:{size:10}},grid:{display:false}},y:{ticks:{callback:v=>v+'万'}}}}});
    const ca=document.getElementById('trendAmtChart');
    if(ca)new Chart(ca,mkBar([{label:fmtYM(m1),data:top10names.map(n=>(trendAmt[n]?.[m1]||0)/10000),backgroundColor:'#1a3a5c'},{label:fmtYM(m2),data:top10names.map(n=>(trendAmt[n]?.[m2]||0)/10000),backgroundColor:'#6a9dc8'}],'美元'));
    const cq=document.getElementById('trendQtyChart');
    if(cq)new Chart(cq,mkBar([{label:fmtYM(m1),data:top10names.map(n=>(trendQty[n]?.[m1]||0)/10000),backgroundColor:'#245c94'},{label:fmtYM(m2),data:top10names.map(n=>(trendQty[n]?.[m2]||0)/10000),backgroundColor:'#80c9e8'}],unit));
  } else if(compareMode==='yoy'){
    const cL=G.periodType==='twoYear'?\`\${G.curYear}年度\`:\`\${G.curYear}年同期\`;
    const bL=G.periodType==='twoYear'?\`\${G.baseYear}年度\`:\`\${G.baseYear}年同期\`;
    const labels=top10names;
    const mkBar=(data)=>({type:'bar',data:{labels,datasets:data},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{font:{size:10}},grid:{display:false}},y:{ticks:{callback:v=>v+'万'}}}}});
    const ca=document.getElementById('trendAmtChart');
    if(ca)new Chart(ca,mkBar([{label:bL,data:top10names.map(n=>(trendAmt[n]?.base||0)/10000),backgroundColor:'#1a3a5c'},{label:cL,data:top10names.map(n=>(trendAmt[n]?.cur||0)/10000),backgroundColor:'#6a9dc8'}]));
    const cq=document.getElementById('trendQtyChart');
    if(cq)new Chart(cq,mkBar([{label:bL,data:top10names.map(n=>(trendQty[n]?.base||0)/10000),backgroundColor:'#245c94'},{label:cL,data:top10names.map(n=>(trendQty[n]?.cur||0)/10000),backgroundColor:'#80c9e8'}]));
  }

  // 单价折线图
  const buildPriceLineChart=(canvasId,names,priceMap,mths)=>{
    const c=document.getElementById(canvasId);if(!c)return;
    const labels=mths.map(fmtYM);
    new Chart(c,{type:'line',data:{labels,datasets:names.map((n,i)=>({label:n,data:mths.map(m=>priceMap[n]?.[m]||null),borderColor:LINE10[i%10],backgroundColor:LINE10[i%10]+'22',pointRadius:4,tension:0.3,borderWidth:2,spanGaps:true}))},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{font:{size:10},boxWidth:10}}},scales:{x:{ticks:{font:{size:10}}},y:{ticks:{callback:v=>'$'+v.toFixed(2)}}}}});
  };
  buildPriceLineChart('priceChart',top10names,priceByCountryMonth,months);
  buildPriceLineChart('provPriceChart',top10prov,priceByProvMonth,months);

  // 饼图
  const pc=document.getElementById('pieChart');
  if(pc&&tmode.length){
    const total=tmode.reduce((s,t)=>s+t.usd,0);
    const leg=document.getElementById('pieLegend');
    if(leg)leg.innerHTML=tmode.slice(0,6).map((t,i)=>\`<span class="legdot" style="background:\${BLUES20[i]}"></span>\${t.name}(\${(t.usd/total*100).toFixed(1)}%) \`).join('');
    new Chart(pc,{type:'pie',data:{labels:tmode.slice(0,6).map(t=>t.name),datasets:[{data:tmode.slice(0,6).map(t=>t.usd),backgroundColor:BLUES20.slice(0,6)}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}});
  }
}

async function buildExportClone(){
  const report=document.getElementById('reportBody');
  const cboxes=[...report.querySelectorAll('.cbox')];
  const shotMap=new Map();
  for(const cb of cboxes){
    try{const canvas=await html2canvas(cb,{scale:2,useCORS:true,backgroundColor:'#ffffff'});shotMap.set(cb,canvas.toDataURL('image/png'));}catch(e){}
  }
  const clone=report.cloneNode(true);
  const cloneCboxes=[...clone.querySelectorAll('.cbox')];
  cboxes.forEach((orig,i)=>{
    if(shotMap.has(orig)){
      const img=document.createElement('img');img.src=shotMap.get(orig);
      img.style.cssText='width:100%;height:auto;display:block;margin:0 0 4px 0;border-radius:8px;';
      img.setAttribute('width','740');
      const cb=cloneCboxes[i];if(cb)cb.parentNode.replaceChild(img,cb);
    }
  });
  return clone;
}

function wmSvgDataUrl(){
  const svg=\`<svg xmlns="http://www.w3.org/2000/svg" width="420" height="200"><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" transform="rotate(-28,210,100)" font-family="PingFang SC,sans-serif" font-size="14" font-weight="600" letter-spacing="1" fill="rgba(26,58,92,0.09)">\${WM}</text></svg>\`;
  return\`url("data:image/svg+xml;base64,\${btoa(unescape(encodeURIComponent(svg)))}")\`;
}
function wmBgStyle(){return\`background-image:\${wmSvgDataUrl()};background-repeat:repeat;background-size:420px 200px;\`;}

async function downloadWord(){
  const clone=await buildExportClone();
  const wmNote=\`<p style="text-align:center;font-size:9pt;color:#888;border-top:1pt solid #e0e4ea;padding-top:10pt;margin-top:16pt;">\${WM}</p>\`;
  const wordCSS=\`@page{size:A4;margin:2cm 2.5cm;}body{font-family:'微软雅黑',sans-serif;font-size:10.5pt;color:#1a1a1a;line-height:1.6;}.rh{border-bottom:2pt solid #1a3a5c;padding-bottom:10pt;margin-bottom:16pt;}.rbadge{background:#1a3a5c;color:#e8f0f8;font-size:9pt;padding:3pt 10pt;display:inline-block;margin-bottom:8pt;}.rt{font-size:17pt;font-weight:bold;color:#1a3a5c;line-height:1.4;}.rs,.rm{font-size:9pt;color:#555;margin-top:4pt;}.sec{margin-bottom:16pt;}.stitle{font-size:9pt;font-weight:bold;color:#555;letter-spacing:2pt;border-left:3pt solid #1a3a5c;padding-left:8pt;margin-bottom:10pt;}.summary-box{background:#fff8ee;border:1.5pt solid #e8c87a;padding:10pt 14pt;margin-bottom:10pt;font-size:10pt;line-height:1.9;}.s-label{font-weight:bold;color:#1a3a5c;}.kpi-tbl{width:100%;border-collapse:collapse;margin-bottom:10pt;table-layout:fixed;}.kcard{background:#f4f7fb;padding:10pt 12pt;vertical-align:top;border:1pt solid #e8edf4;}.klabel{font-size:8pt;color:#555;display:block;margin-bottom:3pt;}.kval{font-size:15pt;font-weight:bold;color:#1a3a5c;display:block;}.kch{font-size:9pt;margin-top:3pt;display:block;}.kdown{color:#c0392b;}.kup{color:#27ae60;}.kna{color:#888;}.anlys{background:#f0f5fb;border-left:3pt solid #1a3a5c;padding:9pt 13pt;font-size:9.5pt;line-height:1.9;margin-top:8pt;white-space:pre-line;}.foot{font-size:9pt;color:#888;text-align:center;margin-top:20pt;padding-top:12pt;border-top:1pt solid #e0e4ea;}.report{\${wmBgStyle()}}img{max-width:100%;height:auto;display:block;margin:4px 0;}\`;
  const wordHTML=\`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"><title>\${G.productName} 出口分析报告</title><style>\${wordCSS}</style></head><body><div class="report">\${clone.innerHTML}\${wmNote}</div></body></html>\`;
  const blob=new Blob(['\ufeff'+wordHTML],{type:'application/msword;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=\`\${G.productName.slice(0,10)}_出口分析报告_\${G.latest}.doc\`;a.click();
}

async function downloadPDF(){
  const clone=await buildExportClone();
  const report=document.getElementById('reportBody');
  const originalHTML=report.innerHTML;
  report.innerHTML=clone.innerHTML;
  report.style.backgroundImage=wmSvgDataUrl();
  report.style.backgroundRepeat='repeat';
  report.style.backgroundSize='420px 200px';
  const ps=document.createElement('style');ps.id='pdfPrintStyle';
  ps.textContent=\`@media print{body{background:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact;}.main{max-width:100%;padding:0;}.report{border:none!important;padding:20px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}img{max-width:100%;height:auto;page-break-inside:avoid;}}\`;
  document.head.appendChild(ps);
  window.print();
  setTimeout(()=>{report.innerHTML=originalHTML;const s=document.getElementById('pdfPrintStyle');if(s)s.remove();setTimeout(()=>drawAllCharts(),120);},2500);
}
</script>
</body>
</html>`
}
