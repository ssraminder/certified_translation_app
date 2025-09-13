import React from 'react';
import QuoteRequestForm from './components/QuoteRequestForm';
import Header from './components/Header';

const App: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <QuoteRequestForm />
      </main>
      <footer className="text-center py-6 text-sm opacity-70">
        <p>&copy; {new Date().getFullYear()} Certified Translation Agency</p>
      </footer>
    </div>
  );
};

export default App;
