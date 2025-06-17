// MedicalDevicesTemplate.ts - TypeScript replacement for Jinja2 medicaldevices.j2
import { TemplateUtilities } from './TemplateUtilities';
import { TBundle } from '../../../types/resources/Bundle';
import { TDeviceUseStatement } from '../../../types/resources/DeviceUseStatement';

/**
 * Class to generate HTML narrative for Medical Devices (DeviceUseStatement resources)
 * This replaces the Jinja2 medicaldevices.j2 template
 */
export class MedicalDevicesTemplate {
  /**
   * Generate HTML narrative for Medical Devices
   * @param resource - FHIR Bundle containing DeviceUseStatement resources
   * @returns HTML string for rendering
   */
  static generateNarrative(resource: TBundle): string {
    // Start building the HTML table
    let html = `
      <h5>Medical Devices</h5>
      <table class="hapiPropertyTable">
        <thead>
          <tr>
            <th>Device</th>
            <th>Status</th>
            <th>Comments</th>
            <th>Date Recorded</th>
          </tr>
        </thead>
        <tbody>`;

    // Check if we have entries in the bundle
    if (resource.entry && Array.isArray(resource.entry)) {
      // Loop through entries in the bundle to find DeviceUseStatement resources
      for (const entry of resource.entry) {
        if (entry.resource?.resourceType === 'DeviceUseStatement') {
          const dus = entry.resource as TDeviceUseStatement;

          // Find the narrative link extension if it exists
          let narrativeLinkId = '';
          if (dus.extension && Array.isArray(dus.extension)) {
            const extension = dus.extension.find(ext =>
              ext.url === 'http://hl7.org/fhir/StructureDefinition/narrativeLink'
            );
            narrativeLinkId = TemplateUtilities.narrativeLinkId(extension);
          }

          // Add a table row for this device use statement
          html += `
            <tr id="${narrativeLinkId}">
              <td>${TemplateUtilities.renderDevice(dus.device)}</td>
              <td>${dus.status || ''}</td>
              <td>${TemplateUtilities.safeConcat(dus.note, 'text')}</td>
              <td>${TemplateUtilities.renderRecorded(dus.recordedOn)}</td>
            </tr>`;
        }
      }
    }

    // Close the HTML table
    html += `
        </tbody>
      </table>`;

    return html;
  }
}
