// FunctionalStatusTemplate.ts - TypeScript replacement for Jinja2 functionalstatus.j2
import { TemplateUtilities } from './TemplateUtilities';
import { TDomainResource } from '../../../types/resources/DomainResource';
import { ITemplate } from './interfaces/ITemplate';
import { TClinicalImpression } from '../../../types/resources/ClinicalImpression';
import { TCondition } from '../../../types/resources/Condition';

/**
 * Class to generate HTML narrative for Functional Status (Observation resources)
 * This replaces the Jinja2 functionalstatus.j2 template
 */
export class FunctionalStatusTemplate implements ITemplate {
  /**
   * Generate HTML narrative for Functional Status
   * @param resources - FHIR resources array containing Observation resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  generateNarrative(resources: TDomainResource[], timezone: string | undefined): string {
    return FunctionalStatusTemplate.generateStaticNarrative(resources, timezone);
  }

  /**
   * Internal static implementation that actually generates the narrative
   * @param resources - FHIR resources array containing Observation resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */

  private static generateStaticNarrative(
    resources: TDomainResource[],
    timezone: string | undefined
  ): string {
    const templateUtilities = new TemplateUtilities(resources);
    // Start building the HTML
    let html = ``;

    const activeConditions: TCondition[] = [];
    const clinicalImpressions: TClinicalImpression[] = [];

    // Loop through resources in the array
    for (const resourceItem of resources) {
      if (resourceItem.resourceType === 'Condition') {
        activeConditions.push(resourceItem as TCondition);
      } else if (resourceItem.resourceType === 'ClinicalImpression') {
        clinicalImpressions.push(resourceItem as TClinicalImpression);
      }
    }

    // sort conditions by onset date in descending order
    activeConditions.sort((a, b) => {
      const dateA = a.recordedDate ? new Date(a.recordedDate).getTime() : 0;
      const dateB = b.recordedDate ? new Date(b.recordedDate).getTime() : 0;
      return dateB - dateA;
    });

    // sort clinical impressions by dateTime, period or date in descending order
    clinicalImpressions.sort((a, b) => {
      const dateA = a.effectiveDateTime
        ? new Date(a.effectiveDateTime).getTime()
        : a.effectivePeriod?.start
          ? new Date(a.effectivePeriod.start).getTime()
          : a.date
            ? new Date(a.date).getTime()
            : 0;
      const dateB = b.effectiveDateTime
        ? new Date(b.effectiveDateTime).getTime()
        : b.effectivePeriod?.start
          ? new Date(b.effectivePeriod.start).getTime()
          : b.date
            ? new Date(b.date).getTime()
            : 0;
      return dateB - dateA;
    });

    // Generate active conditions section
    if (activeConditions.length > 0) {
      html += `<h3>Conditions</h3>
        <table>
          <thead>
            <tr>
              <th>Problem</th>
              <th>Onset Date</th>
              <th>Recorded Date</th>
            </tr>
          </thead>
          <tbody>`;
      
      const addedConditionCodes = new Set<string>();

      for (const cond of activeConditions) {
        const conditionCode = templateUtilities.codeableConcept(cond.code);
        if (!addedConditionCodes.has(conditionCode)) {
          addedConditionCodes.add(conditionCode);
          html += `<tr id="${templateUtilities.narrativeLinkId(cond)}">
            <td class="Name">${conditionCode}</td>
            <td class="OnsetDate">${templateUtilities.renderDate(cond.onsetDateTime)}</td>
            <td class="RecordedDate">${templateUtilities.renderDate(cond.recordedDate)}</td>
          </tr>`;
        }
      }

      html += `</tbody>
        </table>`;
    }

    if (clinicalImpressions.length > 0) {
      html += `<h3>Clinical Impressions</h3>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Status</th>
            <th>Description</th>
            <th>Summary</th>
            <th>Findings</th>
          </tr>
        </thead>
        <tbody>`;

      // Loop through clinical impressions
      for (const impression of clinicalImpressions) {
        // Format date (could be effectiveDateTime, effectivePeriod, or date)
        let formattedDate = '';
        if (impression.effectiveDateTime) {
          formattedDate = templateUtilities.renderTime(
            impression.effectiveDateTime,
            timezone
          );
        } else if (impression.effectivePeriod) {
          formattedDate = templateUtilities.renderPeriod(
            impression.effectivePeriod,
            timezone
          );
        } else if (impression.date) {
          formattedDate = templateUtilities.renderDate(impression.date);
        }

        // Format findings
        let findingsHtml = '';
        if (impression.finding && impression.finding.length > 0) {
          findingsHtml = '<ul>';
          for (const finding of impression.finding) {
            // Each finding has an itemCodeableConcept and/or itemReference
            const findingText = finding.itemCodeableConcept
              ? templateUtilities.codeableConcept(finding.itemCodeableConcept)
              : finding.itemReference
                ? templateUtilities.renderReference(finding.itemReference)
                : '';

            // Add cause if present
            const cause = finding.basis || '';

            findingsHtml += `<li>${findingText}${cause ? ` - ${cause}` : ''}</li>`;
          }
          findingsHtml += '</ul>';
        }


        html += `
          <tr id="${templateUtilities.narrativeLinkId(impression)}">
            <td>${formattedDate}</td>
            <td>${impression.status || ''}</td>
            <td>${impression.description || ''}</td>
            <td>${impression.summary || ''}</td>
            <td>${findingsHtml}</td>
          </tr>`;
      }

      html += `</tbody>
        </table>`;
    }

    return html;
  }
}
