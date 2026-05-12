import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '外贸风向标 - 海关数据市场分析平台',
  description: '上传海关出口CSV数据，自动生成专业市场分析报告。覆盖出口目标市场排名、价格趋势、省份分析等9大维度。',
  keywords: '海关数据,出口分析,市场报告,贸易数据,外贸分析',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
