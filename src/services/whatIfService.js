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
  return api.post(endpoint, {});
}

// Optimize with custom constraints
export async function optimizeCustom(processRef, constraints) {
  if (!processRef) throw new Error('process identifier is required');
  const endpoint = `${WHATIF_API_BASE}/optimize/custom`;
  const isNumericId = /^\d+$/.test(String(processRef));
  const body = {
    ...(isNumericId ? { process_id: Number(processRef) } : { process_name: String(processRef) }),
    constraints: constraints || {}
  };
  return api.post(endpoint, body);
}

// Optimize with custom constraints using raw constraint payload (no processRef).
// Matches the legacy frontend implementation in /frontend/script.js
export async function optimizeWithConstraints(constraints) {
  const endpoint = `${WHATIF_API_BASE}/optimize/custom`;
  return api.post(endpoint, constraints || {});
}

// Optimize with { constraints: <payload> } envelope (legacy alt shape)
export async function optimizeWithConstraintsBody(constraints) {
  const endpoint = `${WHATIF_API_BASE}/optimize/custom`;
  return api.post(endpoint, { constraints: constraints || {} });
}
