import React, { useState, useMemo } from 'react';
import '../styles/task-management.css';

const TaskManagementPage = () => {
  // Dummy data for tasks, jobs, and processes
  const [tasks] = useState([
    {
      id: 1,
      name: "Customer Data Validation",
      description: "Organizational task to validate customer information and ensure data accuracy across all customer touchpoints",
      priority: "High",
      duration: "2 hours",
      estimatedHours: 2,
      assignedJob: "Customer Onboarding Specialist",
      linkedProcess: "Customer Onboarding Process",
      assignee: "Customer Service Department",
      createdDate: "2024-01-20",
      tags: ["validation", "customer", "organizational"]
    },
    {
      id: 2,
      name: "Invoice Review & Approval",
      description: "Organizational task for systematic review and approval of vendor invoices according to company policies",
      priority: "Medium",
      duration: "1 hour",
      estimatedHours: 1,
      assignedJob: "Financial Processing Specialist",
      linkedProcess: "Invoice Processing Workflow",
      assignee: "Finance Department",
      createdDate: "2024-01-18",
      tags: ["finance", "approval", "organizational"]
    },
    {
      id: 3,
      name: "System Backup Verification",
      description: "Critical organizational task to verify daily backup completion and data integrity across all systems",
      priority: "High",
      duration: "30 minutes",
      estimatedHours: 0.5,
      assignedJob: "IT Operations Specialist",
      linkedProcess: "Data Backup Procedure",
      assignee: "IT Operations Department",
      createdDate: "2024-01-21",
      tags: ["backup", "verification", "organizational"]
    },
    {
      id: 4,
      name: "Product Quality Inspection",
      description: "Organizational task for systematic quality inspection and compliance verification of manufactured products",
      priority: "High",
      duration: "45 minutes",
      estimatedHours: 0.75,
      assignedJob: "Quality Control Specialist",
      linkedProcess: "Product Quality Check",
      assignee: "Quality Assurance Department",
      createdDate: "2024-01-19",
      tags: ["quality", "inspection", "organizational"]
    },
    {
      id: 5,
      name: "Employee Exit Interview Process",
      description: "Organizational task to conduct structured exit interviews and gather feedback from departing employees",
      priority: "Medium",
      duration: "1.5 hours",
      estimatedHours: 1.5,
      assignedJob: "HR Operations Specialist",
      linkedProcess: "Employee Offboarding",
      assignee: "Human Resources Department",
      createdDate: "2024-01-22",
      tags: ["HR", "interview", "organizational"]
    },
    {
      id: 6,
      name: "Marketing Asset Development",
      description: "Organizational task for creating comprehensive marketing assets and materials for campaign launches",
      priority: "Medium",
      duration: "4 hours",
      estimatedHours: 4,
      assignedJob: "Marketing Creative Specialist",
      linkedProcess: "Marketing Campaign Launch",
      assignee: "Marketing Department",
      createdDate: "2024-01-23",
      tags: ["marketing", "creative", "organizational"]
    }
  ]);

  const [jobs] = useState([
    "Customer Onboarding Specialist", "Financial Processing Specialist", "IT Operations Specialist", 
    "Quality Control Specialist", "HR Operations Specialist", "Marketing Creative Specialist", 
    "Data Analysis Specialist", "Support Operations Specialist"
  ]);

  const [processes] = useState([
    "Customer Onboarding Process", "Invoice Processing Workflow", 
    "Data Backup Procedure", "Product Quality Check", "Employee Offboarding",
    "Marketing Campaign Launch", "System Maintenance", "User Support Process"
  ]);

  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [assigneeFilter, setAssigneeFilter] = useState('All');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Get unique values for filters
  const priorities = [...new Set(tasks.map(t => t.priority))];
  const assignees = [...new Set(tasks.map(t => t.assignee))];

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           task.assignee.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesPriority = priorityFilter === 'All' || task.priority === priorityFilter;
      const matchesAssignee = assigneeFilter === 'All' || task.assignee === assigneeFilter;

      return matchesSearch && matchesPriority && matchesAssignee;
    });
  }, [tasks, searchTerm, priorityFilter, assigneeFilter]);



  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return '#ef4444';
      case 'Medium': return '#f59e0b';
      case 'Low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
  };

  const handleBackToList = () => {
    setSelectedTask(null);
  };

  const handleCreateTask = () => {
    setShowCreateModal(true);
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingTask(null);
  };

  // Task Detail View
  if (selectedTask) {
    return (
      <div className="page-container">
        <div className="page-header">
          <div className="task-detail-header">
            <button className="back-button" onClick={handleBackToList}>
              ← Back to Task List
            </button>
            <div>
              <h2 className="page-title">{selectedTask.name}</h2>
              <p className="page-subtitle">{selectedTask.description}</p>
            </div>
          </div>
        </div>
        
        <div className="task-detail-content">
          <div className="task-detail-grid">
            <div className="task-info-card">
              <h3>Task Information</h3>
              <div className="info-grid">

                <div className="info-item">
                  <label>Priority</label>
                  <span className="priority-badge" style={{ color: getPriorityColor(selectedTask.priority) }}>
                    {selectedTask.priority}
                  </span>
                </div>
                <div className="info-item">
                  <label>Assignee</label>
                  <span>{selectedTask.assignee}</span>
                </div>

                <div className="info-item">
                  <label>Assigned Job</label>
                  <span className="job-link">{selectedTask.assignedJob}</span>
                </div>
                <div className="info-item">
                  <label>Linked Process</label>
                  <span className="process-link">{selectedTask.linkedProcess}</span>
                </div>
              </div>
            </div>

            <div className="task-duration-card">
              <h3>Duration Information</h3>
              <div className="duration-section">
                
                <div className="duration-stats">
                  <div className="duration-item">
                    <label>Estimated Duration</label>
                    <span>{selectedTask.duration}</span>
                  </div>
                  <div className="duration-item">
                    <label>Estimated Hours</label>
                    <span>{selectedTask.estimatedHours}h</span>
                  </div>

                </div>
              </div>
            </div>
          </div>

          <div className="task-actions-card">
            <h3>Actions</h3>
            <div className="action-buttons">
              <button className="action-btn primary" onClick={() => handleEditTask(selectedTask)}>
                Edit Task
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

  // Task List View
  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h2 className="page-title">Task Management</h2>
            <p className="page-subtitle">Create, manage and edit organizational workflow tasks</p>
          </div>
          <button className="create-btn" onClick={handleCreateTask}>+ Create New Task</button>
        </div>
      </div>
      
      <div className="page-content">
        {/* Search and Filters */}
        <div className="filters-section">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="filters">


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

            <select 
              value={assigneeFilter} 
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="filter-select"
            >
              <option value="All">All Assignees</option>
              {assignees.map(assignee => (
                <option key={assignee} value={assignee}>{assignee}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Task List */}
        <div className="task-list">
          {filteredTasks.length === 0 ? (
            <div className="no-results">
              <p>No tasks found matching your criteria.</p>
            </div>
          ) : (
            filteredTasks.map(task => (
              <div 
                key={task.id} 
                className="task-card"
                onClick={() => handleTaskClick(task)}
              >
                <div className="task-header">
                  <h3 className="task-name">{task.name}</h3>
                  <div className="task-badges">
                    <span 
                      className="priority-badge"
                      style={{ color: getPriorityColor(task.priority) }}
                    >
                      {task.priority}
                    </span>
                  </div>
                </div>
                
                <p className="task-description">{task.description}</p>
                
                <div className="task-duration">
                  <span className="duration-info">Duration: {task.duration}</span>
                </div>
                
                <div className="task-meta">
                  <div className="meta-item">
                    <span className="meta-label">Assigned Job:</span>
                    <span className="meta-value job-link">{task.assignedJob}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Linked Process:</span>
                    <span className="meta-value process-link">{task.linkedProcess}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Assignee:</span>
                    <span className="meta-value">{task.assignee}</span>
                  </div>

                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create/Edit Task Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingTask ? 'Edit Task' : 'Create New Task'}</h3>
              <button className="close-btn" onClick={handleCloseModal}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Task Name</label>
                  <input type="text" placeholder="Enter task name" />
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
                  <label>Description</label>
                  <textarea placeholder="Enter task description"></textarea>
                </div>
                
                <div className="form-group">
                  <label>Assign to Job</label>
                  <select>
                    <option value="">Select Job</option>
                    {jobs.map(job => (
                      <option key={job} value={job}>{job}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Link to Process</label>
                  <select>
                    <option value="">Select Process</option>
                    {processes.map(process => (
                      <option key={process} value={process}>{process}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Estimated Duration (hours)</label>
                  <input type="number" step="0.5" placeholder="2.5" />
                </div>
                

                
                <div className="form-group">
                  <label>Assignee</label>
                  <select>
                    <option value="">Select Assignee</option>
                    {assignees.map(assignee => (
                      <option key={assignee} value={assignee}>{assignee}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="action-btn secondary" onClick={handleCloseModal}>
                Cancel
              </button>
              <button className="action-btn primary">
                {editingTask ? 'Update Task' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskManagementPage;
