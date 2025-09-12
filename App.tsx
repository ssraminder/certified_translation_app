import React, { useState, useCallback } from 'react';
import { Card } from './components/Card';
import { CodeBlock } from './components/CodeBlock';
import { GithubIcon, NetlifyIcon, ReactIcon, ViteIcon, ServerIcon, SupabaseIcon } from './components/icons';
import { loadStripe } from '@stripe/stripe-js';

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

const App: React.FC = () => {
  const GITHUB_REPO_URL = 'https://github.com/new';
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
      const stripe = await loadStripe(process.env.STRIPE_PUBLISHABLE_KEY || '');
      if (!stripe) throw new Error('Stripe failed to load');
      const response = await fetch('/.netlify/functions/stripe');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const { clientSecret } = await response.json();
      const pi = await stripe.retrievePaymentIntent(clientSecret);
      if (pi.error) throw pi.error;
      setStripeStatus('success');
    } catch (error) {
      console.error('Failed to call Stripe API:', error);
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
      console.error('Failed to send Brevo email:', error);
      setBrevoStatus('error');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
            Project Setup & Deployment Guide
          </h1>
          <p className="mt-4 text-lg text-gray-400">
            From local development to live deployment with React, Vite, and Netlify.
          </p>
          <div className="flex justify-center items-center space-x-6 mt-6">
            <ReactIcon className="h-10 w-10 text-cyan-400" />
            <ViteIcon className="h-9 w-9 text-purple-400" />
            <GithubIcon className="h-9 w-9 text-white" />
            <NetlifyIcon className="h-9 w-9 text-teal-400" />
            <SupabaseIcon className="h-9 w-9 text-green-400" />
          </div>
        </header>

        <main className="space-y-8">
          <Card
            step="1"
            title="Create React + Vite + TypeScript Project"
            description="Start by scaffolding a new project using Vite. This command sets up a modern React environment with TypeScript support out of the box."
          >
            <CodeBlock code="npm create vite@latest my-react-app -- --template react-ts" />
            <p className="text-gray-400 mt-4">Then, navigate into your new project directory and install dependencies:</p>
            <CodeBlock code="cd my-react-app && npm install" />
          </Card>

          <Card
            step="2"
            title="Initialize Git & Push to GitHub"
            description="Version control is crucial. Initialize a Git repository, make your first commit, and push it to a new repository on GitHub."
          >
            <p className="text-gray-400 mb-2">Initialize, commit, and set your main branch:</p>
            <CodeBlock code="git init && git add . && git commit -m 'Initial commit' && git branch -M main" />
            <p className="text-gray-400 mt-4 mb-2">Next, go to <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline">GitHub</a> to create a new repository. Then, link it to your local project and push your code.</p>
            <CodeBlock code="git remote add origin YOUR_GITHUB_REPOSITORY_URL.git" />
            <CodeBlock code="git push -u origin main" />
          </Card>

          <Card
            step="3"
            title="Deploy to Netlify"
            description="Netlify offers a simple and powerful way to deploy modern web projects. You can deploy directly from your GitHub repository."
          >
            <ol className="list-decimal list-inside space-y-3 text-gray-300">
              <li>Sign up or log in to your <a href="https://app.netlify.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline">Netlify account</a>.</li>
                <li>Click "Add new site" &gt; "Import from Git".</li>
              <li>Connect to GitHub and select the repository you just pushed.</li>
              <li>Netlify automatically detects Vite project settings. The defaults are usually correct:
                <ul className="list-disc list-inside ml-6 mt-2 p-3 bg-gray-800/50 rounded-md text-sm">
                  <li><strong>Build command:</strong> <code className="text-pink-400">npm run build</code></li>
                  <li><strong>Publish directory:</strong> <code className="text-pink-400">dist</code></li>
                </ul>
              </li>
               <li>Click "Deploy site". Netlify will build and deploy your project, providing a live URL!</li>
            </ol>
          </Card>

           <Card
            step="4"
            title="Add a Netlify Serverless Function"
            description="Netlify Functions allow you to run backend code without managing servers. Here's how to create a simple 'ping' endpoint."
          >
            <p className="text-gray-400 mb-2">First, create a <code className="text-pink-400">netlify.toml</code> file in your project's root to configure your functions directory:</p>
            <CodeBlock code={`[build]\n  command = "npm run build"\n  publish = "dist"\n\n[functions]\n  directory = "netlify/functions"`} />
            <p className="text-gray-400 mt-4 mb-2">Next, create the function file at <code className="text-pink-400">netlify/functions/ping.ts</code>. Netlify will automatically handle the TypeScript compilation.</p>
            <CodeBlock code={`import type { Handler } from "@netlify/functions";

const handler: Handler = async (event, context) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "pong" }),
    headers: { 'Content-Type': 'application/json' },
  };
};

export { handler };`} />
          </Card>

          <Card
            step="5"
            title="Configure Environment Variables"
            description="Securely manage API keys and other secrets using Netlify's environment variables. Add these in your Netlify dashboard under Site settings > Build & deploy > Environment."
          >
            <p className="text-gray-400 mb-2">Here is a conventional list of environment variables you'll need. Add the variable names on Netlify, then fill in the values from your service providers.</p>
            <CodeBlock code={`# Supabase
SUPABASE_URL=your-project-url
SUPABASE_ANON_KEY=your-public-anon-key

  # Google APIs (Gemini, Cloud Vision)
  API_KEY=your-google-api-key

# Stripe
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Brevo (formerly Sendinblue) for transactional emails
BREVO_API_KEY=your-brevo-api-key
BREVO_TEST_EMAIL=your-email@example.com`} />
            <p className="text-gray-400 mt-4">In your functions, you can access these with <code className="text-pink-400">process.env.YOUR_VARIABLE_NAME</code>.</p>
          </Card>
          
          <Card
            step="6"
            title="Integrate with Supabase"
            description="Supabase is an open source Firebase alternative. Let's connect it to our Netlify function."
          >
            <ol className="list-decimal list-inside space-y-4 text-gray-300">
              <li>Go to <a href="https://supabase.com/" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline">Supabase</a> and create a new project.</li>
              <li>Inside your project, go to the <strong>SQL Editor</strong> and run a query to create a new table. Here's an example:
                <CodeBlock code={`-- Create a table to store notes
create table notes (
  id bigserial primary key,
  title text,
  created_at timestamptz default now()
);

-- Enable Row Level Security (RLS)
alter table notes enable row level security;

-- Create a policy that allows public read access
create policy "Public notes are viewable by everyone"
on notes for select
using ( true );

-- Insert some sample data
insert into notes (title) values ('This is a test note');`} />
              </li>
              <li>Go to <strong>Project Settings &gt; API</strong>. Find your Project URL and anon public key. Add these to your Netlify environment variables as <code className="text-pink-400">SUPABASE_URL</code> and <code className="text-pink-400">SUPABASE_ANON_KEY</code>.</li>
              <li>Install the Supabase client library: <CodeBlock code="npm install @supabase/supabase-js" /> This will add it to your `package.json`.</li>
              <li>Create a new function at <code className="text-pink-400">netlify/functions/supabase.ts</code> to handle the connection.</li>
            </ol>
          </Card>

           <div className="text-center py-8 px-6 bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="flex items-center justify-center gap-4">
              <ServerIcon className="w-8 h-8 text-gray-400" />
              <h2 className="text-2xl font-bold text-gray-300">Live API Health Check</h2>
            </div>
            <p className="mt-3 text-gray-500 max-w-md mx-auto">
              Test your deployed serverless functions to ensure they are running correctly.
            </p>
            <div className="mt-6 space-y-3 max-w-lg mx-auto">
              {/* Ping Test */}
              <div className="flex items-center justify-between bg-gray-900/70 p-3 rounded-lg border border-gray-700">
                <div>
                  <p className="font-semibold text-gray-300">API Server</p>
                  <p className="font-mono text-xs text-gray-500">/ping</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-5 h-5 flex items-center justify-center"><StatusIndicator status={pingStatus} /></div>
                  <button
                    onClick={handlePing}
                    disabled={pingStatus === 'loading'}
                    className="bg-cyan-600 text-white font-semibold py-1.5 px-4 rounded-md text-sm hover:bg-cyan-500 transition-colors duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-500"
                  >
                    {pingStatus === 'loading' ? 'Pinging...' : 'Ping'}
                  </button>
                </div>
              </div>
              {/* Supabase Test */}
              <div className="flex items-center justify-between bg-gray-900/70 p-3 rounded-lg border border-gray-700">
                <div>
                 <p className="font-semibold text-gray-300">Supabase Connection</p>
                 <p className="font-mono text-xs text-gray-500">/supabase</p>
               </div>
               <div className="flex items-center gap-4">
                  <div className="w-5 h-5 flex items-center justify-center"><StatusIndicator status={supabaseStatus} /></div>
                 <button
                   onClick={handleTestSupabase}
                   disabled={supabaseStatus === 'loading'}
                   className="bg-green-600 text-white font-semibold py-1.5 px-4 rounded-md text-sm hover:bg-green-500 transition-colors duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-green-500"
                 >
                   {supabaseStatus === 'loading' ? 'Testing...' : 'Test'}
                 </button>
               </div>
              </div>
              {/* Vision API Test */}
              <div className="flex items-center justify-between bg-gray-900/70 p-3 rounded-lg border border-gray-700">
                <div>
                  <p className="font-semibold text-gray-300">Vision API</p>
                  <p className="font-mono text-xs text-gray-500">/vision</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-5 h-5 flex items-center justify-center"><StatusIndicator status={visionStatus} /></div>
                  <button
                    onClick={handleTestVision}
                    disabled={visionStatus === 'loading'}
                    className="bg-blue-600 text-white font-semibold py-1.5 px-4 rounded-md text-sm hover:bg-blue-500 transition-colors duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500"
                  >
                    {visionStatus === 'loading' ? 'Testing...' : 'Test'}
                  </button>
                </div>
              </div>
              {/* Gemini API Test */}
              <div className="flex items-center justify-between bg-gray-900/70 p-3 rounded-lg border border-gray-700">
                <div>
                  <p className="font-semibold text-gray-300">Gemini API</p>
                  <p className="font-mono text-xs text-gray-500">/gemini</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-5 h-5 flex items-center justify-center"><StatusIndicator status={geminiStatus} /></div>
                  <button
                    onClick={handleTestGemini}
                    disabled={geminiStatus === 'loading'}
                    className="bg-purple-600 text-white font-semibold py-1.5 px-4 rounded-md text-sm hover:bg-purple-500 transition-colors duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-purple-500"
                  >
                    {geminiStatus === 'loading' ? 'Testing...' : 'Test'}
                  </button>
                </div>
              </div>
              {/* Stripe API Test */}
              <div className="flex items-center justify-between bg-gray-900/70 p-3 rounded-lg border border-gray-700">
                <div>
                  <p className="font-semibold text-gray-300">Stripe API</p>
                  <p className="font-mono text-xs text-gray-500">/stripe</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-5 h-5 flex items-center justify-center"><StatusIndicator status={stripeStatus} /></div>
                  <button
                    onClick={handleTestStripe}
                    disabled={stripeStatus === 'loading'}
                    className="bg-pink-600 text-white font-semibold py-1.5 px-4 rounded-md text-sm hover:bg-pink-500 transition-colors duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-pink-500"
                  >
                    {stripeStatus === 'loading' ? 'Testing...' : 'Test'}
                  </button>
                </div>
              </div>
              {/* Brevo Email Test */}
              <div className="flex items-center justify-between bg-gray-900/70 p-3 rounded-lg border border-gray-700">
                <div>
                  <p className="font-semibold text-gray-300">Brevo Email</p>
                  <p className="font-mono text-xs text-gray-500">/brevo</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-5 h-5 flex items-center justify-center"><StatusIndicator status={brevoStatus} /></div>
                  <button
                    onClick={handleTestBrevo}
                    disabled={brevoStatus === 'loading'}
                    className="bg-orange-600 text-white font-semibold py-1.5 px-4 rounded-md text-sm hover:bg-orange-500 transition-colors duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-orange-500"
                  >
                    {brevoStatus === 'loading' ? 'Testing...' : 'Test'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="text-center mt-12 text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} React Deployment Guide. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
