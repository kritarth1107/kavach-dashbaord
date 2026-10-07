/**
 * Which bhashas to offer first, from where the person lives: "Jodhpur" → Marwari first, "Patna" → Magahi, Bhojpuri,
 * Maithili. The understanding step usually returns the state; the city list covers a typed city when it can't.
 */
import { DIALECTS, LANGUAGES } from "../data";

/** Codes (dialects or languages) most families in a state speak at home, most common first. */
const STATE_TOP: Record<string, string[]> = {
  rajasthan: ["mwr", "dhd", "mtr", "swv", "hoj", "wbr"],
  haryana: ["bgc", "hi"],
  delhi: ["hi", "pa", "bgc"],
  "uttar pradesh": ["awa", "bho", "bra", "bns", "hi"],
  bihar: ["bho", "mag", "mai", "bjj", "anp"],
  jharkhand: ["sck", "bho", "mag", "hi"],
  "madhya pradesh": ["mup", "bns", "bfy", "noe", "hi"],
  chhattisgarh: ["hne", "hi"],
  uttarakhand: ["gbm", "kfy", "hi"],
  "himachal pradesh": ["him", "hi"],
  "jammu and kashmir": ["doi", "ur", "hi"],
  jammu: ["doi", "hi"],
  punjab: ["pa", "hi"],
  chandigarh: ["pa", "hi"],
  gujarat: ["gu", "kth"],
  maharashtra: ["mr", "vah", "ahr", "mlv"],
  goa: ["kok", "mr"],
  karnataka: ["kn", "tcy", "kfa"],
  kerala: ["ml"],
  "tamil nadu": ["ta"],
  puducherry: ["ta"],
  "andhra pradesh": ["te"],
  telangana: ["te", "ur"],
  "west bengal": ["bn"],
  odisha: ["or", "spv"],
  assam: ["as", "syl", "bn"],
  tripura: ["bn"],
  sikkim: ["ne"],
};

/** Common cities and towns → state (lower case). */
const CITY_STATE: Record<string, string> = Object.fromEntries(
  Object.entries({
    rajasthan: "jodhpur bikaner nagaur barmer jaisalmer pali jalore sirohi udaipur chittorgarh rajsamand bhilwara jaipur dausa tonk ajmer alwar bharatpur sikar jhunjhunu churu kota bundi baran jhalawar dungarpur banswara sri ganganagar hanumangarh",
    haryana: "gurgaon gurugram faridabad rohtak hisar panipat karnal sonipat ambala bhiwani jind sirsa rewari",
    delhi: "delhi new delhi noida ghaziabad",
    "uttar pradesh": "lucknow kanpur varanasi banaras prayagraj allahabad agra mathura vrindavan meerut aligarh bareilly gorakhpur ayodhya faizabad jhansi moradabad saharanpur azamgarh ballia jaunpur mirzapur sultanpur rae bareli",
    bihar: "patna gaya bhagalpur muzaffarpur darbhanga madhubani purnia arrah ara buxar chapra siwan vaishali hajipur begusarai samastipur sasaram",
    jharkhand: "ranchi jamshedpur dhanbad bokaro hazaribagh deoghar",
    "madhya pradesh": "indore bhopal ujjain gwalior jabalpur sagar rewa satna khandwa khargone dewas ratlam chhindwara",
    chhattisgarh: "raipur bilaspur durg bhilai korba raigarh jagdalpur rajnandgaon",
    uttarakhand: "dehradun haridwar rishikesh nainital haldwani almora pauri tehri garhwal pithoragarh",
    "himachal pradesh": "shimla dharamshala mandi kullu solan hamirpur kangra",
    jammu: "jammu kathua udhampur",
    punjab: "amritsar ludhiana jalandhar patiala bathinda mohali pathankot",
    chandigarh: "chandigarh",
    gujarat: "ahmedabad surat vadodara baroda rajkot bhavnagar jamnagar junagadh gandhinagar anand porbandar",
    maharashtra: "mumbai pune nagpur nashik aurangabad thane kolhapur solapur amravati akola jalgaon dhule ratnagiri sindhudurg",
    goa: "panaji panjim margao vasco goa",
    karnataka: "bengaluru bangalore mysuru mysore mangaluru mangalore udupi hubli dharwad belagavi belgaum madikeri coorg shivamogga",
    kerala: "kochi cochin thiruvananthapuram trivandrum kozhikode calicut thrissur kollam kannur kottayam",
    "tamil nadu": "chennai madras coimbatore madurai tiruchirappalli trichy salem tirunelveli vellore erode thanjavur",
    puducherry: "puducherry pondicherry",
    "andhra pradesh": "visakhapatnam vizag vijayawada guntur nellore tirupati kakinada rajahmundry kurnool",
    telangana: "hyderabad secunderabad warangal karimnagar nizamabad khammam",
    "west bengal": "kolkata calcutta howrah siliguri durgapur asansol kharagpur",
    odisha: "bhubaneswar cuttack puri rourkela sambalpur berhampur balasore",
    assam: "guwahati dibrugarh jorhat silchar tezpur",
    tripura: "agartala",
    sikkim: "gangtok",
  }).flatMap(([state, cities]) => {
    // two-word names are kept whole by listing them with a space in the string above
    const known = ["new delhi", "rae bareli", "sri ganganagar"];
    const words = cities.split(" ");
    const names: string[] = [];
    for (let i = 0; i < words.length; i++) {
      const two = `${words[i]} ${words[i + 1] ?? ""}`;
      if (known.includes(two)) {
        names.push(two);
        i++;
      } else names.push(words[i]);
    }
    return names.map((c) => [c, state]);
  }),
);

