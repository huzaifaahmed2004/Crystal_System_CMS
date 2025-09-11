import React, { useEffect } from 'react';
import '../styles/what-if-analysis.css';
import { optimizeProcess as svcOptimizeProcess } from '../services/whatIfService';
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
    this.processLabelToId = new Map();
    // Guards for dev StrictMode double-invocation
    this._mounted = false;
    this._processesLoading = false;
    this._processesLoaded = false;
  }

  mount() {
    // Prevent duplicate mounts (React StrictMode in dev may invoke effects twice)
    if (this.root?.dataset?.wifMounted === '1') return;
    this.root.dataset.wifMounted = '1';

    // bind listeners within root scope
    this.q('#processDropdown')?.addEventListener('input', this.onProcessSelect.bind(this));
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
    const hours = (Number(scenario.metrics.total_time_days || 0) * 8).toFixed(1);
    this.q('#scenarioDuration').textContent = hours;
    this.q('#scenarioCost').textContent = `$${scenario.metrics.total_cost.toLocaleString()}`;
    this.q('#scenarioQuality').textContent = `${(scenario.metrics.quality_score * 100).toFixed(1)}`;

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
      const originalHours = resource.max_hours_per_day || 8;
      const newHours = hoursSlider ? parseFloat(hoursSlider.value) : originalHours;
      totalOriginalHours += originalHours;
      totalNewHours += newHours;
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
      if (rateSlider) {
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
    
    // === APPLY PREFERENCES (heuristic) ===
    // Interpret sliders as weights that tilt the tradeoff between time and cost
    // Sum is maintained near 1 in updatePriorities(), but we normalize defensively
    let pTime = Number(this.q('#timePriority')?.value || 33) / 100;
    let pCost = Number(this.q('#costPriority')?.value || 33) / 100;
    let pQual = Number(this.q('#qualityPriority')?.value || 34) / 100;
    const pSum = pTime + pCost + pQual;
    if (pSum > 0) { pTime /= pSum; pCost /= pSum; pQual /= pSum; }
    
    // Time vs Cost tilt: more time priority reduces duration but may increase cost; more cost priority does the opposite.
    const tilt = pTime - pCost; // [-1..1]
    const timeAdj = 1 - 0.2 * tilt; // up to -20% duration for max time priority
    const costAdj = 1 + 0.2 * tilt; // up to +20% cost for max time priority
    
    // Quality tends to increase both time and cost a bit
    const qualTimeAdj = 1 + 0.05 * pQual;  // up to +5%
    const qualCostAdj = 1 + 0.10 * pQual;  // up to +10%
    
    // Apply adjustments with lower bound protection
    estimatedDurationMinutes = Math.max(1, estimatedDurationMinutes * timeAdj * qualTimeAdj);
    estimatedCost = Math.max(0, estimatedCost * costAdj * qualCostAdj);
    
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
    // Convert days to minutes for consistency with updateImpactPreview() output
    const durationMinutes = (metrics.total_time_days * 8 * 60); // 8 hours/day * 60 min/hour
    this.q('#impactDuration').textContent = `${Math.round(durationMinutes)} minutes`;
    this.q('#impactCost').textContent = `$${Math.round(metrics.total_cost).toLocaleString()}`;
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

    const metrics = [
      { label: 'Duration (minutes)', original: this.bestScenarioBaseline.total_time_days * 8 * 60, current: Number.isFinite(currentDurationMinutes) ? currentDurationMinutes : this.bestScenarioBaseline.total_time_days * 8 * 60 },
      { label: 'Total Cost', original: this.bestScenarioBaseline.total_cost, current: Number.isFinite(currentCost) ? currentCost : this.bestScenarioBaseline.total_cost },
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
    this.displayBestScenario(restored);
    this.updateImpactPreviewFromScenario(restored.metrics);
    // Update Impact Preview to reflect the reset baseline (recalculate with default constraints)
    this.updateImpactPreview();
    // Reset ALL inputs to defaults
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
    // Rebuild comparison table with both sides equal to original
    const tbody = this.q('#comparisonBody');
    const wrapper = this.q('#comparisonTable');
    if (tbody && wrapper && this.bestScenarioBaseline) {
      tbody.innerHTML = '';
      const baselineMinutes = Number(this.bestScenarioBaseline.total_time_days || 0) * 8 * 60;
      const baselineCost = Number(this.bestScenarioBaseline.total_cost || 0);
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
