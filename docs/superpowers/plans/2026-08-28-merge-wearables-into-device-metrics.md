# Merge WEARABLES into DEVICE_METRICS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the `WEARABLES` IPS section entirely and port its per-metric aggregation (average/min/max/count/date-range, grouped by category) into `DeviceMetricsTemplate`, so `DEVICE_METRICS` becomes the single section for wearable/connected-device reading data, without regressing its existing composition-only sourcing or its stub-only (`includeSummaryCompositionOnly`) rendering guarantee.

**Architecture:** `DeviceMetricsTemplate.generateSummaryNarrative` currently derives every displayed value from pre-rendered text columns baked into the summary Composition by the upstream ingest pipeline (works even when the referenced Observations aren't resolvable, e.g. stub-only mode) but only shows the *latest* reading — no aggregate stats, because the Composition's per-metric sub-section only carries one flat set of columns. To add real average/min/max/date-range, the template needs the actual Observation resources each metric's `entry[]` list references. `ComprehensiveIPSCompositionBuilder.makeSectionFromSummaryAsync` already resolves these (capped) but never passes them to the narrative layer. This plan threads them through as a new, additive, optional parameter on `ISummaryTemplate.generateSummaryNarrative` (safe for every other summary template, which simply won't declare it). `DeviceMetricsTemplate` then runs a **dual path** per metric: if real (non-stub) Observations resolve, compute the full aggregate row using logic ported from `WearablesTemplate`; otherwise fall back to exactly today's column-only rendering, so the stub-only production path (`$summary?_includeSummaryCompositionOnly=true`) never regresses.

**Tech Stack:** TypeScript, Jest, existing `TemplateUtilities` helpers.

**Spec:** No separate spec doc — the design was worked out directly with the user in conversation (see task descriptions below for the exact decisions and their rationale).

## Global Constraints

- `npm run lint && npm run typecheck && npm test` must pass after every task, and at the end (baseline: 16 suites / 105 tests, all passing).
- Do not add a raw-resource (heuristic) fallback path to `DEVICE_METRICS`. Its `IPSSectionResourceFilters` entry stays `() => false` — this is Tom Schneider's explicit, documented design decision in `ips_section_resource_map.ts` and must not be reversed.
- `includeSummaryCompositionOnly` mode (stub resources, no real field data) must keep rendering exactly what it renders today for `DEVICE_METRICS` — no visible regression, even though no test currently pins this down for narrative content (only entry-cap tests do).
- No other section's summary-composition path (Allergy, Problem, Medication, Immunization, Vital Signs, Care Plan, Procedures) may change behavior. The new parameter is optional and additive.
- Preserve every existing `DeviceMetricsTemplate` guarantee: skips metrics with an unknown/missing name, escapes all untrusted text, uses the section's own LOINC code/title.

---

### Task 1: Thread resolved Observations into `DeviceMetricsTemplate` and add per-metric aggregate stats

**Files:**
- Modify: `src/narratives/templates/typescript/interfaces/ITemplate.ts`
- Modify: `src/generators/narrative_generator.ts`
- Modify: `src/narratives/templates/typescript/TypeScriptTemplateMapper.ts`
- Modify: `src/generators/fhir_summary_generator.ts:244-250` (the `makeSectionFromSummaryAsync` narrative call)
- Modify: `src/narratives/templates/typescript/DeviceMetricsTemplate.ts` (full rewrite)
- Modify: `tests/generators/device_metrics_section.test.ts` (update existing rendering test, add new tests)

**Interfaces:**
- Consumes: `TemplateUtilities.getDisplayGroupCategory(obs: TObservation): string | undefined`, `.renderPeriod(period: TPeriod, timezone: string | undefined): string`, `.extractObservationValue(obs): ObservationValueType | null`, `.extractObservationValueUnit(obs): string`, `.extractObservationSummaryValue(data: Record<string, any>, timezone): string`, `.extractObservationSummaryEffectiveTime(data: Record<string, any>, timezone): string`, `.codeableConceptCoding(cc?: TCodeableConcept | null): string`, `.capitalizeFirstLetter(text): string`, `.renderTextAsHtml(text): string` — all pre-existing on `TemplateUtilities`, no changes needed there.
- Produces: `ISummaryTemplate.generateSummaryNarrative(resource: TComposition[], timezone: string | undefined, now?: Date, underlyingResources?: TDomainResource[]): string | undefined` — the new trailing parameter every later task can rely on.

- [ ] **Step 1: Write the failing test for the new rendering (aggregate stats + category grouping)**

Replace the existing `'renders one narrative row per metric, naming the source device'` test in `tests/generators/device_metrics_section.test.ts` with an assertion on the new richer output. Insert this **in place of** that test (same file, same `describe` block):

