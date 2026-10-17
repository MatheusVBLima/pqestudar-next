import fs from 'node:fs';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const file='.env.local';
execFileSync('git',['check-ignore','--quiet',file]);
const source=fs.readFileSync(file,'utf8');
if(/^AFFILIATE_PIX_ENCRYPTION_KEY=/m.test(source)) {
 console.log('Existing wallet encryption configuration preserved. No secret printed.');
} else {
 fs.appendFileSync(file,'\n# MBO Partners: preserve this key; required to decrypt existing payout keys.\nAFFILIATE_PIX_ENCRYPTION_KEY='+randomBytes(32).toString('hex')+'\n');
 console.log('Wallet encryption key generated in ignored .env.local. No secret printed.');
}
