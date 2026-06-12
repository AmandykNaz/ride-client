const currencyFormatter = new Intl.NumberFormat('ru-KZ', {
  style: 'currency',
  currency: 'KZT',
  maximumFractionDigits: 0,
})

export function formatKzt(amount: number) {
  return currencyFormatter.format(amount)
}

export function formatRoute(from: string, to: string) {
  return `${from} → ${to}`
}
