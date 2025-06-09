import {TPatient} from "../types/resources/Patient";
import {BaseNarrativeGenerator} from "./baseNarrative";

export class PatientNarrativeGenerator implements BaseNarrativeGenerator<TPatient> {

    /**
     * Format person name
     * @param names - Array of name components
     * @returns Formatted name string
     */
    private static formatPersonName(
        names?: Array<{
            use?: string;
            family?: string;
            given?: string[];
        }>
    ): string {
        if (!names || names.length === 0) return 'Unnamed';

        const name = names[0];
        const givenName = name.given?.join(' ') || '';
        const familyName = name.family || '';

        return `${givenName} ${familyName}`.trim();
    }

    generateNarrative(patients: TPatient[]): string {
        return patients.map(patient => {
            const name = PatientNarrativeGenerator.formatPersonName(patient.name);
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

