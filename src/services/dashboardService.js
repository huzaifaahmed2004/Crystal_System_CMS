import api from './api';
import { getCompaniesWithRelations } from './companyService';
import { getProcessesWithRelations } from './processService';

// Dashboard service
// Primary: try a single API that returns overall stats.
// Fallback: derive stats by combining existing endpoints.

const normalizeStats = (dto = {}) => ({
  companies: Number(dto.companies ?? dto.companyCount ?? dto.total_companies ?? 0) || 0,
  processes: Number(dto.processes ?? dto.processCount ?? dto.total_processes ?? 0) || 0,
  tasks: Number(dto.tasks ?? dto.taskCount ?? dto.total_tasks ?? 0) || 0,
  jobs: Number(dto.jobs ?? dto.jobCount ?? dto.total_jobs ?? 0) || 0,
});

export async function getDashboardStats() {
  // 1) Try a canonical stats endpoint
  try {
    const res = await api.get('/dashboard/stats');
    if (res && typeof res === 'object') return normalizeStats(res);
  } catch (_) {
    // ignore and try next
  }

  // 2) Try an alternative path some backends use
  try {
    const resAlt = await api.get('/dashboard/overview');
    if (resAlt && typeof resAlt === 'object') return normalizeStats(resAlt);
  } catch (_) {
    // ignore and fall back to composition
  }

  // 3) Fallback: derive from existing resources
  try {
    const [companies, processes] = await Promise.all([
      getCompaniesWithRelations(),
      getProcessesWithRelations(),
    ]);

    const companiesCount = Array.isArray(companies) ? companies.length : 0;
    const processesList = Array.isArray(processes) ? processes : [];

    let tasksCount = 0;
    const jobIds = new Set();

    processesList.forEach((p) => {
      if (Array.isArray(p?.process_tasks)) {
        tasksCount += p.process_tasks.length;
        p.process_tasks.forEach((pt) => {
          const jobs = pt?.task?.jobTasks || [];
          jobs.forEach((jt) => {
            const jid = jt?.job?.job_id;
            if (jid) jobIds.add(jid);
          });
        });
      }
    });

    return {
      companies: companiesCount,
      processes: processesList.length,
      tasks: tasksCount,
      jobs: jobIds.size,
    };
  } catch (e) {
    console.error('Failed to compute dashboard stats', e);
    return { companies: 0, processes: 0, tasks: 0, jobs: 0 };
  }
}

export default {
  getDashboardStats,
};

// Upload an Excel file to import dashboard-related data.
// Accepts File or Blob; wraps it in FormData and tries a few common endpoints.
export async function importDashboardExcel(file) {
  if (!file) throw new Error('No file provided');
  const form = new FormData();
  form.append('file', file);

  const tryEndpoints = ['/dashboard/import', '/import/excel', '/import'];
  let lastErr = null;
  for (const ep of tryEndpoints) {
    try {
      // Use the lower-level request to allow FormData without JSON headers
      const res = await api.request(ep, { method: 'POST', body: form });
      return res;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('Failed to import file');
}
