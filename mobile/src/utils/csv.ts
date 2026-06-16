import { Platform, Share } from 'react-native';

// Build a CSV string from a matrix of rows (each cell is stringified and quoted
// when it contains a comma, quote or newline).
export function toCsv(rows: (string | number)[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell ?? '');
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(','),
    )
    .join('\n');
}

// Export a CSV: on web triggers a file download; on native shares the content.
export async function exportCsv(filename: string, rows: (string | number)[][]): Promise<void> {
  const csv = toCsv(rows);

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  // Native: share the CSV text (works without extra native deps).
  await Share.share({ title: filename, message: csv });
}
