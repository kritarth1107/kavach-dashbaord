/** Choices for the onboarding questions. Languages and dialects mirror the backend's language.service.ts. */

export type Med = { name: string; dose?: string; times: string[]; food?: "before_food" | "after_food" | "with_food" | "empty_stomach" | "any"; notes?: string };
export type Person = {
  relation: string;
  name: string;
  callThem?: string;
  addressAs?: string;
  gender?: "female" | "male" | "other";
  age?: number;
  city?: string;
  /** State, when Saheli worked it out from the city (to suggest the local bhasha first). */
  state?: string;
  livesWith?: "alone" | "spouse" | "me" | "family" | "care_home";
  language?: string;
  dialect?: string | null;
  reads?: "text" | "voice" | "both";
  phone?: string;
  /** Who gives store login codes (OTPs) for their orders: they themselves, or you (the caregiver). */
  codesFrom?: "self" | "me";
  conditions: string[];
  conditionsOther?: string;
  sugarCheck?: "daily" | "sometimes" | "no";
  bpMachine?: boolean;
  problems: string[];
  problemsOther?: string;
  allergies: { none?: boolean; items: string[] };
  medicines: Med[];
  noMedicines?: boolean;
  day: { wake?: string; breakfast?: string; lunch?: string; tea?: string; dinner?: string; sleep?: string; activities: string[]; notes?: string };
  doctor?: { name?: string; phone?: string; hospital?: string; nextVisit?: string };
  likes: string[];
  likesOther?: string;
  avoidTopics?: string;
};
export type Answers = {
  you: { name: string; callMe?: string; phone?: string };
  careFor?: "mother" | "father" | "both_parents" | "grandmother" | "grandfather" | "spouse" | "self" | "other";
  persons: Person[];
  helpWith: string[];
  emergency?: { name?: string; phone?: string; relation?: string };
  followups: Array<{ q: string; a: string }>;
  anythingElse?: string;
};

export const emptyPerson = (relation: string): Person => ({
  relation,
  name: "",
  conditions: [],
  problems: [],
  allergies: { items: [] },
  medicines: [],
  day: { wake: "06:30", breakfast: "08:30", lunch: "13:00", tea: "17:00", dinner: "20:30", sleep: "22:00", activities: [] },
  likes: [],
});

export const CARE_FOR = [
  { id: "mother", label: "My mother", hint: "Maa, Amma, Mummy" },
  { id: "father", label: "My father", hint: "Papa, Appa, Baba" },
  { id: "both_parents", label: "Both my parents", hint: "Set up both, one after the other" },
  { id: "grandmother", label: "My grandmother", hint: "Dadi, Nani, Ammamma" },
  { id: "grandfather", label: "My grandfather", hint: "Dadu, Nana, Thatha" },
  { id: "spouse", label: "My husband or wife", hint: "Your partner" },
  { id: "self", label: "Myself", hint: "Saheli looks after you" },
  { id: "other", label: "Someone else", hint: "An aunt, uncle, neighbour…" },
] as const;

export const RELATION_OF: Record<string, string> = { mother: "Mother", father: "Father", grandmother: "Grandmother", grandfather: "Grandfather", spouse: "Spouse", self: "Self", other: "Relative" };

export const GENDER_OF: Record<string, Person["gender"]> = { Mother: "female", Grandmother: "female", Father: "male", Grandfather: "male" };

export const CALL_NAMES: Record<string, string[]> = {
  Mother: ["Maa", "Mummy", "Amma", "Aai", "Ammi", "Mom", "Ma", "Bebe", "Baa"],
  Father: ["Papa", "Pitaji", "Appa", "Baba", "Abbu", "Dad", "Bauji", "Nanna", "Daddy"],
  Grandmother: ["Dadi", "Nani", "Ammamma", "Aaji", "Paati", "Thakuma", "Biji"],
  Grandfather: ["Dadu", "Nana", "Thatha", "Ajoba", "Dadaji", "Nanaji", "Thakurda"],
  Spouse: [],
  Relative: ["Mausi", "Bua", "Chacha", "Mama", "Aunty", "Uncle"],
  Self: [],
};

