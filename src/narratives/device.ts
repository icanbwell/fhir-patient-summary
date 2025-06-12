import {IpsNarrativeGenerator} from "./ipsNarrativeGenerator";
import {TDevice} from "../types/resources/Device";


export class DeviceNarrativeGenerator extends IpsNarrativeGenerator<TDevice> {
    generateNarrative(): string {
        let deviceName = '';
        if (this.resource.deviceName && this.resource.deviceName.length > 0) {
            deviceName = this.resource.deviceName[0].name || '';
        }
        const deviceType = this.utility.getCodeableConceptDisplay(this.resource.type);
        const headerText = deviceName || deviceType || 'Device';

        let html = `<div xmlns="http://www.w3.org/1999/xhtml">
      <div class="hapiHeaderText">${headerText}</div>
      <table class="hapiPropertyTable">`;

        html += `<tr><td>Status</td><td>${this.resource.status || ''}</td></tr>`;

        if (this.resource.type && !deviceName) {
            html += `<tr><td>Type</td><td>${deviceType}</td></tr>`;
        }

        if (this.resource.manufacturer) {
            html += `<tr><td>Manufacturer</td><td>${this.resource.manufacturer}</td></tr>`;
        }

        if (this.resource.modelNumber) {
            html += `<tr><td>Model</td><td>${this.resource.modelNumber}</td></tr>`;
        }

        if (this.resource.partNumber) {
            html += `<tr><td>Part Number</td><td>${this.resource.partNumber}</td></tr>`;
        }

        if (this.resource.serialNumber) {
            html += `<tr><td>Serial Number</td><td>${this.resource.serialNumber}</td></tr>`;
        }

        if (this.resource.lotNumber) {
            html += `<tr><td>Lot Number</td><td>${this.resource.lotNumber}</td></tr>`;
        }

        if (this.resource.manufactureDate) {
            html += `<tr><td>Manufacture Date</td><td>${this.utility.formatDate(this.resource.manufactureDate)}</td></tr>`;
        }

        if (this.resource.expirationDate) {
            html += `<tr><td>Expiration Date</td><td>${this.utility.formatDate(this.resource.expirationDate)}</td></tr>`;
        }

        html += `</table></div>`;
        return html;
    }
}