import React, { useState, useRef } from 'react';
import { analyzeFiles, calculateQuote, FileAnalysis, QuoteTotals } from '../helpers/quoteCalculator';

interface FormState {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  sourceLanguage: string;
  targetLanguage: string;
  intendedUse: string;
  uploadedFiles: File[];
}

const initialForm: FormState = {
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  sourceLanguage: '',
  targetLanguage: '',
  intendedUse: '',
  uploadedFiles: [],
};

interface Result extends QuoteTotals {
  quoteId: string;
  files: FileAnalysis[];
}

const QuoteRequestForm: React.FC = () => {
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [quoteCounter, setQuoteCounter] = useState(() => Math.floor(Math.random() * 90000));
  const fileInput = useRef<HTMLInputElement | null>(null);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.customerName.trim()) newErrors.customerName = 'Name is required.';
    if (!form.customerEmail.trim()) newErrors.customerEmail = 'Email is required.';
    else if (!/^\S+@\S+\.\S+$/.test(form.customerEmail)) newErrors.customerEmail = 'Invalid email address.';
    if (!form.sourceLanguage) newErrors.sourceLanguage = 'Source language is required.';
    if (!form.targetLanguage) newErrors.targetLanguage = 'Target language is required.';
    if (!form.intendedUse) newErrors.intendedUse = 'Intended use is required.';
    if (form.uploadedFiles.length === 0) newErrors.uploadedFiles = 'At least one file is required.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFiles = (files: FileList) => {
    const accepted = Array.from(files).filter(f => {
      const validType = ['application/pdf','image/jpeg','image/png','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(f.type);
      const validSize = f.size <= 10 * 1024 * 1024;
      return validType && validSize;
    });
    setForm(prev => ({ ...prev, uploadedFiles: [...prev.uploadedFiles, ...accepted] }));
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  };

  const removeFile = (index: number) => {
    setForm(prev => ({ ...prev, uploadedFiles: prev.uploadedFiles.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    if (!validate()) return;
    setLoading(true);
    try {
      const analyses = await analyzeFiles(form.uploadedFiles);
      const quoteTotals = calculateQuote(analyses, form);
      const id = `CS${(quoteCounter + 1).toString().padStart(5,'0')}`;
      setQuoteCounter(prev => prev + 1);
      setResult({ quoteId: id, files: analyses, ...quoteTotals });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4">
      <form onSubmit={handleSubmit} className="space-y-6" aria-label="Quote request form">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="customerName" className="block text-sm font-medium">Name<span className="text-[var(--error-color)]">*</span></label>
            <input id="customerName" name="customerName" value={form.customerName} onChange={handleChange} className="mt-1 w-full p-2 border rounded" />
            {errors.customerName && <p className="text-[var(--error-color)] text-sm">{errors.customerName}</p>}
          </div>
          <div>
            <label htmlFor="customerEmail" className="block text-sm font-medium">Email<span className="text-[var(--error-color)]">*</span></label>
            <input id="customerEmail" type="email" name="customerEmail" value={form.customerEmail} onChange={handleChange} className="mt-1 w-full p-2 border rounded" />
            {errors.customerEmail && <p className="text-[var(--error-color)] text-sm">{errors.customerEmail}</p>}
          </div>
          <div>
            <label htmlFor="customerPhone" className="block text-sm font-medium">Phone</label>
            <input id="customerPhone" name="customerPhone" value={form.customerPhone} onChange={handleChange} className="mt-1 w-full p-2 border rounded" />
          </div>
          <div>
            <label htmlFor="intendedUse" className="block text-sm font-medium">Intended Use<span className="text-[var(--error-color)]">*</span></label>
            <select id="intendedUse" name="intendedUse" value={form.intendedUse} onChange={handleChange} className="mt-1 w-full p-2 border rounded">
              <option value="">Select...</option>
              <option value="USCIS">USCIS</option>
              <option value="Court">Court</option>
            </select>
            {errors.intendedUse && <p className="text-[var(--error-color)] text-sm">{errors.intendedUse}</p>}
          </div>
          <div>
            <label htmlFor="sourceLanguage" className="block text-sm font-medium">Source Language<span className="text-[var(--error-color)]">*</span></label>
            <select id="sourceLanguage" name="sourceLanguage" value={form.sourceLanguage} onChange={handleChange} className="mt-1 w-full p-2 border rounded">
              <option value="">Select...</option>
              <option>English</option>
              <option>Spanish</option>
              <option>French</option>
              <option>German</option>
              <option>Japanese</option>
            </select>
            {errors.sourceLanguage && <p className="text-[var(--error-color)] text-sm">{errors.sourceLanguage}</p>}
          </div>
          <div>
            <label htmlFor="targetLanguage" className="block text-sm font-medium">Target Language<span className="text-[var(--error-color)]">*</span></label>
            <select id="targetLanguage" name="targetLanguage" value={form.targetLanguage} onChange={handleChange} className="mt-1 w-full p-2 border rounded">
              <option value="">Select...</option>
              <option>English</option>
              <option>Spanish</option>
              <option>French</option>
              <option>German</option>
              <option>Japanese</option>
            </select>
            {errors.targetLanguage && <p className="text-[var(--error-color)] text-sm">{errors.targetLanguage}</p>}
          </div>
        </div>

        <div
          className="border-2 border-dashed rounded p-4 text-center" onDragOver={e => e.preventDefault()} onDrop={handleDrop}
        >
          <p className="mb-2">Drag & drop files here or <button type="button" onClick={() => fileInput.current?.click()} className="text-[var(--accent-color)] underline">browse</button></p>
          <input ref={fileInput} type="file" multiple onChange={handleFileInput} className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
          {errors.uploadedFiles && <p className="text-[var(--error-color)] text-sm">{errors.uploadedFiles}</p>}
          <ul className="mt-2 space-y-1">
            {form.uploadedFiles.map((f, i) => (
              <li key={i} className="flex justify-between items-center text-sm bg-gray-50 dark:bg-slate-700 p-2 rounded">
                <span>{f.name}</span>
                <button type="button" onClick={() => removeFile(i)} className="text-[var(--error-color)]">Remove</button>
              </li>
            ))}
          </ul>
        </div>

        <button type="submit" className="w-full md:w-auto bg-[var(--accent-color)] hover:bg-[var(--accent-color-dark)] text-white py-2 px-6 rounded">
          {loading ? 'Calculating...' : 'Get Quote'}
        </button>
      </form>

      {result && (
        <div className="mt-8 space-y-4">
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
          <p className="text-sm text-gray-600 dark:text-gray-300">Billable pages are calculated from word count and complexity. Minimum charge of one page per quote.</p>
        </div>
      )}
    </div>
  );
};

export default QuoteRequestForm;
