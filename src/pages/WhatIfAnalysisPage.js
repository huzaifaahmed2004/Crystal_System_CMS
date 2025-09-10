import React, { useEffect } from 'react';
import '../styles/what-if-analysis.css';
import { optimizeProcess as svcOptimizeProcess, optimizeCustom as svcOptimizeCustom } from '../services/whatIfService';
import { getProcessesWithRelations } from '../services/processService';

// Lightweight integration of the existing What-If Dashboard logic.
// We reuse the same element IDs so we can port the logic quickly.

class WhatIfDashboard {
  constructor(root) {
    this.root = root;
    this.originalScenario = null;
    this.currentScenario = null;
    this.impactPreviewScenario = null;
    this.projectData = null;
    this.constraints = null;
    this.renderedTabs = { resources: false, tasks: false };
  }

  mount() {
    // bind listeners within root scope
    this.q('#processDropdown')?.addEventListener('change', this.onProcessSelect.bind(this));
    this.q('#optimizeBtn')?.addEventListener('click', this.optimizeProcess.bind(this));

    this.qAll('.tab-btn').forEach(btn => btn.addEventListener('click', this.switchTab.bind(this)));
    ['timePriority','costPriority','qualityPriority'].forEach(id => this.q('#' + id)?.addEventListener('input', this.updatePriorities.bind(this)));
    this.q('#updateScenarioBtn')?.addEventListener('click', this.updateScenario.bind(this));
    this.q('#enableComparisonBtn')?.addEventListener('click', this.enableComparison.bind(this));
    this.q('#resetScenarioBtn')?.addEventListener('click', this.resetScenario.bind(this));

    // Process search
    this.q('#processSearch')?.addEventListener('input', this.filterProcesses.bind(this));

    // Load available processes from CMS API
    this.loadProcesses();
  }

  q(sel) { return this.root.querySelector(sel); }
  qAll(sel) { return Array.from(this.root.querySelectorAll(sel)); }

