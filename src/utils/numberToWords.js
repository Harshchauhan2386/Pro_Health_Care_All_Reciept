const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
]

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
]

// Converts a 0-999 integer into words.
function threeDigitsToWords(num) {
  let str = ''
  if (num >= 100) {
    str += `${ONES[Math.floor(num / 100)]} Hundred`
    num %= 100
    if (num > 0) str += ' '
  }
  if (num >= 20) {
    str += TENS[Math.floor(num / 10)]
    if (num % 10 > 0) str += ` ${ONES[num % 10]}`
  } else if (num > 0) {
    str += ONES[num]
  }
  return str
}

// Converts a non-negative integer (rupees, no paise) into words using the
// Indian numbering system (Lakh / Crore grouping).
export function numberToIndianWords(num) {
  num = Math.floor(Math.abs(num))

  if (num === 0) return 'Zero'

  const crore = Math.floor(num / 10000000)
  num %= 10000000
  const lakh = Math.floor(num / 100000)
  num %= 100000
  const thousand = Math.floor(num / 1000)
  num %= 1000
  const hundred = num

  const parts = []
  if (crore > 0) parts.push(`${threeDigitsToWords(crore)} Crore`)
  if (lakh > 0) parts.push(`${threeDigitsToWords(lakh)} Lakh`)
  if (thousand > 0) parts.push(`${threeDigitsToWords(thousand)} Thousand`)
  if (hundred > 0) parts.push(threeDigitsToWords(hundred))

  return parts.join(' ').trim()
}

// Converts a rupee amount (number, may include paise) into the receipt's
// "Amount in Words" phrasing, e.g. "Four Hundred Fifty Rupees Only".
export function amountToWords(amount) {
  const safeAmount = Number.isFinite(amount) ? amount : 0
  const rupees = Math.floor(Math.abs(safeAmount))
  const paise = Math.round((Math.abs(safeAmount) - rupees) * 100)

  let words = `${numberToIndianWords(rupees)} Rupees`
  if (paise > 0) {
    words += ` and ${numberToIndianWords(paise)} Paise`
  }
  words += ' Only'
  return words
}
