import {TAllergyIntolerance} from "../types/resources/AllergyIntolerance";
import {IpsNarrativeGenerator} from "./ipsNarrativeGenerator";


export class AllergyIntoleranceNarrativeGenerator extends IpsNarrativeGenerator<TAllergyIntolerance> {
    generateNarrative(): string {
        const allergyCode = this.utility.getCodeableConceptDisplay(this.resource.code);
        const clinicalStatus = this.resource.clinicalStatus
            ? this.utility.getCodeableConceptDisplay(this.resource.clinicalStatus)
            : '';
        const verificationStatus = this.resource.verificationStatus
            ? this.utility.getCodeableConceptDisplay(this.resource.verificationStatus)
            : '';

        let html = `<div xmlns="http://www.w3.org/1999/xhtml">
      <div class="hapiHeaderText">${allergyCode}</div>
      <table class="hapiPropertyTable">`;

        if (clinicalStatus) {
            html += `<tr><td>Clinical Status</td><td>${clinicalStatus}</td></tr>`;
        }

        if (verificationStatus) {
            html += `<tr><td>Verification Status</td><td>${verificationStatus}</td></tr>`;
        }

        if (this.resource.onsetDateTime) {
            html += `<tr><td>Onset</td><td>${this.utility.formatDate(this.resource.onsetDateTime)}</td></tr>`;
        }

        if (this.resource.reaction && this.resource.reaction.length > 0) {
            html += `<tr><td>Reactions</td><td><ul>`;
            html += this.utility.concatReactionManifestation(this.resource.reaction)
                .split(', ')
                .map(item => `<li>${item}</li>`)
                .join('');
            html += `</ul></td></tr>`;
        }

        html += `</table></div>`;
        return html;
    }
}