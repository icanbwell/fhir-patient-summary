import {TClinicalImpression} from "../types/resources/ClinicalImpression";
import {BaseNarrativeGenerator} from "./baseNarrative";

export class ClinicalImpressionNarrativeGenerator implements BaseNarrativeGenerator<TClinicalImpression> {
    generateNarrative(impressions: TClinicalImpression[]): string {
        return impressions.map(impression => {
            const findings = impression.finding?.map(f => f.itemCodeableConcept?.text || 'Unknown').join(', ') || 'None';

            return `
            <h2>Clinical Impression</h2>
            <table>
                <tbody>
                    <tr>
                        <th>Status</th>
                        <td>${impression.status || 'Unknown'}</td>
                    </tr>
                    <tr>
                        <th>Findings</th>
                        <td>${findings}</td>
                    </tr>
                </tbody>
            </table>
            `;
        }).join('<br />');
    }
}

