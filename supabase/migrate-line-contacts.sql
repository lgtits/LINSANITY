-- ════════════════════════════════════════════════════════════════
--  LINE 聯絡人表（webhook 蒐集 userId → 後台綁定家長）
--  已建表的資料庫執行這支即可。
-- ════════════════════════════════════════════════════════════════
create table if not exists line_contacts (
  user_id          text primary key,
  display_name     text default '',
  picture_url      text default '',
  last_message     text,
  linked_parent_id text references parents(id) on delete set null,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index if not exists line_contacts_linked_idx on line_contacts (linked_parent_id);

alter table line_contacts enable row level security;
drop policy if exists demo_all on line_contacts;
create policy demo_all on line_contacts for all using (true) with check (true);
