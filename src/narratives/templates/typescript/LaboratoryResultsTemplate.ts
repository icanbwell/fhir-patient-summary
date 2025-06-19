// LaboratoryResultsTemplate.ts - TypeScript template for Laboratory Results section
import {TemplateUtilities} from './TemplateUtilities';
import {TBundle} from '../../../types/resources/Bundle';
import {TObservation} from '../../../types/resources/Observation';
import {ITemplate} from './interfaces/ITemplate';

/**
 * Class to generate HTML narrative for Laboratory Results (Observation resources)
 * This provides a specialized view for laboratory test results in the IPS
 */
export class LaboratoryResultsTemplate implements ITemplate {
    /**
     * Generate HTML narrative for Laboratory Results
     * @param resource - FHIR Bundle containing Observation resources
     * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
     * @returns HTML string for rendering
     */
    generateNarrative(resource: TBundle, timezone: string | undefined): string {
        const templateUtilities = new TemplateUtilities(resource);

        // Start building the HTML structure
        let html = `
      <h5>Laboratory Results</h5>`;

        // Extract laboratory observations
        const labObservations = this.getLaboratoryObservations(resource);

        // Group observations by panel/category
        const groupedObservations = this.groupObservationsByPanel(labObservations);

        if (Object.keys(groupedObservations).length === 0 && labObservations.length === 0) {
            // No laboratory results found
            html += `
      <div class="alert alert-info">No laboratory results recorded</div>`;
        } else {
            // Either we have panel groups or individual observations

            // First render any panel groups
            for (const [panelName, observations] of Object.entries(groupedObservations)) {
                html += this.renderObservationPanel(templateUtilities, panelName, observations, timezone);
            }

            // Render any observations not in panels
            const ungroupedObservations = labObservations.filter(obs =>
                !Object.values(groupedObservations).flat().some(grouped => grouped.id === obs.id)
            );

            if (ungroupedObservations.length > 0) {
                html += this.renderObservationTable(templateUtilities, "Individual Laboratory Tests", ungroupedObservations, timezone);
            }
        }

        return html;
    }

    /**
     * Extract laboratory-related Observation resources from the bundle
     * @param resource - FHIR Bundle
     * @returns Array of laboratory-related Observation resources
     */
    private getLaboratoryObservations(resource: TBundle): Array<TObservation> {
        if (!resource.entry || !Array.isArray(resource.entry)) {
            return [];
        }

        return resource.entry
            .filter(entry => {
                if (entry.resource?.resourceType !== 'Observation') return false;

                const obs = entry.resource as TObservation;

                // Check if this is a laboratory observation
                // Laboratory observations typically have a category with a code of "laboratory"
                // or a LOINC code starting with certain prefixes
                const isLabCategory = obs.category?.some(cat =>
                    cat.coding?.some(code =>
                        code.code === 'laboratory' ||
                        code.system === 'http://terminology.hl7.org/CodeSystem/observation-category' && code.code === 'laboratory'
                    )
                );

                // Also include specific LOINC categories that represent laboratory tests
                const isLabCode = obs.code?.coding?.some(code =>
                    code.system === 'http://loinc.org' &&
                    (code.code?.startsWith('1') || code.code?.startsWith('5') || code.code?.startsWith('6'))
                );

                return isLabCategory || isLabCode;
            })
            .map(entry => entry.resource as TObservation);
    }

    /**
     * Group observations by panel (based on hasMember or derivedFrom relationships)
     * @param observations Array of observations to group
     * @returns Object mapping panel names to arrays of observations
     */
    private groupObservationsByPanel(observations: Array<TObservation>): Record<string, Array<TObservation>> {
        const panelGroups: Record<string, Array<TObservation>> = {};
        const processedIds = new Set<string>();

        // Find potential panel headers (observations that have hasMember references)
        const potentialPanels = observations.filter(obs => obs.hasMember && obs.hasMember.length > 0);

        for (const panel of potentialPanels) {
            if (!panel.id) continue;
            if (processedIds.has(panel.id)) continue;

            // Get the panel name from the code display
            const panelName = panel.code?.coding?.[0]?.display ||
                              panel.code?.text ||
                              'Laboratory Panel';

            const panelMembers: TObservation[] = [];

            // Find related observations through hasMember references
            if (panel.hasMember) {
                for (const memberRef of panel.hasMember) {
                    // Extract the reference ID
                    const refId = memberRef.reference?.split('/').pop();
                    if (!refId) continue;

                    // Find the referenced observation
                    const memberObs = observations.find(obs => obs.id === refId);
                    if (memberObs) {
                        panelMembers.push(memberObs);
                        processedIds.add(refId);
                    }
                }
            }

            // If we found panel members, add this group
            if (panelMembers.length > 0) {
                panelGroups[panelName] = panelMembers;
                processedIds.add(panel.id);
            }
        }

        return panelGroups;
    }