export type LangOption = { code: string; name: string; native: string; region?: string; dialect: boolean; base: string };

export const option = (code: string): LangOption | undefined => {
  const d = DIALECTS.find((x) => x.code === code);
  if (d) return { code: d.code, name: d.name.split(" (")[0], native: d.native, region: d.region, dialect: true, base: d.base };
  const l = LANGUAGES.find((x) => x.code === code);
  return l ? { code: l.code, name: l.name, native: l.native, dialect: false, base: l.code } : undefined;
};

export function stateOf(city?: string, state?: string): string | undefined {
  const s = state?.trim().toLowerCase().replace(/&/g, "and");
  if (s && STATE_TOP[s]) return s;
  const c = city?.trim().toLowerCase().replace(/[,.].*$/, "");
  return c ? CITY_STATE[c] : undefined;
}

/** What people around this city speak at home, most likely first (the city's own dialect ahead of the state's list). */
export function regionTop(city?: string, state?: string): LangOption[] {
  const st = stateOf(city, state);
  if (!st) return [];
  const codes = [...STATE_TOP[st]];
  const c = city?.trim().toLowerCase();
  if (c) {
    const own = DIALECTS.find((d) => d.region.toLowerCase().split(/[,()]/).map((x) => x.trim()).includes(c));
    if (own) codes.splice(0, codes.length, own.code, ...codes.filter((x) => x !== own.code));
  }
  return codes.map(option).filter((x): x is LangOption => !!x);
}

const GREETING: Record<string, string> = {
  mwr: "राम राम सा", mtr: "राम राम सा", dhd: "राम राम सा", swv: "राम राम सा", hoj: "राम राम सा", wbr: "राम राम सा", bgc: "राम राम", bho: "प्रणाम",
  mai: "प्रणाम", mag: "प्रणाम", anp: "प्रणाम", bjj: "प्रणाम", awa: "राम राम", bns: "राम राम", bfy: "राम राम", hne: "जय जोहार", bra: "राधे राधे",
  mup: "राम राम", noe: "राम राम", gbm: "सेवा लगाणु छौं", kfy: "पैलाग", him: "राम राम", doi: "राम राम", sck: "जोहार", vah: "राम राम",
  mlv: "नमस्कार", ahr: "राम राम", tcy: "ನಮಸ್ಕಾರ", kfa: "ನಮಸ್ಕಾರ", syl: "নমস্কার", spv: "ନମସ୍କାର", kth: "જય શ્રી કૃષ્ણ",
  hi: "नमस्ते", en: "Hello", bn: "নমস্কার", mr: "नमस्कार", ta: "வணக்கம்", te: "నమస్కారం", gu: "નમસ્તે", kn: "ನಮಸ್ಕಾರ", ml: "നമസ്കാരം",
  pa: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ", or: "ନମସ୍କାର", as: "নমস্কাৰ", ur: "آداب", ne: "नमस्ते", kok: "नमस्कार",
};
const SCRIPT: Record<string, string> = {
  hi: "Devanagari", mr: "Devanagari", ne: "Devanagari", kok: "Devanagari", bn: "Bengali script", as: "Assamese script", ta: "Tamil script",
  te: "Telugu script", gu: "Gujarati script", kn: "Kannada script", ml: "Malayalam script", pa: "Gurmukhi", or: "Odia script", ur: "Urdu script",
};

export const greetingFor = (language?: string, dialect?: string | null) => GREETING[dialect || ""] || GREETING[language || ""] || "नमस्ते";
export const scriptFor = (language?: string) => SCRIPT[language || ""];

/** Every language and bhasha, for the search box. */
export const ALL_OPTIONS: LangOption[] = [...DIALECTS.map((d) => d.code), ...LANGUAGES.map((l) => l.code)].map(option).filter((x): x is LangOption => !!x);

export function searchOptions(q: string): LangOption[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  return ALL_OPTIONS.filter((o) => o.name.toLowerCase().includes(s) || o.native.includes(q.trim()) || (o.region || "").toLowerCase().includes(s)).slice(0, 8);
}
