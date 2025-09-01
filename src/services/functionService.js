import api from './api';

export const normalizeFunction = (dto) => ({
  function_id: dto?.function_id ?? dto?.id,
  function_code: dto?.function_code ?? dto?.functionCode ?? dto?.code ?? '',
  name: dto?.name ?? '',
  company_id: dto?.company_id ?? dto?.companyId ?? dto?.company?.company_id ?? null,
  company_name: dto?.company_name ?? dto?.company?.name ?? '',
  parent_id: dto?.parent_id ?? dto?.parent_function_id ?? dto?.parentFunction?.function_id ?? null,
  parent_name: dto?.parent_name ?? dto?.parentFunction?.name ?? '',
  parent_code: dto?.parent_code ?? dto?.parentFunction?.function_code ?? dto?.parentFunction?.functionCode ?? '',
  description: dto?.description ?? dto?.overview ?? '',
  background_color: dto?.background_color ?? dto?.backgroundColor ?? null,
  created_at: dto?.created_at ?? dto?.createdAt ?? null,
  updated_at: dto?.updated_at ?? dto?.updatedAt ?? null,
  // passthroughs
  company: dto?.company ?? null,
  parentFunction: dto?.parentFunction ?? null,
  jobs: Array.isArray(dto?.jobs) ? dto.jobs : [],
});

export async function getFunctionsByBuilding(buildingId) {
  try {
    const res = await api.get(`/buildings/${buildingId}/functions`);
    return Array.isArray(res) ? res.map(normalizeFunction) : [];
  } catch (e) {
    return [];
  }
}

export async function getJobsByFunction(functionId) {
  try {
    const res = await api.get(`/functions/${functionId}/jobs`);
    return Array.isArray(res) ? res : [];
  } catch (e) {
    return [];
  }
}

export async function getFunctionTree(buildingId) {
  const functions = await getFunctionsByBuilding(buildingId);
  const jobsLists = await Promise.all(functions.map(f => getJobsByFunction(f.function_id)));
  const byId = new Map(functions.map(f => [f.function_id, { ...f, jobs: [] }]));
  functions.forEach((f, idx) => {
    byId.get(f.function_id).jobs = jobsLists[idx];
  });
  return Array.from(byId.values());
}

// New: generic list for Function Management table
export async function getFunctions() {
  try {
    // Backend returns array with nested company/parent/jobs
    const res = await api.get('/function');
    return Array.isArray(res) ? res.map(normalizeFunction) : [];
  } catch (e) {
    return [];
  }
}

export async function getFunctionById(functionId) {
  try {
    const res = await api.get(`/function/${functionId}`);
    return res ? normalizeFunction(res) : null;
  } catch (e) {
    return null;
  }
}

export async function patchFunction(functionId, payload) {
  try {
    const body = {};
    if (payload.functionCode !== undefined || payload.function_code !== undefined) body.functionCode = String(payload.functionCode ?? payload.function_code).trim();
    if (payload.name !== undefined) body.name = String(payload.name).trim();
    if (payload.company_id !== undefined) body.company_id = Number(payload.company_id);
    if (payload.parent_function_id !== undefined || payload.parent_id !== undefined) {
      const pid = payload.parent_function_id ?? payload.parent_id;
      body.parent_function_id = pid != null && pid !== '' ? Number(pid) : null;
    }
    if (payload.overview !== undefined || payload.description !== undefined) body.overview = String(payload.overview ?? payload.description);
    if (payload.backgroundColor !== undefined || payload.background_color !== undefined) body.backgroundColor = payload.backgroundColor ?? payload.background_color ?? null;

    const res = await api.patch(`/function/${functionId}`, body);
    return res ? normalizeFunction(res) : null;
  } catch (e) {
    throw e;
  }
}

export async function createFunction(payload) {
  try {
    const body = {
      functionCode: String(payload.functionCode ?? payload.function_code ?? '').trim(),
      name: String(payload.name ?? '').trim(),
      company_id: Number(payload.company_id),
      parent_function_id: (() => {
        const pid = payload.parent_function_id ?? payload.parent_id;
        return pid != null && pid !== '' ? Number(pid) : null;
      })(),
      overview: String(payload.overview ?? payload.description ?? ''),
      backgroundColor: payload.backgroundColor ?? payload.background_color ?? null,
    };
    const res = await api.post('/function', body);
    return res ? normalizeFunction(res) : null;
  } catch (e) {
    throw e;
  }
}

export async function deleteFunction(functionId) {
  try {
    await api.delete(`/function/${functionId}`);
    return true;
  } catch (e) {
    throw e;
  }
}
