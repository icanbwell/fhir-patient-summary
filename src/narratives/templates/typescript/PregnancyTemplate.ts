// PregnancyTemplate.ts - TypeScript replacement for Jinja2 pregnancy.j2
import {TemplateUtilities} from './TemplateUtilities';
import {TDomainResource} from '../../../types/resources/DomainResource';
import {TObservation} from '../../../types/resources/Observation';
import {ITemplate} from './interfaces/ITemplate';
import {PREGNANCY_LOINC_CODES} from '../../../structures/ips_section_loinc_codes';
import {IPSSectionResourceFilters} from '../../../structures/ips_section_resource_map';
import { TCondition } from '../../../types/resources/Condition';

/**
 * Class to generate HTML narrative for Pregnancy (Observation resources)
 * This replaces the Jinja2 pregnancy.j2 template
 */
export class PregnancyTemplate implements ITemplate {
    /**
     * Generate HTML narrative for Pregnancy
     * @param resources - FHIR Observation resources
     * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
     * @returns HTML string for rendering
     */
    generateNarrative(resources: TDomainResource[], timezone: string | undefined): string {
        return PregnancyTemplate.generateStaticNarrative(resources, timezone);
    }

    /**
     * Internal static implementation that actually generates the narrative
     * @param resources - FHIR Observation resources
     * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
     * @returns HTML string for rendering
     */

