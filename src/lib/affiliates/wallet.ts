export const payoutLabels: Record<string, string> = { requested: 'Solicitado', reviewing: 'Em análise', approved: 'Aprovado', processing: 'Processando', paid: 'Pago', rejected: 'Rejeitado', failed: 'Falhou' };
export const ledgerLabels: Record<string, string> = { release: 'Comissão liberada', reserve: 'Reserva para saque', unreserve: 'Reserva devolvida', payment: 'Pagamento confirmado', reversal: 'Estorno de comissão' };
export const walletMoney = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
// Parse decimal text without binary floating point multiplication.
export function parseWalletAmount(value: string): number | null {
  const match = /^(\d{1,7})(?:[,.](\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] || '').padEnd(2, '0'));
}
export type Payout = { id: string; amount_cents: number; pix_mask: string; status: string; created_at: string; version: number; display_name?: string };
export type WalletData = { approved: boolean; available_cents: number; reserved_cents: number; pending_cents: number; paid_cents: number; unreconciled: number; minimum_cents: number; security_days: number; total: number; payout_total: number; payouts: Payout[]; entries: { id: string; kind: string; available_delta: number; reserved_delta: number; paid_delta: number; created_at: string }[]; configured: boolean };
export type FinanceData = { minimum_cents: number; security_days: number; total: number; items: Payout[]; eligible: { id: string; commission_cents: number }[]; recoveries: { profile_id: string; display_name: string; debt_cents: number }[] };
