/**
 * Convert a 2D array of values into a CSV string with proper escaping.
 * Wraps every cell in double quotes and escapes inner double quotes.
 */
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = cell === null || cell === undefined ? "" : String(cell);
          // Escape any embedded double quotes
          const escaped = value.replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(","),
    )
    .join("\n");
}

/**
 * Trigger a browser download of CSV content.
 * Filename is automatically appended with today's date if not present.
 */
export function downloadCsv(filename: string, csv: string) {
  // Prepend BOM so Excel opens UTF-8 cleanly
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeName = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.download = safeName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revoke so download has time to start
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/** Convenience: build + download in one call. */
export function exportRowsToCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
) {
  const csv = toCsv([headers, ...rows]);
  const dated = filename.replace(/\.csv$/i, "") + `-${new Date().toISOString().split("T")[0]}.csv`;
  downloadCsv(dated, csv);
}
