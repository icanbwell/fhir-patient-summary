// FunctionalStatusTemplate.ts - TypeScript replacement for Jinja2 functionalstatus.j2
import { TemplateUtilities } from './TemplateUtilities';
import { TDomainResource } from '../../../types/resources/DomainResource';
import { ITemplate } from './interfaces/ITemplate';
import { TClinicalImpression } from '../../../types/resources/ClinicalImpression';

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
  generateNarrative(resources: TDomainResource[], timezone: string | undefined): string | undefined {
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
  ): string | undefined {
     const templateUtilities = new TemplateUtilities(resources);
    let html = `<p>This section summarizes key observations and assessments related to the person's functional status and ability to perform daily activities.</p>`;

    // Only include relevant Observations (LOINC 47420-5 or category 'functional-status') and completed ClinicalImpressions
    let functionalObservations = resources
      .filter((r): r is any => r.resourceType === 'Observation')
      .filter((r) => {
        // LOINC 47420-5 or category 'functional-status'
        const hasFunctionalLoinc = r.code?.coding?.some(
          (c: any) => c.system?.toLowerCase().includes('loinc') && c.code === '47420-5'
        );
        const hasFunctionalCategory = r.category?.some((cat: any) =>
          cat.coding?.some((c: any) =>
            (c.code === 'functional-status' || c.display?.toLowerCase().includes('functional'))
          )
        );
        return hasFunctionalLoinc || hasFunctionalCategory;
      });

    // Sort functionalObservations descending by date
    functionalObservations = functionalObservations.sort((a, b) => {
      const getObsDate = (obs: any) =>
        obs.effectiveDateTime ? new Date(obs.effectiveDateTime).getTime() :
        obs.issued ? new Date(obs.issued).getTime() : 0;
      return getObsDate(b) - getObsDate(a);
    });

    // Only include completed ClinicalImpressions
    let clinicalImpressions: TClinicalImpression[] = resources
      .filter((r): r is TClinicalImpression => r.resourceType === 'ClinicalImpression')
      .filter((r) => r.status === 'completed');

    // Sort clinicalImpressions descending by date
    clinicalImpressions = clinicalImpressions.sort((a, b) => {
      const getImpressionDate = (ci: any) =>
        ci.effectiveDateTime ? new Date(ci.effectiveDateTime).getTime() :
        ci.effectivePeriod?.end ? new Date(ci.effectivePeriod.end).getTime() :
        ci.date ? new Date(ci.date).getTime() : 0;
      return getImpressionDate(b) - getImpressionDate(a);
    });

    // Render Observations table if any
    if (functionalObservations.length > 0) {
      html += `<table><thead><tr><th>Observation</th><th>Value</th><th>Date</th><th>Interpretation</th><th>Comments</th></tr></thead><tbody>`;
      for (const obs of functionalObservations) {
        const observation = obs as any;
        const obsName = templateUtilities.codeableConceptDisplay(observation.code);
        const value = templateUtilities.extractObservationValue(observation);
        const date = observation.effectiveDateTime
          ? templateUtilities.renderDate(observation.effectiveDateTime)
          : observation.issued
            ? templateUtilities.renderDate(observation.issued)
            : '';
        const interpretation = observation.interpretation
          ? templateUtilities.codeableConceptDisplay(observation.interpretation[0])
          : '';
        const comments = observation.comment || observation.note?.map((n: any) => n.text).join('; ') || '';
        html += `<tr>
          <td>${templateUtilities.capitalizeFirstLetter(obsName)}</td>
          <td>${value ?? ''}</td>
          <td>${date}</td>
          <td>${interpretation}</td>
          <td>${comments}</td>
        </tr>`;
      }
      html += `</tbody></table>`;
    }

    // Render ClinicalImpressions table if any
    if (clinicalImpressions.length > 0) {
      html += `<table><thead><tr><th>Date</th><th>Status</th><th>Description</th><th>Summary</th><th>Findings</th></tr></thead><tbody>`;
      for (const impression of clinicalImpressions) {
        let formattedDate = '';
        if (impression.effectiveDateTime) {
          formattedDate = templateUtilities.renderTime(impression.effectiveDateTime, timezone);
        } else if (impression.effectivePeriod) {
          formattedDate = templateUtilities.renderPeriod(impression.effectivePeriod, timezone);
        } else if (impression.date) {
          formattedDate = templateUtilities.renderDate(impression.date);
        }
        let findingsHtml = '';
        if (impression.finding && impression.finding.length > 0) {
          findingsHtml = '<ul>';
          for (const finding of impression.finding) {
            const findingText = finding.itemCodeableConcept
              ? templateUtilities.codeableConceptDisplay(finding.itemCodeableConcept)
              : finding.itemReference
                ? templateUtilities.renderReference(finding.itemReference)
                : '';
            const cause = finding.basis || '';
            findingsHtml += `<li>${findingText}${cause ? ` - ${cause}` : ''}</li>`;
          }
          findingsHtml += '</ul>';
        }
        html += `<tr>
          <td>${formattedDate}</td>
          <td>${impression.status || ''}</td>
          <td>${impression.description || ''}</td>
          <td>${impression.summary || ''}</td>
          <td>${findingsHtml}</td>
        </tr>`;
      }
      html += `</tbody></table>`;
    }

    // If no data, show message
    if (functionalObservations.length === 0 && clinicalImpressions.length === 0) {
      html += `<p>No functional status information available.</p>`;
    }

    return html;
  }
}
