import React, { useEffect, useState } from 'react';
import '../styles/role-management.css';
import '../styles/job-management.css';
import { getTasks, deleteTask } from '../services/taskService';
import { getCompaniesLite } from '../services/layoutService';
import ConfirmModal from '../components/ui/ConfirmModal';
import { useAppContext } from '../context/AppContext';

const TaskListTablePage = () => {
  const { setActiveSection } = useAppContext();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [companiesMap, setCompaniesMap] = useState({});
  const [deletingId, setDeletingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [tasksRes, compsRes] = await Promise.all([
          getTasks(),
          getCompaniesLite().catch(() => []),
        ]);
        setList(Array.isArray(tasksRes) ? tasksRes : []);
        const cMap = {};
        (compsRes || []).forEach(c => { cMap[String(c.company_id || c.id)] = c.name; });
        setCompaniesMap(cMap);
      } catch (e) {
        setError(e?.message || 'Failed to load tasks');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleDelete = async (id) => {
    if (id == null) return;
    try {
      setDeletingId(id);
      setConfirmBusy(true);
      setError('');
      // Optimistic remove
      setList(prev => Array.isArray(prev) ? prev.filter(t => String(t.task_id) !== String(id)) : prev);
      await deleteTask(id);
    } catch (e) {
      setError(e?.message || 'Failed to delete task');
    } finally {
      setDeletingId(null);
      setConfirmBusy(false);
      setConfirmId(null);
    }
  };

  const taskName = (t) => t?.task_name || t?.name || t?.taskName || '-';
  const taskCode = (t) => t?.task_code || t?.taskCode || t?.code || '-';
  const companyName = (t) => companiesMap[String(t?.task_company_id ?? t?.company_id)] || '-';
  const fmt = (v) => {
    try { const d = new Date(v); return isNaN(d.getTime()) ? '-' : d.toLocaleString(); } catch { return '-'; }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h2 className="page-title">Task Management</h2>
            <p className="page-subtitle">Browse tasks. Use actions to manage.</p>
          </div>
          <div className="roles-toolbar">
            <button className="primary-btn" onClick={() => setActiveSection('task-create')}>+ Create Task</button>
          </div>
        </div>
      </div>

      <div className="page-content">
        {error && <div className="error-banner">{error}</div>}
        {loading ? (
          <div className="no-results">Loading tasks...</div>
        ) : (
          <div className="roles-table">
            <div className="roles-table-header" style={{ gridTemplateColumns: '1.6fr 1.2fr 1.2fr 1.2fr 1.2fr 180px' }}>
              <div className="cell">Task Name</div>
              <div className="cell">Task Code</div>
              <div className="cell">Company</div>
              <div className="cell">Created At</div>
              <div className="cell">Updated At</div>
              <div className="cell actions" style={{ textAlign: 'right' }}>Actions</div>
            </div>

            {(!list || list.length === 0) ? (
              <div className="no-results">No tasks found</div>
            ) : (
              list.map(t => (
                <div key={t.task_id} className="roles-table-row" style={{ gridTemplateColumns: '1.6fr 1.2fr 1.2fr 1.2fr 1.2fr 180px' }}>
                  <div className="cell">{taskName(t)}</div>
                  <div className="cell">{taskCode(t)}</div>
                  <div className="cell">{companyName(t)}</div>
                  <div className="cell">{fmt(t?.created_at ?? t?.createdAt)}</div>
                  <div className="cell">{fmt(t?.updated_at ?? t?.updatedAt)}</div>
                  <div className="cell actions" style={{ textAlign: 'right' }}>
                    <button
                      className="secondary-btn sm"
                      style={{ marginRight: 6 }}
                      onClick={() => { try { localStorage.setItem('activeTaskId', String(t.task_id)); } catch {}; setActiveSection('task-detail'); }}
                    >
                      View
                    </button>
                    <button
                      className="secondary-btn sm"
                      style={{ marginRight: 6 }}
                      onClick={() => { try { localStorage.setItem('activeTaskId', String(t.task_id)); } catch {}; setActiveSection('task-edit'); }}
                    >
                      Edit
                    </button>
                    <button
                      className="danger-btn sm"
                      disabled={deletingId === t.task_id}
                      onClick={() => setConfirmId(t.task_id)}
                    >
                      {deletingId === t.task_id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <ConfirmModal
          open={confirmId != null}
          title="Delete task"
          message="Are you sure you want to delete this task? This action cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={() => handleDelete(confirmId)}
          onCancel={() => { if (!confirmBusy) setConfirmId(null); }}
          busy={confirmBusy}
        />
      </div>
    </div>
  );
};

export default TaskListTablePage;
