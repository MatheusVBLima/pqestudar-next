import fs from 'node:fs';

const file = '.env.local';
const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const defaults = {
  MERCADO_PAGO_MODE: 'test',
  MERCADO_PAGO_ACCESS_TOKEN: '',
  MERCADO_PAGO_WEBHOOK_SECRET: '',
  MERCADO_PAGO_SELLER_ID: '3689326936',
  MERCADO_PAGO_SITE_URL: 'https://www.pqestudar.com.br',
};
const missing = Object.entries(defaults).filter(([key]) => !new RegExp(`^${key}=`, 'm').test(existing));
if (missing.length) fs.appendFileSync(file, '\n# Mercado Pago Checkout Pro / Orders — preencher segredos localmente\n'
  + missing.map(([key, value]) => `${key}=${value}`).join('\n') + '\n');
console.log(`Prepared ${missing.length} missing settings in .env.local. Existing values preserved; no secrets printed.`);
