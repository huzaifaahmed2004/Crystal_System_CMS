import React from 'react';

const DashboardContent = () => {
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
          <div className="stat-icon">🔧</div>
          <div className="stat-content">
            <h3 className="stat-number">{systemStats.functions}</h3>
            <p className="stat-label">Functions</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">J</div>
          <div className="stat-content">
            <h3 className="stat-number">{systemStats.jobs}</h3>
            <p className="stat-label">Jobs</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">T</div>
          <div className="stat-content">
            <h3 className="stat-number">{systemStats.tasks}</h3>
            <p className="stat-label">Tasks</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">⚙️</div>
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
                  ❌ Reject
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
            <div className="suggestion-icon">💡</div>
            <div className="suggestion-content">
              <h4>Process Automation Opportunity</h4>
              <p>3 manual tasks could be automated to save 2.5 hours daily</p>
            </div>
          </div>
          <div className="suggestion-card">
            <div className="suggestion-icon">📈</div>
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

export default DashboardContent;
