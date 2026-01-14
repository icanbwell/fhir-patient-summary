// MedicalDevicesTemplate.ts - TypeScript replacement for Jinja2 medicaldevices.j2
import {TemplateUtilities} from './TemplateUtilities';
import {TDomainResource} from '../../../types/resources/DomainResource';
import {TDeviceUseStatement} from '../../../types/resources/DeviceUseStatement';
import {ISummaryTemplate} from './interfaces/ITemplate';
import { TComposition } from '../../../types/resources/Composition';

/**
 * Class to generate HTML narrative for Medical Device resources
 * This replaces the Jinja2 medicaldevices.j2 template
 */
export class MedicalDevicesTemplate implements ISummaryTemplate {
  /**
   * Generate HTML narrative for Medical Device resources
   * @param resources - FHIR resources array containing Device resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  generateNarrative(resources: TDomainResource[], timezone: string | undefined): string | undefined {
    return MedicalDevicesTemplate.generateStaticNarrative(resources, timezone);
  }

  /**
   * Generate HTML narrative for history of medical devices using summary
   * @param resources - FHIR Composition resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  generateSummaryNarrative(resources: TComposition[], timezone: string | undefined): string | undefined {
    const templateUtilities = new TemplateUtilities(resources);
    let isSummaryCreated = false;

    let html = `<p>This list includes all information about the patient's medical devices history, sorted by recorded date (most recent first).</p>\n`;

    html += `
      <table>
        <thead>
          <tr>
            <th>Device</th>
            <th>Code (System)</th>
            <th>Status</th>
            <th>Comments</th>
            <th>Date Recorded</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>`;
    
    for (const resourceItem of resources) {
      for (const rowData of resourceItem.section ?? []) {
        const sectionCodeableConcept = rowData.code;
        const data: Record<string, string> = {};
        data["codeSystem"] = templateUtilities.codeableConceptCoding(sectionCodeableConcept);
        for (const columnData of rowData.section ?? []) {
          const columnTitle = columnData.title;
          if (columnTitle) {
            data[columnTitle] = templateUtilities.renderTextAsHtml(columnData.text?.div ?? '');
          }
        }

        // Skip if Device Name is unknown
        if (data['Device Name']?.toLowerCase() === 'unknown') {
          continue;
        }

        isSummaryCreated = true;

        html += `
          <tr>
            <td>${templateUtilities.capitalizeFirstLetter(data['Device Name'] ?? '')}</td>
            <td>${data['codeSystem'] ?? ''}</td>
            <td>${templateUtilities.renderTextAsHtml(data['Status'] ?? '')}</td>
            <td>${templateUtilities.renderTextAsHtml(data['Notes'] ?? '')}</td>
            <td>${templateUtilities.renderTime(data['Recorded On'] ?? '', timezone)}</td>
            <td>${data['Source'] ?? ''}</td>
          </tr>`;
      }
    }

    html += `
          </tbody>
        </table>
      </div>`;

    return isSummaryCreated ? html : undefined;
  }
  

  /**
   * Internal static implementation that generates the narrative from DeviceUseStatement resources.
   * The “Code (System)” column renders Device.type as "code (SystemDisplay)" using TemplateUtilities.codeableConceptCoding.
   */
  private static generateStaticNarrative(resources: TDomainResource[], timezone: string | undefined): string | undefined {
    const templateUtilities = new TemplateUtilities(resources);
    // Start building the HTML table
    let html = `<p>This list includes all DeviceUseStatement resources, sorted by recorded date (most recent first).</p>
      <table>
        <thead>
          <tr>
            <th>Device</th>
            <th>Code (System)</th>
            <th>Status</th>
            <th>Comments</th>
            <th>Date Recorded</th>
            <th>Source</th>
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
    
    const devicesAdded = new Set<string>();

    // Loop through DeviceUseStatement resources
    for (const dus of deviceStatements) {
      // Skip if device name is unknown
      const deviceName = templateUtilities.renderDevice(dus.device);
      if (deviceName?.toLowerCase() === 'unknown'|| devicesAdded.has(deviceName)) {
        continue;
      }

      const device = templateUtilities.getDeviceFromReference(dus.device);
      const codeSystem = templateUtilities.codeableConceptCoding(device?.type);

      if (!codeSystem) {
        continue;
      }

      devicesAdded.add(deviceName);
      
      html += `
        <tr>
          <td>${templateUtilities.capitalizeFirstLetter(deviceName)}</td>
          <td>${codeSystem}</td>
          <td>${templateUtilities.renderTextAsHtml(dus.status || '')}</td>
          <td>${templateUtilities.renderNotes(dus.note, timezone)}</td>
          <td>${templateUtilities.renderTime(dus.recordedOn, timezone)}</td>
          <td>${templateUtilities.getOwnerTag(dus)}</td>
        </tr>`;
    }

    // Close the HTML table
    html += `
        </tbody>
      </table>`;

    return devicesAdded.size > 0 ? html : undefined;
  }
}
