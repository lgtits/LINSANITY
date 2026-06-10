// 備份：把 Supabase 所有表 dump 成 JSON，存到 backups/backup-<時間>/
// 用法：node scripts/backup-supabase.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

let supabaseUrl = process.env.VITE_SUPABASE_URL
let supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
if (!supabaseUrl) {
  const env = {}
  for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').replace(/^﻿/, '').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim()
  }
  supabaseUrl = env.VITE_SUPABASE_URL
  supabaseKey = env.VITE_SUPABASE_ANON_KEY
}
const sb = createClient(supabaseUrl, supabaseKey)

const TABLES = [
  'parents', 'students', 'restaurants', 'menu_items', 'orders', 'order_items',
  'meal_transactions', 'tuition_rates', 'tuition_enrollments', 'tuition_attendance',
  'attendance_logs', 'broadcast_templates', 'broadcast_logs', 'line_contacts',
]

// 分頁抓全部（PostgREST 單次上限 1000）
async function fetchAll(table) {
  const out = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select('*').range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...data)
    if (data.length < 1000) break
  }
  return out
}

const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19)
const dir = new URL(`../backups/backup-${stamp}/`, import.meta.url)
mkdirSync(dir, { recursive: true })

let total = 0
for (const t of TABLES) {
  const rows = await fetchAll(t)
  writeFileSync(new URL(`${t}.json`, dir), JSON.stringify(rows, null, 2), 'utf8')
  total += rows.length
  console.log(`  ${t}: ${rows.length} 筆`)
}
console.log(`\n✅ 備份完成，共 ${total} 筆 → backups/backup-${stamp}/`)
