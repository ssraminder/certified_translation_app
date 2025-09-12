import React, { useState, useCallback } from 'react';
import { CopyIcon, CheckIcon } from './icons';

interface CodeBlockProps {
  code: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  }, [code]);

  return (
    <div className="bg-gray-900/70 border border-gray-700 rounded-md my-2 relative group">
      <pre className="p-4 text-gray-300 text-sm whitespace-pre-wrap break-all overflow-x-auto">
        <code>{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-2 bg-gray-700/80 rounded-md text-gray-400 hover:text-white hover:bg-gray-600 transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        aria-label="Copy code"
      >
        {isCopied ? (
          <CheckIcon className="w-4 h-4 text-green-400" />
        ) : (
          <CopyIcon className="w-4 h-4" />
        )}
      </button>
    </div>
  );
};
