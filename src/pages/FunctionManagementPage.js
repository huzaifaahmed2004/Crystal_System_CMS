import React, { useState, useMemo } from 'react';
import '../styles/function-management.css';

const FunctionManagementPage = () => {
  // Dummy data for functions with hierarchical structure
  const [functions] = useState([
    {
      id: 1,
      name: "Customer Management",
      description: "Handle all customer-related operations and services",
      type: "Core Function",

      createdDate: "2024-01-01",
      lastModified: "2024-01-20",
      owner: "Customer Success Team",
      subFunctions: [
        {
          id: 11,
          name: "Customer Onboarding",
          description: "New customer registration and setup processes",
          type: "Sub-Function",
          status: "Active"
        },
        {
          id: 12,
          name: "Customer Support",
          description: "Customer service and issue resolution",
          type: "Sub-Function",
          status: "Active"
        }
      ],
      assignedJobs: [
        { id: 1, name: "Customer Onboarding", status: "Active" },
        { id: 7, name: "Customer Support Operations", status: "Active" }
      ]
    },
    {
      id: 2,
      name: "Finance Operations",
      description: "Manage financial processes, accounting, and reporting",
      type: "Core Function",

      createdDate: "2024-01-01",
      lastModified: "2024-01-18",
      owner: "Finance Team",
      subFunctions: [
        {
          id: 21,
          name: "Invoice Processing",
          description: "Handle invoice creation, validation, and processing",
          type: "Sub-Function",
          status: "Active"
        },
        {
          id: 22,
          name: "Payment Management",
          description: "Process payments and manage financial transactions",
          type: "Sub-Function",
          status: "Active"
        },
        {
          id: 23,
          name: "Financial Reporting",
          description: "Generate financial reports and analytics",
          type: "Sub-Function",
        }
      ],
      assignedJobs: [
        { id: 2, name: "Financial Processing", status: "Active" }
      ]
    },
    {
      id: 3,
      name: "IT Operations",
      description: "Maintain IT infrastructure and system reliability",
      type: "Core Function",

      createdDate: "2024-01-01",
      lastModified: "2024-01-25",
      owner: "IT Team",
      subFunctions: [
        {
          id: 31,
          name: "System Maintenance",
          description: "Regular system updates and maintenance tasks",
          type: "Sub-Function",
          status: "Active"
        },
        {
          id: 32,
          name: "Data Backup",
          description: "Automated data backup and recovery procedures",
          type: "Sub-Function",
          status: "Active"
        },
        {
          id: 33,
          name: "Security Management",
          description: "System security monitoring and updates",
          type: "Sub-Function",
          status: "Active"
        }
      ],
      assignedJobs: [
        { id: 3, name: "IT Maintenance", status: "Active" }
      ]
    },
    {
      id: 4,
      name: "Manufacturing",
      description: "Production processes and quality control operations",
      type: "Core Function",

      createdDate: "2024-01-01",
      lastModified: "2024-01-22",
      owner: "Production Team",
      subFunctions: [
        {
          id: 41,
          name: "Quality Control",
          description: "Product quality inspection and testing",
          type: "Sub-Function",
          status: "Active"
        },
        {
          id: 42,
          name: "Production Planning",
          description: "Manufacturing schedule and resource planning",
          type: "Sub-Function",
          status: "Active"
        }
      ],
      assignedJobs: [
        { id: 4, name: "Production Quality", status: "Active" }
      ]
    },
    {
      id: 5,
      name: "Human Resources",
      description: "Employee management and HR operations",
      type: "Core Function",

      createdDate: "2024-01-01",
      lastModified: "2024-01-15",
      owner: "HR Team",
      subFunctions: [
        {
          id: 51,
          name: "Employee Onboarding",
          description: "New employee registration and orientation",
          type: "Sub-Function",
          status: "Active"
        },
        {
          id: 52,
          name: "Performance Management",
          description: "Employee performance tracking and reviews",
          type: "Sub-Function",
          status: "Active"
        },
        {
          id: 53,
          name: "Employee Offboarding",
          description: "Employee departure procedures and documentation",
          type: "Sub-Function",
        }
      ],
      assignedJobs: [
        { id: 5, name: "HR Operations", status: "Active" }
      ]
    },
    {
      id: 6,
      name: "Marketing",
      description: "Marketing campaigns and brand management",
      type: "Core Function",

      createdDate: "2024-01-01",
      lastModified: "2024-01-23",
      owner: "Marketing Team",
      subFunctions: [
        {
          id: 61,
          name: "Campaign Management",
          description: "Marketing campaign planning and execution",
          type: "Sub-Function",
          status: "Active"
        },
        {
          id: 62,
          name: "Content Creation",
          description: "Marketing content and asset development",
          type: "Sub-Function",
          status: "Active"
        }
      ],
      assignedJobs: [
        { id: 6, name: "Marketing Creative", status: "Active" }
      ]
    }
  ]);

  // State management
  const [searchTerm, setSearchTerm] = useState('');

  const [typeFilter, setTypeFilter] = useState('All');
  const [expandedFunctions, setExpandedFunctions] = useState(new Set([1, 2, 3])); // Default expanded
  const [selectedFunction, setSelectedFunction] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingFunction, setEditingFunction] = useState(null);
  const [parentFunction, setParentFunction] = useState(null);

  // Helper function to get all functions including sub-functions
  const getAllFunctions = (functionsList) => {
    const allFunctions = [];
    functionsList.forEach(func => {
      allFunctions.push(func);
      if (func.subFunctions) {
        allFunctions.push(...func.subFunctions);
      }
    });
    return allFunctions;
  };

  // Get unique values for filters
  const types = [...new Set(getAllFunctions(functions).map(f => f.type))];

  // Filtered functions
  const filteredFunctions = useMemo(() => {
    return functions.filter(func => {
      const matchesSearch = func.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           func.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = typeFilter === 'All' || func.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [functions, searchTerm, typeFilter]);



  const getJobStatusColor = (status) => {
    switch (status) {
      case 'Active': return '#10b981';
      case 'Inactive': return '#ef4444';
      case 'Draft': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const toggleFunction = (functionId) => {
    const newExpanded = new Set(expandedFunctions);
    if (newExpanded.has(functionId)) {
      newExpanded.delete(functionId);
    } else {
      newExpanded.add(functionId);
    }
    setExpandedFunctions(newExpanded);
  };

  const handleFunctionClick = (func, isSubFunction = false) => {
    setSelectedFunction({ ...func, isSubFunction });
  };

  const handleBackToTree = () => {
    setSelectedFunction(null);
  };

  const handleCreateFunction = (parent = null) => {
    setParentFunction(parent);
    setShowCreateModal(true);
  };

  const handleEditFunction = (func) => {
    setEditingFunction(func);
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingFunction(null);
    setParentFunction(null);
  };

  // Function Detail View
  if (selectedFunction) {
    return (
      <div className="page-container">
        <div className="page-header">
          <div className="function-detail-header">
            <button className="back-button" onClick={handleBackToTree}>
              ← Back to Function Tree
            </button>
            <div>
              <h2 className="page-title">{selectedFunction.name}</h2>
              <p className="page-subtitle">{selectedFunction.description}</p>
            </div>
          </div>
        </div>
        
        <div className="function-detail-content">
          <div className="function-detail-grid">
            <div className="function-info-card">
              <h3>Function Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <label>Status</label>
                  <span className="status-badge" style={{ backgroundColor: '#10b981' }}>
                    {selectedFunction.status}
                  </span>
                </div>
                <div className="info-item">
                  <label>Type</label>
                  <span>{selectedFunction.type}</span>
                </div>
                <div className="info-item">
                  <label>Owner</label>
                  <span>{selectedFunction.owner || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Created Date</label>
                  <span>{selectedFunction.createdDate || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Last Modified</label>
                  <span>{selectedFunction.lastModified || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Sub-Functions</label>
                  <span>{selectedFunction.subFunctions?.length || 0}</span>
                </div>
              </div>
            </div>

            <div className="function-stats-card">
              <h3>Statistics</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-value">{selectedFunction.assignedJobs?.length || 0}</div>
                  <div className="stat-label">Assigned Jobs</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{selectedFunction.subFunctions?.length || 0}</div>
                  <div className="stat-label">Sub-Functions</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">
                    {selectedFunction.subFunctions?.filter(sf => sf.status === 'Active').length || 0}
                  </div>
                  <div className="stat-label">Active Sub-Functions</div>
                </div>
              </div>
            </div>
          </div>

          {selectedFunction.assignedJobs && selectedFunction.assignedJobs.length > 0 && (
            <div className="assigned-jobs-card">
              <h3>Assigned Jobs ({selectedFunction.assignedJobs.length})</h3>
              <div className="assigned-jobs-list">
                {selectedFunction.assignedJobs.map(job => (
                  <div key={job.id} className="assigned-job-item">
                    <span className="job-name">{job.name}</span>
                    <span 
                      className="job-status" 
                      style={{ backgroundColor: getJobStatusColor(job.status) }}
                    >
                      {job.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="function-actions-card">
            <h3>Actions</h3>
            <div className="action-buttons">
              <button className="action-btn primary" onClick={() => handleEditFunction(selectedFunction)}>
                Edit Function
              </button>
              {!selectedFunction.isSubFunction && (
                <button className="action-btn secondary" onClick={() => handleCreateFunction(selectedFunction)}>
                  Add Sub-Function
                </button>
              )}
              <button className="action-btn secondary">Duplicate</button>
              <button className="action-btn danger">Delete</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Function Tree View
  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h2 className="page-title">Function Management</h2>
            <p className="page-subtitle">Manage and maintain functions with interactive tree view</p>
          </div>
          <button className="create-btn" onClick={() => handleCreateFunction()}>+ Create New Function</button>
        </div>
      </div>
      
      <div className="page-content">
        {/* Search and Filters */}
        <div className="filters-section">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search functions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="filters">


            <select 
              value={typeFilter} 
              onChange={(e) => setTypeFilter(e.target.value)}
              className="filter-select"
            >
              <option value="All">All Types</option>
              {types.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Function Tree */}
        <div className="function-tree">
          {filteredFunctions.length === 0 ? (
            <div className="no-results">
              <p>No functions found matching your criteria.</p>
            </div>
          ) : (
            filteredFunctions.map(func => (
              <div key={func.id} className="function-tree-item">
                {/* Main Function */}
                <div className="function-node main-function">
                  <div className="function-header">
                    <div className="function-toggle" onClick={() => toggleFunction(func.id)}>
                      <span className={`toggle-icon ${expandedFunctions.has(func.id) ? 'expanded' : ''}`}>
                        ▶
                      </span>
                      <div className="function-info">
                        <h3 className="function-name" onClick={() => handleFunctionClick(func)}>
                          {func.name}
                        </h3>
                        <p className="function-description">{func.description}</p>
                      </div>
                    </div>
                    <div className="function-badges">
                      <span className="type-badge">{func.type}</span>
                    </div>
                  </div>
                  
                  <div className="function-meta">
                    <div className="meta-item">
                      <span className="meta-label">Owner:</span>
                      <span className="meta-value">{func.owner}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Sub-Functions:</span>
                      <span className="meta-value">{func.subFunctions.length}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Assigned Jobs:</span>
                      <span className="meta-value">{func.assignedJobs.length}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Last Modified:</span>
                      <span className="meta-value">{func.lastModified}</span>
                    </div>
                  </div>
                </div>

                {/* Sub-Functions */}
                {expandedFunctions.has(func.id) && (
                  <div className="sub-functions">
                    {func.subFunctions.map(subFunc => (
                      <div key={subFunc.id} className="function-node sub-function">
                        <div className="sub-function-connector"></div>
                        <div className="function-header">
                          <div className="function-info">
                            <h4 className="function-name" onClick={() => handleFunctionClick(subFunc, true)}>
                              {subFunc.name}
                            </h4>
                            <p className="function-description">{subFunc.description}</p>
                          </div>
                          <div className="function-badges">
                            <span 
                              className="status-badge" 
                              style={{ backgroundColor: '#10b981' }}
                            >
                              {subFunc.status}
                            </span>
                            <span className="type-badge">{subFunc.type}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Add Sub-Function Button */}
                    <div className="add-sub-function">
                      <div className="sub-function-connector"></div>
                      <button 
                        className="add-sub-btn"
                        onClick={() => handleCreateFunction(func)}
                      >
                        + Add Sub-Function
                      </button>
                    </div>
                  </div>
                )}

                {/* Assigned Jobs */}
                {expandedFunctions.has(func.id) && func.assignedJobs.length > 0 && (
                  <div className="assigned-jobs-section">
                    <h4>Assigned Jobs</h4>
                    <div className="assigned-jobs-list">
                      {func.assignedJobs.map(job => (
                        <div key={job.id} className="assigned-job-item">
                          <span className="job-name">{job.name}</span>
                          <span 
                            className="job-status" 
                            style={{ backgroundColor: getJobStatusColor(job.status) }}
                          >
                            {job.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create/Edit Function Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>
                {editingFunction 
                  ? 'Edit Function' 
                  : parentFunction 
                    ? `Add Sub-Function to ${parentFunction.name}` 
                    : 'Create New Function'
                }
              </h3>
              <button className="close-btn" onClick={handleCloseModal}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Function Name</label>
                  <input type="text" placeholder="Enter function name" />
                </div>
                
                <div className="form-group">
                  <label>Status</label>
                  <select>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Draft">Draft</option>
                  </select>
                </div>
                
                <div className="form-group full-width">
                  <label>Description</label>
                  <textarea placeholder="Enter detailed function description"></textarea>
                </div>
                
                <div className="form-group">
                  <label>Type</label>
                  <select>
                    <option value={parentFunction ? "Sub-Function" : "Core Function"}>
                      {parentFunction ? "Sub-Function" : "Core Function"}
                    </option>
                    {!parentFunction && <option value="Support Function">Support Function</option>}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Owner</label>
                  <input type="text" placeholder="Function owner/team" />
                </div>
                
                {parentFunction && (
                  <div className="form-group">
                    <label>Parent Function</label>
                    <input type="text" value={parentFunction.name} disabled />
                  </div>
                )}
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="action-btn secondary" onClick={handleCloseModal}>
                Cancel
              </button>
              <button className="action-btn primary">
                {editingFunction ? 'Update Function' : 'Create Function'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FunctionManagementPage;
