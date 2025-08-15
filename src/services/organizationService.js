import api from './api';

// Organization (Company) service
// Expected backend endpoints (adjust as needed):
// - GET /companies -> [{ company_id, name }]
// - GET /companies/:id/stats -> { buildings, floors, rooms, functions, jobs, processes }
// If your backend exposes a single endpoint with embedded stats, update getCompaniesWithStats accordingly.

export async function getCompanies() {
  try {
    const companies = await api.get('/companies');
    return Array.isArray(companies) ? companies : [];
  } catch (e) {
    // Fallback mock to keep UI functional if backend not ready
    console.warn('Falling back to mock companies due to API error');
    return [
      { company_id: 1, name: 'Acme Holdings' },
      { company_id: 2, name: 'Acme Manufacturing' },
      { company_id: 3, name: 'Acme Logistics' },
    ];
  }
}

export async function getCompanyStats(companyId) {
  try {
    const stats = await api.get(`/companies/${companyId}/stats`);
    return stats || {};
  } catch (e) {
    console.warn(`Falling back to mock stats for company ${companyId}`);
    // Provide deterministic mock stats
    const seed = Number(companyId) || 1;
    return {
      buildings: (seed % 3) + 1,
      floors: (seed % 5) + 3,
      rooms: (seed % 7) + 10,
      functions: (seed % 6) + 5,
      jobs: (seed % 20) + 15,
      processes: (seed % 10) + 8,
    };
  }
}

export async function getCompaniesWithStats() {
  const companies = await getCompanies();
  const results = await Promise.all(
    companies.map(async (c) => {
      const stats = await getCompanyStats(c.company_id);
      return { ...c, stats };
    })
  );
  return results;
}
