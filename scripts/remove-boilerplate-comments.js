#!/usr/bin/env node

/**
 * Remove Boilerplate Comments Script
 *
 * This script removes all boilerplate comments and code blocks from the codebase.
 * Run this after implementing the features you need for your project.
 *
 * Usage:
 *   npm run remove:boilerplate
 *   or
 *   node scripts/remove-boilerplate-comments.js
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const EXTENSIONS = ['.ts', '.js', '.json', '.md'];

// Files to skip (don't modify these)
const SKIP_FILES = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  'scripts/remove-boilerplate-comments.js', // Don't modify this script itself
];

function shouldProcessFile(filePath) {
  // Skip directories
  if (SKIP_FILES.some(skip => filePath.includes(skip))) {
    return false;
  }

  // Check if file has one of the extensions we want to process
  return EXTENSIONS.some(ext => filePath.endsWith(ext));
}

function removeBoilerplateComments(content) {
  const lines = content.split('\n');
  const result = [];
  let skipBlock = false;
  let skipCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check if this line starts a boilerplate block
    if (trimmed.startsWith('// BOILERPLATE:')) {
      skipBlock = true;
      skipCount++;
      continue;
    }

    // If we're in a skip block, keep skipping until we find the end
    if (skipBlock) {
      // Look for the end of the block (next non-empty, non-comment line or matching brace)
      if (trimmed === '' || trimmed.startsWith('//') || trimmed.startsWith('/*')) {
        continue;
      }
      // If we find a line that doesn't start with comment, stop skipping
      skipBlock = false;
    }

    // Add the line if we're not skipping
    if (!skipBlock) {
      result.push(line);
    }
  }

  // Remove any trailing empty lines
  while (result.length > 0 && result[result.length - 1].trim() === '') {
    result.pop();
  }

  return result.join('\n');
}

function processDirectory(dirPath) {
  const items = fs.readdirSync(dirPath);

  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Recursively process subdirectories
      processDirectory(fullPath);
    } else if (stat.isFile() && shouldProcessFile(fullPath)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const processed = removeBoilerplateComments(content);

        // Only write if content changed
        if (processed !== content) {
          fs.writeFileSync(fullPath, processed, 'utf8');
          console.log(`✅ Processed: ${path.relative(ROOT_DIR, fullPath)}`);
        }
      } catch (error) {
        console.error(`❌ Error processing ${fullPath}:`, error.message);
      }
    }
  }
}

function main() {
  console.log('🧹 Removing boilerplate comments from codebase...\n');

  try {
    processDirectory(ROOT_DIR);
    console.log('\n✅ Boilerplate comments removal completed!');
    console.log('ℹ️  Your codebase is now ready for implementation.');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { removeBoilerplateComments };
