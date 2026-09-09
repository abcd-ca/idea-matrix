/** Hand the viewer a generated text file through the browser's download flow. */
export function downloadText(filename: string, text: string, mime = "text/plain"): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** A file name from the matrix's name: letters and digits in any script stay, punctuation goes. */
export function safeFileStem(name: string, fallback = "ideas"): string {
  const stem = name
    .replace(/[^\p{L}\p{N}_\- ]+/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
  return stem || fallback;
}
