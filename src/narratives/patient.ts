import {TPatient} from "../types/resources/Patient";
import {BaseNarrativeGenerator} from "./baseNarrative";

export class PatientNarrativeGenerator implements BaseNarrativeGenerator<TPatient> {
    generateNarrative(patients: TPatient[]): string {
        return patients.map(patient => {
            const name = this.formatPatientName(patient);
            const gender = this.formatGender(patient);
            const birthDate = this.formatBirthDate(patient);
            const address = this.formatAddress(patient);
            const contact = this.formatContacts(patient);

            return `
                <div class="patient-narrative">
                    <h2>Patient Information</h2>
                    <table>
                        <tbody>
                            <tr>
                                <th>Name</th>
                                <td>${name}</td>
                            </tr>
                            <tr>
                                <th>Gender</th>
                                <td>${gender}</td>
                            </tr>
                            <tr>
                                <th>Birth Date</th>
                                <td>${birthDate}</td>
                            </tr>
                            <tr>
                                <th>Address</th>
                                <td>${address}</td>
                            </tr>
                            <tr>
                                <th>Contact</th>
                                <td>${contact}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `;
        }).join('<br />');
    }

    private formatPatientName(patient: TPatient): string {
        const names = patient.name?.map(n =>
            [n.prefix?.join(' '), n.given?.join(' '), n.family]
                .filter(Boolean)
                .join(' ')
        ).filter(Boolean);
        return names?.[0] || 'Unnamed Patient';
    }

    private formatGender(patient: TPatient): string {
        return patient.gender || 'Not specified';
    }

    private formatBirthDate(patient: TPatient): string {
        return patient.birthDate || 'Unknown';
    }

    private formatAddress(patient: TPatient): string {
        if (!patient.address || patient.address.length === 0) return 'No address provided';
        const addr = patient.address[0];
        return [
            addr.line?.join(', '),
            addr.city,
            addr.state,
            addr.postalCode,
            addr.country
        ].filter(Boolean).join(', ');
    }

    private formatContacts(patient: TPatient): string {
        if (!patient.telecom || patient.telecom.length === 0) return 'No contact information';
        return patient.telecom.map(contact =>
            `${contact.system}: ${contact.value}`
        ).join(' | ');
    }
}