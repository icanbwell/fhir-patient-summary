// ProblemListTemplate.ts - TypeScript replacement for Jinja2 problemlist.j2
import {TemplateUtilities} from './TemplateUtilities';
import {TBundle} from '../../../types/resources/Bundle';
import {TCondition} from '../../../types/resources/Condition';
import {ITemplate} from './interfaces/ITemplate';

/**
 * Class to generate HTML narrative for Problem List (Condition resources)
 * This replaces the Jinja2 problemlist.j2 template
 */
export class ProblemListTemplate implements ITemplate {
  /**
   * Generate HTML narrative for Problem List
   * @param resource - FHIR Bundle containing Condition resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  generateNarrative(resource: TBundle, timezone?: string): string {
    return ProblemListTemplate.generateStaticNarrative(resource, timezone);
  }

  /**
   * Internal static implementation that actually generates the narrative
   * @param resource - FHIR Bundle containing Condition resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  private static generateStaticNarrative(resource: TBundle, timezone?: string): string {
    const templateUtilities = new TemplateUtilities(resource);

    // Start building the HTML
    let html = `<div xmlns="http://www.w3.org/1999/xhtml">`;

    // Split conditions into active and resolved
    const activeConditions: TCondition[] = [];
    const resolvedConditions: TCondition[] = [];

    if (resource.entry && Array.isArray(resource.entry)) {
      // Loop through entries in the bundle
      for (const entry of resource.entry) {
        const cond = entry.resource as TCondition;

        // Skip composition resources
        if (cond.resourceType === 'Composition') {
          continue;
        }

        // Determine if condition is active or resolved
        const isResolved = cond.clinicalStatus?.coding?.some(c =>
          c.code === 'resolved' || c.code === 'inactive' || c.display?.toLowerCase().includes('resolved'));

        if (isResolved) {
          resolvedConditions.push(cond);
        } else {
          activeConditions.push(cond);
        }
      }
    }

    // Generate active problems section
    if (activeConditions.length > 0) {
      html += `<div class="ActiveProblems">
        <h3>Active Problems</h3>
        <table class="ActiveProblemTable">
          <thead>
            <tr>
              <th>Problem</th>
              <th>Priority</th>
              <th>Noted Date</th>
              <th>Diagnosed Date</th>
            </tr>
          </thead>
          <tbody>`;

      for (const cond of activeConditions) {
        html += `<tr id="${(templateUtilities.narrativeLinkId(cond))}">
          <td class="Name">
            <span class="ProblemName">${templateUtilities.codeableConcept(cond.code)}</span>
            ${this.formatNotes(templateUtilities,  cond, timezone)}
          </td>
          <td class="Priority">${(templateUtilities.codeableConcept(cond.severity))}</td>
          <td class="NotedDate">${(templateUtilities.renderDate(cond.onsetDateTime))}</td>
          <td class="DiagnosedDate">${(templateUtilities.renderDate(cond.recordedDate))}</td>
        </tr>`;
      }

      html += `</tbody>
        </table>
      </div>`;
    }

    // Add a break between sections
    if (activeConditions.length > 0 && resolvedConditions.length > 0) {
      html += `<br />`;
    }

    // Generate resolved problems section
    if (resolvedConditions.length > 0) {
      html += `<div class="ResolvedProblems">
        <h3>Resolved Problems</h3>
        <table class="ResolvedProblemTable">
          <thead>
            <tr>
              <th>Problem</th>
              <th>Priority</th>
              <th>Noted Date</th>
              <th>Diagnosed Date</th>
              <th>Resolved Date</th>
            </tr>
          </thead>
          <tbody>`;

      for (const cond of resolvedConditions) {
        html += `<tr id="${(templateUtilities.narrativeLinkId(cond))}">
          <td class="Name">
            <span class="ProblemName">${templateUtilities.codeableConcept(cond.code)}</span>
            ${this.formatNotes(templateUtilities, cond, timezone)}
          </td>
          <td class="Priority">${(templateUtilities.codeableConcept(cond.severity))}</td>
          <td class="NotedDate">${(templateUtilities.renderDate(cond.onsetDateTime))}</td>
          <td class="DiagnosedDate">${(templateUtilities.renderDate(cond.recordedDate))}</td>
          <td class="ResolvedDate">${(templateUtilities.renderDate(cond.abatementDateTime))}</td>
        </tr>`;
      }

      html += `</tbody>
        </table>
      </div>`;
    }

    // Close the HTML
    html += `</div>`;

    return html;
  }

  /**
   * Format notes with detailed styling to match sample output
   * @param templateUtilities - Instance of TemplateUtilities for rendering
   * @param condition - The condition resource containing notes
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for formatted notes
   */
  private static formatNotes(templateUtilities: TemplateUtilities, condition: TCondition, timezone?: string): string {
    if (!condition.note || !Array.isArray(condition.note) || condition.note.length === 0) {
      return '';
    }

    let noteHtml = '<ul>';

    for (const note of condition.note) {
      if (note.text) {
        const noteType = note.authorString || 'Overview';

        noteHtml += `<li class="Note">
          <span class="NoteTitle">${noteType} (${templateUtilities.renderTime(note.time, timezone)}):</span><br />
          <span class="WarningMsg"><em>Formatting of this note might be different from the original.</em></span><br />
          <span class="NoteText">${note.text}<br /></span>
        </li>`;
      }
    }

    noteHtml += '</ul>';
    return noteHtml;
  }
}
