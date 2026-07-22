/** Re-exports worker data build — run after build-dictionary */
import './build-dictionary.js';
console.log('Worker data synced via build-dictionary (worker/data/*.json)');
