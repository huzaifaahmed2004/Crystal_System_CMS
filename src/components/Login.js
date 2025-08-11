import React, { useState } from 'react';

const Login = () => {
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
    // TODO: Implement actual authentication logic
    console.log('Login attempt:', formData);
    alert('Login functionality will be implemented in next steps!');
  };

  return (
    <div className="auth-container login-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-icon">
            🔐
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

          <div className="forgot-password">
            <a href="#" onClick={(e) => e.preventDefault()}>
              Forgot your password?
            </a>
          </div>

          <button
            type="submit"
            className="auth-button"
          >
            🔓 Sign in
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
