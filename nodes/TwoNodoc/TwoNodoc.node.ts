import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

/**
 * n8n community node for the public 2nodoc API (French/Belgian RFE e-invoicing).
 *
 * Endpoints and schemas are based on the public OpenAPI spec https://api.2nodoc.com/openapi.json
 * (checked on 13/09/2026). v0.1 (MVP) scope: Invoices, Clients, E-Invoices (RFE/PA-PDP).
 * Not covered yet (to add in a v0.2 following the same pattern): Products, Team Users,
 * purchase invoice from OCR (POST /api/public/invoices/buy).
 */
export class TwoNodoc implements INodeType {
	description: INodeTypeDescription = {
		displayName: '2nodoc',
		name: 'twoNodoc',
		icon: { light: 'file:twonodoc.svg', dark: 'file:twonodoc.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description: 'Manage invoices, clients, and RFE e-invoicing via the 2nodoc API',
		usableAsTool: true,
		defaults: {
			name: '2nodoc',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'twoNodocApi',
				required: true,
			},
		],
		properties: [
			// ---------------------------------------------------------------
			// Resource
			// ---------------------------------------------------------------
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Invoice', value: 'invoice' },
					{ name: 'Client', value: 'client' },
					{ name: 'E-Invoice (RFE)', value: 'einvoice' },
				],
				default: 'invoice',
			},

