import {TCarePlan} from "../types/resources/CarePlan";
import {BaseNarrativeGenerator} from "./baseNarrative";

export class CarePlanNarrativeGenerator implements BaseNarrativeGenerator<TCarePlan> {
    generateNarrative(carePlans: TCarePlan[]): string {
        return carePlans.map(carePlan => {
            const activities = carePlan.activity?.map(a => a.detail?.code?.text || 'Unknown').join(', ') || 'None';

            return `
            <h2>Care Plan</h2>
            <table>
                <tbody>
                    <tr>
                        <th>Status</th>
                        <td>${carePlan.status || 'Unknown'}</td>
                    </tr>
                    <tr>
                        <th>Activities</th>
                        <td>${activities}</td>
                    </tr>
                </tbody>
            </table>
            `;
        }).join('<br />');
    }
}

