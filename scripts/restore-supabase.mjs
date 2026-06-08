// 還原：把某個備份資料夾的 JSON 寫回 Supabase（依外鍵安全順序 upsert）
// 用法：node scripts/restore-supabase.mjs backups/backup-2026-06-08-13-00-00
import { readFileSync, existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = {}
for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').replace(/^﻿/, '').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim()
}
const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

const folder = process.argv[2]
if (!folder) { console.error('請指定備份資料夾：node scripts/restore-supabase.mjs backups/backup-...'); process.exit(1) }

// 依外鍵相依：父表先、子表後。複合主鍵的表用 onConflict 指定。
const TABLES = [
  ['parents', 'id'],
  ['students', 'id'],
  ['restaurants', 'id'],
  ['menu_items', 'id'],
  ['orders', 'id'],
  ['order_items', 'id'],
  ['meal_transactions', 'id'],
  ['tuition_rates', 'month_key'],
  ['tuition_enrollments', 'month_key,student_id'],
  ['tuition_attendance', 'month_key,student_id'],
  ['attendance_logs', 'month_key,student_id'],
  ['broadcast_templates', 'id'],
  ['broadcast_logs', 'id'],
]

let total = 0
for (const [t, onConflict] of TABLES) {
  const path = new URL(`../${folder}/${t}.json`, import.meta.url)
  if (!existsSync(path)) { console.log(`  ${t}: （無檔案，略過）`); continue }
  const rows = JSON.parse(readFileSync(path, 'utf8'))
  if (!rows.length) { console.log(`  ${t}: 0 筆`); continue }
  const { error } = await sb.from(t).upsert(rows, { onConflict })
  if (error) { console.error(`  ❌ ${t}: ${error.message}`); process.exit(1) }
  total += rows.length
  console.log(`  ${t}: ${rows.length} 筆`)
}
console.log(`\n✅ 還原完成，共寫入 ${total} 筆`)
