export const CURRENCIES = {
  INR: { symbol: '₹', code: 'INR', name: 'Indian Rupee',       locale: 'en-IN' },
  USD: { symbol: '$', code: 'USD', name: 'US Dollar',           locale: 'en-US' },
  EUR: { symbol: '€', code: 'EUR', name: 'Euro',                locale: 'en-DE' },
  GBP: { symbol: '£', code: 'GBP', name: 'British Pound',      locale: 'en-GB' },
  SGD: { symbol: 'S$', code: 'SGD', name: 'Singapore Dollar',  locale: 'en-SG' },
  AED: { symbol: 'AED ', code: 'AED', name: 'UAE Dirham',      locale: 'en-AE' },
  THB: { symbol: '฿', code: 'THB', name: 'Thai Baht',          locale: 'th-TH' },
  JPY: { symbol: '¥', code: 'JPY', name: 'Japanese Yen',       locale: 'ja-JP' },
}

export function formatAmount(amount, currencyCode = 'INR') {
  const cur = CURRENCIES[currencyCode] ?? CURRENCIES.INR
  const decimals = currencyCode === 'JPY' ? 0 : 2
  const formatted = Number(amount).toLocaleString(cur.locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return `${cur.symbol}${formatted}`
}
