// WearablesTemplate.ts - Renders an aggregated summary of wearable-device Observations
import { TemplateUtilities } from './TemplateUtilities';
import { TDomainResource } from '../../../types/resources/DomainResource';
import { TObservation } from '../../../types/resources/Observation';
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
      const metricKey = coding?.code ? `${coding.system ?? ''}|${coding.code}` : `text|${obs.code?.text ?? 'unknown'}`;
      // Include the unit in the grouping key so readings of the same metric reported
      // in different units (e.g. weight in kg from one device, lb from another) never
      // get averaged together into one clinically-meaningless number. Observations with
      // no valueQuantity.unit (including non-numeric ones) share the '' bucket, which is
      // fine - they were never going into the numeric aggregate anyway.
      const key = `${metricKey}|${obs.valueQuantity?.unit ?? ''}`;
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

      const firstObs = groupObservations[0];
      const display = firstObs.code?.coding?.[0]?.display || templateUtilities.codeableConceptDisplay(firstObs.code) || 'Unknown';
      const category = templateUtilities.getDisplayGroupCategory(firstObs) ?? 'Other';

      let latestCell: string;
      let averageCell: string;
      let minCell: string;
      let maxCell: string;
      let count: number;
      let earliestDateValue: string | undefined;
      let latestDateValue: string | undefined;
      let sourceDevice: string;

      if (readings.length > 0) {
        // At least one reading in this metric group has a numeric valueQuantity.value:
        // aggregate over that numeric subset, as before.
        const byDate = [...readings].sort((a, b) => WearablesTemplate.compareByEffectiveDate(a.obs, b.obs));
        const earliest = byDate[0];
        const latest = byDate[byDate.length - 1];
        // Every member of this group shares the same unit by construction (see the
        // grouping key above), so any one of them is a valid source for it.
        const unit = groupObservations[0].valueQuantity?.unit ?? '';

        const values = readings.map((r) => r.value);
        const { sum, min, max } = WearablesTemplate.sumMinMax(values);
        const average = Math.round((sum / values.length) * 10) / 10;

        count = values.length;
        earliestDateValue = earliest.obs.effectiveDateTime || earliest.obs.effectivePeriod?.start;
        latestDateValue = latest.obs.effectiveDateTime || latest.obs.effectivePeriod?.start;
        sourceDevice = templateUtilities.getOwnerTag(latest.obs) || templateUtilities.getOwnerTag(firstObs) || '';

        latestCell = WearablesTemplate.formatCell(latest.value, unit);
        averageCell = WearablesTemplate.formatCell(average, unit);
        minCell = WearablesTemplate.formatCell(min, unit);
        maxCell = WearablesTemplate.formatCell(max, unit);
      } else {
        // No reading in this metric group has a numeric valueQuantity.value (e.g. a
        // wearable blood-pressure reading using component[], or a valueCodeableConcept
        // / valueString reading). Still render a row so the Observation isn't silently
        // dropped from the narrative - just without the numeric aggregates.
        const byDate = [...groupObservations].sort((a, b) => WearablesTemplate.compareByEffectiveDate(a, b));
        const earliestObs = byDate[0];
        const latestObs = byDate[byDate.length - 1];
        // extractObservationValue already bakes the unit into its result for some
        // shapes (e.g. blood-pressure components, valueQuantity) - avoid appending
        // it a second time in that case. Escape HTML to prevent XSS from malicious values.
        const escapedStringValue = templateUtilities.renderTextAsHtml(stringValue);
        const escapedUnit = unit ? templateUtilities.renderTextAsHtml(unit) : '';
        latestCell = escapedUnit && !escapedStringValue.includes(escapedUnit) ? WearablesTemplate.formatCell(escapedStringValue, escapedUnit) : escapedStringValue;

        count = groupObservations.length;
        earliestDateValue = earliestObs.effectiveDateTime || earliestObs.effectivePeriod?.start;
        latestDateValue = latestObs.effectiveDateTime || latestObs.effectivePeriod?.start;
        sourceDevice = templateUtilities.getOwnerTag(latestObs) || templateUtilities.getOwnerTag(firstObs) || '';

        const rawValue = templateUtilities.extractObservationValue(latestObs);
        const stringValue = WearablesTemplate.stringifyExtractedValue(rawValue);
        const unit = templateUtilities.extractObservationValueUnit(latestObs);
        // extractObservationValue already bakes the unit into its result for some
        // shapes (e.g. blood-pressure components, valueQuantity) - avoid appending
        // it a second time in that case.
        latestCell = unit && !stringValue.includes(unit) ? WearablesTemplate.formatCell(stringValue, unit) : stringValue;
        averageCell = NOT_AVAILABLE;
        minCell = NOT_AVAILABLE;
        maxCell = NOT_AVAILABLE;
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
              <td>${metric.latestCell}</td>
              <td>${metric.averageCell}</td>
              <td>${metric.minCell}</td>
              <td>${metric.maxCell}</td>
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
   * Compares two Observations by effective date (ascending). Shared by both the
   * numeric-aggregate path and the non-numeric fallback path so "latest"/"earliest"
   * are computed consistently.
   */
  private static compareByEffectiveDate(a: TObservation, b: TObservation): number {
    const dateA = a.effectiveDateTime || a.effectivePeriod?.start;
    const dateB = b.effectiveDateTime || b.effectivePeriod?.start;
    return dateA && dateB ? new Date(dateA).getTime() - new Date(dateB).getTime() : 0;
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
   */
  private static stringifyExtractedValue(value: unknown): string {
    if (value === null || value === undefined) {
      return NOT_AVAILABLE;
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'object') {
      const withTextOrCode = value as { text?: string; code?: string };
      return withTextOrCode.text || withTextOrCode.code || NOT_AVAILABLE;
    }
    return String(value);
  }
}
