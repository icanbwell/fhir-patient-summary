// MedicationSummaryTemplate.ts - TypeScript replacement for Jinja2 medicationsummary.j2
import {TemplateUtilities} from './TemplateUtilities';
import {TDomainResource} from '../../../types/resources/DomainResource';
import {TMedicationRequest} from '../../../types/resources/MedicationRequest';
import {TMedicationStatement} from '../../../types/resources/MedicationStatement';
import {ISummaryTemplate} from './interfaces/ITemplate';
import { TComposition } from '../../../types/resources/Composition';

/**
 * Class to generate HTML narrative for Medication resources
 * This replaces the Jinja2 medicationsummary.j2 template
 */
export class MedicationSummaryTemplate implements ISummaryTemplate {
    /**
     * Generate HTML narrative for Medication resources
     * @param resources - FHIR Medication resources
     * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
     * @returns HTML string for rendering
     */
    generateNarrative(resources: TDomainResource[], timezone: string | undefined): string {
        return MedicationSummaryTemplate.generateStaticNarrative(resources, timezone);
    }

    /**
     * Generate HTML narrative for Medication resources using summary
     * @param resources - FHIR Composition resources
     * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
     * @returns HTML string for rendering
     */
    public generateSummaryNarrative(
        resources: TComposition[],
        timezone: string | undefined
    ): string {
        const templateUtilities = new TemplateUtilities(resources);

        let html = `
        <div>
            <table>
            <thead>
                <tr>
                <th>Medication</th>
                <th>Sig</th>
                <th>Days of Supply</th>
                <th>Refills</th>
                <th>Start Date</th>
                </tr>
            </thead>
            <tbody>`;

        for (const resourceItem of resources) {
            for (const rowData of resourceItem.section ?? []) {
                const data: Record<string, string> = {};
                for (const columnData of rowData.section ?? []) {
                    switch (columnData.title) {
                        case 'Medication Name':
                            data['medication'] = columnData.text?.div ?? '';
                            break;
                        case 'Status':
                            data['status'] = columnData.text?.div ?? '';
                            break;
                        case 'Prescriber Instruction':
                            data['sig-prescriber'] = columnData.text?.div ?? '';
                            break;
                        case 'Pharmacy Instruction':
                            data['sig-pharmacy'] = columnData.text?.div ?? '';
                            break;
                        case 'Days Of Supply':
                            data['daysOfSupply'] = columnData.text?.div ?? '';
                            break;
                        case 'Refills Remaining':
                            data['refills'] = columnData.text?.div ?? '';
                            break;
                        case 'Authored On Date':
                            data['startDate'] = columnData.text?.div ?? '';
                            break;
                        default:
                        break;
                    }
                }

                if (data['status'] === 'active') {
                html += `
                    <tr>
                        <td>${data['medication']}</td>
                        <td>${data['sig-prescriber'] || data['sig-pharmacy']}</td>
                        <td>${data['daysOfSupply']}</td>
                        <td>${data['refills']}</td>
                        <td>${templateUtilities.renderTime(data['startDate'], timezone)}</td>
                    </tr>`;
                }
            }
        }

        html += `
            </tbody>
            </table>
        </div>`;

        return html;
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
     * Internal static implementation that actually generates the narrative
     * @param resources - FHIR Medication resources
     * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
     * @returns HTML string for rendering
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private static generateStaticNarrative(resources: TDomainResource[], timezone: string | undefined): string {
        const templateUtilities = new TemplateUtilities(resources);
        let html = '';

        // Get all medication resources
        const medicationRequests = this.getMedicationRequests(templateUtilities, resources);
        const medicationStatements = this.getMedicationStatements(templateUtilities, resources);

        // Combine active medications
        const allActiveMedications: Array<{
            type: 'request' | 'statement',
            resource: TMedicationRequest | TMedicationStatement,
            extension?: any
        }> = [];

        // Process medication requests
        medicationRequests.forEach(mr => {
            allActiveMedications.push({ type: 'request', resource: mr.resource, extension: mr.extension });
        });

        // Process medication statements
        medicationStatements.forEach(ms => {
            allActiveMedications.push({ type: 'statement', resource: ms.resource, extension: ms.extension });
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
            html += this.renderCombinedMedications(templateUtilities, allActiveMedications);
        }

        return html;
    }

    /**
     * Extract MedicationRequest resources
     * @param templateUtilities - Instance of TemplateUtilities for utility functions
     * @param resources - FHIR Medication resources
     * @returns Array of MedicationRequest resources
     */
    private static getMedicationRequests(templateUtilities: TemplateUtilities, resources: TDomainResource[]): Array<{ resource: TMedicationRequest, extension?: any }> {
        if (resources.length === 0) {
            return [];
        }

        return resources
            .filter(entry => entry.resourceType === 'MedicationRequest')
            .map(entry => ({
                resource: entry as TMedicationRequest,
                extension: templateUtilities.narrativeLinkExtension(entry)
            }));
    }

    /**
     * Extract MedicationStatement resources
     * @param templateUtilities - Instance of TemplateUtilities for utility functions
     * @param resources - FHIR Medication resources
     * @returns Array of MedicationStatement resources
     */
    private static getMedicationStatements(templateUtilities: TemplateUtilities, resources: TDomainResource[]): Array<{
        resource: TMedicationStatement,
        extension?: any
    }> {
        if (resources.length === 0) {
            return [];
        }

        return resources
            .filter(entry => entry.resourceType === 'MedicationStatement')
            .map(entry => ({
                resource: entry as TMedicationStatement,
                extension: templateUtilities.narrativeLinkExtension(entry)
            }));
    }

    /**
     * Render HTML table for combined MedicationRequest and MedicationStatement resources
     * @param templateUtilities - Instance of TemplateUtilities for utility functions
     * @param medications - Array of combined medication resources
     * @returns HTML string for rendering
     */
    private static renderCombinedMedications(
        templateUtilities: TemplateUtilities,
        medications: Array<{
            type: 'request' | 'statement',
            resource: TMedicationRequest | TMedicationStatement,
            extension?: any
        }>,
    ): string {
        let html = `
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Medication</th>
            <th>Sig</th>
            <th>Dispense Quantity</th>
            <th>Refills</th>
            <th>Start Date</th>
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

            if (medication.type === 'request') {
                const mr = medication.resource as TMedicationRequest;
                
                type = 'Request';
                
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
                } else {
                    // Use authored date as fallback for start date
                    startDate = mr.authoredOn || '-';
                }
            } else {
                const ms = medication.resource as TMedicationStatement;
                
                type = 'Statement';
                
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
          <td>${startDate}</td>
        </tr>`;
        }

        html += `
        </tbody>
      </table>`;

        return html;
    }
}
