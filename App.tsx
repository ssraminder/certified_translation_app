import React from 'react';
import { Card } from './components/Card';
import { CodeBlock } from './components/CodeBlock';
import { GithubIcon, NetlifyIcon, ReactIcon, ViteIcon } from './components/icons';

const App: React.FC = () => {
  const GITHUB_REPO_URL = 'https://github.com/new';

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

           <div className="text-center py-8 px-6 bg-gray-800/50 rounded-lg border border-dashed border-gray-600">
              <h2 className="text-2xl font-bold text-gray-400">API Health</h2>
              <p className="mt-2 text-3xl font-semibold text-gray-200 animate-pulse">
                Coming Soon
              </p>
              <p className="mt-3 text-gray-500">
                A dedicated status page for monitoring our services will be available here.
              </p>
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
