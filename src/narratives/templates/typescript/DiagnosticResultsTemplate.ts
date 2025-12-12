// DiagnosticResultsTemplate.ts - TypeScript replacement for Jinja2 diagnosticresults.j2
import {TemplateUtilities} from './TemplateUtilities';
import {TDomainResource} from '../../../types/resources/DomainResource';
import {TObservation} from '../../../types/resources/Observation';
import {TDiagnosticReport} from '../../../types/resources/DiagnosticReport';
import {ISummaryTemplate} from './interfaces/ITemplate';
import { TComposition } from '../../../types/resources/Composition';
import { LAB_LOINC_MAP } from '../../../constants';
import { RESULT_SUMMARY_OBSERVATION_DATE_FILTER } from '../../../structures/ips_section_constants';

 // Build reverse lookup: LOINC code -> lab name
const loincToLabName: Record<string, string> = {};
for (const [labName, loincCodes] of Object.entries(LAB_LOINC_MAP)) {
  for (const code of loincCodes) {
    loincToLabName[code] = labName;
  }
}

/**
 * Class to generate HTML narrative for Diagnostic Results (Observation resources)
 * This replaces the Jinja2 diagnosticresults.j2 template
 */
export class DiagnosticResultsTemplate implements ISummaryTemplate {
  /**
   * Generate HTML narrative for Diagnostic Results
   * @param resources - FHIR resources array containing Observation and DiagnosticReport resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  generateNarrative(resources: TDomainResource[], timezone: string | undefined): string {
    return DiagnosticResultsTemplate.generateStaticNarrative(resources, timezone);
  }

  /**
   * Helper function to format observation data fields
   * @param obsData - Record containing observation data fields
   */
  private formatSummaryObservationData(obsData: Record<string, string>): void {
    // Format value based on valueType
    const valueType = obsData['valueType'];
    
    switch (valueType) {
      case 'valueQuantity':
        if (obsData['value'] && obsData['unit']) {
          obsData['formattedValue'] = `${obsData['value']} ${obsData['unit']}`;
        } else if (obsData['value']) {
          obsData['formattedValue'] = obsData['value'];
        }
        break;
      
      case 'valueCodeableConcept':
      case 'valueString':
      case 'valueBoolean':
      case 'valueInteger':
      case 'valueDateTime':
      case 'valueTime':
        obsData['formattedValue'] = obsData['value'] ?? '';
        break;
      
      case 'valuePeriod':
        if (obsData['valuePeriodStart'] && obsData['valuePeriodEnd']) {
          obsData['formattedValue'] = `${obsData['valuePeriodStart']} - ${obsData['valuePeriodEnd']}`;
        } else if (obsData['valuePeriodStart']) {
          obsData['formattedValue'] = `From ${obsData['valuePeriodStart']}`;
        } else if (obsData['valuePeriodEnd']) {
          obsData['formattedValue'] = `Until ${obsData['valuePeriodEnd']}`;
        }
        break;
      
      case 'valueSampledData': {
        const sampledParts: string[] = [];
        if (obsData['sampledDataOriginValue']) {
          sampledParts.push(`Origin: ${obsData['sampledDataOriginValue']}${obsData['sampledDataOriginUnit'] ? ' ' + obsData['sampledDataOriginUnit'] : ''}`);
        }
        if (obsData['sampledDataPeriod']) {
          sampledParts.push(`Period: ${obsData['sampledDataPeriod']}`);
        }
        if (obsData['sampledDataFactor']) {
          sampledParts.push(`Factor: ${obsData['sampledDataFactor']}`);
        }
        if (obsData['sampledDataLowerLimit']) {
          sampledParts.push(`Lower: ${obsData['sampledDataLowerLimit']}`);
        }
        if (obsData['sampledDataUpperLimit']) {
          sampledParts.push(`Upper: ${obsData['sampledDataUpperLimit']}`);
        }
        if (obsData['sampledDataData']) {
          sampledParts.push(`Data: ${obsData['sampledDataData']}`);
        }
        obsData['formattedValue'] = sampledParts.join(', ');
        break;
      }
      
      case 'valueRange': {
        const rangeParts: string[] = [];
        if (obsData['valueRangeLowValue']) {
          rangeParts.push(`${obsData['valueRangeLowValue']}${obsData['valueRangeLowUnit'] ? ' ' + obsData['valueRangeLowUnit'] : ''}`);
        }
        if (obsData['valueRangeHighValue']) {
          rangeParts.push(`${obsData['valueRangeHighValue']}${obsData['valueRangeHighUnit'] ? ' ' + obsData['valueRangeHighUnit'] : ''}`);
        }
        obsData['formattedValue'] = rangeParts.join(' - ');
        break;
      }
      
      case 'valueRatio': {
        const numerator = obsData['valueRatioNumeratorValue'] 
          ? `${obsData['valueRatioNumeratorValue']}${obsData['valueRatioNumeratorUnit'] ? ' ' + obsData['valueRatioNumeratorUnit'] : ''}`
          : '';
        const denominator = obsData['valueRatioDenominatorValue']
          ? `${obsData['valueRatioDenominatorValue']}${obsData['valueRatioDenominatorUnit'] ? ' ' + obsData['valueRatioDenominatorUnit'] : ''}`
          : '';
        if (numerator && denominator) {
          obsData['formattedValue'] = `${numerator} / ${denominator}`;
        } else if (numerator) {
          obsData['formattedValue'] = numerator;
        }
        break;
      }
      
      default:
        // Fallback to raw value if valueType is not set
        obsData['formattedValue'] = obsData['value'] ?? '';
        break;
    }
    
    // Format reference range
    if (obsData['referenceRangeLow']) {
      obsData['referenceRange'] = obsData['referenceRangeLow'] + ' ' + obsData['referenceRangeLowUnit'];
    }
    if (obsData['referenceRangeHigh']) {
      if (obsData['referenceRange']) {
        obsData['referenceRange'] += ' - ';
      } else {
        obsData['referenceRange'] = '';
      }
      obsData['referenceRange'] += obsData['referenceRangeHigh'] + ' ' + obsData['referenceRangeHighUnit'];
    }
    
    // Add reference range age information if present
    if (obsData['referenceRangeAgeLowValue'] || obsData['referenceRangeAgeHighValue']) {
      const ageParts: string[] = [];
      if (obsData['referenceRangeAgeLowValue']) {
        ageParts.push(`${obsData['referenceRangeAgeLowValue']}${obsData['referenceRangeAgeLowUnit'] ? ' ' + obsData['referenceRangeAgeLowUnit'] : ''}`);
      }
      if (obsData['referenceRangeAgeHighValue']) {
        ageParts.push(`${obsData['referenceRangeAgeHighValue']}${obsData['referenceRangeAgeHighUnit'] ? ' ' + obsData['referenceRangeAgeHighUnit'] : ''}`);
      }
      if (obsData['referenceRange']) {
        obsData['referenceRange'] += ` (Age: ${ageParts.join(' - ')})`;
      } else {
        obsData['referenceRange'] = `Age: ${ageParts.join(' - ')}`;
      }
    }
  };


