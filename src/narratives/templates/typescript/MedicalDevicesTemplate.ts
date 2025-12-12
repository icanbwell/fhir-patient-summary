// MedicalDevicesTemplate.ts - TypeScript replacement for Jinja2 medicaldevices.j2
import {TemplateUtilities} from './TemplateUtilities';
import {TDomainResource} from '../../../types/resources/DomainResource';
import {TDeviceUseStatement} from '../../../types/resources/DeviceUseStatement';
import {ITemplate} from './interfaces/ITemplate';

/**
 * Class to generate HTML narrative for Medical Device resources
 * This replaces the Jinja2 medicaldevices.j2 template
 */
export class MedicalDevicesTemplate implements ITemplate {
  /**
   * Generate HTML narrative for Medical Device resources
   * @param resources - FHIR resources array containing Device resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  generateNarrative(resources: TDomainResource[], timezone: string | undefined): string {
    return MedicalDevicesTemplate.generateStaticNarrative(resources, timezone);
  }

  /**
   * Internal static implementation that actually generates the narrative
   * @param resources - FHIR resources array containing Device resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
   
  private static generateStaticNarrative(resources: TDomainResource[], timezone: string | undefined): string {
    const templateUtilities = new TemplateUtilities(resources);
    // Start building the HTML table
    let html = `<p>This list includes all DeviceUseStatement resources, sorted by recorded date (most recent first).</p>
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

    // Get DeviceUseStatement resources from the array and sort by date
    const deviceStatements = resources
      .filter(resourceItem => resourceItem.resourceType === 'DeviceUseStatement')
      .map(resourceItem => resourceItem as TDeviceUseStatement)
      .sort((a, b) => {
        const dateA = a.recordedOn;
        const dateB = b.recordedOn;
        return (typeof dateA === 'string' && typeof dateB === 'string')
          ? new Date(dateB).getTime() - new Date(dateA).getTime()
          : 0;
      });

    // Loop through DeviceUseStatement resources
    for (const dus of deviceStatements) {
      // Use the enhanced narrativeLinkId utility function to extract the ID directly from the resource
      // Add a table row for this device use statement
      html += `
        <tr id="${templateUtilities.narrativeLinkId(dus)}">
          <td>${templateUtilities.renderTextAsHtml(templateUtilities.renderDevice(dus.device))}</td>
          <td>${templateUtilities.renderTextAsHtml(dus.status || '')}</td>
          <td>${templateUtilities.renderNotes(dus.note, timezone)}</td>
          <td>${templateUtilities.renderTextAsHtml(templateUtilities.renderRecorded(dus.recordedOn, timezone))}</td>
        </tr>`;
    }

    // Close the HTML table
    html += `
        </tbody>
      </table>`;

    return html;
  }
}
