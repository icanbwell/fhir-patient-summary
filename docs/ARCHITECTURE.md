# Architecture

## What this library does

`@icanbwell/fhirpatientsummary` turns a set of FHIR clinical resources (or a whole
FHIR `Bundle`) into an **International Patient Summary (IPS)** — a single FHIR
`Composition` (and the `document`-type `Bundle` that wraps it) with one section per
IPS topic (Problems, Allergies, Medications, Vital Signs, …), each section carrying
both a human-readable HTML narrative and machine-readable `entry` references back to
the source resources.

See [`sections.md`](../sections.md) for what data each IPS section contains, and
[`medical-device-data-summary.md`](./medical-device-data-summary.md) for a fully
worked example of one section's algorithm end-to-end.

## The pipeline, top to bottom

```
FHIR Bundle / raw resource arrays
        │
        ▼
ComprehensiveIPSCompositionBuilder      (src/generators/fhir_summary_generator.ts)
  - readBundleAsync()   → filters bundle resources per section
  - makeSectionAsync()  → per-section: pick resources, build narrative, add section
        │
        ▼
IPSSectionResourceHelper                (src/structures/ips_section_resource_map.ts)
  - which FHIR resource types belong to a section
  - the filter predicate (status checks, category/LOINC checks, etc.)
        │
        ▼
NarrativeGenerator                      (src/generators/narrative_generator.ts)
  - dispatches to the right template, minifies HTML, wraps as FHIR Narrative
        │
        ▼
TypeScriptTemplateMapper                (src/narratives/templates/typescript/)
  - one template class per IPSSection, each implementing ISummaryTemplate
  - template renders an HTML table from the section's resources
        │
        ▼
CompositionSection + entry[] references → assembled into Composition → Bundle
```

Two ways to drive the builder (see `README.md` for code samples):

- **Fluent / manual**: call `.setPatient(...)` then `.makeSectionAsync(sectionType, resources, timezone)`
  once per section you want, then `.buildBundleAsync(...)`.
- **`read_bundle` / `readBundleAsync`**: hand it a whole FHIR `Bundle` and it walks
  every `IPSSections` value, filters the bundle for that section's resources, and
  builds all applicable sections automatically.

## Key modules

| Concern | File(s) |
|---|---|
| Section enum (the canonical list of IPS sections this library supports) | `src/structures/ips_sections.ts` |
| Which FHIR resource types + filter predicate belong to each section | `src/structures/ips_section_resource_map.ts` |
| LOINC code + display title per section | `src/structures/ips_section_loinc_codes.ts` |
| Which sections are IPS-mandatory, and their "no data" placeholder text | `src/structures/ips_mandatory_sections.ts` |
| Which sections are IPS-recommended (informational grouping only) | `src/structures/ips_recommended_sections.ts` |
| Per-resource-type "required/recommended field" profiles + a `validateResource` helper | `src/profiles/ips_resource_profile_registry.ts` |
| Builder: orchestrates the whole bundle → Composition → Bundle flow | `src/generators/fhir_summary_generator.ts` |
| Narrative generation entry point + HTML minification | `src/generators/narrative_generator.ts` |
| One HTML-table-rendering template class per section | `src/narratives/templates/typescript/*Template.ts` |
| Shared rendering/formatting helpers used by every template (date formatting, reference resolution, HTML escaping, CodeableConcept display, …) | `src/narratives/templates/typescript/TemplateUtilities.ts` |
| Maps `IPSSections` → template instance | `src/narratives/templates/typescript/TypeScriptTemplateMapper.ts` |
| Template interfaces (`ITemplate`, `ISummaryTemplate`) | `src/narratives/templates/typescript/interfaces/ITemplate.ts` |
| FHIR R4 resource/partial/simple TypeScript types (`TPatient`, `TObservation`, …) | `src/types/resources/`, `src/types/partials/`, `src/types/simpleTypes/` |
| Lab-test-name → LOINC code lookup used for grouping lab panels | `src/constants.ts` (`LAB_LOINC_MAP`) |
| Debug/dev utility: renders a generated IPS `Bundle` as Markdown (used for eyeballing output, e.g. `tests_integration/production_record/`) | `src/generators/IPSBundleToMarkdown.ts` (`ipsBundleToMarkdown`) |
| Per-resource-type required/recommended field profiles + `validateResource` — **not called by the generation pipeline**, only exercised from tests today | `src/profiles/ips_resource_profile_registry.ts` |
| Public package entry point (what consumers of the npm package can import) | `src/index.ts` |

## Two data-source modes per section: raw resources vs. "summary compositions"

Every section can be built two ways, chosen automatically by
`readBundleAsync`/`IPSSectionResourceHelper.getSummaryCompositionFilterForSection`:

1. **Raw resources** (default): filter the bundle for the section's FHIR resource
   types (e.g. `Condition` for Problems), render each one as a table row.
2. **Summary composition** (opt-in via the `SUMMARY_COMPOSITION_SECTIONS` env var):
   if the bundle contains a pre-aggregated FHIR `Composition` tagged with a known
   "summary type" code (see `IPSSectionSummaryCompositionFilter` in
   `ips_section_resource_map.ts`), that composition's own `section[]` entries are
   used as the data source instead — see `ComprehensiveIPSCompositionBuilder.makeSectionFromSummaryAsync`
   and each template's `generateSummaryNarrative()` method.

**Not every section has a summary-composition filter wired up** — check
`IPSSectionSummaryCompositionFilter` before assuming a section supports this mode
(Medical Devices, for instance, currently does not; see
[`medical-device-data-summary.md`](./medical-device-data-summary.md)).

## Types are hand-authored, not currently regenerated

`src/types/` contains ~680 files modeling FHIR R4 resources/partials/simple types
(`// This file is auto-generated by generate_types so do not edit manually`).
The `Makefile` has a `generate_types` target that shells out to a Python script at
`src/generator/generate_types.py` — **that script/directory does not exist in this
repo**. Treat the types as effectively hand-maintained until that tooling is
restored; don't assume `make generate_types` works.

## Things that look load-bearing but aren't

- **`docker-compose.yml` / `Dockerfile` / the `up`/`down` Makefile targets** describe
  a React app (`REACT_APP_*` env vars, `yarn start`, port 5051) — this is leftover
  boilerplate from the npm-package template this repo was bootstrapped from
  (`package.json`'s `description` still says *"A template for creating npm packages
  using TypeScript and VSCode"*). This library has no server/UI component; ignore
  these files for day-to-day development.
- **`myPackage` in `src/index.ts`** is the same template's placeholder export,
  unrelated to IPS generation. The library's actual public API is just
  `ComprehensiveIPSCompositionBuilder` and `NarrativeGenerator` — everything else in
  `src/` (including `ipsBundleToMarkdown` and `IPSResourceProfileRegistry`, both of
  which exist and are tested) is internal-only unless you add it to `src/index.ts`.
- **`IPSResourceProfileRegistry.validateResource`** looks like a validation gate but
  isn't wired into `ComprehensiveIPSCompositionBuilder` anywhere — resources aren't
  checked against IPS profiles as part of building a summary. It's currently only
  invoked from `tests/ips-test/` and `tests/profiles/`.
- **`semantic-release` config in `package.json`** has no CI workflow that invokes it
  (only `node-ci.yml` for PR checks and `npm-publish.yml`, which publishes to npm when
  a GitHub Release is *manually* published). Don't assume merging to `main` triggers
  an automatic release.
