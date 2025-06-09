import {TCondition} from "../types/resources/Condition";
import {BaseNarrativeGenerator} from "./baseNarrative";

export class ConditionNarrativeGenerator implements BaseNarrativeGenerator<TCondition> {
    generateNarrative(conditions: TCondition[]): string {
        const activeConditions = conditions.filter(c => c.clinicalStatus?.coding?.[0]?.code === 'active');
        const resolvedConditions = conditions.filter(c => c.clinicalStatus?.coding?.[0]?.code === 'resolved');

        const formatCondition = (condition: TCondition): string => `
            <tr>
                <td>${condition.code?.text || 'Unknown'}</td>
                <td>${condition.onsetDateTime || '-'}</td>
                <td>${condition.abatementDateTime || '-'}</td>
            </tr>
        `;

        const activeTable = `
        <h3>Active Conditions</h3>
        <table>
            <thead>
                <tr>
                    <th>Condition</th>
                    <th>Onset Date</th>
                    <th>Resolved Date</th>
                </tr>
            </thead>
            <tbody>
                ${activeConditions.map(formatCondition).join('')}
            </tbody>
        </table>
        `;

        const resolvedTable = `
        <h3>Resolved Conditions</h3>
        <table>
            <thead>
                <tr>
                    <th>Condition</th>
                    <th>Onset Date</th>
                    <th>Resolved Date</th>
                </tr>
            </thead>
            <tbody>
                ${resolvedConditions.map(formatCondition).join('')}
            </tbody>
        </table>
        `;

        return `<div>${activeTable}<br />${resolvedTable}</div>`;
    }
}

