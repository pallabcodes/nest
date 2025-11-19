#!/usr/bin/env node

/**
 * Module Drop Script
 *
 * Removes a generated module and all its files.
 * Use with caution - this will delete the entire module directory!
 *
 * Usage:
 *   node scripts/drop-module.js <ModuleName>
 *   npm run drop:module <ModuleName>
 *
 * Example:
 *   npm run drop:module Product
 */

const fs = require('fs');
const path = require('path');

// Get module name from command line
const moduleName = process.argv[2];

if (!moduleName) {
  console.error('❌ Error: Module name is required');
  console.log('Usage: npm run drop:module <ModuleName>');
  console.log('Example: npm run drop:module Product');
  process.exit(1);
}

// Validate module name (PascalCase)
if (!/^[A-Z][a-zA-Z0-9]*$/.test(moduleName)) {
  console.error('❌ Error: Module name must be in PascalCase (e.g., Product, UserProfile)');
  process.exit(1);
}

const moduleNameLower = moduleName.charAt(0).toLowerCase() + moduleName.slice(1);
const modulePath = path.join(__dirname, '..', 'src', 'modules', moduleNameLower);

// Check if module exists
if (!fs.existsSync(modulePath)) {
  console.error(`❌ Error: Module "${moduleNameLower}" does not exist at ${modulePath}`);
  process.exit(1);
}

// Confirm deletion
console.log(`⚠️  WARNING: This will delete the entire module: ${modulePath}`);
console.log('Press Ctrl+C to cancel, or wait 3 seconds to continue...');

// Wait 3 seconds
setTimeout(() => {
  try {
    // Remove directory recursively
    fs.rmSync(modulePath, { recursive: true, force: true });
    console.log(`✅ Deleted module: ${modulePath}`);
    console.log('\n📝 Note: You may need to manually:');
    console.log(`   - Remove ProductModule import from app.module.ts`);
    console.log(`   - Remove Product model from models/index.ts (if added)`);
    console.log(`   - Drop migration: npm run db:migrate:undo`);
  } catch (error) {
    console.error(`❌ Error deleting module: ${error.message}`);
    process.exit(1);
  }
}, 3000);

