import React from 'react';
import { QuoteResult } from '../helpers/quoteTypes';

interface QuoteScreenProps {
  result: QuoteResult;
  onPay: () => void;
}

const QuoteScreen: React.FC<QuoteScreenProps> = ({ result, onPay }) => {
  return (
    <div className="space-y-4" aria-label="Quote details">
      <h2 className="text-xl font-semibold">Quote ID: {result.quoteId}</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm" role="table">
          <thead>
            <tr className="bg-gray-100 dark:bg-slate-700">
              <th className="p-2 text-left">File</th>
              <th className="p-2 text-left">Page</th>
              <th className="p-2 text-left">Wordcount</th>
              <th className="p-2 text-left">Complexity</th>
              <th className="p-2 text-left">Multiplier</th>
              <th className="p-2 text-left">PPWC</th>
              <th className="p-2 text-left">Billable Pages</th>
            </tr>
          </thead>
          <tbody>
            {result.files.map(f => (
              <React.Fragment key={f.fileId}>
                <tr className="bg-gray-50 dark:bg-slate-700 font-semibold">
                  <td className="p-2" colSpan={7}>{f.filename}</td>
                </tr>
                {f.pages.map(p => (
                  <tr key={p.pageNumber} className="border-b">
                    <td className="p-2"></td>
                    <td className="p-2">{p.pageNumber}</td>
                    <td className="p-2">{p.wordCount}</td>
                    <td className="p-2">{p.complexity}</td>
                    <td className="p-2">{p.complexityMultiplier.toFixed(2)}</td>
                    <td className="p-2">{p.ppwc.toFixed(2)}</td>
                    <td className="p-2">{p.billablePages.toFixed(2)}</td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 border rounded grid grid-cols-1 md:grid-cols-2 gap-2">
        <p><strong>Per-page rate:</strong> ${result.perPageRate.toFixed(2)}</p>
        <p><strong>Total billable pages:</strong> {result.totalBillablePages.toFixed(2)}</p>
        <p><strong>Certification:</strong> {result.certType} (${result.certPrice.toFixed(2)})</p>
        <p className="text-lg font-semibold">Final Total: ${result.quoteTotal.toFixed(2)}</p>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Billable pages are calculated from word count and complexity. Minimum charge of one page per quote.
      </p>
      <button
        onClick={onPay}
        className="w-full md:w-auto bg-[var(--accent-color)] hover:bg-[var(--accent-color-dark)] text-white py-2 px-6 rounded"
      >
        Accept and Pay
      </button>
    </div>
  );
};

export default QuoteScreen;