  async loadProcesses() {
    try {
      const dropdown = this.q('#processDropdown');
      if (!dropdown) return;
      if (dropdown) dropdown.innerHTML = '<option value="">Loading processes...</option>';
      const processes = await getProcessesWithRelations();
      const list = Array.isArray(processes) ? processes : [];
      dropdown.innerHTML = '<option value="">Select a process to optimize...</option>';
      list.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.process_id || p.id;
        opt.textContent = `${p.process_name || p.name} (${p.company?.name || ''})`;
        if (p && Object.prototype.hasOwnProperty.call(p, 'process_tasks')) {
          try { opt.dataset.processData = JSON.stringify(p); } catch {}
        }
        dropdown.appendChild(opt);
      });
      this.allProcesses = list;
    } catch (e) {
      console.error('Failed to load processes for What-if Analysis:', e);
      const dropdown = this.q('#processDropdown');
      if (dropdown) dropdown.innerHTML = '<option value="">Failed to load processes</option>';
      const btn = this.q('#optimizeBtn');
      if (btn) btn.disabled = true;
    }
  }

  filterProcesses(e) {
    const term = (e?.target?.value || '').toLowerCase();
    const dropdown = this.q('#processDropdown');
    if (!dropdown || !Array.isArray(this.allProcesses)) return;
    dropdown.innerHTML = '<option value="">Select a process to optimize...</option>';
    this.allProcesses
      .filter(p => `${p.process_name || p.name} ${p.company?.name || ''}`.toLowerCase().includes(term))
      .forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.process_id || p.id;
        opt.textContent = `${p.process_name || p.name} (${p.company?.name || ''})`;
        dropdown.appendChild(opt);
      });
  }

  onProcessSelect(e) {
    const v = e.target.value;
    const btn = this.q('#optimizeBtn');
    if (btn) btn.disabled = !v;
  }

  async optimizeProcess() {
    const dd = this.q('#processDropdown');
    if (!dd || !dd.value) return;
    const processId = dd.value; // backend expects a CMS numeric ID

    this.q('#loadingSpinner')?.classList.remove('hidden');
    const btn = this.q('#optimizeBtn');
    if (btn) btn.disabled = true;

    try {
      const result = await svcOptimizeProcess(processId);

      // Support multiple backend response shapes
      let bestScenario = null;
      let originalMetrics = null;
      if (result?.best_scenario) {
        // Standard shape
        bestScenario = result.best_scenario;
        originalMetrics = result.best_scenario?.metrics;
        this.projectData = result.project_data || this.projectData;
      } else if (result?.scenarios && Array.isArray(result.scenarios)) {
        // CMS shape: { scenarios: [...], baseline: {...}, task_names: {...}, resource_names: {...} }
        this.taskNames = result.task_names || {};
        this.resourceNames = result.resource_names || {};
        
        const pickScore = (s) => {
          // Weighted score similar to demo: prioritize quality, then time, then cost
          const q = Number(s.quality_score || s.metrics?.quality_score || 0);
          const t = Number(s.total_duration_days || s.metrics?.total_time_days || 0) || 1;
          const c = Number(s.total_cost || s.metrics?.total_cost || 1) || 1;
          return q * 0.4 + (1 / t) * 0.3 + (1 / c) * 0.3;
        };
        const sorted = [...result.scenarios].sort((a, b) => pickScore(b) - pickScore(a));
        const top = sorted[0];
        // Adapt to standard shape expected by UI
        bestScenario = {
          scenario: { assignments: top.assignments || [] },
          metrics: {
            total_time_days: Number(top.total_duration_days || top.metrics?.total_time_days || 0),
            total_cost: Number(top.total_cost || top.metrics?.total_cost || 0),
            quality_score: Number(top.quality_score || top.metrics?.quality_score || 0),
            resource_utilization: Number(top.resource_utilization || top.metrics?.resource_utilization || 0.85),
          },
        };
        const base = result.baseline || {};
        originalMetrics = {
          total_time_days: Number(base.total_duration_days || base.metrics?.total_time_days || bestScenario.metrics.total_time_days),
          total_cost: Number(base.total_cost || base.metrics?.total_cost || bestScenario.metrics.total_cost),
          quality_score: Number(base.quality_score || base.metrics?.quality_score || bestScenario.metrics.quality_score),
          resource_utilization: Number(base.resource_utilization || base.metrics?.resource_utilization || bestScenario.metrics.resource_utilization),
        };
        // Build minimal project data from assignments if backend didn't return it
        if (!this.projectData) this.projectData = this.createMockProjectDataFromAssignments(bestScenario.scenario.assignments, bestScenario.metrics);
      } else if (result?.scenario && result?.metrics) {
        // Another possible shape
        bestScenario = { scenario: result.scenario, metrics: result.metrics };
        originalMetrics = result.metrics;
        if (!this.projectData) this.projectData = this.createMockProjectDataFromAssignments(result.scenario.assignments || [], result.metrics);
      }

      if (!bestScenario || !bestScenario.metrics) throw new Error('Unexpected response format from optimize endpoint');

      this.originalScenario = { metrics: originalMetrics };
      this.impactPreviewScenario = { metrics: { ...originalMetrics } };
      this.currentScenario = { ...bestScenario };
      // Store best scenario as baseline for impact preview
      this.bestScenarioBaseline = { ...bestScenario.metrics };
      this.constraints = result.constraints || this.constraints;

      this.displayBestScenario(bestScenario);
      this.setupConstraintControls();
      // Initialize impact preview with best scenario values
      this.updateImpactPreview();

      this.q('#bestScenario')?.classList.remove('hidden');
      this.q('#constraintAdjustment')?.classList.remove('hidden');
      this.q('#comparisonSection')?.classList.remove('hidden');
    } catch (err) {
      console.error(err);
      alert('Error optimizing process. Please try again.');
    } finally {
      this.q('#loadingSpinner')?.classList.add('hidden');
      if (btn) btn.disabled = false;
    }
  }

  createMockProjectDataFromAssignments(assignments, metrics) {
    const taskIds = [...new Set(assignments.map(a => a.task_id))];
    const resourceIds = [...new Set(assignments.map(a => a.resource_id))];
    
    return {
      tasks: taskIds.map(taskId => {
        // Use actual hours_allocated from CMS assignments
        const assignment = assignments.find(a => a.task_id === taskId);
        const actualHours = assignment?.hours_allocated || 1;
        
        // Use task name from API response or fallback
        const taskName = this.taskNames?.[taskId] || taskId.replace(/^task_/, '').replace(/_/g, ' ');
        
        return {
          id: taskId,
          name: taskName,
          duration_hours: actualHours,
          priority: 3,
          dependencies: []
        };
      }),
      resources: resourceIds.map(resourceId => {
        // Use resource name from API response or fallback
        const resourceName = this.resourceNames?.[resourceId] || resourceId.replace(/^resource_/, '').replace(/_/g, ' ');
        
        return {
          id: resourceId,
          name: resourceName,
          hourly_rate: 85,
          max_hours_per_day: 8,
          skills: []
        };
      })
    };
  }

  displayBestScenario(scenario) {
    const hours = (Number(scenario.metrics.total_time_days || 0) * 8).toFixed(1);
    this.q('#scenarioDuration').textContent = hours;
    this.q('#scenarioCost').textContent = `$${scenario.metrics.total_cost.toLocaleString()}`;
    this.q('#scenarioQuality').textContent = `${(scenario.metrics.quality_score * 100).toFixed(1)}`;

    const tbody = this.q('#allocationBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    let totalHours = 0;
    let totalCost = 0;

    scenario.scenario.assignments.forEach(assignment => {
      const task = this.projectData.tasks.find(t => t.id === assignment.task_id) || {
        id: assignment.task_id,
        name: this.taskNames?.[assignment.task_id] || assignment.task_id
      };
      const resource = this.projectData.resources.find(r => r.id === assignment.resource_id) || {
        id: assignment.resource_id,
        name: this.resourceNames?.[assignment.resource_id] || assignment.resource_id,
        hourly_rate: 85
      };
      const hours = assignment.hours_allocated;
      const cost = hours * resource.hourly_rate;
      totalHours += hours;
      totalCost += cost;
      const row = document.createElement('div');
      row.className = 'roles-table-row';
      row.style.gridTemplateColumns = '2fr 1.5fr 1fr 1fr 1fr';
      row.innerHTML = `
        <div class="cell">${task?.name || '-'}</div>
        <div class="cell">${resource?.name || '-'}</div>
        <div class="cell">${hours?.toFixed(1) ?? '-'}</div>
        <div class="cell">$${cost.toLocaleString()}</div>
        <div class="cell">Day ${(assignment.start_time / 8).toFixed(1)}</div>
      `;
      tbody.appendChild(row);
    });

    const totalRow = document.createElement('div');
    totalRow.className = 'roles-table-row total';
    totalRow.style.gridTemplateColumns = '2fr 1.5fr 1fr 1fr 1fr';
    totalRow.innerHTML = `
      <div class="cell">TOTAL</div>
      <div class="cell">-</div>
      <div class="cell">${totalHours.toFixed(1)}</div>
      <div class="cell">$${totalCost.toLocaleString()}</div>
      <div class="cell">${(totalHours / 8).toFixed(1)} days</div>
    `;
    tbody.appendChild(totalRow);
  }

  setupConstraintControls() {
    // Reset rendered flags and render the active tab only
    this.renderedTabs = { resources: false, tasks: false };
    const activeBtn = this.q('.tab-btn.active');
    const active = activeBtn?.dataset?.tab || 'resources';
    this.ensureTabRendered(active);
  }

  ensureTabRendered(tab) {
    if (tab === 'resources' && !this.renderedTabs.resources) {
      this.setupResourceControls();
      this.renderedTabs.resources = true;
    }
    if (tab === 'tasks' && !this.renderedTabs.tasks) {
      this.setupTaskControls();
      this.renderedTabs.tasks = true;
    }
  }

  setupResourceControls() {
    const container = this.q('#resourceControls');
    if (!container) return;
    container.innerHTML = '';
    this.projectData.resources.forEach(resource => {
      const group = document.createElement('div');
      group.className = 'wif-control-group';
      group.innerHTML = `
        <h4>${resource.name}</h4>
        <div class="slider-group">
          <label>Hourly Rate: $<span id="rate-${resource.id}">${resource.hourly_rate}</span></label>
          <input type="range" id="rateSlider-${resource.id}" min="30" max="200" value="${resource.hourly_rate}" class="slider" data-resource="${resource.id}" data-type="rate">
        </div>
        <div class="slider-group">
          <label>Max Hours/Day: <span id="hours-${resource.id}">${resource.max_hours_per_day}</span></label>
          <input type="range" id="hoursSlider-${resource.id}" min="4" max="12" value="${resource.max_hours_per_day}" class="slider" data-resource="${resource.id}" data-type="hours">
        </div>
        <div class="checkbox-group">
          <label><input type="checkbox" id="available-${resource.id}" checked data-resource="${resource.id}" data-type="available"> Available for assignment</label>
        </div>
      `;
      container.appendChild(group);
      group.querySelector(`#rateSlider-${resource.id}`)?.addEventListener('input', this.onConstraintChange.bind(this));
      group.querySelector(`#hoursSlider-${resource.id}`)?.addEventListener('input', this.onConstraintChange.bind(this));
      group.querySelector(`#available-${resource.id}`)?.addEventListener('change', this.onConstraintChange.bind(this));
    });
  }

  setupTaskControls() {
    const container = this.q('#taskControls');
    if (!container) return;
    container.innerHTML = '';
    this.projectData.tasks.forEach(task => {
      const group = document.createElement('div');
      group.className = 'wif-control-group';
      group.innerHTML = `
        <h4>${task.name}</h4>
        <div class="slider-group">
          <label>Duration (Minutes): <span id="duration-${task.id}">${task.duration_hours * 60}</span></label>
          <input type="range" id="durationSlider-${task.id}" min="30" max="600" value="${task.duration_hours * 60}" class="slider" data-task="${task.id}" data-type="duration">
        </div>
        <div class="slider-group">
          <label>Priority: <span id="priority-${task.id}">Normal</span></label>
          <input type="range" id="prioritySlider-${task.id}" min="1" max="5" value="3" class="slider" data-task="${task.id}" data-type="priority">
        </div>
        <div class="checkbox-group">
          <label><input type="checkbox" id="parallel-${task.id}" data-task="${task.id}" data-type="parallel"> Allow parallel execution</label>
        </div>
      `;
      container.appendChild(group);
      group.querySelector(`#durationSlider-${task.id}`)?.addEventListener('input', this.onConstraintChange.bind(this));
      group.querySelector(`#prioritySlider-${task.id}`)?.addEventListener('input', this.onConstraintChange.bind(this));
      group.querySelector(`#parallel-${task.id}`)?.addEventListener('change', this.onConstraintChange.bind(this));
    });
  }

  onConstraintChange(e) {
    const el = e.target;
    const value = el.type === 'checkbox' ? el.checked : el.value;
    if (el.dataset.type === 'rate') this.q(`#rate-${el.dataset.resource}`).textContent = value;
    if (el.dataset.type === 'hours') this.q(`#hours-${el.dataset.resource}`).textContent = value;
    if (el.dataset.type === 'duration') document.getElementById(`duration-${el.dataset.task}`).textContent = value;
    if (el.dataset.type === 'priority') {
      const priorities = ['Very Low', 'Low', 'Normal', 'High', 'Critical'];
      this.q(`#priority-${el.dataset.task}`).textContent = priorities[value - 1];
    }
    this.updateImpactPreview();
  }

  updatePriorities() {
    const time = Number(this.q('#timePriority')?.value ?? 33);
    const cost = Number(this.q('#costPriority')?.value ?? 33);
    let quality = Number(this.q('#qualityPriority')?.value ?? 34);
    const total = time + cost + quality;
    if (total !== 100) {
      const diff = 100 - total;
      quality = Math.max(0, quality + diff);
      const el = this.q('#qualityPriority');
      if (el) el.value = String(quality);
    }
    this.q('#timeValue').textContent = `${time}%`;
    this.q('#costValue').textContent = `${cost}%`;
    this.q('#qualityValue').textContent = `${this.q('#qualityPriority').value}%`;
    this.updateImpactPreview();
  }

  updateImpactPreview() {
    // Use best scenario as baseline if available, otherwise use impactPreviewScenario
    if (!this.projectData || (!this.bestScenarioBaseline && !this.impactPreviewScenario)) {
      const d = this.q('#impactDuration');
      const c = this.q('#impactCost');
      if (d) d.textContent = '2.5 hours';
      if (c) c.textContent = '$296';
      return;
    }

    // Use best scenario baseline or fallback to impactPreviewScenario
    const baseMetrics = this.bestScenarioBaseline || this.impactPreviewScenario?.metrics || this.impactPreviewScenario;
    const baselineDurationDays = baseMetrics.total_time_days || baseMetrics.total_duration_days || 0;
    const baselineCost = baseMetrics.total_cost || 0;

    // === TIME CALCULATION (start from Best Scenario baseline) ===
    
    // Start with Best Scenario baseline in minutes (0.8 hours = 48 minutes)
    let estimatedDurationMinutes = baselineDurationDays * 8 * 60; // Convert days to minutes
    
    // Calculate task duration changes from baseline
    let totalCurrentMinutes = 0;
    let totalBaselineMinutes = 0;
    const parallelTasks = [];
    const sequentialTasks = [];
    
    this.projectData.tasks.forEach(task => {
      const durationSlider = this.q(`#durationSlider-${task.id}`);
      const parallelCheckbox = this.q(`#parallel-${task.id}`);
      
      // Use actual task duration from CMS data, not mock values
      const baselineDurationMinutes = (task.duration_hours || 8) * 60;
      const currentDurationMinutes = durationSlider ? parseFloat(durationSlider.value) : baselineDurationMinutes;
      
      totalBaselineMinutes += baselineDurationMinutes;
      
      const isParallel = parallelCheckbox ? parallelCheckbox.checked : false;
      if (isParallel) {
        parallelTasks.push(currentDurationMinutes);
      } else {
        sequentialTasks.push(currentDurationMinutes);
        totalCurrentMinutes += currentDurationMinutes;
      }
    });
    
    // Add parallel task time (max of parallel tasks)
    if (parallelTasks.length > 0) {
      const maxParallelDuration = Math.max(...parallelTasks);
      totalCurrentMinutes += maxParallelDuration;
    }
    
    // Apply proportional change from baseline
    if (totalBaselineMinutes > 0) {
      const taskRatio = totalCurrentMinutes / totalBaselineMinutes;
      estimatedDurationMinutes *= taskRatio;
    }
    
    // 2. Apply resource hours/day changes (affects productivity/duration)
    let totalOriginalHours = 0;
    let totalNewHours = 0;
    this.projectData.resources.forEach(resource => {
      const hoursSlider = this.q(`#hoursSlider-${resource.id}`);
      const availableCheckbox = this.q(`#available-${resource.id}`);
      const isAvailable = availableCheckbox ? availableCheckbox.checked : true;
      
      if (isAvailable) {
        const originalHours = resource.max_hours_per_day || 8;
        const newHours = hoursSlider ? parseFloat(hoursSlider.value) : originalHours;
        totalOriginalHours += originalHours;
        totalNewHours += newHours;
      }
    });
    
    if (totalNewHours > 0 && totalOriginalHours > 0) {
      // More hours per day = shorter duration
      const hoursRatio = totalOriginalHours / totalNewHours;
      estimatedDurationMinutes *= hoursRatio;
    }
    
    // Parallel execution is already calculated above, no additional savings needed
    
    // === COST CALCULATION (affected by: hourly rates, task priority) ===
    let estimatedCost = baselineCost;
    
    // 1. Apply resource rate changes
    let rateMultiplier = 1.0;
    let resourceCount = 0;
    this.projectData.resources.forEach(resource => {
      const rateSlider = this.q(`#rateSlider-${resource.id}`);
      const availableCheckbox = this.q(`#available-${resource.id}`);
      const isAvailable = availableCheckbox ? availableCheckbox.checked : true;
      
      if (isAvailable && rateSlider) {
        const originalRate = resource.hourly_rate || 85;
        const newRate = parseFloat(rateSlider.value);
        rateMultiplier += (newRate / originalRate - 1);
        resourceCount++;
      }
    });
    
    if (resourceCount > 0) {
      // Average the rate changes
      rateMultiplier = 1 + (rateMultiplier / resourceCount);
      estimatedCost *= rateMultiplier;
    }
    
    // 2. Apply task priority cost adjustments
    let priorityCostMultiplier = 0;
    let taskCount = 0;
    this.projectData.tasks.forEach(task => {
      const prioritySlider = this.q(`#prioritySlider-${task.id}`);
      const priority = prioritySlider ? parseInt(prioritySlider.value) : 3;
      
      // Priority affects resource tier and thus cost
      const priorityMultipliers = {
        1: 0.7,   // Very Low - junior resources
        2: 0.85,  // Low
        3: 1.0,   // Normal
        4: 1.25,  // High - senior resources
        5: 1.5    // Critical - expert resources
      };
      
      const multiplier = priorityMultipliers[priority] || 1.0;
      priorityCostMultiplier += multiplier;
      taskCount++;
    });
    
    if (taskCount > 0) {
      // Average priority multiplier, compare to baseline (normal = 1.0)
      const avgPriorityMultiplier = priorityCostMultiplier / taskCount;
      estimatedCost *= avgPriorityMultiplier;
    }
    
    // Update display
    const impactDurationEl = this.q('#impactDuration');
    const impactCostEl = this.q('#impactCost');
    if (impactDurationEl) impactDurationEl.textContent = `${Math.max(1, estimatedDurationMinutes).toFixed(0)} minutes`;
    if (impactCostEl) impactCostEl.textContent = `$${Math.round(Math.max(0, estimatedCost)).toLocaleString()}`;
  }

  calculateParallelDuration(taskConfigs) {
    const parallel = [], sequential = [];
    Object.values(taskConfigs).forEach(cfg => (cfg.allowParallel ? parallel : sequential).push(cfg));
    let total = 0;
    if (parallel.length) total += Math.max(...parallel.map(t => t.newDuration));
    if (sequential.length) total += sequential.reduce((s,t) => s + t.newDuration, 0);
    return total / 8;
  }

  applyPriorityAdjustment(base, priority) {
    const mult = { 1: 1.3, 2: 1.15, 3: 1.0, 4: 0.85, 5: 0.7 }[priority] ?? 1.0;
    return base * mult;
  }

  calculatePriorityAdjustedCost(taskConfigs, baseRate = 85) {
    let total = 0;
    Object.values(taskConfigs).forEach(cfg => {
      const mult = { 1: 0.7, 2: 0.85, 3: 1.0, 4: 1.25, 5: 1.5 }[cfg.priority] ?? 1.0;
      total += cfg.newDuration * (baseRate * mult);
    });
    return total;
  }

  updateImpactPreviewFromScenario(metrics) {
    // Mirror frontend: uses 24 hours per day here
    this.q('#impactDuration').textContent = `${(metrics.total_time_days * 24).toFixed(1)} hours`;
    this.q('#impactCost').textContent = `$${metrics.total_cost.toLocaleString()}`;
  }

  async updateScenario() {
    const durText = this.q('#impactDuration')?.textContent || '0 days';
    const costText = this.q('#impactCost')?.textContent || '$0';
    // durText is in hours here; convert back to days for metrics alignment
    const estimatedDuration = parseFloat(durText.replace(' hours','')) / 24;
    const estimatedCost = parseFloat(costText.replace('$','').replace(/,/g,''));
    const constraints = this.collectConstraints();
    try {
      const pid = this.q('#processDropdown')?.value;
      const result = await svcOptimizeCustom(pid, constraints);
      // Unify result shapes similar to optimizeProcess
      let nextScenario = null;
      if (result?.scenario && result?.metrics) {
        nextScenario = { scenario: result.scenario, metrics: result.metrics };
      } else if (result?.best_scenario) {
        nextScenario = result.best_scenario;
      } else if (Array.isArray(result?.scenarios)) {
        const pickScore = (s) => {
          const q = Number(s.quality_score || s.metrics?.quality_score || 0);
          const t = Number(s.total_duration_days || s.metrics?.total_time_days || 0) || 1;
          const c = Number(s.total_cost || s.metrics?.total_cost || 1) || 1;
          return q * 0.4 + (1 / t) * 0.3 + (1 / c) * 0.3;
        };
        const top = [...result.scenarios].sort((a,b) => pickScore(b)-pickScore(a))[0];
        nextScenario = {
          scenario: { assignments: top.assignments || [] },
          metrics: {
            total_time_days: Number(top.total_duration_days || top.metrics?.total_time_days || estimatedDuration),
            total_cost: Number(top.total_cost || top.metrics?.total_cost || estimatedCost),
            quality_score: Number(top.quality_score || top.metrics?.quality_score || 0),
            resource_utilization: Number(top.resource_utilization || top.metrics?.resource_utilization || 0.85),
          }
        };
      }
      if (!nextScenario) throw new Error('Unexpected response from optimize/custom');
      // Overwrite with estimated duration/cost to reflect preview
      nextScenario.metrics.total_time_days = estimatedDuration;
      nextScenario.metrics.total_cost = estimatedCost;
      this.currentScenario = nextScenario;
      this.displayBestScenario(nextScenario);
    } catch (e) {
      console.error(e);
      alert('Error updating scenario.');
    }
  }

  collectConstraints() {
    const constraints = { resources: {}, tasks: {}, preferences: { time_priority: Number(this.q('#timePriority')?.value || 33)/100, cost_priority: Number(this.q('#costPriority')?.value || 33)/100, quality_priority: Number(this.q('#qualityPriority')?.value || 34)/100 } };
    if (this.projectData) {
      this.projectData.resources.forEach(r => {
        constraints.resources[r.id] = { hourly_rate: Number(this.q(`#rateSlider-${r.id}`)?.value || r.hourly_rate), max_hours_per_day: Number(this.q(`#hoursSlider-${r.id}`)?.value || r.max_hours_per_day), available: !!this.q(`#available-${r.id}`)?.checked };
      });
      this.projectData.tasks.forEach(t => {
        constraints.tasks[t.id] = { duration_hours: Number(this.q(`#durationSlider-${t.id}`)?.value || t.duration_hours), priority: Number(this.q(`#prioritySlider-${t.id}`)?.value || 3), allow_parallel: !!this.q(`#parallel-${t.id}`)?.checked };
      });
    }
    return constraints;
  }

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.qAll('.tab-btn').forEach(b => b.classList.remove('active'));
    e.currentTarget.classList.add('active');
    this.qAll('.tab-content').forEach(c => c.classList.remove('active'));
    this.q(`#${tab}Tab`)?.classList.add('active');
    // Lazy render when a tab becomes active
    this.ensureTabRendered(tab);
  }

  enableComparison() {
    if (!this.bestScenarioBaseline) return;
    
    const tbody = this.q('#comparisonBody');
    const wrapper = this.q('#comparisonTable');
    if (!tbody || !wrapper) return;
    tbody.innerHTML = '';
    
    // Get current Impact Preview values (modified constraints)
    const impactDurationEl = this.q('#impactDuration');
    const impactCostEl = this.q('#impactCost');
    
    const currentDurationMinutes = impactDurationEl ? parseFloat(impactDurationEl.textContent.replace(' minutes', '')) : 0;
    const currentCost = impactCostEl ? parseFloat(impactCostEl.textContent.replace('$', '').replace(/,/g, '')) : 0;
    
    // Convert current duration from minutes to days for comparison
    const currentDurationDays = currentDurationMinutes / (8 * 60); // 8 hours * 60 minutes per day
    
    const metrics = [
      { 
        label: 'Duration (days)', 
        original: this.bestScenarioBaseline.total_time_days, 
        current: currentDurationDays 
      },
      { 
        label: 'Total Cost', 
        original: this.bestScenarioBaseline.total_cost, 
        current: currentCost 
      },
      { 
        label: 'Quality Score', 
        original: this.bestScenarioBaseline.quality_score * 100, 
        current: this.bestScenarioBaseline.quality_score * 100 // Quality doesn't change in impact preview
      },
      { 
        label: 'Resource Utilization', 
        original: this.bestScenarioBaseline.resource_utilization * 100, 
        current: this.bestScenarioBaseline.resource_utilization * 100 // Utilization doesn't change in impact preview
      }
    ];
    
    metrics.forEach(m => {
      const diff = m.current - m.original;
      const pct = m.original !== 0 ? ((diff / m.original) * 100).toFixed(1) : '0.0';
      const row = document.createElement('div');
      row.className = 'roles-table-row';
      row.style.gridTemplateColumns = '2fr 1fr 1fr 1fr';
      row.innerHTML = `
        <div class="cell">${m.label}</div>
        <div class="cell">${m.label.includes('Cost') ? '$' : ''}${m.original.toFixed(1)}${m.label.includes('Score') || m.label.includes('Utilization') ? '%' : ''}</div>
        <div class="cell">${m.label.includes('Cost') ? '$' : ''}${m.current.toFixed(1)}${m.label.includes('Score') || m.label.includes('Utilization') ? '%' : ''}</div>
        <div class="cell ${diff >= 0 ? 'difference-positive' : 'difference-negative'}">${diff >= 0 ? '+' : ''}${diff.toFixed(1)} (${pct}%)</div>`;
      tbody.appendChild(row);
    });
    wrapper.classList.remove('hidden');
  }

  resetScenario() {
    if (!this.originalScenario) return;
    this.currentScenario = { ...this.originalScenario };
    this.displayBestScenario(this.originalScenario);
    this.updateImpactPreviewFromScenario(this.originalScenario.metrics);
    // reset inputs
    if (this.projectData) {
      this.projectData.resources.forEach(r => {
        const rate = this.q(`#rateSlider-${r.id}`), hrs = this.q(`#hoursSlider-${r.id}`), av = this.q(`#available-${r.id}`);
        if (rate) rate.value = r.hourly_rate;
        if (hrs) hrs.value = r.max_hours_per_day;
        if (av) av.checked = true;
        const rateLabel = this.q(`#rate-${r.id}`), hrsLabel = this.q(`#hours-${r.id}`);
        if (rateLabel) rateLabel.textContent = r.hourly_rate;
        if (hrsLabel) hrsLabel.textContent = r.max_hours_per_day;
      });
      this.projectData.tasks.forEach(t => {
        const dur = this.q(`#durationSlider-${t.id}`), pri = this.q(`#prioritySlider-${t.id}`), par = this.q(`#parallel-${t.id}`);
        if (dur) { dur.value = t.duration_hours * 60; const lbl = this.q(`#duration-${t.id}`); if (lbl) lbl.textContent = t.duration_hours * 60; }
        if (pri) { pri.value = 3; const plbl = this.q(`#priority-${t.id}`); if (plbl) plbl.textContent = 'Normal'; }
        if (par) par.checked = false;
      });
    }
    const table = this.q('#comparisonTable');
    if (table) table.classList.add('hidden');
  }
}

