import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function ensureQuoteId(): string {
  // Generate a short, human-friendly ID like CS + 5 base36 chars (e.g., CS7K9P1)
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  let result = "CS"
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export function toLanguageName(codeOrName: string): string {
  const languageMap: Record<string, string> = {
    en: "English",
    es: "Spanish",
    fr: "French",
    de: "German",
    it: "Italian",
    pt: "Portuguese",
    ru: "Russian",
    zh: "Chinese",
    ja: "Japanese",
    ko: "Korean",
    ar: "Arabic",
    hi: "Hindi",
    tr: "Turkish",
    pl: "Polish",
    nl: "Dutch",
    sv: "Swedish",
    da: "Danish",
    no: "Norwegian",
    fi: "Finnish",
    hr: "Croatian",
    sr: "Serbian",
    bg: "Bulgarian",
    ro: "Romanian",
    hu: "Hungarian",
    cs: "Czech",
    sk: "Slovak",
    sl: "Slovenian",
    et: "Estonian",
    lv: "Latvian",
    lt: "Lithuanian",
    uk: "Ukrainian",
    be: "Belarusian",
    mk: "Macedonian",
    sq: "Albanian",
    mt: "Maltese",
    ga: "Irish",
    cy: "Welsh",
    is: "Icelandic",
    fo: "Faroese",
    eu: "Basque",
    ca: "Catalan",
    gl: "Galician",
    pa: "Punjabi",
    ur: "Urdu",
    fa: "Persian",
    he: "Hebrew",
    th: "Thai",
    vi: "Vietnamese",
    id: "Indonesian",
    ms: "Malay",
    tl: "Filipino",
    sw: "Swahili",
    am: "Amharic",
    yo: "Yoruba",
    ig: "Igbo",
    ha: "Hausa",
    zu: "Zulu",
    xh: "Xhosa",
    af: "Afrikaans",
  }

  return languageMap[codeOrName.toLowerCase()] || codeOrName.charAt(0).toUpperCase() + codeOrName.slice(1).toLowerCase()
}
