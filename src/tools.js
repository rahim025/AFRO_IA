// Définition des 4 outils : champs du formulaire + construction du prompt.
// Source unique : le frontend récupère les champs via GET /api/tools.
const SYSTEM =
  "Tu es AfroIA, un assistant qui aide des entrepreneurs, étudiants et créateurs africains. " +
  "Écris en français simple et naturel, adapté au contexte africain (réalités locales, WhatsApp, mobile money, " +
  "marchés informels et formels). N'invente jamais de chiffres, de noms ni de faits. " +
  "Réponds en texte brut, sans symboles Markdown (pas d'astérisques, pas de dièses).";

const sel = (name, label, options, required) => ({ name, label, type: 'select', options, required });
const TONS = ['Chaleureux', 'Professionnel', 'Dynamique', 'Humoristique'];

const TOOLS = {
  publicite: {
    title: 'Publicité IA',
    intro: 'Décrivez votre produit, AfroIA écrit la pub.',
    maxTokens: 700,
    fields: [
      { name: 'produit', label: 'Produit ou service', type: 'text', placeholder: 'Ex. : savon naturel au karité', required: true, max: 150 },
      { name: 'cible', label: 'Client visé', type: 'text', placeholder: 'Ex. : femmes de 25 à 40 ans', max: 150 },
      sel('canal', 'Où publier ?', ['WhatsApp', 'Facebook', 'Instagram', 'Affiche ou flyer', 'Radio'], true),
      sel('ton', 'Ton', TONS),
      { name: 'details', label: 'Prix, offre, contact (facultatif)', type: 'textarea', max: 400 },
    ],
    build: v => `Écris 3 versions d'un texte publicitaire pour ${v.canal}.\nProduit : ${v.produit}\nClient visé : ${v.cible || 'grand public'}\nTon : ${v.ton || 'Chaleureux'}\nDétails : ${v.details || 'aucun'}\nChaque version a un accroche, un court texte et un appel à l'action. Sépare les versions par une ligne vide.`,
  },
  cv: {
    title: 'CV IA',
    intro: 'Entrez vos informations, AfroIA rédige un CV propre.',
    maxTokens: 1100,
    fields: [
      { name: 'nom', label: 'Nom complet', type: 'text', required: true, max: 80 },
      { name: 'poste', label: 'Poste visé', type: 'text', placeholder: 'Ex. : assistante commerciale', required: true, max: 100 },
      { name: 'formation', label: 'Formation', type: 'textarea', placeholder: 'Diplômes, écoles, années', max: 500 },
      { name: 'experience', label: 'Expériences', type: 'textarea', placeholder: 'Poste, lieu, durée, ce que vous faisiez', max: 900 },
      { name: 'competences', label: 'Compétences', type: 'textarea', max: 400 },
      { name: 'langues', label: 'Langues', type: 'text', placeholder: 'Ex. : français, anglais, fon', max: 100 },
      { name: 'contact', label: 'Contact', type: 'text', placeholder: 'Téléphone, e-mail, ville', max: 150 },
    ],
    build: v => `Rédige un CV professionnel et clair pour le poste de « ${v.poste} », avec les sections : profil, formation, expériences, compétences, langues, contact.\nNom : ${v.nom}\nFormation : ${v.formation || 'non précisée'}\nExpériences : ${v.experience || 'non précisées'}\nCompétences : ${v.competences || 'non précisées'}\nLangues : ${v.langues || 'non précisées'}\nContact : ${v.contact || 'non précisé'}\nN'invente aucun diplôme, employeur ni date. Si une information manque, laisse la section de côté.`,
  },
  publications: {
    title: 'Publications IA',
    intro: 'Obtenez des publications prêtes à poster.',
    maxTokens: 900,
    fields: [
      { name: 'sujet', label: 'Sujet ou activité', type: 'textarea', placeholder: 'Ex. : ouverture de ma boutique de vêtements à Cotonou', required: true, max: 400 },
      sel('reseau', 'Réseau', ['Facebook', 'Instagram', 'TikTok', 'LinkedIn', 'X (Twitter)'], true),
      sel('objectif', 'Objectif', ['Vendre', 'Informer', 'Inspirer', 'Faire réagir'], true),
      sel('ton', 'Ton', TONS),
      sel('nombre', 'Nombre de publications', ['1', '3', '5'], true),
    ],
    build: v => `Rédige ${v.nombre} publication(s) pour ${v.reseau}.\nSujet : ${v.sujet}\nObjectif : ${v.objectif}\nTon : ${v.ton || 'Chaleureux'}\nAjoute des hashtags utiles si le réseau s'y prête. Sépare les publications par une ligne vide.`,
  },
  business: {
    title: 'Idées Business',
    intro: 'Trouvez des idées adaptées à votre situation.',
    maxTokens: 1100,
    fields: [
      sel('budget', 'Budget de départ', ['Moins de 50 000 FCFA', '50 000 à 200 000 FCFA', '200 000 à 1 000 000 FCFA', 'Plus de 1 000 000 FCFA'], true),
      { name: 'lieu', label: 'Ville et pays', type: 'text', placeholder: 'Ex. : Parakou, Bénin', required: true, max: 100 },
      { name: 'profil', label: 'Compétences et centres d\'intérêt', type: 'textarea', required: true, max: 400 },
      sel('temps', 'Temps disponible', ['Temps plein', 'Temps partiel', 'Quelques heures par semaine'], true),
    ],
    build: v => `Propose 3 idées de business réalistes.\nBudget : ${v.budget}\nLieu : ${v.lieu}\nProfil : ${v.profil}\nTemps : ${v.temps}\nPour chaque idée : nom, description en 2 phrases, investissement estimé (en ordre de grandeur, à vérifier localement), 3 premières étapes, principal risque.`,
  },
};

// Nettoie et valide les valeurs reçues. Renvoie { values } ou { error }.
function validate(toolId, input) {
  const tool = TOOLS[toolId];
  if (!tool) return { error: 'Outil inconnu.' };
  const values = {};
  for (const f of tool.fields) {
    let val = String(input?.[f.name] ?? '').replace(/[ \t]+/g, ' ').trim();
    if (f.type === 'select') {
      if (val && !f.options.includes(val)) return { error: `Choix invalide pour « ${f.label} ».` };
    } else {
      val = val.slice(0, f.max || 300);
    }
    if (f.required && !val) return { error: `Le champ « ${f.label} » est obligatoire.` };
    values[f.name] = val;
  }
  return { values, tool };
}

const publicTools = () =>
  Object.fromEntries(Object.entries(TOOLS).map(([id, t]) => [id, { title: t.title, intro: t.intro, fields: t.fields }]));

module.exports = { SYSTEM, TOOLS, validate, publicTools };
