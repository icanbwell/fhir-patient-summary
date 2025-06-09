import {TAllergyIntolerance} from "../types/resources/AllergyIntolerance";
import {BaseNarrativeGenerator} from "./baseNarrative";

export class AllergyIntoleranceNarrativeGenerator implements BaseNarrativeGenerator<TAllergyIntolerance> {
    /**
     * Generate a comprehensive narrative for allergy/intolerance
     * @param allergies Array of AllergyIntolerance resources
     * @returns HTML narrative string
     */
    generateNarrative(allergies: TAllergyIntolerance[]): string {
        return allergies.map(allergy => {
            // Allergen Details
            const allergenName = this.formatAllergenName(allergy);

            // Clinical Status
            const clinicalStatus = this.formatClinicalStatus(allergy);

            // Verification Status
            const verificationStatus = this.formatVerificationStatus(allergy);

            // Reactions
            const reactions = this.formatReactions(allergy);

            // Criticality
            const criticality = this.formatCriticality(allergy);

            // Onset
            const onset = this.formatOnset(allergy);

            return `
                <div class="allergy-intolerance-narrative">
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
                                <th>Verification Status</th>
                                <td>${verificationStatus}</td>
                            </tr>
                            <tr>
                                <th>Reactions</th>
                                <td>${reactions}</td>
                            </tr>
                            <tr>
                                <th>Criticality</th>
                                <td>${criticality}</td>
                            </tr>
                            <tr>
                                <th>Onset</th>
                                <td>${onset}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `;
        }).join('<br />');
    }

    /**
     * Format allergen name with fallback
     * @param allergy AllergyIntolerance resource
     * @returns Formatted allergen name
     */
    private formatAllergenName(allergy: TAllergyIntolerance): string {
        // Prefer code.text, then first coding's display, then code value
        return allergy.code?.text
            || allergy.code?.coding?.[0]?.display
            || allergy.code?.coding?.[0]?.code
            || 'Unknown Allergen';
    }

    /**
     * Format clinical status with fallback
     * @param allergy AllergyIntolerance resource
     * @returns Formatted clinical status
     */
    private formatClinicalStatus(allergy: TAllergyIntolerance): string {
        return allergy.clinicalStatus?.coding?.[0]?.display
            || allergy.clinicalStatus?.coding?.[0]?.code
            || 'Not specified';
    }

    /**
     * Format verification status with fallback
     * @param allergy AllergyIntolerance resource
     * @returns Formatted verification status
     */
    private formatVerificationStatus(allergy: TAllergyIntolerance): string {
        return allergy.verificationStatus?.coding?.[0]?.display
            || allergy.verificationStatus?.coding?.[0]?.code
            || 'Not verified';
    }

    /**
     * Format reactions with comprehensive details
     * @param allergy AllergyIntolerance resource
     * @returns Formatted reaction details
     */
    private formatReactions(allergy: TAllergyIntolerance): string {
        if (!allergy.reaction || allergy.reaction.length === 0) return 'No reactions recorded';

        return allergy.reaction.map(reaction => {
            const manifestations = reaction.manifestation
                ?.map(m => m.text || m.coding?.[0]?.display || m.coding?.[0]?.code)
                .filter(Boolean)
                .join(', ') || 'Unspecified';

            const severity = reaction.severity || 'Not rated';

            return `${manifestations} (Severity: ${severity})`;
        }).join(' | ');
    }

    /**
     * Format criticality with fallback
     * @param allergy AllergyIntolerance resource
     * @returns Formatted criticality
     */
    private formatCriticality(allergy: TAllergyIntolerance): string {
        return allergy.criticality || 'Not assessed';
    }

    /**
     * Format onset with multiple type support
     * @param allergy AllergyIntolerance resource
     * @returns Formatted onset
     */
    private formatOnset(allergy: TAllergyIntolerance): string {
        // Handle different onset types
        if (typeof allergy.onsetString === 'string') return allergy.onsetString;

        if (typeof allergy.onsetDateTime === 'string') return allergy.onsetDateTime;

        // For more complex types like Period, Age, etc.
        return JSON.stringify(allergy.onsetDateTime);
    }
}