// DeviceMetricsTemplate.ts - narrative for the Personal Health Monitoring
// Devices section (measurements captured by a patient's connected devices).
import { TemplateUtilities } from './TemplateUtilities';
import { ISummaryTemplate } from './interfaces/ITemplate';
import { TComposition } from '../../../types/resources/Composition';
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
