// WearablesTemplate.ts - Renders an aggregated summary of wearable-device Observations
import { TemplateUtilities } from './TemplateUtilities';
import { TDomainResource } from '../../../types/resources/DomainResource';
import { TObservation } from '../../../types/resources/Observation';
import { TPeriod } from '../../../types/partials/Period';
import { ITemplate } from './interfaces/ITemplate';

interface WearableMetricSummary {
  display: string;
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
      // Built via JSON.stringify of the discriminating parts (not a plain `|`-joined
      // string) so a `|` legally occurring inside a system URI, code, or unit - FHIR
      // uses `|` itself as its token-search separator - can never make two distinct
      // metrics collide into the same group, or split one metric into two.
      const metricParts = coding?.code ? ['code', coding.system ?? '', coding.code] : ['text', obs.code?.text ?? 'unknown'];
      // Include the unit in the grouping key so readings of the same metric reported
      // in different units (e.g. weight in kg from one device, lb from another) never
      // get averaged together into one clinically-meaningless number. Observations with
      // no valueQuantity.unit (including non-numeric ones) share the '' bucket, which is
      // fine - they were never going into the numeric aggregate anyway.
      const key = JSON.stringify([...metricParts, obs.valueQuantity?.unit ?? '']);
      const existing = groups.get(key);
      if (existing) {
        existing.push(obs);
      } else {
        groups.set(key, [obs]);
      }
    }

    const summaries: WearableMetricSummary[] = [];
    for (const groupObservations of groups.values()) {
      const firstObs = groupObservations[0];
      const display = firstObs.code?.coding?.[0]?.display || templateUtilities.codeableConceptDisplay(firstObs.code) || 'Unknown';
      const category = templateUtilities.getDisplayGroupCategory(firstObs) ?? 'Other';

      // Date range, reading count, and "latest" are derived from every reading in the
      // group - numeric and non-numeric alike - so a non-numeric reading (e.g. a sensor
      // error reported as valueCodeableConcept) that happens to be the most recent one
      // isn't silently dropped from the count or masked by a stale numeric "latest".
      // Found via a single linear scan (like sumMinMax below) rather than a full sort,
      // since only the two endpoints are ever needed and wearable groups can be 10^5+ readings.
      const { earliestObs, latestObs } = WearablesTemplate.findEarliestAndLatest(groupObservations);
      const count = groupObservations.length;
      const earliestDateValue = earliestObs.effectiveDateTime || earliestObs.effectivePeriod?.start;
      const latestDateValue = latestObs.effectiveDateTime || latestObs.effectivePeriod?.start;
      const sourceDevice = templateUtilities.getOwnerTag(latestObs) || templateUtilities.getOwnerTag(firstObs) || '';

      // Numeric readings can arrive as valueQuantity (the common case) or valueInteger
      // (e.g. a plain step/count reading with no unit) - both are included so the
      // average/min/max aggregates aren't silently empty just because a metric happens
      // to be reported via valueInteger instead of valueQuantity.
      const numericValues = groupObservations
        .map((obs) => WearablesTemplate.getNumericReadingValue(obs))
        .filter((value): value is number => typeof value === 'number');

      let averageCell: string;
      let minCell: string;
      let maxCell: string;

      // latestCell/averageCell/minCell/maxCell hold raw (unescaped) text here - every
      // value ultimately traces back to free text from the source system (a unit, a
      // valueCodeableConcept.text, a valueString) and must not be trusted as safe HTML.
      // Escaping happens once, at the point they're interpolated into the row below,
      // the same way every other cell (display, sourceDevice) in this template is escaped.
      if (numericValues.length > 0) {
        // Every member of this group shares the same unit by construction (see the
        // grouping key above), so any one of them is a valid source for it.
        const unit = groupObservations[0].valueQuantity?.unit ?? '';
        const { sum, min, max } = WearablesTemplate.sumMinMax(numericValues);
        const average = Math.round((sum / numericValues.length) * 10) / 10;

        averageCell = WearablesTemplate.formatCell(average, unit);
        minCell = WearablesTemplate.formatCell(min, unit);
        maxCell = WearablesTemplate.formatCell(max, unit);
      } else {
        // No reading in this metric group has a numeric value: the
        // average/min/max aggregates aren't computable.
        averageCell = NOT_AVAILABLE;
        minCell = NOT_AVAILABLE;
        maxCell = NOT_AVAILABLE;
      }

      let latestCell: string;
      const latestNumericValue = WearablesTemplate.getNumericReadingValue(latestObs);
      if (typeof latestNumericValue === 'number') {
        latestCell = WearablesTemplate.formatCell(latestNumericValue, latestObs.valueQuantity?.unit ?? '');
      } else {
        // The most recent reading has no numeric value (e.g. a wearable
        // blood-pressure reading using component[], or a valueCodeableConcept /
        // valueString / valuePeriod reading). Still render a row so it isn't silently dropped.
        const rawValue = templateUtilities.extractObservationValue(latestObs);
        const stringValue = WearablesTemplate.stringifyExtractedValue(rawValue, templateUtilities, timezone);
        const unit = templateUtilities.extractObservationValueUnit(latestObs);
        // extractObservationValue already bakes the unit into its result for some
        // shapes (e.g. blood-pressure components, valueQuantity) - avoid appending
        // it a second time in that case.
        latestCell = unit && !stringValue.includes(unit) ? WearablesTemplate.formatCell(stringValue, unit) : stringValue;
      }

      summaries.push({
        display: templateUtilities.capitalizeFirstLetter(display),
        category,
        count,
        latestCell,
        averageCell,
        minCell,
        maxCell,
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
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Effective-date sort key for an Observation. Missing dates, and dates that fail to
   * parse (malformed ingestion data), both sort as the earliest possible value rather
   * than comparing equal to everything - the latter would make Number.isNaN leak into
   * the linear scan below via `key < earliestKey` / `key >= latestKey` comparisons that
   * are always false against NaN, silently corrupting the earliest/latest pick.
   */
  private static effectiveDateSortKey(obs: TObservation): number {
    const date = obs.effectiveDateTime || obs.effectivePeriod?.start;
    if (!date) {
      return Number.NEGATIVE_INFINITY;
    }
    const timestamp = new Date(date).getTime();
    return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
  }

  /**
   * Finds the earliest- and latest-dated Observation in a group with a single linear
   * scan, rather than sorting the whole group just to read off its two endpoints -
   * wearable metric groups can have 10^5+ readings (see the sumMinMax RangeError test).
   * On ties, keeps the first-encountered earliest and the last-encountered latest, to
   * match the previous stable-sort-based behavior.
   */
  private static findEarliestAndLatest(observations: TObservation[]): { earliestObs: TObservation; latestObs: TObservation } {
    let earliestObs = observations[0];
    let latestObs = observations[0];
    let earliestKey = WearablesTemplate.effectiveDateSortKey(earliestObs);
    let latestKey = earliestKey;
    for (const obs of observations) {
      const key = WearablesTemplate.effectiveDateSortKey(obs);
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

  /**
   * Extracts a reading's numeric value regardless of whether it was reported via
   * valueQuantity (the common case, carries a unit) or valueInteger (e.g. a plain
   * count reading with no unit) - so a metric reported via valueInteger doesn't
   * silently fall out of the average/min/max aggregate while still counting toward
   * # Readings.
   */
  private static getNumericReadingValue(obs: TObservation): number | undefined {
    if (typeof obs.valueQuantity?.value === 'number') {
      return obs.valueQuantity.value;
    }
    if (typeof obs.valueInteger === 'number') {
      return obs.valueInteger;
    }
    return undefined;
  }

  /**
   * Computes sum/min/max in a single pass without spreading the array into
   * Math.min/Math.max arguments, which throws RangeError for large arrays
   * (continuous-monitoring wearable data can easily produce 10^5+ readings).
   */
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

  /**
   * Renders a value + unit pair as a single table cell string, omitting a
   * trailing space when there's no unit.
   */
  private static formatCell(value: string | number, unit: string): string {
    return unit ? `${value} ${unit}` : `${value}`;
  }

  /**
   * Converts the loosely-typed result of TemplateUtilities.extractObservationValue
   * into a display string, falling back to an em dash when there's genuinely
   * nothing to show (e.g. no value field of any kind and no dataAbsentReason).
   *
   * A raw TPeriod (returned unformatted by extractObservationValue for a
   * valuePeriod-typed reading - e.g. a sleep-duration window with no
   * valueQuantity) is rendered via TemplateUtilities.renderPeriod rather than
   * falling through to the em dash, which would otherwise hide a genuinely
   * present value.
   */
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
