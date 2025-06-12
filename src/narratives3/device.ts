import {BaseNarrativeGenerator} from "./baseNarrative";
import {TDevice} from "../types/resources/Device";

export class DeviceNarrativeGenerator implements BaseNarrativeGenerator<TDevice> {
    generateNarrative(devices: TDevice[]): string {
        return devices.map(device => {
            const deviceName = device.type?.text || 'Unknown';
            const manufacturer = device.manufacturer || 'Not specified';
            const modelNumber = device.modelNumber || 'Not specified';

            return `
            <h2>Medical Device</h2>
            <table>
                <tbody>
                    <tr>
                        <th>Device Type</th>
                        <td>${deviceName}</td>
                    </tr>
                    <tr>
                        <th>Manufacturer</th>
                        <td>${manufacturer}</td>
                    </tr>
                    <tr>
                        <th>Model Number</th>
                        <td>${modelNumber}</td>
                    </tr>
                </tbody>
            </table>
            `;
        }).join('<br />');
    }
}

