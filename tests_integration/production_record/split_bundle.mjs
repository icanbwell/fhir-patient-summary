// eslint-env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const bundlePath = path.resolve(__dirname, 'fixtures/production/bundle.json');
const outputBase = path.resolve(__dirname, 'fixtures/production');

console.log('Resolved bundlePath:', bundlePath);
console.log('Resolved outputBase:', outputBase);

let processedCount = 0;
let errorCount = 0;

try {
  const json = fs.readFileSync(bundlePath, 'utf8');
  const bundle = JSON.parse(json);
  if (!Array.isArray(bundle.entry)) {
    throw new Error('No entry array found in bundle.json');
  }
  if (bundle.entry.length === 0) {
    throw new Error('No entries in bundle.json');
  }
  for (const entry of bundle.entry) {
    if (!entry.resource || !entry.resource.resourceType || !entry.resource.id) {
      errorCount++;
      console.error('Entry missing resourceType or id:', entry);
      continue;
    }
    const resourceType = entry.resource.resourceType;
    const resourceId = entry.resource.id;
    const resourceFolder = path.join(outputBase, resourceType);
    try {
      if (!fs.existsSync(resourceFolder)) {
        fs.mkdirSync(resourceFolder, { recursive: true });
        console.log(`Created folder: ${resourceFolder}`);
      }
      const resourceFile = path.join(resourceFolder, `${resourceId}.json`);
      fs.writeFileSync(resourceFile, JSON.stringify(entry.resource, null, 2));
      console.log(`Wrote ${resourceType}/${resourceId}.json`);
      processedCount++;
    } catch (err) {
      errorCount++;
      console.error(`Error writing ${resourceType}/${resourceId}:`, err);
    }
  }
  console.log(`Resources split successfully. Processed: ${processedCount}, Errors: ${errorCount}`);
} catch (err) {
  console.error('Error:', err);
}
