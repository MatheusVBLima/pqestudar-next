# MBO Partners: isolated staging provisioning plan

Prepared 2026-10-12. Not provisioned yet.

Update 2026-10-16: the user deferred staging and authorized a controlled test using the existing real environment. Local server restarted on port 3000. Payment configuration reports live mode with return URL on the public site. This does not authorize a charge or establish webhook success. Tracking was still disabled at the initial check; the user was directed to enable it through the authenticated admin UI so the change is audited normally. Positive capture, order attribution and any payment must be verified separately. No new cloud resource was created.

Decision on 2026-10-13: the user authorizes provisioning only with no additional cost. Do not create a paid project, change a plan or enable paid branching. CLI organization commands expose list/create but no billing/quota inspection; no authenticated browser tab is currently available. Confirm the Free plan and available project quota in the Supabase dashboard before provisioning. The existing production connection remains unchanged.

## Verified constraints

- No Docker or Podman executable was found on this Windows host; the standard Docker Desktop executable path is also absent.
- Supabase CLI access works. Organization `pqestudar` (`isnwffysbemoybgooemr`) contains the existing production project `omkxiomwzbykmqttfozi`.
- No dedicated staging project was listed. The separate VisUau project belongs to a different product and must not be reused.
- The organization's billing plan and available free quota have not been established. Creating a cloud project could add charges; do not create it before resolving the cost decision.

## Proposed cloud resource

- Name: `pqestudar-mbo-staging`.
- Organization: `pqestudar`.
- Region: `us-east-2`, matching the existing project.
- Separate database, Auth users, API keys and referral secret.
- Fresh random database password stored only in an ignored local environment file; never printed or sent in chat.
- No production user, order, referral or financial data copy.
- No production Mercado Pago, Stripe, email or analytics credentials.
- Synthetic test accounts using staging Auth, with explicit affiliate A/B, buyer and admin roles confined to staging.

## Provisioning sequence after cost decision

1. Create the separate project using its explicit organization and region. Keep the repository's existing linked project unchanged.
2. Export and inspect schema-only dependencies; do not blindly apply the 52 divergent local migration entries. Include the real authorization, subscription and payment dependencies required by Partners and the application.
3. Install the two Partners migrations against the explicit staging project reference, verifying the target before each mutation.
4. Create an isolated application checkout/configuration and separate build directory. Do not edit or reuse production-connected .env.local. Start on 127.0.0.1:3100 with staging-only environment variables.
5. Keep outbound payment and email credentials absent. Configure staging Auth login and matching callback URLs; do not create a second authentication implementation.
6. Enable referrals only in staging. Exercise consent denied/accepted/revoked, valid and invalid codes, last valid click, immutable order attribution and self-purchase exclusion.
7. Treat real provider payment and net reconciliation as a separate validation, requiring supported test credentials and verified provider responses. Browser mocks are not payment evidence.

Alternative without a cloud project: install/configure Docker Desktop and run a dedicated local Supabase stack. This requires system installation and may require virtualization setup or a restart; it is not available in the current host state.
