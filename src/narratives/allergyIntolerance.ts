import {TAllergyIntolerance} from "../types/resources/AllergyIntolerance";
import {BaseNarrativeGenerator} from "./baseNarrative";

export class AllergyIntoleranceNarrativeGenerator implements BaseNarrativeGenerator<TAllergyIntolerance> {
    generateNarrative(allergies: TAllergyIntolerance[]): string {
        return allergies.map(allergy => {
            const allergenName = allergy.code?.text || 'Unknown';
            const clinicalStatus = allergy.clinicalStatus?.coding?.[0]?.display || 'Unknown';
            const reactions = allergy.reaction?.map(r => r.manifestation?.[0]?.text || 'Unknown').join(', ') || 'None';

            return `
            <h2>Allergy/Intolerance</h2>
            <table>
                <tbody>
                    <tr>
                        <th>Allergen</th>
                        <td>${allergenName}</td>
                    </tr>
                    <tr>
                        <th>Clinical Status</th>
                        <td>${clinicalStatus}</td>
                    </tr>
                    <tr>
                        <th>Reactions</th>
                        <td>${reactions}</td>
                    </tr>
                </tbody>
            </table>
            `;
        }).join('<br />');
    }
}