export const LANGUAGES = [
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "bn", name: "Bengali", native: "বাংলা" },
  { code: "mr", name: "Marathi", native: "मराठी" },
  { code: "ta", name: "Tamil", native: "தமிழ்" },
  { code: "te", name: "Telugu", native: "తెలుగు" },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ml", name: "Malayalam", native: "മലയാളം" },
  { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "or", name: "Odia", native: "ଓଡ଼ିଆ" },
  { code: "as", name: "Assamese", native: "অসমীয়া" },
  { code: "ur", name: "Urdu", native: "اردو" },
  { code: "ne", name: "Nepali", native: "नेपाली" },
  { code: "kok", name: "Konkani", native: "कोंकणी" },
  { code: "en", name: "English", native: "English" },
];

export const DIALECTS: Array<{ code: string; name: string; native: string; base: string; region: string }> = [
  { code: "mwr", name: "Marwari", native: "मारवाड़ी", base: "hi", region: "Jodhpur, Bikaner, Nagaur" },
  { code: "mtr", name: "Mewari", native: "मेवाड़ी", base: "hi", region: "Udaipur, Chittorgarh" },
  { code: "dhd", name: "Dhundhari (Jaipuri)", native: "ढूंढाड़ी", base: "hi", region: "Jaipur" },
  { code: "swv", name: "Shekhawati", native: "शेखावाटी", base: "hi", region: "Sikar, Jhunjhunu, Churu" },
  { code: "hoj", name: "Hadoti", native: "हाड़ौती", base: "hi", region: "Kota, Bundi" },
  { code: "wbr", name: "Wagdi", native: "वागड़ी", base: "hi", region: "Dungarpur, Banswara" },
  { code: "bgc", name: "Haryanvi", native: "हरियाणवी", base: "hi", region: "Haryana" },
  { code: "bho", name: "Bhojpuri", native: "भोजपुरी", base: "hi", region: "East UP, West Bihar" },
  { code: "mai", name: "Maithili", native: "मैथिली", base: "hi", region: "Mithila, North Bihar" },
  { code: "mag", name: "Magahi", native: "मगही", base: "hi", region: "Patna, Gaya" },
  { code: "anp", name: "Angika", native: "अंगिका", base: "hi", region: "Bhagalpur" },
  { code: "bjj", name: "Bajjika", native: "बज्जिका", base: "hi", region: "Vaishali, Muzaffarpur" },
  { code: "awa", name: "Awadhi", native: "अवधी", base: "hi", region: "Lucknow, Ayodhya" },
  { code: "bns", name: "Bundeli", native: "बुंदेली", base: "hi", region: "Jhansi, Sagar" },
  { code: "bfy", name: "Bagheli", native: "बघेली", base: "hi", region: "Rewa, Satna" },
  { code: "hne", name: "Chhattisgarhi", native: "छत्तीसगढ़ी", base: "hi", region: "Chhattisgarh" },
  { code: "bra", name: "Braj", native: "ब्रज", base: "hi", region: "Mathura, Agra" },
  { code: "mup", name: "Malvi", native: "मालवी", base: "hi", region: "Indore, Ujjain" },
  { code: "noe", name: "Nimadi", native: "निमाड़ी", base: "hi", region: "Khandwa, Khargone" },
  { code: "gbm", name: "Garhwali", native: "गढ़वाली", base: "hi", region: "Garhwal" },
  { code: "kfy", name: "Kumaoni", native: "कुमाऊँनी", base: "hi", region: "Kumaon" },
  { code: "him", name: "Pahari (Himachali)", native: "पहाड़ी", base: "hi", region: "Himachal" },
  { code: "doi", name: "Dogri", native: "डोगरी", base: "hi", region: "Jammu" },
  { code: "sck", name: "Sadri (Nagpuri)", native: "सादरी", base: "hi", region: "Jharkhand" },
  { code: "vah", name: "Varhadi", native: "वऱ्हाडी", base: "mr", region: "Vidarbha" },
  { code: "mlv", name: "Malvani", native: "मालवणी", base: "mr", region: "Sindhudurg, Konkan" },
  { code: "ahr", name: "Ahirani", native: "अहिराणी", base: "mr", region: "Khandesh" },
  { code: "tcy", name: "Tulu", native: "ತುಳು", base: "kn", region: "Mangaluru, Udupi" },
  { code: "kfa", name: "Kodava", native: "ಕೊಡವ", base: "kn", region: "Coorg" },
  { code: "syl", name: "Sylheti", native: "সিলেটি", base: "bn", region: "Silchar, Sylhet" },
  { code: "spv", name: "Sambalpuri", native: "ସମ୍ବଲପୁରୀ", base: "or", region: "West Odisha" },
  { code: "kth", name: "Kathiawadi", native: "કાઠિયાવાડી", base: "gu", region: "Saurashtra" },
];

