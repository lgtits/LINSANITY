// 本地時間日期工具
// 注意：不要用 new Date().toISOString().slice(0,10)，那是 UTC，在 UTC+8 的早上會少一天。

const pad = n => String(n).padStart(2, '0')

// 本地日期字串 YYYY-MM-DD
export function localDate(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// 本地日期時間字串 YYYY-MM-DD HH:mm
export function localDateTime(d = new Date()) {
  return `${localDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
