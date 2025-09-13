import React from 'react';

interface AnalysisOverlayProps {
  visible: boolean;
}

const AnalysisOverlay: React.FC<AnalysisOverlayProps> = ({ visible }) => {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-900/80">
      <div className="w-16 h-16 border-4 border-[var(--accent-color)] border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 text-[var(--accent-color)] text-lg font-medium text-center px-4">
        Analyzing your documents… This may take a few moments.
      </p>
    </div>
  );
};

export default AnalysisOverlay;
