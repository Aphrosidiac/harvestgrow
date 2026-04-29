export function fmtDate(d: string): string {
  try { return new Date(d).toLocaleDateString('en-MY') } catch { return d }
}

export function fmtDateShort(d: string): string {
  try { return new Date(d).toISOString().slice(0, 10) } catch { return d }
}

export function fmtDateDMY(d: string): string {
  const date = new Date(d)
  const dd = String(date.getUTCDate()).padStart(2, '0')
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = date.getUTCFullYear()
  return `${dd}-${mm}-${yyyy}`
}

export function fmtDateTime(d: string): string {
  try { return new Date(d).toLocaleString('en-MY') } catch { return d }
}

export function fmtDateLong(d: string): string {
  try { return new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return d }
}

export function fmtTime(d: string): string {
  try { return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) } catch { return d }
}
