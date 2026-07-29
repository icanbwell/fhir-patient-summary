# Medical Device Data Summary — How It's Built

> **Note on scope:** this codebase has no concept of "wearables" specifically (no
> reference to Fitbit/Apple Health/steps/heart-rate streams, etc. — verified by a
> full-repo search). The closest and only device-related summary is the IPS
> **"History of Medical Devices"** section, which is generated from generic FHIR
> `Device` / `DeviceUseStatement` resources. If a wearable (e.g. a CGM, pacemaker,
> fitness tracker) is represented as a `Device` resource with a `DeviceUseStatement`
> in the input bundle, it will appear here — there is no wearable-specific handling.

## Where the code lives

| Concern | File |
|---|---|
| Section identity, LOINC code | `src/structures/ips_sections.ts` (`IPSSections.MEDICAL_DEVICES = 'MedicalDeviceSection'`), `src/structures/ips_section_loinc_codes.ts` (`46264-8`, "History of Medical Devices") |
| Resource selection (which FHIR resources go into this section) | `src/structures/ips_section_resource_map.ts` |
| Orchestration (bundle → section → composition) | `src/generators/fhir_summary_generator.ts` (`ComprehensiveIPSCompositionBuilder`) |
| Narrative (HTML table) generation | `src/generators/narrative_generator.ts` → `src/narratives/templates/typescript/TypeScriptTemplateMapper.ts` → `src/narratives/templates/typescript/MedicalDevicesTemplate.ts` |
| Shared formatting/lookup helpers | `src/narratives/templates/typescript/TemplateUtilities.ts` |

## Algorithm

### 1. Resource selection
`ComprehensiveIPSCompositionBuilder.readBundleAsync` iterates every resource in the
input FHIR Bundle and, for the `MEDICAL_DEVICES` section, keeps any resource matching
the filter in `IPSSectionResourceFilters[IPSSections.MEDICAL_DEVICES]`
(`src/structures/ips_section_resource_map.ts:43`):

```ts
(resource) => ['DeviceUseStatement', 'Device'].includes(resource.resourceType)
```

Unlike most other sections (Problems, Medications, Immunizations, …), there is
**no status filter** — every `DeviceUseStatement` regardless of `status`
(active/completed/entered-in-error/etc.) is a candidate. `Device` resources are
pulled in only because `DeviceUseStatement.device` references them for the device
name/type — they aren't rendered as their own rows.

### 2. Section build
`makeSectionAsync` (`fhir_summary_generator.ts:80`) takes the filtered resources and:
1. Adds them to the builder's overall resource set (so they end up in the final Bundle).
2. Calls `NarrativeGenerator.generateNarrativeAsync` to produce the section's HTML narrative.
3. If a narrative is produced, wraps it into a `CompositionSection` with
   `title: "History of Medical Devices"`, `code.coding[0].code: "46264-8"`, and
   `entry` references to every candidate resource (`resourceType/id`).
4. If no narrative is produced (see step 4 below), the section is **silently omitted**
   from the Composition — Medical Devices is an *optional* IPS section, so there's no
   "no data available" placeholder like the mandatory sections get.

### 3. Narrative generation dispatch
`NarrativeGenerator.generateNarrativeContentAsync` delegates to
`TypeScriptTemplateMapper`, which maps `IPSSections.MEDICAL_DEVICES` →
`MedicalDevicesTemplate` (`TypeScriptTemplateMapper.ts:36`). Two entry points exist:

- `generateNarrative()` — the path actually used today, backed by
  `generateStaticNarrative()` (raw-resource path, described below).
- `generateSummaryNarrative()` — designed for a pre-aggregated `Composition`
  ("summary composition") input, but **`MEDICAL_DEVICES` is not registered in
  `IPSSectionSummaryCompositionFilter`** (`ips_section_resource_map.ts:82-92`), so
  `getSummaryCompositionFilterForSection` always returns `undefined` for this
  section — the summary-composition code path exists but is currently dead for
  Medical Devices specifically, even if `SUMMARY_COMPOSITION_SECTIONS=all` is set.

### 4. Row-building algorithm (`MedicalDevicesTemplate.generateStaticNarrative`)

Given the candidate resources for the section:

1. **Filter** to `DeviceUseStatement` resources only (`Device` resources are kept
   aside for lookups in step 4c).
2. **Sort** descending by `recordedOn` (most recent first). Statements with a
   missing/non-string `recordedOn` are left in relative order (comparator returns `0`).
3. **Deduplicate by device name**, keeping only the first (i.e. most recent) occurrence.
   A `Set<string>` of already-added device names is checked before each row.
4. For each remaining `DeviceUseStatement`:
   - **Resolve device name**: follow `dus.device` reference → matching `Device`
     resource in the bundle → concatenate `Device.deviceName[].name`
     (`TemplateUtilities.renderDevice`). If the resolved name is empty or literally
     `"unknown"` (case-insensitive), the row is **skipped**.
   - **Resolve code/system**: `Device.type` (a `CodeableConcept`) is rendered via
     `codeableConceptCoding()` as `"{code} ({friendly system name})"`, preferring a
     coding flagged `preferred` via the b.well `intelligence` extension, else the
     first coding. Friendly system names come from
     `src/structures/codingSystemDisplayNames.ts`. **If this resolves to an empty
     string (no `Device.type` coding at all), the row is skipped** — a device with
     a name but no type code never appears in the table.
   - **Status**: `DeviceUseStatement.status`, HTML-escaped as-is (no vocabulary lookup).
   - **Comments**: `DeviceUseStatement.note[]`, rendered as `<br>`-joined text.
   - **Date Recorded**: `DeviceUseStatement.recordedOn`, formatted via Luxon into the
     requested `timezone` (or UTC if none given).
   - **Source**: the resource's "owner" tag — the first
     `meta.security[]` entry whose `system` is
     `https://www.icanbwell.com/owner`, displayed as its `display` (falling back to `code`).
