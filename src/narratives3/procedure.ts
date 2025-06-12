import {TProcedure} from "../types/resources/Procedure";
import {BaseNarrativeGenerator} from "./baseNarrative";

export class ProcedureNarrativeGenerator implements BaseNarrativeGenerator<TProcedure> {
    generateNarrative(procedures: TProcedure[]): string {
        return procedures.map(procedure => {
            const procedureName = procedure.code?.text || 'Unknown';
            const status = procedure.status || 'Unknown';
            const performedDate = procedure.performedDateTime || 'Not specified';

            return `
            <h2>Procedure</h2>
            <table>
                <tbody>
                    <tr>
                        <th>Procedure</th>
                        <td>${procedureName}</td>
                    </tr>
                    <tr>
                        <th>Status</th>
                        <td>${status}</td>
                    </tr>
                    <tr>
                        <th>Performed</th>
                        <td>${performedDate}</td>
                    </tr>
                </tbody>
            </table>
            `;
        }).join('<br />');
    }
}
