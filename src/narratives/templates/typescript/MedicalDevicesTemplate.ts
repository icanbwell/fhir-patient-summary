// MedicalDevicesTemplate.ts - TypeScript replacement for Jinja2 medicaldevices.j2
import {TemplateUtilities} from './TemplateUtilities';
import {TBundle} from '../../../types/resources/Bundle';
import {ITemplate} from './interfaces/ITemplate';
import {TDeviceUseStatement} from "../../../types/resources/DeviceUseStatement";

/**
 * Class to generate HTML narrative for Medical Device resources
 * This replaces the Jinja2 medicaldevices.j2 template
 */
export class MedicalDevicesTemplate implements ITemplate {
  /**
   * Generate HTML narrative for Medical Device resources
   * @param resource - FHIR Bundle containing Device resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  generateNarrative(resource: TBundle, timezone: string | undefined): string {
    // sort the entries of the bundle by date in descending order
    if (resource.entry && Array.isArray(resource.entry)) {
      resource.entry.sort((a, b) => {
        const dateA = a.resource?.recordedOn;
        const dateB = b.resource?.recordedOn;
        return (typeof dateA === 'string' && typeof dateB === 'string')
          ? new Date(dateB).getTime() - new Date(dateA).getTime()
          : 0;
      });
    }

    return MedicalDevicesTemplate.generateStaticNarrative(resource, timezone);
  }

  /**
   * Internal static implementation that actually generates the narrative
   * @param resource - FHIR Bundle containing Device resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
   
  private static generateStaticNarrative(resource: TBundle, timezone: string | undefined): string {
    const templateUtilities = new TemplateUtilities(resource);
    // Start building the HTML table
    let html = `
      <table>
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

          // Use the enhanced narrativeLinkId utility function to extract the ID directly from the resource
          // Add a table row for this device use statement
          html += `
            <tr id="${(templateUtilities.narrativeLinkId(dus))}">
              <td>${templateUtilities.renderDevice(dus.device)}</td>
              <td>${dus.status || ''}</td>
              <td>${templateUtilities.renderNotes(dus.note, timezone)}</td>
              <td>${templateUtilities.renderRecorded(dus.recordedOn, timezone)}</td>
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
