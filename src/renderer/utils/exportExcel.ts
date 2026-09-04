import * as XLSX from 'xlsx'

export function exportToExcel(data: any[], fileName: string, sheetName = 'Sheet1') {
  try {
    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
    XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`)
    return true
  } catch (e) {
    console.error('Export Excel error:', e)
    return false
  }
}
