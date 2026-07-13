export function triggerBrowserDownload(url: string, filename?: string | null) {
  const link = document.createElement("a");
  link.href = url;

  if (!url.startsWith("blob:")) {
    link.rel = "noopener";
    link.target = "_blank";
  }

  // Browsers may ignore `download` for cross-origin URLs, but keeping it here
  // preserves same-origin filename behavior without blocking normal navigation.
  if (filename) {
    link.download = filename;
  }

  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function triggerBlobDownload(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  triggerBrowserDownload(objectUrl, filename);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
