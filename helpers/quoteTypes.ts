import { FileAnalysis, QuoteTotals } from './quoteCalculator';

export interface QuoteResult extends QuoteTotals {
  quoteId: string;
  files: FileAnalysis[];
}

