import { supabase } from "@/integrations/supabase/client";

export const GUIDE_IMAGES_BUCKET = "guide-images";

export function createGuideInternalCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return `G-${Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("")}`;
}

function imageExtension(file: File): string {
  const byMime: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
  };
  return byMime[file.type] || file.name.split(".").pop()?.toLowerCase() || "png";
}

export async function uploadGuideImage(
  file: File,
  internalCode: string,
  kind: "cover" | "content" = "content",
): Promise<{ path: string; publicUrl: string }> {
  const extension = imageExtension(file);
  let basename = "capa";

  if (kind === "content") {
    const { data, error } = await supabase.storage.from(GUIDE_IMAGES_BUCKET).list(internalCode, {
      limit: 1000,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw error;
    const highest = (data ?? []).reduce((max, item) => {
      const match = item.name.match(/^(\d+)\.[a-z0-9]+$/i);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    basename = String(highest + 1);
  }

  const path = `${internalCode}/${basename}.${extension}`;
  const { error } = await supabase.storage.from(GUIDE_IMAGES_BUCKET).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: kind === "cover",
  });
  if (error) throw error;

  const { data } = supabase.storage.from(GUIDE_IMAGES_BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}
