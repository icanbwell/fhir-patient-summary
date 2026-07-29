# src/

Source for `@icanbwell/fhirpatientsummary`. See
[`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) for how these pieces fit
together; short version:

| Directory | Contents |
|---|---|
| `generators/` | `ComprehensiveIPSCompositionBuilder` (orchestrates bundle → Composition → Bundle) and `NarrativeGenerator` (dispatches + minifies section HTML) |
| `structures/` | The `IPSSections` enum, LOINC codes/display names, mandatory/recommended section lists, and the per-section FHIR resource type + filter mapping |
| `profiles/` | Per-resource-type required/recommended field profiles and a `validateResource` helper |
| `narratives/templates/typescript/` | One HTML-table-rendering template class per IPS section, plus `TemplateUtilities` (shared formatting/reference-resolution helpers) |
| `types/` | Hand-maintained FHIR R4 TypeScript types (`resources/`, `partials/`, `simpleTypes/`) |
| `constants.ts` | Misc lookup tables (e.g. lab test name → LOINC codes) |
| `index.ts` | Public package entry point / exports |
