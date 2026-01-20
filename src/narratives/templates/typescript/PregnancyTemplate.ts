// PregnancyTemplate.ts - TypeScript replacement for Jinja2 pregnancy.j2
import { TemplateUtilities } from './TemplateUtilities';
import { TDomainResource } from '../../../types/resources/DomainResource';
import { TObservation } from '../../../types/resources/Observation';
import { ISummaryTemplate } from './interfaces/ITemplate';
import { PREGNANCY_LOINC_CODES } from '../../../structures/ips_section_loinc_codes';
import { IPSSectionResourceFilters } from '../../../structures/ips_section_resource_map';
import { TComposition } from '../../../types/resources/Composition';

/**
 * Class to generate HTML narrative for Pregnancy (Observation resources)
 * This replaces the Jinja2 pregnancy.j2 template
 */
export class PregnancyTemplate implements ISummaryTemplate {
    /**
     * Generate HTML narrative for Pregnancy
     * @param resources - FHIR Observation resources
     * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
     * @returns HTML string for rendering
     */
    generateNarrative(resources: TDomainResource[], timezone: string | undefined): string | undefined {
        return PregnancyTemplate.generateStaticNarrative(resources, timezone);
    }

    /**
     * Generate HTML narrative for pregnancy using summary
     * @param resources - FHIR Composition resources
     * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
     * @returns HTML string for rendering
     */
    generateSummaryNarrative(resources: TComposition[], timezone: string | undefined): string | undefined {
        const templateUtilities = new TemplateUtilities(resources);
        let isSummaryCreated = false;
        let html = `<p>This list includes all information about the patient's pregnancy history, sorted by effective date (most recent first).</p>\n`;

        html += `
      <div>
        <table>
          <thead>
            <tr>
              <th>Result</th>
              <th>Code (System)</th>
              <th>Comments</th>
              <th>Date</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>`;

        for (const resourceItem of resources) {
            for (const rowData of resourceItem.section ?? []) {
                const sectionCodeableConcept = rowData.code;
                const rowTitle = rowData.title;
                const data: Record<string, string> = {};
                data["codeSystem"] = templateUtilities.codeableConceptCoding(sectionCodeableConcept);
                for (const columnData of rowData.section ?? []) {
                    const columnTitle = columnData.title;
                    if (columnTitle) {
                        data[columnTitle] = templateUtilities.renderTextAsHtml(columnData.text?.div ?? '');
                    }
                }
                if (rowTitle === "Expected Delivery Date") {
                    data['Result'] = 'Estimated Delivery Date: ' + templateUtilities.renderTextAsHtml(templateUtilities.extractObservationSummaryValue(data, timezone));
                } else {
                    data['Result'] = data['Pregnancy Result'];
                }

                if (data['Result']?.toLowerCase() === 'unknown') {
                    continue;
                }

                isSummaryCreated = true;

                html += `
            <tr>
              <td class="Result">${data['Result'] ? templateUtilities.capitalizeFirstLetter(data['Result']) : ''}</td>
              <td class="CodeSystem">${data['codeSystem']}</td>
              <td class="Comments">${data['Comments'] ?? ''}</td>
              <td class="Date">${templateUtilities.extractObservationSummaryEffectiveTime(data, timezone) ?? ''}</td>
              <td class="Source">${data['Source'] ?? ''}</td>
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
     * @param resources - FHIR Observation resources
     * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
     * @returns HTML string for rendering
     */

    private static generateStaticNarrative(
        resources: TDomainResource[],
        timezone: string | undefined
    ): string | undefined {
        const templateUtilities = new TemplateUtilities(resources);

        const patients = resources.filter(r => r.resourceType === 'Patient');

        // Skip if patient is not female
        if (patients.length === 0) {
            return;
        }

        // Use the same filter logic as IPSSectionResourceFilters[IPSSections.PREGNANCY_HISTORY]
        const pregnancyHistoryFilter = IPSSectionResourceFilters['HistoryOfPregnancySection'];
        const filteredResources = pregnancyHistoryFilter ? resources.filter(pregnancyHistoryFilter) : resources;
        const observations = filteredResources.filter(r => r.resourceType === 'Observation') as TObservation[];

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
        if (!pregnancyStatusObs && !eddObs && historyObs.length === 0) {
            return;
        }

        let html = `<p>This list includes Observation resources relevant to pregnancy, sorted by date (most recent first).</p>`;

        // Start building the HTML table using template literals for readability
        html += `
            <table>
              <thead>
                <tr>
                  <th>Result</th>
                  <th>Code (System)</th>
                  <th>Comments</th>
                  <th>Date</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>`;

        // Helper to render a row
        function renderRow({ result, comments, date, codeSystem, resource }: { result: string, comments: string, date: string, codeSystem: string, resource: TDomainResource }) {
            // Skip if result is unknown
            if (result?.toLowerCase() === 'unknown') {
                return;
            }
            html += `
                <tr>
                  <td class="Result">${templateUtilities.capitalizeFirstLetter(result)}</td>
                  <td class="CodeSystem">${codeSystem}</td>
                  <td class="Comments">${comments}</td>
                  <td class="Date">${date}</td>
                  <td class="Source">${templateUtilities.getOwnerTag(resource)}</td>
                </tr>`;
        }

        // Collect all resources with their date for sorting
        type RowResource = { resource: TDomainResource, date: string | undefined, type: 'status' | 'edd' | 'history' };
        const rowResources: RowResource[] = [];

        if (pregnancyStatusObs) {
            const date = pregnancyStatusObs.effectiveDateTime || pregnancyStatusObs.effectivePeriod?.start;
            rowResources.push({ resource: pregnancyStatusObs, date, type: 'status' });
        }
        if (eddObs) {
            const date = eddObs.effectiveDateTime || eddObs.effectivePeriod?.start;
            rowResources.push({ resource: eddObs, date, type: 'edd' });
        }
        for (const obs of historyObs) {
            const date = obs.effectiveDateTime || obs.effectivePeriod?.start;
            rowResources.push({ resource: obs, date, type: 'history' });
        }

        // Sort by date descending
        rowResources.sort((a, b) => {
            if (!a.date && !b.date) return 0;
            if (!a.date) return 1;
            if (!b.date) return -1;
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

        const addedRows = new Set<string>();

        // Render each row
        for (const { resource, date, type } of rowResources) {
            let result = '', comments = '', dateStr = '', codeSystem = '';
            if (type === 'status') {
                result = templateUtilities.renderTextAsHtml(templateUtilities.extractPregnancyStatus(resource as TObservation));
                comments = templateUtilities.renderNotes((resource as TObservation).note, timezone);
                dateStr = date ? templateUtilities.renderTextAsHtml(templateUtilities.renderTime(date, timezone)) : '';
                codeSystem = templateUtilities.renderTextAsHtml(templateUtilities.codeableConceptCoding((resource as TObservation).code));
            } else if (type === 'edd') {
                result = 'Estimated Delivery Date: ' + templateUtilities.renderTextAsHtml(templateUtilities.extractObservationSummaryValue(resource as TObservation, timezone));
                comments = templateUtilities.renderNotes((resource as TObservation).note, timezone);
                dateStr = date ? templateUtilities.renderTextAsHtml(templateUtilities.renderTime(date, timezone)) : '';
                codeSystem = templateUtilities.renderTextAsHtml(templateUtilities.codeableConceptCoding((resource as TObservation).code));
            } else if (type === 'history') {
                result = templateUtilities.renderTextAsHtml(templateUtilities.extractPregnancyStatus(resource as TObservation));
                comments = templateUtilities.renderNotes((resource as TObservation).note, timezone);
                dateStr = date ? templateUtilities.renderTextAsHtml(templateUtilities.renderTime(date, timezone)) : '';
                codeSystem = templateUtilities.renderTextAsHtml(templateUtilities.codeableConceptCoding((resource as TObservation).code));
            }
            const rowKey = `${result}|${codeSystem}`
            if (!addedRows.has(rowKey)) {
                addedRows.add(rowKey);
                renderRow({ result, comments, date: dateStr, codeSystem, resource });
            }
        }

        html += `
              </tbody>
            </table>`;

        return html;
    }
}
