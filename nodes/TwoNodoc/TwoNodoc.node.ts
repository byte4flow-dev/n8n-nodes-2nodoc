import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

/**
 * Node communautaire n8n pour l'API publique 2nodoc (e-invoicing RFE France/Belgique).
 *
 * Endpoints et schémas basés sur la spec OpenAPI publique https://api.2nodoc.com/openapi.json
 * (consultée le 13/09/2026). Périmètre v0.1 (MVP) : Factures, Clients, E-Invoices (RFE/SuperPDP).
 * Non couverts pour l'instant (à ajouter dans une v0.2 sur le même modèle) : Products, Team Users,
 * facture d'achat depuis OCR (POST /api/public/invoices/buy).
 */
export class TwoNodoc implements INodeType {
	description: INodeTypeDescription = {
		displayName: '2nodoc',
		name: 'twoNodoc',
		icon: 'file:twonodoc.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description: 'Gérer factures, clients et e-invoicing RFE via l\'API 2nodoc',
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
					{ name: 'Facture', value: 'invoice' },
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
					{ name: 'Créer', value: 'create', action: 'Créer une facture ou un devis' },
					{ name: 'Récupérer', value: 'get', action: 'Récupérer une facture' },
					{ name: 'Lister', value: 'getAll', action: 'Lister les factures' },
					{ name: 'Mettre à Jour', value: 'update', action: 'Mettre à jour une facture ou un devis' },
					{ name: 'Supprimer', value: 'delete', action: 'Supprimer une facture (suppression douce)' },
					{ name: 'Changer le Statut', value: 'updateStatus', action: 'Changer le statut d une facture' },
					{ name: 'Convertir Devis → Facture', value: 'convert', action: 'Convertir un devis en facture' },
					{ name: 'Envoyer par Email', value: 'send', action: 'Envoyer une facture par email' },
					{ name: 'Historique d\'envoi', value: 'getSendHistory', action: 'Récupérer l historique d envoi' },
					{ name: 'Télécharger le PDF', value: 'downloadPdf', action: 'Télécharger le PDF de la facture' },
					{
						name: 'Télécharger le Factur-X',
						value: 'downloadFacturx',
						action: 'Télécharger le fichier Factur-X de la facture',
					},
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
					{ name: 'Créer', value: 'create', action: 'Créer un client' },
					{ name: 'Récupérer', value: 'get', action: 'Récupérer un client' },
					{ name: 'Lister', value: 'getAll', action: 'Lister les clients' },
					{ name: 'Mettre à Jour', value: 'update', action: 'Mettre à jour un client' },
					{ name: 'Supprimer', value: 'delete', action: 'Supprimer un client (suppression douce)' },
				],
				default: 'getAll',
			},

			// ---------------------------------------------------------------
			// E-invoice (RFE/SuperPDP) operations
			// ---------------------------------------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['einvoice'] } },
				options: [
					{ name: 'Statut de Connexion', value: 'status', action: 'Vérifier le statut de connexion RFE' },
					{ name: 'Société Connectée', value: 'company', action: 'Récupérer la société connectée' },
					{ name: 'Récupérer', value: 'get', action: 'Récupérer une e-invoice' },
					{ name: 'Lister', value: 'getAll', action: 'Lister les e-invoices' },
					{ name: 'Accepter', value: 'accept', action: 'Accepter une e-invoice reçue' },
					{ name: 'Refuser', value: 'reject', action: 'Refuser une e-invoice reçue' },
					{ name: 'Ouvrir un Litige', value: 'dispute', action: 'Ouvrir un litige sur une e-invoice' },
					{
						name: 'Initier le Paiement',
						value: 'initiatePayment',
						action: 'Initier le paiement d une e-invoice',
					},
				],
				default: 'getAll',
			},

			// ---------------------------------------------------------------
			// Shared: ID fields
			// ---------------------------------------------------------------
			{
				displayName: 'ID Facture',
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
				displayName: 'ID Client',
				name: 'clientId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: { resource: ['client'], operation: ['get', 'update', 'delete'] },
				},
			},
			{
				displayName: 'ID E-Invoice',
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
				displayName: 'ID Client',
				name: 'clientId',
				type: 'string',
				default: '',
				required: true,
				description: 'Client destinataire (client_id)',
				displayOptions: { show: { resource: ['invoice'], operation: ['create'] } },
			},
			{
				displayName: 'Type de Document',
				name: 'invoiceType',
				type: 'options',
				default: 'invoice',
				required: true,
				options: [
					{ name: 'Facture', value: 'invoice' },
					{ name: 'Devis', value: 'quote' },
					{ name: 'Facture d\'Achat', value: 'buy' },
					{ name: 'Avoir', value: 'credit_note' },
				],
				displayOptions: { show: { resource: ['invoice'], operation: ['create'] } },
			},
			{
				displayName: 'Date de la Facture',
				name: 'invoiceDate',
				type: 'dateTime',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['invoice'], operation: ['create'] } },
			},
			{
				displayName: 'Lignes',
				name: 'lines',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				default: {},
				required: true,
				placeholder: 'Ajouter une ligne',
				displayOptions: { show: { resource: ['invoice'], operation: ['create'] } },
				options: [
					{
						displayName: 'Ligne',
						name: 'line',
						values: [
							{ displayName: 'Numéro', name: 'number', type: 'number', default: 1 },
							{ displayName: 'Description', name: 'description', type: 'string', default: '' },
							{ displayName: 'Quantité', name: 'quantity', type: 'number', default: 1 },
							{ displayName: 'Prix Unitaire', name: 'unit_price', type: 'number', default: 0 },
							{ displayName: 'Taux de TVA (%)', name: 'vat_rate', type: 'number', default: 20 },
						],
					},
				],
			},

			// ---------------------------------------------------------------
			// Invoice: updateStatus
			// ---------------------------------------------------------------
			{
				displayName: 'Nouveau Statut',
				name: 'status',
				type: 'string',
				default: '',
				required: true,
				description: 'Code de statut cible (voir la documentation 2nodoc pour les valeurs valides selon le type de document)',
				displayOptions: { show: { resource: ['invoice'], operation: ['updateStatus'] } },
			},

			// ---------------------------------------------------------------
			// Invoice/Client: getAll — pagination & filtres
			// ---------------------------------------------------------------
			{
				displayName: 'Retourner Tout',
				name: 'returnAll',
				type: 'boolean',
				default: false,
				displayOptions: { show: { resource: ['invoice', 'client', 'einvoice'], operation: ['getAll'] } },
			},
			{
				displayName: 'Limite',
				name: 'limit',
				type: 'number',
				default: 50,
				typeOptions: { minValue: 1 },
				displayOptions: {
					show: { resource: ['invoice', 'client', 'einvoice'], operation: ['getAll'], returnAll: [false] },
				},
			},
			{
				displayName: 'Filtres Additionnels',
				name: 'filters',
				type: 'json',
				default: '{}',
				description:
					'Paramètres de requête additionnels au format JSON (ex. {"type": "invoice", "status": "paid", "client_id": 123}). Passés tels quels en query string.',
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
					{ name: 'Reçues', value: 'in' },
					{ name: 'Émises', value: 'out' },
				],
				displayOptions: { show: { resource: ['einvoice'], operation: ['getAll'] } },
			},

			// ---------------------------------------------------------------
			// Generic body passthrough for create/update on Invoice & Client
			// (l'API expose davantage de champs optionnels que ceux modélisés
			// explicitement ci-dessus ; ce champ permet de les fournir sans
			// attendre une mise à jour du node)
			// ---------------------------------------------------------------
			{
				displayName: 'Champs Additionnels',
				name: 'additionalFields',
				type: 'json',
				default: '{}',
				description: 'Champs supplémentaires à fusionner dans le corps de la requête (format JSON)',
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
					`JSON invalide : ${(error as Error).message}`,
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
						throw new NodeOperationError(this.getNode(), `Opération inconnue : ${operation}`);
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
						throw new NodeOperationError(this.getNode(), `Opération inconnue : ${operation}`);
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
						throw new NodeOperationError(this.getNode(), `Opération inconnue : ${operation}`);
					}
				} else {
					throw new NodeOperationError(this.getNode(), `Ressource inconnue : ${resource}`);
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
				throw error;
			}
		}

		return [returnData];
	}
}
