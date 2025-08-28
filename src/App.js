import React, { useState } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import './styles/dashboard.css';
import './styles/dashboard-page.css';

function App() {
  // Temporary: bypass auth to work on frontend while backend is down
  const DEV_BYPASS_AUTH = false; // login API working: restore login routing

  // Initialize from sessionStorage so refresh retains session
  const initialAuth = (() => {
    try {
      const raw = sessionStorage.getItem('auth');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const [isAuthenticated, setIsAuthenticated] = useState(DEV_BYPASS_AUTH ? true : !!initialAuth);
  const [user, setUser] = useState(DEV_BYPASS_AUTH ? { name: 'Admin' } : (initialAuth?.user || null));

  // onLogin expects { user, accessToken }
  const handleLogin = (authPayload) => {
    const { user: nextUser, accessToken: nextToken } = authPayload || {};
    if (!nextUser || !nextToken) return;
    // Persist auth info for this tab only
    sessionStorage.setItem('auth', JSON.stringify({ user: nextUser, accessToken: nextToken }));
    setIsAuthenticated(true);
    setUser(nextUser);
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
      {(DEV_BYPASS_AUTH || isAuthenticated) ? (
        <Dashboard user={user} onLogout={handleLogout} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;