const WhatIfAnalysisPage = () => {
  const containerRef = React.useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const dashboard = new WhatIfDashboard(containerRef.current);
    dashboard.mount();
    return () => {
      // no global listeners were added beyond root-scoped
    };
  }, []);

  return (
    <div className="page-container" ref={containerRef}>
      <div className="page-header">
        <div className="header-content">
          <div>
            <h2 className="page-title">What-if Analysis</h2>
            <p className="page-subtitle">Optimize scenarios with AI-powered allocation</p>
          </div>
        </div>
      </div>

      <div className="page-content whatif">
        <div className="role-card">
          <div className="section-title">Select Process</div>
          <div className="form-grid">
            <div className="form-group">
              <label>Process</label>
              <input id="processSearch" type="text" placeholder="Search processes..." className="input" style={{ marginBottom: 8 }} />
              <select id="processDropdown">
                <option value="">Select a process to optimize...</option>
              </select>
            </div>
            <div className="form-group" style={{ alignSelf: 'end' }}>
              <button id="optimizeBtn" className="primary-btn" disabled>Optimize Process</button>
            </div>
          </div>
          <div id="loadingSpinner" className="hidden muted" style={{ marginTop: 8 }}></div>
        </div>

        <div id="bestScenario" className="role-card hidden">
          <div className="section-title">Best Optimized Scenario</div>
          <div className="metrics-grid">
            <div className="metric">
              <div className="metric-label">Duration</div>
              <div className="metric-value"><span id="scenarioDuration">-</span> hours</div>
            </div>
            <div className="metric">
              <div className="metric-label">Total Cost</div>
              <div className="metric-value" id="scenarioCost">-</div>
            </div>
            <div className="metric">
              <div className="metric-label">Quality Score</div>
              <div className="metric-value"><span id="scenarioQuality">-</span>%</div>
            </div>
          </div>

          <div className="section-title" style={{ marginTop: 12 }}>Resource Allocation</div>
          <div className="roles-table">
            <div className="roles-table-header" style={{ gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr' }}>
              <div className="cell">Task</div>
              <div className="cell">Resource</div>
              <div className="cell">Hours</div>
              <div className="cell">Cost</div>
              <div className="cell">Start</div>
            </div>
            <div id="allocationBody" className="roles-table-body as-table"></div>
          </div>
        </div>

        <div id="constraintAdjustment" className="role-card hidden">
          <div className="section-title">Adjust Constraints</div>
          <div className="tabbar">
            <button className="tab-btn active" data-tab="resources">Resources</button>
            <button className="tab-btn" data-tab="tasks">Tasks</button>
            <button className="tab-btn" data-tab="preferences">Preferences</button>
          </div>

          <div id="resourcesTab" className="tab-content active">
            <div id="resourceControls" className="controls-grid"></div>
          </div>
          <div id="tasksTab" className="tab-content">
            <div id="taskControls" className="controls-grid"></div>
          </div>
          <div id="preferencesTab" className="tab-content">
            <div className="preference-controls">
              <div className="slider-group">
                <label>Time Priority</label>
                <input type="range" id="timePriority" min="0" max="100" defaultValue="33" className="slider" />
                <span id="timeValue">33%</span>
              </div>
              <div className="slider-group">
                <label>Cost Priority</label>
                <input type="range" id="costPriority" min="0" max="100" defaultValue="33" className="slider" />
                <span id="costValue">33%</span>
              </div>
              <div className="slider-group">
                <label>Quality Priority</label>
                <input type="range" id="qualityPriority" min="0" max="100" defaultValue="34" className="slider" />
                <span id="qualityValue">34%</span>
              </div>
            </div>
            <button id="updateScenarioBtn" className="primary-btn">Update Scenario</button>
          </div>
          {/* Impact Preview outside of tabs */}
          <div className="impact-display">
            <div className="impact-item"><span>Estimated Duration:</span><span id="impactDuration" className="impact-value">-</span></div>
            <div className="impact-item"><span>Estimated Cost:</span><span id="impactCost" className="impact-value">-</span></div>
          </div>
        </div>

        <div id="comparisonSection" className="role-card hidden">
          <div className="section-title">Scenario Comparison</div>
          <div className="comparison-controls">
            <button id="enableComparisonBtn" className="secondary-btn">Compare with Original</button>
            <button id="resetScenarioBtn" className="danger-btn">Reset to Original</button>
          </div>
          <div id="comparisonTable" className="hidden">
            <div className="roles-table">
              <div className="roles-table-header" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr' }}>
                <div className="cell">Metric</div>
                <div className="cell">Original</div>
                <div className="cell">Custom</div>
                <div className="cell">Difference</div>
              </div>
              <div id="comparisonBody" className="roles-table-body as-table"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatIfAnalysisPage;
