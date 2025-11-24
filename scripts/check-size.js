#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, statSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Files to check - core library files (now bundled into index.js)
const coreFiles = [
	'dist/index.js',
  'dist/howler.core.js',
];

// Plugin files (now at root level due to bundling config)
const pluginFiles = [
	'dist/plugins/spatial.js',
];

// All files for total calculation
const files = [...coreFiles, ...pluginFiles];

function formatBytes(bytes) {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function getGzipSize(filePath) {
	try {
		const content = readFileSync(filePath);
		const result = execSync('gzip -c', {
			input: content,
			encoding: null,
			stdio: ['pipe', 'pipe', 'ignore'],
		});
		return result.length;
	} catch (e) {
		// gzip not available or error
		return null;
	}
}

console.log('\n📦 Bundle Sizes:\n');

const sizes = files.map((file) => {
	const fullPath = join(rootDir, file);
	const stats = statSync(fullPath);
	const bytes = stats.size;
	const gzipBytes = getGzipSize(fullPath);

	return {
		file,
		bytes,
		gzipBytes,
	};
});

// Core library files
console.log('  Core Library:');
coreFiles.forEach((file) => {
	const s = sizes.find((size) => size.file === file);
	if (s) {
		const gzipInfo = s.gzipBytes
			? ` (${formatBytes(s.gzipBytes)} gzipped)`
			: '';
		console.log(
			`    ${s.file.padEnd(33)} ${s.bytes.toString().padStart(8)} bytes (${formatBytes(s.bytes)})${gzipInfo}`,
		);
	}
});

// Plugin files
console.log('\n  Plugins:');
pluginFiles.forEach((file) => {
	const s = sizes.find((size) => size.file === file);
	if (s) {
		const gzipInfo = s.gzipBytes
			? ` (${formatBytes(s.gzipBytes)} gzipped)`
			: '';
		console.log(
			`    ${s.file.padEnd(33)} ${s.bytes.toString().padStart(8)} bytes (${formatBytes(s.bytes)})${gzipInfo}`,
		);
	}
});

// Calculate totals
const coreTotal = coreFiles.reduce((sum, file) => {
	const s = sizes.find((size) => size.file === file);
	return sum + (s ? s.bytes : 0);
}, 0);
const coreTotalGzip = coreFiles.reduce((sum, file) => {
	const s = sizes.find((size) => size.file === file);
	return sum + (s && s.gzipBytes ? s.gzipBytes : 0);
}, 0);

const pluginTotal = pluginFiles.reduce((sum, file) => {
	const s = sizes.find((size) => size.file === file);
	return sum + (s ? s.bytes : 0);
}, 0);
const pluginTotalGzip = pluginFiles.reduce((sum, file) => {
	const s = sizes.find((size) => size.file === file);
	return sum + (s && s.gzipBytes ? s.gzipBytes : 0);
}, 0);

const total = sizes.reduce((a, b) => a + b.bytes, 0);
const totalGzip = sizes.reduce((a, b) => a + (b.gzipBytes || 0), 0);

console.log('\n  Summary:');
console.log(
	`    ${'Core Library Total'.padEnd(33)} ${coreTotal.toString().padStart(8)} bytes (${formatBytes(coreTotal)})${coreTotalGzip > 0 ? ` (${formatBytes(coreTotalGzip)} gzipped)` : ''}`,
);
console.log(
	`    ${'Plugins Total'.padEnd(33)} ${pluginTotal.toString().padStart(8)} bytes (${formatBytes(pluginTotal)})${pluginTotalGzip > 0 ? ` (${formatBytes(pluginTotalGzip)} gzipped)` : ''}`,
);
console.log(
	`    ${'Grand Total'.padEnd(33)} ${total.toString().padStart(8)} bytes (${formatBytes(total)})${totalGzip > 0 ? ` (${formatBytes(totalGzip)} gzipped)` : ''}\n`,
);