			// ---------------------------------------------------------------
			// Invoice operations
			// ---------------------------------------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['invoice'] } },
				options: [
					{
						name: 'Convert Quote to Invoice',
						value: 'convert',
						action: 'Convert a quote into an invoice',
					},
					{ name: 'Create', value: 'create', action: 'Create an invoice or quote' },
					{ name: 'Delete', value: 'delete', action: 'Delete an invoice' },
					{
						name: 'Download Factur-X',
						value: 'downloadFacturx',
						action: 'Download the invoice FACTUR-X file',
					},
					{ name: 'Download PDF', value: 'downloadPdf', action: 'Download the invoice PDF' },
					{ name: 'Get', value: 'get', action: 'Get an invoice' },
					{ name: 'Get Many', value: 'getAll', action: 'Get many invoices' },
					{ name: 'Get Send History', value: 'getSendHistory', action: 'Get the send history' },
					{ name: 'Send by Email', value: 'send', action: 'Send an invoice by email' },
					{ name: 'Update', value: 'update', action: 'Update an invoice or quote' },
					{ name: 'Update Status', value: 'updateStatus', action: 'Update the status of an invoice' },
				],
				default: 'getAll',
			},

			// ---------------------------------------------------------------
			// Client operations
			// ---------------------------------------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['client'] } },
				options: [
					{ name: 'Create', value: 'create', action: 'Create a client' },
					{ name: 'Delete', value: 'delete', action: 'Delete a client' },
					{ name: 'Get', value: 'get', action: 'Get a client' },
					{ name: 'Get Many', value: 'getAll', action: 'Get many clients' },
					{ name: 'Update', value: 'update', action: 'Update a client' },
				],
				default: 'getAll',
			},

			// ---------------------------------------------------------------
			// E-invoice (RFE/PA-PDP) operations
			// ---------------------------------------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['einvoice'] } },
				options: [
					{ name: 'Accept', value: 'accept', action: 'Accept a received electronic invoice' },
					{ name: 'Connected Company', value: 'company', action: 'Get the connected company' },
					{ name: 'Connection Status', value: 'status', action: 'Check the RFE connection status' },
					{ name: 'Get', value: 'get', action: 'Get an electronic invoice' },
					{ name: 'Get Many', value: 'getAll', action: 'Get many electronic invoices' },
					{
						name: 'Initiate Payment',
						value: 'initiatePayment',
						action: 'Initiate payment for an electronic invoice',
					},
					{
						name: 'Open Dispute',
						value: 'dispute',
						action: 'Open a dispute on an electronic invoice',
					},
					{ name: 'Reject', value: 'reject', action: 'Reject a received electronic invoice' },
				],
				default: 'getAll',
			},

			// ---------------------------------------------------------------
			// Shared: ID fields
			// ---------------------------------------------------------------
			{
				displayName: 'Invoice ID',
				name: 'invoiceId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['invoice'],
						operation: [
							'get',
							'update',
							'delete',
							'updateStatus',
							'convert',
							'send',
							'getSendHistory',
							'downloadPdf',
							'downloadFacturx',
						],
					},
				},
			},
			{
				displayName: 'Client ID',
				name: 'clientId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: { resource: ['client'], operation: ['get', 'update', 'delete'] },
				},
			},
			{
				displayName: 'E-Invoice ID',
				name: 'einvoiceId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['einvoice'],
						operation: ['get', 'accept', 'reject', 'dispute', 'initiatePayment'],
					},
				},
			},

			// ---------------------------------------------------------------
			// Invoice: create
			// ---------------------------------------------------------------
			{
				displayName: 'Client ID',
				name: 'clientId',
				type: 'string',
				default: '',
				required: true,
				description: 'Recipient client (client_id)',
				displayOptions: { show: { resource: ['invoice'], operation: ['create'] } },
			},
			{
				displayName: 'Document Type',
				name: 'invoiceType',
				type: 'options',
				default: 'invoice',
				required: true,
				options: [
					{ name: 'Invoice', value: 'invoice' },
					{ name: 'Quote', value: 'quote' },
					{ name: 'Purchase Invoice', value: 'buy' },
					{ name: 'Credit Note', value: 'credit_note' },
				],
				displayOptions: { show: { resource: ['invoice'], operation: ['create'] } },
			},
			{
				displayName: 'Invoice Date',
				name: 'invoiceDate',
				type: 'dateTime',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['invoice'], operation: ['create'] } },
			},
			{
				displayName: 'Lines',
				name: 'lines',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				default: {},
				required: true,
				placeholder: 'Add a Line',
				displayOptions: { show: { resource: ['invoice'], operation: ['create'] } },
				options: [
					{
						displayName: 'Line',
						name: 'line',
						values: [
							{ displayName: 'Description', name: 'description', type: 'string', default: '' },
							{ displayName: 'Number', name: 'number', type: 'number', default: 1 },
							{ displayName: 'Quantity', name: 'quantity', type: 'number', default: 1 },
							{ displayName: 'Unit Price', name: 'unit_price', type: 'number', default: 0 },
							{ displayName: 'VAT Rate (%)', name: 'vat_rate', type: 'number', default: 20 },
						],
					},
				],
			},

			// ---------------------------------------------------------------
			// Invoice: updateStatus
			// ---------------------------------------------------------------
			{
				displayName: 'New Status',
				name: 'status',
				type: 'string',
				default: '',
				required: true,
				description: 'Target status code (see the 2nodoc documentation for valid values depending on the document type)',
				displayOptions: { show: { resource: ['invoice'], operation: ['updateStatus'] } },
			},

			// ---------------------------------------------------------------
			// Invoice/Client: getAll — pagination & filters
			// ---------------------------------------------------------------
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				default: false,
				description: 'Whether to return all results or only up to a given limit',
				displayOptions: { show: { resource: ['invoice', 'client', 'einvoice'], operation: ['getAll'] } },
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 50,
				description: 'Max number of results to return',
				typeOptions: { minValue: 1 },
				displayOptions: {
					show: { resource: ['invoice', 'client', 'einvoice'], operation: ['getAll'], returnAll: [false] },
				},
			},
			{
				displayName: 'Additional Filters',
				name: 'filters',
				type: 'json',
				default: '{}',
				description:
					'Additional query parameters as JSON (e.g. {"type": "invoice", "status": "paid", "client_id": 123}). Passed as-is as query string.',
				displayOptions: { show: { resource: ['invoice', 'client', 'einvoice'], operation: ['getAll'] } },
			},

			// ---------------------------------------------------------------
			// E-invoice: getAll direction
			// ---------------------------------------------------------------
			{
				displayName: 'Direction',
				name: 'direction',
				type: 'options',
				default: 'in',
				options: [
					{ name: 'Received', value: 'in' },
					{ name: 'Sent', value: 'out' },
				],
				displayOptions: { show: { resource: ['einvoice'], operation: ['getAll'] } },
			},

			// ---------------------------------------------------------------
			// Generic body passthrough for create/update on Invoice & Client
			// (the API exposes more optional fields than the ones explicitly
			// modeled above; this field lets users supply them without
			// waiting for a node update)
			// ---------------------------------------------------------------
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'json',
				default: '{}',
				description: 'Extra fields to merge into the request body (JSON format)',
				displayOptions: {
					show: {
						resource: ['invoice', 'client'],
						operation: ['create', 'update'],
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		const credentials = await this.getCredentials('twoNodocApi');
		const baseUrl = (credentials.baseUrl as string).replace(/\/+$/, '');

		const parseJsonParam = (raw: unknown): IDataObject => {
			if (!raw) return {};
			if (typeof raw === 'object') return raw as IDataObject;
			try {
				return JSON.parse(raw as string) as IDataObject;
			} catch (error) {
				throw new NodeOperationError(
					this.getNode(),
					`Invalid JSON: ${(error as Error).message}`,
				);
			}
		};

		for (let i = 0; i < items.length; i++) {
			try {
				let method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE' = 'GET';
				let path = '';
				let qs: IDataObject = {};
				let body: IDataObject = {};
				let isBinaryDownload = false;

				if (resource === 'invoice') {
					if (operation === 'create') {
						method = 'POST';
						path = '/api/public/invoices';
						const clientId = this.getNodeParameter('clientId', i) as string;
						const invoiceType = this.getNodeParameter('invoiceType', i) as string;
						const invoiceDate = this.getNodeParameter('invoiceDate', i) as string;
						const linesParam = this.getNodeParameter('lines', i) as {
							line?: IDataObject[];
						};
						const additional = parseJsonParam(this.getNodeParameter('additionalFields', i));
						body = {
							client_id: Number(clientId),
							invoice_type: invoiceType,
							invoice_date: invoiceDate.split('T')[0],
							lines: linesParam.line ?? [],
							...additional,
						};
					} else if (operation === 'get') {
						method = 'GET';
						path = `/api/public/invoices/${this.getNodeParameter('invoiceId', i)}`;
					} else if (operation === 'getAll') {
						method = 'GET';
						path = '/api/public/invoices';
						qs = parseJsonParam(this.getNodeParameter('filters', i));
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						if (!returnAll) {
							qs.limit = this.getNodeParameter('limit', i) as number;
						}
					} else if (operation === 'update') {
						method = 'PATCH';
						path = `/api/public/invoices/${this.getNodeParameter('invoiceId', i)}`;
						body = parseJsonParam(this.getNodeParameter('additionalFields', i));
					} else if (operation === 'delete') {
						method = 'DELETE';
						path = `/api/public/invoices/${this.getNodeParameter('invoiceId', i)}`;
					} else if (operation === 'updateStatus') {
						method = 'PATCH';
						path = `/api/public/invoices/${this.getNodeParameter('invoiceId', i)}/status`;
						body = { status: this.getNodeParameter('status', i) };
					} else if (operation === 'convert') {
						method = 'POST';
						path = `/api/public/invoices/${this.getNodeParameter('invoiceId', i)}/convert`;
					} else if (operation === 'send') {
						method = 'POST';
						path = `/api/public/invoices/${this.getNodeParameter('invoiceId', i)}/send`;
					} else if (operation === 'getSendHistory') {
						method = 'GET';
						path = `/api/public/invoices/${this.getNodeParameter('invoiceId', i)}/send-history`;
					} else if (operation === 'downloadPdf') {
						method = 'GET';
						path = `/api/public/invoices/${this.getNodeParameter('invoiceId', i)}/pdf`;
						isBinaryDownload = true;
					} else if (operation === 'downloadFacturx') {
						method = 'GET';
						path = `/api/public/invoices/${this.getNodeParameter('invoiceId', i)}/facturx`;
						isBinaryDownload = true;
					} else {
						throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
					}
				} else if (resource === 'client') {
					if (operation === 'create') {
						method = 'POST';
						path = '/api/public/clients';
						body = parseJsonParam(this.getNodeParameter('additionalFields', i));
					} else if (operation === 'get') {
						method = 'GET';
						path = `/api/public/clients/${this.getNodeParameter('clientId', i)}`;
					} else if (operation === 'getAll') {
						method = 'GET';
						path = '/api/public/clients';
						qs = parseJsonParam(this.getNodeParameter('filters', i));
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						if (!returnAll) {
							qs.limit = this.getNodeParameter('limit', i) as number;
						}
					} else if (operation === 'update') {
						method = 'PATCH';
						path = `/api/public/clients/${this.getNodeParameter('clientId', i)}`;
						body = parseJsonParam(this.getNodeParameter('additionalFields', i));
					} else if (operation === 'delete') {
						method = 'DELETE';
						path = `/api/public/clients/${this.getNodeParameter('clientId', i)}`;
					} else {
						throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
					}
				} else if (resource === 'einvoice') {
					if (operation === 'status') {
						method = 'GET';
						path = '/api/public/einvoices/status';
					} else if (operation === 'company') {
						method = 'GET';
						path = '/api/public/einvoices/company';
					} else if (operation === 'get') {
						method = 'GET';
						path = `/api/public/einvoices/invoices/${this.getNodeParameter('einvoiceId', i)}`;
					} else if (operation === 'getAll') {
						method = 'GET';
						path = '/api/public/einvoices/invoices';
						qs = {
							direction: this.getNodeParameter('direction', i) as string,
							...parseJsonParam(this.getNodeParameter('filters', i)),
						};
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						if (!returnAll) {
							qs.limit_per_page = this.getNodeParameter('limit', i) as number;
						}
					} else if (operation === 'accept') {
						method = 'POST';
						path = `/api/public/einvoices/invoices/${this.getNodeParameter('einvoiceId', i)}/accept`;
					} else if (operation === 'reject') {
						method = 'POST';
						path = `/api/public/einvoices/invoices/${this.getNodeParameter('einvoiceId', i)}/reject`;
					} else if (operation === 'dispute') {
						method = 'POST';
						path = `/api/public/einvoices/invoices/${this.getNodeParameter('einvoiceId', i)}/dispute`;
					} else if (operation === 'initiatePayment') {
						method = 'POST';
						path = `/api/public/einvoices/invoices/${this.getNodeParameter(
							'einvoiceId',
							i,
						)}/initiate-payment`;
					} else {
						throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
					}
				} else {
					throw new NodeOperationError(this.getNode(), `Unknown resource: ${resource}`);
				}

				if (isBinaryDownload) {
					const response = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'twoNodocApi',
						{
							method,
							url: `${baseUrl}${path}`,
							qs,
							encoding: 'arraybuffer',
							returnFullResponse: true,
						},
					);

					const contentType = (response.headers['content-type'] as string) ?? 'application/octet-stream';
					const contentDisposition = (response.headers['content-disposition'] as string) ?? '';
					const filenameMatch = /filename="?([^";]+)"?/i.exec(contentDisposition);
					const fileName = filenameMatch?.[1] ?? `${path.split('/').filter(Boolean).pop()}`;

					const binaryData = await this.helpers.prepareBinaryData(
						Buffer.from(response.body as ArrayBuffer),
						fileName,
						contentType,
					);

					returnData.push({
						json: { fileName, contentType },
						binary: { data: binaryData },
						pairedItem: { item: i },
					});
				} else {
					const response = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'twoNodocApi',
						{
							method,
							url: `${baseUrl}${path}`,
							qs,
							body,
							json: true,
						},
					);

					if (Array.isArray(response)) {
						for (const entry of response as IDataObject[]) {
							returnData.push({ json: entry, pairedItem: { item: i } });
						}
					} else if (response && typeof response === 'object' && Array.isArray((response as IDataObject).items)) {
						for (const entry of (response as IDataObject).items as IDataObject[]) {
							returnData.push({ json: entry, pairedItem: { item: i } });
						}
					} else {
						returnData.push({ json: (response as IDataObject) ?? {}, pairedItem: { item: i } });
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw new NodeApiError(this.getNode(), error as JsonObject);
			}
		}

		return [returnData];
	}
}
