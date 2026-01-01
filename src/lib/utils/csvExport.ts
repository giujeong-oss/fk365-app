// CSV Export Utility

export interface CsvColumn<T> {
  header: string;
  accessor: keyof T | ((row: T) => string | number | boolean | null | undefined);
}

/**
 * Export data to CSV format and trigger download
 */
export function exportToCsv<T extends object>(
  data: T[],
  columns: CsvColumn<T>[],
  filename: string
): void {
  if (data.length === 0) {
    alert('내보낼 데이터가 없습니다.');
    return;
  }

  // Build header row
  const headers = columns.map((col) => escapeCSVField(col.header));

  // Build data rows
  const rows = data.map((row) => {
    return columns.map((col) => {
      let value: unknown;
      if (typeof col.accessor === 'function') {
        value = col.accessor(row);
      } else {
        value = row[col.accessor];
      }
      return escapeCSVField(String(value ?? ''));
    });
  });

  // Combine into CSV string with BOM for Excel UTF-8 compatibility
  const BOM = '\uFEFF';
  const csvContent = BOM + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  // Trigger download
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
}

/**
 * Export data to Excel-compatible format (CSV with Excel-friendly encoding)
 */
export function exportToExcel<T extends object>(
  data: T[],
  columns: CsvColumn<T>[],
  filename: string
): void {
  // Use the same CSV export but with .xlsx filename hint
  const excelFilename = filename.endsWith('.csv')
    ? filename.replace('.csv', '.csv')
    : filename + '.csv';
  exportToCsv(data, columns, excelFilename);
}

/**
 * Escape CSV field to handle commas, quotes, and newlines
 */
function escapeCSVField(field: string): string {
  // If the field contains comma, quote, or newline, wrap it in quotes
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    // Escape existing quotes by doubling them
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Trigger file download in browser
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Format date for filename (YYYYMMDD)
 */
export function getDateForFilename(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}
