-- ════════════════════════════════════════════════════════════════
--  Linsanity 補習班系統 — Supabase Schema
--  在 Supabase SQL Editor 直接貼上執行（先 schema.sql 再 seed.sql）
--
--  設計原則：
--   - 主鍵沿用 mock 的文字 id（如 's1'、'p1'），方便直接帶入既有假資料。
--     正式上線若要改用 uuid，把各 PK 改成 uuid default gen_random_uuid() 即可。
--   - 金額一律用 numeric（菜單有 6.5 這種小數）。
--   - 餐費採「分類帳」設計：餘額 = SUM(meal_transactions.amount)，不存欄位。
--   - 學費的「月份×學生」資料用複合主鍵 (month_key, student_id)。
-- ════════════════════════════════════════════════════════════════

-- 乾淨重建（依賴順序反向 drop）
drop view  if exists parent_balances cascade;
drop table if exists order_items          cascade;
drop table if exists orders               cascade;
drop table if exists meal_transactions    cascade;
drop table if exists attendance_logs      cascade;
drop table if exists tuition_attendance   cascade;
drop table if exists tuition_enrollments  cascade;
drop table if exists tuition_rates        cascade;
drop table if exists menu_items           cascade;
drop table if exists restaurants          cascade;
drop table if exists broadcast_logs       cascade;
drop table if exists broadcast_templates  cascade;
drop table if exists students             cascade;
drop table if exists parents              cascade;

-- ─────────────────────── 家長 ───────────────────────
-- phone 是「自動配對家長」的鍵：新增學生時用電話找既有家長
create table parents (
  id         text primary key default gen_random_uuid()::text,
  name       text not null,
  phone      text,
  created_at timestamptz default now()
);
-- 電話唯一，但允許多筆未填（NULL／空字串不納入限制）
create unique index parents_phone_key on parents (phone) where phone is not null and phone <> '';

-- ─────────────────────── 學生 ───────────────────────
-- 家長姓名/電話不存在 students，一律從 parents 帶出（join）。單一真相在 parents，
-- 改家長一處即全家反映，不會分裂或不同步。
create table students (
  id            text primary key default gen_random_uuid()::text,
  name          text not null,
  grade         int  not null,
  parent_id     text references parents(id),
  schedule_days int[] not null default '{}',     -- 上課星期，對應 JS getDay()：0=日 1=一 … 6=六
  notes         text default '',
  line_user_id  text default '',
  archived      boolean not null default false,
  deleted       boolean not null default false,
  created_at    timestamptz default now()
);
create index students_parent_idx on students (parent_id);
create index students_active_idx on students (archived, deleted);

-- ─────────────────────── 餐廳 / 菜單 ───────────────────────
create table restaurants (
  id         text primary key default gen_random_uuid()::text,
  name       text not null,
  phone      text,
  address    text,
  active     boolean not null default true,
  created_at timestamptz default now()
);

create table menu_items (
  id            text primary key default gen_random_uuid()::text,
  restaurant_id text not null references restaurants(id) on delete cascade,
  name          text not null,
  price         numeric(10,2) not null,
  category      text,
  available     boolean not null default true,
  default_qty   int not null default 1,
  created_at    timestamptz default now()
);
create index menu_items_restaurant_idx on menu_items (restaurant_id);

-- ─────────────────────── 訂單 ───────────────────────
-- 注意：前端 demo 把「今日訂單」放在獨立的 todayOrders；在 Supabase 不需要，
-- 今日訂單 = orders where date = current_date。restaurant_name / student_name /
-- price 等為下單當下的快照（歷史正確性），不隨主檔變動。
create table orders (
  id              text primary key default gen_random_uuid()::text,
  batch_id        text,
  date            date not null,
  datetime        timestamptz,
  restaurant_id   text references restaurants(id),
  restaurant_name text,
  student_id      text references students(id),
  student_name    text,
  grade           int,
  parent_id       text references parents(id),
  total           numeric(10,2) not null default 0,
  created_at      timestamptz default now()
);
create index orders_date_idx    on orders (date);
create index orders_student_idx on orders (student_id);
create index orders_parent_idx  on orders (parent_id);

create table order_items (
  id             text primary key default gen_random_uuid()::text,
  order_id       text not null references orders(id) on delete cascade,
  menu_item_id   text references menu_items(id),
  menu_item_name text not null,
  price          numeric(10,2) not null,
  qty            int not null default 1
);
create index order_items_order_idx on order_items (order_id);

-- ─────────────────────── 餐費分類帳 ───────────────────────
-- topup：amount 正、student_id 為 null（儲值給家長）
-- deduct：amount 負、student_id 標記是哪個孩子吃的
create table meal_transactions (
  id         text primary key default gen_random_uuid()::text,
  parent_id  text not null references parents(id),
  student_id text references students(id),
  type       text not null check (type in ('topup','deduct')),
  amount     numeric(10,2) not null,
  note       text,
  date       date not null,
  datetime   timestamptz,
  created_at timestamptz default now()
);
create index meal_tx_parent_idx  on meal_transactions (parent_id);
create index meal_tx_student_idx on meal_transactions (student_id);

