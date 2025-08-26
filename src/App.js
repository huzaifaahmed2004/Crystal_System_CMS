import React, { useState } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import './styles/dashboard.css';
import './styles/dashboard-page.css';

function App() {
  // Initialize from sessionStorage so refresh retains session
  const initialAuth = (() => {
    try {
      const raw = sessionStorage.getItem('auth');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const [isAuthenticated, setIsAuthenticated] = useState(!!initialAuth);
  const [user, setUser] = useState(initialAuth?.user || null);

  const handleLogin = (userData) => {
    // Persist minimal auth info for this tab only
    sessionStorage.setItem('auth', JSON.stringify({ user: userData }));
    setIsAuthenticated(true);
    setUser(userData);
  };

  const handleLogout = () => {
    // Clear session on logout
    sessionStorage.removeItem('auth');
    try { localStorage.removeItem('auth'); } catch {}
    setIsAuthenticated(false);
    setUser(null);
  };

  // Note: we intentionally do NOT clear on refresh; sessionStorage
  // is automatically cleared when the tab/window is closed.

  return (
    <div className="App">
      {isAuthenticated ? (
        <Dashboard user={user} onLogout={handleLogout} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;
