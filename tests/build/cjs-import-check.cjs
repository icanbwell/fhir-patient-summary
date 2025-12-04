// This script checks if the CommonJS build can be imported successfully.
// It should be run after the build step.

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, no-undef
  const pkg = require('../../dist/index.js');
  if (!pkg || typeof pkg !== 'object') {
     
    throw new Error('CommonJS import did not return an object');
  }
  if (typeof pkg.ComprehensiveIPSCompositionBuilder !== 'function') {
     
    throw new Error('ComprehensiveIPSCompositionBuilder is not exported or not a constructor');
  }
  const builder = new pkg.ComprehensiveIPSCompositionBuilder();
  if (!builder) {
     
    throw new Error('Failed to instantiate ComprehensiveIPSCompositionBuilder');
  }
  // eslint-disable-next-line no-undef
  console.log('CommonJS import check passed, ComprehensiveIPSCompositionBuilder is available.');
  // eslint-disable-next-line no-undef
  process.exit(0);
} catch (err) {
  // eslint-disable-next-line no-undef
  console.error('CommonJS import check failed:', err);
  // eslint-disable-next-line no-undef
  process.exit(1);
}
