# Legal Compliance QA Checklist

## Public legal pages

- [ ] `/legal/privacy` loads without authentication
- [ ] `/legal/cookies` loads without authentication
- [ ] `/legal/terms` loads without authentication
- [ ] `/legal/aviso-legal` loads without authentication
- [ ] `/legal/dpa` loads without authentication
- [ ] Footer legal links are visible and resolve correctly
- [ ] Sitemap includes all public legal routes

## Registration and onboarding consent

- [ ] Register blocks submission until Terms + Privacy + Cookies acknowledgement are checked
- [ ] Register stores pending consent batch for post-confirmation sync
- [ ] Auth callback attempts to flush pending legal consents after sign-in
- [ ] Create company blocks submission until Terms + DPA are checked
- [ ] Create company attempts consent sync and logs warning on temporary backend failure

## Reconsent guard

- [ ] Active authenticated users are redirected to `/legal/consent` when required versions are missing
- [ ] Users with up-to-date required consents are not redirected
- [ ] `/legal/consent` allows accepting all required docs and returns to app home
- [ ] Consent refresh event invalidates layout cache

## Backend contract alignment

- [ ] Backend implements `POST /legal/consents/accept`
- [ ] Backend implements `GET /legal/consents/me`
- [ ] Backend implements `GET /legal/documents/current`
- [ ] Backend captures `acceptedAt`, `ipAddress`, and `userAgent`
- [ ] Backend stores versioned, auditable consent events

## Legal content validation (business/legal review)

- [ ] Company legal details are accurate (name, CIF, address, registry, contact)
- [ ] Subprocessor list is updated (Vercel, Google Workspace/Gmail, Supabase, Railway/Hetzner status)
- [ ] Cookies policy matches real technical cookie usage
- [ ] Terms include Spanish law + Palma jurisdiction with mandatory consumer exceptions
- [ ] DPA clauses reviewed by legal counsel before production publication