export const CONDITIONS = ["Diabetes (sugar)", "High BP", "Heart problem", "Thyroid", "Arthritis / joint pain", "Asthma / COPD", "Kidney problem", "Memory problems", "Parkinson's", "Had a stroke", "Depression / low mood", "Weak eyesight", "Hard of hearing", "Osteoporosis"];
export const PROBLEMS = ["Knee pain", "Back pain", "Poor sleep", "Feels lonely", "Forgets things", "Weakness", "Acidity", "Constipation", "Dizziness", "Low appetite", "Walking difficulty", "Breathlessness"];
export const ALLERGIES = ["Penicillin", "Sulfa drugs", "Aspirin", "Ibuprofen / painkillers", "Peanuts", "Milk / dairy", "Gluten", "Eggs", "Seafood", "Dust / pollen"];
export const ACTIVITIES = ["Morning walk", "Puja / prayer", "Yoga", "Newspaper", "TV serials", "Afternoon nap", "Temple visit", "Evening walk", "Gardening", "Calls with family", "Cooking", "Bhajans"];
export const LIKES = ["Grandchildren", "Old Hindi songs", "Bhajans", "Cooking & recipes", "Cricket", "Old movies", "Gardening", "News", "Religion & festivals", "Their village / hometown", "Health tips", "Stories from the past"];
export const HELP_WITH = [
  { id: "reminders", label: "Medicine reminders", hint: "On time, every day, in their language" },
  { id: "checkins", label: "Daily check-ins", hint: "Morning and evening: how are you, did you eat?" },
  { id: "company", label: "Company & conversation", hint: "Someone to talk to when they feel alone" },
  { id: "orders", label: "Ordering medicines & groceries", hint: "Cash on delivery, on their usual apps" },
  { id: "appointments", label: "Doctor appointments", hint: "Reminders and questions to ask" },
  { id: "mood", label: "Mood & wellbeing", hint: "Notices if something seems off" },
];
export const DAY_SLOTS: Array<{ key: "wake" | "breakfast" | "lunch" | "tea" | "dinner" | "sleep"; label: string }> = [
  { key: "wake", label: "Wakes up" },
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "tea", label: "Evening tea" },
  { key: "dinner", label: "Dinner" },
  { key: "sleep", label: "Goes to sleep" },
];

export const pronoun = (p: Person) => (p.gender === "male" || GENDER_OF[p.relation] === "male" ? { they: "he", them: "him", their: "his", They: "He" } : p.gender === "female" || GENDER_OF[p.relation] === "female" ? { they: "she", them: "her", their: "her", They: "She" } : { they: "they", them: "them", their: "their", They: "They" });

/** Dose slots follow their meals: a morning tablet "after food" is at their breakfast time. */
export function slotTimes(p: Person) {
  return { morning: p.day.breakfast || "08:30", afternoon: p.day.lunch || "13:00", evening: p.day.tea || "17:00", night: p.day.dinner || "20:30" };
}
