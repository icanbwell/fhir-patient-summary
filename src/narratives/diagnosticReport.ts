import {IpsNarrativeGenerator} from './IpsNarrativeGenerator';
import {TDiagnosticReport} from "../types/resources/DiagnosticReport";


export class DiagnosticReportNarrativeGenerator extends IpsNarrativeGenerator<TDiagnosticReport> {
    generateNarrative(): string {
        const reportCode = this.utility.getCodeableConceptDisplay(this.resource.code);

        let effectiveDate = '';
        if (this.resource.effectiveDateTime) {
            effectiveDate = this.utility.formatDate(this.resource.effectiveDateTime);
        } else if (this.resource.effectivePeriod) {
            effectiveDate = this.utility.renderTime(this.resource.effectivePeriod);
        }

        let html = `<div xmlns="http://www.w3.org/1999/xhtml">
      <div class="hapiHeaderText">${reportCode}</div>
      <table class="hapiPropertyTable">`;

        html += `<tr><td>Status</td><td>${this.resource.status || ''}</td></tr>`;

        if (effectiveDate) {
            html += `<tr><td>Effective</td><td>${effectiveDate}</td></tr>`;
        }

        if (this.resource.issued) {
            html += `<tr><td>Issued</td><td>${this.utility.formatDate(this.resource.issued)}</td></tr>`;
        }

        if (this.resource.performer && this.resource.performer.length > 0) {
            const performers = this.utility.concat(this.resource.performer, 'display');
            html += `<tr><td>Performer</td><td>${performers}</td></tr>`;
        }

        if (this.resource.result && this.resource.result.length > 0) {
            html += `<tr><td>Results</td><td>
        <ul>
          ${this.utility.concat(this.resource.result, 'reference')
                .split(', ')
                .map(item => `<li>${item}</li>`)
                .join('')}
        </ul>
      </td></tr>`;
        }

        if (this.resource.conclusion) {
            html += `<tr><td>Conclusion</td><td>${this.resource.conclusion}</td></tr>`;
        }

        if (this.resource.conclusionCode && this.resource.conclusionCode.length > 0) {
            const codes = this.utility.concatCodeableConcept(this.resource.conclusionCode);
            html += `<tr><td>Diagnosis</td><td>${codes}</td></tr>`;
        }

        if (this.resource.presentedForm && this.resource.presentedForm.length > 0) {
            html += `<tr><td>Attachments</td><td><ul>`;
            html += this.utility.concat(this.resource.presentedForm, 'title')
                .split(', ')
                .map(item => `<li>${item || 'Attachment'}</li>`)
                .join('');
            html += `</ul></td></tr>`;
        }

        html += `</table></div>`;
        return html;
    }
}