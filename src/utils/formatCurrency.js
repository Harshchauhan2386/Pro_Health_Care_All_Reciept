// Formats a number using Indian digit grouping, e.g. 125000 -> "1,25,000.00"
export function formatCurrency(amount) {
  const safe = Number.isFinite(amount) ? amount : 0
  const fixed = safe.toFixed(2)
  const [intPart, decPart] = fixed.split('.')
  const isNegative = intPart.startsWith('-')
  const digits = isNegative ? intPart.slice(1) : intPart

  let formatted
  if (digits.length <= 3) {
    formatted = digits
  } else {
    const last3 = digits.slice(-3)
    const rest = digits.slice(0, -3)
    const restFormatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')
    formatted = `${restFormatted},${last3}`
  }

  return `${isNegative ? '-' : ''}${formatted}.${decPart}`
}
