// MedicationSummaryTemplate.ts - TypeScript replacement for Jinja2 medicationsummary.j2
import { TemplateUtilities } from './TemplateUtilities';
import { TBundle } from '../../../types/resources/Bundle';
import { TMedicationRequest } from '../../../types/resources/MedicationRequest';
import { TMedicationStatement } from '../../../types/resources/MedicationStatement';

/**
 * Class to generate HTML narrative for Medication resources
 * This replaces the Jinja2 medicationsummary.j2 template
 */
export class MedicationSummaryTemplate {
  /**
   * Generate HTML narrative for Medication resources
   * @param resource - FHIR Bundle containing Medication resources
   * @returns HTML string for rendering
   */
  static generateNarrative(resource: TBundle): string {
    let html = '';

    // Add Medication Requests section if we have any
    const medicationRequests = this.getMedicationRequests(resource);
    if (medicationRequests.length > 0) {
      html += this.renderMedicationRequests(medicationRequests);
    }

    // Add Medication Statements section if we have any
    const medicationStatements = this.getMedicationStatements(resource);
    if (medicationStatements.length > 0) {
      html += this.renderMedicationStatements(medicationStatements);
    }

    return html;
  }

  /**
   * Extract MedicationRequest resources from the bundle
   * @param resource - FHIR Bundle
   * @returns Array of MedicationRequest resources
   */
  private static getMedicationRequests(resource: TBundle): Array<{resource: TMedicationRequest, extension?: any}> {
    if (!resource.entry || !Array.isArray(resource.entry)) {
      return [];
    }

    return resource.entry
      .filter(entry => entry.resource?.resourceType === 'MedicationRequest')
      .map(entry => ({
        resource: entry.resource as TMedicationRequest,
        extension: entry.resource?.extension?.find(ext =>
          ext.url === 'http://hl7.org/fhir/StructureDefinition/narrativeLink'
        )
      }));
  }

  /**
   * Extract MedicationStatement resources from the bundle
   * @param resource - FHIR Bundle
   * @returns Array of MedicationStatement resources
   */
  private static getMedicationStatements(resource: TBundle): Array<{resource: TMedicationStatement, extension?: any}> {
    if (!resource.entry || !Array.isArray(resource.entry)) {
      return [];
    }

    return resource.entry
      .filter(entry => entry.resource?.resourceType === 'MedicationStatement')
      .map(entry => ({
        resource: entry.resource as TMedicationStatement,
        extension: entry.resource?.extension?.find(ext =>
          ext.url === 'http://hl7.org/fhir/StructureDefinition/narrativeLink'
        )
      }));
  }

  /**
   * Render HTML table for MedicationRequest resources
   * @param medications - Array of MedicationRequest resources
   * @returns HTML string for rendering
   */
  private static renderMedicationRequests(medications: Array<{resource: TMedicationRequest, extension?: any}>): string {
    let html = `
      <h5>Medication Summary: Medication Requests</h5>
      <table class="hapiPropertyTable">
        <thead>
          <tr>
            <th>Medication</th>
            <th>Status</th>
            <th>Route</th>
            <th>Sig</th>
            <th>Comments</th>
            <th>Authored Date</th>
          </tr>
        </thead>
        <tbody>`;

    for (const { resource: mr, extension } of medications) {
      // Extract row ID from extension if present
      let rowId = '';
      if (extension && extension.value && extension.value.value &&
          typeof extension.value.value === 'string' && extension.value.value.includes('#')) {
        rowId = extension.value.value.split('#')[1];
      }

      // Format status
      let status = '';
      if (mr.status) {
        if (typeof mr.status === 'object' && mr.status.display) {
          status = mr.status.display;
        } else {
          status = String(mr.status);
        }
      }

      // Add table row
      html += `
        <tr${rowId ? ` id="${rowId}"` : ''}>
          <td>${TemplateUtilities.codeableConcept(mr.medicationCodeableConcept)}</td>
          <td>${status}</td>
          <td>${TemplateUtilities.concatDosageRoute(mr.dosageInstruction)}</td>
          <td>${TemplateUtilities.concat(mr.dosageInstruction, 'text')}</td>
          <td>${TemplateUtilities.concat(mr.note, 'text')}</td>
          <td>${mr.authoredOn || ''}</td>
        </tr>`;
    }

    html += `
        </tbody>
      </table>`;

    return html;
  }

  /**
   * Render HTML table for MedicationStatement resources
   * @param medications - Array of MedicationStatement resources
   * @returns HTML string for rendering
   */
  private static renderMedicationStatements(medications: Array<{resource: TMedicationStatement, extension?: any}>): string {
    let html = `
      <h5>Medication Summary: Medication Statements</h5>
      <table class="hapiPropertyTable">
        <thead>
          <tr>
            <th>Medication</th>
            <th>Status</th>
            <th>Category</th>
            <th>Route</th>
            <th>Dosage</th>
            <th>Effective</th>
            <th>Date Asserted</th>
          </tr>
        </thead>
        <tbody>`;

    for (const { resource: ms, extension } of medications) {
      // Extract row ID from extension if present
      let rowId = '';
      if (extension && extension.value && extension.value.value &&
          typeof extension.value.value === 'string' && extension.value.value.includes('#')) {
        rowId = extension.value.value.split('#')[1];
      }

      // Format status
      let status = '';
      if (ms.status) {
        if (typeof ms.status === 'object' && ms.status.display) {
          status = ms.status.display;
        } else {
          status = String(ms.status);
        }
      }

      // Format effective date/time
      let effectiveDate = '';
      if (ms.effectiveDateTime) {
        effectiveDate = ms.effectiveDateTime;
      } else if (ms.effectivePeriod) {
        const start = ms.effectivePeriod.start || '';
        const end = ms.effectivePeriod.end || '';
        effectiveDate = start && end ? `${start} to ${end}` : (start || end);
      }

      // Add table row
      html += `
        <tr${rowId ? ` id="${rowId}"` : ''}>
          <td>${TemplateUtilities.renderMedication(ms)}</td>
          <td>${status}</td>
          <td>${TemplateUtilities.codeableConcept(ms.category)}</td>
          <td>${TemplateUtilities.concatDosageRoute(ms.dosage)}</td>
          <td>${TemplateUtilities.concat(ms.dosage, 'text')}</td>
          <td>${effectiveDate}</td>
          <td>${ms.dateAsserted || ''}</td>
        </tr>`;
    }

    html += `
        </tbody>
      </table>`;

    return html;
  }
}
