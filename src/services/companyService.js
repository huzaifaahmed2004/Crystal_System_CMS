import api from './api';

// Company service (singular endpoints)
// Endpoints:
// - GET /company
// - GET /company/:id
// - POST /company
// - PATCH /company/:id
// - DELETE /company/:id

const normalizeCompany = (dto) => ({
  company_id: dto?.company_id ?? dto?.id,
  name: dto?.name ?? ''
});

export async function getCompanies() {
  try {
    const data = await api.get('/company');
    return Array.isArray(data) ? data.map(normalizeCompany) : [];
  } catch (e) {
    console.warn('Falling back to mock companies due to API error');
    return [
      { company_id: 1, name: 'Acme Holdings' },
      { company_id: 2, name: 'Acme Manufacturing' },
      { company_id: 3, name: 'Acme Logistics' },
    ];
  }
}

export async function getCompanyById(id) {
  const res = await api.get(`/company/${id}`);
  return res ? normalizeCompany(res) : null;
}

export async function createCompany({ company_id, name }) {
  const payload = { company_id: Number(company_id), name: String(name || '').trim() };
  const res = await api.post('/company', payload);
  return res ? normalizeCompany(res) : normalizeCompany(payload);
}

// Note: Including id in body assumes backend allows updating code (id).
// If not, we will revise to only send name and provide a separate code-migration flow.
export async function patchCompany(id, { company_id, name }) {
  const payload = {};
  if (name !== undefined) payload.name = String(name).trim();
  if (company_id !== undefined && Number(company_id) !== Number(id)) payload.id = Number(company_id);
  const res = await api.patch(`/company/${id}`, payload);
  // If backend returns 204/empty, synthesize updated object
  return res ? normalizeCompany(res) : normalizeCompany({ id: payload.id ?? id, name: payload.name });
}

export async function deleteCompany(id) {
  return api.delete(`/company/${id}`);
}

export async function deleteCompaniesBulk(ids = []) {
  await Promise.all(ids.map((i) => deleteCompany(i)));
}

// Optional: legacy overview support if stats endpoint exists
export async function getCompanyStats(companyId) {
  try {
    const stats = await api.get(`/companies/${companyId}/stats`);
    return stats || {};
  } catch (e) {
    console.warn(`Falling back to mock stats for company ${companyId}`);
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
