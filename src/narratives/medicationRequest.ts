import {IpsNarrativeGenerator} from './IpsNarrativeGenerator';
import {TMedicationRequest} from "../types/resources/MedicationRequest";

export class MedicationRequestNarrativeGenerator extends IpsNarrativeGenerator<TMedicationRequest> {
    generateNarrative(): string {
        let medication = '';
        if (this.resource.medicationCodeableConcept) {
            medication = this.utility.getCodeableConceptDisplay(this.resource.medicationCodeableConcept);
        } else if (this.resource.medicationReference) {
            medication = this.utility.renderMedicationRef(this.resource);
        }

        let html = `<div xmlns="http://www.w3.org/1999/xhtml">
      <div class="hapiHeaderText">${medication}</div>
      <table class="hapiPropertyTable">`;

        html += `<tr><td>Status</td><td>${this.resource.status || ''}</td></tr>`;
        html += `<tr><td>Intent</td><td>${this.resource.intent || ''}</td></tr>`;

        if (this.resource.authoredOn) {
            html += `<tr><td>Authored On</td><td>${this.utility.formatDate(this.resource.authoredOn)}</td></tr>`;
        }

        if (this.resource.requester) {
            html += `<tr><td>Requester</td><td>${this.resource.requester.display || this.resource.requester.reference || ''}</td></tr>`;
        }

        if (this.resource.dosageInstruction && this.resource.dosageInstruction.length > 0) {
            const dosage = this.resource.dosageInstruction[0];

            if (dosage.text) {
                html += `<tr><td>Dosage Instructions</td><td>${dosage.text}</td></tr>`;
            }

            if (dosage.route) {
                html += `<tr><td>Route</td><td>${this.utility.getCodeableConceptDisplay(dosage.route)}</td></tr>`;
            }

            if (dosage.doseAndRate && dosage.doseAndRate.length > 0) {
                const doseQuantity = dosage.doseAndRate[0].doseQuantity;
                if (doseQuantity && doseQuantity.value) {
                    html += `<tr><td>Dose</td><td>${doseQuantity.value} ${doseQuantity.unit || ''}</td></tr>`;
                }
            }
        }

        if (this.resource.dispenseRequest) {
            const dispense = this.resource.dispenseRequest;

            if (dispense.quantity && dispense.quantity.value) {
                html += `<tr><td>Dispense Quantity</td><td>${dispense.quantity.value} ${dispense.quantity.unit || ''}</td></tr>`;
            }

            if (dispense.numberOfRepeatsAllowed !== undefined) {
                html += `<tr><td>Repeats</td><td>${dispense.numberOfRepeatsAllowed}</td></tr>`;
            }

            if (dispense.expectedSupplyDuration && dispense.expectedSupplyDuration.value) {
                html += `<tr><td>Expected Supply Duration</td><td>${dispense.expectedSupplyDuration.value} ${dispense.expectedSupplyDuration.unit || ''}</td></tr>`;
            }
        }

        if (this.resource.substitution && this.resource.substitution.allowedBoolean !== undefined) {
            html += `<tr><td>Substitution Allowed</td><td>${this.resource.substitution.allowedBoolean ? 'Yes' : 'No'}</td></tr>`;

            if (this.resource.substitution.reason) {
                html += `<tr><td>Substitution Reason</td><td>${this.utility.getCodeableConceptDisplay(this.resource.substitution.reason)}</td></tr>`;
            }
        }

        html += `</table></div>`;
        return html;
    }
}