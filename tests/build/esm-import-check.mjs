// This script checks if the ESM build can be imported successfully.
// It should be run after the build step.

import('../../dist/index.js')
  .then((pkg) => {
    if (!pkg || typeof pkg !== 'object') {
      throw new Error('ESM import did not return an object');
    }
    if (typeof pkg.ComprehensiveIPSCompositionBuilder !== 'function') {
      throw new Error('ComprehensiveIPSCompositionBuilder is not exported or not a constructor (ESM)');
    }
    const builder = new pkg.ComprehensiveIPSCompositionBuilder();
    if (!builder) {
      throw new Error('Failed to instantiate ComprehensiveIPSCompositionBuilder (ESM)');
    }
    // eslint-disable-next-line no-undef
    console.log('ESM import check passed, ComprehensiveIPSCompositionBuilder is available.');
    // eslint-disable-next-line no-undef
    process.exit(0);
  })
  .catch((err) => {
    // eslint-disable-next-line no-undef
    console.error('ESM import check failed:', err);
    // eslint-disable-next-line no-undef
    process.exit(1);
  });
