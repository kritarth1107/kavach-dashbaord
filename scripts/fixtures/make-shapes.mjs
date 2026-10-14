// Builds scripts/fixtures/world-shapes.json.gz: invented families in the exact shapes production answers with, so the page
// test meets every field, list and enum value the dashboard really gets (the synthetic world had no orders, skills,
// outcomes, report alerts…). Input: a read-only capture of production in /tmp (never committed). Output: only the
// schema survives (keys, types, list lengths, relative times, the code-level enum vocabulary); every name, text, id,
// phone, address and amount is invented. The run fails if any captured text could be found in the output.
//
//   node scripts/fixtures/make-shapes.mjs /tmp/capture/live-world.json scripts/fixtures/world-shapes.json.gz
import crypto from "node:crypto";
import fs from "node:fs";
import zlib from "node:zlib";

const [, , input, output] = process.argv;
if (!input || !output) throw new Error("usage: make-shapes.mjs <live-world.json> <out.json.gz>");
const live = JSON.parse(fs.readFileSync(input, "utf8"));

// keys whose values are a code-level vocabulary (status, kind…); a value is kept only if it also looks like a code
const ENUM_KEYS = /^(kind|status|state|phase|service|source|source_kind|level|severity|op|channel|category|type|nudgeKind|mode|domain|repeat|delivery|tone|trend|band|via|lane|scope|role|today|mood|word|backendRole|partner|gender|reads|livesWith|frequency|priority|theme|unit|relation|relationship|timezone|script|language|dialect|mix|weekday|day_part|slot|outcome|result|lang)$/;
const CODE = /^[a-z][a-z0-9_]{0,30}$/;
const UNIT = /^(%|kg|cm|mmHg|mg\/dL|bpm|F|C|steps|kcal|g|ml|L|mg|mcg|IU|min|h)$/;
const ROLE = /^(PRIMARY_CAREGIVER|CO_CAREGIVER|CARE_RECIPIENT|VIEWER|MEMBER|JOINED|INVITED|PENDING|ACTIVE|BLOCKED|REMOVED|MEDICINE|[A-Z_]{3,30})$/;
const TZ = /^Asia\/Kolkata$/;

const FIRST = ["Asha", "Ravi", "Meera", "Kiran", "Tarun", "Lata", "Arjun", "Nisha", "Vikram", "Pooja", "Harish", "Kavita", "Mohan", "Rekha", "Anil", "Sarita"];
const LAST = ["Bhatt", "Iyer", "Das", "Patil", "Menon", "Gupta", "Pillai", "Bose", "Joshi", "Nair", "Kulkarni", "Verma"];
const WORDS = ("morning walk tea lunch dinner medicine tablet doctor visit park temple garden sugar check reading weight sleep rest "
  + "call daughter son neighbour market vegetables fruit milk bread rice dal curd water exercise yoga bhajan news radio prayer "
  + "evening breakfast pharmacy clinic appointment follow up fever cough knee pain better calm happy tired busy quiet slowly "
  + "today yesterday week usual favourite remind asked said wants likes enjoys prefers noted saved told plan order ride home").split(" ");
const DEVANAGARI = ["सुबह की सैर", "दवा ली", "चाय पी", "आज अच्छा लगा", "डॉक्टर से मिलना है", "घुटने में दर्द"];

const hash = (s) => crypto.createHash("sha256").update(String(s)).digest();
const pick = (arr, s, n = 0) => arr[hash(s).readUInt32BE(n % 28) % arr.length];
const mapped = new Map(); // same captured value → same invented value (ids and keys stay linked across routes)
const captured = new Set(); // every captured string that must not reach the output

