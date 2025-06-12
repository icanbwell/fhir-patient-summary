import {IpsNarrativeGenerator} from './IpsNarrativeGenerator';
import {TMedicationStatement} from "../types/resources/MedicationStatement";

export class MedicationStatementNarrativeGenerator extends IpsNarrativeGenerator<TMedicationStatement> {
    generateNarrative(): string {
        let medication = '';
        if (this.resource.medicationCodeableConcept) {
            medication = this.utility.getCodeableConceptDisplay(this.resource.medicationCodeableConcept);
        } else if (this.resource.medicationReference) {
            medication = this.utility.renderMedicationRef(this.resource);
        }

        let effectiveDate = '';
        if (this.resource.effectiveDateTime) {
            effectiveDate = this.utility.formatDate(this.resource.effectiveDateTime);
        } else if (this.resource.effectivePeriod) {
            effectiveDate = this.utility.renderTime(this.resource.effectivePeriod);
        }

        let html = `<div xmlns="http://www.w3.org/1999/xhtml">
      <div class="hapiHeaderText">${medication}</div>
      <table class="hapiPropertyTable">`;

        html += `<tr><td>Status</td><td>${this.resource.status || ''}</td></tr>`;

        if (effectiveDate) {
            html += `<tr><td>Effective</td><td>${effectiveDate}</td></tr>`;
        }

        if (this.resource.dosage && this.resource.dosage.length > 0) {
            const dosage = this.resource.dosage[0];

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

        html += `</table></div>`;
        return html;
    }
}