# SCHOLARSETU demo accounts

These accounts are enabled only when `ENVIRONMENT=development`. They are simulated records and do not represent official scholarship decisions or documents.

## Accounts

| Role | Email | Demo-only password |
|---|---|---|
| Student | `student.demo@example.com` | `AnanyaDemo!2026` |
| Government Officer | `officer.demo@example.com` | `RahulDemo!2026` |

## Login through the existing API

```bash
curl -X POST http://localhost:8000/api/v1/auth/demo-login \
  -H 'Content-Type: application/json' \
  -d '{"email":"student.demo@example.com","role":"student","password":"AnanyaDemo!2026"}'
```

The response contains `access_token`. Use it as a bearer token for the Student portal APIs. For the officer flow, use `officer.demo@example.com` with `"role":"official"`. The backend rejects a demo account used with the wrong portal role.

For the current frontend development setup, the existing API client reads `scholarsetu.token` from browser local storage. Set it to the returned token, then open `/student/dashboard` or `/official/dashboard`.

## Seed data

From `backend/` run:

```bash
../.venv/bin/python seed_dev_data.py
```

The seed is idempotent and only creates/updates the fixed demo identities and their clearly marked demo fixtures. It does not delete or modify unrelated users, applications, documents, or schemes.

Ananya has:

- One `submitted` application awaiting review.
- One incomplete `draft` application.
- One `action_required` application with a simulated correction request.
- Two scholarship records with no application yet.
- Four stored PDFs per complete demo application, marked `DEMO — NOT AN OFFICIAL DOCUMENT`, processed through the real Poppler/Tesseract pipeline.

Rahul can inspect the submitted/action-required applications, preview/download documents, request corrections, approve, or reject through the existing Official APIs.
