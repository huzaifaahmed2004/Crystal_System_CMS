import React, { useState } from 'react';

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Basic authentication - in real app, this would call an API
    if (formData.email && formData.password) {
      const userData = {
        name: formData.email.split('@')[0], // Use email prefix as name
        email: formData.email
      };
      onLogin(userData);
    } else {
      alert('Please enter both email and password');
    }
  };

  return (
    <div className="auth-container login-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M17 8V7a5 5 0 10-10 0v1H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2v-9a2 2 0 00-2-2h-2zM9 7a3 3 0 116 0v1H9V7z" fill="currentColor"/>
            </svg>
          </div>
          <h2 className="auth-title">
            Sign in to your CMS
          </h2>
          <p className="auth-subtitle">
            Welcome back! Please sign in to continue.
          </p>
        </div>
        
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="form-input"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="form-input"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
            />
          </div>

          <div className="checkbox-group">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="checkbox-input"
            />
            <label htmlFor="remember-me" className="checkbox-label">
              Remember me
            </label>
          </div>

          <button
            type="submit"
            className="auth-button"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