  /**
   * Helper function to extract observation field data
   * @param column - Column data from the summary
   * @param targetData - Record to populate with extracted data
   * @param templateUtilities - Instance of TemplateUtilities for utility functions
   */
  private extractSummaryObservationFields(
    column: any,
    targetData: Record<string, string>,
    templateUtilities: TemplateUtilities
  ): void {
    switch (column.title) {
      case 'Labs Name':
        targetData['code'] = templateUtilities.renderTextAsHtml(column.text?.div ?? '');
        break;
      case 'effectiveDateTime':
        targetData['effectiveDateTime'] = templateUtilities.renderTextAsHtml(column.text?.div ?? '');
        break;
      case 'effectivePeriod.start':
        targetData['effectivePeriodStart'] = templateUtilities.renderTextAsHtml(column.text?.div ?? '');
        break;
      case 'effectivePeriod.end':
        targetData['effectivePeriodEnd'] = templateUtilities.renderTextAsHtml(column.text?.div ?? '');
        break;
      
      // valueQuantity
      case 'valueQuantity.value':
        targetData['value'] = templateUtilities.renderTextAsHtml(column.text?.div ?? '');
        targetData['valueType'] = 'valueQuantity';
        break;
      case 'valueQuantity.unit':
        targetData['unit'] = templateUtilities.renderTextAsHtml(column.text?.div ?? '');
        break;
      
      // valueCodeableConcept
      case 'valueCodeableConcept.text':
        targetData['value'] = templateUtilities.renderTextAsHtml(column.text?.div ?? '');
        targetData['valueType'] = 'valueCodeableConcept';
        break;
      case 'valueCodeableConcept.coding.display':
        if (!targetData['value']) {
          targetData['value'] = templateUtilities.renderTextAsHtml(column.text?.div ?? '');
          targetData['valueType'] = 'valueCodeableConcept';
        }
        break;
      
      // valueString
      case 'valueString':
        targetData['value'] = templateUtilities.renderTextAsHtml(column.text?.div ?? '');
        targetData['valueType'] = 'valueString';
        break;
      
      // valueBoolean
      case 'valueBoolean':
        targetData['value'] = templateUtilities.renderTextAsHtml(column.text?.div ?? '');
        targetData['valueType'] = 'valueBoolean';
        break;
      
      // valueInteger
      case 'valueInteger':
        targetData['value'] = templateUtilities.renderTextAsHtml(column.text?.div ?? '');
        targetData['valueType'] = 'valueInteger';
        break;
      
      // valueDateTime
      case 'valueDateTime':
        targetData['value'] = templateUtilities.renderTextAsHtml(column.text?.div ?? '');
        targetData['valueType'] = 'valueDateTime';
        break;
      
      // valuePeriod
      case 'valuePeriod.start':
        targetData['valuePeriodStart'] = templateUtilities.renderTextAsHtml(column.text?.div ?? '');
        targetData['valueType'] = 'valuePeriod';
        break;
      case 'valuePeriod.end':
        targetData['valuePeriodEnd'] = templateUtilities.renderTextAsHtml(column.text?.div ?? '');
        targetData['valueType'] = 'valuePeriod';
        break;
      
      // valueTime
      case 'valueTime':
        targetData['value'] = templateUtilities.renderTextAsHtml(column.text?.div ?? '');
        targetData['valueType'] = 'valueTime';
        break;
      
      // valueSampledData
      case 'valueSampledData.origin.value':
        targetData['sampledDataOriginValue'] = templateUtilities.renderTextAsHtml(column.text?.div ?? '');
        targetData['valueType'] = 'valueSampledData';
        break;
      case 'valueSampledData.origin.unit':
        targetData['sampledDataOriginUnit'] = templateUtilities.renderTextAsHtml(column.text?.div ?? '');
        break;
      case 'valueSampledData.period':
        targetData['sampledDataPeriod'] = templateUtilities.renderTextAsHtml(column.text?.div ?? '');
        break;
      case 'valueSampledData.factor':
        targetData['sampledDataFactor'] = templateUtilities.renderTextAsHtml(column.text?.div ?? '');
        break;
      case 'valueSampledData.lowerLimit':
        targetData['sampledDataLowerLimit'] = templateUtilities.renderTextAsHtml(column.text?.div ?? '');
        break;
      case 'valueSampledData.upperLimit':
        targetData['sampledDataUpperLimit'] = templateUtilities.renderTextAsHtml(column.text?.div ?? '');
        break;
      case 'valueSampledData.data':
        targetData['sampledDataData'] = templateUtilities.renderTextAsHtml(column.text?.div ?? '');
        break;
      
      // valueRange
      case 'valueRange.low.value':
        targetData['valueRangeLowValue'] = templateUtilities.renderTextAsHtml(column.text?.div ?? '');
        targetData['valueType'] = 'valueRange';
        break;
      case 'valueRange.low.unit':
        targetData['valueRangeLowUnit'] = templateUtilities.renderTextAsHtml(column.text?.div ?? '');
        break;
      case 'valueRange.high.value':
        targetData['valueRangeHighValue'] = templateUtilities.renderTextAsHtml(column.text?.div ?? '');
        break;
      case 'valueRange.high.unit':
        targetData['valueRangeHighUnit'] = templateUtilities.renderTextAsHtml(column.text?.div ?? '');
        break;
      
      // valueRatio
      case 'valueRatio.numerator.value':
        targetData['valueRatioNumeratorValue'] = templateUtilities.renderTextAsHtml(column.text?.div ?? '');
        targetData['valueType'] = 'valueRatio';
        break;
      case 'valueRatio.numerator.unit':
        targetData['valueRatioNumeratorUnit'] = templateUtilities.renderTextAsHtml(column.text?.div ?? '');
        break;
      case 'valueRatio.denominator.value':
        targetData['valueRatioDenominatorValue'] = templateUtilities.renderTextAsHtml(column.text?.div ?? '');
        break;
      case 'valueRatio.denominator.unit':
        targetData['valueRatioDenominatorUnit'] = templateUtilities.renderTextAsHtml(column.text?.div ?? '');
        break;
      
      // referenceRange
      case 'referenceRange.low.value':
        targetData['referenceRangeLow'] = templateUtilities.renderTextAsHtml(column.text?.div ?? '');
        break;
      case 'referenceRange.low.unit':
        targetData['referenceRangeLowUnit'] = templateUtilities.renderTextAsHtml(column.text?.div ?? '');
        break;
      case 'referenceRange.high.value':
        targetData['referenceRangeHigh'] = templateUtilities.renderTextAsHtml(column.text?.div ?? '');
        break;
      case 'referenceRange.high.unit':
        targetData['referenceRangeHighUnit'] = templateUtilities.renderTextAsHtml(column.text?.div ?? '');
        break;
      case 'referenceRange.age.low.value':
        targetData['referenceRangeAgeLowValue'] = templateUtilities.renderTextAsHtml(column.text?.div ?? '');
        break;
      case 'referenceRange.age.low.unit':
        targetData['referenceRangeAgeLowUnit'] = templateUtilities.renderTextAsHtml(column.text?.div ?? '');
        break;
      case 'referenceRange.age.high.value':
        targetData['referenceRangeAgeHighValue'] = templateUtilities.renderTextAsHtml(column.text?.div ?? '');
        break;
      case 'referenceRange.age.high.unit':
        targetData['referenceRangeAgeHighUnit'] = templateUtilities.renderTextAsHtml(column.text?.div ?? '');
        break;
      
      default:
        break;
    }
  };

