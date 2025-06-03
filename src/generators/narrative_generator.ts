import {TDomainResource} from "../types/resources/DomainResource";
import {TPatient} from "../types/resources/Patient";
import {TAllergyIntolerance} from "../types/resources/AllergyIntolerance";
import {TMedicationStatement} from "../types/resources/MedicationStatement";
import {TCondition} from "../types/resources/Condition";
import {TImmunization} from "../types/resources/Immunization";
import {TObservation} from "../types/resources/Observation";
import {TCodeableConcept} from "../types/partials/CodeableConcept";

interface Narrative {
    status: 'generated' | 'extensions' | 'additional' | 'empty';
    div: string; // XHTML div content
}

class NarrativeGenerator {
    /**
     * Generate a narrative for any FHIR resource
     * @param resource - FHIR resource
     * @returns Narrative representation
     */
    static generateNarrative<T extends TDomainResource>(
        resource: T
    ): Narrative {
        // Dispatch to specific resource type generators
        const generators: Record<string, (res: any) => string> = {
            Patient: NarrativeGenerator.generatePatientNarrative,
            AllergyIntolerance: NarrativeGenerator.generateAllergyIntoleranceNarrative,
            MedicationStatement: NarrativeGenerator.generateMedicationStatementNarrative,
            Condition: NarrativeGenerator.generateConditionNarrative,
            Immunization: NarrativeGenerator.generateImmunizationNarrative,
            Observation: NarrativeGenerator.generateObservationNarrative
        };

        // Select generator or use default
        const generator = generators[`${resource.resourceType}`] ||
            NarrativeGenerator.generateDefaultNarrative;

        return {
            status: 'generated',
            div: NarrativeGenerator.wrapInXhtml(generator(resource))
        };
    }

    /**
     * Wrap content in XHTML div with FHIR namespace
     * @param content - HTML content to wrap
     * @returns XHTML div string
     */
    private static wrapInXhtml(content: string): string {
        return `<div xmlns="http://www.w3.org/1999/xhtml">${content}</div>`;
    }

    /**
     * Generate patient narrative
     * @param patient - Patient resource
     * @returns Narrative HTML
     */
    private static generatePatientNarrative(patient: TPatient): string {
        const name = NarrativeGenerator.formatPersonName(patient.name);
        const identifiers = NarrativeGenerator.formatIdentifiers(patient.identifier);

        return `
      <h1>${name}</h1>
      <table>
        <tbody>
          <tr>
            <th>Gender</th>
            <td>${patient.gender || 'Not specified'}</td>
          </tr>
          <tr>
            <th>Birth Date</th>
            <td>${patient.birthDate || 'Not specified'}</td>
          </tr>
          ${identifiers ? `
          <tr>
            <th>Identifiers</th>
            <td>${identifiers}</td>
          </tr>` : ''}
        </tbody>
      </table>
    `;
    }

    /**
     * Generate allergy intolerance narrative
     * @param allergy - AllergyIntolerance resource
     * @returns Narrative HTML
     */
    private static generateAllergyIntoleranceNarrative(
        allergy: TAllergyIntolerance
    ): string {
        const allergenName = NarrativeGenerator.formatCodeableConcept(allergy.code);
        const clinicalStatus = allergy.clinicalStatus;
        const reactions = NarrativeGenerator.formatReactions(allergy.reaction);

        return `
      <h2>Allergy/Intolerance</h2>
      <table>
        <tbody>
          <tr>
            <th>Allergen</th>
            <td>${allergenName}</td>
          </tr>
          <tr>
            <th>Clinical Status</th>
            <td>${clinicalStatus}</td>
          </tr>
          ${reactions ? `
          <tr>
            <th>Reactions</th>
            <td>${reactions}</td>
          </tr>` : ''}
        </tbody>
      </table>
    `;
    }

    /**
     * Generate medication statement narrative
     * @param medication - MedicationStatement resource
     * @returns Narrative HTML
     */
    private static generateMedicationStatementNarrative(
        medication: TMedicationStatement
    ): string {
        const medicationName = NarrativeGenerator.formatCodeableConcept(
            medication.medicationCodeableConcept
        );

        return `
      <h2>Medication</h2>
      <table>
        <tbody>
          <tr>
            <th>Medication</th>
            <td>${medicationName}</td>
          </tr>
          <tr>
            <th>Status</th>
            <td>${medication.status || 'Unknown'}</td>
          </tr>
        </tbody>
      </table>
    `;
    }

