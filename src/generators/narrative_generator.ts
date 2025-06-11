import {TDomainResource} from "../types/resources/DomainResource";
import {TObservation} from "../types/resources/Observation";
import {TCodeableConcept} from "../types/partials/CodeableConcept";
import {BaseNarrativeGenerator} from "../narratives/baseNarrative";
import {PatientNarrativeGenerator} from "../narratives/patient";
import {AllergyIntoleranceNarrativeGenerator} from "../narratives/allergyIntolerance";
import {MedicationStatementNarrativeGenerator} from "../narratives/medicationStatement";
import {ConditionNarrativeGenerator} from "../narratives/condition";
import {ImmunizationNarrativeGenerator} from "../narratives/immunization";
import {ObservationNarrativeGenerator} from "../narratives/observation";
import {DeviceNarrativeGenerator} from "../narratives/device";
import {DiagnosticReportNarrativeGenerator} from "../narratives/diagnosticReport";
import {ProcedureNarrativeGenerator} from "../narratives/procedure";
import {FamilyMemberHistoryNarrativeGenerator} from "../narratives/familyMemberHistory";
import {CarePlanNarrativeGenerator} from "../narratives/carePlan";
import {ClinicalImpressionNarrativeGenerator} from "../narratives/clinicalImpression";
import {DefaultNarrativeGenerator} from "../narratives/default";

interface Narrative {
    status: 'generated' | 'extensions' | 'additional' | 'empty';
    div: string; // XHTML div content
}

class NarrativeGenerator {
    /**
     * Generate a narrative for any FHIR resource
     * @param resources - FHIR resources
     * @returns Narrative representation
     */
    static generateNarrative<T extends TDomainResource>(
        resources: T[]
    ): Narrative | undefined {

        if (!resources || resources.length === 0) {
            return undefined; // No resources to generate narrative
        }

        // HAPI example templates: https://github.com/hapifhir/hapi-fhir/tree/master/hapi-fhir-jpaserver-ips/src/main/resources/ca/uhn/fhir/jpa/ips/narrative
        // Expanded resource type generators
        const generators: Record<string, BaseNarrativeGenerator<TDomainResource>> = {
            Patient: new PatientNarrativeGenerator(),
            AllergyIntolerance: new AllergyIntoleranceNarrativeGenerator(),
            MedicationStatement: new MedicationStatementNarrativeGenerator(),
            Condition: new ConditionNarrativeGenerator(),
            Immunization: new ImmunizationNarrativeGenerator(),
            Observation: new ObservationNarrativeGenerator(),
            Device: new DeviceNarrativeGenerator(),
            DiagnosticReport: new DiagnosticReportNarrativeGenerator(),
            Procedure: new ProcedureNarrativeGenerator(),
            FamilyMemberHistory: new FamilyMemberHistoryNarrativeGenerator(),
            CarePlan: new CarePlanNarrativeGenerator(),
            ClinicalImpression: new ClinicalImpressionNarrativeGenerator(),
        };

        const resourceType = resources[0]?.resourceType;

        // Select generator or use default
        const generator = generators[`${resourceType}`] ||
            new DefaultNarrativeGenerator();

        const content = generator.generateNarrative(resources).replace(/\n/g, '');
        return {
            status: 'generated',
            div: NarrativeGenerator.wrapInXhtml(content)
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