```typescript
  it('renders per-metric aggregate stats computed from the resolved Observations, grouped by category', async () => {
    const section = await buildSection(buildBundle([deviceComposition]));

    const div = section?.text?.div ?? '';
    expect(div).toContain('Heart rate');
    expect(div).toContain('Body weight');
    expect(div).toContain('Device/oura');
    // Latest: most recent heart-rate reading (hr-0: 60 count/min, 2026-01-28).
    expect(div).toContain('60 count/min');
    // Average across the 10 capped heart-rate readings (60..69): 64.5.
    expect(div).toContain('64.5 count/min');
    // Min/max across the capped 10 (60..69).
    expect(div).toContain('69 count/min');
    // Date range: earliest (hr-9, 2026-01-19) to latest (hr-0, 2026-01-28).
    expect(div).toContain('1/28/2026');
    expect(div).toContain('1/19/2026');
    // Reading count reflects the capped entry list, not the full 15 generated.
    expect(div).toContain('<td>10</td>');
    // No display-group category tag on the fixture Observations -> single "Other" bucket.
    expect(div).toContain('<h4>Other</h4>');
  });

  it('falls back to the Composition-embedded latest-value columns when the underlying Observations are not resolvable (stub-only mode)', async () => {
    const section = await buildSection(
      buildBundle([deviceComposition]),
      true,
      true // includeSummaryCompositionOnly: resources are stub placeholders, no real fields
    );

    const div = section?.text?.div ?? '';
    expect(div).toContain('Heart rate');
    // Latest still shows the Composition's own pre-rendered value/date, straight from its columns.
    expect(div).toContain('60 count/min');
    expect(div).toContain('1/28/2026');
    // No real Observations were resolvable, so the aggregate columns are not computable.
    expect(div).toContain('—');
  });

  it('computes average/min/max over valueInteger readings the same way as valueQuantity', async () => {
    const stepsObservations = Array.from({ length: 3 }, (_, i) => ({
      resourceType: 'Observation',
      id: `steps-${i}`,
      status: 'final',
      code: { coding: [{ system: 'http://loinc.org', code: '55423-8', display: 'Steps' }] },
      subject: { reference: 'Patient/patient-1' },
      effectiveDateTime: `2026-01-${String(20 + i).padStart(2, '0')}T00:00:00Z`,
      valueInteger: 1000 * (i + 1),
      device: { reference: 'Device/oura' },
    })) as unknown as TObservation[];
    const stepsComposition = {
      ...(deviceComposition as unknown as Record<string, unknown>),
      id: 'device-metrics-steps',
      section: [metricSection('Steps', '55423-8', stepsObservations)],
    } as unknown as TComposition;

    const section = await buildSection(
      buildBundle([stepsComposition, ...stepsObservations])
    );

    const div = section?.text?.div ?? '';
    // Average of 1000/2000/3000 is 2000; valueInteger has no unit.
    expect(div).toContain('<td>2000</td>');
    expect(div).toContain('<td>3000</td>');
    expect(div).toContain('<td>1000</td>');
  });
```

Add the required import at the top of the test file (it does not currently import `TDomainResource`, which is not needed — no new import required for these three tests since they reuse existing helpers and types already imported).

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/generators/device_metrics_section.test.ts`
Expected: the two new tests and the rewritten row-count test FAIL (current template only shows one flat row per metric with no average/min/max/category header, and ignores `valueInteger`).

- [ ] **Step 3: Add the new optional parameter to `ISummaryTemplate`**

In `src/narratives/templates/typescript/interfaces/ITemplate.ts`, change:

```typescript
export interface ISummaryTemplate extends ITemplate {
  /**
   * Generate HTML narrative for FHIR resources
   * @param resource - FHIR Composition resources containing section summary
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @param now - Optional current date to use for calculations (defaults to new Date())
   * @returns HTML string for rendering
   */
  generateSummaryNarrative(resource: TComposition[], timezone: string | undefined, now?: Date): string | undefined;
}
```

to:

```typescript
export interface ISummaryTemplate extends ITemplate {
  /**
   * Generate HTML narrative for FHIR resources
   * @param resource - FHIR Composition resources containing section summary
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @param now - Optional current date to use for calculations (defaults to new Date())
   * @param underlyingResources - Optional resolved resources referenced by the summary
   * Composition's section.entry[] (e.g. the actual Observations behind a device-metric
   * group), capped the same way the generator caps entries for bundle inclusion. Templates
   * that don't need per-reading data (the common case) can simply omit this parameter -
   * TypeScript allows an implementation to declare fewer parameters than the interface.
   * @returns HTML string for rendering
   */
  generateSummaryNarrative(
    resource: TComposition[],
    timezone: string | undefined,
    now?: Date,
    underlyingResources?: TDomainResource[]
  ): string | undefined;
}
```

- [ ] **Step 4: Thread the parameter through `NarrativeGenerator` and `TypeScriptTemplateMapper`**

In `src/narratives/templates/typescript/TypeScriptTemplateMapper.ts`, change the `generateNarrative` method:

```typescript
  static generateNarrative(
    section: IPSSections,
    resources: TDomainResource[],
    timezone: string | undefined,
    useSectionSummary: boolean = false,
    now?: Date
  ): string | undefined {
    const templateClass: ITemplate = this.sectionToTemplate[section];

    if (!templateClass) {
      throw new Error(`No template found for section: ${section}`);
    }

    const summaryTemplateClass = templateClass as ISummaryTemplate;
    const supportsSummaryNarrative = typeof summaryTemplateClass.generateSummaryNarrative === 'function';

    return useSectionSummary && supportsSummaryNarrative
      ? summaryTemplateClass.generateSummaryNarrative(
          resources as TComposition[],
          timezone,
          now
        )
      : templateClass.generateNarrative(resources, timezone, now);
  }
```

to:

```typescript
  static generateNarrative(
    section: IPSSections,
    resources: TDomainResource[],
    timezone: string | undefined,
    useSectionSummary: boolean = false,
    now?: Date,
    summaryUnderlyingResources?: TDomainResource[]
  ): string | undefined {
    const templateClass: ITemplate = this.sectionToTemplate[section];

    if (!templateClass) {
      throw new Error(`No template found for section: ${section}`);
    }

    const summaryTemplateClass = templateClass as ISummaryTemplate;
    const supportsSummaryNarrative = typeof summaryTemplateClass.generateSummaryNarrative === 'function';

    return useSectionSummary && supportsSummaryNarrative
      ? summaryTemplateClass.generateSummaryNarrative(
          resources as TComposition[],
          timezone,
          now,
          summaryUnderlyingResources
        )
      : templateClass.generateNarrative(resources, timezone, now);
  }
