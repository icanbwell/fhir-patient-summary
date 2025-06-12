import {TCondition} from "../types/resources/Condition";
import {IpsNarrativeGenerator} from "./ipsNarrativeGenerator";


export class ConditionNarrativeGenerator extends IpsNarrativeGenerator<TCondition> {
    generateNarrative(): string {
        const conditionCode = this.utility.getCodeableConceptDisplay(this.resource.code);
        const clinicalStatus = this.resource.clinicalStatus
            ? this.utility.getCodeableConceptDisplay(this.resource.clinicalStatus)
            : '';

        let onsetDate = '';
        if (this.resource.onsetDateTime) {
            onsetDate = this.utility.formatDate(this.resource.onsetDateTime);
        } else if (this.resource.onsetPeriod) {
            onsetDate = this.utility.renderTime(this.resource.onsetPeriod);
        }

        let html = `<div xmlns="http://www.w3.org/1999/xhtml">
      <div class="hapiHeaderText">${conditionCode}</div>
      <table class="hapiPropertyTable">`;

        if (clinicalStatus) {
            html += `<tr><td>Clinical Status</td><td>${clinicalStatus}</td></tr>`;
        }

        if (this.resource.verificationStatus) {
            html += `<tr><td>Verification Status</td><td>${this.utility.getCodeableConceptDisplay(this.resource.verificationStatus)}</td></tr>`;
        }

        if (onsetDate) {
            html += `<tr><td>Onset</td><td>${onsetDate}</td></tr>`;
        }

        if (this.resource.abatementDateTime) {
            html += `<tr><td>Resolved</td><td>${this.utility.formatDate(this.resource.abatementDateTime)}</td></tr>`;
        }

        if (this.resource.severity) {
            html += `<tr><td>Severity</td><td>${this.utility.getCodeableConceptDisplay(this.resource.severity)}</td></tr>`;
        }

        if (this.resource.bodySite && this.resource.bodySite.length > 0) {
            const sites = this.utility.concatCodeableConcept(this.resource.bodySite);
            html += `<tr><td>Body Site</td><td>${sites}</td></tr>`;
        }

        if (this.resource.note && this.resource.note.length > 0) {
            html += `<tr><td>Notes</td><td><ul>`;
            html += this.utility.concat(this.resource.note, 'text')
                .split(', ')
                .map(item => `<li>${item}</li>`)
                .join('');
            html += `</ul></td></tr>`;
        }

        html += `</table></div>`;
        return html;
    }
}