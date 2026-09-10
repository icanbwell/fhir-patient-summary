// DeviceMetricsTemplate.ts - narrative for the Personal Health Monitoring
// Devices section (measurements captured by a patient's connected devices).
import { TemplateUtilities } from './TemplateUtilities';
import { ISummaryTemplate } from './interfaces/ITemplate';
import { TComposition } from '../../../types/resources/Composition';
import { TDomainResource } from '../../../types/resources/DomainResource';
import { TObservation } from '../../../types/resources/Observation';
import { TPeriod } from '../../../types/partials/Period';

interface DeviceMetricRow {
  // All fields below are RAW text (composition-authored or resource-derived)
  // and are escaped once, uniformly, at render time in renderRowsByCategory.
  display: string;
  codeSystem: string;
  category: string;
  countCell: string;
  daysWithDataCell: string;
  latestCell: string;
  averageCell: string;
  minCell: string;
  maxCell: string;
  dateRangeCell: string;
  sourceDevice: string;
}

const NOT_AVAILABLE = '—';

// The six `Composition.section.section` sub-items ai-health-optimization's
// ObservationCompositionCreator adds per metric once window-statistics
// support ships (see adrs/0006-device-metric-window-statistics.md in
// icanbwell/ai-health-optimization, PR #81). Present only once a Composition
// was produced by a package version carrying that change — see
// `hasUpstreamWindowStatistics` below.
const READING_COUNT_TITLE = 'Reading Count';
const DAYS_WITH_DATA_TITLE = 'Days With Data';
const AVERAGE_TITLE = 'Average';
const MINIMUM_TITLE = 'Minimum';
const MAXIMUM_TITLE = 'Maximum';
const DATE_RANGE_TITLE = 'Date Range';
const WINDOW_STATISTICS_TITLES = [
  READING_COUNT_TITLE,
  DAYS_WITH_DATA_TITLE,
  AVERAGE_TITLE,
  MINIMUM_TITLE,
  MAXIMUM_TITLE,
  DATE_RANGE_TITLE,
];

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
 * Each metric's row shows average/min/max/count/days-with-data/date-range
 * stats, resolved in priority order:
 *
 * 1. **Upstream window statistics** — the `Reading Count`/`Days With Data`/
 *    `Average`/`Minimum`/`Maximum`/`Date Range` sub-sections
 *    ai-health-optimization computes over the *full* lookback window (not
 *    just the entries this section's `entry[]` references, which are capped
 *    at `MAX_ENTRIES_PER_GROUP`) and embeds directly on the Composition. Used
 *    verbatim whenever present — see `hasUpstreamWindowStatistics`.
 * 2. **Recomputed from resolved Observations** — for Compositions produced
 *    before that upstream change shipped (no window-statistics sub-items),
 *    computed here from the actual Observations the caller resolved for
 *    this metric's entry[] references (see `underlyingResources`), capped at
 *    `MAX_ENTRIES_PER_GROUP`.
 * 3. **Composition-embedded latest-value only** — when neither of the above
 *    is available (e.g. includeSummaryCompositionOnly mode, where entries are
 *    stub placeholders with no real fields, on a Composition predating the
 *    upstream change too), each row falls back to exactly the
 *    Composition-embedded latest-value rendering this template always used,
 *    so that production path never regresses.
 *
 * Category grouping always requires a resolved Observation (to read its
 * display-group category coding) regardless of which stats tier is used —
 * a metric with no resolvable Observation always buckets under "Other", even
 * if upstream window statistics are present for it.
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
   * entry[] (see ISummaryTemplate docblock). Used for category grouping, and as
   * the aggregation source when upstream window statistics aren't present.
   * @returns HTML string, or undefined if no metric rows could be rendered
   */
  generateSummaryNarrative(
    resources: TComposition[],
    timezone: string | undefined,
    now?: Date,
    underlyingResources?: TDomainResource[]
  ): string | undefined {
    const templateUtilities = new TemplateUtilities(resources);

    // Resolve every entry reference against whatever the caller passed,
    // stub or real - this is what makes the legacy aggregation tier's count
    // reflect the capped group size (see fhir_summary_generator.ts's
    // MAX_ENTRIES_PER_GROUP). A stub placeholder (includeSummaryCompositionOnly
    // mode) is exactly {resourceType, id} with no other fields - a real
    // Observation from the ingest pipeline always carries a `code`.
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
        // ingestion pipeline that tags Observations via meta.security) names
        // the source device via this plain composition column instead - so
        // it's read once here and passed to both branches below.
        const sourceDevice = columns['Device'] ?? '';

        const resolvedResources = (metricSection.entry ?? [])
          .map(entry => entry.reference ? resourcesByReference.get(entry.reference) : undefined)
          .filter((resource): resource is TDomainResource => resource !== undefined);
        // Prefer the resolved (capped) count; if nothing resolved at all -
        // e.g. underlyingResources wasn't passed - fall back to the
        // Composition's own uncapped entry list rather than showing 0. Only
        // used by the legacy aggregation/fallback tiers below - the upstream
        // tier has its own real, uncapped "Reading Count" column.
        const legacyCount = resolvedResources.length > 0 ? resolvedResources.length : (metricSection.entry?.length ?? 0);
        const realObservations = resolvedResources.filter((resource): resource is TObservation => 'code' in resource);
        const category = realObservations.length > 0
          ? templateUtilities.getDisplayGroupCategory(realObservations[0]) ?? 'Other'
          : 'Other';

        const row = DeviceMetricsTemplate.hasUpstreamWindowStatistics(columns)
          ? DeviceMetricsTemplate.buildRowFromWindowStatistics(metricName, codeSystem, category, sourceDevice, columns, templateUtilities, timezone)
          : realObservations.length > 0
            ? DeviceMetricsTemplate.buildAggregateRow(metricName, codeSystem, category, legacyCount, sourceDevice, realObservations, templateUtilities, timezone)
            : DeviceMetricsTemplate.buildFallbackRow(metricName, codeSystem, legacyCount, sourceDevice, columns, templateUtilities, timezone);

        rows.push(row);
      }
    }

    if (rows.length === 0) {
      return undefined;
    }

    return DeviceMetricsTemplate.renderRowsByCategory(rows, templateUtilities);
  }

  /**
   * True when the Composition itself already carries all six window-statistics
   * sub-items for this metric (see WINDOW_STATISTICS_TITLES) - i.e. it was
   * produced by an ai-health-optimization version that computes them. Requires
   * every field rather than any, so a partially-populated/malformed section
   * never mixes real and placeholder stats in the same row.
   */
  private static hasUpstreamWindowStatistics(columns: Record<string, string>): boolean {
    return WINDOW_STATISTICS_TITLES.every(title => !!columns[title]);
  }

  /**
   * Builds a metric's row directly from the Composition's own window-statistics
   * sub-items - the real average/min/max/count/days-with-data/date-range over
   * the full upstream lookback window, not just the (possibly capped) entries
   * this section's entry[] references. Latest still reads the Composition's
   * existing latest-value columns, which are unaffected by window statistics.
   */
  private static buildRowFromWindowStatistics(
    metricName: string,
    codeSystem: string,
    category: string,
    sourceDevice: string,
    columns: Record<string, string>,
    templateUtilities: TemplateUtilities,
    timezone: string | undefined
  ): DeviceMetricRow {
    const latestCell = templateUtilities.extractObservationSummaryValue(columns, timezone) || NOT_AVAILABLE;
    return {
      display: templateUtilities.capitalizeFirstLetter(metricName),
      codeSystem,
      category,
      countCell: columns[READING_COUNT_TITLE],
      daysWithDataCell: columns[DAYS_WITH_DATA_TITLE],
      latestCell,
      averageCell: columns[AVERAGE_TITLE],
      minCell: columns[MINIMUM_TITLE],
      maxCell: columns[MAXIMUM_TITLE],
      dateRangeCell: columns[DATE_RANGE_TITLE],
      sourceDevice,
    };
  }

  /**
   * Builds a metric's row from its real, resolved Observations - full average/
   * min/max/count/date-range stats, capped at MAX_ENTRIES_PER_GROUP. Used only
   * when the Composition doesn't already carry upstream window statistics (see
   * hasUpstreamWindowStatistics) - i.e. Compositions predating that change.
   * "Days With Data" isn't computable from this capped sample, so it's shown
   * as not-available rather than a misleadingly partial count.
   */
  private static buildAggregateRow(
    metricName: string,
    codeSystem: string,
    category: string,
    count: number,
    sourceDevice: string,
    observations: TObservation[],
    templateUtilities: TemplateUtilities,
    timezone: string | undefined
  ): DeviceMetricRow {
    const { earliestObs, latestObs } = DeviceMetricsTemplate.findEarliestAndLatest(observations);
    const earliestDateValue = earliestObs.effectiveDateTime || earliestObs.effectivePeriod?.start;
    const latestDateValue = latestObs.effectiveDateTime || latestObs.effectivePeriod?.start;
    const earliestDate = earliestDateValue ? templateUtilities.renderTime(earliestDateValue, timezone) : '';
    const latestDate = latestDateValue ? templateUtilities.renderTime(latestDateValue, timezone) : '';

    const numericValues = observations
      .map(obs => DeviceMetricsTemplate.getNumericReadingValue(obs))
      .filter((value): value is number => typeof value === 'number');

    let averageCell: string;
    let minCell: string;
    let maxCell: string;
    if (numericValues.length > 0) {
      // Find the first observation that actually carries a unit - observations[0]
      // may be a valueInteger reading (no unit) or a unit-less quantity while a
      // later reading in the same group has one, which would otherwise leave
      // Average/Min/Max unit-less while Latest (which reads latestObs directly)
      // keeps its unit, producing an inconsistent row.
      const unit = observations.find(obs => obs.valueQuantity?.unit)?.valueQuantity?.unit ?? '';
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
      countCell: String(count),
      daysWithDataCell: NOT_AVAILABLE,
      latestCell,
      averageCell,
      minCell,
      maxCell,
      dateRangeCell: earliestDate === latestDate ? latestDate : `${earliestDate} - ${latestDate}`,
      sourceDevice,
    };
  }

  /**
   * Builds a metric's row from the Composition's own pre-rendered latest-value
   * columns only - used when no real Observation resolved for this metric
   * (stub-only mode, or an entry reference the caller didn't resolve) and the
   * Composition doesn't already carry upstream window statistics either.
   * Matches this template's original, pre-aggregate-stats rendering exactly,
   * so that path never regresses.
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
      // No resolvable Observation to read a display-group category off - stub-only rows always bucket under 'Other'.
      category: 'Other',
      countCell: String(count),
      daysWithDataCell: NOT_AVAILABLE,
      latestCell,
      averageCell: NOT_AVAILABLE,
      minCell: NOT_AVAILABLE,
      maxCell: NOT_AVAILABLE,
      dateRangeCell: latestDate,
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
              <th>Days With Data</th>
              <th>Date Range</th>
              <th>Source Device</th>
            </tr>
          </thead>
          <tbody>`;
      for (const metric of metrics) {
        html += `
            <tr>
              <td>${templateUtilities.renderTextAsHtml(metric.display)}</td>
              <td>${metric.codeSystem}</td>
              <td>${templateUtilities.renderTextAsHtml(metric.latestCell)}</td>
              <td>${templateUtilities.renderTextAsHtml(metric.averageCell)}</td>
              <td>${templateUtilities.renderTextAsHtml(metric.minCell)}</td>
              <td>${templateUtilities.renderTextAsHtml(metric.maxCell)}</td>
              <td>${templateUtilities.renderTextAsHtml(metric.countCell)}</td>
              <td>${templateUtilities.renderTextAsHtml(metric.daysWithDataCell)}</td>
              <td>${templateUtilities.renderTextAsHtml(metric.dateRangeCell)}</td>
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
