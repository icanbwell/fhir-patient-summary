# Wearable Device Data Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new, optional IPS Composition section ("Wearable Device Data") that summarizes wearable-collected Observations (heart rate, steps, sleep, etc.) as per-metric aggregates (latest/average/min/max/count/date range) instead of one row per raw reading.

**Architecture:** Follows this repo's existing "add a new IPS section" checklist (`docs/adding-a-new-ips-section.md`): a new `IPSSections.WEARABLES` enum value, a resource filter that identifies wearable Observations by a `meta.security` vendor tag (`https://www.icanbwell.com/vendor` = `validic`), and a new `WearablesTemplate` that groups matching Observations by metric code and by the upstream `display-group` category coding, rendering one aggregated table row per metric. No new resource types, no hardcoded LOINC/SNOMED metric table — every field needed for display already lives on the Observation resource itself.

**Tech Stack:** TypeScript, Jest (`ts-jest`), existing `TemplateUtilities`/`ISummaryTemplate` template pattern.

**Spec:** `docs/superpowers/specs/2026-08-21-wearable-metrics-summary-design.md`

## Global Constraints

- No hardcoded LOINC/SNOMED metric code table in this repo — read `code.coding[0].display`, `valueQuantity.unit`, and the `display-group` category coding directly off each Observation (per spec's "Rendering — no hardcoded metric table needed").
- Wearable identification is vendor-tag-only: `meta.security` containing `{system: 'https://www.icanbwell.com/vendor', code: 'validic'}`. `WEARABLE_VENDOR_CODES` must be an array (`['validic']`), not a single string literal, so future vendors can be added without a filter rewrite.
- Section enum: `IPSSections.WEARABLES = 'WearableDeviceDataSection'`, display name `'Wearable Device Data'`, local code system `https://www.icanbwell.com/ips-section-codes`, code `wearables`.
- Section is **optional** — do not add it to `IPSMandatorySections` or `IPSRecommendedSections`. It must render as `undefined` (omitted entirely) when there are no matching Observations, matching every other section's behavior.
- Wearable Observations must be **excluded** from `VITAL_SIGNS` and `DIAGNOSTIC_REPORTS` (both filter on `observation-category` codes — `vital-signs` and `laboratory`/`Lab`/`LAB` respectively — that the wearable-ingestion pipeline also sets), so a wearable reading appears exactly once, aggregated, in the new Wearables section — never duplicated as a raw row elsewhere (see Task 3).
- No `generateSummaryNarrative` / summary-composition fast path in v1 — `WearablesTemplate` implements `ITemplate` only, not `ISummaryTemplate` (YAGNI; the summary-composition pipeline path never triggers for a section with no entry in `IPSSectionSummaryCompositionFilter`).
- Every existing section must keep resolving its `code.coding[0].system` to `'http://loinc.org'` exactly as before — the per-section code-system change is additive only.
- Run `npm run lint && npm run typecheck && npm test` before considering any task done (per `CLAUDE.md`).

---

### Task 1: Section enum + LOINC/vendor/category constants

**Files:**
- Modify: `src/structures/ips_sections.ts`
- Modify: `src/structures/ips_section_loinc_codes.ts`
- Modify: `src/structures/ips_section_resource_map.ts` (one line only — see Step 4a)
- Test: `tests/structures/ips_sections.test.ts` (new)

**Interfaces:**
- Produces: `IPSSections.WEARABLES`; `WEARABLE_VENDOR_SECURITY_SYSTEM: string`; `WEARABLE_VENDOR_CODES: string[]`; `DISPLAY_GROUP_CATEGORY_SYSTEM: string`; `IPS_SECTION_CODE_SYSTEMS: Partial<Record<IPSSections, string>>`; `IPS_SECTION_LOINC_CODES[IPSSections.WEARABLES] === 'wearables'`; `IPS_SECTION_DISPLAY_NAMES[IPSSections.WEARABLES] === 'Wearable Device Data'`; `IPSSectionResourcesMap[IPSSections.WEARABLES] === ['Observation']`. All consumed by later tasks.

**Note (added after Task 1's first two attempts were reviewed):** `IPSSectionResourcesMap` in `src/structures/ips_section_resource_map.ts` is typed `Record<IPSSections, string[]>` — exhaustive, not `Partial`. Adding `IPSSections.WEARABLES` to the enum therefore requires an entry in this map too, or `npm run typecheck` fails with a SECOND `TS2741` error (in addition to the expected one on `TypeScriptTemplateMapper`).

`IPSSectionResourceFilters` is typed `Partial<...>`, but do NOT treat that as license to skip an entry: `readBundleAsync` (`fhir_summary_generator.ts`) calls `IPSSectionResourceHelper.getResourceFilterForSection(sectionType)` and invokes the result unconditionally for every `IPSSections` value, with no undefined-guard — every one of the existing 14 `IPSSectionResourcesMap` entries has a corresponding `IPSSectionResourceFilters` entry, which is an established invariant of this codebase, not an optional nicety. Leaving `WEARABLES` filter-less will throw `TypeError: sectionFilter is not a function` in every test that calls `readBundleAsync` on a non-empty bundle (confirmed by running the suite).

So Task 1 must add a SAFE placeholder filter that matches nothing:

```ts
    // Placeholder — matches nothing until Task 3 replaces this with the real vendor-tag predicate
    [IPSSections.WEARABLES]: () => false,
```

Do not use any other placeholder (e.g. matching on `resourceType === 'Observation'` alone) — that would incorrectly treat every Observation as wearable until Task 3 lands.

- [ ] **Step 1: Write the failing test**

Create `tests/structures/ips_sections.test.ts`:

```ts
import { IPSSections } from '../../src/structures/ips_sections';
import {
  IPS_SECTION_LOINC_CODES,
  IPS_SECTION_DISPLAY_NAMES,
  IPS_SECTION_CODE_SYSTEMS,
  WEARABLE_VENDOR_SECURITY_SYSTEM,
  WEARABLE_VENDOR_CODES,
  DISPLAY_GROUP_CATEGORY_SYSTEM,
  LOINC_SYSTEM,
} from '../../src/structures/ips_section_loinc_codes';

describe('WEARABLES section constants', () => {
  it('registers the WEARABLES enum value', () => {
    expect(IPSSections.WEARABLES).toBe('WearableDeviceDataSection');
  });

  it('has a local code and display name', () => {
    expect(IPS_SECTION_LOINC_CODES[IPSSections.WEARABLES]).toBe('wearables');
    expect(IPS_SECTION_DISPLAY_NAMES[IPSSections.WEARABLES]).toBe('Wearable Device Data');
  });

  it('overrides the code system to a b.well-local namespace for WEARABLES only', () => {
    expect(IPS_SECTION_CODE_SYSTEMS[IPSSections.WEARABLES]).toBe('https://www.icanbwell.com/ips-section-codes');
    expect(IPS_SECTION_CODE_SYSTEMS[IPSSections.VITAL_SIGNS]).toBeUndefined();
  });

  it('defines the vendor and display-group constants', () => {
    expect(WEARABLE_VENDOR_SECURITY_SYSTEM).toBe('https://www.icanbwell.com/vendor');
    expect(WEARABLE_VENDOR_CODES).toEqual(['validic']);
    expect(DISPLAY_GROUP_CATEGORY_SYSTEM).toBe('https://www.icanbwell.com/display-group');
    expect(LOINC_SYSTEM).toBe('http://loinc.org');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/structures/ips_sections.test.ts`
Expected: FAIL — `IPSSections.WEARABLES` is `undefined`, and the new named exports don't exist yet (TypeScript compile error via `ts-jest`).

- [ ] **Step 3: Add the enum value**

In `src/structures/ips_sections.ts`, add to the "Optional Sections" block (after `VITAL_SIGNS`):

```ts
    VITAL_SIGNS = 'VitalSignsSection',
    WEARABLES = 'WearableDeviceDataSection',
```

- [ ] **Step 4: Add the new constants and map entries**

In `src/structures/ips_section_loinc_codes.ts`, add to `IPS_SECTION_LOINC_CODES`:

```ts
  [IPSSections.WEARABLES]: 'wearables',
```

Add to `IPS_SECTION_DISPLAY_NAMES`:

```ts
  [IPSSections.WEARABLES]: 'Wearable Device Data',
```

After the `IPS_SECTION_DISPLAY_NAMES` block, add:

```ts
// Per-section override for the code.coding[0].system used when building a
// Composition section's `code`. Every section not listed here defaults to
// LOINC_SYSTEM (see fhir_summary_generator.ts). WEARABLES has no HL7 IPS
// LOINC section code, so it uses a b.well-local namespace instead.
const IPS_SECTION_CODE_SYSTEMS: Partial<Record<IPSSections, string>> = {
  [IPSSections.WEARABLES]: 'https://www.icanbwell.com/ips-section-codes',
};

// Identifies Observations produced by b.well's wearable-data ingestion
// pipeline (bwell-databricks/device-data-ingest-job). Every Observation it
// emits carries a meta.security tag {system: WEARABLE_VENDOR_SECURITY_SYSTEM,
// code: <vendor>}. Kept as an array (not a single literal) so a future
// non-Validic wearable integration can be added without a filter rewrite.
const WEARABLE_VENDOR_SECURITY_SYSTEM = 'https://www.icanbwell.com/vendor';
const WEARABLE_VENDOR_CODES: string[] = ['validic'];

// Second `category` coding the same ingestion pipeline stamps on every
// Observation, grouping it by clinical domain (cardiovascular, sleep,
// activity, etc.) for UI purposes. Used by WearablesTemplate to group its
// summary table by category without this repo needing its own metric
// taxonomy.
const DISPLAY_GROUP_CATEGORY_SYSTEM = 'https://www.icanbwell.com/display-group';
```

Add the four new names to the `export { ... }` block at the bottom of the file:

```ts
export {
  IPS_SECTION_LOINC_CODES,
  IPS_SECTION_DISPLAY_NAMES,
  IPS_SECTION_CODE_SYSTEMS,
  PREGNANCY_LOINC_CODES,
  PREGNANCY_SNOMED_CODES,
  BLOOD_PRESSURE_LOINC_CODES,
  SOCIAL_HISTORY_LOINC_CODES,
  ESSENTIAL_LAB_PANELS,
  FUNCTIONAL_STATUS_SNOMED_CODES,
  FUNCTIONAL_STATUS_ASSESSMENT_LOINC_CODES,
  ADVANCED_DIRECTIVE_CATEGORY_CODES,
  ADVANCED_DIRECTIVE_CATEGORY_SYSTEM,
  ADVANCED_DIRECTIVE_LOINC_CODES,
  LOINC_SYSTEM,
  WEARABLE_VENDOR_SECURITY_SYSTEM,
  WEARABLE_VENDOR_CODES,
  DISPLAY_GROUP_CATEGORY_SYSTEM,
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- tests/structures/ips_sections.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 4a: Add the resource-map entry and a safe placeholder filter**

In `src/structures/ips_section_resource_map.ts`, add to `IPSSectionResourcesMap`:

```ts
    [IPSSections.WEARABLES]: ['Observation'],
```

And add to `IPSSectionResourceFilters` — a placeholder that matches nothing (required so `readBundleAsync` doesn't crash calling an undefined filter; Task 3 replaces this line with the real predicate):

```ts
    // Placeholder — matches nothing until Task 3 replaces this with the real vendor-tag predicate
    [IPSSections.WEARABLES]: () => false,
```

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: no errors. (Note: this will currently FAIL with a `TS2741` "missing property" error on `TypeScriptTemplateMapper`'s `sectionToTemplate` map, because `IPSSections.WEARABLES` now exists but has no template registered yet — that's expected and fixed in Task 6. Confirm that is the *only* remaining error — Step 4a above prevents a second one on `IPSSectionResourcesMap`.)

- [ ] **Step 7: Commit**

```bash
git add src/structures/ips_sections.ts src/structures/ips_section_loinc_codes.ts tests/structures/ips_sections.test.ts
git commit -m "feat: add WEARABLES IPS section enum and constants"
```

---

### Task 2: Per-section code system in the generator

**Files:**
- Modify: `src/generators/fhir_summary_generator.ts:6,52-61`
- Test: `tests/generators/fhir_summary_generator_edge.test.ts`

**Interfaces:**
- Consumes: `IPS_SECTION_CODE_SYSTEMS`, `LOINC_SYSTEM` from Task 1.
- Produces: `addSectionAsync` now writes `code.coding[0].system` from `IPS_SECTION_CODE_SYSTEMS[sectionType] ?? LOINC_SYSTEM` instead of the hardcoded `'http://loinc.org'` literal.

- [ ] **Step 1: Write the failing test**

Add to `tests/generators/fhir_summary_generator_edge.test.ts` (inside the existing `describe` block):

```ts
  it('uses the LOINC system for existing sections and a local system for WEARABLES', async () => {
    const builder = new ComprehensiveIPSCompositionBuilder();
    const patient: TPatient = {
      resourceType: 'Patient',
      id: 'p1',
      name: [{ family: 'Doe', given: ['John'] }]
    };
    builder.setPatient(patient);
    await builder.makeSectionAsync(IPSSections.PATIENT, [patient], undefined);
    builder.addSectionAsync(
      { status: 'generated', div: '<div xmlns="http://www.w3.org/1999/xhtml"><p>none</p></div>' },
      IPSSections.PROBLEMS,
      []
    );
    builder.addSectionAsync(
      { status: 'generated', div: '<div xmlns="http://www.w3.org/1999/xhtml"><p>none</p></div>' },
      IPSSections.WEARABLES,
      []
    );

    const bundle = await builder.buildBundleAsync('org-1', 'Test Org', 'https://example.com/fhir', undefined);
    const composition = bundle.entry?.find(
      entry => entry.resource?.resourceType === 'Composition'
    )?.resource as TComposition;

    const problemSection = composition.section?.find(s => s.code?.coding?.[0]?.code === '11450-4');
    expect(problemSection?.code?.coding?.[0]?.system).toBe('http://loinc.org');

    const wearablesSection = composition.section?.find(s => s.code?.coding?.[0]?.code === 'wearables');
    expect(wearablesSection?.code?.coding?.[0]?.system).toBe('https://www.icanbwell.com/ips-section-codes');
    expect(wearablesSection?.title).toBe('Wearable Device Data');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/generators/fhir_summary_generator_edge.test.ts -t "uses the LOINC system"`
Expected: FAIL — `wearablesSection?.code?.coding?.[0]?.system` is `'http://loinc.org'`, not the local system.

- [ ] **Step 3: Implement**

In `src/generators/fhir_summary_generator.ts`, change the import on line 6:

```ts
import { IPS_SECTION_DISPLAY_NAMES, IPS_SECTION_LOINC_CODES, IPS_SECTION_CODE_SYSTEMS, LOINC_SYSTEM } from "../structures/ips_section_loinc_codes";
```

Change lines 52-61 (`addSectionAsync`):

```ts
        const sectionEntry: TCompositionSection = {
            title: IPS_SECTION_DISPLAY_NAMES[sectionType] || sectionType,
            code: {
                coding: [{
                    system: IPS_SECTION_CODE_SYSTEMS[sectionType] ?? LOINC_SYSTEM,
                    code: IPS_SECTION_LOINC_CODES[sectionType],
                    display: IPS_SECTION_DISPLAY_NAMES[sectionType] || sectionType
                }],
                text: IPS_SECTION_DISPLAY_NAMES[sectionType] || sectionType
            },
            text: narrative,
            entry: validResources.map(resource => ({
                reference: `${resource.resourceType}/${resource.id}`,
                display: resource.resourceType
            }))
        };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/generators/fhir_summary_generator_edge.test.ts`
Expected: PASS (all tests in the file, including the new one)

- [ ] **Step 5: Run the full test suite to confirm no regressions**

Run: `npm test`
Expected: PASS — every existing section's `code.coding[0].system` is unaffected since `IPS_SECTION_CODE_SYSTEMS` only has a `WEARABLES` entry.

- [ ] **Step 6: Commit**

```bash
git add src/generators/fhir_summary_generator.ts tests/generators/fhir_summary_generator_edge.test.ts
git commit -m "feat: support a per-section local code system for Composition sections"
```

---

### Task 3: Resource map + filter for WEARABLES (and excluding wearables from other Observation sections)

**Why the exclusion matters:** `device-data-ingest-job` (the real producer traced in the spec) tags wearable Observations with standard `observation-category` codes too — `vital-signs` for heart rate, `laboratory` for glucose/blood-ketone readings, etc. — alongside the vendor tag. Without an exclusion, those same Observations would *also* match the existing `VITAL_SIGNS` filter (`category` contains `vital-signs`) and `DIAGNOSTIC_REPORTS` filter (`category` contains `laboratory`/`Lab`/`LAB`, from `RESULT_SUMMARY_OBSERVATION_CATEGORIES`), so a wearable reading would render as an aggregated row in the new Wearables section *and* as a raw row in Vital Signs or Results Summary — exactly the "too many raw readings" problem this feature exists to solve. `SOCIAL_HISTORY` and `PREGNANCY_HISTORY` match by specific LOINC code lists (tobacco/alcohol/pregnancy codes) that don't overlap with wearable metrics, so they're left as-is.

**Files:**
- Modify: `src/structures/ips_section_resource_map.ts`
- Test: `tests/structures/ips_section_resource_map.test.ts`

**Interfaces:**
- Consumes: `WEARABLE_VENDOR_SECURITY_SYSTEM`, `WEARABLE_VENDOR_CODES` from Task 1; existing `codingMatches` helper (same file); `IPSSectionResourcesMap[IPSSections.WEARABLES]` (already added by Task 1 — do NOT re-add it, TypeScript will reject a duplicate object key).
- Produces: `isWearableObservation(resource: any): boolean` (new internal helper function, not exported — only used within this file); `IPSSectionResourceFilters[IPSSections.WEARABLES]`; updated `IPSSectionResourceFilters[IPSSections.VITAL_SIGNS]` and `IPSSectionResourceFilters[IPSSections.DIAGNOSTIC_REPORTS]` that both now exclude wearable Observations.

**Note:** Task 1 already added `[IPSSections.WEARABLES]: ['Observation']` to `IPSSectionResourcesMap`, and a safe placeholder `[IPSSections.WEARABLES]: () => false` to `IPSSectionResourceFilters` (both were required — `IPSSectionResourcesMap` is exhaustive so needs an entry to compile, and `readBundleAsync` calls every section's filter unconditionally with no undefined-guard, so a filter-less section crashes the pipeline at runtime). This task does NOT touch `IPSSectionResourcesMap` again. It REPLACES the placeholder line in `IPSSectionResourceFilters` with the real predicate — it does not add a second entry (TypeScript would reject the duplicate key).

- [ ] **Step 1: Write the failing tests**

Add to `tests/structures/ips_section_resource_map.test.ts`:

```ts
  const wearableHeartRateObservation = {
    resourceType: 'Observation',
    category: [{ coding: [{ code: 'vital-signs' }] }],
    meta: {
      security: [
        { system: 'https://www.icanbwell.com/owner', code: 'Fitbit' },
        { system: 'https://www.icanbwell.com/vendor', code: 'validic' },
      ],
    },
  };
  const wearableGlucoseObservation = {
    resourceType: 'Observation',
    category: [{ coding: [{ code: 'laboratory' }] }],
    meta: { security: [{ system: 'https://www.icanbwell.com/vendor', code: 'validic' }] },
  };
  const clinicalVitalSignObservation = {
    resourceType: 'Observation',
    category: [{ coding: [{ code: 'vital-signs' }] }],
  };
  const clinicalLabObservation = {
    resourceType: 'Observation',
    category: [{ coding: [{ code: 'laboratory' }] }],
  };

  it('filters WEARABLES to Observations carrying the Validic vendor tag', () => {
    const filter = IPSSectionResourceFilters[IPSSections.WEARABLES];
    expect(filter && filter(wearableHeartRateObservation)).toBe(true);
    expect(filter && filter(clinicalVitalSignObservation)).toBe(false);
    expect(filter && filter({ resourceType: 'Observation' })).toBe(false);
  });

  it('maps WEARABLES to the Observation resource type', () => {
    expect(IPSSectionResourceHelper.getResourceTypesForSection(IPSSections.WEARABLES)).toEqual(['Observation']);
  });

  it('excludes wearable Observations from VITAL_SIGNS even when category is vital-signs', () => {
    const filter = IPSSectionResourceFilters[IPSSections.VITAL_SIGNS];
    expect(filter && filter(wearableHeartRateObservation)).toBe(false);
    expect(filter && filter(clinicalVitalSignObservation)).toBe(true);
  });

  it('excludes wearable Observations from DIAGNOSTIC_REPORTS even when category is laboratory', () => {
    const filter = IPSSectionResourceFilters[IPSSections.DIAGNOSTIC_REPORTS];
    expect(filter && filter(wearableGlucoseObservation)).toBe(false);
    expect(filter && filter(clinicalLabObservation)).toBe(true);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/structures/ips_section_resource_map.test.ts`
Expected: FAIL — `IPSSectionResourceFilters[IPSSections.WEARABLES]` is `undefined`; `VITAL_SIGNS` and `DIAGNOSTIC_REPORTS` filters currently return `true` for the wearable-tagged mocks (no exclusion yet).

- [ ] **Step 3: Implement**

In `src/structures/ips_section_resource_map.ts`, update the import on line 2:

```ts
import { PREGNANCY_LOINC_CODES, SOCIAL_HISTORY_LOINC_CODES, PREGNANCY_SNOMED_CODES, FUNCTIONAL_STATUS_ASSESSMENT_LOINC_CODES, FUNCTIONAL_STATUS_SNOMED_CODES, WEARABLE_VENDOR_SECURITY_SYSTEM, WEARABLE_VENDOR_CODES } from "./ips_section_loinc_codes";
```

(Do not add `[IPSSections.WEARABLES]: ['Observation']` to `IPSSectionResourcesMap` — Task 1 already added it.)

Add this function above `IPSSectionResourceFilters` (function declarations are hoisted, matching how `codingMatches`/`codeableConceptMatches` are already used above their own definitions further down this file):

```ts
/**
 * True if this Observation was produced by the wearable-data ingestion pipeline
 * (identified by a meta.security vendor tag, e.g. {system: ".../vendor", code: "validic"}).
 * Used both to build the WEARABLES section and to exclude these Observations from
 * other Observation-based sections (VITAL_SIGNS, DIAGNOSTIC_REPORTS) that would
 * otherwise also match on a shared observation-category code (vital-signs, laboratory).
 */
function isWearableObservation(resource: any): boolean {
    return resource.resourceType === 'Observation' && resource.meta?.security?.some((s: any) => codingMatches(s, WEARABLE_VENDOR_CODES, WEARABLE_VENDOR_SECURITY_SYSTEM));
}
```

Update the existing `VITAL_SIGNS` filter to exclude wearable Observations:

```ts
    // Only include vital sign Observations (category.coding contains 'vital-signs'), excluding wearable-sourced readings (see WEARABLES)
    [IPSSections.VITAL_SIGNS]: (resource) => resource.resourceType === 'Observation' && !isWearableObservation(resource) && resource.category?.some((cat: any) => cat.coding?.some((c: any) => codingMatches(c, 'vital-signs', c.system))),
```

Update the existing `DIAGNOSTIC_REPORTS` filter the same way:

```ts
    // Only include finalized diagnostic reports and relevant observations, excluding wearable-sourced readings (see WEARABLES)
    [IPSSections.DIAGNOSTIC_REPORTS]: (resource) =>
        (resource.resourceType === 'DiagnosticReport' && resource.status === 'final') ||
        (resource.resourceType === 'Observation' && !isWearableObservation(resource) && resource.category?.some((cat: any) => cat.coding?.some((c: any) => codingMatches(c, RESULT_SUMMARY_OBSERVATION_CATEGORIES, c.system)))),
```

Replace Task 1's placeholder line in `IPSSectionResourceFilters` —

```ts
    // Placeholder — matches nothing until Task 3 replaces this with the real vendor-tag predicate
    [IPSSections.WEARABLES]: () => false,
```

— with the real predicate:

```ts
    // Only include Observations from the wearable-data ingestion pipeline (vendor tag = validic today)
    [IPSSections.WEARABLES]: (resource) => isWearableObservation(resource),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/structures/ips_section_resource_map.test.ts`
Expected: PASS (all tests in the file)

- [ ] **Step 5: Run the full test suite to confirm no regressions**

Run: `npm test`
Expected: PASS — the `!isWearableObservation(resource)` addition is a no-op for every existing fixture (none carry the Validic vendor tag), so `VITAL_SIGNS` and `DIAGNOSTIC_REPORTS` keep matching exactly what they matched before.

- [ ] **Step 6: Commit**

```bash
git add src/structures/ips_section_resource_map.ts tests/structures/ips_section_resource_map.test.ts
git commit -m "feat: filter WEARABLES to vendor-tagged Observations, exclude them from Vital Signs and Diagnostic Reports"
```

---

### Task 4: `getDisplayGroupCategory` helper on TemplateUtilities

**Files:**
- Modify: `src/narratives/templates/typescript/TemplateUtilities.ts`
- Test: `tests/narrativeGenerator/wearablesTemplate.test.ts` (new — also used by Task 5)

**Interfaces:**
- Consumes: `DISPLAY_GROUP_CATEGORY_SYSTEM` from Task 1.
- Produces: `TemplateUtilities.prototype.getDisplayGroupCategory(resource: TObservation): string | undefined`.

- [ ] **Step 1: Write the failing test**

Create `tests/narrativeGenerator/wearablesTemplate.test.ts`:

```ts
import { TemplateUtilities } from '../../src/narratives/templates/typescript/TemplateUtilities';
import { TObservation } from '../../src/types/resources/Observation';

describe('TemplateUtilities.getDisplayGroupCategory', () => {
  it('reads the display-group category coding off an Observation', () => {
    const templateUtilities = new TemplateUtilities([]);
    const observation: TObservation = {
      resourceType: 'Observation',
      status: 'final',
      code: { coding: [{ system: 'http://loinc.org', code: '8867-4', display: 'Heart rate' }] },
      category: [
        { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] },
        { coding: [{ system: 'https://www.icanbwell.com/display-group', code: 'cardiovascular', display: 'Cardiovascular' }] },
      ],
    };
    expect(templateUtilities.getDisplayGroupCategory(observation)).toBe('cardiovascular');
  });

  it('returns undefined when no display-group category coding is present', () => {
    const templateUtilities = new TemplateUtilities([]);
    const observation: TObservation = {
      resourceType: 'Observation',
      status: 'final',
      code: { coding: [{ system: 'http://loinc.org', code: '8310-5', display: 'Body temperature' }] },
      category: [{ coding: [{ code: 'vital-signs' }] }],
    };
    expect(templateUtilities.getDisplayGroupCategory(observation)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/narrativeGenerator/wearablesTemplate.test.ts`
Expected: FAIL with a TypeScript error — `getDisplayGroupCategory` does not exist on `TemplateUtilities`.

- [ ] **Step 3: Implement**

In `src/narratives/templates/typescript/TemplateUtilities.ts`, add the import:

```ts
import { DISPLAY_GROUP_CATEGORY_SYSTEM } from "../../../structures/ips_section_loinc_codes";
```

Add the method directly after `getOwnerTag` (around line 956):

```ts
    /**
     * Returns the b.well "display group" category code for an Observation, if
     * present. This is a second `category` coding (system
     * https://www.icanbwell.com/display-group) that the wearable-data
     * ingestion pipeline stamps onto every Observation it produces, grouping
     * it by clinical domain (cardiovascular, sleep, activity, etc.).
     */
    getDisplayGroupCategory(resource: TObservation): string | undefined {
        for (const cat of resource.category ?? []) {
            const coding = cat.coding?.find((c) => c.system === DISPLAY_GROUP_CATEGORY_SYSTEM);
            if (coding?.code) {
                return coding.code;
            }
        }
        return undefined;
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/narrativeGenerator/wearablesTemplate.test.ts`
Expected: PASS (both tests)

- [ ] **Step 5: Commit**

```bash
git add src/narratives/templates/typescript/TemplateUtilities.ts tests/narrativeGenerator/wearablesTemplate.test.ts
git commit -m "feat: add getDisplayGroupCategory helper to TemplateUtilities"
```

---

### Task 5: `WearablesTemplate` rendering

**Files:**
- Create: `src/narratives/templates/typescript/WearablesTemplate.ts`
- Test: `tests/narrativeGenerator/wearablesTemplate.test.ts` (extends Task 4's file)

**Interfaces:**
- Consumes: `TemplateUtilities.getDisplayGroupCategory` (Task 4), `TemplateUtilities.getOwnerTag`/`renderTime`/`renderTextAsHtml`/`capitalizeFirstLetter` (existing), `ITemplate` interface.
- Produces: `WearablesTemplate` class implementing `ITemplate.generateNarrative(resources: TDomainResource[], timezone: string | undefined): string | undefined`. Consumed by Task 6.

- [ ] **Step 1: Write the failing tests**

Add to `tests/narrativeGenerator/wearablesTemplate.test.ts`:

```ts
import { WearablesTemplate } from '../../src/narratives/templates/typescript/WearablesTemplate';
import { TDomainResource } from '../../src/types/resources/DomainResource';

describe('WearablesTemplate', () => {
  const heartRateObservation = (id: string, value: number, date: string): TObservation => ({
    resourceType: 'Observation',
    id,
    status: 'final',
    code: { coding: [{ system: 'http://loinc.org', code: '8867-4', display: 'Heart rate' }] },
    category: [
      { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] },
      { coding: [{ system: 'https://www.icanbwell.com/display-group', code: 'cardiovascular', display: 'Cardiovascular' }] },
    ],
    effectiveDateTime: date,
    valueQuantity: { value, unit: 'bpm' },
    meta: {
      security: [
        { system: 'https://www.icanbwell.com/owner', code: 'Fitbit' },
        { system: 'https://www.icanbwell.com/vendor', code: 'validic' },
      ],
    },
  });

  const stepsObservation = (id: string, value: number, date: string): TObservation => ({
    resourceType: 'Observation',
    id,
    status: 'final',
    code: { coding: [{ system: 'http://loinc.org', code: '41950-7', display: 'Number of steps 24H' }] },
    category: [
      { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'activity' }] },
      { coding: [{ system: 'https://www.icanbwell.com/display-group', code: 'activity', display: 'Activity' }] },
    ],
    effectiveDateTime: date,
    valueQuantity: { value, unit: 'steps' },
    meta: {
      security: [
        { system: 'https://www.icanbwell.com/owner', code: 'Fitbit' },
        { system: 'https://www.icanbwell.com/vendor', code: 'validic' },
      ],
    },
  });

  it('returns undefined when there are no Observations', () => {
    const template = new WearablesTemplate();
    expect(template.generateNarrative([], undefined)).toBeUndefined();
  });

  it('aggregates multiple readings of the same metric into one row', () => {
    const resources: TDomainResource[] = [
      heartRateObservation('hr-1', 72, '2026-01-01T08:00:00Z'),
      heartRateObservation('hr-2', 80, '2026-01-02T08:00:00Z'),
    ];
    const template = new WearablesTemplate();
    const html = template.generateNarrative(resources, 'UTC');

    expect(html).toBeDefined();
    expect(html).toContain('Heart rate');
    expect(html).toContain('Cardiovascular');
    expect(html).toContain('76 bpm'); // average of 72 and 80
    expect(html).toContain('72 bpm'); // min
    expect(html).toContain('80 bpm'); // max, also the latest value
    expect(html).toContain('<td>2</td>'); // reading count
    expect(html).toContain('Fitbit');
  });

  it('groups different metrics under separate category headers', () => {
    const resources: TDomainResource[] = [
      heartRateObservation('hr-1', 72, '2026-01-01T08:00:00Z'),
      stepsObservation('steps-1', 5000, '2026-01-01T08:00:00Z'),
    ];
    const template = new WearablesTemplate();
    const html = template.generateNarrative(resources, 'UTC');

    expect(html).toBeDefined();
    expect(html).toContain('<h4>Cardiovascular</h4>');
    expect(html).toContain('<h4>Activity</h4>');
  });

  it('buckets metrics with no display-group category under "Other"', () => {
    const observation: TObservation = {
      resourceType: 'Observation',
      id: 'weight-1',
      status: 'final',
      code: { coding: [{ system: 'http://loinc.org', code: '29463-7', display: 'Body weight' }] },
      effectiveDateTime: '2026-01-01T08:00:00Z',
      valueQuantity: { value: 70, unit: 'kg' },
      meta: { security: [{ system: 'https://www.icanbwell.com/vendor', code: 'validic' }] },
    };
    const template = new WearablesTemplate();
    const html = template.generateNarrative([observation], 'UTC');

    expect(html).toContain('<h4>Other</h4>');
  });

  it('skips Observations with no numeric value', () => {
    const observation: TObservation = {
      resourceType: 'Observation',
      id: 'no-value',
      status: 'final',
      code: { coding: [{ system: 'http://loinc.org', code: '8867-4', display: 'Heart rate' }] },
      meta: { security: [{ system: 'https://www.icanbwell.com/vendor', code: 'validic' }] },
    };
    const template = new WearablesTemplate();
    expect(template.generateNarrative([observation], 'UTC')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/narrativeGenerator/wearablesTemplate.test.ts`
Expected: FAIL — `WearablesTemplate` module does not exist.

- [ ] **Step 3: Implement**

Create `src/narratives/templates/typescript/WearablesTemplate.ts`:

```ts
// WearablesTemplate.ts - Renders an aggregated summary of wearable-device Observations
import { TemplateUtilities } from './TemplateUtilities';
import { TDomainResource } from '../../../types/resources/DomainResource';
import { TObservation } from '../../../types/resources/Observation';
import { ITemplate } from './interfaces/ITemplate';

interface WearableMetricSummary {
  display: string;
  unit: string;
  category: string;
  count: number;
  average: number;
  min: number;
  max: number;
  latestValue: number;
  latestDate: string;
  earliestDate: string;
  sourceDevice: string;
}

/**
 * Class to generate an HTML narrative summarizing wearable-device Observations
 * (heart rate, steps, sleep, etc.) as per-metric aggregates rather than raw readings.
 */
export class WearablesTemplate implements ITemplate {
  generateNarrative(resources: TDomainResource[], timezone: string | undefined): string | undefined {
    return WearablesTemplate.generateStaticNarrative(resources, timezone);
  }

  private static generateStaticNarrative(resources: TDomainResource[], timezone: string | undefined): string | undefined {
    const templateUtilities = new TemplateUtilities(resources);
    const observations = resources.filter((r) => r.resourceType === 'Observation') as TObservation[];

    const groups = new Map<string, TObservation[]>();
    for (const obs of observations) {
      const coding = obs.code?.coding?.[0];
      const key = coding?.code ? `${coding.system ?? ''}|${coding.code}` : `text|${obs.code?.text ?? 'unknown'}`;
      const existing = groups.get(key);
      if (existing) {
        existing.push(obs);
      } else {
        groups.set(key, [obs]);
      }
    }

    const summaries: WearableMetricSummary[] = [];
    for (const groupObservations of groups.values()) {
      const readings = groupObservations
        .filter((obs) => typeof obs.valueQuantity?.value === 'number')
        .map((obs) => ({ value: obs.valueQuantity!.value as number, obs }));

      if (readings.length === 0) {
        continue;
      }

      const byDate = [...readings].sort((a, b) => {
        const dateA = a.obs.effectiveDateTime || a.obs.effectivePeriod?.start;
        const dateB = b.obs.effectiveDateTime || b.obs.effectivePeriod?.start;
        return dateA && dateB ? new Date(dateA).getTime() - new Date(dateB).getTime() : 0;
      });
      const earliest = byDate[0];
      const latest = byDate[byDate.length - 1];

      const firstObs = groupObservations[0];
      const display = firstObs.code?.coding?.[0]?.display || templateUtilities.codeableConceptDisplay(firstObs.code) || 'Unknown';
      const unit = groupObservations.find((obs) => obs.valueQuantity?.unit)?.valueQuantity?.unit ?? '';
      const category = templateUtilities.getDisplayGroupCategory(firstObs) ?? 'Other';
      const sourceDevice = templateUtilities.getOwnerTag(latest.obs) || templateUtilities.getOwnerTag(firstObs) || '';

      const values = readings.map((r) => r.value);
      const sum = values.reduce((total, v) => total + v, 0);
      const earliestDateValue = earliest.obs.effectiveDateTime || earliest.obs.effectivePeriod?.start;
      const latestDateValue = latest.obs.effectiveDateTime || latest.obs.effectivePeriod?.start;

      summaries.push({
        display: templateUtilities.capitalizeFirstLetter(display),
        unit,
        category,
        count: values.length,
        average: Math.round((sum / values.length) * 10) / 10,
        min: Math.min(...values),
        max: Math.max(...values),
        latestValue: latest.value,
        latestDate: latestDateValue ? templateUtilities.renderTime(latestDateValue, timezone) : '',
        earliestDate: earliestDateValue ? templateUtilities.renderTime(earliestDateValue, timezone) : '',
        sourceDevice,
      });
    }

    if (summaries.length === 0) {
      return undefined;
    }

    const byCategory = new Map<string, WearableMetricSummary[]>();
    for (const summary of summaries) {
      const categoryLabel = WearablesTemplate.formatCategoryLabel(summary.category);
      const existing = byCategory.get(categoryLabel);
      if (existing) {
        existing.push(summary);
      } else {
        byCategory.set(categoryLabel, [summary]);
      }
    }

    const categoryLabels = Array.from(byCategory.keys()).sort((a, b) => {
      if (a === 'Other') return 1;
      if (b === 'Other') return -1;
      return a.localeCompare(b);
    });

    let html = `<p>This is a summary of readings from the patient's wearable devices, grouped by category. Each row shows the average, minimum, and maximum across all readings, plus the most recent value.</p>\n`;

    for (const categoryLabel of categoryLabels) {
      const metrics = [...(byCategory.get(categoryLabel) ?? [])].sort((a, b) => a.display.localeCompare(b.display));
      html += `
        <h4>${templateUtilities.renderTextAsHtml(categoryLabel)}</h4>
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th>Latest</th>
              <th>Average</th>
              <th>Min</th>
              <th>Max</th>
              <th># Readings</th>
              <th>Date Range</th>
              <th>Source Device</th>
            </tr>
          </thead>
          <tbody>`;
      for (const metric of metrics) {
        const dateRange = metric.earliestDate === metric.latestDate
          ? metric.latestDate
          : `${metric.earliestDate} - ${metric.latestDate}`;
        html += `
            <tr>
              <td>${templateUtilities.renderTextAsHtml(metric.display)}</td>
              <td>${metric.latestValue} ${metric.unit}</td>
              <td>${metric.average} ${metric.unit}</td>
              <td>${metric.min} ${metric.unit}</td>
              <td>${metric.max} ${metric.unit}</td>
              <td>${metric.count}</td>
              <td>${dateRange}</td>
              <td>${templateUtilities.renderTextAsHtml(metric.sourceDevice)}</td>
            </tr>`;
      }
      html += `
          </tbody>
        </table>`;
    }

    return html;
  }

  private static formatCategoryLabel(rawCategory: string): string {
    if (rawCategory === 'Other') {
      return 'Other';
    }
    return rawCategory
      .split(/[_\s]+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/narrativeGenerator/wearablesTemplate.test.ts`
Expected: PASS (all tests in the file, including Task 4's)

- [ ] **Step 5: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: typecheck still shows only the Task-1-noted `TypeScriptTemplateMapper` `TS2741` error (fixed next task); lint passes on the new file.

- [ ] **Step 6: Commit**

```bash
git add src/narratives/templates/typescript/WearablesTemplate.ts tests/narrativeGenerator/wearablesTemplate.test.ts
git commit -m "feat: add WearablesTemplate to render aggregated wearable-metric summaries"
```

---

### Task 6: Register the template

**Files:**
- Modify: `src/narratives/templates/typescript/TypeScriptTemplateMapper.ts`
- Test: `tests/narrativeGenerator/wearablesTemplate.test.ts` (extends Task 5's file)

**Interfaces:**
- Consumes: `WearablesTemplate` (Task 5).
- Produces: `TypeScriptTemplateMapper.generateNarrative(IPSSections.WEARABLES, ...)` returns `WearablesTemplate`'s output; `sectionToTemplate` is exhaustive again (fixes the `TS2741` typecheck error from Task 1).

- [ ] **Step 1: Write the failing test**

Add to `tests/narrativeGenerator/wearablesTemplate.test.ts`:

```ts
import { TypeScriptTemplateMapper } from '../../src/narratives/templates/typescript/TypeScriptTemplateMapper';
import { IPSSections } from '../../src/structures/ips_sections';

describe('TypeScriptTemplateMapper WEARABLES registration', () => {
  it('dispatches WEARABLES resources to WearablesTemplate', () => {
    const observation: TObservation = {
      resourceType: 'Observation',
      id: 'hr-1',
      status: 'final',
      code: { coding: [{ system: 'http://loinc.org', code: '8867-4', display: 'Heart rate' }] },
      category: [{ coding: [{ system: 'https://www.icanbwell.com/display-group', code: 'cardiovascular' }] }],
      effectiveDateTime: '2026-01-01T08:00:00Z',
      valueQuantity: { value: 72, unit: 'bpm' },
      meta: { security: [{ system: 'https://www.icanbwell.com/vendor', code: 'validic' }] },
    };
    const html = TypeScriptTemplateMapper.generateNarrative(IPSSections.WEARABLES, [observation], 'UTC');
    expect(html).toContain('Heart rate');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/narrativeGenerator/wearablesTemplate.test.ts -t "dispatches WEARABLES"`
Expected: FAIL with `No template found for section: WearableDeviceDataSection` (thrown by `TypeScriptTemplateMapper.generateNarrative`).

- [ ] **Step 3: Implement**

In `src/narratives/templates/typescript/TypeScriptTemplateMapper.ts`, add the import:

```ts
import { WearablesTemplate } from './WearablesTemplate';
```

Add to `sectionToTemplate`:

```ts
    [IPSSections.WEARABLES]: new WearablesTemplate(),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/narrativeGenerator/wearablesTemplate.test.ts`
Expected: PASS (all tests in the file)

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no errors — the `TS2741` error from Task 1 is now resolved.

- [ ] **Step 6: Commit**

```bash
git add src/narratives/templates/typescript/TypeScriptTemplateMapper.ts tests/narrativeGenerator/wearablesTemplate.test.ts
git commit -m "feat: register WearablesTemplate for IPSSections.WEARABLES"
```

---

### Task 7: End-to-end pipeline test + regression check

**Files:**
- Test: `tests/generators/fhir_summary_generator_wearables.test.ts` (new)

**Interfaces:**
- Consumes: `ComprehensiveIPSCompositionBuilder.readBundleAsync`/`buildBundleAsync` (existing), everything from Tasks 1-6.
- Produces: nothing new — this is a full-pipeline regression/acceptance test.

- [ ] **Step 1: Write the failing test**

Create `tests/generators/fhir_summary_generator_wearables.test.ts`:

```ts
import { ComprehensiveIPSCompositionBuilder } from '../../src/generators/fhir_summary_generator';
import { TPatient } from '../../src/types/resources/Patient';
import { TObservation } from '../../src/types/resources/Observation';
import { TComposition } from '../../src/types/resources/Composition';
import { TBundle } from '../../src/types/resources/Bundle';

describe('Wearable Device Data section end-to-end', () => {
  const patient: TPatient = {
    resourceType: 'Patient',
    id: 'wearable-patient-01',
    name: [{ family: 'Doe', given: ['Jane'] }],
  };

  const heartRateObservation = (id: string, value: number, date: string): TObservation => ({
    resourceType: 'Observation',
    id,
    status: 'final',
    subject: { reference: 'Patient/wearable-patient-01' },
    code: { coding: [{ system: 'http://loinc.org', code: '8867-4', display: 'Heart rate' }] },
    category: [
      { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] },
      { coding: [{ system: 'https://www.icanbwell.com/display-group', code: 'cardiovascular', display: 'Cardiovascular' }] },
    ],
    effectiveDateTime: date,
    valueQuantity: { value, unit: 'bpm' },
    meta: {
      security: [
        { system: 'https://www.icanbwell.com/owner', code: 'Fitbit' },
        { system: 'https://www.icanbwell.com/vendor', code: 'validic' },
      ],
    },
  });

  const clinicalHeartRateObservation: TObservation = {
    resourceType: 'Observation',
    id: 'clinic-hr-1',
    status: 'final',
    subject: { reference: 'Patient/wearable-patient-01' },
    code: { coding: [{ system: 'http://loinc.org', code: '8867-4', display: 'Heart rate' }] },
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] }],
    effectiveDateTime: '2026-01-05T09:00:00Z',
    valueQuantity: { value: 68, unit: 'bpm' },
  };

  const bundle: TBundle = {
    resourceType: 'Bundle',
    type: 'collection',
    entry: [
      { resource: patient },
      { resource: heartRateObservation('wear-hr-1', 72, '2026-01-01T08:00:00Z') },
      { resource: heartRateObservation('wear-hr-2', 80, '2026-01-02T08:00:00Z') },
      { resource: clinicalHeartRateObservation },
    ],
  };

  it('produces a Wearable Device Data section with the local code system, and keeps the clinical reading in Vital Signs only', async () => {
    const builder = new ComprehensiveIPSCompositionBuilder().setPatient(patient);
    await builder.readBundleAsync(bundle, 'UTC');

    const outputBundle = await builder.buildBundleAsync('org-1', 'Test Org', 'https://example.com/fhir', 'UTC');
    const composition = outputBundle.entry?.find(
      (entry) => entry.resource?.resourceType === 'Composition'
    )?.resource as TComposition;

    const wearablesSection = composition.section?.find((s) => s.code?.coding?.[0]?.code === 'wearables');
    expect(wearablesSection).toBeDefined();
    expect(wearablesSection?.code?.coding?.[0]?.system).toBe('https://www.icanbwell.com/ips-section-codes');
    expect(wearablesSection?.title).toBe('Wearable Device Data');
    expect(wearablesSection?.text?.div).toContain('Heart rate');
    expect(wearablesSection?.entry).toHaveLength(2); // only the two Validic-tagged readings, not the clinical one

    const vitalSignsSection = composition.section?.find((s) => s.code?.coding?.[0]?.code === '8716-3');
    expect(vitalSignsSection?.entry).toHaveLength(1); // only the untagged clinical reading
  });

  it('does not report Observation as a missing resource type when only wearable data is present', () => {
    const builder = new ComprehensiveIPSCompositionBuilder();
    const wearableOnlyBundle: TBundle = {
      resourceType: 'Bundle',
      type: 'collection',
      entry: [
        { resource: patient },
        { resource: heartRateObservation('wear-hr-3', 75, '2026-01-03T08:00:00Z') },
      ],
    };
    const remaining = builder.getRemainingResourcesFromCompositionBundle(wearableOnlyBundle);
    expect(remaining).not.toContain('Observation');
  });

  it('reports Observation as missing when no Observation of any kind is present', () => {
    const builder = new ComprehensiveIPSCompositionBuilder();
    const patientOnlyBundle: TBundle = {
      resourceType: 'Bundle',
      type: 'collection',
      entry: [{ resource: patient }],
    };
    const remaining = builder.getRemainingResourcesFromCompositionBundle(patientOnlyBundle);
    expect(remaining).toContain('Observation');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/generators/fhir_summary_generator_wearables.test.ts`
Expected: FAIL if any prior task step was skipped (e.g. `wearablesSection` is `undefined`). If Tasks 1-6 are complete, this should already PASS — this task is primarily a regression/acceptance checkpoint, not new production code.

- [ ] **Step 3: Fix any gaps found**

If the test fails, the likely cause is a missed wiring step from Tasks 1-6 (check `IPSSectionResourceFilters[IPSSections.WEARABLES]`, `IPSSectionResourcesMap[IPSSections.WEARABLES]`, and `TypeScriptTemplateMapper`'s registration first). Fix in the relevant file from the earlier task, not here.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/generators/fhir_summary_generator_wearables.test.ts`
Expected: PASS

- [ ] **Step 5: Run the full suite to confirm existing golden-fixture tests are unaffected**

Run: `npm test`
Expected: PASS, with the same pass count as before this feature plus the new tests added in Tasks 1-7. In particular `tests/fhir-summary-bundle/fhir-summary-bundle.test.ts` must still pass unchanged — none of its fixture bundles contain a Validic vendor tag, so `WEARABLES` renders `undefined` and is omitted from those compositions exactly like every other section with no matching data.

- [ ] **Step 6: Run lint and typecheck one more time**

Run: `npm run lint && npm run typecheck`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add tests/generators/fhir_summary_generator_wearables.test.ts
git commit -m "test: add end-to-end coverage for the Wearable Device Data section"
```

---

### Task 8: Documentation

**Files:**
- Modify: `sections.md`

**Interfaces:**
- None — documentation only.

- [ ] **Step 1: Add the section entry**

In `sections.md`, add a new entry after the "Vital Signs (Optional)" section (matching the existing format used for "History of Medical Devices" and "Vital Signs"):

```markdown
## Wearable Device Data (Optional)
**Local Code:** `wearables` (system `https://www.icanbwell.com/ips-section-codes` — no HL7 IPS LOINC code exists for this section)

This section summarizes readings collected by the patient's wearable devices (heart rate, steps, sleep, etc.) as per-metric aggregates — average, minimum, maximum, latest value, reading count, and date range — grouped by clinical category, instead of listing every individual reading.

**Resource:** Observation <br>
**Filter:** `meta.security` contains `{system: "https://www.icanbwell.com/vendor", code: "validic"}` (identifies Observations from the wearable-data ingestion pipeline; extensible to other vendors in the future)
**Data Table Fields (one row per distinct `code.coding[0].code`, grouped under a heading per `https://www.icanbwell.com/display-group` category coding, falling back to "Other" if absent):**
- **Metric:** `code.coding[0].display` (or `code.text`)
- **Latest:** most recent `valueQuantity.value` by `effectiveDateTime`/`effectivePeriod.start`, with `valueQuantity.unit`
- **Average / Min / Max:** computed across all matching readings' `valueQuantity.value`
- **# Readings:** count of readings contributing to the aggregate
- **Date Range:** earliest to latest `effectiveDateTime`/`effectivePeriod.start`
- **Source Device:** `meta.security` owner tag (system `https://www.icanbwell.com/owner`), e.g. "Fitbit"
```

- [ ] **Step 2: Commit**

```bash
git add sections.md
git commit -m "docs: document the Wearable Device Data section"
```