```

In `src/generators/narrative_generator.ts`, change both `generateNarrativeContentAsync` and `generateNarrativeAsync`:

```typescript
    static async generateNarrativeContentAsync<T extends TDomainResource>(
        section: IPSSections,
        resources: T[],
        timezone: string | undefined,
        useSectionSummary: boolean = false,
        now?: Date,
        summaryUnderlyingResources?: TDomainResource[]
    ): Promise<string | undefined> {
        if (!resources || resources.length === 0) {
            return undefined; // No resources to generate narrative
        }

        try {
            // Use the TypeScript template mapper to generate HTML
            const content = TypeScriptTemplateMapper.generateNarrative(section, resources, timezone, useSectionSummary, now, summaryUnderlyingResources);
            if (!content) {
                return undefined; // No content generated
            }
            return content;
        } catch (error) {
            console.error(`Error generating narrative for section ${section}:`, error);
            return `<div class="error">Error generating narrative: ${error instanceof Error ? error.message : String(error)}</div>`;
        }
    }
```

```typescript
    static async generateNarrativeAsync<T extends TDomainResource>(
        section: IPSSections,
        resources: T[],
        timezone: string | undefined,
        minify: boolean = true,
        useSectionSummary: boolean = false,
        now?: Date,
        summaryUnderlyingResources?: TDomainResource[]
    ): Promise<Narrative | undefined> {
        const content = await this.generateNarrativeContentAsync(section, resources, timezone, useSectionSummary, now, summaryUnderlyingResources);
        if (!content) {
            return undefined;
        }
        return await this.createNarrativeAsync(content, minify);
    }
```

- [ ] **Step 5: Pass the resolved resources at the `DEVICE_METRICS` call site**

In `src/generators/fhir_summary_generator.ts`, in `makeSectionFromSummaryAsync`, change:

```typescript
        let narrative = await NarrativeGenerator.generateNarrativeAsync(
            sectionType,
            summaryCompositions,
            timezone,
            true,
            true
        );
```

to:

```typescript
        let narrative = await NarrativeGenerator.generateNarrativeAsync(
            sectionType,
            summaryCompositions,
            timezone,
            true,
            true,
            undefined,
            sectionResources
        );
```

`sectionResources` is already in scope at this point in the function (populated by all three branches above it — stub-only, capped-and-resolved, and uncapped) and needs no other change.

- [ ] **Step 6: Run typecheck to confirm the plumbing compiles and every other summary template is unaffected**

Run: `npm run typecheck`
Expected: PASS. `AllergyIntoleranceTemplate`, `ProblemListTemplate`, `MedicationSummaryTemplate`, etc. all declare `generateSummaryNarrative` with 2-3 parameters and remain valid implementations of the interface (TypeScript permits fewer declared parameters than the interface signature).

- [ ] **Step 7: Rewrite `DeviceMetricsTemplate.ts`**

Replace the entire contents of `src/narratives/templates/typescript/DeviceMetricsTemplate.ts` with:

```typescript
// DeviceMetricsTemplate.ts - narrative for the Personal Health Monitoring
// Devices section (measurements captured by a patient's connected devices).
import { TemplateUtilities } from './TemplateUtilities';
import { ISummaryTemplate } from './interfaces/ITemplate';
import { TComposition } from '../../../types/resources/Composition';
import { TCompositionSection } from '../../../types/partials/CompositionSection';
import { TDomainResource } from '../../../types/resources/DomainResource';
import { TObservation } from '../../../types/resources/Observation';
import { TPeriod } from '../../../types/partials/Period';

interface DeviceMetricRow {
  display: string;
  codeSystem: string;
  category: string;
  count: number;
  latestCell: string;
  averageCell: string;
  minCell: string;
  maxCell: string;
  latestDate: string;
  earliestDate: string;
  sourceDevice: string;
}

const NOT_AVAILABLE = '—';

/**
 * Class to generate HTML narrative for device-captured metrics.
 *
 * Unlike most templates, this one only supports the summary-composition path.
 * The section's membership comes from a curated device-metric Composition
 * produced upstream (one sub-section per metric, each already sorted most
 * recent first) — there is no safe way to derive it from raw Observations,
 * so generateNarrative returns undefined and the section is simply omitted
 * when no such Composition is present.
 *
 * Each metric's row shows real average/min/max/count/date-range stats,
 * computed from the actual Observations the caller resolved for that
 * metric's entry[] references (see `underlyingResources`) — not just the
 * single latest-value columns the Composition itself carries. When those
 * Observations aren't resolvable (e.g. includeSummaryCompositionOnly mode,
 * where entries are stub placeholders with no real fields), each row falls
 * back to exactly the Composition-embedded latest-value rendering this
 * template always used, so that production path never regresses.
 */
export class DeviceMetricsTemplate implements ISummaryTemplate {
  /**
   * Non-summary path is intentionally unsupported — see class docblock.
   * Returning undefined (never '') causes the section to be skipped entirely.
   * Parameters are omitted deliberately: TypeScript allows an implementation
   * to declare fewer parameters than the interface, and none are used here.
   */
  generateNarrative(): string | undefined {
    return undefined;
  }

