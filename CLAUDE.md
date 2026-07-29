# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

`@icanbwell/fhirpatientsummary` (npm package) turns FHIR clinical resources (or a
whole FHIR `Bundle`) into an **International Patient Summary (IPS)** — a single
FHIR `Composition` (wrapped in a `document`-type `Bundle`) with one section per IPS
topic (Problems, Allergies, Medications, Vital Signs, …), each carrying a
human-readable HTML narrative and machine-readable `entry` references back to the
source resources.

Read these docs before making non-trivial changes — this file intentionally does
not repeat them:

1. [`README.md`](./README.md) — public usage examples (fluent API vs. `read_bundle`)
2. [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — the full pipeline, key module table, and known gotchas
3. [`sections.md`](./sections.md) — what data each IPS section contains (LOINC codes, source resources, filters, fields)
4. [`docs/adding-a-new-ips-section.md`](./docs/adding-a-new-ips-section.md) — checklist for wiring up a new section (several places to register it; missing one fails silently or throws at runtime)
5. [`docs/medical-device-data-summary.md`](./docs/medical-device-data-summary.md) — one section's algorithm narrated end-to-end, as a concrete worked example
6. [`CONTRIBUTING.md`](./CONTRIBUTING.md) — setup, everyday commands, git hooks, commit conventions, CI/release

## Commands

```bash
nvm use && npm install     # Node >=18, CI/repo pinned to 24.11.0 via .nvmrc

npm run lint                # ESLint over src/ + tests/, auto-fixing
npm run typecheck            # tsc --noEmit
npm test                     # unit suite (tests/), with coverage; excludes tests_integration/
npm test -- path/to/file.test.ts            # single test file
npm test -- -t "test name substring"        # single test by name
npm run test:watch           # jest --watch
npm run test:integration     # tests_integration/ (hits real fixture data — see tests_integration/production_record/readme.md)
npm run build                 # tsup -> dist/ (cjs+esm+.d.ts), then verifies CJS/ESM/TS import all work
```

Run `npm run lint && npm run typecheck && npm test` before treating anything as
done — this is exactly what CI (`node-ci.yml`) runs on every push/PR to `main`.

`make lint` runs the same lint+typecheck under the pinned Node version if you need
that. Ignore `Dockerfile`, `docker-compose.yml`, and the `up`/`down` Makefile
targets — leftover boilerplate from the npm-package template this repo was
bootstrapped from (describes an unrelated React app); this library has no
server/UI component.

## Architecture (short version — see docs/ARCHITECTURE.md for the full version)

```
FHIR Bundle / raw resource arrays
        │
        ▼
ComprehensiveIPSCompositionBuilder      src/generators/fhir_summary_generator.ts
  - readBundleAsync()   → filters bundle resources per section
  - makeSectionAsync()  → per-section: pick resources, build narrative, add section
        │
        ▼
IPSSectionResourceHelper                src/structures/ips_section_resource_map.ts
  - which FHIR resource types belong to a section + the filter predicate
        │
        ▼
NarrativeGenerator                      src/generators/narrative_generator.ts
  - dispatches to the right template, minifies HTML, wraps as FHIR Narrative
        │
        ▼
TypeScriptTemplateMapper                src/narratives/templates/typescript/
  - one template class per IPSSection, each rendering an HTML table
        │
        ▼
CompositionSection + entry[] references → assembled into Composition → Bundle
```

Every section can be built from **raw resources** (default: filter the bundle by
FHIR resource type, render each as a table row) or, opt-in via the
`SUMMARY_COMPOSITION_SECTIONS` env var, from a pre-aggregated **summary
composition** already present in the bundle. Not every section has a
summary-composition filter wired up (`IPSSectionSummaryCompositionFilter` in
`ips_section_resource_map.ts`) — check before assuming a section supports it.

Adding a new `IPSSections` value touches at minimum: `ips_sections.ts` (enum),
`ips_section_loinc_codes.ts` (LOINC + display name), `ips_section_resource_map.ts`
(resource types + filter predicate), a new template class implementing
`ISummaryTemplate`, and `TypeScriptTemplateMapper.ts` (registration — **easy to
forget**, throws `No template found for section: ...` at runtime, not
compile-time). Full checklist: `docs/adding-a-new-ips-section.md`.

## Non-obvious things worth knowing

- **Public API surface is much smaller than `src/`.** `src/index.ts` only exports
  `ComprehensiveIPSCompositionBuilder` and `NarrativeGenerator` (plus a leftover
  `myPackage` stub from the template this repo was bootstrapped from). Utilities
  like `ipsBundleToMarkdown` (`src/generators/IPSBundleToMarkdown.ts`) and
  `IPSResourceProfileRegistry` (`src/profiles/ips_resource_profile_registry.ts`)
  exist, are tested, but are **not** exported from the package root — consumers
  and future code must import them by internal path.
- **`IPSResourceProfileRegistry.validateResource` is not called anywhere in the
  generation pipeline today** — it's only exercised from tests
  (`tests/ips-test/`, `tests/profiles/`). Don't assume resources are validated
  against IPS profiles at runtime; this registry is available tooling, not an
  enforced gate.
- **FHIR types under `src/types/` are hand-maintained, not generated**, despite
  the `// auto-generated by generate_types` header on every file — the
  `generate_types` Makefile target shells out to a Python script that doesn't
  exist in this repo. If a resource is missing a field, edit the type file
  directly under `src/types/resources/` or `src/types/partials/`.
- **`semantic-release` config in `package.json` is unused.** No workflow invokes
  it; `npm-publish.yml` only publishes when a GitHub Release is manually
  published. Merging to `main` does not release a new version.
- Husky + `lint-staged` auto-fix staged `.ts`/`.js` under `src/**`/`test/**` on
  every commit (`npm run prepare`, wired via `.husky/pre-commit`). A rejected
  commit means lint-staged found something it couldn't auto-fix.
