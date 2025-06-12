import {IpsNarrativeGenerator} from './IpsNarrativeGenerator';
import {TObservation} from "../types/resources/Observation";

export class ObservationNarrativeGenerator extends IpsNarrativeGenerator<TObservation> {
    generateNarrative(): string {
        const observationCode = this.utility.getCodeableConceptDisplay(this.resource.code);

        let effectiveDate = '';
        if (this.resource.effectiveDateTime) {
            effectiveDate = this.utility.formatDate(this.resource.effectiveDateTime);
        } else if (this.resource.effectivePeriod) {
            effectiveDate = this.utility.renderTime(this.resource.effectivePeriod);
        }

        // Reuse the utility's value rendering
        let valueText = '';
        if (this.resource.valueQuantity) {
            valueText = `${this.utility.renderValue(this.resource.valueQuantity)} ${this.utility.renderValueUnit(this.resource.valueQuantity)}`;
        } else if (this.resource.valueCodeableConcept) {
            valueText = this.utility.getCodeableConceptDisplay(this.resource.valueCodeableConcept);
        } else if (this.resource.valueString !== undefined) {
            valueText = this.resource.valueString;
        } else if (this.resource.valueBoolean !== undefined) {
            valueText = this.resource.valueBoolean ? 'Yes' : 'No';
        } else if (this.resource.valueInteger !== undefined) {
            valueText = this.resource.valueInteger.toString();
        } else if (this.resource.valueRange) {
            valueText = this.utility.renderTime(this.resource.valueRange);
        } else if (this.resource.valueRatio) {
            const num = this.resource.valueRatio.numerator?.value;
            const denom = this.resource.valueRatio.denominator?.value;
            if (num !== undefined && denom !== undefined) {
                const numUnit = this.resource.valueRatio.numerator?.unit || '';
                const denomUnit = this.resource.valueRatio.denominator?.unit || '';
                valueText = `${num} ${numUnit} / ${denom} ${denomUnit}`;
            }
        } else if (this.resource.valueTime) {
            valueText = this.resource.valueTime;
        } else if (this.resource.valueDateTime) {
            valueText = this.utility.formatDate(this.resource.valueDateTime);
        }

        let html = `<div xmlns="http://www.w3.org/1999/xhtml">
      <div class="hapiHeaderText">${observationCode}</div>
      <table class="hapiPropertyTable">`;

        html += `<tr><td>Status</td><td>${this.resource.status || ''}</td></tr>`;

        if (effectiveDate) {
            html += `<tr><td>Effective</td><td>${effectiveDate}</td></tr>`;
        }

        if (valueText) {
            html += `<tr><td>Value</td><td>${valueText}</td></tr>`;
        }

        if (this.resource.interpretation && this.resource.interpretation.length > 0) {
            const interpretation = this.utility.concatCodeableConcept(this.resource.interpretation);
            html += `<tr><td>Interpretation</td><td>${interpretation}</td></tr>`;
        }

        if (this.resource.referenceRange && this.resource.referenceRange.length > 0) {
            const ranges = this.utility.concatReferenceRange(this.resource.referenceRange);
            html += `<tr><td>Reference Range</td><td>${ranges}</td></tr>`;
        }

        if (this.resource.component && this.resource.component.length > 0) {
            const components = this.utility.renderComponent(this.resource.component);
            html += `<tr><td>Components</td><td>${components}</td></tr>`;
        }

        html += `</table></div>`;
        return html;
    }
}