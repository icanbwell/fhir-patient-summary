import {TFamilyMemberHistory} from "../types/resources/FamilyMemberHistory";
import {BaseNarrativeGenerator} from "./baseNarrative";

export class FamilyMemberHistoryNarrativeGenerator implements BaseNarrativeGenerator<TFamilyMemberHistory> {
    generateNarrative(histories: TFamilyMemberHistory[]): string {
        return histories.map(history => {
            const relationship = history.relationship?.text || 'Unknown';
            const conditions = history.condition?.map(c => c.code?.text || 'Unknown').join(', ') || 'None';

            return `
            <h2>Family Member History</h2>
            <table>
                <tbody>
                    <tr>
                        <th>Relationship</th>
                        <td>${relationship}</td>
                    </tr>
                    <tr>
                        <th>Conditions</th>
                        <td>${conditions}</td>
                    </tr>
                </tbody>
            </table>
            `;
        }).join('<br />');
    }
}
