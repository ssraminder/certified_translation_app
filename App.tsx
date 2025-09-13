import React, { useState } from 'react';
import Header from './components/Header';
import UploadForm from './components/UploadForm';
import AnalysisOverlay from './components/AnalysisOverlay';
import QuoteScreen from './components/QuoteScreen';
import ErrorScreen from './components/ErrorScreen';
import { QuoteResult } from './helpers/quoteTypes';

type Screen = 'form' | 'waiting' | 'result' | 'error';

const App: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('form');
  const [jobId, setJobId] = useState<string>('');
  const [result, setResult] = useState<QuoteResult | null>(null);
  const [error, setError] = useState<string>('');

  const handleJobCreated = (id: string) => {
    setJobId(id);
    setScreen('waiting');
  };

  const handleResolved = (r: { status: 'succeeded' | 'failed'; result?: QuoteResult; error?: string }) => {
    if (r.status === 'succeeded' && r.result) {
      setResult(r.result);
      setScreen('result');
    } else if (r.status === 'failed') {
      setError(r.error || 'Unexpected error');
      setScreen('error');
    }
  };

  const handlePay = () => {
    if (!result) return;
    window.location.href = `/.netlify/functions/stripe-checkout?quoteId=${result.quoteId}`;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 p-4">
        {screen === 'form' && <UploadForm onJobCreated={handleJobCreated} />}
        {screen === 'waiting' && <AnalysisOverlay jobId={jobId} onResolved={handleResolved} />}
        {screen === 'result' && result && <QuoteScreen result={result} onPay={handlePay} />}
        {screen === 'error' && <ErrorScreen message={error} onBack={() => setScreen('form')} />}
      </main>
      <footer className="text-center py-6 text-sm opacity-70">
        <p>&copy; {new Date().getFullYear()} Certified Translation Agency</p>
      </footer>
    </div>
  );
};

export default App;
