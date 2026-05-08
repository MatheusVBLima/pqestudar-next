"use server";

import { revalidateTag } from "next/cache";
import { invokeAdminFunction, requireAdmin, type ActionResult } from "@/app/actions/_shared";
import { COURSES_TAG } from "@/lib/data/courses";

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message === "NOT_AUTHENTICATED") return "Sessão expirada. Faça login novamente.";
    if (error.message === "FORBIDDEN") return "Acesso restrito a administradores.";
    return error.message;
  }
  return "Erro inesperado";
}

export async function createCourseAction(
  data: Record<string, unknown>,
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const payload = await invokeAdminFunction<
      { action: "create"; data: Record<string, unknown> },
      unknown
    >("admin-courses", { action: "create", data });
    revalidateTag(COURSES_TAG, "max");
    return { data: payload, error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function updateCourseAction(
  data: Record<string, unknown>,
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const payload = await invokeAdminFunction<
      { action: "update"; data: Record<string, unknown> },
      unknown
    >("admin-courses", { action: "update", data });
    revalidateTag(COURSES_TAG, "max");
    return { data: payload, error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function deleteCourseAction(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const payload = await invokeAdminFunction<
      { action: "delete"; data: { id: string } },
      unknown
    >("admin-courses", { action: "delete", data: { id } });
    revalidateTag(COURSES_TAG, "max");
    return { data: payload, error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function hideCourseAction(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const payload = await invokeAdminFunction<
      { action: "hide"; data: { id: string } },
      unknown
    >("admin-courses", { action: "hide", data: { id } });
    revalidateTag(COURSES_TAG, "max");
    return { data: payload, error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}
