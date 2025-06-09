import {TPatient} from "../types/resources/Patient";
import {BaseNarrativeGenerator} from "./baseNarrative";

export class PatientNarrativeGenerator implements BaseNarrativeGenerator<TPatient> {
    /**
     * Format person name with comprehensive handling
     * @param names - Array of name components
     * @returns Formatted name string
     */
    private static formatPersonName(
        names?: Array<{
            use?: string;
            text?: string;
            family?: string;
            given?: string[];
            prefix?: string[];
            suffix?: string[];
        }>
    ): string {
        if (!names || names.length === 0) return 'Unnamed';

        // Prefer text representation if available
        const name = names[0];
        if (name.text) return name.text;

        // Construct name from components
        const nameParts: string[] = [];

        // Add prefix if exists
        if (name.prefix && name.prefix.length > 0) {
            nameParts.push(name.prefix.join(' '));
        }

        // Add given names
        if (name.given && name.given.length > 0) {
            nameParts.push(name.given.join(' '));
        }

        // Add family name
        if (name.family) {
            nameParts.push(name.family);
        }

        // Add suffix if exists
        if (name.suffix && name.suffix.length > 0) {
            nameParts.push(name.suffix.join(' '));
        }

        return nameParts.length > 0 ? nameParts.join(' ').trim() : 'Unnamed';
    }

    /**
     * Format birth date with improved readability
     * @param birthDate - Patient's birth date
     * @returns Formatted date string
     */
    private static formatBirthDate(birthDate?: string): string {
        if (!birthDate) return 'Not specified';

        try {
            const date = new Date(birthDate);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch {
            return birthDate;
        }
    }

    /**
     * Generate contact information section
     * @param patient - Patient resource
     * @returns HTML string with contact details
     */
    private static generateContactSection(patient: TPatient): string {
        const contactDetails: string[] = [];

        // Telecom information
        if (patient.telecom && patient.telecom.length > 0) {
            const telecomInfo = patient.telecom
                .map(contact => `${contact.system}: ${contact.value}`)
                .join(', ');
            contactDetails.push(`
                <tr>
                    <th>Contact</th>
                    <td>${telecomInfo}</td>
                </tr>
            `);
        }

        // Address information
        if (patient.address && patient.address.length > 0) {
            const addressInfo = patient.address
                .map(addr => {
                    return [
                        ...(addr.line || []),
                        addr.city,
                        addr.state,
                        addr.postalCode,
                        addr.country
                    ].filter(Boolean).join(', ');
                })
                .join(' | ');

            contactDetails.push(`
                <tr>
                    <th>Address</th>
                    <td>${addressInfo}</td>
                </tr>
            `);
        }

        return contactDetails.join('');
    }

    /**
     * Generate identifiers section
     * @param patient - Patient resource
     * @returns HTML string with identifier details
     */
    private static generateIdentifiersSection(patient: TPatient): string {
        if (!patient.identifier || patient.identifier.length === 0) return '';

        const identifierInfo = patient.identifier
            .map(id => `${id.system || 'ID'}: ${id.value}`)
            .join(', ');

        return `
            <tr>
                <th>Identifiers</th>
                <td>${identifierInfo}</td>
            </tr>
        `;
    }

    /**
     * Generate narrative for patients
     * @param patients - Array of patient resources
     * @returns HTML narrative string
     */
    generateNarrative(patients: TPatient[]): string {
        return patients.map(patient => {
            const name = PatientNarrativeGenerator.formatPersonName(patient.name);
            const gender = patient.gender || 'Not specified';
            const birthDate = PatientNarrativeGenerator.formatBirthDate(patient.birthDate);

            return `
                <div class="patient-narrative">
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
                            ${PatientNarrativeGenerator.generateIdentifiersSection(patient)}
                            ${PatientNarrativeGenerator.generateContactSection(patient)}
                        </tbody>
                    </table>
                </div>
            `;
        }).join('<br />');
    }
}