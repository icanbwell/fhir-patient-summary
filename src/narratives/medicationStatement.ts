import {TMedicationStatement} from "../types/resources/MedicationStatement";
import {BaseNarrativeGenerator} from "./baseNarrative";

export class MedicationStatementNarrativeGenerator implements BaseNarrativeGenerator<TMedicationStatement> {
    generateNarrative(medications: TMedicationStatement[]): string {
        return medications.map(medication => {
            const medicationName = medication.medicationCodeableConcept?.text || 'Unknown';
            const status = medication.status || 'Unknown';

            return `
            <h2>Medication</h2>
            <table>
                <tbody>
                    <tr>
                        <th>Medication</th>
                        <td>${medicationName}</td>
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
