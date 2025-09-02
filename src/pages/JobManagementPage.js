import React, { useEffect, useMemo, useState } from 'react';
import '../styles/job-management.css';
import '../styles/role-management.css';
import { getJobs, deleteJob } from '../services/jobService';
import { getFunctions } from '../services/functionService';
import { getCompaniesLite } from '../services/layoutService';
import FormModal from '../components/ui/FormModal';
import { useAppContext } from '../context/AppContext';

const JobManagementPage = () => {
  const { setActiveSection, setJobId } = useAppContext();

  // API-backed list state
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [functionsMap, setFunctionsMap] = useState({});
  const [companiesMap, setCompaniesMap] = useState({});
  const [deletingId, setDeletingId] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetId, setTargetId] = useState(null);
  const [targetName, setTargetName] = useState('');

  // Keep existing demo state (unused in table) to avoid large refactor below
  const [jobs] = useState([
    {
      id: 1,
      name: "Customer Onboarding",
      description: "Handle complete customer registration and setup process including data validation, account creation, and initial configuration",
      assignedFunction: "Customer Management",

      priority: "High",
      createdDate: "2024-01-15",
      lastModified: "2024-01-20",
      owner: "John Smith",
      linkedTasks: [
        { id: 1, name: "Customer Data Validation" },
        { id: 7, name: "Account Setup" }
      ],
      linkedProcesses: [
        { id: 1, name: "Customer Onboarding Process" }
      ],
      estimatedHours: 8,
      actualHours: 6.5,
      completionRate: 94.5
    },
    {
      id: 2,
      name: "Financial Processing",
      description: "Manage all financial operations including invoice processing, payment validation, and financial reporting",
      assignedFunction: "Finance Operations",

      priority: "High",
      createdDate: "2024-01-10",
      lastModified: "2024-01-18",
      owner: "Sarah Johnson",
      linkedTasks: [
        { id: 2, name: "Invoice Review" },
        { id: 8, name: "Payment Processing" }
      ],
      linkedProcesses: [
        { id: 2, name: "Invoice Processing Workflow" }
      ],
      estimatedHours: 6,
      actualHours: 5.2,
      completionRate: 98.2
    },
    {
      id: 3,
      name: "IT Maintenance",
      description: "Ensure system reliability through regular maintenance, backups, and security updates",
      assignedFunction: "IT Operations",

      priority: "High",
      createdDate: "2024-01-05",
      lastModified: "2024-01-12",
      owner: "Tom Wilson",
      linkedTasks: [
        { id: 3, name: "System Backup Verification" },
        { id: 9, name: "Security Updates" }
      ],
      linkedProcesses: [
        { id: 5, name: "Data Backup Procedure" }
      ],
      estimatedHours: 4,
      actualHours: 3.8,
      completionRate: 99.1
    },
    {
      id: 4,
      name: "Production Quality",
      description: "Maintain product quality standards through systematic inspection and quality control procedures",
      assignedFunction: "Manufacturing",

      priority: "High",
      createdDate: "2024-01-08",
      lastModified: "2024-01-22",
      owner: "Lisa Chen",
      linkedTasks: [
        { id: 4, name: "Quality Control Check" },
        { id: 10, name: "Product Testing" }
      ],
      linkedProcesses: [
        { id: 4, name: "Product Quality Check" }
      ],
      estimatedHours: 6,
      actualHours: 5.5,
      completionRate: 96.8
    },
    {
      id: 5,
      name: "HR Operations",
      description: "Handle human resources activities including employee onboarding, offboarding, and performance management",
      assignedFunction: "Human Resources",

      priority: "Medium",
      createdDate: "2024-01-01",
      lastModified: "2024-01-25",
      owner: "Mike Davis",
      linkedTasks: [
        { id: 5, name: "Employee Exit Interview" },
        { id: 11, name: "Performance Review" }
      ],
      linkedProcesses: [
        { id: 3, name: "Employee Offboarding" }
      ],
      estimatedHours: 5,
      actualHours: 4.3,
      completionRate: 87.3
    },
    {
      id: 6,
      name: "Marketing Creative",
      description: "Develop and execute creative marketing campaigns including asset creation and campaign management",
      assignedFunction: "Marketing",

      priority: "Medium",
      createdDate: "2024-01-20",
      lastModified: "2024-01-23",
      owner: "Emma Brown",
      linkedTasks: [
        { id: 6, name: "Campaign Asset Creation" },
        { id: 12, name: "Social Media Management" }
      ],
      linkedProcesses: [
        { id: 6, name: "Marketing Campaign Launch" }
      ],
      estimatedHours: 8,
      actualHours: 6.2,
      completionRate: 91.7
    }
  ]);

  const [functions] = useState([
    "Customer Management", "Finance Operations", "IT Operations", 
    "Manufacturing", "Human Resources", "Marketing", 
    "Data Analytics", "Support Operations", "Quality Assurance"
  ]);

  // State management
  const [searchTerm, setSearchTerm] = useState('');

  const [functionFilter, setFunctionFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [selectedJob, setSelectedJob] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingJob, setEditingJob] = useState(null);

  // Get unique values for filters
  const functionsList = [...new Set(jobs.map(j => j.assignedFunction))];
  const priorities = [...new Set(jobs.map(j => j.priority))];

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchesSearch = job.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           job.owner.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFunction = functionFilter === 'All' || job.assignedFunction === functionFilter;
      const matchesPriority = priorityFilter === 'All' || job.priority === priorityFilter;
      return matchesSearch && matchesFunction && matchesPriority;
    });
  }, [jobs, searchTerm, functionFilter, priorityFilter]);

  // Fetch jobs + supporting maps
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [jobsRes, funcsRes, compsRes] = await Promise.all([
          getJobs(),
          getFunctions().catch(() => []),
          getCompaniesLite().catch(() => []),
        ]);
        setList(Array.isArray(jobsRes) ? jobsRes : []);
        const fMap = {};
        (funcsRes || []).forEach(f => { fMap[String(f.function_id)] = f.name; });
        setFunctionsMap(fMap);
        const cMap = {};
        (compsRes || []).forEach(c => { cMap[String(c.company_id || c.id)] = c.name; });
        setCompaniesMap(cMap);
      } catch (e) {
        setError(e?.message || 'Failed to load jobs');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const refresh = async () => {
    try {
      const jobsRes = await getJobs();
      setList(Array.isArray(jobsRes) ? jobsRes : []);
    } catch (e) {
      setError(e?.message || 'Failed to load jobs');
    }
  };

  const handleView = (id) => {
    try { localStorage.setItem('activeJobId', String(id)); } catch {}
    setJobId(id);
    setActiveSection('job-detail');
  };

  const requestDelete = (id, name) => {
    setTargetId(id);
    setTargetName(name || 'this job');
    setConfirmOpen(true);
  };

  const onDeleteConfirmed = async () => {
    const id = targetId;
    if (!id) { setConfirmOpen(false); return; }
    try {
      setDeletingId(id);
      setConfirmOpen(false);
      // Optimistic update
      setList(prev => prev.filter(j => String(j.job_id) !== String(id)));
      await deleteJob(id);
      await refresh();
    } catch (e) {
      setError(e?.message || 'Failed to delete job');
      await refresh();
    } finally {
      setDeletingId(null);
      setTargetId(null);
      setTargetName('');
    }
  };



  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return '#ef4444';
      case 'Medium': return '#f59e0b';
      case 'Low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getTaskStatusColor = (status) => {
    switch (status) {
      case 'Completed': return '#10b981';
      case 'In Progress': return '#3b82f6';
      case 'Pending': return '#f59e0b';
      case 'Scheduled': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const handleJobClick = (job) => {
    setSelectedJob(job);
  };

  const handleBackToList = () => {
    setSelectedJob(null);
  };

  const handleCreateJob = () => {
    setActiveSection('job-create');
  };

  const handleEdit = (id) => {
    try { localStorage.setItem('activeJobId', String(id)); } catch {}
    setJobId(id);
    setActiveSection('job-edit');
  };

  const handleEditJob = (job) => {
    setEditingJob(job);
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingJob(null);
  };

  // Job Detail View
  if (selectedJob) {
    return (
      <div className="page-container">
        <div className="page-header">
          <div className="job-detail-header">
            <button className="back-button" onClick={handleBackToList}>
              ← Back to Job List
            </button>
            <div>
              <h2 className="page-title">{selectedJob.name}</h2>
              <p className="page-subtitle">{selectedJob.description}</p>
            </div>
          </div>
        </div>
        
        <div className="job-detail-content">
          <div className="job-detail-grid">
            <div className="job-info-card">
              <h3>Job Information</h3>
              <div className="info-grid">

                <div className="info-item">
                  <label>Priority</label>
                  <span className="priority-badge" style={{ color: getPriorityColor(selectedJob.priority) }}>
                    {selectedJob.priority}
                  </span>
                </div>
                <div className="info-item">
                  <label>Assigned Function</label>
                  <span className="function-link">{selectedJob.assignedFunction}</span>
                </div>
                <div className="info-item">
                  <label>Owner</label>
                  <span>{selectedJob.owner}</span>
                </div>
                <div className="info-item">
                  <label>Created Date</label>
                  <span>{selectedJob.createdDate}</span>
                </div>
                <div className="info-item">
                  <label>Last Modified</label>
                  <span>{selectedJob.lastModified}</span>
                </div>
              </div>
            </div>

            <div className="job-stats-card">
              <h3>Performance Metrics</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-value">{selectedJob.estimatedHours}h</div>
                  <div className="stat-label">Estimated Hours</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{selectedJob.actualHours}h</div>
                  <div className="stat-label">Actual Hours</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{selectedJob.completionRate}%</div>
                  <div className="stat-label">Completion Rate</div>
                </div>
              </div>
            </div>
          </div>

          <div className="linked-items-section">
            <div className="linked-tasks-card">
              <h3>Linked Tasks ({selectedJob.linkedTasks.length})</h3>
              <div className="linked-items-list">
                {selectedJob.linkedTasks.map(task => (
                  <div key={task.id} className="linked-item">
                    <span className="item-name">{task.name}</span>
                    <span 
                      className="item-status" 
                      style={{ backgroundColor: getTaskStatusColor(task.status) }}
                    >
                      {task.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="linked-processes-card">
              <h3>Linked Processes ({selectedJob.linkedProcesses.length})</h3>
              <div className="linked-items-list">
                {selectedJob.linkedProcesses.map(process => (
                  <div key={process.id} className="linked-item">
                    <span className="item-name">{process.name}</span>

                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="job-actions-card">
            <h3>Actions</h3>
            <div className="action-buttons">
              <button className="action-btn primary" onClick={() => handleEditJob(selectedJob)}>
                Edit Job
              </button>
              <button className="action-btn secondary">Duplicate</button>
              <button className="action-btn secondary">Export</button>
              <button className="action-btn danger">Delete</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Job List View (API-backed table)
  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h2 className="page-title">Job Management</h2>
            <p className="page-subtitle">Browse jobs. Use actions to view or edit.</p>
          </div>
          <div className="roles-toolbar">
            <button className="primary-btn" onClick={handleCreateJob}>+ Create Job</button>
          </div>
        </div>
      </div>

      <div className="page-content">
        {error && <div className="error-banner">{error}</div>}
        {loading ? (
          <div className="no-results">Loading jobs...</div>
        ) : (
          <div className="roles-table">
            <div className="roles-table-header" style={{ gridTemplateColumns: '1fr 1.3fr 1.2fr 1.2fr 1.1fr 1.1fr 180px' }}>
              <div className="cell">Job Code</div>
              <div className="cell">Job Name</div>
              <div className="cell">Function</div>
              <div className="cell">Company</div>
              <div className="cell">Created At</div>
              <div className="cell">Updated At</div>
              <div className="cell actions" style={{ textAlign: 'right' }}>Actions</div>
            </div>

            {(!list || list.length === 0) ? (
              <div className="no-results">No jobs found</div>
            ) : (
              list.map(j => (
                <div key={j.job_id} className="roles-table-row" style={{ gridTemplateColumns: '1fr 1.3fr 1.2fr 1.2fr 1.1fr 1.1fr 180px' }}>
                  <div className="cell">{j.jobCode || '-'}</div>
                  <div className="cell">{j.name || '-'}</div>
                  <div className="cell">{functionsMap[String(j.function_id)] || '-'}</div>
                  <div className="cell">{companiesMap[String(j.company_id)] || '-'}</div>
                  <div className="cell">{j.createdAt ? new Date(j.createdAt).toLocaleString() : '-'}</div>
                  <div className="cell">{j.updatedAt ? new Date(j.updatedAt).toLocaleString() : '-'}</div>
                  <div className="cell actions" style={{ textAlign: 'right' }}>
                    <button className="secondary-btn sm" onClick={() => handleView(j.job_id)} style={{ marginRight: 6 }}>View</button>
                    <button className="secondary-btn sm" onClick={() => handleEdit(j.job_id)} style={{ marginRight: 6 }}>Edit</button>
                    <button className="danger-btn sm" disabled={deletingId === j.job_id} onClick={() => requestDelete(j.job_id, j.name)}>
                      {deletingId === j.job_id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <FormModal
          open={confirmOpen}
          title="Delete Job"
          onCancel={() => { setConfirmOpen(false); setTargetId(null); setTargetName(''); }}
          footer={(
            <>
              <button className="modal-btn" type="button" onClick={() => { setConfirmOpen(false); }}>Cancel</button>
              <button className="danger-btn" type="button" onClick={onDeleteConfirmed} style={{ marginLeft: 8 }}>Delete</button>
            </>
          )}
        >
          <p>Are you sure you want to delete <strong>{targetName || 'this job'}</strong>? This action cannot be undone.</p>
        </FormModal>
      </div>
    </div>
  );
};

export default JobManagementPage;
