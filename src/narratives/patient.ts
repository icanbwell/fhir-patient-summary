import {TPatient} from "../types/resources/Patient";
import {BaseNarrativeGenerator} from "./baseNarrative";

export class PatientNarrativeGenerator implements BaseNarrativeGenerator<TPatient> {
    generateNarrative(patients: TPatient[]): string {
        return patients.map(patient => {
            const name = patient.name?.[0]?.text || 'Unnamed';
            const gender = patient.gender || 'Not specified';
            const birthDate = patient.birthDate || 'Not specified';

            return `
            <h1>${name}</h1>
            <table>
                <tbody>
                    <tr>
                        <th>Gender</th>
                        <td>${gender}</td>
                    </tr>
                    <tr>
                        <th>Birth Date</th>
                        <td>${birthDate}</td>
                    </tr>
                </tbody>
            </table>
            `;
        }).join('<br />');
    }
}

