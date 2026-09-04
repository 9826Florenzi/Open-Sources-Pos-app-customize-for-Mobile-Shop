/**
 * Format any SQLite or ISO date-time string to Vietnamese locale format.
 * Since SQLite stores local Vietnam time (UTC+7) in 'YYYY-MM-DD HH:MM:SS',
 * we extract and format it cleanly without unwanted timezone conversion drifts.
 */
export function formatDateTime(val: any, includeSeconds = true): string {
  if (!val) return '—'
  if (typeof val === 'string') {
    const cleanStr = val.replace('T', ' ')
    const match = cleanStr.match(/^(\d{4})-(\d{2})-(\d{2})[ ]+(\d{2}):(\d{2})(?::(\d{2}))?/)
    if (match) {
      const [_, year, month, day, hour, min, sec] = match
      const timePart = includeSeconds && sec ? `${hour}:${min}:${sec}` : `${hour}:${min}`
      return `${timePart} ${day}/${month}/${year}`
    }
  }
  const d = new Date(val)
  if (isNaN(d.getTime())) return String(val)
  return d.toLocaleString('vi-VN')
}

export function formatDateOnly(val: any): string {
  if (!val) return '—'
  if (typeof val === 'string') {
    const match = val.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      const [_, year, month, day] = match
      return `${day}/${month}/${year}`
    }
  }
  const d = new Date(val)
  if (isNaN(d.getTime())) return String(val)
  return d.toLocaleDateString('vi-VN')
}
