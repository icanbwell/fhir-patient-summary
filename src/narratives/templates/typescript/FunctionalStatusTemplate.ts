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

    // identify active conditions
    const activeConditions: TCondition[] = [];
    const clinicalImpressions: TClinicalImpression[] = [];

    // Loop through resources in the array
    for (const resourceItem of resources) {
      if (resourceItem.resourceType === 'Condition') {
        const cond = resourceItem as TCondition;

        // Determine if condition is active or resolved
        const isResolved = cond.clinicalStatus?.coding?.some(
          c =>
            c.code === 'resolved' ||
            c.code === 'inactive' ||
            c.display?.toLowerCase().includes('resolved')
        );

        if (!isResolved) {
          activeConditions.push(cond);
        }
      } else if (resourceItem.resourceType === 'ClinicalImpression') {
        clinicalImpressions.push(resourceItem as TClinicalImpression);
      }
    }

    // sort conditions by onset date in descending order
    activeConditions.sort((a, b) => {
      const dateA = a.onsetDateTime ? new Date(a.onsetDateTime).getTime() : 0;
      const dateB = b.onsetDateTime ? new Date(b.onsetDateTime).getTime() : 0;
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
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>`;

      for (const cond of activeConditions) {
        html += `<tr id="${templateUtilities.narrativeLinkId(cond)}">
          <td class="Name">${templateUtilities.codeableConcept(cond.code)}</td>
          <td class="OnsetDate">${templateUtilities.renderDate(cond.onsetDateTime)}</td>
          <td class="RecordedDate">${templateUtilities.renderDate(cond.recordedDate)}</td>
          <td class="Notes">${templateUtilities.renderNotes(cond.note, timezone, { styled: true, warning: true })}</td>
        </tr>`;
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
            <th>Notes</th>
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

  

        // Format notes
        const notes = templateUtilities.renderNotes(impression.note, timezone);

        html += `
          <tr id="${templateUtilities.narrativeLinkId(impression)}">
            <td>${formattedDate}</td>
            <td>${impression.status || ''}</td>
            <td>${impression.description || ''}</td>
            <td>${impression.summary || ''}</td>
            <td>${findingsHtml}</td>
            <td>${notes}</td>
          </tr>`;
      }

      html += `</tbody>
        </table>`;
    }

    return html;
  }
}
