// Utility to convert HTML to Markdown
import TurndownService from 'turndown';
import {TBundle} from "../types/resources/Bundle";
import {TComposition} from "../types/resources/Composition";
import {TBundleEntry} from "../types/partials/BundleEntry";
import {TResource} from "../types/resources/Resource";

const turndownService = new TurndownService();
function htmlToMarkdown(html: string): string {
    return turndownService.turndown(html || '');
}

/**
 * Converts a FHIR IPS Bundle to a Markdown string (no React, no DOM APIs).
 * @param bundle - FHIR Bundle JSON
 * @returns Markdown summary
 */
function ipsBundleToMarkdown(bundle: TBundle): string {
    if (!bundle || bundle.resourceType !== 'Bundle') {
        throw new Error('Input is not a valid FHIR Bundle');
    }
    // Find the first Composition resource
    const compositionEntry: TBundleEntry | undefined = bundle.entry?.find(
        entry => entry.resource?.resourceType === 'Composition'
    );
    if (!compositionEntry) {
        return '# No Composition resource found in the bundle\n';
    }
    const composition: TComposition | undefined = compositionEntry.resource! as TComposition;
    let md = '';
    if ((composition as any).title) {
        md += `# ${(composition as any).title}\n\n`;
    } else {
        md += '# Patient Summary\n\n';
    }
    // Add composition narrative if present
    if (composition.text?.div) {
        md += htmlToMarkdown(composition.text.div) + '\n\n';
    }
    // Process sections
    const sections = (composition as any).section || [];
    sections.forEach((section: any, idx: number) => {
        const title = section.title || `Section ${idx + 1}`;
        md += `\n## ${title}\n`;
        if (section.text?.div) {
            md += htmlToMarkdown(section.text.div) + '\n';
        }
    });
    // List all resources by type (excluding Composition)
    const resourcesByType: { [type: string]: TResource[] } = {};
    bundle.entry?.forEach(entry => {
        if (entry.resource && entry.resource.resourceType !== 'Composition') {
            const type: string = entry.resource.resourceType as string;
            if (!resourcesByType[type]) resourcesByType[type] = [];
            resourcesByType[type].push(entry.resource);
        }
    });
    md += '\n---\n\n';
    md += '## Bundle Resources\n';
    Object.keys(resourcesByType).forEach(type => {
        md += `\n### ${type} (${resourcesByType[type].length})\n`;
        resourcesByType[type].forEach(resource => {
            md += `- **${resource.id}**`;
            if (type === 'Patient' && (resource as any).name) {
                const names = (resource as any).name.map((n: any) =>
                    n.family ? `${(n.given || []).join(' ')} ${n.family}` : ''
                ).join(', ');
                if (names) md += ` - ${names}`;
            }
            md += '\n';
        });
    });
    return md;
}

export { ipsBundleToMarkdown };