  /**
   * Generate HTML narrative from the device-metric summary Composition.
   *
   * @param resources - Device-metric summary Composition resources
   * @param timezone - Optional timezone for date formatting
   * @param now - Unused; accepted to match ISummaryTemplate
   * @param underlyingResources - Resolved resources referenced by each metric's
   * entry[] (see ISummaryTemplate docblock). Used to compute real aggregate stats;
   * falls back to the Composition's own columns when a metric has none resolvable.
   * @returns HTML string, or undefined if no metric rows could be rendered
   */
  generateSummaryNarrative(
    resources: TComposition[],
    timezone: string | undefined,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    now?: Date,
    underlyingResources?: TDomainResource[]
  ): string | undefined {
    const templateUtilities = new TemplateUtilities(resources);

    // Resolve every entry reference against whatever the caller passed,
    // stub or real - this is what makes `count` reflect the capped group
    // size (see fhir_summary_generator.ts's MAX_ENTRIES_PER_GROUP) in BOTH
    // modes. A stub placeholder (includeSummaryCompositionOnly mode) is
    // exactly {resourceType, id} with no other fields - a real Observation
    // from the ingest pipeline always carries a `code`. That distinction
    // (checked per-metric below, not here) is what decides "nothing real to
    // aggregate, fall back to the Composition's own columns" vs "aggregate
    // over these real readings".
    const resourcesByReference = new Map<string, TDomainResource>();
    for (const resource of underlyingResources ?? []) {
      if (resource.resourceType === 'Observation' && resource.id) {
        resourcesByReference.set(`${resource.resourceType}/${resource.id}`, resource);
      }
    }

    const rows: DeviceMetricRow[] = [];

    for (const composition of resources) {
      for (const metricSection of composition.section ?? []) {
        const columns: Record<string, string> = {};
        for (const columnSection of metricSection.section ?? []) {
          if (columnSection.title) {
            columns[columnSection.title] = columnSection.text?.div ?? '';
          }
        }

        const metricName = columns['Metric Name'];
        // Skip rows the upstream pipeline couldn't name — they'd render as
        // an unlabeled value with no clinical meaning.
        if (!metricName || metricName.toLowerCase() === 'unknown') {
          continue;
        }

        // Escaped like every other value here — codeableConceptCoding
        // interpolates a code and system straight from the resource, so it is
        // untrusted input and must not reach the HTML unescaped.
        const codeSystem = templateUtilities.renderTextAsHtml(
          templateUtilities.codeableConceptCoding(metricSection.code)
        );

        // The device-metric ingest pipeline (unlike the wearable/validic
        // pipeline WearablesTemplate read from) names the source device via
        // this plain composition column, not a meta.security owner tag - so
        // it's read once here and passed to both branches below.
        const sourceDevice = columns['Device'] ?? '';

        const resolvedResources = (metricSection.entry ?? [])
          .map(entry => entry.reference ? resourcesByReference.get(entry.reference) : undefined)
          .filter((resource): resource is TDomainResource => resource !== undefined);
        // Prefer the resolved (capped) count; if nothing resolved at all -
        // e.g. underlyingResources wasn't passed - fall back to the
        // Composition's own uncapped entry list rather than showing 0.
        const count = resolvedResources.length > 0 ? resolvedResources.length : (metricSection.entry?.length ?? 0);
        const realObservations = resolvedResources.filter((resource): resource is TObservation => 'code' in resource);

        const row = realObservations.length > 0
          ? DeviceMetricsTemplate.buildAggregateRow(metricName, codeSystem, count, sourceDevice, realObservations, templateUtilities, timezone)
          : DeviceMetricsTemplate.buildFallbackRow(metricName, codeSystem, count, sourceDevice, columns, templateUtilities, timezone);

        rows.push(row);
      }
    }

    if (rows.length === 0) {
      return undefined;
    }

    return DeviceMetricsTemplate.renderRowsByCategory(rows, templateUtilities);
  }

  /**
   * Builds a metric's row from its real, resolved Observations - full average/
   * min/max/count/date-range stats, the same aggregation WearablesTemplate uses.
   */
  private static buildAggregateRow(
    metricName: string,
    codeSystem: string,
    count: number,
    sourceDevice: string,
    observations: TObservation[],
    templateUtilities: TemplateUtilities,
    timezone: string | undefined
  ): DeviceMetricRow {
    const category = templateUtilities.getDisplayGroupCategory(observations[0]) ?? 'Other';
    const { earliestObs, latestObs } = DeviceMetricsTemplate.findEarliestAndLatest(observations);
    const earliestDateValue = earliestObs.effectiveDateTime || earliestObs.effectivePeriod?.start;
    const latestDateValue = latestObs.effectiveDateTime || latestObs.effectivePeriod?.start;

    const numericValues = observations
      .map(obs => DeviceMetricsTemplate.getNumericReadingValue(obs))
      .filter((value): value is number => typeof value === 'number');

    let averageCell: string;
    let minCell: string;
    let maxCell: string;
    if (numericValues.length > 0) {
      const unit = observations[0].valueQuantity?.unit ?? '';
      const { sum, min, max } = DeviceMetricsTemplate.sumMinMax(numericValues);
      const average = Math.round((sum / numericValues.length) * 10) / 10;
      averageCell = DeviceMetricsTemplate.formatCell(average, unit);
      minCell = DeviceMetricsTemplate.formatCell(min, unit);
      maxCell = DeviceMetricsTemplate.formatCell(max, unit);
    } else {
      averageCell = NOT_AVAILABLE;
      minCell = NOT_AVAILABLE;
      maxCell = NOT_AVAILABLE;
    }

    let latestCell: string;
    const latestNumericValue = DeviceMetricsTemplate.getNumericReadingValue(latestObs);
    if (typeof latestNumericValue === 'number') {
      latestCell = DeviceMetricsTemplate.formatCell(latestNumericValue, latestObs.valueQuantity?.unit ?? '');
    } else {
      const rawValue = templateUtilities.extractObservationValue(latestObs);
      const stringValue = DeviceMetricsTemplate.stringifyExtractedValue(rawValue, templateUtilities, timezone);
      const unit = templateUtilities.extractObservationValueUnit(latestObs);
      latestCell = unit && !stringValue.includes(unit) ? DeviceMetricsTemplate.formatCell(stringValue, unit) : stringValue;
    }

    return {
      display: templateUtilities.capitalizeFirstLetter(metricName),
      codeSystem,
      category,
      count,
      latestCell,
      averageCell,
      minCell,
      maxCell,
      latestDate: latestDateValue ? templateUtilities.renderTime(latestDateValue, timezone) : '',
      earliestDate: earliestDateValue ? templateUtilities.renderTime(earliestDateValue, timezone) : '',
      sourceDevice,
    };
  }

