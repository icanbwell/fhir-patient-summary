# Wearable Metrics Summary — Design

Status: **approved, ready for implementation planning**

## Problem

A doctor reviewing the generated IPS document only wants the gist of a
patient's wearable-collected data (heart rate, steps, sleep, etc.) — not
every individual reading. Today, this repo has **no wearables concept at
all**:

- There is no `IPSSections` value for it.
- Continuous/high-frequency numeric readings from a wearable would, if they
  carried `category: vital-signs`, render one `<tr>` per `Observation` in
  the Vital Signs section (`VitalSignsTemplate.generateStaticNarrative`,
  `src/narratives/templates/typescript/VitalSignsTemplate.ts:118-177`) with
  no grouping, cap, or aggregation.
- The Medical Devices section
  (`src/narratives/templates/typescript/MedicalDevicesTemplate.ts`) is a
  device *roster/history* per the HL7 IPS spec (`46264-8`, "History of
  Medical Devices") — implants, prosthetics, devices in use — built from
  `DeviceUseStatement`/`Device`. It's not meant to carry the numeric
  *readings* a device produces, and mixing aggregated heart-rate/step stats
  into it would conflate two different kinds of content.

## Decision: a dedicated `WEARABLES` IPS section

HL7 IPS has no standard section for this, but this repo already supports
b.well-specific custom sections (see
`docs/adding-a-new-ips-section.md`) — the "or you need a b.well-specific
one" case. This section will surface a per-metric summary (latest / average
/ min / max / reading count / date range) rather than raw readings, keeping
it clearly separate from both Vital Signs (clinical measurements) and
Medical Devices (device history).

Two options were weighed:

| Option | Verdict |
|---|---|
| Fold into Vital Signs (group same-code Observations there) | Rejected — "these are not vitals" |
| Append a table to Medical Devices | Rejected — conflates device *history* with reading *values*; semantically wrong per IPS's definition of that section |
| **New dedicated `WEARABLES` section** | **Selected** |

### Naming and section code (decided)

- Enum: `IPSSections.WEARABLES = 'WearableDeviceDataSection'` — follows the
  existing `PascalCase + "Section"` convention in `ips_sections.ts:2-28`
  (e.g. `MEDICAL_DEVICES = 'MedicalDeviceSection'`,
  `VITAL_SIGNS = 'VitalSignsSection'`). Goes under the "Optional Sections"
  block (not mandatory, not recommended).
- Display name / `Composition.section.title`: **"Wearable Device Data"**.
- Local code system: **`https://www.icanbwell.com/ips-section-codes`**,
  code **`wearables`** — following the same `https://www.icanbwell.com/*`
  namespace already used for `owner`, `vendor`, and `display-group` tags
  elsewhere in this codebase's data.

Every existing section's `code.coding[0].system` is hardcoded to
`'http://loinc.org'` in `fhir_summary_generator.ts:56`, keyed off
`IPS_SECTION_LOINC_CODES[sectionType]` (a flat `Record<IPSSections,
string>` of bare code strings — no per-section system override exists
today). Since there's no LOINC section code for "wearables," this needs a
small, generic enhancement: introduce a code **system** alongside the code,
defaulting to LOINC for all existing sections and overridable per section:

- Add a parallel `IPS_SECTION_CODE_SYSTEMS: Partial<Record<IPSSections,
  string>>`, defaulting to `LOINC_SYSTEM` when absent, with
  `[IPSSections.WEARABLES]: 'https://www.icanbwell.com/ips-section-codes'`.
- Update `fhir_summary_generator.ts:52-61` to read the system from this map
  instead of the hardcoded literal. This is additive — every existing
  section keeps resolving to `'http://loinc.org'` exactly as today.

## Identifying "wearable" Observations (confirmed mechanism)

Traced the actual producer of this data: `bwell-databricks/bundle/device-data-ingest-job`
(a Databricks job that streams Validic wearable data and builds FHIR
Observations via the `device-codex` package, the real single source of
truth for metric→code mappings — more authoritative than the Confluence
page, which undercounts builder methods: 85 actual vs. 69 claimed). Every
Observation it produces (`src/bwell/device_data_ingest_job/fhir/common.py`)
is stamped with:

1. **`meta.security` vendor tag** — `{system:
   "https://www.icanbwell.com/vendor", code: "validic"}`. This is the
   reliable "this Observation came from the wearable-ingestion pipeline"
   signal — it can't collide with an ordinary clinical vital sign taken
   during a visit, so **no LOINC/SNOMED code list is needed to gate
   inclusion**.
