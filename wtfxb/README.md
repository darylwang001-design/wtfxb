# 外贸风向标 - 部署指南

## 🗂 项目文件结构

```
wtfxb/
├── app/
│   ├── page.tsx              # 首页（落地页）
│   ├── login/page.tsx        # 登录
│   ├── register/page.tsx     # 注册
│   ├── dashboard/page.tsx    # 用户工作台
│   ├── report/[id]/page.tsx  # 报告详情（下一阶段）
│   ├── pricing/page.tsx      # 充值定价
│   ├── admin/page.tsx        # 管理员后台
│   └── api/                  # 后端接口
│       ├── user/gift-credits/    # 新用户赠点
│       ├── report/create/        # 创建报告
│       ├── report/unlock/        # 解锁报告
│       ├── payment/create-checkout/ # 创建支付
│       ├── payment/webhook/      # Stripe回调
│       └── admin/               # 管理接口
├── lib/supabase.ts           # 数据库工具
├── supabase_schema.sql       # 数据库建表SQL
└── .env.example              # 环境变量模板
```

---

## 🚀 第一步：注册账号（全部免费）

### 1. 注册 Supabase
1. 打开 https://supabase.com → Sign Up（用邮箱注册）
2. 创建新项目，名称填 `wtfxb`，选择区域 `Singapore`
3. 等待项目初始化（约1分钟）
4. 进入 **Settings → API**，复制：
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role secret` → `SUPABASE_SERVICE_ROLE_KEY`

### 2. 建数据库表
1. 进入 **SQL Editor**
2. 复制 `supabase_schema.sql` 全部内容
3. 粘贴并点击 **Run** 执行

### 3. 创建 Storage Bucket
1. 进入 **Storage → Create bucket**
2. Bucket名称：`report-data`
3. 设为 **Private**（非公开）

### 4. 注册 Stripe（收款）
1. 打开 https://stripe.com → 注册账号
2. 完成实名认证（身份证 + 银行卡）
3. 进入 **Developers → API keys** 复制：
   - `Publishable key` → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `Secret key` → `STRIPE_SECRET_KEY`
4. **Webhooks → Add endpoint**：
   - URL填：`https://你的域名/api/payment/webhook`
   - 监听事件：`checkout.session.completed`
   - 复制 signing secret → `STRIPE_WEBHOOK_SECRET`

---

## 🚀 第二步：部署到 Vercel

### 1. 注册 Vercel
1. 打开 https://vercel.com → 用 GitHub 注册
2. 先把项目代码上传到 GitHub（新建仓库，上传这个文件夹）

### 2. 导入项目
1. Vercel Dashboard → **Add New Project**
2. 选择你的 GitHub 仓库
3. Framework 选 **Next.js**，直接 Deploy

### 3. 配置环境变量
1. 项目 → **Settings → Environment Variables**
2. 把 `.env.example` 里的变量逐一填入真实值

### 4. 绑定域名
1. 在阿里云购买域名（推荐 `.com` 或 `.cn`）
2. Vercel → **Settings → Domains** → Add Domain
3. 按提示在阿里云 DNS 添加 CNAME 记录

---

## ✅ 测试清单

上线前逐一测试：

- [ ] 注册新用户 → 收到验证邮件 → 账号激活
- [ ] 激活后登录 → 看到3点余额
- [ ] 上传CSV文件 → 跳转到报告页
- [ ] 报告页显示预览（KPI可见，其余模糊）
- [ ] 点击解锁 → 扣3点 → 完整报告可见
- [ ] 下载 Word / PDF
- [ ] 充值页面 → Stripe支付 → 点数到账
- [ ] 后台 /admin → 看到用户数据

---

## 📞 遇到问题？

把错误截图发给 Claude，说明在哪一步出了问题，我来帮你排查。
