import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';
import type { Icon } from 'n8n-workflow';

// 2nodoc auth: static Bearer token (API key generated from the 2nodoc dashboard).
// Confirmed against the public OpenAPI spec (https://api.2nodoc.com/openapi.json): security
// scheme "BearerAuth" (HTTP Bearer), sent in the Authorization header on all
// /api/public/* endpoints. No username/password exchange on the public API.
export class TwoNodocApi implements ICredentialType {
	name = 'twoNodocApi';

	displayName = '2nodoc API';

	icon: Icon = { light: 'file:twonodoc.svg', dark: 'file:twonodoc.svg' };

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
				'API token generated from the 2nodoc dashboard (Settings > API). Requires a 2nodoc Team account with completed KYC verification — sign up at 2nodoc.com/register. Sent as a Bearer token.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.2nodoc.com',
			required: true,
			description: 'Base URL of the 2nodoc API (change only for a dedicated test environment)',
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
