import {TImmunization} from "../types/resources/Immunization";
import {BaseNarrativeGenerator} from "./baseNarrative";

export class ImmunizationNarrativeGenerator implements BaseNarrativeGenerator<TImmunization> {
    generateNarrative(immunizations: TImmunization[]): string {
        return immunizations.map(immunization => {
            const vaccineName = immunization.vaccineCode?.text || 'Unknown';
            const status = immunization.status || 'Unknown';

            return `
            <h2>Immunization</h2>
            <table>
                <tbody>
                    <tr>
                        <th>Vaccine</th>
                        <td>${vaccineName}</td>
                    </tr>
                    <tr>
                        <th>Status</th>
                        <td>${status}</td>
                    </tr>
                </tbody>
            </table>
            `;
        }).join('<br />');
    }
}

