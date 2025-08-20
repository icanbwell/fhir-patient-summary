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
    generateNarrative(resource: TBundle, timezone: string | undefined): string {
        return MedicationSummaryTemplate.generateStaticNarrative(resource, timezone);
    }

    /**
     * Safely parse a date string and return a valid Date object or null
     * @param dateString - The date string to parse
     * @returns Date object or null if invalid
     */
    private static parseDate(dateString: string | undefined): Date | null {
        if (!dateString || dateString.trim() === '') {
            return null;
        }
        
        const date = new Date(dateString);
        // Check if the date is valid
        return !isNaN(date.getTime()) ? date : null;
    }

    /**
     * Determine if a MedicationRequest is active
     * @param medicationRequest - The MedicationRequest resource
     * @returns boolean indicating if the medication request is active
     */
    private static isActiveMedicationRequest(medicationRequest: TMedicationRequest): boolean {
        // Consider active if status is 'active' or if no end date is specified
        const status = medicationRequest.status?.toLowerCase();
        if (status === 'active' || status === 'unknown') {
            return true;
        }
        if (status === 'completed' || status === 'cancelled' || status === 'stopped' || status === 'draft') {
            return false;
        }
        
        // Check if there's an end date - if no end date, consider active
        const endDate = medicationRequest.dispenseRequest?.validityPeriod?.end;
        if (!endDate) {
            return true;
        }
        
        // If there's an end date, check if it's in the future
        const parsedEndDate = this.parseDate(endDate);
        if (!parsedEndDate) {
            return true; // If we can't parse the end date, assume active
        }
        
        return parsedEndDate.getTime() > Date.now();
    }

    /**
     * Determine if a MedicationStatement is active
     * @param medicationStatement - The MedicationStatement resource
     * @returns boolean indicating if the medication statement is active
     */
    private static isActiveMedicationStatement(medicationStatement: TMedicationStatement): boolean {
        // Consider active if status is 'active', 'intended', or 'unknown'
        const status = medicationStatement.status?.toLowerCase();
        if (status === 'active' || status === 'intended' || status === 'unknown') {
            return true;
        }
        if (status === 'completed' || status === 'stopped' || status === 'not-taken') {
            return false;
        }
        
        // Check if there's an end date
        let endDate: string | undefined;
        if (medicationStatement.effectivePeriod?.end) {
            endDate = medicationStatement.effectivePeriod.end;
        }
        
        if (!endDate) {
            return true; // No end date, consider active
        }
        
        // If there's an end date, check if it's in the future
        const parsedEndDate = this.parseDate(endDate);
        if (!parsedEndDate) {
            return true; // If we can't parse the end date, assume active
        }
        
        return parsedEndDate.getTime() > Date.now();
    }

    /**
     * Internal static implementation that actually generates the narrative
     * @param resource - FHIR Bundle containing Medication resources
     * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
     * @returns HTML string for rendering
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private static generateStaticNarrative(resource: TBundle, timezone: string | undefined): string {
        const templateUtilities = new TemplateUtilities(resource);
        let html = '';

        // Get all medication resources
        const medicationRequests = this.getMedicationRequests(templateUtilities, resource);
        const medicationStatements = this.getMedicationStatements(templateUtilities, resource);

        // Combine and separate active and inactive medications
        const allActiveMedications: Array<{
            type: 'request' | 'statement',
            resource: TMedicationRequest | TMedicationStatement,
            extension?: any
        }> = [];
        
        const allInactiveMedications: Array<{
            type: 'request' | 'statement',
            resource: TMedicationRequest | TMedicationStatement,
            extension?: any
        }> = [];

        // Process medication requests
        medicationRequests.forEach(mr => {
            if (this.isActiveMedicationRequest(mr.resource)) {
                allActiveMedications.push({ type: 'request', resource: mr.resource, extension: mr.extension });
            } else {
                allInactiveMedications.push({ type: 'request', resource: mr.resource, extension: mr.extension });
            }
        });

        // Process medication statements
        medicationStatements.forEach(ms => {
            if (this.isActiveMedicationStatement(ms.resource)) {
                allActiveMedications.push({ type: 'statement', resource: ms.resource, extension: ms.extension });
            } else {
                allInactiveMedications.push({ type: 'statement', resource: ms.resource, extension: ms.extension });
            }
        });

        // Sort both groups by start date in descending order
        const sortMedications = (medications: typeof allActiveMedications) => {
            medications.sort((a, b) => {
                let dateStringA: string | undefined;
                let dateStringB: string | undefined;

                if (a.type === 'request') {
                    const mr = a.resource as TMedicationRequest;
                    dateStringA = mr.dispenseRequest?.validityPeriod?.start || mr.authoredOn;
                } else {
                    const ms = a.resource as TMedicationStatement;
                    dateStringA = ms.effectiveDateTime || ms.effectivePeriod?.start;
                }

                if (b.type === 'request') {
                    const mr = b.resource as TMedicationRequest;
                    dateStringB = mr.dispenseRequest?.validityPeriod?.start || mr.authoredOn;
                } else {
                    const ms = b.resource as TMedicationStatement;
                    dateStringB = ms.effectiveDateTime || ms.effectivePeriod?.start;
                }
                
                const dateA = this.parseDate(dateStringA);
                const dateB = this.parseDate(dateStringB);
                
                // Handle null dates - put items without dates at the end
                if (!dateA && !dateB) return 0;
                if (!dateA) return 1;
                if (!dateB) return -1;
                
                return dateB.getTime() - dateA.getTime();
            });
        };

        // Render active medications section
        if (allActiveMedications.length > 0) {
            sortMedications(allActiveMedications);
            html += this.renderCombinedMedications(templateUtilities, allActiveMedications, true);
        }

        // Render inactive medications section
        if (allInactiveMedications.length > 0) {
            sortMedications(allInactiveMedications);
            html += this.renderCombinedMedications(templateUtilities, allInactiveMedications, false);
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
     * Render HTML table for combined MedicationRequest and MedicationStatement resources
     * @param templateUtilities - Instance of TemplateUtilities for utility functions
     * @param medications - Array of combined medication resources
     * @param sectionTitle - Title for the section
     * @returns HTML string for rendering
     */
    private static renderCombinedMedications(
        templateUtilities: TemplateUtilities,
        medications: Array<{
            type: 'request' | 'statement',
            resource: TMedicationRequest | TMedicationStatement,
            extension?: any
        }>,
        isActiveSection: boolean
    ): string {
        let html = `
    <h3>${isActiveSection ? 'Active Medications' : 'Inactive Medications'}</h3>
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Medication</th>
            <th>Sig</th>
            <th>Dispense Quantity</th>
            <th>Refills</th>
            <th>Start Date</th>${isActiveSection ? '' : `
            <th>End Date</th>`}
            <th>Status</th>
          </tr>
        </thead>
        <tbody>`;

        for (const medication of medications) {
            // Use the narrativeLinkId utility function to extract the ID
            const narrativeLinkId = templateUtilities.narrativeLinkId(medication.extension);

            let type: string;
            let medicationName: string;
            let sig: string;
            let dispenseQuantity: string = '-';
            let refills: string = '-';
            let startDate: string = '-';
            let endDate: string = '-';
            let status: string;

            if (medication.type === 'request') {
                const mr = medication.resource as TMedicationRequest;
                
                type = 'Request';
                status = mr.status ? String(mr.status) : '-';
                
                // Get medication name
                medicationName = templateUtilities.getMedicationName(
                    mr.medicationReference || mr.medicationCodeableConcept
                );

                // Get Sig/dosage instructions
                sig = templateUtilities.concat(mr.dosageInstruction, 'text') || '-';

                // Get dispense quantity
                if (mr.dispenseRequest?.quantity) {
                    const quantity = mr.dispenseRequest.quantity;
                    if (quantity.value) {
                        dispenseQuantity = `${quantity.value} ${quantity.unit || quantity.code || ''}`.trim();
                    }
                }

                // Get refills
                refills = mr.dispenseRequest?.numberOfRepeatsAllowed?.toString() || '-';

                // Get dates
                if (mr.dispenseRequest?.validityPeriod) {
                    startDate = mr.dispenseRequest.validityPeriod.start || '-';
                    endDate = mr.dispenseRequest.validityPeriod.end || '-';
                } else {
                    // Use authored date as fallback for start date
                    startDate = mr.authoredOn || '-';
                }
            } else {
                const ms = medication.resource as TMedicationStatement;
                
                type = 'Statement';
                status = ms.status ? String(ms.status) : '-';
                
                // Get medication name
                medicationName = templateUtilities.getMedicationName(
                    ms.medicationReference || ms.medicationCodeableConcept
                );

                // Get Sig/dosage instructions
                sig = templateUtilities.concat(ms.dosage, 'text') || '-';

                // Get dates
                if (ms.effectiveDateTime) {
                    startDate = ms.effectiveDateTime;
                } else if (ms.effectivePeriod) {
                    startDate = ms.effectivePeriod.start || '-';
                    endDate = ms.effectivePeriod.end || '-';
                }
            }

            // Add table row
            html += `
        <tr${narrativeLinkId ? ` id="${narrativeLinkId}"` : ''}>
          <td>${type}</td>
          <td>${medicationName}<ul></ul></td>
          <td>${sig}</td>
          <td>${dispenseQuantity}</td>
          <td>${refills}</td>
          <td>${startDate}</td>${isActiveSection ? '' : `
          <td>${endDate}</td>`}
          <td>${status}</td>
        </tr>`;
        }

        html += `
        </tbody>
      </table>`;

        return html;
    }
}
