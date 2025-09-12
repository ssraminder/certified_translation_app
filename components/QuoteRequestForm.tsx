import React, { useState } from 'react';

interface FormState {
  name: string;
  email: string;
  phone: string;
  sourceLanguage: string;
  targetLanguage: string;
  file: File | null;
}

const languages = ['English', 'Spanish', 'French', 'German'];

const QuoteRequestForm: React.FC = () => {
  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    phone: '',
    sourceLanguage: '',
    targetLanguage: '',
    file: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ocr: string; analysis: string } | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = 'Name is required.';
    if (!form.email.trim()) newErrors.email = 'Email is required.';
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) newErrors.email = 'Invalid email address.';
    if (!form.sourceLanguage) newErrors.sourceLanguage = 'Source language is required.';
    if (!form.targetLanguage) newErrors.targetLanguage = 'Target language is required.';
    if (!form.file) newErrors.file = 'File upload is required.';
    else if (
      !(
        form.file.type === 'application/pdf' ||
        form.file.type === 'image/jpeg' ||
        form.file.type === 'image/png' ||
        form.file.type === 'application/msword' ||
        form.file.type ===
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      )
    ) {
      newErrors.file = 'Unsupported file type.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setForm((prev) => ({ ...prev, file }));
  };

  const toBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    setServerError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const fileBase64 = await toBase64(form.file!);
      const response = await fetch('/.netlify/functions/quote-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          sourceLang: form.sourceLanguage,
          targetLang: form.targetLanguage,
          fileName: form.file!.name,
          fileType: form.file!.type,
          fileBase64,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      setResult({ ocr: data.ocrText, analysis: data.analysis });
    } catch (error: any) {
      setServerError(error.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Request a Quote</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Name<span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            className="mt-1 w-full p-2 rounded bg-white border border-gray-300 text-gray-900 placeholder-gray-400"
          />
          {errors.name && <p className="text-red-600 text-sm">{errors.name}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Email<span className="text-red-600">*</span>
          </label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            className="mt-1 w-full p-2 rounded bg-white border border-gray-300 text-gray-900 placeholder-gray-400"
          />
          {errors.email && <p className="text-red-600 text-sm">{errors.email}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Phone</label>
          <input
            type="tel"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            className="mt-1 w-full p-2 rounded bg-white border border-gray-300 text-gray-900 placeholder-gray-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Source Language<span className="text-red-600">*</span>
          </label>
          <select
            name="sourceLanguage"
            value={form.sourceLanguage}
            onChange={handleChange}
            className="mt-1 w-full p-2 rounded bg-white border border-gray-300 text-gray-900"
          >
            <option value="">Select</option>
            {languages.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
          {errors.sourceLanguage && (
            <p className="text-red-600 text-sm">{errors.sourceLanguage}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Target Language<span className="text-red-600">*</span>
          </label>
          <select
            name="targetLanguage"
            value={form.targetLanguage}
            onChange={handleChange}
            className="mt-1 w-full p-2 rounded bg-white border border-gray-300 text-gray-900"
          >
            <option value="">Select</option>
            {languages.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
          {errors.targetLanguage && (
            <p className="text-red-600 text-sm">{errors.targetLanguage}</p>
          )}
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Upload File<span className="text-red-600">*</span>
          </label>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={handleFileChange}
            className="mt-1 w-full text-sm text-gray-500"
          />
          {errors.file && <p className="text-red-600 text-sm">{errors.file}</p>}
        </div>
      </div>

      {serverError && <p className="text-red-600">{serverError}</p>}

      <button
        type="submit"
        disabled={loading}
        className="bg-[#0E3CB5] text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Submitting...' : 'Submit'}
      </button>

      {loading && (
        <div className="flex items-center mt-4">
          <div className="animate-spin h-5 w-5 border-2 border-[#0E3CB5] border-t-transparent rounded-full mr-2"></div>
          <span>Processing...</span>
        </div>
      )}

      {result && (
        <div className="mt-4 space-y-2">
          <div>
            <h3 className="text-lg font-semibold">OCR Result</h3>
            <pre className="whitespace-pre-wrap bg-gray-100 p-2 rounded text-gray-800">{result.ocr}</pre>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Gemini Analysis</h3>
            <pre className="whitespace-pre-wrap bg-gray-100 p-2 rounded text-gray-800">{result.analysis}</pre>
          </div>
          <p className="text-green-600">Thank you! Your quote request has been submitted.</p>
        </div>
      )}
    </form>
  );
};

export default QuoteRequestForm;
