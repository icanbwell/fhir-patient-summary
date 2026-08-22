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
