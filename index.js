// n8n localise les nodes et credentials via le champ "n8n" de package.json
// (dist/credentials/*.js, dist/nodes/**/*.js) — ce fichier n'a pas besoin
// d'exporter quoi que ce soit, il existe uniquement pour satisfaire le champ
// "main" de package.json si un outil tiers venait à faire require() dessus.
module.exports = {};
