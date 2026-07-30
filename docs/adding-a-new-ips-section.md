# How to add a new IPS section

This is the checklist for wiring up a brand-new `IPSSections` value end-to-end —
e.g. if HL7 adds a new IPS section, or you need a b.well-specific one. Skipping any
step below leaves the section either invisible (never renders) or half-wired
(throws at runtime).

Use the existing **Medical Devices** section as your reference implementation while
following these steps — see
[`medical-device-data-summary.md`](./medical-device-data-summary.md) for a fully
narrated walkthrough of how it works.

## 1. Register the section enum value

`src/structures/ips_sections.ts`

```ts
export enum IPSSections {
    // ...
    MY_NEW_SECTION = 'MyNewSection',
}
```

The string value becomes the `CompositionSection.title`/`code.text` fallback and the
key used everywhere else below — pick something matching the IPS spec's section name.

## 2. Add its LOINC code + display title

`src/structures/ips_section_loinc_codes.ts` — add entries to both
`IPS_SECTION_LOINC_CODES` and `IPS_SECTION_DISPLAY_NAMES` keyed by your new enum
value. Get the LOINC code from the
[HL7 IPS implementation guide](http://hl7.org/fhir/uv/ips/) section list.

## 3. Decide mandatory vs. recommended vs. optional

- **Mandatory** (must always appear, even with no data): add to
  `IPSMandatorySections` in `src/structures/ips_mandatory_sections.ts`, and add a
  "no data available" placeholder string to `IPSMissingMandatorySectionContent`.
  Only Patient/Problems/Allergies/Medications are mandatory today per the IPS spec —
  don't add here unless the spec genuinely requires it.
- **Recommended**: add to `IPSRecommendedSections` in
  `src/structures/ips_recommended_sections.ts` (informational grouping only — this
  enum isn't consumed by the builder pipeline itself).
- **Optional**: no registration needed beyond steps 1–2; the section simply won't
  render if there are no matching resources.

## 4. Map it to FHIR resource types + a filter predicate

`src/structures/ips_section_resource_map.ts`:

1. Add an entry to `IPSSectionResourcesMap` listing every FHIR resource type your
   section can consume (used by `getRemainingResourcesFromCompositionBundle` to
   report what's missing from a bundle).
2. Add a predicate to `IPSSectionResourceFilters` — this is what actually decides,
   for every resource in the input bundle, whether it belongs to your section
   (e.g. status checks, `category`/`code` LOINC or SNOMED matching — see
   `codingMatches`/`codeableConceptMatches` helpers already in that file).
3. *(Optional)* If your section should support the "summary composition" fast path
   (see [ARCHITECTURE.md](./ARCHITECTURE.md#two-data-source-modes-per-section-raw-resources-vs-summary-compositions)),
   add a matching predicate to `IPSSectionSummaryCompositionFilter` too. Most
   sections don't need this on day one.

## 5. Write the narrative template

Create `src/narratives/templates/typescript/MyNewSectionTemplate.ts` implementing
`ISummaryTemplate` (`src/narratives/templates/typescript/interfaces/ITemplate.ts`):

```ts
export class MyNewSectionTemplate implements ISummaryTemplate {
  generateNarrative(resources: TDomainResource[], timezone: string | undefined): string | undefined {
    // build and return an HTML <table> string, or `undefined` if there's nothing to show
  }
  generateSummaryNarrative(resources: TComposition[], timezone: string | undefined): string | undefined {
    // only needs a real implementation if you wired up step 4.3
  }
}
```

Reuse `TemplateUtilities` (`src/narratives/templates/typescript/TemplateUtilities.ts`)
for anything involving: resolving a `Reference` to another resource in the bundle,
formatting dates/times with a timezone, rendering `CodeableConcept`s, HTML-escaping
free text, or reading the b.well "owner" tag off `meta.security`. Don't reinvent
these — every existing template uses this class.

Return `undefined` (not an empty string) when there's nothing to render — the
builder treats that as "skip this section" (see step 6 below).

## 6. Register the template

`src/narratives/templates/typescript/TypeScriptTemplateMapper.ts` — import your
template and add it to the `sectionToTemplate` map, keyed by your new
`IPSSections` value. **This is the step that's easy to forget**, but since the map
is typed `Record<IPSSections, ITemplate>` (exhaustive over the enum), skipping it
is caught at **compile time** — `npm run typecheck` fails with a `TS2741:
Property '[IPSSections.X]' is missing in type ...` error. The `No template found
for section: ...` runtime throw in `generateNarrative` is a defensive fallback
that's unreachable for any genuine enum value; don't rely on it as the failure
signal.

## 7. Document the section

Add a section to [`sections.md`](../sections.md) (LOINC code, source FHIR
resource(s), filter, data-table fields) so the section list stays a complete,
accurate reference — this file is hand-maintained, not generated.

## 8. Add tests

- Unit test the resource filter and template in isolation (see
  `tests/generators/fhir_summary_generator_edge.test.ts` and
  `tests/narrativeGenerator/narrativeGenerator.test.ts` for patterns).
- Add/extend a fixture bundle under `tests/fhir-summary-bundle/fixtures/` and assert
  against an `expected-summary-bundle*.json` (see
  `tests/fhir-summary-bundle/fhir-summary-bundle.test.ts`) so a regression in the
  full pipeline gets caught.
- If relevant, exercise `getRemainingResourcesFromCompositionBundle` to confirm your
  new resource types are correctly reported as missing when absent.

## Common mistakes

- Forgetting step 6 (`TypeScriptTemplateMapper` registration) — caught at
  **compile time** (`npm run typecheck` fails with a `TS2741` "missing property"
  error), since `sectionToTemplate` is typed `Record<IPSSections, ITemplate>`.
- Returning `''` instead of `undefined` from `generateNarrative` — an empty string
  is truthy-checked differently in places and can produce an empty-but-present
  section instead of omitting it.
- Adding a resource type to `IPSSectionResourcesMap` (step 4.1) without also adding
  it to the filter predicate (step 4.2) — the resource type will be reported as
  "expected" but never actually matched/included.
