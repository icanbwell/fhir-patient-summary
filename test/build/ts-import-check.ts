// This script checks if the TypeScript build can be imported and used successfully.
// It should be run after the build step.

import { ComprehensiveIPSCompositionBuilder } from '../../dist/index.js';

function main() {
  if (typeof ComprehensiveIPSCompositionBuilder !== 'function') {
    throw new Error('ComprehensiveIPSCompositionBuilder is not exported or not a constructor (TS)');
  }
  const builder = new ComprehensiveIPSCompositionBuilder();
  if (!builder) {
    throw new Error('Failed to instantiate ComprehensiveIPSCompositionBuilder (TS)');
  }
  console.log('TypeScript import check passed, ComprehensiveIPSCompositionBuilder is available.');
}

main();
