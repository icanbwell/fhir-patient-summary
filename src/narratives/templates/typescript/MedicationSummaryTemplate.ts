// MedicationSummaryTemplate.ts - TypeScript replacement for Jinja2 medicationsummary.j2
import {TemplateUtilities} from './TemplateUtilities';
import {TBundle} from '../../../types/resources/Bundle';
import {TMedicationRequest} from '../../../types/resources/MedicationRequest';
import {TMedicationStatement} from '../../../types/resources/MedicationStatement';

/**
 * Class to generate HTML narrative for Medication resources
 * This replaces the Jinja2 medicationsummary.j2 template
 */
export class MedicationSummaryTemplate {
    /**
     * Generate HTML narrative for Medication resources
     * @param resource - FHIR Bundle containing Medication resources
     * @returns HTML string for rendering
     */
    static generateNarrative(resource: TBundle): string {
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
        let html = `
      <h5>Medication Summary: Medication Requests</h5>
      <table class="hapiPropertyTable">
        <thead>
          <tr>
            <th>Medication</th>
            <th>Status</th>
            <th>Route</th>
            <th>Sig</th>
            <th>Comments</th>
            <th>Authored Date</th>
          </tr>
        </thead>
        <tbody>`;

        for (const {resource: mr, extension} of medications) {
            // Use the narrativeLinkId utility function to extract the ID
            const narrativeLinkId = templateUtilities.narrativeLinkId(extension);

            // Format status
            let status = '';
            if (mr.status) {
                status = String(mr.status);
            }

            // Add table row
            html += `
        <tr${narrativeLinkId ? ` id="${narrativeLinkId}"` : ''}>
          <td>${templateUtilities.codeableConcept(mr.medicationCodeableConcept)}</td>
          <td>${status}</td>
          <td>${templateUtilities.concatDosageRoute(mr.dosageInstruction)}</td>
          <td>${templateUtilities.concat(mr.dosageInstruction, 'text')}</td>
          <td>${templateUtilities.concat(mr.note, 'text')}</td>
          <td>${mr.authoredOn || ''}</td>
        </tr>`;
        }

        html += `
        </tbody>
      </table>`;

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
        let html = `
      <h5>Medication Summary: Medication Statements</h5>
      <table class="hapiPropertyTable">
        <thead>
          <tr>
            <th>Medication</th>
            <th>Status</th>
            <th>Category</th>
            <th>Route</th>
            <th>Dosage</th>
            <th>Effective</th>
            <th>Date Asserted</th>
          </tr>
        </thead>
        <tbody>`;

        for (const {resource: ms, extension} of medications) {
            // Use the narrativeLinkId utility function to extract the ID
            const narrativeLinkId = templateUtilities.narrativeLinkId(extension);

            // Format status
            let status = '';
            if (ms.status) {
                status = String(ms.status);
            }

            // Format effective date/time
            let effectiveDate = '';
            if (ms.effectiveDateTime) {
                effectiveDate = ms.effectiveDateTime;
            } else if (ms.effectivePeriod) {
                const start = ms.effectivePeriod.start || '';
                const end = ms.effectivePeriod.end || '';
                effectiveDate = start && end ? `${start} to ${end}` : (start || end);
            }

            // Add table row
            html += `
        <tr${narrativeLinkId ? ` id="${narrativeLinkId}"` : ''}>
          <td>${templateUtilities.renderMedicationStatement(ms)}</td>
          <td>${status}</td>
          <td>${templateUtilities.codeableConcept(ms.category)}</td>
          <td>${templateUtilities.concatDosageRoute(ms.dosage)}</td>
          <td>${templateUtilities.concat(ms.dosage, 'text')}</td>
          <td>${effectiveDate}</td>
          <td>${ms.dateAsserted || ''}</td>
        </tr>`;
        }

        html += `
        </tbody>
      </table>`;

        return html;
    }
}
