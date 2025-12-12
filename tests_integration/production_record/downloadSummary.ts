import path from 'path';
import {fileURLToPath} from 'url';
import dotenv from 'dotenv';
import https from 'https';
import http from 'http';
import fs from 'fs';
import graphDefinition from './graphDefinition.json' assert { type: 'json' };
logWithTimestamp('INFO', `Loaded GraphDefinition from ./graphDefinition.json`);

function logWithTimestamp(level: 'INFO' | 'ERROR', ...args: any[]) {
  const ts = new Date().toISOString();
  if (level === 'ERROR') {
    console.error(`[${ts}] [${level}]`, ...args);
  } else {
    console.log(`[${ts}] [${level}]`, ...args);
  }
}

logWithTimestamp('INFO', 'Starting downloadSummary.ts');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
logWithTimestamp('INFO', 'Loading environment variables from .env.local');
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

// Remove old fs.readFileSync/JSON.parse block

// Set Patient ID and Bearer Token here
const PERSON_ID: string | undefined = process.env.PERSON_ID;
// PERSON_ID should be set in .env.local or environment
const BEARER_TOKEN: string | undefined = process.env.BEARER_TOKEN;

if (!PERSON_ID) {
  logWithTimestamp('ERROR', 'PERSON_ID is not set in .env.local');
  throw new Error('PERSON_ID is not set in .env.local');
}
if (!BEARER_TOKEN) {
  logWithTimestamp('ERROR', 'BEARER_TOKEN is not set in .env.local');
  throw new Error('BEARER_TOKEN is not set in .env.local');
}

const options: https.RequestOptions = {
  method: 'POST',
  hostname: 'fhir.prod.icanbwell.com',
  port: undefined,
  path: `/4_0_0/Patient/person.${PERSON_ID}/$graph`,
  headers: {
    'content-type': 'application/fhir+json',
    authorization: `Bearer ${BEARER_TOKEN}`,
    prefer: 'global_id=true'
  }
};

logWithTimestamp('INFO', `Sending POST request to https://${options.hostname}${options.path}`);
logWithTimestamp('INFO', `Using PATIENT_ID: person.${PERSON_ID}`);

const req = https.request(options, function (res: http.IncomingMessage) {
  logWithTimestamp('INFO', `Received response with status code: ${res.statusCode}`);
  logWithTimestamp('INFO', 'Response headers:', res.headers);
  // Check for 401 Unauthorized
  if (res.statusCode === 401) {
    let errorData = '';
    res.on('data', (chunk: Buffer) => {
      errorData += chunk.toString();
    });
    res.on('end', () => {
      logWithTimestamp('ERROR', `Received 401 Unauthorized from server. Response: ${errorData}`);
      throw new Error(`Received 401 Unauthorized from server. Response: ${errorData}`);
    });
    return;
  }
  // Raise error for any non-2xx status code
  if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
    let errorData = '';
    res.on('data', (chunk: Buffer) => {
      errorData += chunk.toString();
    });
    res.on('end', () => {
      logWithTimestamp('ERROR', `Received error status code ${res.statusCode} from server. Response: ${errorData}`);
      throw new Error(`Received error status code ${res.statusCode} from server. Response: ${errorData}`);
    });
    return;
  }
  // Check if transfer-encoding is chunked
  const isChunked = res.headers['transfer-encoding'] && res.headers['transfer-encoding'].toLowerCase().includes('chunked');
  const chunks: Buffer[] = [];
  let chunkCount = 0;
  let totalLength = 0;
  res.on('data', function (chunk: Buffer) {
    chunkCount++;
    totalLength += chunk.length;
    chunks.push(chunk);
    if (isChunked) {
      // Format numbers with commas for easy reading
      const chunkNumStr = chunkCount.toLocaleString();
      const chunkLenStr = chunk.length.toLocaleString();
      const totalLenStr = totalLength.toLocaleString();
      logWithTimestamp('INFO', `Chunk #${chunkNumStr}: length=${chunkLenStr}, total received=${totalLenStr}`);
    } else {
      // For non-chunked, log progress every 1MB
      if (totalLength % (1024 * 1024) < chunk.length) {
        const totalLenStr = totalLength.toLocaleString();
        logWithTimestamp('INFO', `Downloaded ${totalLenStr} bytes so far...`);
      }
    }
  });

  res.on('end', function () {
    logWithTimestamp('INFO', 'Response fully received. Writing to file...');
    const body = Buffer.concat(chunks);
    const bodyText = body.toString('utf8');
    if (bodyText.includes('OperationOutcome')) {
      logWithTimestamp('ERROR', 'Received OperationOutcome from server (detected in text):', bodyText);
      throw new Error('Received OperationOutcome from server: ' + bodyText);
    }
    let parsed: any;
    try {
      parsed = JSON.parse(bodyText);
    } catch (e) {
      logWithTimestamp('ERROR', 'Failed to parse response as JSON:', e);
      throw new Error('Failed to parse response as JSON');
    }
    // Check for OperationOutcome at top level or nested in entry[]
    let operationOutcome: any = null;
    if (parsed && parsed.resourceType === 'OperationOutcome') {
      operationOutcome = parsed;
    } else if (Array.isArray(parsed?.entry)) {
      for (const entry of parsed.entry) {
        if (entry?.resource?.resourceType === 'OperationOutcome') {
          operationOutcome = entry.resource;
          break;
        }
      }
    }
    if (operationOutcome) {
      logWithTimestamp('ERROR', 'Received OperationOutcome from server:', JSON.stringify(operationOutcome, null, 2));
      throw new Error('Received OperationOutcome from server: ' + JSON.stringify(operationOutcome));
    }
    const outputDir = path.join(__dirname, 'fixtures', 'production');
    const outputPath = path.join(outputDir, 'bundle.json');
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outputPath, body);
    logWithTimestamp('INFO', `\nBundle saved to ${outputPath}`);
    logWithTimestamp('INFO', `Total bytes written: ${body.length.toLocaleString()}`);
  });
});

req.on('error', (err) => {
  logWithTimestamp('ERROR', 'Request failed:', err);
});

logWithTimestamp('INFO', 'Writing GraphDefinition body and sending request...');
req.write(JSON.stringify(graphDefinition));
logWithTimestamp('INFO', 'Request sent. Waiting for response...');
req.end();
