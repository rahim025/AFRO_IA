# AfroIA

Serveur Node/Express qui sert le site (`public/`) et, plus tard, l'API IA (`/api/...`).

```
server.js               serveur Express + routes API
public/index.html       page d'accueil
public/assets/          styles et images
render.yaml             configuration Render (Web Service)
```

Lancer en local : `npm install` puis `npm start` (http://localhost:3000).

Render : New → Web Service → dépôt `afroia` → Build `npm install`, Start `npm start`.
Les clés (Groq, etc.) vont dans Environment sur Render, jamais dans le code.

Étapes prévues : pages des outils, inscription, appels IA côté serveur, paiements.
