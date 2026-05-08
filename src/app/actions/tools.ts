"use server";

import { revalidateTag } from "next/cache";
import { invokeAdminFunction, requireAdmin, type ActionResult } from "@/app/actions/_shared";
import { TOOLS_TAG } from "@/lib/data/tools";

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message === "NOT_AUTHENTICATED") return "Sessão expirada. Faça login novamente.";
    if (error.message === "FORBIDDEN") return "Acesso restrito a administradores.";
    return error.message;
  }
  return "Erro inesperado";
}

export async function createToolAction(
  data: Record<string, unknown>,
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const payload = await invokeAdminFunction<
      { action: "create"; data: Record<string, unknown> },
      unknown
    >("admin-tools", { action: "create", data });
    revalidateTag(TOOLS_TAG, "max");
    return { data: payload, error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function updateToolAction(
  data: Record<string, unknown>,
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const payload = await invokeAdminFunction<
      { action: "update"; data: Record<string, unknown> },
      unknown
    >("admin-tools", { action: "update", data });
    revalidateTag(TOOLS_TAG, "max");
    return { data: payload, error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function deleteToolAction(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const payload = await invokeAdminFunction<
      { action: "delete"; data: { id: string } },
      unknown
    >("admin-tools", { action: "delete", data: { id } });
    revalidateTag(TOOLS_TAG, "max");
    return { data: payload, error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function reorderToolsAction(
  tools: Array<{ id: string; sort_order: number }>,
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const payload = await invokeAdminFunction<
      { action: "reorder"; data: { tools: Array<{ id: string; sort_order: number }> } },
      unknown
    >("admin-tools", { action: "reorder", data: { tools } });
    revalidateTag(TOOLS_TAG, "max");
    return { data: payload, error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}
