export type AffiliateStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type AffiliateProfile = {
  id: string; user_id: string; display_name: string; status: AffiliateStatus;
  code: string | null; level_id: string; version: number; created_at: string; updated_at: string;
};
export type AffiliateLevel = { id: string; name: string; minimum_sales: number; commission_bps: number };
export type AffiliateDashboard = {
  profile: AffiliateProfile | null;
  application: { channel: string; status: string; decision_reason: string | null; created_at: string } | null;
  levels: AffiliateLevel[]; tracking_enabled: boolean; finance_enabled: boolean; can_demo?: boolean;
};
export type AffiliateAdminList = {
  total: number; items: (AffiliateProfile & { channel: string; decision_reason: string | null;
    history: { id: string; actor_id: string; action: string; reason: string | null; previous_status: string | null; next_status: AffiliateStatus; created_at: string }[];
  })[];
};
export const statusLabels: Record<AffiliateStatus, string> = {
  pending: 'Em análise', approved: 'Aprovado', rejected: 'Não aprovado', suspended: 'Suspenso',
};
