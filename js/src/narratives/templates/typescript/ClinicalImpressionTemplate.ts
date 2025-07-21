// ClinicalImpressionTemplate.ts - TypeScript template for Clinical Impression section
import { TemplateUtilities } from './TemplateUtilities';
import { TBundle } from '../../../types/resources/Bundle';
import { TClinicalImpression } from '../../../types/resources/ClinicalImpression';
import { ITemplate } from './interfaces/ITemplate';

/**
 * Class to generate HTML narrative for Clinical Impression resources
 * This generates narrative for the Clinical Impression section of the IPS
 */
export class ClinicalImpressionTemplate implements ITemplate {
    /**
     * Generate HTML narrative for Clinical Impressions
     * @param resource - FHIR Bundle containing ClinicalImpression resources
     * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
     * @returns HTML string for rendering
     */
    generateNarrative(resource: TBundle, timezone: string | undefined): string {
        const templateUtilities = new TemplateUtilities(resource);
        // Start building the HTML table
        let html = `
      <h5>Clinical Impressions</h5>
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

        // Check if we have entries in the bundle
        if (resource.entry && Array.isArray(resource.entry)) {
            let hasClinicalImpressions = false;

            // Loop through entries in the bundle
            for (const entry of resource.entry) {
                const res = entry.resource;

                // Skip non-ClinicalImpression resources
                if (!res || res.resourceType !== 'ClinicalImpression') {
                    continue;
                }

                hasClinicalImpressions = true;
                const impression = res as TClinicalImpression;

                // Format date (could be effectiveDateTime, effectivePeriod, or date)
                let formattedDate = '';
                if (impression.effectiveDateTime) {
                    formattedDate = templateUtilities.renderTime(impression.effectiveDateTime, timezone);
                } else if (impression.effectivePeriod) {
                    formattedDate = templateUtilities.renderPeriod(impression.effectivePeriod, timezone);
                } else if (impression.date) {
                    formattedDate = templateUtilities.renderDate(impression.date);
                }

                // Format status
                const status = impression.status || '';

                // Description and summary
                const description = impression.description || '';
                const summary = impression.summary || '';

                // Format findings
                let findingsHtml = '';
                if (impression.finding && impression.finding.length > 0) {
                    findingsHtml = '<ul>';
                    for (const finding of impression.finding) {
                        // Each finding has an itemCodeableConcept and/or itemReference
                        const findingText = finding.itemCodeableConcept
                            ? templateUtilities.codeableConcept(finding.itemCodeableConcept, 'display')
                            : (finding.itemReference
                                ? templateUtilities.renderReference(finding.itemReference)
                                : '');

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
            <td>${status}</td>
            <td>${description}</td>
            <td>${summary}</td>
            <td>${findingsHtml}</td>
            <td>${notes}</td>
          </tr>`;
            }

            // If no clinical impression entries were found
            if (!hasClinicalImpressions) {
                html += `
          <tr>
            <td colspan="6">No clinical impressions recorded</td>
          </tr>`;
            }
        } else {
            html += `
          <tr>
            <td colspan="6">No clinical impressions recorded</td>
          </tr>`;
        }

        html += `
        </tbody>
      </table>`;

        return html;
    }
}
