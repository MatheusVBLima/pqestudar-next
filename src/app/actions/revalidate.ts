"use server";

import { revalidateTag } from "next/cache";
import { PRODUCTS_TAG } from "@/lib/data/products";
import { OPORTUNIDADES_TAG, oportunidadeSlugTag } from "@/lib/data/oportunidades";
import { TOOLS_TAG, toolSlugTag } from "@/lib/data/tools";
import { pageSettingsTag } from "@/lib/data/page-settings";
import { LEGAL_TAG, legalRouteTag } from "@/lib/data/legal";
import { GUIDES_TAG, guideSlugTag } from "@/lib/data/guides";
import { CURATIONS_TAG, curationSlugTag } from "@/lib/data/curations";

export async function revalidateProductsAction(): Promise<void> {
  revalidateTag(PRODUCTS_TAG, "max");
}

export async function revalidateOportunidadesAction(slug?: string): Promise<void> {
  revalidateTag(OPORTUNIDADES_TAG, "max");
  if (slug) {
    revalidateTag(oportunidadeSlugTag(slug), "max");
  }
}

export async function revalidateToolsAction(slug?: string): Promise<void> {
  revalidateTag(TOOLS_TAG, "max");
  if (slug) {
    revalidateTag(toolSlugTag(slug), "max");
  }
}

export async function revalidatePageSettingsAction(route: string): Promise<void> {
  revalidateTag("page_settings", "max");
  revalidateTag(pageSettingsTag(route), "max");
}

export async function revalidateLegalAction(route: string): Promise<void> {
  revalidateTag(LEGAL_TAG, "max");
  revalidateTag(legalRouteTag(route), "max");
}

export async function revalidateGuidesAction(slug?: string): Promise<void> {
  revalidateTag(GUIDES_TAG, "max");
  if (slug) {
    revalidateTag(guideSlugTag(slug), "max");
  }
}

export async function revalidateCurationsAction(slug?: string): Promise<void> {
  revalidateTag(CURATIONS_TAG, "max");
  if (slug) {
    revalidateTag(curationSlugTag(slug), "max");
  }
}
