export interface ProductDocumentUrls {
  viewerUrl: string;
  downloadUrl: string;
}

export function getProductDocumentUrls(url: string | null | undefined): ProductDocumentUrls | null {
  if (!url) return null;
  const value = url.trim();
  const driveMatch = /drive\.google\.com/i.test(value)
    ? (value.match(/drive\.google\.com\/file\/d\/([^/]+)/i) ?? value.match(/[?&]id=([^&]+)/i))
    : null;

  if (driveMatch?.[1]) {
    const id = driveMatch[1];
    return {
      viewerUrl: `https://drive.google.com/file/d/${id}/preview`,
      downloadUrl: `https://drive.google.com/uc?export=download&id=${id}`,
    };
  }

  const cleanPath = value.split(/[?#]/)[0].toLowerCase();
  if (cleanPath.endsWith('.pdf')) return { viewerUrl: value, downloadUrl: value };
  return null;
}