  /**
   * Generate HTML narrative for Diagnostic Results & Observation resources using summary
   * @param resources - FHIR Composition resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  public generateSummaryNarrative(
    resources: TComposition[],
    timezone: string | undefined
  ): string | undefined {
    const templateUtilities = new TemplateUtilities(resources);

    let html = `
      <div>`;

    let observationhtml = `
      <div>
        <h3>Observations</h3>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Code (System)</th>
              <th>Result</th>
              <th>Reference Range</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>`;

    let diagnosticReporthtml = `
      <div>
        <h3>Diagnostic Reports</h3>
        <table>
          <thead>
            <tr>
              <th>Report</th>
              <th>Performer</th>
              <th>Issued</th>
            </tr>
          </thead>
          <tbody>`;

    const observationAdded = new Set<string>();
    const diagnosticReportAdded = new Set<string>();

    for (const resourceItem of resources) {
      for (const rowData of resourceItem.section ?? []) {
        const sectionCodeableConcept = rowData.code;
        const data: Record<string, string> = {};
        data["codeSystem"] = templateUtilities.codeableConceptCoding(sectionCodeableConcept);
        const components: Array<Record<string, string>> = [];
        
        for (const columnData of rowData.section ?? []) {
          if (
            resourceItem.title === 'Observation|Labs Summary Grouped by Lab Code'
          ) {
            // Check if this is an Observation.component
            if (columnData.text?.div === 'Observation.component' && columnData.section) {
              // Extract nested component data
              for (const componentSection of columnData.section) {
                const componentData: Record<string, string> = {};
                for (const nestedColumn of componentSection.section ?? []) {
                  this.extractSummaryObservationFields(nestedColumn, componentData, templateUtilities);
                }
                if (Object.keys(componentData).length > 0) {
                  components.push(componentData);
                }
              }
            } else {
              // Process top-level observation data
              this.extractSummaryObservationFields(columnData, data, templateUtilities);
            }
          } else if (
            resourceItem.title ===
            'DiagnosticReportLab Summary Grouped by DiagnosticReport|Lab Code'
          ) {
            switch (columnData.title) {
              case 'Diagnostic Report Name':
                data['report'] = templateUtilities.renderTextAsHtml(columnData.text?.div ?? '');
                break;
              case 'Performer':
                data['performer'] = templateUtilities.renderTextAsHtml(columnData.text?.div ?? '');
                break;
              case 'Issued Date':
                data['issued'] = templateUtilities.renderTextAsHtml(columnData.text?.div ?? '');
                break;
              case 'Status':
                data['status'] = templateUtilities.renderTextAsHtml(columnData.text?.div ?? '');
                break;
              default:
                break;
            }
          }
        }
        
        if (
            resourceItem.title === 'Observation|Labs Summary Grouped by Lab Code'
          ) {
            // handle date formatting for effectiveDateTime or effectivePeriod
            let date = data['effectiveDateTime'] ? templateUtilities.renderTime(data['effectiveDateTime'], timezone) : '';
            if (!date && data['effectivePeriodStart']) {
              date = templateUtilities.renderTime(data['effectivePeriodStart'], timezone);
              if (data['effectivePeriodEnd']) {
                date += ' - ' + templateUtilities.renderTime(data['effectivePeriodEnd'], timezone);
              }
            }

            // If we have components, render them
            if (components.length > 0) {
              const groupName = data['code'] ? `${data['code']} - ` : '';
              for (const component of components) {
                const componentCode = `${groupName}${component['code'] ?? ''}`;
                if (componentCode && !observationAdded.has(componentCode)) {
                  observationAdded.add(componentCode);
                  this.formatSummaryObservationData(component);
                  observationhtml += `
                  <tr>
                    <td>${componentCode}</td>
                    <td></td>
                    <td>${templateUtilities.renderTextAsHtml(component['formattedValue']) ?? '-'}</td>
                    <td>${templateUtilities.renderTextAsHtml(component['referenceRange'])?.trim() ?? '-'}</td>
                    <td>${date ?? '-'}</td>
                  </tr>`;
                }
              }
            } else {
              // Render top-level observation data
              const code = data['code'] ?? '';
              if (code && !observationAdded.has(code)) {
                observationAdded.add(code);
                this.formatSummaryObservationData(data);
                observationhtml += `
                  <tr>
                    <td>${data['code'] ?? '-'}</td>
                    <td>${templateUtilities.codeableConceptCoding(sectionCodeableConcept)}</td>
                    <td>${templateUtilities.renderTextAsHtml(data['formattedValue']) ?? '-'}</td>
                    <td>${templateUtilities.renderTextAsHtml(data['referenceRange'])?.trim() ?? '-'}</td>
                    <td>${date ?? '-'}</td>
                  </tr>`;
              }
            }
          } else if (
            resourceItem.title ===
            'DiagnosticReportLab Summary Grouped by DiagnosticReport|Lab Code'
          ) {
            if (data['status'] === 'final') {
              const reportName = data['report'] ?? '';
              if (reportName && !diagnosticReportAdded.has(reportName)) {
                diagnosticReportAdded.add(reportName);
                diagnosticReporthtml += `
                    <tr>
                      <td>${data['report'] ?? '-'}</td>
                      <td>${data['performer'] ?? '-'}</td>
                      <td>${templateUtilities.renderTime(data['issued'], timezone) ?? '-'}</td>
                    </tr>`;
              }
            }
          }
      }
    }

    if (observationAdded.size > 0) {
      html += observationhtml;
      html += `
            </tbody>
          </table>
          </div>`;
    }
    if (diagnosticReportAdded.size > 0) {
      html += diagnosticReporthtml;
      html += `
            </tbody>
          </table>
          </div>`;
    }

    html += `
      </div>`;

    return (observationAdded.size > 0 || diagnosticReportAdded.size > 0) ? html : undefined;
  }

  /**
   * Internal static implementation that actually generates the narrative
   * @param resources - FHIR resources array containing Observation and DiagnosticReport resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  private static generateStaticNarrative(resources: TDomainResource[], timezone: string | undefined): string {
    const templateUtilities = new TemplateUtilities(resources);
    let html = '';

    // Generate Observations section if we have any Observation resources
    const observations = this.getObservations(resources);
    if (observations.length > 0) {
      // sort observations by date descending
      observations.sort((a, b) => {
        const dateA = this.getObservationDate(a);
        const dateB = this.getObservationDate(b);
        return dateA && dateB ? dateB.getTime() - dateA.getTime() : 0;
      });
      this.filterObservationForLoincCodes(observations);
      html += this.renderObservations(templateUtilities, observations, timezone);
    }

    if (process.env.ENABLE_DIAGNOSTIC_REPORTS_IN_SUMMARY === 'true') {
      // Generate DiagnosticReports section if we have any DiagnosticReport resources
      const diagnosticReports = this.getDiagnosticReports(resources);
      if (diagnosticReports.length > 0) {
        // sort diagnostic reports by date descending
        diagnosticReports.sort((a, b) => {
          const dateA = a.issued;
          const dateB = b.issued;
          return dateA && dateB ? new Date(dateB).getTime() - new Date(dateA).getTime() : 0;
        });
        html += this.renderDiagnosticReports(templateUtilities, diagnosticReports, timezone);
      }
    }

    return html;
  }

  private static filterObservationForLoincCodes(observations: TObservation[]): void {
    const labsAdded = new Set<string>();
    const filteredObservations: TObservation[] = [];
    for (const obs of observations) {
      const loincCode = this.getObservationLoincCode(obs);
      if (loincCode && loincToLabName[loincCode]) {
        const labName = loincToLabName[loincCode];
        if (!labsAdded.has(labName)) {
          labsAdded.add(labName);
          filteredObservations.push(obs);
        }
      }
    }

    // Update the observations array to only include the filtered observations
    observations.length = 0;
    observations.push(...filteredObservations);
  }

  private static getObservationLoincCode(obs: TObservation): string | undefined {
    if (obs.code && obs.code.coding) {
      for (const coding of obs.code.coding) {
        if (coding.system && coding.system.toLowerCase().includes('loinc') && coding.code) {
          return coding.code;
        }
      }
    }
    return undefined;
  }

  private static getObservationDate(obs: TObservation): Date | undefined {
    let obsDate = undefined;
    if (obs.effectiveDateTime) {
      obsDate = new Date(obs.effectiveDateTime);
    } else if (obs.effectivePeriod) {
      if (obs.effectivePeriod.start) {
        obsDate = new Date(obs.effectivePeriod.start);
      } else if (obs.effectivePeriod.end) {
        obsDate = new Date(obs.effectivePeriod.end);
      }
    }
    return obsDate;
  }

    /**
   * Get all Observation resources from the resource array
   * @param resources - FHIR resources array
   * @returns Array of Observation resources
   */
  private static getObservations(resources: TDomainResource[]): Array<TObservation> {
    return resources
      .filter(resourceItem => {
        if (resourceItem.resourceType === 'Observation') {
          const obsDate = this.getObservationDate(resourceItem as TObservation);
          // Date should be within last 2 years
          if (obsDate && obsDate >= new Date(Date.now() - RESULT_SUMMARY_OBSERVATION_DATE_FILTER)) {
            return true;
          }
        }
        return false;
      })
      .map(resourceItem => resourceItem as TObservation);
  }

