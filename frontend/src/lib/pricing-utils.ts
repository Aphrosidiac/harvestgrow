export function isLowMargin(sellPrice: number, cost: number, threshold = 30): boolean {
  if (sellPrice <= 0) return false
  return ((sellPrice - cost) / sellPrice) * 100 < threshold
}

export function slotLabel(slot: string): string {
  switch (slot) {
    case 'AFTERNOON': return 'Afternoon'
    case 'TOMORROW_MORNING': return 'Tomorrow Morning'
    case 'MORNING': return 'Morning'
    default: return slot
  }
}
