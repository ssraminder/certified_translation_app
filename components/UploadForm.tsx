import React, { useState, useRef } from 'react';

interface Props {
  onJobCreated: (jobId: string) => void;
}

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

export default function UploadForm({ onJobCreated }: Props) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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

  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;
    setLoading(true);
    try {
      const files = [];
      for (const file of form.uploadedFiles) {
        const fileBase64 = await fileToBase64(file);
        files.push({ fileName: file.name, fileType: file.type, fileBase64 });
      }
      const resp = await fetch('/.netlify/functions/quote-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: form.customerName,
          customerEmail: form.customerEmail,
          customerPhone: form.customerPhone,
          sourceLanguage: form.sourceLanguage,
          targetLanguage: form.targetLanguage,
          intendedUse: form.intendedUse,
          files
        })
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to start analysis');
      }
      const data = await resp.json();
      onJobCreated(data.jobId);
    } catch (err: any) {
      setSubmitError(err.message || 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" aria-label="Quote request form">
      {submitError && (
        <div className="text-[var(--error-color)]" role="alert">{submitError}</div>
      )}
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
          <input id="sourceLanguage" name="sourceLanguage" value={form.sourceLanguage} onChange={handleChange} className="mt-1 w-full p-2 border rounded" />
          {errors.sourceLanguage && <p className="text-[var(--error-color)] text-sm">{errors.sourceLanguage}</p>}
        </div>
        <div>
          <label htmlFor="targetLanguage" className="block text-sm font-medium">Target Language<span className="text-[var(--error-color)]">*</span></label>
          <input id="targetLanguage" name="targetLanguage" value={form.targetLanguage} onChange={handleChange} className="mt-1 w-full p-2 border rounded" />
          {errors.targetLanguage && <p className="text-[var(--error-color)] text-sm">{errors.targetLanguage}</p>}
        </div>
      </div>
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        className="border-2 border-dashed p-6 text-center rounded"
      >
        <p className="mb-2">Drag & drop files here or</p>
        <button type="button" onClick={() => fileInput.current?.click()} className="underline text-[var(--accent-color)]">Browse</button>
        <input ref={fileInput} type="file" multiple className="hidden" onChange={handleFileInput} />
        {errors.uploadedFiles && <p className="text-[var(--error-color)] text-sm">{errors.uploadedFiles}</p>}
        <ul className="mt-4 space-y-1">
          {form.uploadedFiles.map((f, i) => (
            <li key={i} className="text-sm flex justify-between">
              <span>{f.name}</span>
              <button type="button" onClick={() => removeFile(i)} className="text-[var(--error-color)]">Remove</button>
            </li>
          ))}
        </ul>
      </div>
      <button type="submit" className="bg-[var(--accent-color)] hover:bg-[var(--accent-color-dark)] text-white py-2 px-6 rounded" disabled={loading}>
        {loading ? 'Uploading…' : 'Get Quote'}
      </button>
    </form>
  );
}
