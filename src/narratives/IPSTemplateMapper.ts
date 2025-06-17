// Maps IPSSections to their corresponding template filenames
import { IPSSections } from '../structures/ips_sections';

export class IPSTemplateMapper {
    private static sectionToTemplate: Record<IPSSections, string> = {
        [IPSSections.PATIENT]: 'patient.j2',
        [IPSSections.ALLERGIES]: 'allergyintolerance.j2',
        [IPSSections.MEDICATIONS]: 'medicationsummary.j2',
        [IPSSections.PROBLEMS]: 'problemlist.j2',
        [IPSSections.IMMUNIZATIONS]: 'immunizations.j2',
        [IPSSections.VITAL_SIGNS]: 'vitalsigns.j2',
        [IPSSections.MEDICAL_DEVICES]: 'medicaldevices.j2',
        [IPSSections.LABORATORY_RESULTS]: 'diagnosticresults.j2',
        [IPSSections.DIAGNOSTIC_REPORTS]: 'diagnosticresults.j2', // No separate diagnostic report template, using diagnosticresults
        [IPSSections.PROCEDURES]: 'historyofprocedures.j2',
        [IPSSections.FAMILY_HISTORY]: 'pasthistoryofillness.j2', // No direct family history template, using past history
        [IPSSections.SOCIAL_HISTORY]: 'socialhistory.j2',
        [IPSSections.PREGNANCY_HISTORY]: 'pregnancy.j2',
        [IPSSections.FUNCTIONAL_STATUS]: 'functionalstatus.j2',
        [IPSSections.MEDICAL_HISTORY]: 'pasthistoryofillness.j2', // No direct medical history template, using past history
        [IPSSections.CARE_PLAN]: 'planofcare.j2',
        [IPSSections.CLINICAL_IMPRESSION]: 'composition.j2', // No direct template, using composition
        [IPSSections.ADVANCE_DIRECTIVES]: 'advancedirectives.j2'
    };

    static getTemplate(section: IPSSections): string | undefined {
        return this.sectionToTemplate[section];
    }
}
