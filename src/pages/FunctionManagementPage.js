import React, { useState, useMemo, useEffect } from 'react';
import '../styles/function-management.css';
import { getCompaniesLite, getBuildingByCompany } from '../services/layoutService';
import { getFunctionTree } from '../services/functionService';

const FunctionManagementPage = () => {
  // DB-backed state
  const [functions, setFunctions] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [building, setBuilding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State management
  const [searchTerm, setSearchTerm] = useState('');

  const [typeFilter, setTypeFilter] = useState('All');
  const [expandedFunctions, setExpandedFunctions] = useState(new Set([])); 
  const [selectedFunction, setSelectedFunction] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingFunction, setEditingFunction] = useState(null);
  const [parentFunction, setParentFunction] = useState(null);

  // Load companies initially
  useEffect(() => {
    (async () => {
      try {
        const cs = await getCompaniesLite();
        setCompanies(cs);
        const initialCompanyId = cs[0]?.company_id || cs[0]?.id || '';
        setSelectedCompanyId(initialCompanyId || '');
      } catch (e) {
        setError('Failed to load companies');
      }
    })();
  }, []);

  // When company changes, fetch building and its functions
  useEffect(() => {
    if (!selectedCompanyId) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const b = await getBuildingByCompany(selectedCompanyId);
        setBuilding(b);
        const list = await getFunctionTree(b?.building_id);
        // Map API to UI structure (no subFunctions in current DB schema)
        const mapped = list.map(f => ({
          id: f.function_id,
          name: f.name,
          description: f.description || '',
          type: 'Core Function',
          createdDate: '',
          lastModified: '',
          owner: '',
          subFunctions: [],
          assignedJobs: (f.jobs || []).map(j => ({ id: j.job_id, name: j.name, status: 'Active' })),
        }));
        setFunctions(mapped);
        // Expand all by default when switching context
        setExpandedFunctions(new Set(mapped.map(m => m.id)));
      } catch (e) {
        setError('Failed to load functions');
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedCompanyId]);

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
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="filter-select"
              style={{ minWidth: 220 }}
            >
              {companies.map(c => (
                <option key={c.company_id || c.id} value={c.company_id || c.id}>{c.name}</option>
              ))}
            </select>
            <button className="create-btn" onClick={() => handleCreateFunction()}>+ Create New Function</button>
          </div>
        </div>
      </div>
      
      <div className="page-content">
        {error && (
          <div className="no-results" style={{ color: '#b91c1c', marginBottom: 12 }}>{error}</div>
        )}
        {loading && (
          <div className="no-results" style={{ marginBottom: 12 }}>Loading functions...</div>
        )}
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
