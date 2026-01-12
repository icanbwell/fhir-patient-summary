// FunctionalStatusTemplate.ts - TypeScript replacement for Jinja2 functionalstatus.j2
import { TemplateUtilities } from './TemplateUtilities';
import { TDomainResource } from '../../../types/resources/DomainResource';
import { ISummaryTemplate } from './interfaces/ITemplate';
import { TComposition } from '../../../types/resources/Composition';
import { TClinicalImpression } from '../../../types/resources/ClinicalImpression';
import { TCondition } from '../../../types/resources/Condition';
import { TCode } from '../../../types/simpleTypes/Code';
import { TCodeableConcept } from '../../../types/partials/CodeableConcept';
import { FUNCTIONAL_STATUS_ASSESSMENT_LOINC_CODES, FUNCTIONAL_STATUS_SNOMED_CODES } from '../../../structures/ips_section_loinc_codes';

/**
 * Class to generate HTML narrative for Functional Status (Condition and ClinicalImpression resources)
 * This replaces the Jinja2 functionalstatus.j2 template
 */
export class FunctionalStatusTemplate implements ISummaryTemplate {
  /**
   * Generate HTML narrative for Functional Status
   * @param resources - FHIR resources array containing Condition and ClinicalImpression resources
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

    let html = `
    <div>
      <p>This section summarizes key conditions and assessments related to the person's functional status and ability to perform daily activities.</p>`;

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
            <th>Source</th>
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
            <th>Code (System)</th>
            <th>Date</th>
            <th>Description</th>
            <th>Summary</th>
            <th>Source</th>
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
            if (problem.toLowerCase() === 'unknown') {
              continue;
            }
            conditionsAdded.add(problem);
            conditionHtml += `
                <tr>
                  <td>${templateUtilities.capitalizeFirstLetter(problem)}</td>
                  <td>${templateUtilities.codeableConceptCoding(sectionCodeableConcept)}</td>
                  <td>${date}</td>
                  <td>${templateUtilities.renderTime(data['recordedDate'], timezone) ?? ''}</td>
                  <td>${data['Source'] ?? ''}</td>
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
                  <td>${templateUtilities.codeableConceptCoding(sectionCodeableConcept)}</td>
                  <td>${date ?? ''}</td>
                  <td>${data['Description'] ?? ''}</td>
                  <td>${data['Summary'] ?? ''}</td>
                  <td>${data['Source'] ?? ''}</td>
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
   * @param resources - FHIR resources array containing Condition and ClinicalImpression resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */

