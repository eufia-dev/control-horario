# Legal Consent API Contract

## Scope

This contract defines the backend endpoints required by frontend legal enforcement in `control_horario`.

- Frontend repo: this project (`SvelteKit`)
- Backend service: external API (currently deployed on Railway, migration target Hetzner)
- Auth model: JWT bearer via Supabase

## Document Types

Allowed `documentType` values:

- `TERMS`
- `PRIVACY`
- `COOKIES`
- `AVISO_LEGAL`
- `DPA`

Allowed `source` values:

- `REGISTER`
- `ONBOARDING_CREATE_COMPANY`
- `RECONSENT`

## Endpoint: POST /legal/consents/accept

Registers one or more legal consent acceptances for the authenticated user.

### Request body

```json
{
	"source": "RECONSENT",
	"consents": [
		{
			"documentType": "TERMS",
			"version": "v1.0"
		},
		{
			"documentType": "PRIVACY",
			"version": "v1.0"
		}
	]
}
```

### Required backend behavior

- Validate JWT and resolve authenticated `userId`
- Resolve active profile/company context from `X-Profile-Id` when available
- Capture server timestamp (`acceptedAt`)
- Capture request metadata:
  - `ipAddress` (from trusted proxy headers/server request)
  - `userAgent`
- Store append-only audit rows (no hard updates)
- Return `204 No Content` or `200` with confirmation payload

### Error cases

- `400` invalid document type/version
- `401` unauthenticated
- `422` malformed consent array
- `500` unexpected persistence failure

## Endpoint: GET /legal/consents/me

Returns accepted legal versions for the authenticated user.

### Response body

```json
{
	"consents": [
		{
			"documentType": "TERMS",
			"version": "v1.0",
			"acceptedAt": "2026-02-15T11:00:00.000Z",
			"source": "REGISTER",
			"ipAddress": "203.0.113.10",
			"userAgent": "Mozilla/5.0"
		}
	]
}
```

## Endpoint: GET /legal/documents/current

Returns the currently active legal versions, including which documents are mandatory for app access.

### Response body

```json
{
	"documents": [
		{
			"documentType": "TERMS",
			"version": "v1.0",
			"required": true
		},
		{
			"documentType": "PRIVACY",
			"version": "v1.0",
			"required": true
		},
		{
			"documentType": "DPA",
			"version": "v1.0",
			"required": false
		}
	]
}
```

## Persistence model (minimum)

Table: `legal_consent_events`

- `id` (uuid, pk)
- `user_id` (uuid, indexed)
- `profile_id` (uuid, nullable, indexed)
- `company_id` (uuid, nullable, indexed)
- `document_type` (text/enum, indexed)
- `version` (text)
- `source` (text/enum)
- `accepted_at` (timestamptz, indexed)
- `ip_address` (inet/text, nullable)
- `user_agent` (text, nullable)
- `created_at` (timestamptz default now)

Recommended uniqueness guard:

- Unique key on (`user_id`, `document_type`, `version`) if duplicate writes should be deduplicated.
- If full audit trail of repeated acceptances is required, do not apply this unique key.

## Reconsent enforcement logic

Backend/frontend compatibility requirement:

1. Frontend fetches `/legal/documents/current`
2. Frontend fetches `/legal/consents/me`
3. If any `required: true` document/version is missing, frontend redirects to `/legal/consent`
4. Frontend sends acceptance to `/legal/consents/accept`

## Security and audit requirements

- Keep legal events for evidentiary purposes (do not mutate historical records)
- Ensure logs are timezone-safe (`UTC ISO8601`)
- Include consent version in every event
- Protect endpoints under authenticated context
- Restrict write endpoint rate if needed
