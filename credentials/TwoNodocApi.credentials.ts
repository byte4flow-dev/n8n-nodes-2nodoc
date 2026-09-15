import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

// Auth 2nodoc : Bearer token statique (clé API générée depuis le tableau de bord 2nodoc).
// Confirmé sur la spec OpenAPI publique (https://api.2nodoc.com/openapi.json) : security
// scheme "BearerAuth" (HTTP Bearer), à envoyer dans le header Authorization sur tous les
// endpoints /api/public/*. Pas d'échange de identifiants/mot de passe côté API publique.
export class TwoNodocApi implements ICredentialType {
	name = 'twoNodocApi';

	displayName = '2nodoc API';

	documentationUrl = 'https://api.2nodoc.com/docs';

	properties: INodeProperties[] = [
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Jeton d\'API généré depuis le tableau de bord 2nodoc (Paramètres > API). Envoyé en tant que Bearer token.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.2nodoc.com',
			required: true,
			description: 'URL de base de l\'API 2nodoc (à modifier uniquement pour un environnement de test dédié)',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/public/clients',
			method: 'GET',
			qs: {
				limit: 1,
			},
		},
	};
}
