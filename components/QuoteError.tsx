import React from 'react';

interface QuoteErrorProps {
  message: string;
  onReset: () => void;
}

const QuoteError: React.FC<QuoteErrorProps> = ({ message, onReset }) => (
  <div className="max-w-md mx-auto p-4 text-center" role="alert">
    <h2 className="text-2xl font-semibold mb-4 text-[var(--error-color)]">Something went wrong</h2>
    <p className="mb-4">{message}</p>
    <button onClick={onReset} className="px-4 py-2 bg-[var(--accent-color)] text-white rounded">Try Again</button>
  </div>
);

export default QuoteError;
