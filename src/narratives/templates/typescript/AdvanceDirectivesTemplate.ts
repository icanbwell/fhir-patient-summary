// AdvanceDirectivesTemplate.ts - TypeScript replacement for Jinja2 advancedirectives.j2
import { TemplateUtilities } from './TemplateUtilities';
import { TConsent } from '../../../types/resources/Consent';
import { ISummaryTemplate } from './interfaces/ITemplate';
import { TDomainResource } from '../../../types/resources/DomainResource';
import { TComposition } from '../../../types/resources/Composition';
import {
  ADVANCED_DIRECTIVE_CATEGORY_CODES,
  ADVANCED_DIRECTIVE_LOINC_CODES,
  ADVANCED_DIRECTIVE_CATEGORY_SYSTEM,
  LOINC_SYSTEM,
} from '../../../structures/ips_section_loinc_codes';
import CODING_SYSTEM_DISPLAY_NAMES from '../../../structures/codingSystemDisplayNames';

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
  generateNarrative(
    resources: TDomainResource[],
    timezone: string | undefined
  ): string | undefined {
    // sort the entries by date in descending order
    resources.sort((a, b) => {
      const dateA = new Date((a as TConsent).dateTime || 0);
      const dateB = new Date((b as TConsent).dateTime || 0);
      return dateB.getTime() - dateA.getTime(); // Sort in descending order
    });

    return AdvanceDirectivesTemplate.generateStaticNarrative(
      resources,
      timezone
    );
  }

  /**
   * Generate HTML narrative for advance directives using summary
   * @param resources - FHIR Composition resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  generateSummaryNarrative(
    resources: TComposition[],
    timezone: string | undefined
  ): string | undefined {
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
        data['codeSystem'] = templateUtilities.codeableConceptCoding(
          sectionCodeableConcept
        );
        for (const columnData of rowData.section ?? []) {
          const columnTitle = columnData.title;
          if (columnTitle) {
            if (columnTitle === 'DateTime') {
              data[columnTitle] = templateUtilities.renderTime(
                columnData.text?.div ?? '',
                timezone
              );
            } else {
              data[columnTitle] = templateUtilities.renderTextAsHtml(
                columnData.text?.div ?? ''
              );
            }
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
  private static generateStaticNarrative(
    resources: TDomainResource[],
    timezone: string | undefined
  ): string | undefined {
    const templateUtilities = new TemplateUtilities(resources);
    // Start building the HTML table
    let html = `<p>This list includes all Consent resources, sorted by date (most recent first).</p>\n`;
    html += `<table>
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

    const consentAdded = new Set();

    for (const resourceItem of resources) {
      const consent = resourceItem as TConsent;

      let consentDirective: { name?: string; system?: string; code?: string } =
        {};

      for (const category of consent.category || []) {
        for (const coding of category.coding || []) {
          if (
            coding.system === ADVANCED_DIRECTIVE_CATEGORY_SYSTEM &&
            coding.code &&
            coding.code in ADVANCED_DIRECTIVE_CATEGORY_CODES
          ) {
            consentDirective = {
              name: ADVANCED_DIRECTIVE_CATEGORY_CODES[
                coding.code as keyof typeof ADVANCED_DIRECTIVE_CATEGORY_CODES
              ],
              system: coding.system,
              code: coding.code,
            };

            break;
          } else if (
            coding.system === LOINC_SYSTEM &&
            coding.code &&
            coding.code in ADVANCED_DIRECTIVE_LOINC_CODES
          ) {
            consentDirective = {
              name: ADVANCED_DIRECTIVE_LOINC_CODES[
                coding.code as keyof typeof ADVANCED_DIRECTIVE_LOINC_CODES
              ],
              system: coding.system,
              code: coding.code,
            };
            break;
          }
        }
      }

      if (
        !consentDirective.name ||
        !consentDirective.code ||
        !consentDirective.system ||
        consentDirective.name.toLowerCase() === 'unknown' ||
        consentAdded.has(consentDirective.name)
      ) {
        continue;
      }
      consentAdded.add(consentDirective.name);
      const consentCodeSystem = `${consentDirective.code} (${CODING_SYSTEM_DISPLAY_NAMES[consentDirective.system] || consentDirective.system})`;
      html += `
        <tr>
          <td>${consentDirective.name}</td>
          <td>${consentCodeSystem || ''}</td>
          <td>${consent.provision?.action ? templateUtilities.concatCodeableConcept(consent.provision.action) : ''}</td>
          <td>${consent.policyRule ? templateUtilities.formatCodeableConceptValue(consent.policyRule) : ''}</td>
          <td>${templateUtilities.renderTime(consent.dateTime, timezone) || ''}</td>
          <td>${templateUtilities.getOwnerTag(consent)}</td>
        </tr>`;
    }

    // Close the HTML table
    html += `
        </tbody>
      </table>`;

    return consentAdded.size > 0 ? html : undefined;
  }
}