  /**
   * Get all DiagnosticReport resources from the resource array
   * @param resources - FHIR resources array
   * @returns Array of DiagnosticReport resources
   */
  private static getDiagnosticReports(resources: TDomainResource[]): Array<TDiagnosticReport> {
    return resources
      .filter(resourceItem => resourceItem.resourceType === 'DiagnosticReport')
      .map(resourceItem => resourceItem as TDiagnosticReport);
  }

  /**
   * Render HTML table for Observation resources
   * @param templateUtilities - Instance of TemplateUtilities for utility functions
   * @param observations - Array of Observation resources
   * @param timezone - Optional timezone to use for date formatting
   * @returns HTML string for rendering
   */
  private static renderObservations(templateUtilities: TemplateUtilities, observations: Array<TObservation>, timezone: string | undefined): string {
    let html = '';

    if (process.env.ENABLE_DIAGNOSTIC_REPORTS_IN_SUMMARY === 'true') {
      html += `
      <h3>Observations</h3>`;
    }

    html += `
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Code (System)</th>
            <th>Result</th>
            <th>Reference Range</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>`;

    const observationAdded = new Set<string>();

    for (const obs of observations) {
      const obsCode = templateUtilities.renderTextAsHtml(templateUtilities.codeableConceptDisplay(obs.code));
      if (!observationAdded.has(obsCode)) {
        observationAdded.add(obsCode);
        // Use the enhanced narrativeLinkId utility function to extract the ID directly from the resource
        // Add table row
        html += `
          <tr id="${templateUtilities.narrativeLinkId(obs)}">
            <td>${obsCode}</td>
            <td>${templateUtilities.codeableConceptCoding(obs.code)}</td>
            <td>${templateUtilities.extractObservationValue(obs)}</td>
            <td>${templateUtilities.concatReferenceRange(obs.referenceRange)}</td>
            <td>${obs.effectiveDateTime ? templateUtilities.renderTime(obs.effectiveDateTime, timezone) : obs.effectivePeriod ? templateUtilities.renderPeriod(obs.effectivePeriod, timezone) : ''}</td>
          </tr>`;
      }
    }

    html += `
        </tbody>
      </table>`;

    return html;
  }

