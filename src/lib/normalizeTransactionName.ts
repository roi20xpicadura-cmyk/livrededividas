/**
 * Normaliza descrições brutas de cartão/extrato em nomes amigáveis.
 * Ex.: "NETFLIX.COM"        -> "Netflix"
 *      "UBER *TRIP"          -> "Uber"
 *      "IFOOD*LANCHONETE"    -> "iFood"
 *      "MERCADOLIVRE * 1234" -> "Mercado Livre"
 */

// Marcas conhecidas (lowercase key -> display name)
const KNOWN_BRANDS: Record<string, string> = {
  netflix: "Netflix",
  spotify: "Spotify",
  "amazon prime": "Amazon Prime",
  "prime video": "Prime Video",
  amazon: "Amazon",
  "disney plus": "Disney+",
  "disney+": "Disney+",
  disney: "Disney+",
  hbo: "HBO Max",
  "hbo max": "HBO Max",
  globoplay: "Globoplay",
  "youtube premium": "YouTube Premium",
  youtube: "YouTube",
  "apple music": "Apple Music",
  "apple tv": "Apple TV+",
  icloud: "iCloud",
  apple: "Apple",
  google: "Google",
  microsoft: "Microsoft",
  uber: "Uber",
  "99": "99",
  ifood: "iFood",
  rappi: "Rappi",
  "smart fit": "Smart Fit",
  smartfit: "Smart Fit",
  bioritmo: "Bio Ritmo",
  starbucks: "Starbucks",
  mcdonalds: "McDonald's",
  "mc donalds": "McDonald's",
  burger: "Burger King",
  "burger king": "Burger King",
  subway: "Subway",
  shell: "Shell",
  petrobras: "Petrobras",
  ipiranga: "Ipiranga",
  ale: "Ale",
  drogasil: "Drogasil",
  "drogaria sao paulo": "Drogaria São Paulo",
  raia: "Droga Raia",
  "drogaraia": "Droga Raia",
  pague: "Pague Menos",
  "pague menos": "Pague Menos",
  carrefour: "Carrefour",
  extra: "Extra",
  pao: "Pão de Açúcar",
  "pao de acucar": "Pão de Açúcar",
  assai: "Assaí",
  atacadao: "Atacadão",
  sams: "Sam's Club",
  "sams club": "Sam's Club",
  "mercado livre": "Mercado Livre",
  mercadolivre: "Mercado Livre",
  shopee: "Shopee",
  aliexpress: "AliExpress",
  magalu: "Magazine Luiza",
  "magazine luiza": "Magazine Luiza",
  americanas: "Americanas",
  riachuelo: "Riachuelo",
  renner: "Renner",
  cea: "C&A",
  "c&a": "C&A",
  zara: "Zara",
  nike: "Nike",
  adidas: "Adidas",
  centauro: "Centauro",
  netshoes: "Netshoes",
  pix: "Pix",
  ted: "TED",
  doc: "DOC",
};

// Sufixos / prefixos comuns a remover
const NOISE_TOKENS = [
  "com",
  "br",
  "ltda",
  "me",
  "sa",
  "pag*",
  "pag",
  "pagseguro",
  "mp",
  "mercadopago",
  "compra",
  "compra no debito",
  "debito",
  "credito",
  "trip",
  "ride",
  "premium",
  "store",
  "online",
  "loja",
];

function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((w) => {
      if (w.length <= 2) return w.toUpperCase(); // siglas curtas
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}

export function normalizeTransactionName(raw: string | null | undefined): string {
  if (!raw) return "";
  let s = String(raw).trim();
  if (!s) return "";

  // Heurística rápida: testar marca conhecida no texto cru (lowercase)
  const lower = s.toLowerCase();
  for (const key of Object.keys(KNOWN_BRANDS)) {
    // limite de palavra para evitar falso positivo
    const re = new RegExp(`(^|[^a-z0-9])${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`, "i");
    if (re.test(lower)) return KNOWN_BRANDS[key];
  }

  // Limpeza geral
  s = s
    // remove protocolos / domínios
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/www\.\S+/gi, " ")
    .replace(/\.(com|br|net|org|io|app)(\.[a-z]{2})?/gi, " ")
    // remove asteriscos e separadores comuns de extrato
    .replace(/[*#@_/\\|]+/g, " ")
    // remove códigos numéricos longos / referências
    .replace(/\b\d{3,}\b/g, " ")
    // remove pontuação restante
    .replace(/[^\p{L}\p{N}\s&'+-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Remove tokens-ruído
  const tokens = s.split(" ").filter((t) => {
    const tl = t.toLowerCase();
    if (!tl) return false;
    if (NOISE_TOKENS.includes(tl)) return false;
    return true;
  });

  if (tokens.length === 0) return titleCase(s);

  // Limita a até 4 palavras significativas
  const trimmed = tokens.slice(0, 4).join(" ");

  // Verifica novamente se o resultado limpo bate com uma marca
  const cleanedLower = trimmed.toLowerCase();
  for (const key of Object.keys(KNOWN_BRANDS)) {
    if (cleanedLower === key || cleanedLower.startsWith(key + " ")) {
      return KNOWN_BRANDS[key];
    }
  }

  return titleCase(trimmed);
}