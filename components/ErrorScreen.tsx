import React from 'react';

export default function ErrorScreen({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div className="p-6 max-w-lg mx-auto text-center space-y-4">
      <h2 className="text-xl font-semibold text-[var(--error-color)]">Analysis failed</h2>
      <p className="text-sm">{message}</p>
      <button onClick={onBack} className="mt-4 bg-[var(--accent-color)] hover:bg-[var(--accent-color-dark)] text-white py-2 px-6 rounded">
        Back
      </button>
    </div>
  );
}
