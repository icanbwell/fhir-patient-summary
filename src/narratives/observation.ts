import {TObservation} from "../types/resources/Observation";
import {BaseNarrativeGenerator} from "./baseNarrative";

export class ObservationNarrativeGenerator implements BaseNarrativeGenerator<TObservation> {
    generateNarrative(observations: TObservation[]): string {
        return observations.map(observation => {
            const observationName = observation.code?.text || 'Unknown';
            const value = observation.valueQuantity?.value || 'No value';

            return `
            <h2>Observation</h2>
            <table>
                <tbody>
                    <tr>
                        <th>Type</th>
                        <td>${observationName}</td>
                    </tr>
                    <tr>
                        <th>Value</th>
                        <td>${value}</td>
                    </tr>
                </tbody>
            </table>
            `;
        }).join('<br />');
    }
}
