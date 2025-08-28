// Base API configuration
// In development, if no env is provided, we use relative endpoints (""),
// allowing CRA dev proxy to avoid CORS.
const API_BASE_URL = process.env.REACT_APP_API_URL || process.env.REACT_APP_BASE_URL || '';

class ApiService {
  async request(endpoint, options = {}) {
    const url = /^https?:\/\//i.test(endpoint) ? endpoint : `${API_BASE_URL}${endpoint}`;
    // Read access token from sessionStorage
    let token = null;
    try {
      const raw = sessionStorage.getItem('auth');
      if (raw) {
        const parsed = JSON.parse(raw);
        token = parsed?.accessToken || null;
      }
    } catch (_) {}

    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        let message = `HTTP error! status: ${response.status}`;
        try {
          const ct = response.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            const errJson = await response.json();
            if (errJson && typeof errJson === 'object') {
              message = errJson.message || errJson.error || JSON.stringify(errJson);
            }
          } else {
            const errText = await response.text();
            if (errText) message = errText;
          }
        } catch (_) {
          // ignore parse errors, keep default message
        }
        throw new Error(message);
      }
      // Gracefully handle empty bodies (e.g. 204) or non-JSON responses
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return await response.json();
      }
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // GET request
  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  // POST request
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // PUT request
  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // PATCH request
  async patch(endpoint, data) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // DELETE request
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

const apiInstance = new ApiService();
export default apiInstance;
