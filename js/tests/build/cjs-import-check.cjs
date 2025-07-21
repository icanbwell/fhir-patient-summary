// This script checks if the CommonJS build can be imported successfully.
// It should be run after the build step.

try {
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
  console.log('CommonJS import check passed, ComprehensiveIPSCompositionBuilder is available.');
  process.exit(0);
} catch (err) {
  console.error('CommonJS import check failed:', err);
  process.exit(1);
}