2. **`meta.security` owner tag** — `{system:
   "https://www.icanbwell.com/owner", code: "<device brand>"}` (e.g.
   `Fitbit`, `iPhone`) — the actual originating device, for display only.
   This is the exact same tag/system `TemplateUtilities.getOwnerTag`
   (`TemplateUtilities.ts:950-956`) already reads elsewhere in this repo —
   directly reusable.
3. **A second `category` coding**, system
   `https://www.icanbwell.com/display-group`, values like `cardiovascular`,
   `sleep`, `body_composition`, `activity`, `nutrition`, `metabolic`,
   `musculoskeletal`, `reproductive`, `environment` — the upstream job's
   own category grouping for the metric, alongside the standard
   `observation-category` coding (`vital-signs`, `activity`, `laboratory`,
   `survey`, `exam`).

**Filter** — much simpler than originally proposed, no hardcoded metric
code list required:

```
isWearableObservation(obs) =
  obs.resourceType === 'Observation'
  AND obs.meta?.security?.some(s =>
        s.system === 'https://www.icanbwell.com/vendor'
        AND WEARABLE_VENDOR_CODES.includes(s.code))   // starts as just ['validic']
```

`WEARABLE_VENDOR_CODES` is a list (not a single literal) so a future
non-Validic wearable integration can be added without a filter rewrite —
but only `'validic'` is confirmed today.

**Must also exclude wearables from `VITAL_SIGNS`/`DIAGNOSTIC_REPORTS`.**
`device-data-ingest-job` sets standard `observation-category` codes on
wearable Observations too (`vital-signs` for heart rate, `laboratory` for
glucose/blood-ketone). Without an exclusion, those Observations would match
the *existing* `VITAL_SIGNS` filter (`category` contains `vital-signs`) and
`DIAGNOSTIC_REPORTS` filter (`category` contains `laboratory`/`Lab`/`LAB`)
in addition to the new `WEARABLES` filter — rendering as a raw row in Vital
Signs/Results Summary *and* an aggregated row in the new section, which is
exactly the problem this feature exists to solve. Both filters need
`AND NOT isWearableObservation(resource)` added.

## Rendering — no hardcoded metric table needed

Because every field needed for display already lives on the resource
(`code.coding[0].display` for the metric name, the `display-group`
category coding for grouping, `valueQuantity.unit` for the unit,
`meta.security` owner tag for source device), **this repo does not need to
duplicate `device-codex`'s ~85-entry LOINC/SNOMED registry**. That avoids
a maintenance-drift risk (the Confluence copy of that table is already
stale in two of its summary counts) and keeps this repo as a pure
*consumer* of whatever codes upstream assigns.

New `WearablesTemplate` (implements `ISummaryTemplate`), following the
`MedicalDevicesTemplate` pattern:

```
<h4>Activity</h4>                          <!-- from display-group category, Title Cased -->
<table>
  <thead><tr>
    <th>Metric</th><th>Latest</th><th>Average</th><th>Min</th><th>Max</th>
    <th># Readings</th><th>Date Range</th><th>Source Device</th>
  </tr></thead>
  <tbody><!-- one row per distinct code.coding[0].code within this group --></tbody>
</table>
<h4>Sleep</h4>
...
<h4>Other</h4>                             <!-- fallback bucket: no display-group tag present -->
```

Per metric group (grouped by `code.coding[0].code`+`system`, sub-grouped by
the `display-group` category code — falling back to a single "Other"
bucket if that category coding is absent, e.g. for a future non-Validic
source that doesn't set it): `count`, `average` (mean of
`valueQuantity.value`, rounded to 1 decimal), `min`, `max`, `latest value +
date` (most recent by `effectiveDateTime`), unit and display name taken
directly from the resource, and "Source Device" from the owner tag (via
the existing `getOwnerTag` helper) if present. Section renders `undefined`
(omitted) if no Observations match. No `generateSummaryNarrative`
(summary-composition fast path) in v1 — YAGNI.

## Files touched (per `docs/adding-a-new-ips-section.md` checklist)