-- 家長餘額（衍生視圖，前端 getAllBalances 可改查這裡）
create view parent_balances as
  select parent_id, coalesce(sum(amount), 0)::numeric(10,2) as balance
  from meal_transactions
  group by parent_id;

-- ─────────────────────── 寒暑假學費 ───────────────────────
create table tuition_rates (
  month_key        text primary key,            -- 'YYYY-MM'
  absent_threshold int not null default 7,      -- 請假超過此天數改按日計費
  full_flat        numeric(10,2),
  full_flat_meal   numeric(10,2),
  full_daily       numeric(10,2),
  full_meal_daily  numeric(10,2),
  half_flat        numeric(10,2),
  half_flat_meal   numeric(10,2),
  half_daily       numeric(10,2),
  half_meal_daily  numeric(10,2),
  created_at       timestamptz default now()
);

create table tuition_enrollments (
  month_key  text not null,
  student_id text not null references students(id),
  class_type text not null check (class_type in ('full','half','none')),
  with_meal  boolean not null default false,
  primary key (month_key, student_id)
);

-- 預計上課安排（月初預收用）。calendar 為 null 時前端會用 total/absent 還原。
create table tuition_attendance (
  month_key   text not null,
  student_id  text not null references students(id),
  total_days  int not null default 0,
  absent_days int not null default 0,
  calendar    jsonb,                            -- { "<day>": "present|absent|none" }
  primary key (month_key, student_id)
);

-- 實際簽到記錄（月底結算用）。
create table attendance_logs (
  month_key   text not null,
  student_id  text not null references students(id),
  total_days  int not null default 0,
  absent_days int not null default 0,
  calendar    jsonb,
  primary key (month_key, student_id)
);

-- ─────────────────────── 訊息系統 ───────────────────────
create table broadcast_templates (
  id         text primary key default gen_random_uuid()::text,
  name       text not null,
  content    text not null,
  created_at timestamptz default now()
);

create table broadcast_logs (
  id              text primary key default gen_random_uuid()::text,
  type            text not null,                -- 'expense' | 'general'
  sent_at         timestamptz not null default now(),
  recipient_count int not null default 0,
  records         jsonb not null default '[]',  -- [{ studentId, studentName, message }]
  created_at      timestamptz default now()
);

-- ════════════════════════════════════════════════════════════════
--  save_order RPC：一次寫入 orders + order_items 並算 total
--  前端 orderService.saveOrder 改呼叫：
--      supabase.rpc('save_order', { payload: orderData })
--  payload 形如：
--    { batchId, date, datetime, restaurantId, restaurantName,
--      studentId, studentName, grade, parentId,
--      items: [{ menuItemId, menuItemName, price, qty }] }
-- ════════════════════════════════════════════════════════════════
create or replace function save_order(payload jsonb)
returns text
language plpgsql
as $$
declare
  new_id        text := coalesce(payload->>'id', gen_random_uuid()::text);
  item          jsonb;
  computed_total numeric := 0;
begin
  insert into orders (id, batch_id, date, datetime, restaurant_id, restaurant_name,
                      student_id, student_name, grade, parent_id, total)
  values (
    new_id,
    payload->>'batchId',
    (payload->>'date')::date,
    nullif(payload->>'datetime','')::timestamptz,
    payload->>'restaurantId',
    payload->>'restaurantName',
    payload->>'studentId',
    payload->>'studentName',
    nullif(payload->>'grade','')::int,
    payload->>'parentId',
    0
  );

  for item in select * from jsonb_array_elements(payload->'items')
  loop
    insert into order_items (id, order_id, menu_item_id, menu_item_name, price, qty)
    values (
      coalesce(item->>'itemId', gen_random_uuid()::text),
      new_id,
      item->>'menuItemId',
      item->>'menuItemName',
      (item->>'price')::numeric,
      coalesce((item->>'qty')::int, 1)
    );
    computed_total := computed_total + (item->>'price')::numeric * coalesce((item->>'qty')::int, 1);
  end loop;

  update orders set total = computed_total where id = new_id;
  return new_id;
end;
$$;

-- ════════════════════════════════════════════════════════════════
--  Row Level Security
--  ⚠️ 目前前端用 anon key 且尚無登入機制，以下開放全表讀寫以利 demo。
--     正式上線務必改成依 auth.uid() / 角色限制（見 README）。
-- ════════════════════════════════════════════════════════════════
do $$
declare t text;
begin
  foreach t in array array[
    'parents','students','restaurants','menu_items','orders','order_items',
    'meal_transactions','tuition_rates','tuition_enrollments','tuition_attendance',
    'attendance_logs','broadcast_templates','broadcast_logs'
  ]
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists demo_all on %I;', t);
    execute format('create policy demo_all on %I for all using (true) with check (true);', t);
  end loop;
end $$;
