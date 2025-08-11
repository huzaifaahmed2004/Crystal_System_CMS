import React, { useState, useMemo } from 'react';
import '../styles/process-management.css';

const ProcessManagementPage = () => {
  // Dummy process data
  const [processes] = useState([
    {
      id: 1,
      name: "Customer Onboarding Process",
      description: "Complete workflow for new customer registration and setup",

      category: "Customer Management",
      priority: "High",
      createdDate: "2024-01-15",
      lastModified: "2024-01-20",
      owner: "John Smith",
      steps: 8,
      avgExecutionTime: "45 minutes",
      successRate: 94.5
    },
    {
      id: 2,
      name: "Invoice Processing Workflow",
      description: "Automated invoice validation and approval process",

      category: "Finance",
      priority: "Medium",
      createdDate: "2024-01-10",
      lastModified: "2024-01-18",
      owner: "Sarah Johnson",
      steps: 6,
      avgExecutionTime: "15 minutes",
      successRate: 98.2
    },
    {
      id: 3,
      name: "Employee Offboarding",
      description: "Systematic process for employee departure procedures",

      category: "HR",
      priority: "Low",
      createdDate: "2024-01-05",
      lastModified: "2024-01-12",
      owner: "Mike Davis",
      steps: 12,
      avgExecutionTime: "2 hours",
      successRate: 87.3
    },
    {
      id: 4,
      name: "Product Quality Check",
      description: "Quality assurance process for manufactured products",

      category: "Manufacturing",
      priority: "High",
      createdDate: "2024-01-08",
      lastModified: "2024-01-22",
      owner: "Lisa Chen",
      steps: 15,
      avgExecutionTime: "30 minutes",
      successRate: 96.8
    },
    {
      id: 5,
      name: "Data Backup Procedure",
      description: "Daily automated data backup and verification process",

      category: "IT Operations",
      priority: "High",
      createdDate: "2024-01-01",
      lastModified: "2024-01-25",
      owner: "Tom Wilson",
      steps: 4,
      avgExecutionTime: "10 minutes",
      successRate: 99.1
    },
    {
      id: 6,
      name: "Marketing Campaign Launch",
      description: "End-to-end process for launching marketing campaigns",

      category: "Marketing",
      priority: "Medium",
      createdDate: "2024-01-20",
      lastModified: "2024-01-23",
      owner: "Emma Brown",
      steps: 10,
      avgExecutionTime: "3 hours",
      successRate: 91.7
    }
  ]);

  // State for search and filters
  const [searchTerm, setSearchTerm] = useState('');

  const [categoryFilter, setCategoryFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [selectedProcess, setSelectedProcess] = useState(null);

  // Get unique values for filter options
  const categories = [...new Set(processes.map(p => p.category))];

  const priorities = [...new Set(processes.map(p => p.priority))];

  // Filtered processes
  const filteredProcesses = useMemo(() => {
    return processes.filter(process => {
      const matchesSearch = process.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           process.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           process.owner.toLowerCase().includes(searchTerm.toLowerCase());
      

      const matchesCategory = categoryFilter === 'All' || process.category === categoryFilter;
      const matchesPriority = priorityFilter === 'All' || process.priority === priorityFilter;

      return matchesSearch && matchesCategory && matchesPriority;
    });
  }, [processes, searchTerm, categoryFilter, priorityFilter]);



  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return '#ef4444';
      case 'Medium': return '#f59e0b';
      case 'Low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const handleProcessClick = (process) => {
    setSelectedProcess(process);
  };

  const handleBackToList = () => {
    setSelectedProcess(null);
  };

  // Process Detail View
  if (selectedProcess) {
    return (
      <div className="page-container">
        <div className="page-header">
          <div className="process-detail-header">
            <button className="back-button" onClick={handleBackToList}>
              ← Back to Process List
            </button>
            <div>
              <h2 className="page-title">{selectedProcess.name}</h2>
              <p className="page-subtitle">{selectedProcess.description}</p>
            </div>
          </div>
        </div>
        
        <div className="process-detail-content">
          <div className="process-detail-grid">
            <div className="process-info-card">
              <h3>Process Information</h3>
              <div className="info-grid">

                <div className="info-item">
                  <label>Category</label>
                  <span>{selectedProcess.category}</span>
                </div>
                <div className="info-item">
                  <label>Priority</label>
                  <span className="priority-badge" style={{ color: getPriorityColor(selectedProcess.priority) }}>
                    {selectedProcess.priority}
                  </span>
                </div>
                <div className="info-item">
                  <label>Owner</label>
                  <span>{selectedProcess.owner}</span>
                </div>
                <div className="info-item">
                  <label>Created Date</label>
                  <span>{selectedProcess.createdDate}</span>
                </div>
                <div className="info-item">
                  <label>Last Modified</label>
                  <span>{selectedProcess.lastModified}</span>
                </div>
              </div>
            </div>

            <div className="process-stats-card">
              <h3>Performance Metrics</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-value">{selectedProcess.steps}</div>
                  <div className="stat-label">Total Steps</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{selectedProcess.avgExecutionTime}</div>
                  <div className="stat-label">Avg. Execution Time</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{selectedProcess.successRate}%</div>
                  <div className="stat-label">Success Rate</div>
                </div>
              </div>
            </div>
          </div>

          <div className="process-actions-card">
            <h3>Actions</h3>
            <div className="action-buttons">
              <button className="action-btn primary">Edit Process</button>
              <button className="action-btn secondary">Duplicate</button>
              <button className="action-btn secondary">Export</button>
              <button className="action-btn danger">Delete</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Process List View
  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h2 className="page-title">Process Management</h2>
            <p className="page-subtitle">Create, edit, delete, and optimize business processes</p>
          </div>
          <button className="create-btn">+ Create New Process</button>
        </div>
      </div>
      
      <div className="page-content">
        {/* Search and Filters */}
        <div className="filters-section">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search processes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="filters">


            <select 
              value={categoryFilter} 
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="filter-select"
            >
              <option value="All">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
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

        {/* Process List */}
        <div className="process-list">
          {filteredProcesses.length === 0 ? (
            <div className="no-results">
              <p>No processes found matching your criteria.</p>
            </div>
          ) : (
            filteredProcesses.map(process => (
              <div 
                key={process.id} 
                className="process-card"
                onClick={() => handleProcessClick(process)}
              >
                <div className="process-header">
                  <h3 className="process-name">{process.name}</h3>
                  <div className="process-badges">

                    <span 
                      className="priority-badge"
                      style={{ color: getPriorityColor(process.priority) }}
                    >
                      {process.priority}
                    </span>
                  </div>
                </div>
                
                <p className="process-description">{process.description}</p>
                
                <div className="process-meta">
                  <div className="meta-item">
                    <span className="meta-label">Category:</span>
                    <span className="meta-value">{process.category}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Owner:</span>
                    <span className="meta-value">{process.owner}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Success Rate:</span>
                    <span className="meta-value">{process.successRate}%</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Last Modified:</span>
                    <span className="meta-value">{process.lastModified}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ProcessManagementPage;
