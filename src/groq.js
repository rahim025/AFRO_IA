// Appel à l'API Groq. La clé reste côté serveur (variable d'environnement GROQ_API_KEY).
const BASE = 'https://api.groq.com/openai/v1';
const KEY = process.env.GROQ_API_KEY;
let models = { at: 0, ids: [] };

const fail = (status, message) => Object.assign(new Error(message), { status, publicMessage: message });
const headers = () => ({ Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' });

// Modèle : GROQ_MODEL si défini, sinon détection automatique parmi les modèles disponibles.
async function pickModels() {
  if (process.env.GROQ_MODEL) return [process.env.GROQ_MODEL];
  if (models.ids.length && Date.now() - models.at < 10 * 60 * 1000) return models.ids;
  const res = await fetch(`${BASE}/models`, { headers: headers(), signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw fail(503, 'Le service IA est momentanément indisponible.');
  const all = (await res.json()).data.map(m => m.id).filter(id => !/whisper|tts|playai|guard|embed/i.test(id));
  const score = id => (/llama.*(70b|versatile)/i.test(id) ? 0 : /gpt-oss-120b/i.test(id) ? 1 : /llama/i.test(id) ? 2 : 3);
  models = { at: Date.now(), ids: all.sort((a, b) => score(a) - score(b)).slice(0, 3) };
  return models.ids;
}

async function generate(system, prompt, maxTokens) {
  if (!KEY) throw fail(503, 'Le service IA n\'est pas encore configuré.');
  let ids;
  try { ids = await pickModels(); } catch (e) { throw e.publicMessage ? e : fail(503, 'Le service IA est momentanément indisponible.'); }

  for (const model of ids) {
    try {
      const res = await fetch(`${BASE}/chat/completions`, {
        method: 'POST',
        headers: headers(),
        signal: AbortSignal.timeout(30000),
        body: JSON.stringify({
          model, temperature: 0.7, max_tokens: maxTokens,
          messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
        }),
      });
      if (res.ok) {
        const text = (await res.json()).choices?.[0]?.message?.content?.trim();
        if (text) return text;
        continue;
      }
      const body = await res.text();
      console.error(`Groq ${model} -> ${res.status}: ${body.slice(0, 300)}`);
      if (res.status === 401 || res.status === 403) throw fail(503, 'Le service IA n\'est pas disponible pour le moment.');
      if (res.status === 404) { models.at = 0; continue; }           // modèle retiré : on essaie le suivant
      if (res.status === 429) throw fail(503, 'Le service IA est très sollicité. Réessayez dans un instant.');
    } catch (e) {
      if (e.publicMessage) throw e;
      console.error(`Groq ${model} erreur réseau:`, e.message);
    }
  }
  throw fail(502, 'L\'IA n\'a pas pu répondre. Réessayez dans un instant.');
}

module.exports = { generate };
