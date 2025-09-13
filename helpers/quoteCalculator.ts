// Placeholder helper utilities for file analysis and quote calculations.
// Replace simulated logic with real Google Vision and Gemini integrations in production.

export interface PageAnalysis {
  pageNumber: number;
  wordCount: number;
  complexity: 'Easy' | 'Medium' | 'Hard';
  complexityMultiplier: number;
  ppwc: number; // pages * price per word with complexity
  billablePages: number;
}

export interface FileAnalysis {
  fileId: string;
  filename: string;
  pageCount: number;
  pages: PageAnalysis[];
}

export interface QuoteTotals {
  perPageRate: number;
  totalBillablePages: number;
  certType: string;
  certPrice: number;
  quoteTotal: number;
}

export const languages = [
  { languageName: 'English', tier: 'A' },
  { languageName: 'Spanish', tier: 'A' },
  { languageName: 'French', tier: 'B' },
  { languageName: 'German', tier: 'B' },
  { languageName: 'Japanese', tier: 'C' },
];

export const tiers: Record<string, number> = {
  A: 1.0,
  B: 1.2,
  C: 1.4,
};

export const certificationTypes: Record<string, { price: number; description: string }> = {
  standard: { price: 20, description: 'Standard certification' },
  notarized: { price: 40, description: 'Notarized certification' },
};

export const certificationMap: Record<string, string> = {
  USCIS: 'standard',
  Court: 'notarized',
};

export const appSettings = {
  baseRate: 65,
  wordsPerPage: 240,
};

const complexityMultipliers: Record<'Easy' | 'Medium' | 'Hard', number> = {
  Easy: 1.0,
  Medium: 1.1,
  Hard: 1.2,
};

// Simulated analysis. Replace with Vision OCR and Gemini in production.
export async function analyzeFiles(files: File[]): Promise<FileAnalysis[]> {
  return Promise.all(
    files.map(async (file, idx) => {
      const pageCount = Math.max(1, Math.ceil(Math.random() * 3));
      const pages: PageAnalysis[] = [];
      for (let i = 0; i < pageCount; i++) {
        const wordCount = 150 + Math.floor(Math.random() * 150);
        const complexity = (['Easy', 'Medium', 'Hard'] as const)[Math.floor(Math.random() * 3)];
        const complexityMultiplier = complexityMultipliers[complexity];
        const ppwc = wordCount * complexityMultiplier;
        const billablePages = Math.ceil((ppwc / appSettings.wordsPerPage) * 10) / 10;
        pages.push({
          pageNumber: i + 1,
          wordCount,
          complexity,
          complexityMultiplier,
          ppwc,
          billablePages,
        });
      }
      return {
        fileId: `f${idx + 1}`,
        filename: file.name,
        pageCount,
        pages,
      };
    })
  );
}

// Calculate final totals, enforcing minimum one billable page across quote.
export function calculateQuote(files: FileAnalysis[], form: { sourceLanguage: string; targetLanguage: string; intendedUse: string }): QuoteTotals {
  const tierRank: Record<string, number> = { A: 1, B: 2, C: 3 };
  const sourceTier = languages.find(l => l.languageName === form.sourceLanguage)?.tier || 'A';
  const targetTier = languages.find(l => l.languageName === form.targetLanguage)?.tier || 'A';
  const tier = tierRank[sourceTier] > tierRank[targetTier] ? sourceTier : targetTier;
  const perPageRate = appSettings.baseRate * tiers[tier];

  let totalBillable = files.reduce((sum, f) => sum + f.pages.reduce((pSum, p) => pSum + p.billablePages, 0), 0);
  if (totalBillable < 1 && files.length > 0 && files[0].pages.length > 0) {
    const firstPage = files[0].pages[0];
    totalBillable = totalBillable - firstPage.billablePages + 1;
    firstPage.billablePages = 1;
  }

  const certType = certificationMap[form.intendedUse] || 'standard';
  const certPrice = certificationTypes[certType].price;
  const quoteTotal = totalBillable * perPageRate + certPrice;

  return { perPageRate, totalBillablePages: totalBillable, certType, certPrice, quoteTotal };
}
