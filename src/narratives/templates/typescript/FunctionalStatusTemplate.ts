// FunctionalStatusTemplate.ts - TypeScript replacement for Jinja2 functionalstatus.j2
import { TemplateUtilities } from './TemplateUtilities';
import { TDomainResource } from '../../../types/resources/DomainResource';
import { ISummaryTemplate } from './interfaces/ITemplate';
import { TComposition } from '../../../types/resources/Composition';
import { TClinicalImpression } from '../../../types/resources/ClinicalImpression';

/**
 * Class to generate HTML narrative for Functional Status (Observation resources)
 * This replaces the Jinja2 functionalstatus.j2 template
 */
export class FunctionalStatusTemplate implements ISummaryTemplate {
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
   * Generate HTML narrative for Functional Status Condition & ClinicalImpression resources using summary
   * @param resources - FHIR Composition resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @param now - Optional current date for filtering
   * @returns HTML string for rendering
   */
  public generateSummaryNarrative(
    resources: TComposition[],
    timezone: string | undefined
  ): string | undefined {
    const templateUtilities = new TemplateUtilities(resources);

    let html = `<p>This section summarizes key conditions and assessments related to the person's functional status and ability to perform daily activities.</p>`;

    let conditionHtml = `
    <div>
      <h3>Conditions</h3>
      <table>
        <thead>
          <tr>
            <th>Problem</th>
            <th>Code (System)</th>
            <th>Onset Date</th>
            <th>Recorded Date</th>
          </tr>
        </thead>
        <tbody>`;

    let clinicalImpressionsHtml = `
    <div>
      <h3>Clinical Impressions</h3>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Date</th>
            <th>Code (System)</th>
            <th>Description</th>
            <th>Summary</th>
          </tr>
        </thead>
        <tbody>`;

    const conditionsAdded = new Set<string>();
    const clinicalImpressionsAdded = new Set<string>();

    for (const resourceItem of resources) {
      for (const rowData of resourceItem.section ?? []) {
        const sectionCodeableConcept = rowData.code;
        const data: Record<string, string> = {};
        for (const columnData of rowData.section ?? []) {
          if (columnData.title) {
            data[columnData.title] = templateUtilities.renderTextAsHtml(
              columnData.text?.div ?? ''
            );
          }
        }

        if (
          resourceItem.title ===
          'Condition|Condition Summary Grouped by Functional Status Code'
        ) {
          // handle date formatting for onsetDateTime or onsetPeriod
          let date = data['onsetDateTime']
            ? templateUtilities.renderTime(data['onsetDateTime'], timezone)
            : '';
          if (!date && data['onsetPeriod.start']) {
            date = templateUtilities.renderTime(
              data['onsetPeriod.start'],
              timezone
            );
            if (data['onsetPeriod.end']) {
              date +=
                ' - ' +
                templateUtilities.renderTime(data['onsetPeriod.end'], timezone);
            }
          }
          const problem = data['Condition Name'];
          if (problem && !conditionsAdded.has(problem)) {
            // Skip condition if name is unknown
            if (data['Condition Name']?.toLowerCase() === 'unknown') {
              continue;
            }
            conditionsAdded.add(problem);
            conditionHtml += `
                <tr>
                  <td>${templateUtilities.capitalizeFirstLetter(problem)}</td>
                  <td>${templateUtilities.codeableConceptCoding(sectionCodeableConcept)}</td>
                  <td>${date ?? ''}</td>
                  <td>${templateUtilities.renderTime(data['recordedDate'], timezone) ?? ''}</td>
                </tr>`;
          }
        } else if (
          resourceItem.title ===
          'Clinical Impression|Clinical Impression Summary'
        ) {
          // handle date formatting for effectiveDateTime or effectivePeriod
          let date = data['effectiveDateTime']
            ? templateUtilities.renderTime(data['effectiveDateTime'], timezone)
            : '';
          if (!date && data['effectivePeriod.start']) {
            date = templateUtilities.renderTime(
              data['effectivePeriod.start'],
              timezone
            );
            if (data['effectivePeriod.end']) {
              date +=
                ' - ' +
                templateUtilities.renderTime(data['effectivePeriod.end'], timezone);
            }
          }
          const name = data['Clinical Impression Name'];
          if (name && !clinicalImpressionsAdded.has(name)) {
            // Skip clinical impression if name is unknown
            if (name?.toLowerCase() === 'unknown') {
              continue;
            }
            clinicalImpressionsAdded.add(name);
            clinicalImpressionsHtml += `
                <tr>
                  <td>${templateUtilities.capitalizeFirstLetter(name)}</td>
                  <td>${date ?? ''}</td>
                  <td>${templateUtilities.codeableConceptCoding(sectionCodeableConcept)}</td>
                  <td>${data['Description'] ?? ''}</td>
                  <td>${data['Summary'] ?? ''}</td>
                </tr>`;
          }
        }
      }
    }

    if (conditionsAdded.size > 0) {
      html += conditionHtml;
      html += `
          </tbody>
        </table>
        </div>`;
    }
    if (clinicalImpressionsAdded.size > 0) {
      html += clinicalImpressionsHtml;
      html += `
          </tbody>
        </table>
        </div>`;
    }

    html += `
    </div>`;

    return conditionsAdded.size > 0 || clinicalImpressionsAdded.size > 0
      ? html
      : undefined;
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
        // Skip if observation name is unknown
        if (obsName?.toLowerCase() === 'unknown') {
          continue;
        }
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
