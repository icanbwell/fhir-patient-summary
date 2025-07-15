// FamilyHistoryTemplate.ts - TypeScript template for Family History section
import {TemplateUtilities} from './TemplateUtilities';
import {TBundle} from '../../../types/resources/Bundle';
import {TFamilyMemberHistory} from '../../../types/resources/FamilyMemberHistory';
import {ITemplate} from './interfaces/ITemplate';

/**
 * Class to generate HTML narrative for Family History (FamilyMemberHistory resources)
 * This generates narrative for the Family History section of the IPS
 */
export class FamilyHistoryTemplate implements ITemplate {
    /**
     * Generate HTML narrative for Family History
     * @param resource - FHIR Bundle containing FamilyMemberHistory resources
     * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
     * @returns HTML string for rendering
     */
    generateNarrative(resource: TBundle, timezone: string | undefined): string {
        const templateUtilities = new TemplateUtilities(resource);
        // Start building the HTML table
        let html = `
      <h5>Family History</h5>
      <table>
        <thead>
          <tr>
            <th>Relationship</th>
            <th>Condition</th>
            <th>Status</th>
            <th>Onset</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>`;

        // Check if we have entries in the bundle
        if (resource.entry && Array.isArray(resource.entry)) {
            let hasFamilyHistory = false;

            // Loop through entries in the bundle
            for (const entry of resource.entry) {
                const familyHistory = entry.resource;

                // Skip non-FamilyMemberHistory resources
                if (!familyHistory || familyHistory.resourceType !== 'FamilyMemberHistory') {
                    continue;
                }

                hasFamilyHistory = true;
                const fmh = familyHistory as TFamilyMemberHistory;

                // Extract relationship
                const relationship = templateUtilities.codeableConcept(fmh.relationship, 'display');

                // Process conditions if they exist
                if (fmh.condition && Array.isArray(fmh.condition)) {
                    for (const condition of fmh.condition) {
                        const conditionCode = templateUtilities.codeableConcept(condition.code, 'display');
                        const status = fmh.status || '';

                        // Handle onset which could be various types (dateTime, Age, Range, string, Period)
                        let onset = '';
                        if (condition.onsetAge) {
                            onset = templateUtilities.renderOnset(condition.onsetAge, timezone);
                        }

                        // Notes can be at the condition level or the family history level
                        const notes = condition.note ?
                            templateUtilities.renderNotes(condition.note, timezone) :
                            templateUtilities.renderNotes(fmh.note, timezone);

                        html += `
          <tr id="${templateUtilities.narrativeLinkId(fmh)}">
            <td>${relationship}</td>
            <td>${conditionCode}</td>
            <td>${status}</td>
            <td>${onset}</td>
            <td>${notes}</td>
          </tr>`;
                    }
                } else {
                    // If no specific conditions are listed, just show the relationship
                    html += `
          <tr id="${templateUtilities.narrativeLinkId(fmh)}">
            <td>${relationship}</td>
            <td>Not specified</td>
            <td>${fmh.status || ''}</td>
            <td></td>
            <td>${templateUtilities.renderNotes(fmh.note, timezone)}</td>
          </tr>`;
                }
            }

            // If no family history entries were found
            if (!hasFamilyHistory) {
                html += `
          <tr>
            <td colspan="5">No family history recorded</td>
          </tr>`;
            }
        } else {
            html += `
          <tr>
            <td colspan="5">No family history recorded</td>
          </tr>`;
        }

        html += `
        </tbody>
      </table>`;

        return html;
    }
}
