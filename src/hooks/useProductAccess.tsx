import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

export type ProductAccess = {
  productKey: string;
  hasAccess: boolean;
  purchaseId: string | null;
  status: string | null;
  reason?: string;
};

const PRODUCT_ACCESS_CACHE = {
  staleTime: 2 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
  refetchOnWindowFocus: false,
  retry: 0,
} as const;

export function useProductAccess(productKey: "certificado-que-conta") {
  const { user, loading: authLoading } = useAuth();

  const accessQuery = useQuery({
    queryKey: ["product-access", productKey, user?.id ?? "anon"],
    queryFn: async (): Promise<ProductAccess> => {
      const response = await fetch(`/api/products/access?productKey=${encodeURIComponent(productKey)}`, {
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok && response.status !== 401) {
        throw new Error(data?.reason || "product_access_error");
      }

      return {
        productKey,
        hasAccess: Boolean(data?.hasAccess),
        purchaseId: data?.purchaseId ?? null,
        status: data?.status ?? null,
        reason: data?.reason,
      };
    },
    enabled: !!user && !authLoading,
    ...PRODUCT_ACCESS_CACHE,
  });

  return {
    hasAccess: Boolean(accessQuery.data?.hasAccess),
    access: accessQuery.data ?? null,
    loading: authLoading || accessQuery.isLoading,
    error: accessQuery.error ? "Erro ao verificar acesso ao produto" : null,
    refetch: accessQuery.refetch,
  };
}
