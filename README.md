# n8n-nodes-2nodoc

n8n community node for [2nodoc](https://2nodoc.com), a SaaS e-invoicing platform (Solution Compatible RFE, France/Belgium). Create, list, and update invoices and clients, manage the e-invoicing (RFE/PA-PDP) lifecycle, and download PDF/Factur-X files, directly from your n8n workflows.

> Status: v0.1 — MVP. Covered scope: Invoices, Clients, E-Invoices (RFE). Coming soon: Products, Team Users, purchase invoice from OCR.

## Installation

In a self-hosted n8n instance:

1. **Settings → Community Nodes → Install**
2. Enter `n8n-nodes-2nodoc`

Or locally for development:

```bash
npm install
npm run build
npm link
# then, in the ~/.n8n/nodes folder (or N8N_CUSTOM_EXTENSIONS):
npm link n8n-nodes-2nodoc
```

## Credentials

Create a **2nodoc API** credential with:

- **API Token**: token generated from the 2nodoc dashboard (Settings → API), sent as `Authorization: Bearer <token>`.
- **Base URL**: `https://api.2nodoc.com` by default.

## Resources and covered operations

### Invoice (`/api/public/invoices`)
Create, Get, Get Many, Update, Delete, Update Status, Convert Quote to Invoice, Send by Email, Get Send History, Download PDF, Download Factur-X.

### Client (`/api/public/clients`)
Create, Get, Get Many, Update, Delete.

### E-Invoice / RFE (`/api/public/einvoices`)
Connection Status, Connected Company, Get, Get Many (received/sent), Accept, Reject, Open Dispute, Initiate Payment.

Every create/update operation exposes an **Additional Fields** field (JSON) to pass fields not yet explicitly modeled in the node, without having to wait for a new version.

## Notes and gotchas

- **Invoice ID vs. invoice number**: operations that require an ID (e.g. Invoice → Get) expect the internal numeric ID (e.g. `519717`), not the display number (e.g. `F202600112`). Use Invoice → Get Many or E-Invoice → Get Many to look up the internal ID first.
- **Email validation**: the 2nodoc API rejects reserved/special-use email domains (e.g. `.local`). Use a real domain for client emails.
- **Multi-item execution**: like any n8n node, this node's `execute()` runs once per input item unless "Execute Once" is enabled on the node. Be careful when chaining a write operation (Create/Update/Delete) after a node that outputs multiple items — it will run once per item, which can unintentionally create duplicates.

## Example workflow

A simple "create client → create invoice → send by email" chain:

1. **2nodoc → Client → Create** with the client's `additionalFields` (e.g. `{"name": "Acme Corp", "email": "billing@acme.com"}`)
2. **2nodoc → Invoice → Create** using the Client ID from step 1, a Document Type (`Invoice`), an Invoice Date, and one or more Lines
3. **2nodoc → Invoice → Send by Email** using the Invoice ID from step 2

## Development

```bash
npm install
npm run build   # compiles TypeScript and copies icons into dist/
npm run lint     # eslint-plugin-n8n-nodes-base rules
```

To test locally in n8n: `npm link`, then `npm link n8n-nodes-2nodoc` from your instance's custom nodes folder (`N8N_CUSTOM_EXTENSIONS` environment variable), then restart n8n.

## Publishing

```bash
npm run build
npm publish --access public
```

Since May 1st, 2026, n8n verification (the "verified" badge) requires publishing via GitHub Actions with npm provenance — see `docs.n8n.io` for the workflow configuration.

## License

MIT — © Byte4flow Limited
