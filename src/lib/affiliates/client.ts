export async function partnersRequest<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, { method: body ? 'POST' : 'GET', cache: 'no-store',
    headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Não foi possível concluir. Tente novamente.');
  return data;
}
