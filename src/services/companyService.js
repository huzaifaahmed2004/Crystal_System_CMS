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
  companyCode: dto?.companyCode ?? dto?.code ?? dto?.company_code ?? '',
  name: dto?.name ?? '',
  created_by: dto?.created_by ?? dto?.createdBy ?? null,
  created_at: dto?.created_at ?? dto?.createdAt ?? null,
  updated_at: dto?.updated_at ?? dto?.updatedAt ?? null,
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

export async function createCompany({ companyCode, name, created_by = 1 }) {
  const payload = {
    companyCode: String(companyCode || '').trim(),
    name: String(name || '').trim(),
    created_by: Number(created_by) || 1,
  };
  const res = await api.post('/company', payload);
  // If backend returns empty, synthesize using payload
  return res ? normalizeCompany(res) : normalizeCompany(payload);
}

// Note: Including id in body assumes backend allows updating code (id).
// If not, we will revise to only send name and provide a separate code-migration flow.
export async function patchCompany(id, { companyCode, name }) {
  const payload = {};
  if (companyCode !== undefined) payload.companyCode = String(companyCode).trim();
  if (name !== undefined) payload.name = String(name).trim();
  const res = await api.patch(`/company/${id}`, payload);
  // If backend returns 204/empty, synthesize updated object using provided fields
  return res ? normalizeCompany(res) : normalizeCompany({ id, companyCode: payload.companyCode, name: payload.name });
}

export async function deleteCompany(id) {
  return api.delete(`/company/${id}`);
}

export async function deleteCompaniesBulk(ids = []) {
  await Promise.all(ids.map((i) => deleteCompany(i)));
}

// Get companies with nested relations (people, buildings -> floors -> rooms)
export async function getCompaniesWithRelations() {
  try {
    const data = await api.get('/company/with-relations');
    if (!Array.isArray(data)) return [];
    return data.map((dto) => ({
      company_id: dto?.company_id ?? dto?.id,
      companyCode: dto?.companyCode ?? dto?.code ?? dto?.company_code ?? '',
      name: dto?.name ?? '',
      created_by: dto?.created_by ?? dto?.createdBy ?? null,
      created_at: dto?.created_at ?? dto?.createdAt ?? null,
      updated_at: dto?.updated_at ?? dto?.updatedAt ?? null,
      people: Array.isArray(dto?.people) ? dto.people : [],
      buildings: Array.isArray(dto?.buildings) ? dto.buildings : [],
    }));
  } catch (e) {
    console.error('Failed to load /company/with-relations', e);
    return [];
  }
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
