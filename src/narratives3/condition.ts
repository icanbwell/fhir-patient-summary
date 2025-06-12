import {TCondition} from "../types/resources/Condition";
import {BaseNarrativeGenerator} from "./baseNarrative";

export class ConditionNarrativeGenerator implements BaseNarrativeGenerator<TCondition> {
    generateNarrative(conditions: TCondition[]): string {
        return conditions.map(condition => {
            const conditionName = this.formatConditionName(condition);
            const clinicalStatus = this.formatClinicalStatus(condition);
            const verificationStatus = this.formatVerificationStatus(condition);
            const onset = this.formatOnset(condition);
            const severity = this.formatSeverity(condition);

            return `
                <div class="condition-narrative">
                    <h2>Medical Condition</h2>
                    <table>
                        <tbody>
                            <tr>
                                <th>Condition</th>
                                <td>${conditionName}</td>
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
                                <th>Onset</th>
                                <td>${onset}</td>
                            </tr>
                            <tr>
                                <th>Severity</th>
                                <td>${severity}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `;
        }).join('<br />');
    }

    private formatConditionName(condition: TCondition): string {
        return condition.code?.text
            || condition.code?.coding?.[0]?.display
            || condition.code?.coding?.[0]?.code
            || 'Unspecified Condition';
    }

    private formatClinicalStatus(condition: TCondition): string {
        return condition.clinicalStatus?.coding?.[0]?.display
            || condition.clinicalStatus?.coding?.[0]?.code
            || 'Not specified';
    }

    private formatVerificationStatus(condition: TCondition): string {
        return condition.verificationStatus?.coding?.[0]?.display
            || condition.verificationStatus?.coding?.[0]?.code
            || 'Not verified';
    }

    private formatOnset(condition: TCondition): string {
        if (typeof condition.onsetString === 'string') return condition.onsetString;
        if (typeof condition.onsetDateTime === 'string') return condition.onsetDateTime;
        return JSON.stringify(condition.onsetDateTime);
    }

    private formatSeverity(condition: TCondition): string {
        return condition.severity?.coding?.[0]?.display
            || condition.severity?.coding?.[0]?.code
            || 'Not rated';
    }
}