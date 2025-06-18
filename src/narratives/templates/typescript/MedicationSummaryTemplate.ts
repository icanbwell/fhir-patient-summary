// MedicationSummaryTemplate.ts - TypeScript replacement for Jinja2 medicationsummary.j2
import {TemplateUtilities} from './TemplateUtilities';
import {TBundle} from '../../../types/resources/Bundle';
import {TMedicationRequest} from '../../../types/resources/MedicationRequest';
import {TMedicationStatement} from '../../../types/resources/MedicationStatement';
import {ITemplate} from './interfaces/ITemplate';

/**
 * Class to generate HTML narrative for Medication resources
 * This replaces the Jinja2 medicationsummary.j2 template
 */
export class MedicationSummaryTemplate implements ITemplate {
    /**
     * Generate HTML narrative for Medication resources
     * @param resource - FHIR Bundle containing Medication resources
     * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
     * @returns HTML string for rendering
     */
    generateNarrative(resource: TBundle, timezone?: string): string {
        return MedicationSummaryTemplate.generateStaticNarrative(resource, timezone);
    }

    /**
     * Static implementation of generateNarrative for use with TypeScriptTemplateMapper
     * @param resource - FHIR Bundle containing Medication resources
     * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
     * @returns HTML string for rendering
     */
    static generateNarrative(resource: TBundle, timezone?: string): string {
        return MedicationSummaryTemplate.generateStaticNarrative(resource, timezone);
    }

    /**
     * Internal static implementation that actually generates the narrative
     * @param resource - FHIR Bundle containing Medication resources
     * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
     * @returns HTML string for rendering
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private static generateStaticNarrative(resource: TBundle, timezone?: string): string {
        const templateUtilities = new TemplateUtilities(resource);
        let html = '';

        // Add Medication Requests section if we have any
        const medicationRequests = this.getMedicationRequests(templateUtilities, resource);
        if (medicationRequests.length > 0) {
            html += this.renderMedicationRequests(templateUtilities, medicationRequests);
        }

        // Add Medication Statements section if we have any
        const medicationStatements = this.getMedicationStatements(templateUtilities, resource);
        if (medicationStatements.length > 0) {
            html += this.renderMedicationStatements(templateUtilities, medicationStatements);
        }

        return html;
    }

    /**
     * Extract MedicationRequest resources from the bundle
     * @param templateUtilities - Instance of TemplateUtilities for utility functions
     * @param resource - FHIR Bundle
     * @returns Array of MedicationRequest resources
     */
    private static getMedicationRequests(templateUtilities: TemplateUtilities, resource: TBundle): Array<{ resource: TMedicationRequest, extension?: any }> {
        if (!resource.entry || !Array.isArray(resource.entry)) {
            return [];
        }

        return resource.entry
            .filter(entry => entry.resource?.resourceType === 'MedicationRequest')
            .map(entry => ({
                resource: entry.resource as TMedicationRequest,
                extension: templateUtilities.narrativeLinkExtension(entry.resource)
            }));
    }

    /**
     * Extract MedicationStatement resources from the bundle
     * @param templateUtilities - Instance of TemplateUtilities for utility functions
     * @param resource - FHIR Bundle
     * @returns Array of MedicationStatement resources
     */
    private static  getMedicationStatements(templateUtilities: TemplateUtilities, resource: TBundle): Array<{
        resource: TMedicationStatement,
        extension?: any
    }> {
        if (!resource.entry || !Array.isArray(resource.entry)) {
            return [];
        }

        return resource.entry
            .filter(entry => entry.resource?.resourceType === 'MedicationStatement')
            .map(entry => ({
                resource: entry.resource as TMedicationStatement,
                extension: templateUtilities.narrativeLinkExtension(entry.resource)
            }));
    }

