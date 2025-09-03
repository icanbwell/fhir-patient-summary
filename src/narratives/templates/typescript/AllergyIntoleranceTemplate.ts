// AllergyIntoleranceTemplate.ts - TypeScript replacement for Jinja2 allergyintolerance.j2
import {TemplateUtilities} from './TemplateUtilities';
import {TDomainResource} from '../../../types/resources/DomainResource';
import {TAllergyIntolerance} from '../../../types/resources/AllergyIntolerance';
import {ISummaryTemplate} from './interfaces/ITemplate';
import { TComposition } from '../../../types/resources/Composition';

/**
 * Class to generate HTML narrative for AllergyIntolerance resources
 * This replaces the Jinja2 allergyintolerance.j2 template
 */
export class AllergyIntoleranceTemplate implements ISummaryTemplate {
  /**
   * Generate HTML narrative for AllergyIntolerance resources
   * @param resources - FHIR resources array containing AllergyIntolerance resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  public generateNarrative(resources: TDomainResource[], timezone: string | undefined): string {
    return AllergyIntoleranceTemplate.generateStaticNarrative(resources, timezone);
  }

  /**
   * Generate HTML narrative for AllergyIntolerance resources using summary
   * @param resources - FHIR Composition resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  public generateSummaryNarrative(resources: TComposition[], timezone: string | undefined): string {
    const templateUtilities = new TemplateUtilities(resources);

    let html = `
      <div>
        <table>
          <thead>
            <tr>
              <th>Allergen</th>
              <th>Criticality</th>
              <th>Recorded Date</th>
            </tr>
          </thead>
          <tbody>`;
    
    for (const resourceItem of resources) {
      for (const rowData of resourceItem.section ?? []){
        const data: Record<string, string> = {}
        for (const columnData of rowData.section ?? []){
          switch (columnData.title){
            case 'Allergen Name':
              data["allergen"] = columnData.text?.div ?? "";
              break;
            case 'Criticality':
              data["criticality"] = columnData.text?.div ?? "";
              break;
            case 'Recorded Date':
              data["recordedDate"] = columnData.text?.div ?? "";
              break;
            default:
              break;
          }
        }

        html += `
            <tr>
              <td>${data["allergen"] ?? "-"}</td>
              <td>${data["criticality"] ?? "-"}</td>
              <td>${templateUtilities.renderTime(data["recordedDate"], timezone) ?? "-"}</td>
            </tr>`;
      }
    }

    html += `
          </tbody>
        </table>
      </div>`;

    return html;
  }

  /**
   * Internal static implementation that actually generates the narrative
   * @param resources - FHIR resources array containing AllergyIntolerance resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  private static generateStaticNarrative(resources: TDomainResource[], timezone: string | undefined): string {
    const templateUtilities = new TemplateUtilities(resources);

    // Group allergies by status (active vs resolved/inactive)
    const activeAllergies: TAllergyIntolerance[] = [];
    const resolvedAllergies: TAllergyIntolerance[] = [];

    for (const resourceItem of resources) {
      const allergy = resourceItem as TAllergyIntolerance;

      // Check clinical status to determine if active or resolved
      const isResolved = allergy.clinicalStatus?.coding?.some((c: any) => ['inactive', 'resolved'].includes(c.code));

      if (isResolved) {
        resolvedAllergies.push(allergy);
      } else {
        activeAllergies.push(allergy);
      }
    }

    // Sort allergies by onsetDateTime (if available) in descending order for both active and resolved
    activeAllergies.sort((a, b) => {
      const dateA = a.onsetDateTime;
      const dateB = b.onsetDateTime;
      return (dateA && dateB) ? new Date(dateB).getTime() - new Date(dateA).getTime() : 0;
    });
    resolvedAllergies.sort((a, b) => {
      const dateA = a.onsetDateTime;
      const dateB = b.onsetDateTime;
      return (dateA && dateB) ? new Date(dateB).getTime() - new Date(dateA).getTime() : 0;
    });

    // Start building the HTML with proper XHTML namespace
    let html = '';

    // Active Allergies section
    html += `
      <div class="ActiveAllergies">
        <h3>Active</h3>
        <table class="ActiveAllergyTable">
          <thead>
            <tr>
              <th>Allergen</th>
              <th>Status</th>
              <th>Category</th>
              <th>Reaction</th>
              <th>Onset Date</th>
              <th>Comments</th>
            </tr>
          </thead>
          <tbody>`;

    // Process active allergies
    if (activeAllergies.length > 0) {
      html += this.generateAllergyRows(activeAllergies, templateUtilities, timezone);
    } else {
      html += `
          <tr>
            <td colspan="7">No active allergies recorded</td>
          </tr>`;
    }

    // Close the active allergies table
    html += `
          </tbody>
        </table>
      </div>`;

    // Resolved Allergies section
    html += `
      <div class="ResolvedAllergies">
        <h3>Resolved</h3>
        <table class="ResolvedAllergyTable">
          <thead>
            <tr>
              <th>Allergen</th>
              <th>Status</th>
              <th>Category</th>
              <th>Reaction</th>
              <th>Onset Date</th>
              <th>Comments</th>
              <th>Resolved Date</th>
            </tr>
          </thead>
          <tbody>`;

    // Process resolved allergies
    if (resolvedAllergies.length > 0) {
      html += this.generateAllergyRows(resolvedAllergies, templateUtilities, timezone, true);
    } else {
      html += `
          <tr>
            <td colspan="8">No resolved allergies recorded</td>
          </tr>`;
    }

    // Close the resolved allergies table
    html += `
          </tbody>
        </table>
      </div>`;

    return html;
  }

  /**
   * Helper method to generate HTML table rows for allergies
   * @param allergies - Array of allergy resources to process
   * @param templateUtilities - Utilities for formatting
   * @param includeResolved - Whether to include resolved date column
   * @param timezone - Optional timezone to use for date formatting
   * @returns HTML string with table rows
   */
  private static generateAllergyRows(
    allergies: TAllergyIntolerance[],
    templateUtilities: TemplateUtilities,
    timezone: string | undefined,
    includeResolved: boolean = false
  ): string {
    let html = '';

    for (const allergy of allergies) {
      // Find the narrative link extension if it exists
      // Add a table row for this allergy with appropriate classes
      html += `
        <tr id="${(templateUtilities.narrativeLinkId(allergy.extension))}">
          <td class="Name"><span class="AllergenName">${templateUtilities.codeableConcept(allergy.code)}</span></td>
          <td class="Status">${templateUtilities.codeableConcept(allergy.clinicalStatus) || '-'}</td>
          <td class="Category">${templateUtilities.safeConcat(allergy.category) || '-'}</td>
          <td class="Reaction">${templateUtilities.concatReactionManifestation(allergy.reaction) || '-'}</td>
          <td class="OnsetDate">${templateUtilities.renderTime(allergy.onsetDateTime, timezone) || '-'}</td>
          <td class="Comments">${templateUtilities.renderNotes(allergy.note, timezone, { styled: true, warning: true })}</td>`;

      // Add resolved date column for resolved allergies
      if (includeResolved) {
        // Try to find end date from extension or use '-' if not found
        let endDate = '-';
        if (allergy.extension && Array.isArray(allergy.extension)) {
          const endDateExt = allergy.extension.find(ext =>
            ext.url === 'http://hl7.org/fhir/StructureDefinition/allergyintolerance-resolutionDate'
          );
          if (endDateExt && endDateExt.valueDateTime) {
            endDate = templateUtilities.renderDate(endDateExt.valueDateTime);
          }
        }

        html += `
          <td class="ResolvedDate">${endDate}</td>`;
      }

      html += `</tr>`;
    }

    return html;
  }
}
