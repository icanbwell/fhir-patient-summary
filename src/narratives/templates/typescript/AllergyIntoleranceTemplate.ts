// AllergyIntoleranceTemplate.ts - TypeScript replacement for Jinja2 allergyintolerance.j2
import { TemplateUtilities } from './TemplateUtilities';
import { TBundle } from '../../../types/resources/Bundle';
import { TAllergyIntolerance } from '../../../types/resources/AllergyIntolerance';
import { ITemplate } from './interfaces/ITemplate';

/**
 * Class to generate HTML narrative for AllergyIntolerance resources
 * This replaces the Jinja2 allergyintolerance.j2 template
 */
export class AllergyIntoleranceTemplate implements ITemplate {
  /**
   * Generate HTML narrative for AllergyIntolerance resources
   * @param resource - FHIR Bundle containing AllergyIntolerance resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  public generateNarrative(resource: TBundle, timezone?: string): string {
    return AllergyIntoleranceTemplate.generateStaticNarrative(resource, timezone);
  }

  /**
   * Internal static implementation that actually generates the narrative
   * @param resource - FHIR Bundle containing AllergyIntolerance resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private static generateStaticNarrative(resource: TBundle, timezone?: string): string {
    const templateUtilities = new TemplateUtilities(resource);

    // Group allergies by status (active vs resolved/inactive)
    const activeAllergies: TAllergyIntolerance[] = [];
    const resolvedAllergies: TAllergyIntolerance[] = [];

    if (resource.entry && Array.isArray(resource.entry)) {
      for (const entry of resource.entry) {
        const allergy = entry.resource as TAllergyIntolerance;

        // Check clinical status to determine if active or resolved
        const status = allergy.clinicalStatus?.coding?.[0]?.code || '';

        if (status === 'inactive' || status === 'resolved') {
          resolvedAllergies.push(allergy);
        } else {
          activeAllergies.push(allergy);
        }
      }
    }

    // Start building the HTML with proper XHTML namespace
    let html = `<div xmlns="http://www.w3.org/1999/xhtml">`;

    // Active Allergies section
    html += `
      <div class="ActiveAllergies">
        <h3>Active Allergies and Intolerances</h3>
        <table class="ActiveAllergyTable">
          <thead>
            <tr>
              <th>Allergen</th>
              <th>Status</th>
              <th>Category</th>
              <th>Reaction</th>
              <th>Severity</th>
              <th>Onset Date</th>
              <th>Comments</th>
            </tr>
          </thead>
          <tbody>`;

    // Process active allergies
    if (activeAllergies.length > 0) {
      html += this.generateAllergyRows(activeAllergies, templateUtilities);
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

    // Add spacing between tables
    html += `<br />`;

    // Resolved Allergies section
    html += `
      <div class="ResolvedAllergies">
        <h3>Resolved Allergies and Intolerances</h3>
        <table class="ResolvedAllergyTable">
          <thead>
            <tr>
              <th>Allergen</th>
              <th>Status</th>
              <th>Category</th>
              <th>Reaction</th>
              <th>Severity</th>
              <th>Onset Date</th>
              <th>Comments</th>
              <th>Resolved Date</th>
            </tr>
          </thead>
          <tbody>`;

    // Process resolved allergies
    if (resolvedAllergies.length > 0) {
      html += this.generateAllergyRows(resolvedAllergies, templateUtilities, true);
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
      </div>
    </div>`;

    return html;
  }

  /**
   * Helper method to generate HTML table rows for allergies
   * @param allergies - Array of allergy resources to process
   * @param templateUtilities - Utilities for formatting
   * @param includeResolved - Whether to include resolved date column
   * @returns HTML string with table rows
   */
  private static generateAllergyRows(
    allergies: TAllergyIntolerance[],
    templateUtilities: TemplateUtilities,
    includeResolved: boolean = false
  ): string {
    let html = '';

    for (const allergy of allergies) {
      // Find the narrative link extension if it exists
      let narrativeLinkId = '';
      if (allergy.extension && Array.isArray(allergy.extension)) {
        const extension = allergy.extension.find(ext =>
          ext.url === 'http://hl7.org/fhir/StructureDefinition/narrativeLink'
        );
        narrativeLinkId = templateUtilities.narrativeLinkId(extension);
      }

      // Add a table row for this allergy with appropriate classes
      html += `
        <tr id="${narrativeLinkId}">
          <td class="Name"><span class="AllergenName">${templateUtilities.codeableConcept(allergy.code)}</span></td>
          <td class="Status">${templateUtilities.codeableConcept(allergy.clinicalStatus) || '-'}</td>
          <td class="Category">${templateUtilities.safeConcat(allergy.category, 'value') || '-'}</td>
          <td class="Reaction">${templateUtilities.concatReactionManifestation(allergy.reaction) || '-'}</td>
          <td class="Severity">${templateUtilities.safeConcat(allergy.reaction, 'severity') || '-'}</td>
          <td class="OnsetDate">${templateUtilities.renderTime(allergy.onsetDateTime) || '-'}</td>
          <td class="Comments">`;

      // Add notes to the Comments column
      if (allergy.note && allergy.note.length > 0) {
        html += `<ul>`;
        for (const note of allergy.note) {
          const noteDate = templateUtilities.renderTime(note.time) || 'Unknown Date';
          html += `
            <li class="Note">
              <span class="NoteTitle">Comment (${noteDate}):</span><br />
              <span class="WarningMsg"><em>Formatting of this note might be different from the original.</em></span><br />
              <span class="NoteText">${note.text || ''}<br /></span>
            </li>`;
        }
        html += `</ul>`;
      } else {
        html += `-`;
      }

      html += `</td>`;

      // Add resolved date column for resolved allergies
      if (includeResolved) {
        // Try to find end date from extension or use '-' if not found
        let endDate = '-';
        if (allergy.extension && Array.isArray(allergy.extension)) {
          const endDateExt = allergy.extension.find(ext =>
            ext.url === 'http://hl7.org/fhir/StructureDefinition/allergyintolerance-resolutionDate'
          );
          if (endDateExt && endDateExt.valueDateTime) {
            endDate = templateUtilities.renderTime(endDateExt.valueDateTime);
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
