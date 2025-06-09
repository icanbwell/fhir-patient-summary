// Additional Recommended Sections
import {IPSSections} from "./ips_sections";

export enum IPSRecommendedSections {
    MEDICAL_DEVICES = 'Device',
    PREGNANCY_STATUS = 'PregnancyStatus',
    FUNCTIONAL_STATUS = 'FunctionalStatus',
    ADVANCED_DIRECTIVES = 'Consent',
    LABORATORY_RESULTS = IPSSections.LABORATORY_RESULTS,
    VITAL_SIGNS =IPSSections.VITAL_SIGNS
}