const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

// ---- API (à compléter aux prochaines étapes) ----
// Exemple de futures routes : /api/publicite, /api/cv, /api/publications, /api/idees
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'afroia' }));

// ---- Site statique ----
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

// Route inconnue : API -> JSON 404, sinon retour à l'accueil
app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Route introuvable' });
  res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`AfroIA tourne sur le port ${PORT}`));
