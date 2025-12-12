const http = require('https');
const fs = require('fs');
const path = require('path');

// Set Patient ID and Bearer Token here
const PATIENT_ID = 'person.c9ab6abe-ae18-4226-b60f-99cfacff7171';
const BEARER_TOKEN = 'foo';

const options = {
  method: 'POST',
  hostname: 'fhir.prod.icanbwell.com',
  port: null,
  path: `/4_0_0/Patient/${PATIENT_ID}/$graph`,
  headers: {
    'content-type': 'application/fhir+json',
    authorization: `Bearer ${BEARER_TOKEN}`
  }
};

const req = http.request(options, function (res) {
  const chunks = [];

  res.on('data', function (chunk) {
    chunks.push(chunk);
  });

  res.on('end', function () {
    const body = Buffer.concat(chunks);
    const outputDir = path.join(__dirname, 'fixtures', 'production');
    const outputPath = path.join(outputDir, 'bundle.json');
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outputPath, body);
    console.log(`Bundle saved to ${outputPath}`);
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
