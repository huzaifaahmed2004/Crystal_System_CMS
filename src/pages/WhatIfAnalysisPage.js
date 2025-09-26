import React, { useEffect } from 'react';
import '../styles/what-if-analysis.css';
import { optimizeProcess as svcOptimizeProcess } from '../services/whatIfService';
import { getProcessesWithRelations, getProcessWithRelations } from '../services/processService';
import FormModal from '../components/ui/FormModal';

// Lightweight integration of the existing What-If Dashboard logic.
// We reuse the same element IDs so we can port the logic quickly.

class WhatIfDashboard {
  constructor(root, opts = {}) {
    this.root = root;
    this.originalScenario = null;
    this.currentScenario = null;
    this.impactPreviewScenario = null;
    this.projectData = null;
    this.constraints = null;
    this.renderedTabs = { resources: false, tasks: false };
    this.processLabelToId = new Map();
    // Guards for dev StrictMode double-invocation
    this._mounted = false;
    this._processesLoading = false;
    this._processesLoaded = false;
    this.openMinTasksModal = typeof opts.openMinTasks === 'function' ? opts.openMinTasks : null;
    // Track if the user has adjusted any constraint sliders/weights.
    // When false, Impact Preview should mirror Best Scenario exactly.
    this._userAdjusted = false;
  }

  mount() {
    // Prevent duplicate mounts (React StrictMode in dev may invoke effects twice)
    if (this.root?.dataset?.wifMounted === '1') return;
    this.root.dataset.wifMounted = '1';

    // bind listeners within root scope
    const inputEl = this.q('#processDropdown');
    inputEl?.addEventListener('input', this.onProcessSelect.bind(this));
    inputEl?.addEventListener('focus', () => {
      try { inputEl.value = ''; } catch (_) {}
      const btn = this.q('#optimizeBtn');
      if (btn) btn.disabled = true;
      // Optionally hide previously shown sections on reset
      this.q('#bestScenario')?.classList.add('hidden');
      this.q('#constraintAdjustment')?.classList.add('hidden');
      this.q('#comparisonSection')?.classList.add('hidden');
      this.q('#impactPreviewSection')?.classList.add('hidden');
    });
    this.q('#optimizeBtn')?.addEventListener('click', this.optimizeProcess.bind(this));

    this.qAll('.tab-btn').forEach(btn => btn.addEventListener('click', this.switchTab.bind(this)));
    ['timePriority','costPriority','qualityPriority'].forEach(id => this.q('#' + id)?.addEventListener('input', this.updatePriorities.bind(this)));
    this.q('#enableComparisonBtn')?.addEventListener('click', this.enableComparison.bind(this));
    this.q('#resetScenarioBtn')?.addEventListener('click', this.resetScenario.bind(this));

    // Load available processes from CMS API
    this.loadProcesses();
  }

  q(sel) { return this.root.querySelector(sel); }
  qAll(sel) { return Array.from(this.root.querySelectorAll(sel)); }

  async loadProcesses() {
    try {
      if (this._processesLoaded || this._processesLoading) return;
      this._processesLoading = true;
      const input = this.q('#processDropdown');
      const datalist = this.q('#processOptions');
      if (!input || !datalist) return;
      datalist.innerHTML = '';
      const processes = await getProcessesWithRelations();
      const list = Array.isArray(processes) ? processes : [];
      this.allProcesses = list;
      this.processLabelToId = new Map();
      const seen = new Set();
      list.forEach(p => {
        const label = `${p.process_name || p.name} (${p.company?.name || ''})`;
        const id = p.process_id || p.id;
        if (!seen.has(label)) {
          seen.add(label);
          this.processLabelToId.set(label, id);
          const opt = document.createElement('option');
          opt.value = label;
          datalist.appendChild(opt);
        }
      });
      // Reset input placeholder
      input.placeholder = 'Search and select a process...';
      input.setAttribute('autocomplete', 'off');
      const btn = this.q('#optimizeBtn');
      if (btn) btn.disabled = true;
      this._processesLoaded = true;
    } catch (e) {
      console.error('Failed to load processes for What-if Analysis:', e);
      const datalist = this.q('#processOptions');
      if (datalist) datalist.innerHTML = '';
      const btn = this.q('#optimizeBtn');
      if (btn) btn.disabled = true;
    }
    finally {
      this._processesLoading = false;
    }
  }

  filterProcesses(e) { /* no-op with datalist; kept for compatibility */ }

  getSelectedProcessId() {
    const input = this.q('#processDropdown');
    const v = input?.value?.trim();
    if (!v) return null;
    if (this.processLabelToId && this.processLabelToId.has(v)) return this.processLabelToId.get(v);
    const fromId = (this.allProcesses || []).find(p => String(p.process_id || p.id) === v);
    return fromId ? (fromId.process_id || fromId.id) : null;
  }

  onProcessSelect(e) {
    const btn = this.q('#optimizeBtn');
    const pid = this.getSelectedProcessId();
    if (btn) btn.disabled = !pid;
  }

