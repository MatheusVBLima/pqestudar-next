import { mercadoPagoConfig, verifyMercadoPagoSignature } from "@/lib/mercado-pago";
import { syncMercadoPagoOrder } from "@/lib/mercado-pago-fulfillment";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const config = mercadoPagoConfig();
    if (!verifyMercadoPagoSignature(request, config.secret)) return Response.json({ error: "invalid_signature" }, { status: 401 });
    const id = new URL(request.url).searchParams.get("data.id")!.toUpperCase();
    // Never trust payment status, amount, payer or environment from the notification body.
    await syncMercadoPagoOrder(id);
    return Response.json({ received: true });
  } catch {
    console.error("[mercado-pago] Webhook processing failed; event must be retried.");
    return Response.json({ error: "retry_later" }, { status: 503 });
  }
}