    /**
     * Render HTML table for MedicationRequest resources
     * @param templateUtilities - Instance of TemplateUtilities for utility functions
     * @param medications - Array of MedicationRequest resources
     * @returns HTML string for rendering
     */
    private static renderMedicationRequests(templateUtilities: TemplateUtilities, medications: Array<{
        resource: TMedicationRequest,
        extension?: any
    }>): string {
        let html = `<div xmlns="http://www.w3.org/1999/xhtml">
      <table>
        <thead>
          <tr>
            <th>Medication</th>
            <th>Sig</th>
            <th>Dispense Quantity</th>
            <th>Refills</th>
            <th>Start Date</th>
            <th>End Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>`;

        for (const {resource: mr, extension} of medications) {
            // Use the narrativeLinkId utility function to extract the ID
            const narrativeLinkId = templateUtilities.narrativeLinkId(extension);

            // Format status
            const status = mr.status ? String(mr.status) : '-';

            // Get medication name using the new shared function
            const medication = templateUtilities.getMedicationName(
                mr.medicationReference || mr.medicationCodeableConcept
            );

            // Get Sig/dosage instructions
            const sig = templateUtilities.concat(mr.dosageInstruction, 'text') || '-';

            // Get dispense quantity
            let dispenseQuantity = '-';
            if (mr.dispenseRequest?.quantity) {
                const quantity = mr.dispenseRequest.quantity;
                if (quantity.value) {
                    dispenseQuantity = `${quantity.value} ${quantity.unit || quantity.code || ''}`.trim();
                }
            }

            // Get refills
            const refills = mr.dispenseRequest?.numberOfRepeatsAllowed?.toString() || '-';

            // Get dates
            let startDate = '-';
            let endDate = '-';
            if (mr.dispenseRequest?.validityPeriod) {
                startDate = mr.dispenseRequest.validityPeriod.start || '-';
                endDate = mr.dispenseRequest.validityPeriod.end || '-';
            } else {
                // Use authored date as fallback for start date
                startDate = mr.authoredOn || '-';
            }

            // Add table row
            html += `
        <tr${narrativeLinkId ? ` id="${narrativeLinkId}"` : ''}>
          <td>${medication}<ul></ul></td>
          <td>${sig}</td>
          <td>${dispenseQuantity}</td>
          <td>${refills}</td>
          <td>${startDate}</td>
          <td>${endDate}</td>
          <td>${status}</td>
        </tr>`;
        }

        html += `
        </tbody>
      </table></div>`;

        return html;
    }

    /**
     * Render HTML table for MedicationStatement resources
     * @param templateUtilities - Instance of TemplateUtilities for utility functions
     * @param medications - Array of MedicationStatement resources
     * @returns HTML string for rendering
     */
    private static renderMedicationStatements(templateUtilities: TemplateUtilities, medications: Array<{
        resource: TMedicationStatement,
        extension?: any
    }>): string {
        let html = `<div xmlns="http://www.w3.org/1999/xhtml">
      <table>
        <thead>
          <tr>
            <th>Medication</th>
            <th>Sig</th>
            <th>Dispense Quantity</th>
            <th>Refills</th>
            <th>Start Date</th>
            <th>End Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>`;

        for (const {resource: ms, extension} of medications) {
            // Use the narrativeLinkId utility function to extract the ID
            const narrativeLinkId = templateUtilities.narrativeLinkId(extension);

            // Format status
            const status = ms.status ? String(ms.status) : '-';

            // Get medication name using the new shared function
            const medication = templateUtilities.getMedicationName(
                ms.medicationReference || ms.medicationCodeableConcept
            );

            // Get Sig/dosage instructions
            const sig = templateUtilities.concat(ms.dosage, 'text') || '-';

            // Dispense quantity and refills aren't typically in MedicationStatement
            const dispenseQuantity = '-';
            const refills = '-';

            // Get dates
            let startDate = '-';
            let endDate = '-';
            if (ms.effectiveDateTime) {
                startDate = ms.effectiveDateTime;
            } else if (ms.effectivePeriod) {
                startDate = ms.effectivePeriod.start || '-';
                endDate = ms.effectivePeriod.end || '-';
            }

            // Add table row
            html += `
        <tr${narrativeLinkId ? ` id="${narrativeLinkId}"` : ''}>
          <td>${medication}<ul></ul></td>
          <td>${sig}</td>
          <td>${dispenseQuantity}</td>
          <td>${refills}</td>
          <td>${startDate}</td>
          <td>${endDate}</td>
          <td>${status}</td>
        </tr>`;
        }

        html += `
        </tbody>
      </table></div>`;

        return html;
    }
}
