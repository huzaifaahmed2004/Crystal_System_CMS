import React, { useState, useMemo } from 'react';
import '../styles/job-management.css';

const JobManagementPage = () => {
  // Dummy data for jobs, functions, tasks, and processes
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
    setShowCreateModal(true);
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

  // Job List View
  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h2 className="page-title">Job Management</h2>
            <p className="page-subtitle">Manage job roles & responsibilities</p>
          </div>
          <button className="create-btn" onClick={handleCreateJob}>+ Create New Job</button>
        </div>
      </div>
      
      <div className="page-content">
        {/* Search and Filters */}
        <div className="filters-section">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="filters">


            <select 
              value={functionFilter} 
              onChange={(e) => setFunctionFilter(e.target.value)}
              className="filter-select"
            >
              <option value="All">All Functions</option>
              {functionsList.map(func => (
                <option key={func} value={func}>{func}</option>
              ))}
            </select>

            <select 
              value={priorityFilter} 
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="filter-select"
            >
              <option value="All">All Priorities</option>
              {priorities.map(priority => (
                <option key={priority} value={priority}>{priority}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Job List */}
        <div className="job-list">
          {filteredJobs.length === 0 ? (
            <div className="no-results">
              <p>No jobs found matching your criteria.</p>
            </div>
          ) : (
            filteredJobs.map(job => (
              <div 
                key={job.id} 
                className="job-card"
                onClick={() => handleJobClick(job)}
              >
                <div className="job-header">
                  <h3 className="job-name">{job.name}</h3>
                  <div className="job-badges">

                    <span 
                      className="priority-badge"
                      style={{ color: getPriorityColor(job.priority) }}
                    >
                      {job.priority}
                    </span>
                  </div>
                </div>
                
                <p className="job-description">{job.description}</p>
                
                <div className="job-stats">
                  <div className="stat-item">
                    <span className="stat-value">{job.linkedTasks.length}</span>
                    <span className="stat-label">Tasks</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{job.linkedProcesses.length}</span>
                    <span className="stat-label">Processes</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{job.completionRate}%</span>
                    <span className="stat-label">Success Rate</span>
                  </div>
                </div>
                
                <div className="job-meta">
                  <div className="meta-item">
                    <span className="meta-label">Assigned Function:</span>
                    <span className="meta-value function-link">{job.assignedFunction}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Owner:</span>
                    <span className="meta-value">{job.owner}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Hours:</span>
                    <span className="meta-value">{job.actualHours}h / {job.estimatedHours}h</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Last Modified:</span>
                    <span className="meta-value">{job.lastModified}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create/Edit Job Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingJob ? 'Edit Job' : 'Create New Job'}</h3>
              <button className="close-btn" onClick={handleCloseModal}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Job Name</label>
                  <input type="text" placeholder="Enter job name" />
                </div>
                
                <div className="form-group">
                  <label>Priority</label>
                  <select>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                
                <div className="form-group full-width">
                  <label>Job Description</label>
                  <textarea placeholder="Enter detailed job description and responsibilities"></textarea>
                </div>
                
                <div className="form-group">
                  <label>Assign to Function</label>
                  <select>
                    <option value="">Select Function</option>
                    {functions.map(func => (
                      <option key={func} value={func}>{func}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Owner</label>
                  <input type="text" placeholder="Job owner/manager" />
                </div>
                
                <div className="form-group">
                  <label>Estimated Hours</label>
                  <input type="number" step="0.5" placeholder="8.0" />
                </div>
                
                <div className="form-group">
                  <label>Status</label>
                  <select>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Draft">Draft</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="action-btn secondary" onClick={handleCloseModal}>
                Cancel
              </button>
              <button className="action-btn primary">
                {editingJob ? 'Update Job' : 'Create Job'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobManagementPage;
