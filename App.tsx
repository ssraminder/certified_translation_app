import React, { useState, useCallback } from 'react';
import { Card } from './components/Card';
import { CodeBlock } from './components/CodeBlock';
import { GithubIcon, NetlifyIcon, ReactIcon, ViteIcon, ServerIcon } from './components/icons';

const statusConfig = {
  idle: {
    color: 'bg-gray-500',
    text: 'text-gray-400',
    label: 'Idle',
  },
  loading: {
    color: 'bg-yellow-500 animate-pulse',
    text: 'text-yellow-400',
    label: 'Loading',
  },
  success: {
    color: 'bg-green-500',
    text: 'text-green-400',
    label: 'Success',
  },
  error: {
    color: 'bg-red-500',
    text: 'text-red-400',
    label: 'Error',
  },
};


const App: React.FC = () => {
  const GITHUB_REPO_URL = 'https://github.com/new';
  const [apiStatus, setApiStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [apiResponse, setApiResponse] = useState<string>('');

  const handlePing = useCallback(async () => {
    setApiStatus('loading');
    setApiResponse('');
    try {
      // Netlify functions are available at /.netlify/functions/
      const response = await fetch('/.netlify/functions/ping');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setApiResponse(data.message || 'No message received');
      setApiStatus('success');
    } catch (error) {
      console.error("Failed to ping API:", error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      setApiResponse(`Failed to connect. ${errorMessage}`);
      setApiStatus('error');
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
          </div>
        </header>

        <main className="space-y-8">
          <Card
            step="1"
            title="Create React + Vite + TypeScript Project"
            description="Start by scaffolding a new project using Vite. This command sets up a modern React environment with TypeScript support out of the box."
          >
            <CodeBlock code="npm create vite@latest my-react-app -- --template react-ts" />
            <p className="text-gray-400 mt-4">
              After creation, navigate into your new project directory:
            </p>
            <CodeBlock code="cd my-react-app" />
            <p className="text-gray-400 mt-4">
              Then, install the necessary dependencies:
            </p>
            <CodeBlock code="npm install" />
          </Card>

          <Card
            step="2"
            title="Initialize Git & Push to GitHub"
            description="Version control is crucial. Initialize a Git repository, make your first commit, and push it to a new repository on GitHub."
          >
            <p className="text-gray-400 mb-2">First, initialize the local repository and make your initial commit:</p>
            <CodeBlock code="git init && git add . && git commit -m 'Initial commit'" />
            <p className="text-gray-400 mt-4 mb-2">Next, go to <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline">GitHub</a> to create a new repository. Then, link it to your local project and push your code.</p>
            <CodeBlock code="git branch -M main" />
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
              <li>Click the "Add new site" or "Import from Git" button.</li>
              <li>Connect to your Git provider (GitHub) and authorize access.</li>
              <li>Select the repository you just pushed.</li>
              <li>Netlify should automatically detect your Vite project settings. The default settings are usually correct:
                <ul className="list-disc list-inside ml-6 mt-2 p-3 bg-gray-800/50 rounded-md text-sm">
                  <li><strong>Build command:</strong> <code className="text-pink-400">npm run build</code></li>
                  <li><strong>Publish directory:</strong> <code className="text-pink-400">dist</code></li>
                </ul>
              </li>
               <li>Click "Deploy site". Netlify will build and deploy your project. Once finished, you'll get a live URL!</li>
            </ol>
          </Card>

           <Card
            step="4"
            title="Add a Netlify Serverless Function"
            description="Netlify Functions allow you to run backend code without managing servers. Here's how to create a simple 'ping' endpoint."
          >
            <p className="text-gray-400 mb-2">First, create a <code className="text-pink-400">netlify.toml</code> file in your project's root to configure your functions directory:</p>
            <CodeBlock code={`[build]\n  command = "npm run build"\n  publish = "dist"\n  functions = "netlify/functions"`} />

            <p className="text-gray-400 mt-4 mb-2">Next, create the function file at <code className="text-pink-400">netlify/functions/ping.ts</code>. Netlify will automatically handle the TypeScript compilation.</p>
            <CodeBlock code={
`import type { Handler } from "@netlify/functions";

const handler: Handler = async (event, context) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "pong" }),
    headers: { 'Content-Type': 'application/json' },
  };
};

export { handler };`
            } />
            <p className="text-gray-400 mt-4">After deploying, you can test this function below or access it directly at <code className="text-pink-400">/.netlify/functions/ping</code>.</p>
          </Card>

          <Card
            step="5"
            title="Configure Environment Variables"
            description="Securely manage API keys and other secrets using Netlify's environment variables. Add these in your Netlify dashboard under Site settings > Build & deploy > Environment."
          >
            <p className="text-gray-400 mb-2">Here is a conventional list of environment variables you'll need for various services. Add the variable names on Netlify, then fill in the values.</p>
            <CodeBlock code={
`# Supabase
SUPABASE_URL=your-project-url
SUPABASE_ANON_KEY=your-public-anon-key

# Google Gemini API
API_KEY=your-google-api-key

# Stripe
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...

# Brevo (formerly Sendinblue) for transactional emails
BREVO_API_KEY=your-brevo-api-key`
            } />
            <p className="text-gray-400 mt-4">In your functions, you can access these with <code className="text-pink-400">process.env.YOUR_VARIABLE_NAME</code>.</p>
          </Card>

           <div className="text-center py-8 px-6 bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="flex items-center justify-center gap-4">
              <ServerIcon className="w-8 h-8 text-gray-400" />
              <h2 className="text-2xl font-bold text-gray-300">Live API Health Check</h2>
            </div>
            <p className="mt-3 text-gray-500 max-w-md mx-auto">
              Click the button to send a request to the live <code className="text-pink-400">/ping</code> serverless function deployed on Netlify.
            </p>
            <div className="mt-6">
              <button
                onClick={handlePing}
                disabled={apiStatus === 'loading'}
                className="bg-cyan-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-cyan-500 transition-colors duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-500"
                aria-live="polite"
              >
                {apiStatus === 'loading' ? 'Pinging...' : 'Ping API Endpoint'}
              </button>
            </div>
            {apiStatus !== 'idle' && (
              <div className="mt-6 p-4 rounded-md bg-gray-900/70 border border-gray-700 max-w-md mx-auto text-left">
                <div className="flex items-center gap-3">
                  <span className={`flex-shrink-0 w-3 h-3 rounded-full ${statusConfig[apiStatus].color}`}></span>
                  <div className="flex-grow">
                    <p className={`text-sm font-semibold ${statusConfig[apiStatus].text}`}>
                      Status: {statusConfig[apiStatus].label}
                    </p>
                    {apiResponse && (
                      <p className="text-xs text-gray-400 font-mono mt-1 break-all">
                        {apiResponse}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
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
