// ...existing code...
import path from 'path';
import dotenv from 'dotenv';
import https from 'https';
import http from 'http';
import fs from 'fs';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

// Set Patient ID and Bearer Token here
const PATIENT_ID = 'person.c9ab6abe-ae18-4226-b60f-99cfacff7171';
const BEARER_TOKEN: string | undefined = process.env.BEARER_TOKEN;

if (!BEARER_TOKEN) {
  throw new Error('BEARER_TOKEN is not set in .env.local');
}

const options: https.RequestOptions = {
  method: 'POST',
  hostname: 'fhir.prod.icanbwell.com',
  port: undefined,
  path: `/4_0_0/Patient/${PATIENT_ID}/$graph`,
  headers: {
    'content-type': 'application/fhir+json',
    authorization: `Bearer ${BEARER_TOKEN}`
  }
};

const req = https.request(options, function (res: http.IncomingMessage) {
  // Check if transfer-encoding is chunked
  const isChunked = res.headers['transfer-encoding'] && res.headers['transfer-encoding'].toLowerCase().includes('chunked');
  const chunks: Buffer[] = [];

  res.on('data', function (chunk: Buffer) {
    // For chunked transfer, each chunk is processed as it arrives
    chunks.push(chunk);
    if (isChunked) {
      process.stdout.write(chunk); // Optionally stream to stdout as it arrives
    }
  });

  res.on('end', function () {
    const body = Buffer.concat(chunks);
    const outputDir = path.join(__dirname, 'fixtures', 'production');
    const outputPath = path.join(outputDir, 'bundle.json');
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outputPath, body);
    console.log(`\nBundle saved to ${outputPath}`);
  });
});

req.write(JSON.stringify({
  resourceType: 'GraphDefinition',
  id: 'o',
  name: 'patient_everything',
  status: 'active',
  start: 'Patient',
  link: [
    {target: [{type: 'AllergyIntolerance', params: 'patient={ref}'}]},
    {target: [{type: 'CarePlan', params: 'patient={ref}'}]},
    {target: [{type: 'ClinicalImpression', params: 'patient={ref}'}]},
    {target: [{type: 'Composition', params: 'patient={ref}'}]},
    {target: [{type: 'Condition', params: 'patient={ref}'}]},
    {target: [{type: 'Consent', params: 'patient={ref}'}]},
    {target: [{type: 'Device', params: 'patient={ref}'}]},
    {
      target: [
        {
          type: 'DeviceUseStatement',
          params: 'patient={ref}',
          link: [{path: 'device', target: [{type: 'Device'}]}]
        }
      ]
    },
    {target: [{type: 'DiagnosticReport', params: 'patient={ref}'}]},
    {
      target: [
        {
          type: 'Immunization',
          params: 'patient={ref}',
          link: [{path: 'manufacturer', target: [{type: 'Organization'}]}]
        }
      ]
    },
    {target: [{type: 'MedicationDispense', params: 'patient={ref}'}]},
    {
      target: [
        {
          type: 'MedicationRequest',
          params: 'patient={ref}',
          link: [{path: 'medicationReference', target: [{type: 'Medication'}]}]
        }
      ]
    },
    {
      target: [
        {
          type: 'MedicationStatement',
          params: 'patient={ref}',
          link: [{path: 'medicationReference', target: [{type: 'Medication'}]}]
        }
      ]
    },
    {target: [{type: 'Observation', params: 'patient={ref}'}]},
    {target: [{type: 'Patient', params: 'link={ref}'}]},
    {
      target: [
        {
          type: 'Person',
          params: 'patient={ref}',
          link: [{target: [{type: 'Person', params: 'link={ref}'}]}]
        }
      ]
    },
    {target: [{type: 'Procedure', params: 'patient={ref}'}]}
  ]
}));
req.end();
