module.exports = {
	root: true,
	parser: '@typescript-eslint/parser',
	parserOptions: {
		project: ['./tsconfig.json'],
		sourceType: 'module',
		extraFileExtensions: ['.json'],
	},
	extends: ['plugin:n8n-nodes-base/community'],
	rules: {
		'n8n-nodes-base/node-param-description-missing-final-period': 'off',
	},
};
