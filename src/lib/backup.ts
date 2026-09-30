/** Descarga `blob` como archivo en el dispositivo del usuario. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Descarga `content` como archivo JSON. */
export const downloadJson = (content: string, filename: string) =>
  downloadBlob(new Blob([content], { type: "application/json" }), filename);

export const backupFilename = (date = new Date()) => `sueldo-resi-${date.toISOString().slice(0, 10)}.json`;
