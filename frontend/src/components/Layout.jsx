import React from 'react';
import { Link } from 'react-router-dom';

export default function Layout({ children }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-mark">P</span>
          <span>
            <strong>Purchase</strong>Flow
          </span>
        </Link>

        <nav>
          <Link to="/">Solicitudes</Link>
          <Link to="/create" className="nav-button">
            + Nueva solicitud
          </Link>
        </nav>
      </header>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
