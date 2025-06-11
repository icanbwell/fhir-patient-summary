import {TObservation} from "../types/resources/Observation";
import {BaseNarrativeGenerator} from "./baseNarrative";

export class ObservationNarrativeGenerator implements BaseNarrativeGenerator<TObservation> {
    generateNarrative(observations: TObservation[]): string {
        return observations.map(observation => {
            const code = this.formatObservationCode(observation);
            const value = this.formatObservationValue(observation);
            const interpretation = this.formatInterpretation(observation);
            const referenceRange = this.formatReferenceRange(observation);
            const effectiveDateTime = this.formatEffectiveDateTime(observation);

            return `
                <div class="observation-narrative">
                    <h2>Clinical Observation</h2>
                    <table>
                        <tbody>
                            <tr>
                                <th>Observation</th>
                                <td>${code}</td>
                            </tr>
                            <tr>
                                <th>Value</th>
                                <td>${value}</td>
                            </tr>
                            <tr>
                                <th>Interpretation</th>
                                <td>${interpretation}</td>
                            </tr>
                            <tr>
                                <th>Reference Range</th>
                                <td>${referenceRange}</td>
                            </tr>
                            <tr>
                                <th>Date</th>
                                <td>${effectiveDateTime}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `;
        }).join('<br />');
    }

    private formatObservationCode(observation: TObservation): string {
        return observation.code?.text
            || observation.code?.coding?.[0]?.display
            || observation.code?.coding?.[0]?.code
            || 'Unspecified Observation';
    }

    private formatObservationValue(observation: TObservation): string {
        if (observation.valueQuantity) {
            return `${observation.valueQuantity.value} ${observation.valueQuantity.unit || ''}`;
        }
        if (observation.valueString) return observation.valueString;
        if (observation.valueBoolean !== undefined) return observation.valueBoolean.toString();
        return 'No value recorded';
    }

    private formatInterpretation(observation: TObservation): string {
        return observation.interpretation?.[0]?.coding?.[0]?.display
            || observation.interpretation?.[0]?.coding?.[0]?.code
            || 'Not interpreted';
    }

    private formatReferenceRange(observation: TObservation): string {
        if (!observation.referenceRange || observation.referenceRange.length === 0) return 'No reference range';
        const range = observation.referenceRange[0];
        return [
            range.low && `Low: ${range.low.value} ${range.low.unit || ''}`,
            range.high && `High: ${range.high.value} ${range.high.unit || ''}`
        ].filter(Boolean).join(', ');
    }

    private formatEffectiveDateTime(observation: TObservation): string {
        return observation.effectiveDateTime
            || observation.effectivePeriod?.start
            || 'Date not specified';
    }
}
