import React from 'react';
import { calculateQuote, FileAnalysis } from '../helpers/quoteCalculator';

interface QuoteResultsProps {
  result: any;
  onReset: () => void;
}

const QuoteResults: React.FC<QuoteResultsProps> = ({ result, onReset }) => {
  const wordCount = result?.data?.wordCount || 0;
  const complexity = result?.data?.complexity || 'Medium';
  const complexityMultiplier = result?.data?.complexityMultiplier || 1;
  const ppwc = result?.data?.ppwc || 0;
  const billablePages = result?.data?.billablePages || 0;

  const files: FileAnalysis[] = [
    {
      fileId: result.id?.toString() || 'file1',
      filename: result.data?.filePath?.split('/').pop() || 'file',
      pageCount: 1,
      pages: [
        { pageNumber: 1, wordCount, complexity, complexityMultiplier, ppwc, billablePages },
      ],
    },
  ];

  const totals = calculateQuote(files, {
    sourceLanguage: result.data?.sourceLang || 'English',
    targetLanguage: result.data?.targetLang || 'English',
    intendedUse: result.data?.intendedUse || 'USCIS',
  });

  return (
    <div className="max-w-3xl mx-auto p-4" role="region" aria-live="polite">
      <h2 className="text-2xl font-semibold mb-4">Quote Results</h2>
      <table className="w-full border mb-4">
        <thead>
          <tr className="bg-slate-100 dark:bg-slate-800">
            <th className="p-2 text-left">File</th>
            <th className="p-2 text-left">Word Count</th>
            <th className="p-2 text-left">Complexity</th>
            <th className="p-2 text-left">Billable Pages</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="p-2">{files[0].filename}</td>
            <td className="p-2">{wordCount}</td>
            <td className="p-2">{complexity}</td>
            <td className="p-2">{billablePages.toFixed(1)}</td>
          </tr>
        </tbody>
      </table>
      <div className="mb-4">
        <p>Per Page Rate: ${totals.perPageRate.toFixed(2)}</p>
        <p>Total Billable Pages: {totals.totalBillablePages.toFixed(1)}</p>
        <p>Certification: {totals.certType} (${totals.certPrice.toFixed(2)})</p>
        <p className="font-semibold">Quote Total: ${totals.quoteTotal.toFixed(2)}</p>
      </div>
      <button onClick={onReset} className="px-4 py-2 bg-[var(--accent-color)] text-white rounded">Start Over</button>
    </div>
  );
};

export default QuoteResults;
