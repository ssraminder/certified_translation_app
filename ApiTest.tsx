import React, { useState, useCallback } from 'react';

type Status = 'idle' | 'loading' | 'success' | 'error';

const StatusIndicator: React.FC<{ status: Status }> = ({ status }) => {
  switch (status) {
    case 'loading':
      return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400" role="status" aria-label="Loading"></div>;
    case 'success':
      return <span role="img" aria-label="Success" className="text-green-400 text-lg">✓</span>;
    case 'error':
      return <span role="img" aria-label="Error" className="text-red-400 text-lg">✗</span>;
    default:
      return null;
  }
};

const ApiTest: React.FC = () => {
  const [pingStatus, setPingStatus] = useState<Status>('idle');
  const [supabaseStatus, setSupabaseStatus] = useState<Status>('idle');
  const [visionStatus, setVisionStatus] = useState<Status>('idle');
  const [geminiStatus, setGeminiStatus] = useState<Status>('idle');
  const [stripeStatus, setStripeStatus] = useState<Status>('idle');
  const [brevoStatus, setBrevoStatus] = useState<Status>('idle');

  const handlePing = useCallback(async () => {
    setPingStatus('loading');
    try {
      const response = await fetch('/.netlify/functions/ping');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      await response.json();
      setPingStatus('success');
    } catch (error) {
      console.error("Failed to ping API:", error);
      setPingStatus('error');
    }
  }, []);

  const handleTestSupabase = useCallback(async () => {
    setSupabaseStatus('loading');
    try {
      const response = await fetch('/.netlify/functions/supabase');

      if (!response.ok) {
        let errorMessage;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.details || errorData.error || `Server error: ${response.status}`;
        } else {
          errorMessage = await response.text();
        }
        throw new Error(errorMessage);
      }

      await response.json();
      setSupabaseStatus('success');
    } catch (error) {
      console.error("Failed to connect to Supabase:", error instanceof Error ? error.message : String(error));
      setSupabaseStatus('error');
    }
  }, []);

  const handleTestVision = useCallback(async () => {
    setVisionStatus('loading');
    try {
      const response = await fetch('/.netlify/functions/vision');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      await response.json();
      setVisionStatus('success');
    } catch (error) {
      console.error("Failed to call Vision API:", error);
      setVisionStatus('error');
    }
  }, []);

  const handleTestGemini = useCallback(async () => {
    setGeminiStatus('loading');
    try {
      const response = await fetch('/.netlify/functions/gemini');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      await response.json();
      setGeminiStatus('success');
    } catch (error) {
      console.error("Failed to call Gemini API:", error);
      setGeminiStatus('error');
    }
  }, []);

  const handleTestStripe = useCallback(async () => {
    setStripeStatus('loading');
    try {
      const response = await fetch('/.netlify/functions/stripe');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      await response.json();
      setStripeStatus('success');
    } catch (error) {
      console.error("Failed to call Stripe API:", error);
      setStripeStatus('error');
    }
  }, []);

  const handleTestBrevo = useCallback(async () => {
    setBrevoStatus('loading');
    try {
      const response = await fetch('/.netlify/functions/brevo');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      await response.json();
      setBrevoStatus('success');
    } catch (error) {
      console.error("Failed to call Brevo API:", error);
      setBrevoStatus('error');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-3xl font-bold text-[#0E3CB5]">API Test Console</h1>
          <p className="mt-4 text-gray-600">Use these buttons to test backend API endpoints.</p>
        </header>
        <main className="space-y-4">
          <div className="space-y-4">
            {/* Ping API Test */}
            <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
              <div>
                <p className="font-semibold text-gray-900">API Server</p>
                <p className="font-mono text-xs text-gray-500">/ping</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-5 h-5 flex items-center justify-center"><StatusIndicator status={pingStatus} /></div>
                <button
                  onClick={handlePing}
                  disabled={pingStatus === 'loading'}
                  className="bg-cyan-600 text-white font-semibold py-1.5 px-4 rounded-md text-sm hover:bg-cyan-500 transition-colors duration-200 disabled:bg-gray-200 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50 focus:ring-cyan-500"
                >
                  {pingStatus === 'loading' ? 'Pinging...' : 'Ping'}
                </button>
              </div>
            </div>

            {/* Supabase Test */}
            <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
              <div>
                <p className="font-semibold text-gray-900">Supabase Connection</p>
                <p className="font-mono text-xs text-gray-500">/supabase</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-5 h-5 flex items-center justify-center"><StatusIndicator status={supabaseStatus} /></div>
                <button
                  onClick={handleTestSupabase}
                  disabled={supabaseStatus === 'loading'}
                  className="bg-green-600 text-white font-semibold py-1.5 px-4 rounded-md text-sm hover:bg-green-500 transition-colors duration-200 disabled:bg-gray-200 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50 focus:ring-green-500"
                >
                  {supabaseStatus === 'loading' ? 'Testing...' : 'Test'}
                </button>
              </div>
            </div>

            {/* Vision API Test */}
            <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
              <div>
                <p className="font-semibold text-gray-900">Vision API</p>
                <p className="font-mono text-xs text-gray-500">/vision</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-5 h-5 flex items-center justify-center"><StatusIndicator status={visionStatus} /></div>
                <button
                  onClick={handleTestVision}
                  disabled={visionStatus === 'loading'}
                  className="bg-blue-600 text-white font-semibold py-1.5 px-4 rounded-md text-sm hover:bg-blue-500 transition-colors duration-200 disabled:bg-gray-200 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50 focus:ring-blue-500"
                >
                  {visionStatus === 'loading' ? 'Testing...' : 'Test'}
                </button>
              </div>
            </div>

            {/* Gemini API Test */}
            <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
              <div>
                <p className="font-semibold text-gray-900">Gemini API</p>
                <p className="font-mono text-xs text-gray-500">/gemini</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-5 h-5 flex items-center justify-center"><StatusIndicator status={geminiStatus} /></div>
                <button
                  onClick={handleTestGemini}
                  disabled={geminiStatus === 'loading'}
                  className="bg-purple-600 text-white font-semibold py-1.5 px-4 rounded-md text-sm hover:bg-purple-500 transition-colors duration-200 disabled:bg-gray-200 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50 focus:ring-purple-500"
                >
                  {geminiStatus === 'loading' ? 'Testing...' : 'Test'}
                </button>
              </div>
            </div>

            {/* Stripe API Test */}
            <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
              <div>
                <p className="font-semibold text-gray-900">Stripe API</p>
                <p className="font-mono text-xs text-gray-500">/stripe</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-5 h-5 flex items-center justify-center"><StatusIndicator status={stripeStatus} /></div>
                <button
                  onClick={handleTestStripe}
                  disabled={stripeStatus === 'loading'}
                  className="bg-red-600 text-white font-semibold py-1.5 px-4 rounded-md text-sm hover:bg-red-500 transition-colors duration-200 disabled:bg-gray-200 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50 focus:ring-red-500"
                >
                  {stripeStatus === 'loading' ? 'Testing...' : 'Test'}
                </button>
              </div>
            </div>

            {/* Brevo API Test */}
            <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
              <div>
                <p className="font-semibold text-gray-900">Brevo API</p>
                <p className="font-mono text-xs text-gray-500">/brevo</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-5 h-5 flex items-center justify-center"><StatusIndicator status={brevoStatus} /></div>
                <button
                  onClick={handleTestBrevo}
                  disabled={brevoStatus === 'loading'}
                  className="bg-orange-600 text-white font-semibold py-1.5 px-4 rounded-md text-sm hover:bg-orange-500 transition-colors duration-200 disabled:bg-gray-200 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50 focus:ring-orange-500"
                >
                  {brevoStatus === 'loading' ? 'Testing...' : 'Test'}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ApiTest;
