const express = require('express');
const path = require('path');
const { SYSTEM, TOOLS, validate, publicTools } = require('./src/tools');
const { getUser, check, refund } = require('./src/limits');
const { generate } = require('./src/groq');

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');
app.set('trust proxy', 1); // Render est derrière un proxy : nécessaire pour lire la vraie IP
app.use(express.json({ limit: '20kb' }));

// ---- API ----
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'afroia' }));
app.get('/api/tools', (req, res) => res.json(publicTools()));

app.post('/api/generate', async (req, res) => {
  const { values, tool, error } = validate(req.body?.tool, req.body?.values);
  if (error) return res.status(400).json({ error });

  const user = getUser(req); // futur : utilisateur connecté
  const limit = check(user);
  if (!limit.ok) {
    res.set('Retry-After', String(limit.retryAfter));
    return res.status(429).json({ error: limit.message });
  }

  try {
    const result = await generate(SYSTEM, tool.build(values), tool.maxTokens);
    res.json({ result, remaining: limit.remaining });
  } catch (e) {
    refund(user);
    console.error('Erreur /api/generate:', e.message);
    res.status(e.status || 500).json({ error: e.publicMessage || 'Une erreur est survenue. Réessayez.' });
  }
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Route introuvable' }));

// ---- Site statique ----
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));
app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`AfroIA tourne sur le port ${PORT}`));
