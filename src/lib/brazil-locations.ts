export const BRAZIL_STATES = [
  ["AC", "Acre"], ["AL", "Alagoas"], ["AP", "Amapá"], ["AM", "Amazonas"],
  ["BA", "Bahia"], ["CE", "Ceará"], ["DF", "Distrito Federal"], ["ES", "Espírito Santo"],
  ["GO", "Goiás"], ["MA", "Maranhão"], ["MT", "Mato Grosso"], ["MS", "Mato Grosso do Sul"],
  ["MG", "Minas Gerais"], ["PA", "Pará"], ["PB", "Paraíba"], ["PR", "Paraná"],
  ["PE", "Pernambuco"], ["PI", "Piauí"], ["RJ", "Rio de Janeiro"], ["RN", "Rio Grande do Norte"],
  ["RS", "Rio Grande do Sul"], ["RO", "Rondônia"], ["RR", "Roraima"], ["SC", "Santa Catarina"],
  ["SP", "São Paulo"], ["SE", "Sergipe"], ["TO", "Tocantins"],
] as const;

export interface BrazilMunicipality {
  id: number;
  nome: string;
}

export const MUNICIPALITIES_ERROR_MESSAGE = "Não foi possível carregar os municípios agora.";
export const IBGE_MUNICIPALITIES_ENDPOINT = "https://servicodados.ibge.gov.br/api/v1/localidades/estados";
const MUNICIPALITIES_FALLBACK_PATH = "/data/ibge-municipalities-2024.json";

interface MunicipalitiesFallback {
  source: string;
  referenceDate: string;
  municipalities: Record<string, BrazilMunicipality[]>;
}

function validMunicipalities(value: unknown): value is BrazilMunicipality[] {
  return Array.isArray(value) && value.every((item) => item && typeof item === "object"
    && Number.isInteger((item as BrazilMunicipality).id)
    && typeof (item as BrazilMunicipality).nome === "string");
}

export async function fetchBrazilMunicipalities(
  stateCode: string,
  signal?: AbortSignal,
  request: typeof fetch = fetch,
  timeoutMs = 8_000,
): Promise<BrazilMunicipality[]> {
  const normalizedState = stateCode.trim().toUpperCase();
  const controller = new AbortController();
  const forwardAbort = () => controller.abort(signal?.reason);
  signal?.addEventListener("abort", forwardAbort, { once: true });
  const timeout = globalThis.setTimeout(() => controller.abort(new DOMException("Request timed out", "TimeoutError")), timeoutMs);
  try {
    try {
      const response = await request(`${IBGE_MUNICIPALITIES_ENDPOINT}/${encodeURIComponent(normalizedState)}/municipios?orderBy=nome`, { signal: controller.signal });
      const contentType = response.headers.get("content-type") ?? "";
      if (!response.ok || !contentType.toLowerCase().includes("application/json")) throw new Error("Invalid IBGE response");
      const municipalities: unknown = await response.json();
      if (!validMunicipalities(municipalities)) throw new Error("Invalid IBGE payload");
      return municipalities;
    } catch (error) {
      if (signal?.aborted) throw error;
      const fallbackResponse = await request(MUNICIPALITIES_FALLBACK_PATH, { signal });
      if (!fallbackResponse.ok) throw new Error("Municipality fallback unavailable");
      const fallback = await fallbackResponse.json() as MunicipalitiesFallback;
      const municipalities = fallback.municipalities?.[normalizedState];
      if (!validMunicipalities(municipalities)) throw new Error("Invalid municipality fallback");
      return municipalities;
    }
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error(MUNICIPALITIES_ERROR_MESSAGE, { cause: error });
  } finally {
    globalThis.clearTimeout(timeout);
    signal?.removeEventListener("abort", forwardAbort);
  }
}
