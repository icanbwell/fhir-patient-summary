// PregnancyTemplate.ts - TypeScript replacement for Jinja2 pregnancy.j2
import { TemplateUtilities } from './TemplateUtilities';
import { TDomainResource } from '../../../types/resources/DomainResource';
import { TObservation } from '../../../types/resources/Observation';
import { ITemplate } from './interfaces/ITemplate';
import { PREGNANCY_LOINC_CODES } from '../../../structures/ips_section_loinc_codes';

/**
 * Class to generate HTML narrative for Pregnancy (Observation resources)
 * This replaces the Jinja2 pregnancy.j2 template
 */
export class PregnancyTemplate implements ITemplate {
  /**
   * Generate HTML narrative for Pregnancy
   * @param resources - FHIR Observation resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  generateNarrative(resources: TDomainResource[], timezone: string | undefined): string {
    return PregnancyTemplate.generateStaticNarrative(resources, timezone);
  }

  /**
   * Internal static implementation that actually generates the narrative
   * @param resources - FHIR Observation resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */

  private static generateStaticNarrative(
    resources: TDomainResource[],
    timezone: string | undefined
  ): string {
    const templateUtilities = new TemplateUtilities(resources);

    const observations = resources.map(entry => entry as TObservation) || [];

    // LOINC code for Estimated Delivery Date
    const EDD_LOINC = '11778-8';
    // Pregnancy status codes
    const pregnancyStatusCodes = Object.keys(PREGNANCY_LOINC_CODES.PREGNANCY_STATUS);
    // Pregnancy outcome/history codes
    const pregnancyOutcomeCodes = Object.keys(PREGNANCY_LOINC_CODES.PREGNANCY_OUTCOME);

    // Find latest pregnancy status observation
    const pregnancyStatusObs = observations
      .filter(obs => obs.code?.coding?.some(c => c.code && pregnancyStatusCodes.includes(c.code)))
      .sort((a, b) => {
        const dateA = a.effectiveDateTime || a.effectivePeriod?.start;
        const dateB = b.effectiveDateTime || b.effectivePeriod?.start;
        return dateB && dateA ? new Date(dateB).getTime() - new Date(dateA).getTime() : 0;
      })[0];

    // Find latest EDD observation
    const eddObs = observations
      .filter(obs => obs.code?.coding?.some(c => c.code === EDD_LOINC))
      .sort((a, b) => {
        const dateA = a.effectiveDateTime || a.effectivePeriod?.start;
        const dateB = b.effectiveDateTime || b.effectivePeriod?.start;
        return dateB && dateA ? new Date(dateB).getTime() - new Date(dateA).getTime() : 0;
      })[0];

    // Find all pregnancy history/outcome observations
    const historyObs = observations
      .filter(obs =>
        obs.code?.coding?.some(c => c.code && pregnancyOutcomeCodes.includes(c.code)) ||
        obs.valueCodeableConcept?.coding?.some(c => c.code && pregnancyOutcomeCodes.includes(c.code))
      )
      .sort((a, b) => {
        const dateA = a.effectiveDateTime || a.effectivePeriod?.start;
        const dateB = b.effectiveDateTime || b.effectivePeriod?.start;
        return dateB && dateA ? new Date(dateB).getTime() - new Date(dateA).getTime() : 0;
      });

    // Section heading (use IPS_SECTION_DISPLAY_NAMES if available, fallback to hardcoded)
    const heading = '<h3>History of Pregnancy</h3>';

    // If no data, show message
    if (!pregnancyStatusObs && !eddObs && historyObs.length === 0) {
      return `${heading}<p>No history of pregnancy found.</p>`;
    }

    let html = `\n      ${heading}\n      <table>\n        <thead>\n          <tr>\n            <th>Result</th>\n            <th>Comments</th>\n            <th>Date</th>\n          </tr>\n        </thead>\n        <tbody>`;

    // Pregnancy status row
    if (pregnancyStatusObs) {
      html += `\n        <tr id="${templateUtilities.narrativeLinkId(pregnancyStatusObs)}">\n          <td>${templateUtilities.renderTextAsHtml(templateUtilities.extractPregnancyStatus(pregnancyStatusObs))}</td>\n          <td>${templateUtilities.renderNotes(pregnancyStatusObs.note, timezone)}</td>\n          <td>${pregnancyStatusObs.effectiveDateTime ? templateUtilities.renderTextAsHtml(templateUtilities.renderTime(pregnancyStatusObs.effectiveDateTime, timezone)) : pregnancyStatusObs.effectivePeriod ? templateUtilities.renderTextAsHtml(templateUtilities.renderPeriod(pregnancyStatusObs.effectivePeriod, timezone)) : ''}</td>\n        </tr>`;
    }

    // Estimated Delivery Date row
    if (eddObs) {
      html += `\n        <tr id="${templateUtilities.narrativeLinkId(eddObs)}">\n          <td>Estimated Delivery Date: ${templateUtilities.renderTextAsHtml(templateUtilities.extractObservationSummaryValue(eddObs, timezone))}</td>\n          <td>${templateUtilities.renderNotes(eddObs.note, timezone)}</td>\n          <td>${eddObs.effectiveDateTime ? templateUtilities.renderTextAsHtml(templateUtilities.renderTime(eddObs.effectiveDateTime, timezone)) : eddObs.effectivePeriod ? templateUtilities.renderTextAsHtml(templateUtilities.renderPeriod(eddObs.effectivePeriod, timezone)) : ''}</td>\n        </tr>`;
    }

    // Pregnancy history/outcome rows
    for (const obs of historyObs) {
      html += `\n        <tr id="${templateUtilities.narrativeLinkId(obs)}">\n          <td>${templateUtilities.renderTextAsHtml(templateUtilities.extractPregnancyStatus(obs))}</td>\n          <td>${templateUtilities.renderNotes(obs.note, timezone)}</td>\n          <td>${obs.effectiveDateTime ? templateUtilities.renderTextAsHtml(templateUtilities.renderTime(obs.effectiveDateTime, timezone)) : obs.effectivePeriod ? templateUtilities.renderTextAsHtml(templateUtilities.renderPeriod(obs.effectivePeriod, timezone)) : ''}</td>\n        </tr>`;
    }

    html += `\n        </tbody>\n      </table>`;

    return html;
  }
}
