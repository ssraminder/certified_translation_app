import React from 'react';
import QuoteRequestForm from './components/QuoteRequestForm';
import QuoteJobStatus from './components/QuoteJobStatus';
import QuoteResults from './components/QuoteResults';
import QuoteError from './components/QuoteError';
import Header from './components/Header';

const App: React.FC = () => {
  const [screen, setScreen] = React.useState<'form' | 'waiting' | 'result' | 'error'>('form');
  const [jobId, setJobId] = React.useState('');
  const [result, setResult] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);

  const startJob = (id: string) => {
    setJobId(id);
    setScreen('waiting');
  };

  const handleComplete = (res: any) => {
    setResult(res);
    setScreen('result');
  };

  const handleError = (msg: string) => {
    setError(msg);
    setScreen('error');
  };

  const reset = () => {
    setScreen('form');
    setJobId('');
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {screen === 'form' && <QuoteRequestForm onJobStart={startJob} />}
        {screen === 'waiting' && (
          <QuoteJobStatus jobId={jobId} onComplete={handleComplete} onError={handleError} />
        )}
        {screen === 'result' && result && <QuoteResults result={result} onReset={reset} />}
        {screen === 'error' && error && <QuoteError message={error} onReset={reset} />}
      </main>
      <footer className="text-center py-6 text-sm opacity-70">
        <p>&copy; {new Date().getFullYear()} Certified Translation Agency</p>
      </footer>
    </div>
  );
};

export default App;
