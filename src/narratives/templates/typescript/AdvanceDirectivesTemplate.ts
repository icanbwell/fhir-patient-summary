// AdvanceDirectivesTemplate.ts - TypeScript replacement for Jinja2 advancedirectives.j2
import {TemplateUtilities} from './TemplateUtilities';
import {TConsent} from '../../../types/resources/Consent';
import {ITemplate} from './interfaces/ITemplate';
import { TDomainResource } from '../../../types/resources/DomainResource';

/**
 * Class to generate HTML narrative for Advance Directives (Consent resources)
 * This replaces the Jinja2 advancedirectives.j2 template
 */
export class AdvanceDirectivesTemplate implements ITemplate {
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
          </tr>
        </thead>
        <tbody>`;

    let isConsentAdded = false;

    for (const resourceItem of resources) {
      const consent = resourceItem as TConsent;
      const consentScope = templateUtilities.capitalizeFirstLetter(templateUtilities.renderTextAsHtml(templateUtilities.codeableConceptDisplay(consent.scope, 'display')))
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
        </tr>`;
    }

    // Close the HTML table
    html += `
        </tbody>
      </table>`;

    return isConsentAdded ? html : undefined;
  }
}
