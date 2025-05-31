import {IPSResourceProfile} from "../structures/ips_resource_profile";
import {IPSMandatorySections} from "../structures/ips_mandatory_sections";
import {IPSRecommendedSections} from "../structures/ips_recommended_sections";
import {TDomainResource} from "../types/resources/DomainResource";

export class IPSResourceProfileRegistry {
    // Comprehensive resource profiles aligned with IPS specification
    static readonly PROFILES: Record<string, IPSResourceProfile> = {
        [IPSMandatorySections.PATIENT]: {
            resourceType: 'Patient',
            mandatoryFields: [
                'identifier',
                'name',
                'gender',
                'birthDate'
            ],
            recommendedFields: [
                'address',
                'telecom',
                'communication',
                'maritalStatus'
            ],
            loincCode: '60591-5',
            profileUrl: 'http://hl7.org/fhir/uv/ips/StructureDefinition/Patient-uv-ips'
        },
        [IPSMandatorySections.ALLERGIES]: {
            resourceType: 'AllergyIntolerance',
            mandatoryFields: [
                'clinicalStatus',
                'verificationStatus',
                'code',
                'patient'
            ],
            recommendedFields: [
                'reaction',
                'criticality'
            ],
            loincCode: '48765-2',
            profileUrl: 'http://hl7.org/fhir/uv/ips/StructureDefinition/AllergyIntolerance-uv-ips'
        },
        [IPSMandatorySections.MEDICATIONS]: {
            resourceType: 'MedicationStatement',
            mandatoryFields: [
                'status',
                'medicationCodeableConcept',
                'subject'
            ],
            recommendedFields: [
                'dosage',
                'reasonCode'
            ],
            loincCode: '10160-0',
            profileUrl: 'http://hl7.org/fhir/uv/ips/StructureDefinition/MedicationStatement-uv-ips'
        },
        [IPSMandatorySections.PROBLEMS]: {
            resourceType: 'Condition',
            mandatoryFields: [
                'clinicalStatus',
                'verificationStatus',
                'code',
                'subject'
            ],
            recommendedFields: [
                'onset',
                'recordedDate',
                'severity'
            ],
            loincCode: '11450-4',
            profileUrl: 'http://hl7.org/fhir/uv/ips/StructureDefinition/Condition-uv-ips'
        },
        [IPSMandatorySections.IMMUNIZATIONS]: {
            resourceType: 'Immunization',
            mandatoryFields: [
                'status',
                'vaccineCode',
                'patient',
                'occurrenceDateTime'
            ],
            recommendedFields: [
                'lotNumber',
                'manufacturer',
                'doseQuantity'
            ],
            loincCode: '11369-6',
            profileUrl: 'http://hl7.org/fhir/uv/ips/StructureDefinition/Immunization-uv-ips'
        }
    };

    // Additional Recommended Sections
    static readonly RECOMMENDED_PROFILES: Record<string, IPSResourceProfile> = {
        [IPSRecommendedSections.LABORATORY_RESULTS]: {
            resourceType: 'Observation',
            mandatoryFields: [
                'status',
                'category',
                'code',
                'subject',
                'effectiveDateTime',
                'valueQuantity'
            ],
            recommendedFields: [
                'interpretation',
                'referenceRange'
            ],
            loincCode: '26436-6',
            profileUrl: 'http://hl7.org/fhir/uv/ips/StructureDefinition/Observation-results-uv-ips'
        },
        [IPSRecommendedSections.VITAL_SIGNS]: {
            resourceType: 'Observation',
            mandatoryFields: [
                'status',
                'category',
                'code',
                'subject',
                'effectiveDateTime',
                'valueQuantity'
            ],
            recommendedFields: [
                'component'
            ],
            loincCode: '8716-3',
            profileUrl: 'http://hl7.org/fhir/uv/ips/StructureDefinition/Observation-vitalsigns-uv-ips'
        }
    };

    // Validate resource against IPS profile
    static validateResource(
        resource: TDomainResource,
        profileType: string
    ): boolean {
        const profile = this.PROFILES[profileType] ||
            this.RECOMMENDED_PROFILES[profileType];

        if (!profile) {
            console.warn(`No profile found for resource type: ${resource.resourceType}`);
            return false;
        }

        // Check mandatory fields
        const missingMandatoryFields = profile.mandatoryFields.filter(
            field => !(field in resource)
        );

        if (missingMandatoryFields.length > 0) {
            console.warn(
                `Missing mandatory fields for ${profileType}: `,
                missingMandatoryFields
            );
            return false;
        }

        return true;
    }
}