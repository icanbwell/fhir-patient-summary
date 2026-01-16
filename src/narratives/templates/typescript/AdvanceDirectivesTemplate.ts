// AdvanceDirectivesTemplate.ts - TypeScript replacement for Jinja2 advancedirectives.j2
import {TemplateUtilities} from './TemplateUtilities';
import {TConsent} from '../../../types/resources/Consent';
import {ISummaryTemplate} from './interfaces/ITemplate';
import { TDomainResource } from '../../../types/resources/DomainResource';
import { TComposition } from '../../../types/resources/Composition';

/**
 * Class to generate HTML narrative for Advance Directives (Consent resources)
 * This replaces the Jinja2 advancedirectives.j2 template
 */
export class AdvanceDirectivesTemplate implements ISummaryTemplate {
  /**
   * Generate HTML narrative for Advance Directives
   * @param resources - FHIR Consent resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  generateNarrative(resources: TDomainResource[], timezone: string | undefined): string | undefined {
    // sort the entries by date in descending order
    resources.sort((a, b) => {
      const dateA = new Date((a as TConsent).dateTime || 0);
      const dateB = new Date((b as TConsent).dateTime || 0);
      return dateB.getTime() - dateA.getTime(); // Sort in descending order
    });

    return AdvanceDirectivesTemplate.generateStaticNarrative(resources, timezone);
  }

  /**
   * Generate HTML narrative for advance directives using summary
   * @param resources - FHIR Composition resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  generateSummaryNarrative(resources: TComposition[], timezone: string | undefined): string | undefined {
    const templateUtilities = new TemplateUtilities(resources);
    let isSummaryCreated = false;

    let html = `<p>This list includes all Consent resources, sorted by date (most recent first).</p>\n`;

    html += `
      <div>
        <table>
          <thead>
            <tr>
              <th>Directive</th>
              <th>Code (System)</th>
              <th>Action Controlled</th>
              <th>Policy Rule</th>
              <th>Date</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>`;
    
    for (const resourceItem of resources) {
      for (const rowData of resourceItem.section ?? []) {
        const sectionCodeableConcept = rowData.code;
        const data: Record<string, string> = {};
        data["codeSystem"] = templateUtilities.codeableConceptCoding(sectionCodeableConcept);
        for (const columnData of rowData.section ?? []) {
          const columnTitle = columnData.title;
          if (columnTitle) {
            data[columnTitle] = templateUtilities.renderTextAsHtml(columnData.text?.div ?? '');
          }
        }

        // Skip if Advanced Directive Name is unknown
        if (data['Advanced Directive Name']?.toLowerCase() === 'unknown') {
          continue;
        }

        isSummaryCreated = true;

        html += `
          <tr>
            <td>${templateUtilities.capitalizeFirstLetter(data['Advanced Directive Name'] ?? '')}</td>
            <td>${data['codeSystem'] ?? ''}</td>
            <td>${data['Provision Action'] ?? ''}</td>
            <td>${data['Policy Rule'] ?? ''}</td>
            <td>${data['DateTime'] ?? ''}</td>
            <td>${data['Source'] ?? ''}</td>
          </tr>`;
      }
    }

    html += `
          </tbody>
        </table>
      </div>`;

    return isSummaryCreated ? html : undefined;
  }

  /**
   * Internal static implementation that actually generates the narrative
   * @param resources - FHIR Consent resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private static generateStaticNarrative(resources: TDomainResource[], timezone: string | undefined): string | undefined {

    const templateUtilities = new TemplateUtilities(resources);
    // Start building the HTML table
    let html = `<p>This list includes all Consent resources, sorted by date (most recent first).</p>\n`;
    html += `<table>
        <thead>
          <tr>
            <th>Scope</th>
            <th>Status</th>
            <th>Action Controlled</th>
            <th>Date</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>`;

    let isConsentAdded = false;

    for (const resourceItem of resources) {
      const consent = resourceItem as TConsent;
      const consentScope = templateUtilities.capitalizeFirstLetter(templateUtilities.renderTextAsHtml(templateUtilities.codeableConceptDisplay(consent.scope, 'display')));
      if (!consentScope || consentScope.toLowerCase() === 'unknown') {
        continue;
      }
      isConsentAdded = true;
      html += `
        <tr>
          <td>${consentScope}</td>
          <td>${consent.status || ''}</td>
          <td>${consent.provision?.action ? templateUtilities.concatCodeableConcept(consent.provision.action) : ''}</td>
          <td>${consent.dateTime || ''}</td>
          <td>${templateUtilities.getOwnerTag(consent)}</td>
        </tr>`;
    }

    // Close the HTML table
    html += `
        </tbody>
      </table>`;

    return isConsentAdded ? html : undefined;
  }
}
