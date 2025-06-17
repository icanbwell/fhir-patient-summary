// DiagnosticResultsTemplate.ts - TypeScript replacement for Jinja2 diagnosticresults.j2
import { TemplateUtilities } from './TemplateUtilities';
import { TBundle } from '../../../types/resources/Bundle';
import { TObservation } from '../../../types/resources/Observation';
import { TDiagnosticReport } from '../../../types/resources/DiagnosticReport';

/**
 * Class to generate HTML narrative for Diagnostic Results (Observation resources)
 * This replaces the Jinja2 diagnosticresults.j2 template
 */
export class DiagnosticResultsTemplate {
  /**
   * Generate HTML narrative for Diagnostic Results
   * @param resource - FHIR Bundle containing Observation and DiagnosticReport resources
   * @returns HTML string for rendering
   */
  static generateNarrative(resource: TBundle): string {
    let html = '';

    // Generate Observations section if we have any Observation resources
    const observations = this.getObservations(resource);
    if (observations.length > 0) {
      html += this.renderObservations(observations);
    }

    // Generate DiagnosticReports section if we have any DiagnosticReport resources
    const diagnosticReports = this.getDiagnosticReports(resource);
    if (diagnosticReports.length > 0) {
      html += this.renderDiagnosticReports(diagnosticReports);
    }

    return html;
  }

  /**
   * Extract Observation resources from the bundle
   * @param resource - FHIR Bundle
   * @returns Array of Observation resources with their extensions
   */
  private static getObservations(resource: TBundle): Array<{resource: TObservation, extension?: any}> {
    if (!resource.entry || !Array.isArray(resource.entry)) {
      return [];
    }

    return resource.entry
      .filter(entry => entry.resource?.resourceType === 'Observation')
      .map(entry => ({
        resource: entry.resource as TObservation,
        extension: entry.resource?.extension?.find(ext =>
          ext.url === 'http://hl7.org/fhir/StructureDefinition/narrativeLink'
        )
      }));
  }

  /**
   * Extract DiagnosticReport resources from the bundle
   * @param resource - FHIR Bundle
   * @returns Array of DiagnosticReport resources with their extensions
   */
  private static getDiagnosticReports(resource: TBundle): Array<{resource: TDiagnosticReport, extension?: any}> {
    if (!resource.entry || !Array.isArray(resource.entry)) {
      return [];
    }

    return resource.entry
      .filter(entry => entry.resource?.resourceType === 'DiagnosticReport')
      .map(entry => ({
        resource: entry.resource as TDiagnosticReport,
        extension: entry.resource?.extension?.find(ext =>
          ext.url === 'http://hl7.org/fhir/StructureDefinition/narrativeLink'
        )
      }));
  }

  /**
   * Render HTML table for Observation resources
   * @param observations - Array of Observation resources
   * @returns HTML string for rendering
   */
  private static renderObservations(observations: Array<{resource: TObservation, extension?: any}>): string {
    let html = `
      <h5>Diagnostic Results: Observations</h5>
      <table class="hapiPropertyTable">
        <thead>
          <tr>
            <th>Code</th>
            <th>Result</th>
            <th>Unit</th>
            <th>Interpretation</th>
            <th>Reference Range</th>
            <th>Comments</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>`;

    for (const { resource: obs, extension } of observations) {
      // Find the narrative link ID if it exists
      const narrativeLinkId = TemplateUtilities.narrativeLinkId(extension);

      // Add table row
      html += `
        <tr id="${narrativeLinkId}">
          <td>${TemplateUtilities.codeableConcept(obs.code)}</td>
          <td>${obs.value ? TemplateUtilities.renderValue(obs.value) : ''}</td>
          <td>${obs.value ? TemplateUtilities.renderValueUnit(obs.value) : ''}</td>
          <td>${TemplateUtilities.firstFromCodeableConceptList(obs.interpretation)}</td>
          <td>${TemplateUtilities.concatReferenceRange(obs.referenceRange)}</td>
          <td>${TemplateUtilities.safeConcat(obs.note, 'text')}</td>
          <td>${TemplateUtilities.renderTime(obs.effectiveDateTime)}</td>
        </tr>`;
    }

    html += `
        </tbody>
      </table>`;

    return html;
  }

  /**
   * Render HTML table for DiagnosticReport resources
   * @param reports - Array of DiagnosticReport resources
   * @returns HTML string for rendering
   */
  private static renderDiagnosticReports(reports: Array<{resource: TDiagnosticReport, extension?: any}>): string {
    let html = `
      <h5>Diagnostic Results: Reports</h5>
      <table class="hapiPropertyTable">
        <thead>
          <tr>
            <th>Report</th>
            <th>Status</th>
            <th>Category</th>
            <th>Result</th>
            <th>Issued</th>
          </tr>
        </thead>
        <tbody>`;

    for (const { resource: report, extension } of reports) {
      // Find the narrative link ID if it exists
      const narrativeLinkId = TemplateUtilities.narrativeLinkId(extension);

      // Format result count
      let resultCount = '';
      if (report.result && Array.isArray(report.result)) {
        resultCount = `${report.result.length} result${report.result.length !== 1 ? 's' : ''}`;
      }

      // Add table row
      html += `
        <tr id="${narrativeLinkId}">
          <td>${TemplateUtilities.codeableConcept(report.code)}</td>
          <td>${report.status || ''}</td>
          <td>${TemplateUtilities.firstFromCodeableConceptList(report.category)}</td>
          <td>${resultCount}</td>
          <td>${report.issued || ''}</td>
        </tr>`;
    }

    html += `
        </tbody>
      </table>`;

    return html;
  }
}