  /**
   * Render HTML table for DiagnosticReport resources
   * @param templateUtilities - Instance of TemplateUtilities for utility functions
   * @param reports - Array of DiagnosticReport resources
   * @param timezone - Optional timezone to use for date formatting
   * @returns HTML string for rendering
   */
  private static renderDiagnosticReports(templateUtilities: TemplateUtilities, reports: Array<TDiagnosticReport>, timezone: string | undefined): string {
    let html = `
      <h3>Diagnostic Reports</h3>
      <table>
        <thead>
          <tr>
            <th>Report</th>
            <th>Category</th>
            <th>Result</th>
            <th>Issued</th>
          </tr>
        </thead>
        <tbody>`;
    
    const diagnosticReportAdded = new Set<string>();

    for (const report of reports) {
      const reportName = templateUtilities.renderTextAsHtml(templateUtilities.codeableConceptDisplay(report.code));
      if (!diagnosticReportAdded.has(reportName)) {
        diagnosticReportAdded.add(reportName);
        // Use the enhanced narrativeLinkId utility function to extract the ID directly from the resource
        // Format result count
        let resultCount = '';
        if (report.result && Array.isArray(report.result)) {
          resultCount = `${report.result.length} result${report.result.length !== 1 ? 's' : ''}`;
        }
  
        // Add table row
        html += `
          <tr id="${(templateUtilities.narrativeLinkId(report))}">
            <td>${reportName}</td>
            <td>${templateUtilities.firstFromCodeableConceptList(report.category)}</td>
            <td>${resultCount}</td>
            <td>${report.issued ? templateUtilities.renderTime(report.issued, timezone) : ''}</td>
          </tr>`;
      }
    }

    html += `
        </tbody>
      </table>`;

    return html;
  }
}
