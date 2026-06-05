const thaiShortMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

export const formatThaiDateLabel = (value: string) => {
  const date = new Date(`${value}T00:00:00`)
  if (!Number.isFinite(date.getTime())) {
    return `วันที่ ${value}`
  }

  return `วันที่ ${date.getDate()} ${thaiShortMonths[date.getMonth()]} ${date.getFullYear() + 543}`
}
