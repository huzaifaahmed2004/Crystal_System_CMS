class WhatIfDashboard {
    constructor() {
        this.apiBaseUrl = 'http://localhost:8002';
        this.originalScenario = null;
        this.currentScenario = null;
        this.projectData = null;
        this.constraints = null;
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Process selection
        document.getElementById('processDropdown').addEventListener('change', this.onProcessSelect.bind(this));
        document.getElementById('optimizeBtn').addEventListener('click', this.optimizeProcess.bind(this));
        
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', this.switchTab.bind(this));
        });
        
        // Priority sliders
        ['timePriority', 'costPriority', 'qualityPriority'].forEach(id => {
            document.getElementById(id).addEventListener('input', this.updatePriorities.bind(this));
        });
        
        // Update scenario
        document.getElementById('updateScenarioBtn').addEventListener('click', this.updateScenario.bind(this));
        
        // Comparison controls
        document.getElementById('enableComparisonBtn').addEventListener('click', this.enableComparison.bind(this));
        document.getElementById('resetScenarioBtn').addEventListener('click', this.resetScenario.bind(this));
    }

    onProcessSelect(event) {
        const processValue = event.target.value;
        const optimizeBtn = document.getElementById('optimizeBtn');
        
        if (processValue) {
            optimizeBtn.disabled = false;
        } else {
            optimizeBtn.disabled = true;
        }
    }

    async optimizeProcess() {
        const processName = document.getElementById('processDropdown').value;
        if (!processName) return;

        // Show loading
        document.getElementById('loadingSpinner').classList.remove('hidden');
        document.getElementById('optimizeBtn').disabled = true;

        try {
            // Call API to optimize process
            const response = await fetch(`${this.apiBaseUrl}/optimize/${processName}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            // Store data
            this.originalScenario = result.best_scenario;
            this.currentScenario = { ...result.best_scenario };
            this.projectData = result.project_data;
            this.constraints = result.constraints;

            // Display results
            this.displayBestScenario(result.best_scenario);
            this.setupConstraintControls();
            
            // Show sections
            document.getElementById('bestScenario').classList.remove('hidden');
            document.getElementById('constraintAdjustment').classList.remove('hidden');
            document.getElementById('comparisonSection').classList.remove('hidden');

        } catch (error) {
            console.error('Error optimizing process:', error);
            alert('Error optimizing process. Please try again.');
        } finally {
            // Hide loading
            document.getElementById('loadingSpinner').classList.add('hidden');
            document.getElementById('optimizeBtn').disabled = false;
        }
    }

    displayBestScenario(scenario) {
        // Update metrics
        document.getElementById('scenarioDuration').textContent = scenario.metrics.total_time_days.toFixed(1);
        document.getElementById('scenarioCost').textContent = `$${scenario.metrics.total_cost.toLocaleString()}`;
        document.getElementById('scenarioQuality').textContent = `${(scenario.metrics.quality_score * 100).toFixed(1)}`;

        // Update allocation table
        const tbody = document.getElementById('allocationBody');
        tbody.innerHTML = '';

        let totalHours = 0;
        let totalCost = 0;

        scenario.scenario.assignments.forEach(assignment => {
            const task = this.projectData.tasks.find(t => t.id === assignment.task_id);
            const resource = this.projectData.resources.find(r => r.id === assignment.resource_id);
            
            const hours = assignment.hours_allocated;
            const cost = hours * resource.hourly_rate;
            totalHours += hours;
            totalCost += cost;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${task.name}</td>
                <td>${resource.name}</td>
                <td>${hours.toFixed(1)}</td>
                <td>$${cost.toLocaleString()}</td>
                <td>Day ${(assignment.start_time / 8).toFixed(1)}</td>
            `;
            tbody.appendChild(row);
        });

        // Add total row
        const totalRow = document.createElement('tr');
        totalRow.style.fontWeight = 'bold';
        totalRow.style.borderTop = '2px solid #667eea';
        totalRow.innerHTML = `
            <td>TOTAL</td>
            <td>-</td>
            <td>${totalHours.toFixed(1)}</td>
            <td>$${totalCost.toLocaleString()}</td>
            <td>${(totalHours / 8).toFixed(1)} days</td>
        `;
        tbody.appendChild(totalRow);
    }

    setupConstraintControls() {
        this.setupResourceControls();
        this.setupTaskControls();
    }

    setupResourceControls() {
        const container = document.getElementById('resourceControls');
        container.innerHTML = '';

        this.projectData.resources.forEach(resource => {
            const controlGroup = document.createElement('div');
            controlGroup.className = 'control-group';
            controlGroup.innerHTML = `
                <h4>${resource.name}</h4>
                <div class="slider-group">
                    <label>Hourly Rate: $<span id="rate-${resource.id}">${resource.hourly_rate}</span></label>
                    <input type="range" id="rateSlider-${resource.id}" 
                           min="30" max="200" value="${resource.hourly_rate}" 
                           class="slider" data-resource="${resource.id}" data-type="rate">
                </div>
                <div class="slider-group">
                    <label>Max Hours/Day: <span id="hours-${resource.id}">${resource.max_hours_per_day}</span></label>
                    <input type="range" id="hoursSlider-${resource.id}" 
                           min="4" max="12" value="${resource.max_hours_per_day}" 
                           class="slider" data-resource="${resource.id}" data-type="hours">
                </div>
                <div class="checkbox-group">
                    <label>
                        <input type="checkbox" id="available-${resource.id}" checked 
                               data-resource="${resource.id}" data-type="available">
                        Available for assignment
                    </label>
                </div>
            `;
            container.appendChild(controlGroup);

            // Add event listeners
            controlGroup.querySelector(`#rateSlider-${resource.id}`).addEventListener('input', this.onConstraintChange.bind(this));
            controlGroup.querySelector(`#hoursSlider-${resource.id}`).addEventListener('input', this.onConstraintChange.bind(this));
            controlGroup.querySelector(`#available-${resource.id}`).addEventListener('change', this.onConstraintChange.bind(this));
        });
    }

    setupTaskControls() {
        const container = document.getElementById('taskControls');
        container.innerHTML = '';

        this.projectData.tasks.forEach(task => {
            const controlGroup = document.createElement('div');
            controlGroup.className = 'control-group';
            controlGroup.innerHTML = `
                <h4>${task.name}</h4>
                <div class="slider-group">
                    <label>Duration (Hours): <span id="duration-${task.id}">${task.duration_hours}</span></label>
                    <input type="range" id="durationSlider-${task.id}" 
                           min="5" max="100" value="${task.duration_hours}" 
                           class="slider" data-task="${task.id}" data-type="duration">
                </div>
                <div class="slider-group">
                    <label>Priority: <span id="priority-${task.id}">Normal</span></label>
                    <input type="range" id="prioritySlider-${task.id}" 
                           min="1" max="5" value="3" 
                           class="slider" data-task="${task.id}" data-type="priority">
                </div>
                <div class="checkbox-group">
                    <label>
                        <input type="checkbox" id="parallel-${task.id}" 
                               data-task="${task.id}" data-type="parallel">
                        Allow parallel execution
                    </label>
                </div>
            `;
            container.appendChild(controlGroup);

            // Add event listeners
            controlGroup.querySelector(`#durationSlider-${task.id}`).addEventListener('input', this.onConstraintChange.bind(this));
            controlGroup.querySelector(`#prioritySlider-${task.id}`).addEventListener('input', this.onConstraintChange.bind(this));
            controlGroup.querySelector(`#parallel-${task.id}`).addEventListener('change', this.onConstraintChange.bind(this));
        });
    }

    onConstraintChange(event) {
        const element = event.target;
        const value = element.type === 'checkbox' ? element.checked : element.value;
        
        // Update display values
        if (element.dataset.type === 'rate') {
            document.getElementById(`rate-${element.dataset.resource}`).textContent = value;
        } else if (element.dataset.type === 'hours') {
            document.getElementById(`hours-${element.dataset.resource}`).textContent = value;
        } else if (element.dataset.type === 'duration') {
            document.getElementById(`duration-${element.dataset.task}`).textContent = value;
        } else if (element.dataset.type === 'priority') {
            const priorities = ['Very Low', 'Low', 'Normal', 'High', 'Critical'];
            document.getElementById(`priority-${element.dataset.task}`).textContent = priorities[value - 1];
        }

        // Update impact preview
        this.updateImpactPreview();
    }

    updatePriorities() {
        const time = document.getElementById('timePriority').value;
        const cost = document.getElementById('costPriority').value;
        const quality = document.getElementById('qualityPriority').value;
        
        // Normalize to 100%
        const total = parseInt(time) + parseInt(cost) + parseInt(quality);
        if (total !== 100) {
            const diff = 100 - total;
            const newQuality = Math.max(0, parseInt(quality) + diff);
            document.getElementById('qualityPriority').value = newQuality;
        }
        
        // Update displays
        document.getElementById('timeValue').textContent = `${time}%`;
        document.getElementById('costValue').textContent = `${cost}%`;
        document.getElementById('qualityValue').textContent = `${document.getElementById('qualityPriority').value}%`;
        
        this.updateImpactPreview();
    }

    updateImpactPreview() {
        // If we have a current scenario, show its actual metrics
        if (this.currentScenario && this.currentScenario.metrics) {
            this.updateImpactPreviewFromScenario(this.currentScenario.metrics);
            return;
        }
        
        // Otherwise, calculate estimated impact based on constraint changes
        let estimatedDuration = this.originalScenario.metrics.total_time_days;
        let estimatedCost = this.originalScenario.metrics.total_cost;

        // Apply resource rate changes
        this.projectData.resources.forEach(resource => {
            const rateSlider = document.getElementById(`rateSlider-${resource.id}`);
            const hoursSlider = document.getElementById(`hoursSlider-${resource.id}`);
            
            if (rateSlider && hoursSlider) {
                const rateMultiplier = rateSlider.value / resource.hourly_rate;
                const hoursMultiplier = hoursSlider.value / resource.max_hours_per_day;
                estimatedCost *= rateMultiplier;
                estimatedDuration *= (1 / hoursMultiplier); // More hours = less duration
            }
        });

        // Apply task duration changes
        this.projectData.tasks.forEach(task => {
            const durationSlider = document.getElementById(`durationSlider-${task.id}`);
            if (durationSlider) {
                const durationMultiplier = durationSlider.value / task.duration_hours;
                estimatedDuration *= durationMultiplier;
            }
        });

        // Update display
        document.getElementById('impactDuration').textContent = `${estimatedDuration.toFixed(1)} days`;
        document.getElementById('impactCost').textContent = `$${estimatedCost.toLocaleString()}`;
    }
    
    updateImpactPreviewFromScenario(metrics) {
        // Update impact preview with actual scenario metrics
        document.getElementById('impactDuration').textContent = `${metrics.total_time_days.toFixed(1)} days`;
        document.getElementById('impactCost').textContent = `$${metrics.total_cost.toLocaleString()}`;
    }

    updatePriorities() {
        const time = document.getElementById('timePriority').value;
        const cost = document.getElementById('costPriority').value;
        const quality = document.getElementById('qualityPriority').value;
        
        // Normalize to 100%
        const total = parseInt(time) + parseInt(cost) + parseInt(quality);
        if (total !== 100) {
            const diff = 100 - total;
            const newQuality = Math.max(0, parseInt(quality) + diff);
            document.getElementById('qualityPriority').value = newQuality;
        }
        
        // Update displays
        document.getElementById('timeValue').textContent = `${time}%`;
        document.getElementById('costValue').textContent = `${cost}%`;
        document.getElementById('qualityValue').textContent = `${document.getElementById('qualityPriority').value}%`;
        
        this.updateImpactPreview();
    }

    async updateScenario() {
        // Collect current constraint values
        const updatedConstraints = this.collectConstraints();
        
        try {
            // Call API to re-optimize with new constraints
            const response = await fetch(`${this.apiBaseUrl}/optimize/custom`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    process_name: document.getElementById('processDropdown').value,
                    constraints: updatedConstraints
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            this.currentScenario = result.scenario;
            
            // Update display - adapt the response structure to match what displayBestScenario expects
            const adaptedResult = {
                scenario: result.scenario.scenario,
                metrics: result.scenario.metrics
            };
            this.displayBestScenario(adaptedResult);
            
            // Update impact preview to match the actual scenario metrics
            this.updateImpactPreviewFromScenario(result.scenario.metrics);
            
        } catch (error) {
            console.error('Error updating scenario:', error);
            alert('Error updating scenario. Please try again.');
        }
    }

    collectConstraints() {
        const constraints = {
            resources: {},
            tasks: {},
            preferences: {
                time_priority: parseInt(document.getElementById('timePriority').value) / 100,
                cost_priority: parseInt(document.getElementById('costPriority').value) / 100,
                quality_priority: parseInt(document.getElementById('qualityPriority').value) / 100
            }
        };

        // Collect resource constraints
        this.projectData.resources.forEach(resource => {
            constraints.resources[resource.id] = {
                hourly_rate: parseFloat(document.getElementById(`rateSlider-${resource.id}`).value),
                max_hours_per_day: parseFloat(document.getElementById(`hoursSlider-${resource.id}`).value),
                available: document.getElementById(`available-${resource.id}`).checked
            };
        });

        // Collect task constraints
        this.projectData.tasks.forEach(task => {
            constraints.tasks[task.id] = {
                duration_hours: parseFloat(document.getElementById(`durationSlider-${task.id}`).value),
                priority: parseInt(document.getElementById(`prioritySlider-${task.id}`).value),
                allow_parallel: document.getElementById(`parallel-${task.id}`).checked
            };
        });

        return constraints;
    }

    switchTab(event) {
        const targetTab = event.target.dataset.tab;
        
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(`${targetTab}Tab`).classList.add('active');
    }

    enableComparison() {
        if (!this.originalScenario || !this.currentScenario) return;

        const comparisonTable = document.getElementById('comparisonTable');
        const tbody = document.getElementById('comparisonBody');
        
        tbody.innerHTML = '';

        // Compare metrics
        const metrics = [
            { label: 'Duration (days)', original: this.originalScenario.metrics.total_time_days, current: this.currentScenario.metrics.total_time_days },
            { label: 'Total Cost', original: this.originalScenario.metrics.total_cost, current: this.currentScenario.metrics.total_cost },
            { label: 'Quality Score', original: this.originalScenario.metrics.quality_score * 100, current: this.currentScenario.metrics.quality_score * 100 },
            { label: 'Resource Utilization', original: this.originalScenario.metrics.resource_utilization * 100, current: this.currentScenario.metrics.resource_utilization * 100 }
        ];

        metrics.forEach(metric => {
            const difference = metric.current - metric.original;
            const percentChange = ((difference / metric.original) * 100).toFixed(1);
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${metric.label}</td>
                <td>${metric.label.includes('Cost') ? '$' : ''}${metric.original.toFixed(1)}${metric.label.includes('Score') || metric.label.includes('Utilization') ? '%' : ''}</td>
                <td>${metric.label.includes('Cost') ? '$' : ''}${metric.current.toFixed(1)}${metric.label.includes('Score') || metric.label.includes('Utilization') ? '%' : ''}</td>
                <td class="${difference >= 0 ? 'difference-positive' : 'difference-negative'}">
                    ${difference >= 0 ? '+' : ''}${difference.toFixed(1)} (${percentChange}%)
                </td>
            `;
            tbody.appendChild(row);
        });

        comparisonTable.classList.remove('hidden');
    }

    resetScenario() {
        if (!this.originalScenario) return;
        
        this.currentScenario = { ...this.originalScenario };
        this.displayBestScenario(this.originalScenario);
        
        // Reset all controls to original values
        this.projectData.resources.forEach(resource => {
            document.getElementById(`rateSlider-${resource.id}`).value = resource.hourly_rate;
            document.getElementById(`hoursSlider-${resource.id}`).value = resource.max_hours_per_day;
            document.getElementById(`available-${resource.id}`).checked = true;
            document.getElementById(`rate-${resource.id}`).textContent = resource.hourly_rate;
            document.getElementById(`hours-${resource.id}`).textContent = resource.max_hours_per_day;
        });

        this.projectData.tasks.forEach(task => {
            document.getElementById(`durationSlider-${task.id}`).value = task.duration_hours;
            document.getElementById(`prioritySlider-${task.id}`).value = 3;
            document.getElementById(`parallel-${task.id}`).checked = false;
            document.getElementById(`duration-${task.id}`).textContent = task.duration_hours;
            document.getElementById(`priority-${task.id}`).textContent = 'Normal';
        });

        // Reset priorities
        document.getElementById('timePriority').value = 33;
        document.getElementById('costPriority').value = 33;
        document.getElementById('qualityPriority').value = 34;
        this.updatePriorities();

        // Hide comparison
        document.getElementById('comparisonTable').classList.add('hidden');
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    new WhatIfDashboard();
});
