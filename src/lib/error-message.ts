export function getErrorMessage(error: unknown, fallback = "Erro inesperado") {
  if (error instanceof Error) return error.message;

  if (error && typeof error === "object") {
    const record = error as { message?: unknown; context?: { message?: unknown } };
    if (typeof record.context?.message === "string") return record.context.message;
    if (typeof record.message === "string") return record.message;
  }

  return fallback;
}
