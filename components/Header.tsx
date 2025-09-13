import React, { useState } from 'react';
import { MenuIcon, XIcon } from './icons';

const Header: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between bg-white dark:bg-[#0C1E40] shadow px-4 py-2" role="navigation" aria-label="Main Navigation">
      <a href="/" className="flex items-center">
        <img src="/logo.png" alt="Logo" className="h-10" />
      </a>
      <nav className="hidden md:flex items-center space-x-4">
        <a href="/login" className="text-[var(--accent-color)] font-medium">Login</a>
      </nav>
      <button
        aria-label="Menu"
        className="md:hidden p-2"
        onClick={() => setOpen(!open)}
      >
        {open ? <XIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
      </button>
      {open && (
        <div className="absolute top-full right-0 bg-white dark:bg-[#0C1E40] shadow-md w-40 md:hidden">
          <a href="/login" className="block px-4 py-2 text-[var(--accent-color)]">Login</a>
        </div>
      )}
    </header>
  );
};

export default Header;
