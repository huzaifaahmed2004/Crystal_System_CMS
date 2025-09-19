import api from './api';

// Base URL for What-if Analysis backend (can be different from core API)
// Configure in your environment: REACT_APP_WHATIF_API_URL
// Fallbacks provided for naming variations.
const WHATIF_API_BASE = process.env.REACT_APP_WHATIF_API_URL
  || process.env.REACT_APP_WHAT_IF_API_URL
  || process.env.REACT_APP_AI_AGENTS_API_URL
  || '';

// Optimize a predefined process by name
export async function optimizeProcess(processName) {
  if (!processName) throw new Error('processName is required');
  const endpoint = `${WHATIF_API_BASE}/optimize/cms-process/${encodeURIComponent(processName)}`;
  // Body is empty per current backend contract; keep as {} for consistency
  return api.get(endpoint, {});
}