1. `src/structures/ips_sections.ts` — add `WEARABLES = 'WearableDeviceDataSection'` under the "Optional Sections" block.
2. `src/structures/ips_section_loinc_codes.ts` — add `WEARABLE_VENDOR_SECURITY_SYSTEM` (`'https://www.icanbwell.com/vendor'`), `WEARABLE_VENDOR_CODES` (`['validic']` — extensible array; Validic is the only supported vendor today but more are expected later), `DISPLAY_GROUP_CATEGORY_SYSTEM` (`'https://www.icanbwell.com/display-group'`) constants; add `[WEARABLES]: 'wearables'` to `IPS_SECTION_LOINC_CODES` and `[WEARABLES]: 'Wearable Device Data'` to `IPS_SECTION_DISPLAY_NAMES`; add the new per-section code-system map (`[WEARABLES]: 'https://www.icanbwell.com/ips-section-codes'`) described above. No metric code table needed.
3. `src/generators/fhir_summary_generator.ts` — read section code `system` from the new map instead of the hardcoded LOINC literal (lines 52-61).
4. `src/structures/ips_section_resource_map.ts` — `IPSSectionResourcesMap[WEARABLES] = ['Observation']`; add the shared `isWearableObservation` predicate (vendor-tag check only); use it for `IPSSectionResourceFilters[WEARABLES]` and to exclude wearable Observations from the existing `VITAL_SIGNS` and `DIAGNOSTIC_REPORTS` filters (see "Must also exclude wearables" above).
5. `src/narratives/templates/typescript/WearablesTemplate.ts` — new, per the rendering design above.
6. `src/narratives/templates/typescript/TemplateUtilities.ts` — small helper to read the `display-group` category coding off an `Observation` (the owner-tag helper already exists and is reused as-is).
7. `src/narratives/templates/typescript/TypeScriptTemplateMapper.ts` — register `WearablesTemplate` for `IPSSections.WEARABLES` (compile-time enforced).
8. `sections.md` — document the new section (local code, resource, filter, fields).
9. Tests: synthetic fixtures under `tests/fhir-summary-bundle/fixtures/` shaped like real `device-data-ingest-job` output (vendor tag, owner tag, display-group category — no real fixture in this repo has this shape yet), unit tests for the filter predicate and aggregation helper, regression assertion in `fhir-summary-bundle.test.ts`, and a `getRemainingResourcesFromCompositionBundle` check.

Optional vs. recommended: per `docs/adding-a-new-ips-section.md` §3, this
is **optional** (not mandatory, not in `IPSRecommendedSections`) — it
simply won't render when there's no matching data.

## Risks / assumptions

- **Mixed-unit aggregation across devices is not detected.** Metrics are
  grouped by `code.coding[0].code`+`system` only (per this spec's design),
  with the displayed unit taken from the first reading that has one. If a
  patient's paired devices report the same LOINC code in different units
  (e.g. weight in `kg` from one scale and `[lb_av]` from another; sleep
  duration in `min` vs `h`), the average/min/max would silently mix
  incompatible units under one confident-looking label. Surfaced by the
  final whole-branch review; not fixed in v1 — flagged here as a known
  design gap for whoever extends the vendor/device list. A future fix
  would need to key groups on code+unit (or normalize units before
  aggregating, or skip aggregation and show only "Latest" when a group's
  units are heterogeneous).
- **No real fixture in this repo currently exercises this path.** The
  vendor-tag/owner-tag/display-group mechanism is confirmed by reading the
  actual producer's source code (`device-data-ingest-job`), not by finding
  it in a bundle here — test coverage will be synthetic, built to match
  that job's real output shape.
- **Filter depends entirely on the vendor tag being present.** If a bundle
  reaches this pipeline from a source other than this specific Validic job
  (e.g. a different aggregator, or hand-authored test data) without that
  tag, nothing renders — silently, consistent with every other section's
  "no matching data" behavior. Extend `WEARABLE_VENDOR_CODES` if/when
  another wearable vendor integration exists.
- **The `display-group` category coding may be absent** on Observations
  from a hypothetical future non-Validic wearable source — handled via the
  "Other" fallback bucket, but worth confirming this repo will only ever
  see Validic-sourced wearable data for now.

## Decisions (previously open questions — resolved)

1. **Section naming** — `IPSSections.WEARABLES = 'WearableDeviceDataSection'`,
   display "Wearable Device Data" (see Naming section above).
2. **Local code system** — `https://www.icanbwell.com/ips-section-codes`,
   code `wearables`.
3. **Category grouping** — confirmed: group table rows by the upstream
   `display-group` categories, with an "Other" fallback bucket for
   Observations lacking that coding.
4. **Vendor list** — Validic is the only supported source today, but more
   are expected later, so `WEARABLE_VENDOR_CODES` ships as an array
   (`['validic']`) rather than a single hardcoded literal, so a future
   vendor can be added without touching the filter logic.

Design is approved. Next step: hand this spec to the writing-plans skill
to produce a concrete implementation plan.
