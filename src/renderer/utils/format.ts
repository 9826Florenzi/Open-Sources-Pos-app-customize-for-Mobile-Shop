export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('vi-VN').format(amount || 0) + 'đ'
}
