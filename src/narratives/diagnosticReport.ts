import {TDiagnosticReport} from "../types/resources/DiagnosticReport";
import {BaseNarrativeGenerator} from "./baseNarrative";

export class DiagnosticReportNarrativeGenerator implements BaseNarrativeGenerator<TDiagnosticReport> {
    generateNarrative(reports: TDiagnosticReport[]): string {
        return reports.map(report => {
            const reportName = report.code?.text || 'Unknown';
            const status = report.status || 'Unknown';
            const results = report.result?.map(r => r.display || 'Unnamed Result').join(', ') || 'No results';

            return `
            <h2>Diagnostic Report</h2>
            <table>
                <tbody>
                    <tr>
                        <th>Report Type</th>
                        <td>${reportName}</td>
                    </tr>
                    <tr>
                        <th>Status</th>
                        <td>${status}</td>
                    </tr>
                    <tr>
                        <th>Results</th>
                        <td>${results}</td>
                    </tr>
                </tbody>
            </table>
            `;
        }).join('<br />');
    }
}
