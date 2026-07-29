# tests/

Unit test suite, run via `npm test` (excludes `../tests_integration/`, which is run
separately via `npm run test:integration` and hits larger production-shaped fixture
bundles — see `../tests_integration/production_record/readme.md`).

| Directory | Covers |
|---|---|
| `fhir-summary-bundle/` | End-to-end: fixture `Bundle` in → expected summary `Bundle` out |
| `full_record/` | Larger fixture bundles (`fixtures/sandbox/`), including a `split_bundle.mjs` script to break a full record into per-resource-type fixture files |
| `generators/` | `ComprehensiveIPSCompositionBuilder`, `IPSBundleToMarkdown`, and edge cases for `fhir_summary_generator`/`narrative_generator` |
| `narrativeGenerator/` | Narrative/template HTML generation in isolation |
| `structures/` | `ips_section_resource_map` filter predicates |
| `profiles/` | `IPSResourceProfileRegistry` validation logic |
| `ips-test/` | IPS-spec-level conformance checks |
| `multi-patient/` | Behavior when a bundle contains more than one `Patient` |
| `build/` | Verifies the built `dist/` output is importable from CJS, ESM, and TypeScript consumers (run via `npm run check:*`, not `npm test`) |
| `utilities/` | Shared test helpers (`testHelpers.ts`) |

When adding a new IPS section (see
[`../docs/adding-a-new-ips-section.md`](../docs/adding-a-new-ips-section.md)), add
coverage in both `generators/` (resource filtering + section registration) and
`narrativeGenerator/` (template output), plus a fixture pair in
`fhir-summary-bundle/fixtures/` if you're testing the full pipeline.