  private static generateStaticNarrative(
    resources: TDomainResource[],
    timezone: string | undefined
  ): string | undefined {
     const templateUtilities = new TemplateUtilities(resources);
    let html = `<div>
      <p>This section summarizes key conditions and assessments related to the person's functional status and ability to perform daily activities.</p>`;

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
            <th>Source</th>
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
            <th>Code (System)</th>
            <th>Date</th>
            <th>Description</th>
            <th>Summary</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>`;

    const conditions = resources.filter((entry) => entry.resourceType === 'Condition').map((entry)=> entry as TCondition);

    // Sort conditions by recordedDate in descending order
    conditions.sort((a, b) => {
      const dateA = a.recordedDate ? new Date(a.recordedDate).getTime() : 0;
      const dateB = b.recordedDate ? new Date(b.recordedDate).getTime() : 0;
      return dateB - dateA;
    });

    const addedConditions = new Set<string>();
    // Loop though the condition resources
    for (const cond of conditions) {
      const functionalStatusName = this.getFunctionalStatusNameFromCode(cond.code);
      const problem = templateUtilities.codeableConceptDisplay(cond.code) || functionalStatusName;
      const codeAndSystem = templateUtilities.codeableConceptCoding(cond.code);
      if (!codeAndSystem || !problem || !functionalStatusName || addedConditions.has(functionalStatusName)) {
        continue;
      }
      // Skip if problem is unknown
      if (problem?.toLowerCase() === 'unknown') {
        continue;
      }
      addedConditions.add(functionalStatusName);
      // handle date formatting for onsetDateTime or onsetPeriod
      let date = cond.onsetDateTime
        ? templateUtilities.renderTime(cond.onsetDateTime, timezone)
        : '';
      if (!date && cond.onsetPeriod?.start) {
        date = templateUtilities.renderTime(
          cond.onsetPeriod?.start,
          timezone
        );
        if (cond.onsetPeriod?.end) {
          date +=
            ' - ' +
            templateUtilities.renderTime(cond.onsetPeriod?.end, timezone);
        }
      }

      conditionHtml += `<tr>
          <td>${templateUtilities.capitalizeFirstLetter(problem)}</td>
          <td>${codeAndSystem}</td>
          <td>${date}</td>
          <td>${templateUtilities.renderTime(cond.recordedDate, timezone)}</td>
          <td>${templateUtilities.getOwnerTag(cond)}</td>
        </tr>`;
    }


    const clinicalImpressions = resources.filter((entry) => entry.resourceType === 'ClinicalImpression').map((entry) => entry as TClinicalImpression);

    // Sort clinicalImpressions by effectiveDate in descending order
    clinicalImpressions.sort((a, b) => {
      const dateA = this.getClinicalImpressionEffectiveDate(a);
      const dateB = this.getClinicalImpressionEffectiveDate(b);
      return dateB && dateA
        ? dateB.getTime() - dateA.getTime()
        : 0;
    });

    const addedClinicalImpressions = new Set<string>();
    // Loop though the clinical impression resources
    for (const impression of clinicalImpressions) {
      const name = templateUtilities.codeableConceptDisplay(impression.code);
      const codeAndSystem = templateUtilities.codeableConceptCoding(impression.code);
      if (!codeAndSystem || addedClinicalImpressions.has(name)) {
        continue;
      }
      // Skip if name is unknown
      if (!name || name?.toLowerCase() === 'unknown') {
        continue;
      }
      addedClinicalImpressions.add(name);
      // handle date formatting for effectiveDateTime or effectivePeriod
      let date = impression.effectiveDateTime
        ? templateUtilities.renderTime(impression.effectiveDateTime, timezone)
        : '';
      if (!date && impression.effectivePeriod?.start) {
        date = templateUtilities.renderTime(
          impression.effectivePeriod?.start,
          timezone
        );
        if (impression.effectivePeriod?.end) {
          date +=
            ' - ' +
            templateUtilities.renderTime(impression.effectivePeriod?.end, timezone);
        }
      }

      clinicalImpressionsHtml += `<tr>
          <td>${templateUtilities.capitalizeFirstLetter(name)}</td>
          <td>${codeAndSystem}</td>
          <td>${date}</td>
          <td>${impression.description || ''}</td>
          <td>${impression.summary || ''}</td>
          <td>${templateUtilities.getOwnerTag(impression)}</td>
        </tr>`;
    }

    if (addedConditions.size > 0) {
      html += conditionHtml;
      html += `
          </tbody>
        </table>
        </div>`;
    }
    if (addedClinicalImpressions.size > 0) {
      html += clinicalImpressionsHtml;
      html += `
          </tbody>
        </table>
        </div>`;
    }

    html += `
    </div>`;

    return addedConditions.size > 0 || addedClinicalImpressions.size > 0
      ? html
      : undefined;
  }

  private static getFunctionalStatusNameFromCode(cc?: TCodeableConcept|null): string | undefined {
    if (!cc) return '';
    for (const coding of cc.coding || []) {
      let functionalStatusName = FUNCTIONAL_STATUS_SNOMED_CODES[coding.code as TCode];
      if (functionalStatusName) {
        return functionalStatusName;
      }
      functionalStatusName = FUNCTIONAL_STATUS_ASSESSMENT_LOINC_CODES[coding.code as TCode];
      if (functionalStatusName) {
        return functionalStatusName;
      }
    }
  }

  private static getClinicalImpressionEffectiveDate(impression: TClinicalImpression): Date | undefined {
    if (impression.effectiveDateTime) {
      return new Date(impression.effectiveDateTime);
    } else if (impression.effectivePeriod) {
      if (impression.effectivePeriod.start) {
        return new Date(impression.effectivePeriod.start);
      } else if (impression.effectivePeriod.end) {
        return new Date(impression.effectivePeriod.end);
      }
    }
  }
}
