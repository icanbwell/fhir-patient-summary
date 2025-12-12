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

        let html = '<table><thead><tr><th>Result</th><th>Comments</th><th>Date</th></tr></thead><tbody>';

        // Pregnancy status row
        if (pregnancyStatusObs) {
            html += `<tr id="${templateUtilities.narrativeLinkId(pregnancyStatusObs)}"><td>${templateUtilities.renderTextAsHtml(templateUtilities.extractPregnancyStatus(pregnancyStatusObs))}</td><td>${templateUtilities.renderNotes(pregnancyStatusObs.note, timezone)}</td><td>${pregnancyStatusObs.effectiveDateTime ? templateUtilities.renderTextAsHtml(templateUtilities.renderTime(pregnancyStatusObs.effectiveDateTime, timezone)) : pregnancyStatusObs.effectivePeriod ? templateUtilities.renderTextAsHtml(templateUtilities.renderPeriod(pregnancyStatusObs.effectivePeriod, timezone)) : ''}</td></tr>`;
        }

        // Estimated Delivery Date row
        if (eddObs) {
            html += `<tr id="${templateUtilities.narrativeLinkId(eddObs)}"><td>Estimated Delivery Date: ${templateUtilities.renderTextAsHtml(templateUtilities.extractObservationSummaryValue(eddObs, timezone))}</td><td>${templateUtilities.renderNotes(eddObs.note, timezone)}</td><td>${eddObs.effectiveDateTime ? templateUtilities.renderTextAsHtml(templateUtilities.renderTime(eddObs.effectiveDateTime, timezone)) : eddObs.effectivePeriod ? templateUtilities.renderTextAsHtml(templateUtilities.renderPeriod(eddObs.effectivePeriod, timezone)) : ''}</td></tr>`;
        }

        // Pregnancy history/outcome rows
        for (const obs of historyObs) {
            html += `<tr id="${templateUtilities.narrativeLinkId(obs)}"><td>${templateUtilities.renderTextAsHtml(templateUtilities.extractPregnancyStatus(obs))}</td><td>${templateUtilities.renderNotes(obs.note, timezone)}</td><td>${obs.effectiveDateTime ? templateUtilities.renderTextAsHtml(templateUtilities.renderTime(obs.effectiveDateTime, timezone)) : obs.effectivePeriod ? templateUtilities.renderTextAsHtml(templateUtilities.renderPeriod(obs.effectivePeriod, timezone)) : ''}</td></tr>`;
        }

        // Add Condition rows if present
        for (const cond of conditions) {
          const condition = cond as TCondition;
          html += `<tr id="${templateUtilities.narrativeLinkId(condition)}"><td>${templateUtilities.renderTextAsHtml(templateUtilities.codeableConceptDisplay(condition.code))}</td><td>${templateUtilities.renderNotes(condition.note, timezone)}</td><td>${condition.onsetDateTime ? templateUtilities.renderTextAsHtml(templateUtilities.renderTime(condition.onsetDateTime, timezone)) : condition.onsetPeriod ? templateUtilities.renderTextAsHtml(templateUtilities.renderPeriod(condition.onsetPeriod, timezone)) : ''}</td></tr>`;
        }

        html += '</tbody></table>';

        return html;
    }
}
