-- =============================================
-- 外贸风向标 数据库建表 SQL
-- 在 Supabase Dashboard → SQL Editor 中运行
-- =============================================

-- 1. 用户积分账户表
CREATE TABLE public.user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  credits INTEGER NOT NULL DEFAULT 0,
  total_spent INTEGER NOT NULL DEFAULT 0,   -- 累计消耗点数（统计用）
  total_recharged INTEGER NOT NULL DEFAULT 0, -- 累计充值点数
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 充值订单表
CREATE TABLE public.recharge_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_session_id TEXT UNIQUE,           -- Stripe checkout session ID
  stripe_payment_intent TEXT,
  package_id TEXT NOT NULL,                -- 'trial'|'small'|'medium'|'large'
  amount_fen INTEGER NOT NULL,             -- 支付金额（分），如200=2元
  credits_to_add INTEGER NOT NULL,         -- 本次充值点数
  status TEXT NOT NULL DEFAULT 'pending',  -- pending|paid|failed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

-- 3. 点数使用记录表
CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,                      -- 'recharge'|'consume'
  amount INTEGER NOT NULL,                 -- 充值为正，消耗为负
  balance_after INTEGER NOT NULL,          -- 操作后余额
  description TEXT,                        -- 描述，如"查询：铝材.csv"
  report_id UUID,                          -- 关联报告（消耗时）
  order_id UUID REFERENCES recharge_orders(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 报告记录表（用户历史）
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  filename TEXT NOT NULL,                  -- 原始CSV文件名
  product_name TEXT,                       -- 解析出的商品名
  hs_code TEXT,                            -- HS编码
  period_desc TEXT,                        -- 数据周期描述
  status TEXT NOT NULL DEFAULT 'preview',  -- 'preview'|'unlocked'
  credits_cost INTEGER DEFAULT 0,          -- 消耗点数
  unlocked_at TIMESTAMPTZ,                 -- 解锁时间
  -- 最近下载记录（只记录最近一次，不存文件）
  last_download_format TEXT,               -- 'word'|'pdf'
  last_download_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 用户资料扩展表（补充 auth.users 没有的字段）
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  phone TEXT,
  company TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 自动触发器：新用户注册时创建积分账户和资料
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, credits)
  VALUES (NEW.id, 0);
  
  INSERT INTO public.user_profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- RLS 行级安全策略（防止用户看到别人数据）
-- =============================================
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recharge_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- user_credits：只能看自己的
CREATE POLICY "users_own_credits" ON public.user_credits
  FOR ALL USING (auth.uid() = user_id);

-- recharge_orders：只能看自己的
CREATE POLICY "users_own_orders" ON public.recharge_orders
  FOR ALL USING (auth.uid() = user_id);

-- credit_transactions：只能看自己的
CREATE POLICY "users_own_transactions" ON public.credit_transactions
  FOR ALL USING (auth.uid() = user_id);

-- reports：只能看自己的
CREATE POLICY "users_own_reports" ON public.reports
  FOR ALL USING (auth.uid() = user_id);

-- user_profiles：只能看自己的（管理员通过service_role访问）
CREATE POLICY "users_own_profile" ON public.user_profiles
  FOR ALL USING (auth.uid() = id);

-- =============================================
-- 充值套餐配置视图（方便前端读取）
-- =============================================
CREATE OR REPLACE VIEW public.credit_packages AS
SELECT * FROM (VALUES
  ('trial',  '体验包', 200,   3,   '适合试用'),
  ('small',  '小包',   1000,  55,  '性价比之选'),
  ('medium', '中包',   10000, 800, '高频用户推荐'),
  ('large',  '大包',   20000, 2500,'企业用户专属')
) AS t(id, name, price_fen, credits, description);
