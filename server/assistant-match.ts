const FILLER = new Set([
  "a",
  "o",
  "os",
  "as",
  "um",
  "uma",
  "de",
  "da",
  "do",
  "das",
  "dos",
  "quero",
  "queria",
  "por",
  "favor",
  "com",
  "para",
  "pra",
  "no",
  "na",
  "loja",
  "item",
  "produto",
]);

const OPTION_WORDS = ["grande", "broto", "media", "medio", "pequeno", "familia", "gigante"];

function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function splitOrderPhrase(phrase: string) {
  const words = fold(phrase)
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 1 && !FILLER.has(word));
  const optionWords = words.filter((word) =>
    OPTION_WORDS.some((option) => option === word || option.startsWith(word)),
  );
  const productWords = words.filter((word) => !optionWords.includes(word));
  return { productWords, optionWords };
}

export function phraseMatchesName(phrase: string, name: string) {
  const { productWords } = splitOrderPhrase(phrase);
  const folded = fold(name);
  if (!productWords.length) return false;
  return productWords.every((word) => folded.includes(word));
}
