import React from 'react';

interface CardProps {
  step: string;
  title: string;
  description: string;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ step, title, description, children }) => {
  return (
    <section className="bg-gray-800/50 border border-gray-700 rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-cyan-500/10 hover:border-cyan-800">
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-gray-700/50 border border-gray-600 rounded-full flex items-center justify-center font-bold text-xl text-cyan-400">
            {step}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white">{title}</h2>
            <p className="mt-1 text-gray-400">{description}</p>
          </div>
        </div>
        <div className="mt-6 pl-16">
          {children}
        </div>
      </div>
    </section>
  );
};
