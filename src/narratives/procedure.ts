import {TProcedure} from "../types/resources/Procedure";
import {IpsNarrativeGenerator} from "./ipsNarrativeGenerator";

export class ProcedureNarrativeGenerator extends IpsNarrativeGenerator<TProcedure> {
    generateNarrative(): string {
        const procedureCode = this.utility.getCodeableConceptDisplay(this.resource.code);

        let performedDate = '';
        if (this.resource.performedDateTime) {
            performedDate = this.utility.formatDate(this.resource.performedDateTime);
        } else if (this.resource.performedPeriod) {
            performedDate = this.utility.renderTime(this.resource.performedPeriod);
        }

        let html = `<div xmlns="http://www.w3.org/1999/xhtml">
      <div class="hapiHeaderText">${procedureCode}</div>
      <table class="hapiPropertyTable">`;

        html += `<tr><td>Status</td><td>${this.resource.status || ''}</td></tr>`;

        if (performedDate) {
            html += `<tr><td>Performed</td><td>${performedDate}</td></tr>`;
        }

        if (this.resource.category) {
            html += `<tr><td>Category</td><td>${this.utility.getCodeableConceptDisplay(this.resource.category)}</td></tr>`;
        }

        if (this.resource.bodySite && this.resource.bodySite.length > 0) {
            const sites = this.utility.concatCodeableConcept(this.resource.bodySite);
            html += `<tr><td>Body Site</td><td>${sites}</td></tr>`;
        }

        if (this.resource.outcome) {
            html += `<tr><td>Outcome</td><td>${this.utility.getCodeableConceptDisplay(this.resource.outcome)}</td></tr>`;
        }

        if (this.resource.performer && this.resource.performer.length > 0) {
            html += `<tr><td>Performer</td><td><ul>`;
            for (const performer of this.resource.performer) {
                let text = '';
                if (performer.actor && performer.actor.display) {
                    text = performer.actor.display;
                } else if (performer.actor && performer.actor.reference) {
                    text = performer.actor.reference;
                }

                if (performer.function_) {
                    text += ` (${this.utility.getCodeableConceptDisplay(performer.function_)})`;
                }

                if (text) {
                    html += `<li>${text}</li>`;
                }
            }
            html += `</ul></td></tr>`;
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