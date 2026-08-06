// DeviceMetricsTemplate.ts - narrative for the Personal Health Monitoring
// Devices section (measurements captured by a patient's connected devices).
import { TemplateUtilities } from './TemplateUtilities';
import { ISummaryTemplate } from './interfaces/ITemplate';
import { TComposition } from '../../../types/resources/Composition';

/**
 * Class to generate HTML narrative for device-captured metrics.
 *
 * Unlike most templates, this one only supports the summary-composition path.
 * The section's membership comes from a curated device-metric Composition
 * produced upstream (one sub-section per metric, each already sorted most
 * recent first) — there is no safe way to derive it from raw Observations,
 * so generateNarrative returns undefined and the section is simply omitted
 * when no such Composition is present.
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
   * Each top-level section of the Composition is one metric (e.g. "Sleep
   * Duration", "Heart Rate") and carries that metric's latest reading across
   * its child sections, so this renders one row per metric rather than one
   * row per observation.
   *
   * @param resources - Device-metric summary Composition resources
   * @param timezone - Optional timezone for date formatting
   * @returns HTML string, or undefined if no metric rows could be rendered
   */
  generateSummaryNarrative(
    resources: TComposition[],
    timezone: string | undefined
  ): string | undefined {
    const templateUtilities = new TemplateUtilities(resources);
    let isSummaryCreated = false;

    let html = `<p>This list includes the latest measurement recorded by each of the patient's connected devices, sorted by effective date (most recent first).</p>\n`;

    html += `
      <div>
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th>Code (System)</th>
              <th>Result</th>
              <th>Date</th>
              <th>Device</th>
            </tr>
          </thead>
          <tbody>`;

    for (const resourceItem of resources) {
      for (const rowData of resourceItem.section ?? []) {
        const data: Record<string, string> = {};
        data['codeSystem'] = templateUtilities.codeableConceptCoding(
          rowData.code
        );

        for (const columnData of rowData.section ?? []) {
          if (columnData.title) {
            data[columnData.title] = templateUtilities.renderTextAsHtml(
              columnData.text?.div ?? ''
            );
          }
        }

        const metricName = data['Metric Name'];
        // Skip rows the upstream pipeline couldn't name — they'd render as
        // an unlabeled value with no clinical meaning.
        if (!metricName || metricName.toLowerCase() === 'unknown') {
          continue;
        }

        isSummaryCreated = true;

        html += `
          <tr>
            <td>${templateUtilities.capitalizeFirstLetter(metricName)}</td>
            <td>${data['codeSystem'] ?? ''}</td>
            <td>${templateUtilities.extractObservationSummaryValue(data, timezone) ?? ''}</td>
            <td>${templateUtilities.extractObservationSummaryEffectiveTime(data, timezone) ?? ''}</td>
            <td>${data['Device'] ?? ''}</td>
          </tr>`;
      }
    }

    html += `
          </tbody>
        </table>
      </div>`;

    return isSummaryCreated ? html : undefined;
  }
}
