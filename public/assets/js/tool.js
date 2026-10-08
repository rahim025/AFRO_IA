// Page d'outil : construit le formulaire depuis /api/tools et appelle /api/generate.
(async () => {
  const $ = id => document.getElementById(id);
  const toolId = new URLSearchParams(location.search).get('t');
  const form = $('form'), erreur = $('erreur'), resultat = $('resultat');
  let last = null, busy = false, submit;

  const showError = msg => { erreur.textContent = msg; erreur.hidden = false; };

  let tools;
  try { tools = await (await fetch('/api/tools')).json(); } catch { tools = null; }
  const tool = tools && tools[toolId];
  if (!tool) {
    $('titre').textContent = 'Outil introuvable';
    return showError(tools ? 'Cet outil n\'existe pas. Retournez à la liste des outils.' : 'Connexion impossible. Vérifiez votre réseau.');
  }

  document.title = `${tool.title} – AfroIA`;
  $('titre').textContent = tool.title;
  $('intro').textContent = tool.intro;

  for (const f of tool.fields) {
    const wrap = document.createElement('div');
    wrap.className = 'field';
    const label = document.createElement('label');
    label.htmlFor = f.name;
    label.textContent = f.label + (f.required ? '' : ' (facultatif)');
    let input;
    if (f.type === 'select') {
      input = document.createElement('select');
      if (!f.required) input.add(new Option('Au choix', ''));
      f.options.forEach(o => input.add(new Option(o, o)));
    } else {
      input = document.createElement(f.type === 'textarea' ? 'textarea' : 'input');
      if (f.type === 'textarea') input.rows = 3; else input.type = 'text';
      if (f.placeholder) input.placeholder = f.placeholder;
      input.maxLength = f.max || 300;
    }
    input.id = input.name = f.name;
    input.required = !!f.required;
    wrap.append(label, input);
    form.append(wrap);
  }
  submit = document.createElement('button');
  submit.className = 'btn btn--block';
  submit.textContent = 'Générer';
  form.append(submit);

  function setBusy(on) {
    busy = on;
    submit.disabled = on;
    submit.textContent = on ? 'Génération en cours…' : 'Générer';
    $('reessayer').disabled = on;
  }

  async function run() {
    if (busy || !last) return;
    setBusy(true);
    erreur.hidden = true;
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: toolId, values: last }),
        signal: AbortSignal.timeout(60000), // le serveur gratuit peut mettre du temps à se réveiller
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Une erreur est survenue. Réessayez.');
      $('sortie').textContent = data.result;
      $('reste').textContent = data.remaining != null ? `Générations restantes aujourd'hui : ${data.remaining}` : '';
      resultat.hidden = false;
      resultat.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
      showError(e.name === 'TimeoutError' || e.name === 'TypeError'
        ? 'Le serveur met du temps à répondre. Vérifiez votre connexion et réessayez.' : e.message);
    } finally { setBusy(false); }
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    last = Object.fromEntries(new FormData(form));
    run();
  });
  $('reessayer').addEventListener('click', run);

  // Téléchargement PDF : jsPDF est chargé seulement au premier clic (page d'accueil plus légère).
  const JSPDF_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  const loadJsPdf = () => new Promise((ok, ko) => {
    if (window.jspdf) return ok();
    const el = document.createElement('script');
    el.src = JSPDF_URL; el.onload = ok; el.onerror = ko;
    document.head.append(el);
  });
  // Les polices PDF standard n'affichent pas les emojis : on les retire et on simplifie la ponctuation.
  const pdfSafe = t => t
    .replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-').replace(/\u2026/g, '...').replace(/[\u2022\u25CF]/g, '-')
    .replace(/[^\n\x20-\xFF]/g, '');

  $('pdf').addEventListener('click', async () => {
    const btn = $('pdf');
    btn.disabled = true; btn.textContent = 'Préparation du PDF…';
    try {
      await loadJsPdf();
      const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
      const M = 20, W = 210 - 2 * M, H = 297 - M;
      let y = M;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
      doc.text(pdfSafe(tool.title), M, y); y += 7;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(110);
      doc.text(`AfroIA - ${new Date().toLocaleDateString('fr-FR')}`, M, y); y += 9;
      doc.setFontSize(11); doc.setTextColor(26, 32, 51);
      for (const line of doc.splitTextToSize(pdfSafe($('sortie').textContent), W)) {
        if (y > H) { doc.addPage(); y = M; }
        doc.text(line, M, y); y += 5.6;
      }
      doc.save(`afroia-${toolId}.pdf`);
    } catch {
      showError('Impossible de créer le PDF (connexion ?). Vous pouvez utiliser « Copier » à la place.');
    } finally { btn.disabled = false; btn.textContent = 'Télécharger en PDF'; }
  });

  $('copier').addEventListener('click', async () => {
    const text = $('sortie').textContent, btn = $('copier');
    try { await navigator.clipboard.writeText(text); }
    catch {
      const t = document.createElement('textarea');
      t.value = text; document.body.append(t); t.select(); document.execCommand('copy'); t.remove();
    }
    btn.textContent = 'Copié ✓';
    setTimeout(() => (btn.textContent = 'Copier'), 1800);
  });
})();