  async optimizeProcess() {
    const processId = this.getSelectedProcessId();
    if (!processId) return; // backend expects a CMS numeric ID

    this.q('#loadingSpinner')?.classList.remove('hidden');
    const btn = this.q('#optimizeBtn');
    if (btn) btn.disabled = true;

    try {
      // Guard: require at least 2 tasks in process before optimizing
      try {
        const proc = await getProcessWithRelations(processId);
        let tasksCount = 0; let confident = false;
        const wf = Array.isArray(proc?.workflow) ? proc.workflow : null;
        if (wf) {
          const ids = wf.map(w => w?.task_id).filter(Boolean);
          if (ids.length > 0) { tasksCount = new Set(ids).size; confident = true; }
          else if (wf.length > 0) { tasksCount = wf.length; confident = true; }
        }
        if (!confident && Array.isArray(proc?.tasks)) { tasksCount = proc.tasks.length; confident = true; }
        if (!confident && Array.isArray(proc?.process_tasks)) { tasksCount = proc.process_tasks.length; confident = true; }
        if (confident && tasksCount < 2) {
          if (this.openMinTasksModal) this.openMinTasksModal();
          return;
        }
      } catch (_) {
        // If we can't determine count, allow optimize to proceed
      }
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
      // Initialize Impact Preview to exactly match Best Scenario by default
      this.updateImpactPreviewFromScenario(bestScenario.metrics);

      this.q('#bestScenario')?.classList.remove('hidden');
      this.q('#constraintAdjustment')?.classList.remove('hidden');
      this.q('#comparisonSection')?.classList.remove('hidden');
      this.q('#impactPreviewSection')?.classList.remove('hidden');
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
    const tbody = this.q('#allocationBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    let totalHours = 0;
    let totalCost = 0;
    const assignments = Array.isArray(scenario?.scenario?.assignments) ? scenario.scenario.assignments : [];
    const tasksArr = Array.isArray(this.projectData?.tasks) ? this.projectData.tasks : [];
    const resourcesArr = Array.isArray(this.projectData?.resources) ? this.projectData.resources : [];
    assignments.forEach(assignment => {
      const task = tasksArr.find(t => t.id === assignment.task_id) || {
        id: assignment.task_id,
        name: this.taskNames?.[assignment.task_id] || assignment.task_id
      };
      const resource = resourcesArr.find(r => r.id === assignment.resource_id) || {
        id: assignment.resource_id,
        name: this.resourceNames?.[assignment.resource_id] || assignment.resource_id,
        hourly_rate: 85
      };
      const hours = Number(assignment?.hours_allocated || 0);
      const cost = hours * Number(resource.hourly_rate || 85);
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

    // Update header metrics using the same totals we show in the table to keep them consistent
    if (this.q('#scenarioDuration')) this.q('#scenarioDuration').textContent = totalHours.toFixed(1);
    if (this.q('#scenarioCost')) this.q('#scenarioCost').textContent = `$${totalCost.toLocaleString()}`;
    if (this.q('#scenarioQuality')) this.q('#scenarioQuality').textContent = `${(Number(scenario.metrics.quality_score || 0) * 100).toFixed(1)}`;

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
    // Reset user-adjusted flag so initial render mirrors best scenario
    this._userAdjusted = false;
    
    this.ensureTabRendered(active);
  }
  
  initializeConstraintsFromScenario() {
    if (!this.currentScenario || !this.projectData) {
      console.log('Cannot initialize constraints: missing scenario or project data');
      return;
    }
    
    const assignments = Array.isArray(this.currentScenario?.scenario?.assignments) ? 
      this.currentScenario.scenario.assignments : [];
    
    console.log('Initializing constraints from scenario with', assignments.length, 'assignments');
    
    // For each task, set its duration based on the assignment hours
    assignments.forEach(assignment => {
      const task = this.projectData.tasks.find(t => t.id === assignment.task_id);
      if (!task) return;
      
      const hours = Number(assignment?.hours_allocated || 0);
      const durationMinutes = hours * 60;
      
      console.log(`Setting task ${task.id} duration to ${durationMinutes} minutes (${hours} hours)`);
      
      // Set the duration slider to match the assignment
      const durationSlider = this.q(`#durationSlider-${task.id}`);
      const durationLabel = this.q(`#duration-${task.id}`);
      if (durationSlider) {
        durationSlider.value = durationMinutes;
        if (durationLabel) durationLabel.textContent = durationMinutes;
        console.log(`Updated slider for task ${task.id}: ${durationSlider.value}`);
      } else {
        console.log(`Slider not found for task ${task.id}`);
      }
    });
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
      `;
      container.appendChild(group);
      group.querySelector(`#rateSlider-${resource.id}`)?.addEventListener('input', this.onConstraintChange.bind(this));
      group.querySelector(`#hoursSlider-${resource.id}`)?.addEventListener('input', this.onConstraintChange.bind(this));
    });
  }

  setupTaskControls() {
    const container = this.q('#taskControls');
    if (!container) return;
    container.innerHTML = '';
    
    // Get current scenario assignments to use actual optimized hours
    const assignments = Array.isArray(this.currentScenario?.scenario?.assignments) ? 
      this.currentScenario.scenario.assignments : [];
    
    this.projectData.tasks.forEach(task => {
      // Find the assignment for this task to get the optimized hours
      const assignment = assignments.find(a => a.task_id === task.id);
      const assignmentHours = assignment ? Number(assignment.hours_allocated || 0) : task.duration_hours;
      const assignmentMinutes = assignmentHours * 60;
      
      const group = document.createElement('div');
      group.className = 'wif-control-group';
      group.innerHTML = `
        <h4>${task.name}</h4>
        <div class="slider-group">
          <label>Duration (Minutes): <span id="duration-${task.id}">${Math.round(assignmentMinutes)}</span></label>
          <input type="range" id="durationSlider-${task.id}" min="1" max="600" value="${Math.round(assignmentMinutes)}" class="slider" data-task="${task.id}" data-type="duration">
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
    
    // Only mark as user-adjusted for non-parallel changes
    // Parallel execution is a scheduling optimization that doesn't affect cost/preference calculations
    if (el.dataset.type !== 'parallel') {
      this._userAdjusted = true;
    }
    
    // For parallel changes, update impact preview without preference adjustments
    if (el.dataset.type === 'parallel') {
      this.updateImpactPreviewForParallelChange();
    } else {
      this.updateImpactPreview();
    }
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
    // Mark as user interaction so heuristics are applied from this point
    this._userAdjusted = true;
    this.updateImpactPreview();
    this.updatePreferenceAllocation();
  }

  updateImpactPreview() {
    // Note: Always update impact preview to show preference adjustments
    // The preference allocation table shows detailed breakdown, but impact preview shows adjusted totals

    // Use best scenario as baseline if available, otherwise use impactPreviewScenario
    if (!this.projectData || (!this.bestScenarioBaseline && !this.impactPreviewScenario)) {
      const d = this.q('#impactDuration');
      const c = this.q('#impactCost');
      if (d) d.textContent = '2.5 hours';
      if (c) c.textContent = '$296';
      return;
    }

    // Start with current scenario assignments and apply constraint changes directly
    const assignments = Array.isArray(this.currentScenario?.scenario?.assignments) ? this.currentScenario.scenario.assignments : [];
    const tasksArr = Array.isArray(this.projectData?.tasks) ? this.projectData.tasks : [];
    const resourcesArr = Array.isArray(this.projectData?.resources) ? this.projectData.resources : [];

    let totalCost = 0;
    const taskInfos = [];
    

    assignments.forEach(assignment => {
      const task = tasksArr.find(t => t.id === assignment.task_id) || {
        id: assignment.task_id,
        name: this.taskNames?.[assignment.task_id] || assignment.task_id
      };
      const resource = resourcesArr.find(r => r.id === assignment.resource_id) || {
        id: assignment.resource_id,
        name: this.resourceNames?.[assignment.resource_id] || assignment.resource_id,
        hourly_rate: 85
      };

      // Get current constraint values
      const durationSlider = this.q(`#durationSlider-${task.id}`);
      const prioritySlider = this.q(`#prioritySlider-${task.id}`);
      const parallelCheckbox = this.q(`#parallel-${task.id}`);
      const rateSlider = this.q(`#rateSlider-${resource.id}`);
      const hoursSlider = this.q(`#hoursSlider-${resource.id}`);

      // Calculate adjusted hours for this assignment
      let adjustedHours = Number(assignment?.hours_allocated || 0);

      // For duration changes, we should compare against the baseline assignment hours, not task.duration_hours
      // The baseline assignment hours are what we started with after optimization
      if (durationSlider) {
        const baselineHours = Number(assignment?.hours_allocated || 0);
        const baselineMinutes = baselineHours * 60;
        const newDurationMinutes = parseFloat(durationSlider.value);
        
        // Only apply ratio if there's an actual change from baseline
        if (baselineMinutes > 0 && Math.abs(newDurationMinutes - baselineMinutes) > 0.01) {
          const durationRatio = newDurationMinutes / baselineMinutes;
          adjustedHours *= durationRatio;
        }
      }

      // Apply task priority adjustments
      // TASK PRIORITY SYSTEM: Higher task priority = premium resources/skills = higher cost but faster execution
      // Priority 1 (Very Low): 20% more time, 20% less cost (basic resources)
      // Priority 3 (Normal): baseline time and cost
      // Priority 5 (Critical): 20% less time, 30% more cost (premium resources)
      let taskPriorityRateMultiplier = 1.0;
      if (prioritySlider) {
        const priority = parseInt(prioritySlider.value);
        // Time multipliers: higher priority = less time (more efficient)
        const timeMultipliers = { 1: 1.2, 2: 1.1, 3: 1.0, 4: 0.9, 5: 0.8 };
        // Rate multipliers: higher priority = higher cost (premium resources)
        const rateMultipliers = { 1: 0.8, 2: 0.9, 3: 1.0, 4: 1.15, 5: 1.3 };
        
        adjustedHours *= (timeMultipliers[priority] || 1.0);
        taskPriorityRateMultiplier = rateMultipliers[priority] || 1.0;
      }

      // Apply resource productivity changes (more hours/day = higher productivity = less time needed)
      if (hoursSlider) {
        const originalHours = resource.max_hours_per_day || 8;
        const newHours = parseFloat(hoursSlider.value);
        const productivityRatio = originalHours / newHours; // Inverse relationship
        adjustedHours *= productivityRatio;
      }

      // Calculate cost with adjusted rate (parallel execution doesn't affect cost)
      let adjustedRate = rateSlider ? parseFloat(rateSlider.value) : (resource.hourly_rate || 85);
      
      // Apply task priority rate adjustment (higher priority = higher cost)
      adjustedRate *= taskPriorityRateMultiplier;
      
      // For cost calculation, use the adjusted hours (duration/priority/productivity adjustments only)
      // Parallel execution does NOT affect the cost - tasks still require the same work hours
      const assignmentCost = adjustedHours * adjustedRate;
      
      

      // Store task info for parallel time calculation
      taskInfos.push({
        taskId: task.id,
        hours: adjustedHours, // This is the actual work hours needed for time calculation
        cost: assignmentCost, // Cost is independent of parallel scheduling
        isParallel: parallelCheckbox && parallelCheckbox.checked
      });

      // Cost is always the sum of all work hours * rates, regardless of parallel scheduling
      totalCost += assignmentCost;
    });

    // Calculate total project time considering parallel execution
    let totalHours = this.calculateProjectDuration(taskInfos);
    

    // Only apply preference adjustments if user has interacted with preferences
    // and this is not a parallel-only change
    if (this._userAdjusted && !this._isParallelOnlyChange) {
      let pTime = Number(this.q('#timePriority')?.value || 33) / 100;
      let pCost = Number(this.q('#costPriority')?.value || 33) / 100;
      let pQual = Number(this.q('#qualityPriority')?.value || 34) / 100;
      const pSum = pTime + pCost + pQual;
      if (pSum > 0) { pTime /= pSum; pCost /= pSum; pQual /= pSum; }
      

      // Apply preference adjustments based on priority sliders
      // PREFERENCES PRIORITY SYSTEM: Opposite effect from task priorities
      // Higher TIME priority = reduce time (accept higher cost for speed)
      // Higher COST priority = reduce cost (accept longer time for savings)  
      // Higher QUALITY priority = improve both metrics slightly
      
      let timeAdjustment = 1.0;
      let costAdjustment = 1.0;
      
      // Time priority effect: higher time priority = faster execution but potentially higher cost
      if (pTime > 0.35) { // If time priority is high (>35%)
        const timeIntensity = Math.min(1.0, (pTime - 0.33) * 4); // Scale the effect, cap at 1.0
        timeAdjustment *= (1 - 0.15 * timeIntensity); // Reduce time up to 15%
        costAdjustment *= (1 + 0.1 * timeIntensity);  // Increase cost up to 10%
      }
      
      // Cost priority effect: higher cost priority = lower cost but potentially longer time
      if (pCost > 0.35) { // If cost priority is high (>35%)
        const costIntensity = Math.min(1.0, (pCost - 0.33) * 4); // Scale the effect, cap at 1.0
        costAdjustment *= (1 - 0.2 * costIntensity); // Reduce cost up to 20%
        timeAdjustment *= (1 + 0.1 * costIntensity);  // Increase time up to 10%
      }
      
      // Quality priority effect: improve both metrics slightly
      if (pQual > 0.35) { // If quality priority is high (>35%)
        const qualIntensity = Math.min(1.0, (pQual - 0.33) * 4); // Scale the effect, cap at 1.0
        timeAdjustment *= (1 - 0.05 * qualIntensity); // Slight time improvement
        costAdjustment *= (1 + 0.03 * qualIntensity);  // Slight cost increase for quality
      }

      totalHours = Math.max(0.1, totalHours * timeAdjustment);
      totalCost = Math.max(0, totalCost * costAdjustment);
      
    }

    // Update display
    const durationMinutes = totalHours * 60;
    const impactDurationEl = this.q('#impactDuration');
    const impactCostEl = this.q('#impactCost');
    if (impactDurationEl) impactDurationEl.textContent = `${Math.round(durationMinutes)} minutes`;
    if (impactCostEl) impactCostEl.textContent = `$${Math.round(totalCost).toLocaleString()}`;
  }

  updateImpactPreviewForParallelChange() {
    // Set flag to indicate this is a parallel-only change
    this._isParallelOnlyChange = true;
    
    // Store current values before update to compare
    const beforeCost = this.q('#impactCost')?.textContent || '$0';
    const beforeTime = this.q('#impactDuration')?.textContent || '0 minutes';
    
    console.log('PARALLEL CHANGE - Before update:', { cost: beforeCost, time: beforeTime });
    this.updateImpactPreview();
    
    // Check values after update
    const afterCost = this.q('#impactCost')?.textContent || '$0';
    const afterTime = this.q('#impactDuration')?.textContent || '0 minutes';
    console.log('PARALLEL CHANGE - After update:', { cost: afterCost, time: afterTime });
    
    // Reset flag after update
    this._isParallelOnlyChange = false;
  }

  calculateProjectDuration(taskInfos) {
    // If no tasks marked as parallel, just sum all hours
    const allParallel = taskInfos.filter(task => task.isParallel);
    
    
    if (allParallel.length < 2) {
      // Less than 2 parallel tasks: all tasks run sequentially
      const totalHours = taskInfos.reduce((sum, task) => sum + task.hours, 0);
      return totalHours;
    }
    
    // 2 or more parallel tasks: they can run simultaneously
    const parallelTasks = taskInfos.filter(task => task.isParallel);
    const sequentialTasks = taskInfos.filter(task => !task.isParallel);
    
    // Sequential tasks: sum all hours
    const sequentialHours = sequentialTasks.reduce((sum, task) => sum + task.hours, 0);
    
    // Parallel tasks: take the maximum duration
    const maxParallelHours = Math.max(...parallelTasks.map(task => task.hours));
    
    const totalProjectHours = sequentialHours + maxParallelHours;
    
    
    return totalProjectHours;
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

  // Helper: parse a duration label like "120 minutes", "2.5 hours", or "0.1 days" into minutes
  parseDurationTextToMinutes(text) {
    if (!text || typeof text !== 'string') return NaN;
    const lower = text.toLowerCase();
    const number = parseFloat(text.replace(/[^0-9.\-]/g, ''));
    if (!Number.isFinite(number)) return NaN;
    if (lower.includes('minute')) return number;
    if (lower.includes('hour')) return number * 60;
    if (lower.includes('day')) return number * 24 * 60; // 24 hours/day * 60 min/hour
    return number; // assume minutes if unit absent
  }

  updateImpactPreviewFromScenario(metrics) {
    // When initially setting from Best Scenario, all tasks are sequential (no parallel by default)
    // This method is called right after optimization when no checkboxes are checked yet
    let totalHours = 0;
    let totalCost = 0;
    const assignments = Array.isArray(this.currentScenario?.scenario?.assignments) ? this.currentScenario.scenario.assignments : [];
    const tasksArr = Array.isArray(this.projectData?.tasks) ? this.projectData.tasks : [];
    const resourcesArr = Array.isArray(this.projectData?.resources) ? this.projectData.resources : [];
    
    assignments.forEach(assignment => {
      const resource = resourcesArr.find(r => r.id === assignment.resource_id) || {
        id: assignment.resource_id,
        name: this.resourceNames?.[assignment.resource_id] || assignment.resource_id,
        hourly_rate: 85
      };
      const hours = Number(assignment?.hours_allocated || 0);
      const cost = hours * Number(resource.hourly_rate || 85);
      totalHours += hours;
      totalCost += cost;
    });
    
    // Convert to minutes for Impact Preview display
    const durationMinutes = totalHours * 60;
    this.q('#impactDuration').textContent = `${Math.round(durationMinutes)} minutes`;
    this.q('#impactCost').textContent = `$${Math.round(totalCost).toLocaleString()}`;
  }

  updatePreferenceAllocation() {
    if (!this.projectData || !this.currentScenario) return;

    const pTime = Number(this.q('#timePriority')?.value || 33) / 100;
    const pCost = Number(this.q('#costPriority')?.value || 33) / 100;
    const pQual = Number(this.q('#qualityPriority')?.value || 34) / 100;

    // Generate new allocation based on preferences
    const newAllocations = this.generatePreferenceBasedAllocation(pTime, pCost, pQual);
    this.displayPreferenceAllocation(newAllocations);
  }

  generatePreferenceBasedAllocation(pTime, pCost, pQual) {
    const tasksArr = Array.isArray(this.projectData?.tasks) ? this.projectData.tasks : [];
    const resourcesArr = Array.isArray(this.projectData?.resources) ? this.projectData.resources : [];
    const originalAssignments = Array.isArray(this.currentScenario?.scenario?.assignments) ? this.currentScenario.scenario.assignments : [];

    if (!resourcesArr.length) return [];

    const newAllocations = [];
    const resourceUsage = new Map(); // Track resource workload for better distribution

    // Initialize resource usage tracking
    resourcesArr.forEach(resource => {
      resourceUsage.set(resource.id, 0);
    });

    tasksArr.forEach((task, taskIndex) => {
      // Find original assignment for this task
      const originalAssignment = originalAssignments.find(a => a.task_id === task.id);
      if (!originalAssignment) return;

      // Get current task constraints
      const durationSlider = this.q(`#durationSlider-${task.id}`);
      const prioritySlider = this.q(`#prioritySlider-${task.id}`);
      const parallelCheckbox = this.q(`#parallel-${task.id}`);
      
      const taskDurationMinutes = durationSlider ? parseFloat(durationSlider.value) : (task.duration_hours || 8) * 60;
      const taskPriority = prioritySlider ? parseInt(prioritySlider.value) : 3;
      const allowParallel = parallelCheckbox ? parallelCheckbox.checked : false;

      // Select resource based on preferences and load balancing
      let selectedResource;
      let allocatedHours;

      if (pTime > pCost && pTime > pQual) {
        // Time priority: use fastest/most expensive resources, reduce hours
        selectedResource = this.selectResourceByEfficiency(resourcesArr, 'time', resourceUsage, taskIndex);
        allocatedHours = (taskDurationMinutes / 60) * 0.8; // 20% time reduction
      } else if (pCost > pTime && pCost > pQual) {
        // Cost priority: use cheaper resources, may take longer
        selectedResource = this.selectResourceByEfficiency(resourcesArr, 'cost', resourceUsage, taskIndex);
        allocatedHours = (taskDurationMinutes / 60) * 1.1; // 10% time increase for cost savings
      } else {
        // Quality priority: use balanced/senior resources
        selectedResource = this.selectResourceByEfficiency(resourcesArr, 'quality', resourceUsage, taskIndex);
        allocatedHours = taskDurationMinutes / 60; // Standard time
      }

      // Apply task priority adjustments (same as in updateImpactPreview)
      // Higher task priority = premium resources/skills = higher cost but faster execution
      const timeMultipliers = { 1: 1.2, 2: 1.1, 3: 1.0, 4: 0.9, 5: 0.8 };
      const rateMultipliers = { 1: 0.8, 2: 0.9, 3: 1.0, 4: 1.15, 5: 1.3 };
      
      allocatedHours *= (timeMultipliers[taskPriority] || 1.0);
      const taskPriorityRateMultiplier = rateMultipliers[taskPriority] || 1.0;

      // Note: Parallel execution affects scheduling/time but NOT the work hours or cost
      // Each task still requires the same amount of work regardless of parallel execution

      // Update resource usage tracking
      resourceUsage.set(selectedResource.id, resourceUsage.get(selectedResource.id) + allocatedHours);

      // Cost calculation with task priority rate adjustment
      const adjustedRate = (selectedResource.hourly_rate || 85) * taskPriorityRateMultiplier;
      const cost = allocatedHours * adjustedRate;

      newAllocations.push({
        task_id: task.id,
        task_name: task.name,
        resource_id: selectedResource.id,
        resource_name: selectedResource.name,
        hours_allocated: Math.max(0.1, allocatedHours), // Minimum 0.1 hours
        hourly_rate: adjustedRate,
        total_cost: cost,
        start_time: originalAssignment.start_time || 0,
        priority: taskPriority,
        parallel: allowParallel
      });
    });

    return newAllocations;
  }

  selectResourceByEfficiency(resources, priority, resourceUsage, taskIndex) {
    if (!resources.length) return { id: 'default', name: 'Default Resource', hourly_rate: 85 };

    // Create a pool of suitable resources based on priority
    let candidateResources = [];

    switch (priority) {
      case 'time':
        // Sort by rate (highest first) and take top 50% for time efficiency
        const sortedByRate = [...resources].sort((a, b) => (b.hourly_rate || 85) - (a.hourly_rate || 85));
        candidateResources = sortedByRate.slice(0, Math.max(1, Math.ceil(sortedByRate.length / 2)));
        break;
      case 'cost':
        // Sort by rate (lowest first) and take bottom 50% for cost efficiency
        const sortedByCost = [...resources].sort((a, b) => (a.hourly_rate || 85) - (b.hourly_rate || 85));
        candidateResources = sortedByCost.slice(0, Math.max(1, Math.ceil(sortedByCost.length / 2)));
        break;
      case 'quality':
      default:
        // Use all resources for quality (balanced approach)
        candidateResources = [...resources];
        break;
    }

    // Among candidates, select the one with least current workload
    // If workloads are equal, use round-robin based on task index
    let selectedResource = candidateResources[0];
    let minWorkload = resourceUsage.get(selectedResource.id) || 0;

    candidateResources.forEach((resource, index) => {
      const workload = resourceUsage.get(resource.id) || 0;
      if (workload < minWorkload || (workload === minWorkload && (taskIndex + index) % candidateResources.length === 0)) {
        selectedResource = resource;
        minWorkload = workload;
      }
    });

    return selectedResource;
  }

  displayPreferenceAllocation(allocations) {
    const container = this.q('#preferenceAllocationTable');
    if (!container) {
      // Create the table container if it doesn't exist
      this.createPreferenceAllocationTable();
      return this.displayPreferenceAllocation(allocations);
    }

    const tbody = container.querySelector('.preference-allocation-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    let totalHours = 0;
    let totalCost = 0;

    allocations.forEach(allocation => {
      totalHours += allocation.hours_allocated;
      totalCost += allocation.total_cost;

      const row = document.createElement('div');
      row.className = 'roles-table-row';
      row.style.gridTemplateColumns = '2fr 1.5fr 1fr 1fr 1fr 1fr';
      row.innerHTML = `
        <div class="cell">${allocation.task_name}</div>
        <div class="cell">${allocation.resource_name}</div>
        <div class="cell">${allocation.hours_allocated.toFixed(1)}h</div>
        <div class="cell">$${allocation.hourly_rate}/hr</div>
        <div class="cell">$${Math.round(allocation.total_cost).toLocaleString()}</div>
        <div class="cell">${allocation.parallel ? 'Parallel' : 'Sequential'}</div>
      `;
      tbody.appendChild(row);
    });

    // Calculate project duration considering parallel execution
    const taskInfos = allocations.map(allocation => ({
      taskId: allocation.task_id,
      hours: allocation.hours_allocated,
      cost: allocation.total_cost,
      isParallel: allocation.parallel
    }));
    const projectDuration = this.calculateProjectDuration(taskInfos);
    
    // Add total row
    const totalRow = document.createElement('div');
    totalRow.className = 'roles-table-row total';
    totalRow.style.gridTemplateColumns = '2fr 1.5fr 1fr 1fr 1fr 1fr';
    totalRow.innerHTML = `
      <div class="cell"><strong>TOTAL</strong></div>
      <div class="cell">-</div>
      <div class="cell"><strong>${totalHours.toFixed(1)}h</strong></div>
      <div class="cell">-</div>
      <div class="cell"><strong>$${Math.round(totalCost).toLocaleString()}</strong></div>
      <div class="cell">${projectDuration.toFixed(1)}h (${(projectDuration / 8).toFixed(1)} days)</div>
    `;
    tbody.appendChild(totalRow);

    // Show the table
    container.classList.remove('hidden');

    // Update Impact Preview with the new allocation totals (use project duration for time)
    this.updateImpactPreviewFromAllocation(projectDuration, totalCost);
  }

  createPreferenceAllocationTable() {
    const preferencesTab = this.q('#preferencesTab');
    if (!preferencesTab) return;

    const tableHtml = `
      <div id="preferenceAllocationTable" class="hidden" style="margin-top: 20px;">
        <h4 style="margin-bottom: 12px; color: #111827;">Optimized Resource Allocation</h4>
        <div class="roles-table">
          <div class="roles-table-header" style="grid-template-columns: 2fr 1.5fr 1fr 1fr 1fr 1fr;">
            <div class="cell">Task</div>
            <div class="cell">Resource</div>
            <div class="cell">Hours</div>
            <div class="cell">Rate</div>
            <div class="cell">Cost</div>
            <div class="cell">Execution</div>
          </div>
          <div class="preference-allocation-body as-table"></div>
        </div>
      </div>
    `;

    preferencesTab.insertAdjacentHTML('beforeend', tableHtml);
  }

  updateImpactPreviewFromAllocation(totalHours, totalCost) {
    // Convert hours to minutes for Impact Preview display
    const durationMinutes = totalHours * 60;
    
    // Update Impact Preview with the new allocation values
    const impactDurationEl = this.q('#impactDuration');
    const impactCostEl = this.q('#impactCost');
    
    if (impactDurationEl) impactDurationEl.textContent = `${Math.round(durationMinutes)} minutes`;
    if (impactCostEl) impactCostEl.textContent = `$${Math.round(totalCost).toLocaleString()}`;
  }

  async updateScenario() {
    const durText = this.q('#impactDuration')?.textContent || '0 minutes';
    const costText = this.q('#impactCost')?.textContent || '$0';
    // durText is in minutes now; convert back to days for metrics alignment
    const estimatedDuration = parseFloat(durText.replace(' minutes','')) / (8 * 60);
    const estimatedCost = parseFloat(costText.replace('$','').replace(/,/g,''));

    const baseScenario = this.currentScenario || this.originalScenario;
    if (!baseScenario) { console.warn('No scenario available to update'); return; }

    const nextScenario = {
      scenario: baseScenario.scenario || { assignments: [] },
      metrics: {
        total_time_days: Number.isFinite(estimatedDuration) ? estimatedDuration : (baseScenario.metrics?.total_time_days || 0),
        total_cost: Number.isFinite(estimatedCost) ? estimatedCost : (baseScenario.metrics?.total_cost || 0),
        quality_score: Number(baseScenario.metrics?.quality_score || 0),
        resource_utilization: Number(baseScenario.metrics?.resource_utilization || 0.85),
      }
    };
    this.currentScenario = nextScenario;
    this.displayBestScenario(nextScenario);
  }

  collectConstraints() {
    const constraints = { resources: {}, tasks: {}, preferences: { time_priority: Number(this.q('#timePriority')?.value || 33)/100, cost_priority: Number(this.q('#costPriority')?.value || 33)/100, quality_priority: Number(this.q('#qualityPriority')?.value || 34)/100 } };
    if (this.projectData) {
      this.projectData.resources.forEach(r => {
        constraints.resources[r.id] = { hourly_rate: Number(this.q(`#rateSlider-${r.id}`)?.value || r.hourly_rate), max_hours_per_day: Number(this.q(`#hoursSlider-${r.id}`)?.value || r.max_hours_per_day), available: !!this.q(`#available-${r.id}`)?.checked };
      });
      this.projectData.tasks.forEach(t => {
        // Our UI slider is in MINUTES; backend expects HOURS
        const sliderVal = this.q(`#durationSlider-${t.id}`)?.value;
        const durationHours = sliderVal ? Number(sliderVal) / 60 : Number(t.duration_hours);
        constraints.tasks[t.id] = { duration_hours: durationHours, priority: Number(this.q(`#prioritySlider-${t.id}`)?.value || 3), allow_parallel: !!this.q(`#parallel-${t.id}`)?.checked };
      });
    }
    return constraints;
  }

  // Removed: optimizeWithFallback — custom optimize API calls disabled
  // async optimizeWithFallback(constraints) {}

  // Removed: normalizeToScenario — custom optimize API calls disabled
  // normalizeToScenario() { return null; }

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
    const currentDurationMinutes = impactDurationEl ? this.parseDurationTextToMinutes(impactDurationEl.textContent) : NaN;
    const currentCost = impactCostEl ? parseFloat(impactCostEl.textContent.replace('$', '').replace(/,/g, '')) : NaN;

    // Calculate quality score adjustment based on preferences
    const pQual = Number(this.q('#qualityPriority')?.value || 34) / 100;
    const baseQualityScore = this.bestScenarioBaseline.quality_score * 100;
    const adjustedQualityScore = baseQualityScore * (1 + 0.1 * pQual); // Up to +10% for max quality priority

    // Get the original values from the Best Scenario display to ensure consistency
    const originalDurationEl = this.q('#scenarioDuration');
    const originalCostEl = this.q('#scenarioCost');
    const originalDurationHours = originalDurationEl ? parseFloat(originalDurationEl.textContent) : this.bestScenarioBaseline.total_time_days;
    const originalCostValue = originalCostEl ? parseFloat(originalCostEl.textContent.replace('$', '').replace(/,/g, '')) : this.bestScenarioBaseline.total_cost;
    
    const metrics = [
      { label: 'Duration (minutes)', original: originalDurationHours * 60, current: Number.isFinite(currentDurationMinutes) ? currentDurationMinutes : originalDurationHours * 60 },
      { label: 'Total Cost', original: originalCostValue, current: Number.isFinite(currentCost) ? currentCost : originalCostValue },
      { label: 'Quality Score', original: baseQualityScore, current: adjustedQualityScore },
      { label: 'Resource Utilization', original: (this.bestScenarioBaseline.resource_utilization || 0.85) * 100, current: (this.bestScenarioBaseline.resource_utilization || 0.85) * 100 }
    ];

    metrics.forEach(m => {
      const diff = m.current - m.original;
      const pct = m.original !== 0 ? ((diff / m.original) * 100).toFixed(1) : '0.0';
      const row = document.createElement('div');
      row.className = 'roles-table-row';
      row.style.gridTemplateColumns = '2fr 1fr 1fr 1fr';
      row.innerHTML = `
        <div class="cell">${m.label}</div>
        <div class="cell">${m.label.includes('Cost') ? '$' : ''}${(m.label.includes('Duration') ? m.original.toFixed(0) : m.original.toFixed(1))}${m.label.includes('Score') || m.label.includes('Utilization') ? '%' : ''}</div>
        <div class="cell">${m.label.includes('Cost') ? '$' : ''}${(m.label.includes('Duration') ? m.current.toFixed(0) : m.current.toFixed(1))}${m.label.includes('Score') || m.label.includes('Utilization') ? '%' : ''}</div>
        <div class="cell ${diff >= 0 ? 'difference-positive' : 'difference-negative'}">${diff >= 0 ? '+' : ''}${diff.toFixed(1)} (${pct}%)</div>`;
      tbody.appendChild(row);
    });
    wrapper.classList.remove('hidden');
  }

  resetScenario() {
    if (!this.originalScenario && !this.bestScenarioBaseline && !this.currentScenario) return;
    
    // Reset user interaction flag so Impact Preview mirrors Best Scenario exactly
    this._userAdjusted = false;
    
    // Build a safe scenario using original metrics and existing assignments (if any)
    const orig = this.originalScenario?.metrics || this.bestScenarioBaseline || {};
    const existingAssignments = Array.isArray(this.currentScenario?.scenario?.assignments)
      ? this.currentScenario.scenario.assignments
      : (Array.isArray(this.originalScenario?.scenario?.assignments) ? this.originalScenario.scenario.assignments : []);
    const restored = {
      scenario: { assignments: existingAssignments || [] },
      metrics: {
        total_time_days: Number(orig.total_time_days || orig.total_duration_days || 0),
        total_cost: Number(orig.total_cost || 0),
        quality_score: Number(orig.quality_score || 0),
        resource_utilization: Number(orig.resource_utilization || 0.85),
      }
    };
    this.currentScenario = restored;
    
    // Reset ALL inputs to defaults FIRST
    // 1. Reset preferences to defaults
    const timePri = this.q('#timePriority'), costPri = this.q('#costPriority'), qualPri = this.q('#qualityPriority');
    if (timePri) { timePri.value = 33; this.q('#timeValue').textContent = '33%'; }
    if (costPri) { costPri.value = 33; this.q('#costValue').textContent = '33%'; }
    if (qualPri) { qualPri.value = 34; this.q('#qualityValue').textContent = '34%'; }
    
    // 2. Reset resource constraints to original values
    if (this.projectData) {
      this.projectData.resources.forEach(r => {
        const rate = this.q(`#rateSlider-${r.id}`), hrs = this.q(`#hoursSlider-${r.id}`);
        if (rate) rate.value = r.hourly_rate;
        if (hrs) hrs.value = r.max_hours_per_day;
        const rateLabel = this.q(`#rate-${r.id}`), hrsLabel = this.q(`#hours-${r.id}`);
        if (rateLabel) rateLabel.textContent = r.hourly_rate;
        if (hrsLabel) hrsLabel.textContent = r.max_hours_per_day;
      });
      
      // 3. Reset task constraints to original values
      this.projectData.tasks.forEach(t => {
        const dur = this.q(`#durationSlider-${t.id}`), pri = this.q(`#prioritySlider-${t.id}`), par = this.q(`#parallel-${t.id}`);
        if (dur) { dur.value = t.duration_hours * 60; const lbl = this.q(`#duration-${t.id}`); if (lbl) lbl.textContent = t.duration_hours * 60; }
        if (pri) { pri.value = 3; const plbl = this.q(`#priority-${t.id}`); if (plbl) plbl.textContent = 'Normal'; }
        if (par) par.checked = false;
      });
    }
    
    // Hide preference allocation table if visible
    const prefTable = this.q('#preferenceAllocationTable');
    if (prefTable) prefTable.classList.add('hidden');
    
    // Update displays AFTER resetting inputs
    this.displayBestScenario(restored);
    this.updateImpactPreviewFromScenario(restored.metrics);
    
    // Rebuild comparison table with both sides equal to Best Scenario baseline
    const tbody = this.q('#comparisonBody');
    const wrapper = this.q('#comparisonTable');
    if (tbody && wrapper && this.bestScenarioBaseline) {
      tbody.innerHTML = '';
      
      // Calculate baseline values from actual assignments (same as Best Scenario display)
      let baselineHours = 0;
      let baselineCost = 0;
      const assignments = Array.isArray(this.currentScenario?.scenario?.assignments) ? this.currentScenario.scenario.assignments : [];
      const tasksArr = Array.isArray(this.projectData?.tasks) ? this.projectData.tasks : [];
      const resourcesArr = Array.isArray(this.projectData?.resources) ? this.projectData.resources : [];
      
      assignments.forEach(assignment => {
        const resource = resourcesArr.find(r => r.id === assignment.resource_id) || {
          id: assignment.resource_id,
          name: this.resourceNames?.[assignment.resource_id] || assignment.resource_id,
          hourly_rate: 85
        };
        const hours = Number(assignment?.hours_allocated || 0);
        const cost = hours * Number(resource.hourly_rate || 85);
        baselineHours += hours;
        baselineCost += cost;
      });
      
      const baselineMinutes = baselineHours * 60;
      const baselineQualityPct = Number(this.bestScenarioBaseline.quality_score || 0) * 100;
      const baselineUtilPct = Number(this.bestScenarioBaseline.resource_utilization || 0) * 100;
      
      const metrics = [
        { label: 'Duration (minutes)', original: baselineMinutes, current: baselineMinutes },
        { label: 'Total Cost', original: baselineCost, current: baselineCost },
        { label: 'Quality Score', original: baselineQualityPct, current: baselineQualityPct },
        { label: 'Resource Utilization', original: baselineUtilPct, current: baselineUtilPct },
      ];
      
      metrics.forEach(m => {
        const diff = 0;
        const pct = '0.0';
        const row = document.createElement('div');
        row.className = 'roles-table-row';
        row.style.gridTemplateColumns = '2fr 1fr 1fr 1fr';
        row.innerHTML = `
          <div class="cell">${m.label}</div>
          <div class="cell">${m.label.includes('Cost') ? '$' : ''}${(m.label.includes('Duration') ? m.original.toFixed(0) : m.original.toFixed(1))}${m.label.includes('Score') || m.label.includes('Utilization') ? '%' : ''}</div>
          <div class="cell">${m.label.includes('Cost') ? '$' : ''}${(m.label.includes('Duration') ? m.current.toFixed(0) : m.current.toFixed(1))}${m.label.includes('Score') || m.label.includes('Utilization') ? '%' : ''}</div>
          <div class="cell difference-positive">+0.0 (0.0%)</div>`;
        tbody.appendChild(row);
      });
      wrapper.classList.remove('hidden');
    }
  }
}

const WhatIfAnalysisPage = () => {
  const containerRef = React.useRef(null);
  const [showMinTasksModal, setShowMinTasksModal] = React.useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const dashboard = new WhatIfDashboard(containerRef.current, { openMinTasks: () => setShowMinTasksModal(true) });
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

        <FormModal
          open={showMinTasksModal}
          title="Not enough tasks"
          onCancel={() => setShowMinTasksModal(false)}
          footer={(<button type="button" className="primary-btn" onClick={() => setShowMinTasksModal(false)}>OK</button>)}
        >
          <div style={{ fontSize: 14, color: '#334155' }}>
            At least 2 tasks are required in a process to run optimization. Please add more tasks and try again.
          </div>
        </FormModal>
      </div>

      <div className="page-content whatif">
        <div className="role-card">
          <div className="section-title">Select Process</div>
          <div className="form-grid">
            <div className="form-group">
              <label>Process</label>
              <input id="processDropdown" list="processOptions" placeholder="Search and select a process..." className="input" />
              <datalist id="processOptions"></datalist>
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
              <div className="form-actions" style={{ marginTop: 8 }}>
                <div className="sliders-row">
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
              </div>
            </div>
          </div>
        </div>

        {/* Impact Preview outside of tabs */}
        <div className="impact-display hidden" id="impactPreviewSection">
          <div className="impact-item"><span>Estimated Duration:</span><span id="impactDuration" className="impact-value">-</span></div>
          <div className="impact-item"><span>Estimated Cost:</span><span id="impactCost" className="impact-value">-</span></div>
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
