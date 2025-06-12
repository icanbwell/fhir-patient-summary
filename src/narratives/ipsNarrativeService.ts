import {IpsNarrativeUtility} from './IpsNarrativeUtility';
import {TDomainResource} from "../types/resources/DomainResource";
import {AllergyIntoleranceNarrativeGenerator} from "./allergyIntolerance";
import {ConditionNarrativeGenerator} from "./condition";
import {DeviceNarrativeGenerator} from "./device";
import {DiagnosticReportNarrativeGenerator} from "./diagnosticReport";
import {ImmunizationNarrativeGenerator} from "./immunization";
import {MedicationRequestNarrativeGenerator} from "./medicationRequest";
import {MedicationStatementNarrativeGenerator} from "./medicationStatement";
import {ObservationNarrativeGenerator} from "./observation";
import {ProcedureNarrativeGenerator} from "./procedure";

export class IpsNarrativeService {
    private utility: IpsNarrativeUtility;

    constructor() {
        this.utility = new IpsNarrativeUtility();
    }

    generateNarrative(resource: TDomainResource): string {
        switch (resource.resourceType) {
            case 'AllergyIntolerance':
                return new AllergyIntoleranceNarrativeGenerator(resource).generateNarrative();
            case 'Condition':
                return new ConditionNarrativeGenerator(resource).generateNarrative();
            case 'Device':
                return new DeviceNarrativeGenerator(resource).generateNarrative();
            case 'DiagnosticReport':
                return new DiagnosticReportNarrativeGenerator(resource).generateNarrative();
            case 'Immunization':
                return new ImmunizationNarrativeGenerator(resource).generateNarrative();
            case 'MedicationRequest':
                return new MedicationRequestNarrativeGenerator(resource).generateNarrative();
            case 'MedicationStatement':
                return new MedicationStatementNarrativeGenerator(resource).generateNarrative();
            case 'Observation':
                return new ObservationNarrativeGenerator(resource).generateNarrative();
            case 'Procedure':
                return new ProcedureNarrativeGenerator(resource).generateNarrative();
            default:
                return `<div xmlns="http://www.w3.org/1999/xhtml">
          <p>No narrative template available for resource type: ${resource.resourceType}</p>
        </div>`;
        }
    }
}