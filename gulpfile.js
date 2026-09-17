const { src, dest, parallel } = require('gulp');

function buildNodeIcons() {
	return src('nodes/**/*.{png,svg}').pipe(dest('dist/nodes'));
}

function buildCredentialIcons() {
	return src('credentials/**/*.{png,svg}').pipe(dest('dist/credentials'));
}

// Codex files (node.json) are not TypeScript, so tsc never emits them — they must be copied
// into dist manually, next to the compiled .node.js they describe. Required for the node to be
// discoverable via alias search (e.g. "invoice", "billing") in the n8n node panel / registry.
function buildNodeCodex() {
	return src('nodes/**/*.node.json').pipe(dest('dist/nodes'));
}

exports['build:icons'] = parallel(buildNodeIcons, buildCredentialIcons, buildNodeCodex);