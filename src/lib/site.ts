export const SITE_URL = "https://www.pqestudar.com.br";
export const DEFAULT_SOCIAL_IMAGE_URL = `${SITE_URL}/opengraph-image`;
export const DEFAULT_SOCIAL_IMAGE_ALT =
  "Aprenda, organize e evolua com as ferramentas certas - PqEstudar";

export function absoluteSiteUrl(path = "/"): string {
  if (!path || path === "/") return SITE_URL;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
