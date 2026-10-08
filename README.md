# AfroIA – base du site

Site statique, sans dépendance ni étape de build.

```
index.html              page d'accueil
assets/css/style.css    styles (variables en haut du fichier)
assets/img/logo.svg     logo et favicon
```

Prochaines étapes prévues : une page par outil (`/publicite`, `/cv`, `/publications`, `/idees`),
puis l'inscription, l'appel à l'IA côté serveur et les paiements.
Les 4 outils ont déjà un attribut `data-tool` pour s'y accrocher.

Déploiement : GitHub Pages, Netlify ou Render (site statique), dossier racine = ce dossier.
