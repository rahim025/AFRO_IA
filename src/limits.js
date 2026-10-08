// Limites d'utilisation (en mémoire). Pour plusieurs instances, passer à Redis/base de données.
const PLANS = {
  free: { perMinute: +process.env.RATE_PER_MIN || 5, perDay: +process.env.DAILY_LIMIT_FREE || 15 },
  // Plans payants : à ajouter quand les paiements seront en place.
};
const GLOBAL_PER_DAY = +process.env.GLOBAL_DAILY_LIMIT || 1000; // plafond de sécurité pour le budget API

// PRÊT POUR LES COMPTES : remplacer par l'utilisateur connecté (session/JWT) quand l'inscription existera.
function getUser(req) {
  return { id: req.user?.id || `ip:${req.ip}`, plan: req.user?.plan || 'free' };
}

const minute = new Map();
const day = new Map();
let global = { d: '', n: 0 };
const today = () => new Date().toISOString().slice(0, 10);

function check(user) {
  const plan = PLANS[user.plan] || PLANS.free;
  const now = Date.now();
  const d = today();
  if (global.d !== d) global = { d, n: 0 };
  if (global.n >= GLOBAL_PER_DAY) return { ok: false, message: 'Le service est très sollicité aujourd\'hui. Réessayez demain.', retryAfter: 3600 };

  const hits = (minute.get(user.id) || []).filter(t => now - t < 60000);
  if (hits.length >= plan.perMinute) {
    const wait = Math.ceil((60000 - (now - hits[0])) / 1000);
    return { ok: false, message: `Doucement ! Réessayez dans ${wait} secondes.`, retryAfter: wait };
  }
  let u = day.get(user.id);
  if (!u || u.d !== d) u = { d, n: 0 };
  if (u.n >= plan.perDay) return { ok: false, message: `Limite gratuite atteinte (${plan.perDay} générations par jour). Revenez demain.`, retryAfter: 3600 };

  hits.push(now); minute.set(user.id, hits);
  u.n++; day.set(user.id, u); global.n++;
  return { ok: true, remaining: plan.perDay - u.n };
}

// Rend une génération si le fournisseur d'IA a échoué (pas la faute de l'utilisateur).
function refund(user) {
  const u = day.get(user.id);
  if (u && u.n > 0) u.n--;
  if (global.n > 0) global.n--;
}

setInterval(() => {
  const now = Date.now(), d = today();
  for (const [k, v] of minute) if (!v.some(t => now - t < 60000)) minute.delete(k);
  for (const [k, v] of day) if (v.d !== d) day.delete(k);
}, 10 * 60 * 1000).unref();

module.exports = { getUser, check, refund };
