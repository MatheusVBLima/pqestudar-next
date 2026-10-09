import { Barcode, CreditCard } from "lucide-react";
import styles from "./payment-methods.module.css";

export default function PaymentMethods() {
  return <ul className={styles.methods} aria-label="Formas de pagamento no Mercado Pago">
    <li><CreditCard aria-hidden="true" /><span>Cartão</span></li>
    <li><Barcode aria-hidden="true" /><span>Boleto</span></li>
    <li><CreditCard aria-hidden="true" /><span>Débito virtual<small>CAIXA</small></span></li>
    <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true"><path d="m9 3 2-2a1.5 1.5 0 0 1 2 0l2 2 2 2h-2l-3 3-3-3H7zM7 19h2l3-3 3 3h2l-4 4a1.5 1.5 0 0 1-2 0zM5 7h3l4 4 4-4h3l4 4a1.5 1.5 0 0 1 0 2l-4 4h-3l-4-4-4 4H5l-4-4a1.5 1.5 0 0 1 0-2z" /></svg><span>Pix</span></li>
  </ul>;
}