    /**
     * Render a panel of related observations
     * @param templateUtilities Instance of TemplateUtilities
     * @param panelName Name of the panel
     * @param observations Observations in this panel
     * @param timezone Optional timezone for date formatting
     * @returns HTML representation of the panel
     */
    private renderObservationPanel(
        templateUtilities: TemplateUtilities,
        panelName: string,
        observations: Array<TObservation>,
        timezone: string | undefined
    ): string {
        return this.renderObservationTable(templateUtilities, panelName, observations, timezone);
    }

    /**
     * Render a table of observations
     * @param templateUtilities Instance of TemplateUtilities
     * @param tableName Name for the table header
     * @param observations Observations to display in this table
     * @param timezone Optional timezone for date formatting
     * @returns HTML representation of the observations table
     */
    private renderObservationTable(
        templateUtilities: TemplateUtilities,
        tableName: string,
        observations: Array<TObservation>,
        timezone: string | undefined
    ): string {
        let html = `
      <h6>${tableName}</h6>
      <table class="hapiPropertyTable">
        <thead>
          <tr>
            <th>Test</th>
            <th>Result</th>
            <th>Unit</th>
            <th>Reference Range</th>
            <th>Interpretation</th>
            <th>Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>`;

        for (const obs of observations) {
            // Format the test name
            const testName = obs.code?.coding?.[0]?.display ||
                           obs.code?.text ||
                           'Unnamed Test';

            // Format the result value based on its type
            let resultValue = '';
            let unit = '';

            if (obs.valueQuantity) {
                resultValue = obs.valueQuantity.value?.toString() || '';
                unit = obs.valueQuantity.unit || obs.valueQuantity.code || '';
            } else if (obs.valueCodeableConcept) {
                resultValue = templateUtilities.codeableConcept(obs.valueCodeableConcept, 'display');
            } else if (obs.valueString) {
                resultValue = obs.valueString;
            } else if (obs.valueBoolean !== undefined) {
                resultValue = obs.valueBoolean ? 'True' : 'False';
            } else if (obs.valueInteger) {
                resultValue = obs.valueInteger.toString();
            } else if (obs.valueRange) {
                resultValue = templateUtilities.formatRange(obs.valueRange);
            } else if (obs.valueRatio) {
                resultValue = templateUtilities.formatRatio(obs.valueRatio);
            } else if (obs.dataAbsentReason) {
                resultValue = `(${templateUtilities.codeableConcept(obs.dataAbsentReason, 'display')})`;
            }

            // Format reference ranges
            let refRange = '';
            if (obs.referenceRange && obs.referenceRange.length > 0) {
                const ranges = obs.referenceRange.map(range => {
                    let rangeText = '';

                    if (range.low && range.high) {
                        rangeText = `${range.low.value} - ${range.high.value} ${range.high.unit || ''}`;
                    } else if (range.low) {
                        rangeText = `> ${range.low.value} ${range.low.unit || ''}`;
                    } else if (range.high) {
                        rangeText = `< ${range.high.value} ${range.high.unit || ''}`;
                    }

                    // Add type if present (e.g., "normal" range)
                    if (range.type) {
                        rangeText += ` (${templateUtilities.codeableConcept(range.type, 'display')})`;
                    }

                    return rangeText;
                }).filter(range => range.length > 0);

                refRange = ranges.join('<br>');
            }

            // Format interpretation (e.g., H, L, N)
            const interpretation = obs.interpretation && obs.interpretation.length > 0
                ? templateUtilities.codeableConcept(obs.interpretation[0], 'display')
                : '';

            // Format date - prefer effective date, fall back to issued date
            let obsDate = '';
            if (obs.effectiveDateTime) {
                obsDate = templateUtilities.renderTime(obs.effectiveDateTime, timezone);
            } else if (obs.effectivePeriod) {
                obsDate = templateUtilities.renderPeriod(obs.effectivePeriod, timezone);
            } else if (obs.issued) {
                obsDate = templateUtilities.renderTime(obs.issued, timezone);
            }

            // Status (e.g., final, preliminary)
            const status = obs.status || '';

            html += `
          <tr id="${templateUtilities.narrativeLinkId(obs)}">
            <td>${testName}</td>
            <td>${resultValue}</td>
            <td>${unit}</td>
            <td>${refRange}</td>
            <td>${interpretation}</td>
            <td>${obsDate}</td>
            <td>${status}</td>
          </tr>`;
        }

        html += `
        </tbody>
      </table>`;

        return html;
    }
}