  /**
   * Builds a metric's row from the Composition's own pre-rendered columns only -
   * used when no real Observation resolved for this metric (stub-only mode, or an
   * entry reference the caller didn't resolve). Matches this template's original,
   * pre-aggregate-stats rendering exactly, so that path never regresses.
   */
  private static buildFallbackRow(
    metricName: string,
    codeSystem: string,
    count: number,
    sourceDevice: string,
    columns: Record<string, string>,
    templateUtilities: TemplateUtilities,
    timezone: string | undefined
  ): DeviceMetricRow {
    const latestCell = templateUtilities.extractObservationSummaryValue(columns, timezone) || NOT_AVAILABLE;
    const latestDate = templateUtilities.extractObservationSummaryEffectiveTime(columns, timezone);
    return {
      display: templateUtilities.capitalizeFirstLetter(metricName),
      codeSystem,
      category: 'Other',
      count,
      latestCell,
      averageCell: NOT_AVAILABLE,
      minCell: NOT_AVAILABLE,
      maxCell: NOT_AVAILABLE,
      latestDate,
      earliestDate: latestDate,
      sourceDevice,
    };
  }

  private static renderRowsByCategory(rows: DeviceMetricRow[], templateUtilities: TemplateUtilities): string {
    const byCategory = new Map<string, DeviceMetricRow[]>();
    for (const row of rows) {
      const categoryLabel = DeviceMetricsTemplate.formatCategoryLabel(row.category);
      const existing = byCategory.get(categoryLabel);
      if (existing) {
        existing.push(row);
      } else {
        byCategory.set(categoryLabel, [row]);
      }
    }

    const categoryLabels = Array.from(byCategory.keys()).sort((a, b) => {
      if (a === 'Other') return 1;
      if (b === 'Other') return -1;
      return a.localeCompare(b);
    });

    let html = `<p>This list includes measurements from each of the patient's connected devices, grouped by category. Each row shows the average, minimum, and maximum across all readings, plus the most recent value.</p>\n`;

    for (const categoryLabel of categoryLabels) {
      const metrics = [...(byCategory.get(categoryLabel) ?? [])].sort((a, b) => a.display.localeCompare(b.display));
      html += `
        <h4>${templateUtilities.renderTextAsHtml(categoryLabel)}</h4>
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th>Code (System)</th>
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
              <td>${metric.codeSystem}</td>
              <td>${templateUtilities.renderTextAsHtml(metric.latestCell)}</td>
              <td>${templateUtilities.renderTextAsHtml(metric.averageCell)}</td>
              <td>${templateUtilities.renderTextAsHtml(metric.minCell)}</td>
              <td>${templateUtilities.renderTextAsHtml(metric.maxCell)}</td>
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
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private static effectiveDateSortKey(obs: TObservation): number {
    const date = obs.effectiveDateTime || obs.effectivePeriod?.start;
    if (!date) {
      return Number.NEGATIVE_INFINITY;
    }
    const timestamp = new Date(date).getTime();
    return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
  }

  private static findEarliestAndLatest(observations: TObservation[]): { earliestObs: TObservation; latestObs: TObservation } {
    let earliestObs = observations[0];
    let latestObs = observations[0];
    let earliestKey = DeviceMetricsTemplate.effectiveDateSortKey(earliestObs);
    let latestKey = earliestKey;
    for (const obs of observations) {
      const key = DeviceMetricsTemplate.effectiveDateSortKey(obs);
      if (key < earliestKey) {
        earliestKey = key;
        earliestObs = obs;
      }
      if (key >= latestKey) {
        latestKey = key;
        latestObs = obs;
      }
    }
    return { earliestObs, latestObs };
  }

  private static getNumericReadingValue(obs: TObservation): number | undefined {
    if (typeof obs.valueQuantity?.value === 'number') {
      return obs.valueQuantity.value;
    }
    if (typeof obs.valueInteger === 'number') {
      return obs.valueInteger;
    }
    return undefined;
  }

  private static sumMinMax(values: number[]): { sum: number; min: number; max: number } {
    let sum = 0;
    let min = values[0];
    let max = values[0];
    for (const value of values) {
      sum += value;
      if (value < min) {
        min = value;
      }
      if (value > max) {
        max = value;
      }
    }
    return { sum, min, max };
  }

  private static formatCell(value: string | number, unit: string): string {
    return unit ? `${value} ${unit}` : `${value}`;
  }

  private static stringifyExtractedValue(value: unknown, templateUtilities: TemplateUtilities, timezone: string | undefined): string {
    if (value === null || value === undefined) {
      return NOT_AVAILABLE;
    }
    if (typeof value === 'object') {
      if ('start' in value || 'end' in value) {
        return templateUtilities.renderPeriod(value as TPeriod, timezone) || NOT_AVAILABLE;
      }
      const withTextOrCode = value as { text?: string; code?: string };
      return withTextOrCode.text || withTextOrCode.code || NOT_AVAILABLE;
    }
    return String(value);
  }
}
```

Note: `TCompositionSection` is imported for documentation purposes only in this file (the code uses inline shapes via `composition.section`) — if `tsc`/eslint flags it as an unused import, remove the import line; it is not referenced by name anywhere else in the file above, so it should in fact be **omitted**. Do not include the `TCompositionSection` import in the actual file — this note exists so the implementer doesn't add it out of habit from the plan's own file list.

- [ ] **Step 8: Run the target test file and fix until green**

Run: `npm test -- tests/generators/device_metrics_section.test.ts`
Expected: all tests in this file PASS, including the two new ones and the rewritten aggregate-stats test. If `'<td>10</td>'` or similar assertions fail, print `div` (`console.log(div)`) temporarily to check actual output, fix the template, remove the debug print, and re-run — do not weaken the assertions to make them pass.

- [ ] **Step 9: Run the full suite**

Run: `npm run lint && npm run typecheck && npm test`
Expected: PASS, all suites (including every other summary-composition test file, e.g. `tests/fhir-summary-bundle/fhir-summary-bundle.test.ts`, `tests/summary.test.ts`) still green.

- [ ] **Step 10: Commit**

```bash
git add src/narratives/templates/typescript/interfaces/ITemplate.ts \
        src/generators/narrative_generator.ts \
        src/narratives/templates/typescript/TypeScriptTemplateMapper.ts \
        src/generators/fhir_summary_generator.ts \
        src/narratives/templates/typescript/DeviceMetricsTemplate.ts \
        tests/generators/device_metrics_section.test.ts
git commit -m "feat: compute real per-metric aggregate stats in DeviceMetricsTemplate

Thread the summary-composition entry[]'s resolved Observations through to
ISummaryTemplate.generateSummaryNarrative as a new optional trailing
parameter (additive - every other summary template is unaffected). Use it
in DeviceMetricsTemplate to show average/min/max/count/date-range per
metric, grouped by category, ported from WearablesTemplate's aggregation
logic - falling back to the Composition's own latest-value columns when no
real Observation resolves (e.g. includeSummaryCompositionOnly mode), so
that production path's output is unchanged."
```

---

### Task 2: Remove the `WEARABLES` section entirely

**Files:**
- Modify: `src/structures/ips_sections.ts`
- Modify: `src/structures/ips_section_loinc_codes.ts`
- Modify: `src/structures/ips_section_resource_map.ts`
- Modify: `src/narratives/templates/typescript/TypeScriptTemplateMapper.ts`
- Delete: `src/narratives/templates/typescript/WearablesTemplate.ts`
- Delete: `tests/narrativeGenerator/wearablesTemplate.test.ts`
- Modify: `sections.md`
- Delete: `docs/superpowers/specs/2026-08-21-wearable-metrics-summary-design.md`
- Delete: `docs/superpowers/plans/2026-08-21-wearable-device-data-section.md`

**Interfaces:**
- Consumes: nothing new — this task only removes references.
- Produces: nothing new — `IPSSections` no longer has a `WEARABLES` member; any code still referencing it (there should be none after this task) will fail to compile, which is the intended safety net.

- [ ] **Step 1: Remove the `WEARABLES` enum member**

In `src/structures/ips_sections.ts`, remove this line (keep `DEVICE_METRICS` and everything else):

```typescript
  WEARABLES = 'WearableDeviceDataSection',
```

- [ ] **Step 2: Run typecheck to find every remaining reference**

Run: `npm run typecheck`
Expected: FAIL, listing every file that still references `IPSSections.WEARABLES`. Use this output as the authoritative checklist for the remaining steps instead of guessing — it will catch anything this plan's file list missed.

- [ ] **Step 3: Remove `WEARABLES` from the LOINC/display-name/code-system maps**

In `src/structures/ips_section_loinc_codes.ts`, remove:

```typescript
  [IPSSections.WEARABLES]: 'wearables',
```
(from `IPS_SECTION_LOINC_CODES`), and:
```typescript
  [IPSSections.WEARABLES]: 'Wearable Device Data',
```
(from `IPS_SECTION_DISPLAY_NAMES`), and the entire `IPS_SECTION_CODE_SYSTEMS` block:
```typescript
// Per-section override for the code.coding[0].system used when building a
// Composition section's `code`. Every section not listed here defaults to
// LOINC_SYSTEM (see fhir_summary_generator.ts). WEARABLES has no HL7 IPS
// LOINC section code, so it uses a b.well-local namespace instead.
const IPS_SECTION_CODE_SYSTEMS: Partial<Record<IPSSections, string>> = {
  [IPSSections.WEARABLES]: 'https://www.icanbwell.com/ips-section-codes',
};
```
Remove the `IPS_SECTION_CODE_SYSTEMS` export from the `export { ... }` block at the bottom of the file too, and remove its consumption in `src/generators/fhir_summary_generator.ts` (the `code: { coding: [{ system: IPS_SECTION_CODE_SYSTEMS[sectionType] ?? LOINC_SYSTEM, ...` line in `addSectionAsync` — change it back to just `system: LOINC_SYSTEM` and remove the `IPS_SECTION_CODE_SYSTEMS` import) **only if** typecheck (Step 2) shows no other section uses a custom code system; if any other section was added to `IPS_SECTION_CODE_SYSTEMS` in the meantime, keep the mechanism and just drop the `WEARABLES` entry instead of deleting the whole thing. Verify by grepping: `grep -rn "IPS_SECTION_CODE_SYSTEMS" src/`.

Keep `WEARABLE_VENDOR_SECURITY_SYSTEM`, `WEARABLE_VENDOR_CODES`, and `DISPLAY_GROUP_CATEGORY_SYSTEM` — they're still used by `isWearableObservation` (kept below, now serving `DEVICE_METRICS` duplication-avoidance) and by `DeviceMetricsTemplate`'s new `getDisplayGroupCategory` call.

- [ ] **Step 4: Remove `WEARABLES` from the resource map, repoint the exclusion comments to `DEVICE_METRICS`**

In `src/structures/ips_section_resource_map.ts`:

Remove `[IPSSections.WEARABLES]: ['Observation'],` from `IPSSectionResourcesMap`.

Remove the `[IPSSections.WEARABLES]: (resource) => isWearableObservation(resource),` line from `IPSSectionResourceFilters` (keep the `[IPSSections.DEVICE_METRICS]: () => false,` entry and its docblock unchanged — that's Tom's design decision).

Update the `isWearableObservation` docblock and every "(see WEARABLES)" comment to reference `DEVICE_METRICS` instead, since that's now the section the exclusion protects:

```typescript
/**
 * True if this Observation was produced by the wearable-data ingestion pipeline
 * (identified by a meta.security vendor tag, e.g. {system: ".../vendor", code: "validic"}).
 * Used to exclude these Observations from every other Observation-based section
 * filter (VITAL_SIGNS, DIAGNOSTIC_REPORTS, SOCIAL_HISTORY, PREGNANCY_HISTORY) that
 * could otherwise also match on a shared category/LOINC/SNOMED code, so a wearable
 * reading is aggregated exactly once in DEVICE_METRICS rather than duplicated into
 * a second, unrelated section.
 */
```

Change every `// ..., excluding wearable-sourced readings (see WEARABLES)` comment to `// ..., excluding wearable-sourced readings (see DEVICE_METRICS)`. There are four such call sites (`VITAL_SIGNS`, `DIAGNOSTIC_REPORTS`, `SOCIAL_HISTORY`, `PREGNANCY_HISTORY`) — leave the actual filter logic (`!isWearableObservation(resource) && ...`) untouched, only the comments change.

- [ ] **Step 5: Remove `WearablesTemplate` registration**

In `src/narratives/templates/typescript/TypeScriptTemplateMapper.ts`, remove the import line:
```typescript
import { WearablesTemplate } from './WearablesTemplate';
```
and the map entry:
```typescript
    [IPSSections.WEARABLES]: new WearablesTemplate(),
```

- [ ] **Step 6: Delete the now-unused files**

```bash
rm src/narratives/templates/typescript/WearablesTemplate.ts
rm tests/narrativeGenerator/wearablesTemplate.test.ts
rm docs/superpowers/specs/2026-08-21-wearable-metrics-summary-design.md
rm docs/superpowers/plans/2026-08-21-wearable-device-data-section.md
```

- [ ] **Step 7: Run typecheck again to confirm nothing else references `WEARABLES` or `WearablesTemplate`**

Run: `npm run typecheck`
Expected: PASS. If it still fails, it's pointing at a real remaining reference this plan's file list missed — fix that file directly (most likely candidate: a stray import in a test file this plan didn't enumerate; search with `grep -rln "WEARABLES\|WearablesTemplate" src/ tests/` and resolve every hit).

- [ ] **Step 8: Update `sections.md`**

Remove the entire `## Wearable Device Data (Optional)` section (its content, from the `## Wearable Device Data (Optional)` heading down to just before the next `##` heading).

In the `## Personal Health Monitoring Devices (Optional)` section, add a short note after its existing description documenting the new aggregate rendering and the cap-driven "Average" caveat:

```markdown
Each row shows average/minimum/maximum/reading-count/date-range across the
readings referenced by that metric's Composition entry (capped at
`MAX_ENTRIES_PER_GROUP` per metric — see "Capping" below), not the metric's
full historical readings, plus the single most recent value. When the
underlying Observations aren't resolvable (e.g.
`includeSummaryCompositionOnly` mode), the row falls back to showing only
the Composition's own pre-rendered latest value.
```

In every "Known limitation" note that currently says `(see Wearable Device Data below)` or similarly references the removed section (in the Vital Signs, Results Summary, Social History, and History of Pregnancies sections), change the wording to reference `Personal Health Monitoring Devices` instead. Find them with:

```bash
grep -n "Wearable Device Data\|WEARABLES" sections.md
```

and edit each hit to say `Personal Health Monitoring Devices` in place of `Wearable Device Data`, keeping the rest of each sentence intact.

- [ ] **Step 9: Run the full suite**

Run: `npm run lint && npm run typecheck && npm test`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add -A src tests sections.md docs
git commit -m "chore: remove the WEARABLES section, superseded by DEVICE_METRICS's new aggregate rendering

WEARABLES and DEVICE_METRICS overlapped - both described wearable/
connected-device reading data via two different paths. DeviceMetricsTemplate
now covers WearablesTemplate's aggregate-stats rendering (Task 1), so
WEARABLES is redundant. Removes the enum member, its LOINC/display-name/
code-system entries, its resource-map filter, its template registration and
implementation, its tests, and its now-stale design docs. Keeps
isWearableObservation's exclusion of vendor-tagged Observations from
VITAL_SIGNS/DIAGNOSTIC_REPORTS/SOCIAL_HISTORY/PREGNANCY_HISTORY, repointed
to protect DEVICE_METRICS instead."
```

---

### Task 3: Final verification and push

**Files:** none (verification only).

**Interfaces:** none.

- [ ] **Step 1: Run the full local verification suite one more time from a clean state**

```bash
npm run lint && npm run typecheck && npm test
```

Expected: PASS. Note the final suite/test counts in your report — they will differ from the 16/105 baseline (net: minus `wearablesTemplate.test.ts`'s suite, plus the three new tests added to `device_metrics_section.test.ts` in Task 1).

- [ ] **Step 2: Review the full diff for anything unintended**

```bash
git diff origin/PHR-3327...HEAD --stat
```

Confirm the changed-file list matches this plan's scope: `ITemplate.ts`, `narrative_generator.ts`, `TypeScriptTemplateMapper.ts`, `fhir_summary_generator.ts`, `DeviceMetricsTemplate.ts`, `device_metrics_section.test.ts`, `ips_sections.ts`, `ips_section_loinc_codes.ts`, `ips_section_resource_map.ts`, `sections.md`, plus the deletions (`WearablesTemplate.ts`, `wearablesTemplate.test.ts`, the two `docs/superpowers/...` files). No unrelated files should appear.

- [ ] **Step 3: Push**

```bash
git push origin worktree-wearable-device-data-section
```

- [ ] **Step 4: Verify PR #94's CI**

```bash
gh pr checks 94 --repo icanbwell/fhir-patient-summary
```

Note: the `build` check will likely not run (PR #94's base is `PHR-3327`, and `node-ci.yml`'s `pull_request` trigger is scoped to `branches: [main]` — this is a known, pre-existing gap, not something this task introduces or should try to fix). Report Aikido/Gecko results plus the local verification results from Step 1 as the actual verification evidence.

---

## Self-Review

**Spec coverage:** every decision from the conversation is covered — drop WEARABLES (Task 2), keep DEVICE_METRICS composition-only / no raw-resource fallback (Task 1's design explicitly preserves `() => false` in `IPSSectionResourceFilters`, untouched), port WearablesTemplate's average/min/max/count/date-range/category-grouping rendering into DeviceMetricsTemplate (Task 1), thread real Observations through the interface additively (Task 1, Steps 3-6), preserve stub-mode behavior (Task 1's dual-path `buildAggregateRow`/`buildFallbackRow`, tested in Step 1's second new test), keep the vendor-tag exclusion logic but repoint it to DEVICE_METRICS (Task 2, Step 4), update docs (Task 2, Step 8), remove stale PR #94 design docs (Task 2, Steps 6 and 10).

**Placeholder scan:** no TBDs; every step has literal code or an exact shell command.

**Type consistency:** `DeviceMetricRow` (Task 1) matches `WearableMetricSummary`'s shape plus `codeSystem`; `buildAggregateRow`/`buildFallbackRow`/`renderRowsByCategory`/`formatCategoryLabel`/`effectiveDateSortKey`/`findEarliestAndLatest`/`getNumericReadingValue`/`sumMinMax`/`formatCell`/`stringifyExtractedValue` are all named and typed consistently within Task 1's single file rewrite. The new `ISummaryTemplate` parameter name (`underlyingResources` on the interface, `summaryUnderlyingResources` on `TypeScriptTemplateMapper`/`NarrativeGenerator`) is intentionally different at each layer to match each file's existing naming convention (the interface talks about "the resources", the mapper/generator already prefix section-scoped things with `summary`) — this is a deliberate naming choice, not an inconsistency, but flagged here so the implementer doesn't try to unify them.

**Correction made during drafting, not by inspection alone:** I initially copied `WearablesTemplate`'s `getOwnerTag(...)` call verbatim for `buildAggregateRow`'s `sourceDevice`. Checked against the actual `device_metrics_section.test.ts` fixture and `TemplateUtilities.getOwnerTag`'s implementation (requires a `meta.security` tag with system `https://www.icanbwell.com/owner`) and found the device-metric ingest pipeline's fixture Observations don't carry that tag at all — they use a plain FHIR `device.reference` field, and the Composition's own "Device" column (`columns['Device']`, e.g. literally `"Device/oura"`) is what actually carries the display value, matching the existing (pre-this-plan) test's assertion. Fixed by reading `columns['Device']` once in `generateSummaryNarrative` and threading it into both `buildAggregateRow` and `buildFallbackRow` as a `sourceDevice` parameter instead of deriving it per-path. Also verified the `count`/aggregate math by hand against the fixture's `observationsFor` generator (15 readings, values 60-74, dates 2026-01-14 through 2026-01-28 descending; capped to the 10 most recent per `MAX_ENTRIES_PER_GROUP[DEVICE_METRICS] = 10` in `ips_section_constants.ts`) — average of 60..69 is 64.5, matching Step 1's test assertions exactly, not a rounded guess.