5. If **zero rows** survive filtering/dedup, the whole narrative is `undefined` and
   (per step 2.4) the section is dropped entirely from the Composition.
6. The resulting HTML table is minified (`html-minifier-terser`, conservative mode)
   and wrapped as a FHIR `Narrative` (`status: 'generated'`, XHTML `div`).

### 5. Final assembly
`ComprehensiveIPSCompositionBuilder.buildBundleAsync` assembles all sections
(including Medical Devices, if non-empty) into a single IPS `Composition`
(LOINC `60591-5`, "Patient summary Document"), and produces the final `document`-type
FHIR `Bundle` containing the Composition, the Patient, every resource referenced by any
section (including the `DeviceUseStatement`/`Device` resources here), and an
`Organization` for the authoring org.

## How to tell which readings are device readings, given a generated IPS

There are two different questions bundled here, with two different answers:

### "Which entries are device *records* (the devices themselves)?"

Look at the `Composition.section` entry whose `code.coding[0].code` is `46264-8`
(title "History of Medical Devices"). Its `entry` array lists
`{reference: "DeviceUseStatement/{id}", display: "DeviceUseStatement"}` and
`{reference: "Device/{id}", display: "Device"}` items — the `display` field (or the
resource-type prefix on the reference itself) tells you which references are devices
vs device-use records. Resolve each reference against the Bundle's other `entry[]`
items to get the full resource.

Note: this `entry` list is built from **all** resources that passed the section
filter (step 1 above), *before* the template's dedup/skip logic runs. So it can
contain more `DeviceUseStatement`/`Device` items than there are visible rows in the
section's rendered HTML table — the table is a curated view, the `entry` list is the
complete backing set.

### "Which readings/observations *elsewhere* in the IPS (Vital Signs, Results, etc.) were captured by a device?"

**This library currently gives you no way to tell from the generated narrative.**
FHIR's `Observation` resource has a `device` field (`Observation.device`, a
`Reference`, see `src/types/resources/Observation.ts:69`) that upstream systems can
populate when a reading came from a device (a glucometer, a wearable, a monitor,
etc.) rather than manual entry. However:

- None of the narrative templates that render `Observation`s —
  `VitalSignsTemplate`, `DiagnosticResultsTemplate`, `SocialHistoryTemplate`,
  `PregnancyTemplate` — read or display `Observation.device` (or `Observation.method`,
  which could also hint at device vs. manual capture). Check any of their column
  lists (e.g. Vital Signs renders only Name / Code (System) / Result / Date / Source)
  — there is no Device column anywhere outside the Medical Devices section itself.
- The section resource filters (`IPSSectionResourceFilters` in
  `src/structures/ips_section_resource_map.ts`) don't branch on `Observation.device`
  either — an Observation lands in Vital Signs / Results / Social History purely by
  its `category`/`code`, regardless of whether it has a device reference.

**What you *can* do:** the original `Observation` resource is passed into the output
Bundle unmodified (`ComprehensiveIPSCompositionBuilder` never strips fields off
resources — it only reads them to build narrative text). So if the source data has
`Observation.device` populated, that field is still present on the corresponding
`Bundle.entry[].resource` — you just have to inspect the raw resource yourself
(`bundle.entry.find(e => e.fullUrl.endsWith('Observation/{id}')).resource.device`);
the rendered HTML narrative and the section's `entry` display name won't surface it.

If you need device attribution to be visible in the generated summary itself, that
would require a code change: adding a "Device" column (resolved the same way
`MedicalDevicesTemplate` resolves `DeviceUseStatement.device`) to the relevant
templates in `src/narratives/templates/typescript/`.

## Table output columns

| Column | Source |
|---|---|
| Device | `Device.deviceName[].name` (via `DeviceUseStatement.device` reference) |
| Code (System) | `Device.type` coding, rendered as `code (system display name)` |
| Status | `DeviceUseStatement.status` |
| Comments | `DeviceUseStatement.note[].text` |
| Date Recorded | `DeviceUseStatement.recordedOn` (timezone-formatted) |
| Source | `meta.security[]` entry with `system = https://www.icanbwell.com/owner` |

## Known gaps / things to be aware of

- **No wearable-specific concept exists.** A wearable would only surface here if it's
  represented as a `Device` + `DeviceUseStatement` pair — there's no ingestion or
  filtering logic tailored to activity/vitals streaming devices (e.g. no handling for
  `Observation`-based wearable readings like step counts or continuous heart rate;
  those would fall under the generic **Vital Signs** section instead, if tagged
  `category = vital-signs`, with no device-type distinction).
- **Dedup key is device *name*, not device *id*.** Two distinct `Device` resources
  that happen to share a rendered name will collapse into a single row (the more
  recently recorded one wins).
- **Rows require both a resolvable name and a `Device.type` coding.** Devices missing
  either are silently dropped — there's no partial/fallback row.
- **No status filtering.** Entered-in-error or stopped `DeviceUseStatement` records
  are shown identically to active ones (no visual distinction beyond the `Status` column).
- **Summary-composition path is effectively unused** for this section today (see
  step 3) — even though the plumbing (`makeSectionFromSummaryAsync`,
  `generateSummaryNarrative`) exists, `MEDICAL_DEVICES` has no entry in
  `IPSSectionSummaryCompositionFilter`, so it always falls back to the raw-resource path.
