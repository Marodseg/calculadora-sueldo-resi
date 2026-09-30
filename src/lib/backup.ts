/** Descarga `content` como archivo JSON en el dispositivo del usuario. */
export function downloadJson(content: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export const backupFilename = (date = new Date()) => `sueldo-resi-${date.toISOString().slice(0, 10)}.json`;
