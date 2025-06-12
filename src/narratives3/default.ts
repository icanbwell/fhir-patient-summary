import {TDomainResource} from "../types/resources/DomainResource";
import {BaseNarrativeGenerator} from "./baseNarrative";

export class DefaultNarrativeGenerator implements BaseNarrativeGenerator<TDomainResource> {
    generateNarrative(resources: TDomainResource[]): string {
        return resources.map(resource => {
            const resourceType = resource.resourceType || 'Unknown Resource Type';
            const id = resource.id || 'No ID';

            return `
            <h2>${resourceType}</h2>
            <table>
                <tbody>
                    <tr>
                        <th>ID</th>
                        <td>${id}</td>
                    </tr>
                </tbody>
            </table>
            `;
        }).join('<br />');
    }
}