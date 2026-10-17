# MBO Partners: migration audit

Initial read-only check on 2026-10-12. Installation later the same day is recorded below.

- Linked CLI project and the application URL both identify `omkxiomwzbykmqttfozi`.
- `bunx supabase migration list --linked` returned 141 remote entries: 7 matched local versions and 134 remote-only versions. There were 52 local-only entries.
- Latest recorded remote version: `20260913000100`.
- Neither `20261011000100_affiliate_membership.sql` nor `20261011000200_affiliate_attribution.sql` is recorded remotely.
- Local duplicate version prefixes: `20260828000200` and `20260828000400`, each used by two files.
- Earlier same-day API checks returned PGRST202 for `affiliate_admin_list(p_page,p_status)` and `affiliate_tracking_settings()`.
- Earlier table HEAD requests returned 204 for `affiliate_profiles` and `affiliate_settings`. This does not establish schema compatibility or complete installation.

Migration history is not proof of the current schema: changes may have been applied outside the CLI. Before applying Partners migrations, inspect actual columns, constraints, functions and grants, compare them with these two migrations and their payment dependencies, and prepare a targeted rollout. Do not blindly push all local-only files or mark them applied merely to align history.

## Targeted installation completed, 2026-10-12

Direct inspection of pg_class and pg_proc established that only the legacy affiliate_pages module existed before installation. The earlier HTTP HEAD 204 responses were inconclusive and did not establish table existence. The two payment dependency signatures, bodies and required order columns matched the local payment migration; that existing payment migration was not reapplied or marked in history.

`node scripts/prepare-affiliate-rollout.mjs` generated a scoped transaction from the exact two Partners source migrations. It checks payment function body hashes, rejects an existing Partners installation, limits lock waiting to five seconds, checks permissions, and inserts both migration history records within the same transaction. A full ROLLBACK rehearsal succeeded before the COMMIT run. Only the two Partners migrations were installed; no unrelated history was repaired.

Verified after commit:

- Both versions are present in supabase_migrations.schema_migrations.
- All 13 new tables have RLS enabled. Legacy affiliate_pages remains present.
- Under authenticated SQL role with the previously verified support account identity, affiliate_is_admin returned true; affiliate_admin_list returned zero requests; affiliate_tracking_settings returned tracking disabled and 30-day attribution/security periods. The dashboard returned the four configured levels.
- Anonymous HTTP calls now return permission denied (42501), rather than missing function (PGRST202).
- Existing payment function bodies remained unchanged, checked inside the installation transaction.
- Local membership SQL, attribution SQL and membership API suites passed again.
- The user refreshed the real admin page and confirmed it loaded without errors.

The SQL role checks exercise hosted database authorization; the user separately confirmed the admin browser page. Other real-session lifecycle scenarios remain pending. No affiliate application, payment, referral, payout or role assignment was created. Tracking remains disabled. Real payment net reconciliation, financial wallet and payouts remain pending as described in phase 3.

## Hosted membership lifecycle rehearsal, 2026-10-12

Executed `supabase/tests/affiliate-membership-hosted.sql` through the linked database query command. The script selects two verified ordinary identities with no affiliate profile, uses the authenticated SQL role and transaction-local identity settings, and always rolls back. It does not sign in as those users, change their roles or leave test records.

Passed: pending application, idempotent resubmission, denial of self approval and ordinary admin access, cross-account profile/application isolation, owner dashboard, administrative approval, stale decision rejection, rejection reason visibility, code generation, zero initial sales, suspension, reactivation with unchanged code and four audit events. A separate query after rollback confirmed zero test profiles and applications, with tracking still disabled.

This expands validation from local PGlite to the actual hosted functions and RLS. It does not prove browser authentication, cookie handling, HTTP mutations or simultaneous transactions. A real ordinary-account browser application and admin approval remain the next acceptance check.

The user subsequently supplied screenshots showing the actual application in the admin list, approval with a reason, and the ordinary account's approved dashboard at Inicial (25%). This confirms that browser membership path through the locally running application and hosted database.

## Hosted attribution rehearsal, 2026-10-12

Executed `supabase/tests/affiliate-attribution-hosted.sql` successfully against the linked database. It temporarily enables tracking only within its uncommitted transaction and uses an existing approved affiliate and a different verified buyer. There are no provider calls. All prepared internal orders and referrals are rolled back.

Passed: valid capture, rejection of invalid code, immutable original referral on repeated order preparation, permanent absence of attribution on an initially unattributed order, self-purchase exclusion, revoked/expired token exclusion, and exactly one awaiting-payment commission with no invented net value. A post-rollback query confirmed zero example.test test orders, zero referrals and zero attributions, with public tracking still disabled.

The mocked referral HTTP/consent suite and Mercado Pago regression suite also passed. These are not real browser consent or provider transaction evidence. Local AFFILIATE_REFERRAL_SECRET was absent; trusted IP header was also unconfigured. Before real browser referral testing, configure the server secret and verify the deployment's trusted ingress (do not trust arbitrary forwarded headers). No public tracking activation or purchase was performed. Real net settlement adapter, browser referral-to-checkout integration and genuine signed payment remain outstanding.

## Local secret configured, 2026-10-12

Generated a fresh 32-byte random server-only AFFILIATE_REFERRAL_SECRET in ignored .env.local without printing it. The running localhost server recognized the environment change. Real HTTP calls to its referral endpoint returned 200/accepted:false without a cookie while tracking was disabled, 400 for missing consent, and 403 for foreign origin. No secret was committed or installed in hosted deployment settings. Trusted IP header remains unset.

Localhost shares the linked hosted database: changing affiliate_settings.tracking_enabled would change the shared program setting. A positive browser capture test therefore needs an isolated database/environment if public tracking must remain disabled. Negative HTTP checks do not prove positive browser capture or checkout attribution.
