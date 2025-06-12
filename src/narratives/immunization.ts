import {IpsNarrativeGenerator} from './IpsNarrativeGenerator';
import {TImmunization} from "../types/resources/Immunization";


export class ImmunizationNarrativeGenerator extends IpsNarrativeGenerator<TImmunization> {
    generateNarrative(): string {
        const vaccine = this.utility.getCodeableConceptDisplay(this.resource.vaccineCode);
        const date = this.utility.formatDate(this.resource.occurrenceDateTime);

        let html = `<div xmlns="http://www.w3.org/1999/xhtml">
      <div class="hapiHeaderText">${vaccine}</div>
      <table class="hapiPropertyTable">`;

        if (date) {
            html += `<tr><td>Date</td><td>${date}</td></tr>`;
        }

        html += `<tr><td>Status</td><td>${this.resource.status || ''}</td></tr>`;

        if (this.resource.primarySource !== undefined) {
            html += `<tr><td>Primary Source</td><td>${this.resource.primarySource ? 'Yes' : 'No'}</td></tr>`;
        }

        if (this.resource.manufacturer) {
            const manufacturer = this.utility.renderVaccineManufacturer(this.resource);
            if (manufacturer) {
                html += `<tr><td>Manufacturer</td><td>${manufacturer}</td></tr>`;
            }
        }

        if (this.resource.lotNumber) {
            html += `<tr><td>Lot Number</td><td>${this.resource.lotNumber}</td></tr>`;
        }

        if (this.resource.site) {
            html += `<tr><td>Site</td><td>${this.utility.getCodeableConceptDisplay(this.resource.site)}</td></tr>`;
        }

        if (this.resource.route) {
            html += `<tr><td>Route</td><td>${this.utility.getCodeableConceptDisplay(this.resource.route)}</td></tr>`;
        }

        if (this.resource.doseQuantity && this.resource.doseQuantity.value) {
            html += `<tr><td>Dose</td><td>${this.resource.doseQuantity.value} ${this.resource.doseQuantity.unit || ''}</td></tr>`;
        }

        html += `</table></div>`;
        return html;
    }
}