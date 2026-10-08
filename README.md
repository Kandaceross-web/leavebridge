# LeaveBridge Health

Telehealth mental-health leave assessment platform: screening, secure intake, independent clinician determination,
signed documentation and secure delivery, for a $279.99 self-pay assessment. Payment covers an assessment, never an
outcome.

> **Not ready for real patients.** `npm run release:check` lists what must be decided first (legal, clinical, owner,
> state rules, security). All data in this repository is fictional.

## Quick start

```bash
cp .env.example .env          # fictional local values
npm ci
npm run db:reset              # migrate + seed fictional data (needs Postgres 16 roles, see docs/DATABASE.md)
npm run dev                   # http://localhost:3000
```

Sign in as `patient@leavebridge.test` or a staff account (`admin@`, `director@`, `clinician@`, `support@`, `billing@`,
`compliance@leavebridge.test`) with password `Fictional-Dev-Pass-1`. Staff need a TOTP code from
`JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP`.

## Checks

```bash
npm run lint && npm run typecheck && npm test && npm run build
npm run test:e2e              # Playwright + axe at 360px and desktop
npm run release:check         # production gate; fails while decisions are open
```

## Docs

| Doc | |
| --- | --- |
| [BUILDPLAN](docs/BUILDPLAN.md) | Audit, reconciliation, plan, phase log |
| [ARCHITECTURE](docs/ARCHITECTURE.md) | Layers, request lifecycle, surfaces |
| [SECURITY](docs/SECURITY.md) | PHI boundaries and controls |
| [COMPLIANCE](docs/COMPLIANCE.md) | What code enforces vs. what needs people |
| [OPEN-DECISIONS](docs/OPEN-DECISIONS.md) | Every unresolved decision, with safe defaults |
| [DATABASE](docs/DATABASE.md) | Roles, migrations, RLS, entities |
| [ENVIRONMENT](docs/ENVIRONMENT.md) | Variables and environments |
| [INTEGRATIONS](docs/INTEGRATIONS.md) | Vendors and adapters |
| [DEPLOYMENT](docs/DEPLOYMENT.md) | Docker, AWS reference, jobs, pipeline |
| [TESTING](docs/TESTING.md) | Test suites |
| [UI-CONVENTIONS](docs/UI-CONVENTIONS.md) | How pages and forms are built |
| [KNOWN-LIMITATIONS](docs/KNOWN-LIMITATIONS.md) | What is not done |
| [ROADMAP](docs/ROADMAP.md) | Next work, Phase 2 notes |
