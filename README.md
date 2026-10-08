# AfroIA

Serveur Node/Express : sert le site (`public/`) et l'API IA (`/api/...`).

```
server.js                 routes API + site statique
src/tools.js              les 4 outils : champs, prompts, validation
src/groq.js               appel à l'IA (clé côté serveur uniquement)
src/limits.js             limites d'utilisation + point d'entrée futur des comptes
public/                   site (index.html, outil.html, assets/)
render.yaml               configuration Render
```

## Configurer l'IA (Groq)
1. Créez une clé sur https://console.groq.com/keys
2. Render → votre service → Environment → ajoutez `GROQ_API_KEY` (sans guillemets) → Save (redéploiement automatique).
3. Facultatif : `GROQ_MODEL` (sinon le meilleur modèle disponible est choisi automatiquement),
   `RATE_PER_MIN` (5), `DAILY_LIMIT_FREE` (15), `GLOBAL_DAILY_LIMIT` (1000).

## Tester
- En ligne : ouvrez `/api/health` puis `/api/tools`, puis testez chaque outil depuis la page d'accueil.
- En local : `npm install`, copiez `.env.example` en `.env` (ou `export GROQ_API_KEY=...`), `npm start`, ouvrez http://localhost:3000.
- Limites : envoyez 6 générations en moins d'une minute, la 6e doit afficher « Doucement ! ».
- Erreurs : sans `GROQ_API_KEY`, l'outil affiche « Le service IA n'est pas encore configuré. »

## Prochaines étapes (non implémentées)
- Comptes : remplir `req.user` (session/JWT) ; `getUser()` dans `src/limits.js` l'utilise déjà.
- Paiements : ajouter des plans dans `PLANS` (`src/limits.js`) et les associer à l'utilisateur.
- Limites en mémoire : passer à une base de données/Redis si plusieurs instances.
