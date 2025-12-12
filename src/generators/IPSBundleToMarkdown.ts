// Minimal FHIR interfaces for the required fields
interface FhirHumanName {
    family?: string;
    given?: string[];
}

interface FhirResource {
    resourceType: string;
    id?: string;
    name?: FhirHumanName[];
    text?: { div?: string };
    title?: string;
    section?: FhirSection[];
}

interface FhirSection {
    title?: string;
    text?: { div?: string };
}

interface FhirEntry {
    resource?: FhirResource;
}

interface FhirBundle {
    resourceType: 'Bundle';
    entry?: FhirEntry[];
}

// Utility to strip HTML tags from a string
function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Converts a FHIR IPS Bundle to a Markdown string (no React, no DOM APIs).
 * @param bundle - FHIR Bundle JSON
 * @returns Markdown summary
 */
function ipsBundleToMarkdown(bundle: FhirBundle): string {
    if (!bundle || bundle.resourceType !== 'Bundle') {
        throw new Error('Input is not a valid FHIR Bundle');
    }
    // Find the first Composition resource
    const compositionEntry = bundle.entry?.find(
        entry => entry.resource?.resourceType === 'Composition'
    );
    if (!compositionEntry) {
        return '# No Composition resource found in the bundle\n';
    }
    const composition = compositionEntry.resource!;
    let md = '';
    if (composition.title) {
        md += `# ${composition.title}\n\n`;
    } else {
        md += '# Patient Summary\n\n';
    }
    // Add composition narrative if present
    if (composition.text?.div) {
        md += stripHtml(composition.text.div) + '\n\n';
    }
    // Process sections
    const sections = composition.section || [];
    sections.forEach((section, idx) => {
        const title = section.title || `Section ${idx + 1}`;
        md += `\n## ${title}\n`;
        if (section.text?.div) {
            md += stripHtml(section.text.div) + '\n';
        }
    });
    // List all resources by type (excluding Composition)
    const resourcesByType: { [type: string]: FhirResource[] } = {};
    bundle.entry?.forEach(entry => {
        if (entry.resource && entry.resource.resourceType !== 'Composition') {
            const type = entry.resource.resourceType;
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
            if (type === 'Patient' && resource.name) {
                const names = resource.name.map(n =>
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