    private static generateStaticNarrative(
        resources: TDomainResource[],
        timezone: string | undefined
    ): string {
        const templateUtilities = new TemplateUtilities(resources);

        // Use the same filter logic as IPSSectionResourceFilters[IPSSections.PREGNANCY_HISTORY]
        const pregnancyHistoryFilter = IPSSectionResourceFilters['HistoryOfPregnancySection'];
        const filteredResources = pregnancyHistoryFilter ? resources.filter(pregnancyHistoryFilter) : resources;
        const observations = filteredResources.filter(r => r.resourceType === 'Observation') as TObservation[];
        const conditions = filteredResources.filter(r => r.resourceType === 'Condition');

        // LOINC code for Estimated Delivery Date
        const EDD_LOINC = '11778-8';
        // Pregnancy status codes
        const pregnancyStatusCodes = Object.keys(PREGNANCY_LOINC_CODES.PREGNANCY_STATUS);
        // Pregnancy outcome/history codes
        const pregnancyOutcomeCodes = Object.keys(PREGNANCY_LOINC_CODES.PREGNANCY_OUTCOME);

        // Find latest pregnancy status observation
        const pregnancyStatusObs = observations
            .filter(obs => obs.code?.coding?.some(c => c.code && pregnancyStatusCodes.includes(c.code)))
            .sort((a, b) => {
                const dateA = a.effectiveDateTime || a.effectivePeriod?.start;
                const dateB = b.effectiveDateTime || b.effectivePeriod?.start;
                return dateB && dateA ? new Date(dateB).getTime() - new Date(dateA).getTime() : 0;
            })[0];

        // Find latest EDD observation
        const eddObs = observations
            .filter(obs => obs.code?.coding?.some(c => c.code === EDD_LOINC))
            .sort((a, b) => {
                const dateA = a.effectiveDateTime || a.effectivePeriod?.start;
                const dateB = b.effectiveDateTime || b.effectivePeriod?.start;
                return dateB && dateA ? new Date(dateB).getTime() - new Date(dateA).getTime() : 0;
            })[0];

        // Find all pregnancy history/outcome observations
        const historyObs = observations
            .filter(obs =>
                obs.code?.coding?.some(c => c.code && pregnancyOutcomeCodes.includes(c.code)) ||
                obs.valueCodeableConcept?.coding?.some(c => c.code && pregnancyOutcomeCodes.includes(c.code))
            )
            .sort((a, b) => {
                const dateA = a.effectiveDateTime || a.effectivePeriod?.start;
                const dateB = b.effectiveDateTime || b.effectivePeriod?.start;
                return dateB && dateA ? new Date(dateB).getTime() - new Date(dateA).getTime() : 0;
            });

        // If no data, show message
        if (!pregnancyStatusObs && !eddObs && historyObs.length === 0 && conditions.length === 0) {
            return `<p>No history of pregnancy found.</p>`;
        }

        // Collect all rows with their date for sorting
        type Row = {
            html: string;
            date: string | undefined;
        };
        const rows: Row[] = [];

        // Pregnancy status row
        if (pregnancyStatusObs) {
            const date = pregnancyStatusObs.effectiveDateTime || pregnancyStatusObs.effectivePeriod?.start;
            rows.push({
                html: `<tr id="${templateUtilities.narrativeLinkId(pregnancyStatusObs)}"><td>${templateUtilities.renderTextAsHtml(templateUtilities.extractPregnancyStatus(pregnancyStatusObs))}</td><td>${templateUtilities.renderNotes(pregnancyStatusObs.note, timezone)}</td><td>${date ? templateUtilities.renderTextAsHtml(templateUtilities.renderTime(date, timezone)) : ''}</td></tr>`,
                date
            });
        }

        // Estimated Delivery Date row
        if (eddObs) {
            const date = eddObs.effectiveDateTime || eddObs.effectivePeriod?.start;
            rows.push({
                html: `<tr id="${templateUtilities.narrativeLinkId(eddObs)}"><td>Estimated Delivery Date: ${templateUtilities.renderTextAsHtml(templateUtilities.extractObservationSummaryValue(eddObs, timezone))}</td><td>${templateUtilities.renderNotes(eddObs.note, timezone)}</td><td>${date ? templateUtilities.renderTextAsHtml(templateUtilities.renderTime(date, timezone)) : ''}</td></tr>`,
                date
            });
        }

        // Pregnancy history/outcome rows
        for (const obs of historyObs) {
            const date = obs.effectiveDateTime || obs.effectivePeriod?.start;
            rows.push({
                html: `<tr id="${templateUtilities.narrativeLinkId(obs)}"><td>${templateUtilities.renderTextAsHtml(templateUtilities.extractPregnancyStatus(obs))}</td><td>${templateUtilities.renderNotes(obs.note, timezone)}</td><td>${date ? templateUtilities.renderTextAsHtml(templateUtilities.renderTime(date, timezone)) : ''}</td></tr>`,
                date
            });
        }

        // Add Condition rows if present
        for (const cond of conditions) {
            const condition = cond as TCondition;
            const date = condition.onsetDateTime || condition.onsetPeriod?.start;
            rows.push({
                html: `<tr id="${templateUtilities.narrativeLinkId(condition)}"><td>${templateUtilities.renderTextAsHtml(templateUtilities.codeableConceptDisplay(condition.code))}</td><td>${templateUtilities.renderNotes(condition.note, timezone)}</td><td>${date ? templateUtilities.renderTextAsHtml(templateUtilities.renderTime(date, timezone)) : ''}</td></tr>`,
                date
            });
        }

        // Sort rows descending by date (most recent first)
        rows.sort((a, b) => {
            if (!a.date && !b.date) return 0;
            if (!a.date) return 1;
            if (!b.date) return -1;
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

        // Start building the HTML table using template literals for readability
        let html = `
          <table>
            <thead>
              <tr>
                <th>Result</th>
                <th>Comments</th>
                <th>Date</th>
                <th>Code (System)</th>
              </tr>
            </thead>
            <tbody>`;

        for (const row of rows) {
            let resource = undefined;
            if (row.html.includes('id="')) {
                const idMatch = row.html.match(/id="([^"]+)"/);
                if (idMatch) {
                    const id = idMatch[1];
                    resource = resources.find(r => templateUtilities.narrativeLinkId(r) === id);
                }
            }
            let codeSystem = '';
            if (resource && (resource.resourceType === 'Observation' || resource.resourceType === 'Condition') && 'code' in resource) {
                codeSystem = templateUtilities.codeableConceptCoding(resource.code as any);
            }
            // Parse the row HTML and extract the <td>...</td> cells
            const tdMatches = Array.from(row.html.matchAll(/<td>(.*?)<\/td>/g)).map(m => m[1]);
            html += `
              <tr id="${resource ? templateUtilities.narrativeLinkId(resource) : ''}">
                <td>${tdMatches[0] || ''}</td>
                <td>${tdMatches[1] || ''}</td>
                <td>${tdMatches[2] || ''}</td>
                <td>${templateUtilities.renderTextAsHtml(codeSystem)}</td>
              </tr>`;
        }

        html += `
            </tbody>
          </table>`;

        return html;
    }
}