    /**
     * Generate condition narrative
     * @param condition - Condition resource
     * @returns Narrative HTML
     */
    private static generateConditionNarrative(condition: TCondition): string {
        const conditionName = NarrativeGenerator.formatCodeableConcept(condition.code);
        const clinicalStatus = condition.clinicalStatus;

        return `
      <h2>Condition</h2>
      <table>
        <tbody>
          <tr>
            <th>Condition</th>
            <td>${conditionName}</td>
          </tr>
          <tr>
            <th>Clinical Status</th>
            <td>${clinicalStatus}</td>
          </tr>
        </tbody>
      </table>
    `;
    }

    /**
     * Generate immunization narrative
     * @param immunization - Immunization resource
     * @returns Narrative HTML
     */
    private static generateImmunizationNarrative(
        immunization: TImmunization
    ): string {
        const vaccineName = NarrativeGenerator.formatCodeableConcept(immunization.vaccineCode);

        return `
      <h2>Immunization</h2>
      <table>
        <tbody>
          <tr>
            <th>Vaccine</th>
            <td>${vaccineName}</td>
          </tr>
          <tr>
            <th>Status</th>
            <td>${immunization.status || 'Unknown'}</td>
          </tr>
        </tbody>
      </table>
    `;
    }

    /**
     * Generate observation narrative
     * @param observation - Observation resource
     * @returns Narrative HTML
     */
    private static generateObservationNarrative(
        observation: TObservation
    ): string {
        const observationName = NarrativeGenerator.formatCodeableConcept(observation.code);
        const value = NarrativeGenerator.formatObservationValue(observation);

        return `
      <h2>Observation</h2>
      <table>
        <tbody>
          <tr>
            <th>Type</th>
            <td>${observationName}</td>
          </tr>
          <tr>
            <th>Value</th>
            <td>${value}</td>
          </tr>
          <tr>
            <th>Status</th>
            <td>${observation.status || 'Unknown'}</td>
          </tr>
        </tbody>
      </table>
    `;
    }

    /**
     * Fallback narrative generator
     * @param resource - Any FHIR resource
     * @returns Default narrative HTML
     */
    private static generateDefaultNarrative(resource: TDomainResource): string {
        return `
      <h2>${resource.resourceType} Resource</h2>
      <p>Resource ID: ${resource.id || 'Not specified'}</p>
    `;
    }

    // Utility Methods for Formatting

    /**
     * Format person name
     * @param names - Array of name components
     * @returns Formatted name string
     */
    private static formatPersonName(
        names?: Array<{
            use?: string;
            family?: string;
            given?: string[];
        }>
    ): string {
        if (!names || names.length === 0) return 'Unnamed';

        const name = names[0];
        const givenName = name.given?.join(' ') || '';
        const familyName = name.family || '';

        return `${givenName} ${familyName}`.trim();
    }

    /**
     * Format identifiers
     * @param identifiers - Array of identifiers
     * @returns Formatted identifier string
     */
    private static formatIdentifiers(
        identifiers?: Array<{
            system?: string;
            value?: string;
        }>
    ): string {
        if (!identifiers || identifiers.length === 0) return '';

        return identifiers
            .map(id => `${id.system || 'Unknown'}: ${id.value || 'N/A'}`)
            .join(', ');
    }

    /**
     * Format CodeableConcept
     * @param concept - CodeableConcept
     * @returns Formatted concept string
     */
    private static formatCodeableConcept(
        concept?: TCodeableConcept
    ): string {
        if (!concept) return 'Not specified';

        return concept.text ||
            concept.coding?.[0]?.display ||
            concept.coding?.[0]?.code ||
            'Unknown';
    }

    /**
     * Format observation value
     * @param observation - Observation resource
     * @returns Formatted value string
     */
    private static formatObservationValue(
        observation: TObservation
    ): string {
        if (observation.valueQuantity) {
            const {value, unit} = observation.valueQuantity;
            return value ? `${value} ${unit || ''}`.trim() : 'No value';
        }

        return 'Not specified';
    }

    /**
     * Format allergy reactions
     * @param reactions - Allergy reactions
     * @returns Formatted reactions string
     */
    private static formatReactions(
        reactions?: Array<{
            manifestation?: TCodeableConcept[];
            severity?: string;
        }>
    ): string {
        if (!reactions || reactions.length === 0) return '';

        return reactions
            .map(reaction => {
                const manifestations = reaction.manifestation
                    ?.map(m => NarrativeGenerator.formatCodeableConcept(m))
                    .join(', ') || 'Unknown';

                return `${manifestations} (${reaction.severity || 'Unknown Severity'})`;
            })
            .join('; ');
    }
}

export {NarrativeGenerator, Narrative};