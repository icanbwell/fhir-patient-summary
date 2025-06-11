import {BaseNarrativeGenerator} from "./baseNarrative";
import {TAllergyIntolerance} from "../types/resources/AllergyIntolerance";

export class AllergyIntoleranceNarrativeGenerator implements BaseNarrativeGenerator<TAllergyIntolerance> {
    generateNarrative(allergies: TAllergyIntolerance[]): string {
        return allergies.map(allergy => {
            const allergenName = this.formatAllergenName(allergy);
            const clinicalStatus = this.formatClinicalStatus(allergy);
            const verificationStatus = this.formatVerificationStatus(allergy);
            const reactions = this.formatReactions(allergy);
            const criticality = this.formatCriticality(allergy);
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

    private formatAllergenName(allergy: TAllergyIntolerance): string {
        return allergy.code?.text
            || allergy.code?.coding?.[0]?.display
            || allergy.code?.coding?.[0]?.code
            || 'Unknown Allergen';
    }

    private formatClinicalStatus(allergy: TAllergyIntolerance): string {
        return allergy.clinicalStatus?.coding?.[0]?.display
            || allergy.clinicalStatus?.coding?.[0]?.code
            || 'Not specified';
    }

    private formatVerificationStatus(allergy: TAllergyIntolerance): string {
        return allergy.verificationStatus?.coding?.[0]?.display
            || allergy.verificationStatus?.coding?.[0]?.code
            || 'Not verified';
    }

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

    private formatCriticality(allergy: TAllergyIntolerance): string {
        return allergy.criticality || 'Not assessed';
    }

    private formatOnset(allergy: TAllergyIntolerance): string {
        if (typeof allergy.onsetString === 'string') return allergy.onsetString;
        if (typeof allergy.onsetDateTime === 'string') return allergy.onsetDateTime;
        return JSON.stringify(allergy.onsetDateTime);
    }
}