function fakeUuid(s) {
  const h = hash(`uuid:${s}`).toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
const fakeName = (s) => `${pick(FIRST, s)} ${pick(LAST, s, 4)}`;
function fakeText(s) {
  const len = Math.max(1, Math.min(60, Math.round(String(s).split(/\s+/).length)));
  if (/[ऀ-ॿ]/.test(s)) return pick(DEVANAGARI, s);
  const out = [];
  for (let i = 0; i < len; i++) out.push(pick(WORDS, `${s}:${i}`, i));
  const t = out.join(" ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}
const slug = (s) => fakeText(s).toLowerCase().split(" ").slice(0, 2).join("_");

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const MONTH = /^\d{4}-\d{2}$/;
const HHMM = /^\d{1,2}:\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX24 = /^[0-9a-f]{24,40}$/i;

function fakeString(v, key) {
  if (mapped.has(v)) return mapped.get(v);
  let out;
  if (v === "") out = "";
  else if (ISO.test(v) || DAY.test(v) || MONTH.test(v) || HHMM.test(v)) out = v; // times stay (relative to the capture)
  else if (UUID.test(v)) out = fakeUuid(v);
  else if (HEX24.test(v)) out = hash(`hex:${v}`).toString("hex").slice(0, v.length);
  else if ((ENUM_KEYS.test(key) && (CODE.test(v) || UNIT.test(v) || TZ.test(v))) || ROLE.test(v)) out = v;
  else if (/^\+?\d[\d\s-]{6,}$/.test(v)) out = `+9190000${String(hash(v).readUInt32BE(0) % 100000).padStart(5, "0")}`;
  else if (/@/.test(v) && !/\s/.test(v)) out = `${slug(v)}@world.kavach.test`;
  else if (/^https?:\/\//.test(v)) out = `https://example.com/${slug(v)}`;
  else if (/^\/(dashboard|e|join)\b/.test(v)) {
    // an app link: the path stays (ids invented); of the query only ?recipient= survives, as an invented id
    const u = new URL(v, "https://app.invalid");
    const path = u.pathname.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/gi, (m) => fakeUuid(m)).replace(/\/(e|join)\/[^/]+/, (m, k) => `/${k}/${slug(m)}`);
    const rid = u.searchParams.get("recipient");
    out = `${path}${rid ? `?recipient=${UUID.test(rid) ? fakeUuid(rid) : slug(rid)}` : ""}`;
  }
  else if (/^₹\s?[\d,.]+$/.test(v)) out = `₹${(hash(v).readUInt16BE(0) % 900) + 50}`;
  else if (/^-?\d+(\.\d+)?$/.test(v)) out = String(Number(v) > 50 ? Math.round(Number(v) * (0.9 + (hash(v)[0] % 20) / 100)) : v);
  else if (/^[a-z_]+:[^\s]+$/.test(v) && v.length < 80) out = `${v.split(":")[0]}:${slug(v)}`; // fact keys like medicine:x
  else if (/^(name|fullName|firstName|lastName|statedBy|by|assignee|assignedBy|recipientName|usedByName|inviterName|callAs|addressAs|called|caregiverName|displayName|requestedByName|actorName|who)$/.test(key))
    out = key === "firstName" ? pick(FIRST, v) : key === "lastName" ? pick(LAST, v) : fakeName(v);
  else out = fakeText(v);
  mapped.set(v, out);
  if (out !== v && v.length >= 4) captured.add(v);
  return out;
}

// counts, times and small readings stay; coordinates move to Pune; long numbers (pincodes, ids) and decimals are changed
function fakeNumber(n, key) {
  if (/lat|lon|lng/i.test(key)) return Math.round((/lat/i.test(key) ? 18.5 : 73.8) * 1000 + (hash(`${n}`)[0] % 100)) / 1000;
  if (Number.isInteger(n)) return n >= 10000 && n < 1e12 ? 100000 + (hash(`${n}`).readUInt32BE(0) % 800000) : n;
  if (Math.abs(n) < 1) return n;
  return Math.round(n * (0.92 + (hash(`${key}${n}`)[0] % 16) / 100) * 10) / 10;
}

function synth(v, key = "") {
  if (Array.isArray(v)) return v.map((x) => synth(x, key));
  if (v && typeof v === "object") {
    const o = {};
    for (const [k, x] of Object.entries(v)) {
      // object keys that are data (ids, names, days) are invented like values; code keys stay
      const nk = UUID.test(k) ? fakeUuid(k) : /^[a-z_][A-Za-z0-9_]*$/.test(k) || DAY.test(k) || MONTH.test(k) || HHMM.test(k) ? k : fakeString(k, "");
      o[nk] = synth(x, k);
    }
    return o;
  }
  if (typeof v === "string") return fakeString(v, key);
  if (typeof v === "number") return fakeNumber(v, key);
  return v;
}

// an admin-API capture ({ "/path/:param": [{ params, query, data }] }) becomes { routes: { "/admin/v1/…": data } }
const adminRoutes = {};
if (!live.families) {
  for (const [tmpl, rows] of Object.entries(live)) {
    if (!Array.isArray(rows)) continue;
    for (const r of rows) {
      if (r.status !== 200) continue;
      let p = tmpl;
      for (const [k, v] of Object.entries(r.params || {})) p = p.replace(`:${k}`, UUID.test(v) ? fakeUuid(v) : slug(v));
      const q = Object.entries(r.query || {}).map(([k, v]) => `${k}=${UUID.test(v) ? fakeUuid(v) : slug(v)}`).join("&");
      adminRoutes[`/admin/v1${p}${q ? `?${q}` : ""}`] = synth(r.data);
    }
  }
}
const families = (live.families || []).map((f, i) => {
  const routes = {};
  for (const [p, data] of Object.entries(f.routes)) {
    const path = p.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, (m) => fakeUuid(m));
    routes[path] = synth(data);
  }
  const people = f.people.map((p, j) => ({ ...p, id: fakeUuid(p.id), name: fakeName(p.id), first: pick(FIRST, p.id), surname: pick(LAST, p.id, 4), key: `p${j}`, relation: p.relation ? synth(p.relation, "relation") : "", city: "Pune", phone: null }));
  const engine = Object.fromEntries(Object.entries(f.engine).map(([sid, r]) => [fakeUuid(sid), synth(r)]));
  return { id: `shape${i + 1}`, familyId: fakeUuid(f.familyId), household: "live shapes", language: "en", people, engine, routes, places: [], shapes: [] };
});
const CODE_WORDS = new Set();
(function keys(v) {
  if (Array.isArray(v)) return v.forEach(keys);
  if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { if (/^[a-z_][A-Za-z0-9_]*$/.test(k)) CODE_WORDS.add(k.toLowerCase()); if (typeof x === "string" && CODE.test(x)) CODE_WORDS.add(x); keys(x); }
})([families, adminRoutes]);
const out = live.families ? { families, now: live.capturedAt || new Date().toISOString(), today: live.today, note: "invented families in production's response shapes (scripts/fixtures/make-shapes.mjs)" }
  : { routes: adminRoutes, now: new Date().toISOString(), note: "invented admin-API answers in production's shapes (kavach-dashboard scripts/fixtures/make-shapes.mjs)" };
const text = JSON.stringify(out);

// the guard: no captured sentence, name, address or phone may survive. Checked: every captured text of two or more words;
// every captured single word that is not plain lower-case code; every run of 7+ digits; every word of a person's name.
const decoded = (() => { try { return decodeURIComponent(text.replace(/%(?![0-9A-Fa-f]{2})/g, "%25")); } catch { return text; } })();
const outWords = new Set(`${text} ${decoded}`.split(/[^\p{L}\p{N}_]+/u));
const outLower = new Set([...outWords].map((w) => w.toLowerCase()));
const outDigits = new Set(text.match(/\d{7,}/g) || []);
const generic = new Set([...WORDS, ...FIRST, ...LAST, "saheli", "kavach", "family", "you", "self", "care", "elder", "member", "kolkata", "asia", "center", "audit", "capture", "kavach"].map((x) => x.toLowerCase()));
const leaks = [];
for (const c of captured) {
  const words = c.split(/[^\p{L}\p{N}_]+/u).filter(Boolean);
  if (/^[a-z0-9_:/-]+$/.test(c)) continue; // lower-case codes: fact kinds, routes, slugs of generic words
  if (words.length >= 2 && c.length >= 8 && !words.every((w) => generic.has(w.toLowerCase()) || /^\d+$/.test(w)) && (text.includes(JSON.stringify(c).slice(1, -1)) || decoded.includes(c))) leaks.push(c);
  else if (words.length === 1 && c.length >= 4 && !/^[a-z0-9_]+$/.test(c) && !/^\d/.test(c) && !generic.has(c.toLowerCase()) && outWords.has(c)) leaks.push(c);
  for (const d of c.match(/\d{7,}/g) || []) if (outDigits.has(d)) leaks.push(d);
}
const nameWords = new Set();
(function names(v, key = "") {
  if (Array.isArray(v)) return v.forEach((x) => names(x, key));
  if (v && typeof v === "object") {
    // a person: the name of anything that has a relation, a role, a user id or a phone
    if (typeof v.name === "string" && ["relation", "relationship", "role", "userId", "phone"].some((k) => k in v)) for (const w of v.name.split(/[^\p{L}]+/u)) if (w.length >= 3) nameWords.add(w.toLowerCase());
    return Object.entries(v).forEach(([k, x]) => names(x, k));
  }
  if (typeof v === "string" && /^(fullName|firstName|lastName|statedBy|by|assignee|assignedBy|recipientName|usedByName|inviterName|callAs|addressAs|called|caregiverName|requestedByName|actorName|displayName)$/.test(key)) for (const w of v.split(/[^\p{L}]+/u)) if (w.length >= 3) nameWords.add(w.toLowerCase());
})(live);
for (const f of live.families || []) for (const p of f.people) for (const w of String(p.name).split(/[^\p{L}]+/u)) if (w.length >= 3) nameWords.add(w.toLowerCase());
// and every word of an email, phone owner or address the capture holds
(function contacts(v) {
  if (Array.isArray(v)) return v.forEach(contacts);
  if (v && typeof v === "object") return Object.entries(v).forEach(([k, x]) => {
    if (typeof x === "string" && /^(email|address|line1|line2|landmark|city|area|locality|fullAddress|formatted)$/i.test(k)) for (const w of x.split(/[^\p{L}]+/u)) if (w.length >= 4) nameWords.add(w.toLowerCase());
    contacts(x);
  });
})(live);
for (const w of nameWords) if (outLower.has(w) && !generic.has(w) && !CODE_WORDS.has(w)) leaks.push(w);
for (const w of nameWords) if (FIRST.concat(LAST).some((x) => x.toLowerCase() === w)) leaks.push(w);
if (process.env.SHAPES_DEBUG) fs.writeFileSync("/tmp/dashbuilder-capture/leaks.json", JSON.stringify(leaks));
if (leaks.length) {
  console.error(`${leaks.length} captured strings found in the output; nothing written. Lengths: ${leaks.slice(0, 8).map((x) => x.length).join(", ")}`);
  process.exit(1);
}
fs.writeFileSync(output, zlib.gzipSync(text));
console.log(live.families ? `${families.length} families, ${families.reduce((n, f) => n + Object.keys(f.routes).length, 0)} answers, ${mapped.size} values invented → ${output}` : `${Object.keys(adminRoutes).length} admin answers, ${mapped.size} values invented → ${output}`);
