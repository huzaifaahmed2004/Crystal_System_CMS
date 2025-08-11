import React from 'react';

const DashboardPage = () => {
  // Dummy data for the dashboard widgets
  const systemStats = {
    functions: 24,
    jobs: 12,
    tasks: 156,
    processes: 8
  };

  const pendingAIProcesses = [
    {
      id: 1,
      name: "Automated Data Validation Process",
      type: "Data Processing",
      createdAt: "2024-01-15",
      confidence: 95
    },
    {
      id: 2,
      name: "Customer Onboarding Workflow",
      type: "Business Process",
      createdAt: "2024-01-14",
      confidence: 88
    },
    {
      id: 3,
      name: "Inventory Management Optimization",
      type: "System Process",
      createdAt: "2024-01-13",
      confidence: 92
    }
  ];

  const handleApprove = (processId) => {
    alert(`Process ${processId} approved!`);
  };

  const handleReject = (processId) => {
    alert(`Process ${processId} rejected!`);
  };

  return (
    <div className="dashboard-content-area">
      <div className="dashboard-header-section">
        <h2 className="dashboard-title">Dashboard Overview</h2>
        <p className="dashboard-subtitle">Quick overview of system stats, pending approvals, and optimization suggestions</p>
      </div>

      {/* System Stats Widgets */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M22 19.07l-7.07-7.07a6 6 0 11-2.83-2.83L19.07 16.24 22 19.07zM7 13a4 4 0 100-8 4 4 0 000 8z" fill="currentColor"/>
            </svg>
          </div>
          <div className="stat-content">
            <h3 className="stat-number">{systemStats.functions}</h3>
            <p className="stat-label">Functions</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M4 7h16v4H4V7zm0 6h10v4H4v-4z" fill="currentColor"/>
            </svg>
          </div>
          <div className="stat-content">
            <h3 className="stat-number">{systemStats.jobs}</h3>
            <p className="stat-label">Jobs</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M9 11l3 3L22 4l-2-2-8 8-3-3-2 2 5 5zM2 20h20v2H2v-2z" fill="currentColor"/>
            </svg>
          </div>
          <div className="stat-content">
            <h3 className="stat-number">{systemStats.tasks}</h3>
            <p className="stat-label">Tasks</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M19.14 12.94a7.992 7.992 0 000-1.88l2.03-1.58a.5.5 0 00.12-.64l-1.92-3.32a.5.5 0 00-.6-.22l-2.39.96a7.963 7.963 0 00-1.62-.94l-.36-2.54A.5.5 0 0013.9 0h-3.8a.5.5 0 00-.5.42l-.36 2.54c-.57.22-1.11.51-1.62.94l-2.39-.96a.5.5 0 00-.6.22L1.71 6.04a.5.5 0 00.12.64l2.03 1.58c-.05.62-.05 1.25 0 1.88L1.83 11.7a.5.5 0 00-.12.64l1.92 3.32c.13.22.39.31.6.22l2.39-.96c.5.43 1.05.77 1.62.99l.36 2.54c.04.24.25.42.5.42h3.8c.25 0 .46-.18.5-.42l.36-2.54c.57-.22 1.11-.55 1.62-.99l2.39.96c.22.09.47 0 .6-.22l1.92-3.32a.5.5 0 00-.12-.64l-2.03-1.58zM12 15.5a3.5 3.5 0 110-7 3.5 3.5 0 010 7z" fill="currentColor"/>
            </svg>
          </div>
          <div className="stat-content">
            <h3 className="stat-number">{systemStats.processes}</h3>
            <p className="stat-label">Processes</p>
          </div>
        </div>
      </div>

      {/* Pending AI Processes Section */}
      <div className="pending-processes-section">
        <h3 className="section-title">Pending AI-Generated Processes</h3>
        <div className="processes-list">
          {pendingAIProcesses.map((process) => (
            <div key={process.id} className="process-card">
              <div className="process-info">
                <h4 className="process-name">{process.name}</h4>
                <div className="process-meta">
                  <span className="process-type">{process.type}</span>
                  <span className="process-date">Created: {process.createdAt}</span>
                  <span className="process-confidence">Confidence: {process.confidence}%</span>
                </div>
              </div>
              <div className="process-actions">
                <button 
                  className="approve-btn"
                  onClick={() => handleApprove(process.id)}
                >
                  Approve
                </button>
                <button 
                  className="reject-btn"
                  onClick={() => handleReject(process.id)}
                >
                  <span aria-hidden="true" style={{ display: 'inline-flex', marginRight: 8 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </span>
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Optimization Suggestions */}
      <div className="optimization-section">
        <h3 className="section-title">Optimization Suggestions</h3>
        <div className="suggestions-list">
          <div className="suggestion-card">
            <div className="suggestion-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 2a7 7 0 00-4 12.74V18a2 2 0 002 2h4a2 2 0 002-2v-3.26A7 7 0 0012 2zM9 22h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="suggestion-content">
              <h4>Process Automation Opportunity</h4>
              <p>3 manual tasks could be automated to save 2.5 hours daily</p>
            </div>
          </div>
          <div className="suggestion-card">
            <div className="suggestion-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M3 3v18h18" stroke="currentColor" strokeWidth="2"/>
                <path d="M7 15l4-4 3 3 5-5" stroke="currentColor" strokeWidth="2" fill="none"/>
              </svg>
            </div>
            <div className="suggestion-content">
              <h4>Performance Optimization</h4>
              <p>Database queries can be optimized to improve response time by 40%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
