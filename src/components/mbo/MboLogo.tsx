import { useId } from "react";
import styles from "./mbo-logo.module.css";

export default function MboLogo({ compact = false }: { compact?: boolean }) {
  const gradient = useId();
  return <div className={`${styles.logo} ${compact ? styles.compact : ""}`}>
    <svg viewBox="0 0 336 140" width="264" height="110" role="img" aria-label="MBO — o O é um pin de mapa com uma estrela">
      <defs><linearGradient id={gradient} gradientUnits="userSpaceOnUse" x1="0" y1="18" x2="0" y2="122"><stop offset="0" stopColor="#ffb3ff" /><stop offset=".55" stopColor="#e052e0" /><stop offset="1" stopColor="#a62fc9" /></linearGradient></defs>
      <g fill="none" stroke={`url(#${gradient})`} strokeWidth="22" strokeLinecap="round" strokeLinejoin="round"><path d="M23 111V29L64 84L105 29V111" /><path d="M145 29V111M145 29H180a19 19 0 0 1 0 38H145M145 67H188a22 22 0 0 1 0 44H145" /></g>
      <path fill={`url(#${gradient})`} fillRule="evenodd" d="M252.1 88.5A42 42 0 1 1 313.9 88.5L283 122Z M283 39a21 21 0 1 0 0 42a21 21 0 1 0 0-42Z" />
      <path fill="#ffe3ff" d="M283 45L287 56L298 60L287 64L283 75L279 64L268 60L279 56Z" />
    </svg>
    {!compact && <span>MAPA DOS BENEFÍCIOS OCULTOS</span>}
  </div>;
}
