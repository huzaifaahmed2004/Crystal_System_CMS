import React, { useState } from 'react';

const Signup = ({ onToggleAuth }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Basic validation
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }
    
    // TODO: Implement actual registration logic
    console.log('Signup attempt:', formData);
    alert('Signup functionality will be implemented in next steps!');
  };

  return (
    <div className="auth-container signup-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-icon">
            👤
          </div>
          <h2 className="auth-title">
            Create your CMS account
          </h2>
          <p className="auth-subtitle">
            Or{' '}
            <button
              onClick={onToggleAuth}
              className="auth-toggle"
            >
              sign in to existing account
            </button>
          </p>
        </div>
        
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName" className="form-label">
                First Name
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                required
                className="form-input"
                placeholder="First name"
                value={formData.firstName}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="lastName" className="form-label">
                Last Name
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                required
                className="form-input"
                placeholder="Last name"
                value={formData.lastName}
                onChange={handleChange}
              />
            </div>
          </div>
          
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
              autoComplete="new-password"
              required
              className="form-input"
              placeholder="Create a password"
              value={formData.password}
              onChange={handleChange}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              className="form-input"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
          </div>

          <div className="checkbox-group">
            <input
              id="agree-terms"
              name="agree-terms"
              type="checkbox"
              required
              className="checkbox-input"
            />
            <label htmlFor="agree-terms" className="checkbox-label">
              I agree to the{' '}
              <button 
                type="button" 
                className="link-button"
                onClick={() => console.log('Terms of Service clicked')}
              >
                Terms of Service
              </button>{' '}
              and{' '}
              <button 
                type="button" 
                className="link-button"
                onClick={() => console.log('Privacy Policy clicked')}
              >
                Privacy Policy
              </button>
            </label>
          </div>

          <button
            type="submit"
            className="auth-button"
          >
            ✨ Create Account
          </button>
        </form>
      </div>
    </div>
  );
};

export default Signup;
