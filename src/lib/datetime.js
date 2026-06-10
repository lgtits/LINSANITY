const pad = n => String(n).padStart(2, '0')

function toTW(d) {
  return new Date(d.getTime() + 8 * 60 * 60 * 1000)
}

// 本地日期字串 YYYY-MM-DD（台灣 UTC+8）
export function localDate(d = new Date()) {
  const tw = toTW(d)
  return `${tw.getUTCFullYear()}-${pad(tw.getUTCMonth() + 1)}-${pad(tw.getUTCDate())}`
}

// 本地日期時間字串 YYYY-MM-DD HH:mm+08:00（帶時區，存入 DB 時 PostgreSQL 正確辨識）
export function localDateTime(d = new Date()) {
  const tw = toTW(d)
  return `${localDate(d)} ${pad(tw.getUTCHours())}:${pad(tw.getUTCMinutes())}+08:00`
}

// DB timestamptz → 台灣時間 "YYYY-MM-DD HH:mm"
export function fmtDT(v) {
  if (!v) return ''
  const tw = toTW(new Date(String(v).replace(' ', 'T')))
  return `${tw.getUTCFullYear()}-${pad(tw.getUTCMonth() + 1)}-${pad(tw.getUTCDate())} ${pad(tw.getUTCHours())}:${pad(tw.getUTCMinutes())}`
}
