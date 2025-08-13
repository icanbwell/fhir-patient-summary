import {IPSSections} from "./ips_sections";

export enum IPSMandatorySections {
    PATIENT = IPSSections.PATIENT,
    PROBLEMS = IPSSections.PROBLEMS,
    ALLERGIES = IPSSections.ALLERGIES,
    MEDICATIONS = IPSSections.MEDICATIONS
}

// https://hl7.org/fhir/uv/ips/Bundle-bundle-no-info-required-sections.json.html
export const IPSMissingMandatorySectionContent: Record<
  IPSSections.PROBLEMS | IPSSections.ALLERGIES | IPSSections.MEDICATIONS,
  string
> = {
  [IPSSections.PROBLEMS]:
    "There is no information available about the subject's health problems or disabilities.",
  [IPSSections.ALLERGIES]:
    "There is no information available regarding the subject's allergy conditions.",
  [IPSSections.MEDICATIONS]:
    "There is no information available about the subject's medication use or administration.",
};
