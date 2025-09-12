import React from 'react';
import QuoteRequestForm from './components/QuoteRequestForm';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#0E3CB5] tracking-tight">
            Project Setup & Deployment Guide
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            From local development to live deployment with React, Vite, and Netlify.
          </p>
        </header>

        <main className="space-y-8">
          <QuoteRequestForm />
        </main>

        <footer className="text-center mt-12 text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} React Deployment Guide. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
