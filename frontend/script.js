// Script updated: 2025-09-08 04:11:00 - Force reload
console.log('JavaScript file loaded at:', new Date().toISOString());
console.log('Cache buster active - file should be fresh');
class WhatIfDashboard {
    constructor() {
        console.log('WhatIfDashboard constructor called - script loaded successfully');
        this.apiBaseUrl = 'http://localhost:8002';
        this.cmsApiBaseUrl = 'https://server-digitaltwin-enterprise-production.up.railway.app';
        this.accessToken = null;
        this.originalScenario = null;
        this.currentScenario = null;
        this.impactPreviewScenario = null; // Separate scenario for Impact Preview
        this.projectData = null;
        this.constraints = null;
        
        this.initializeEventListeners();
        this.authenticateAndLoadProcesses();
    }

    initializeEventListeners() {
        // Process selection
        document.getElementById('processDropdown').addEventListener('change', this.onProcessSelect.bind(this));
        document.getElementById('optimizeBtn').addEventListener('click', this.optimizeProcess.bind(this));
        
        // Search functionality
        document.getElementById('processSearch').addEventListener('input', this.filterProcesses.bind(this));
        
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

    async authenticateAndLoadProcesses() {
        console.log('Starting CMS authentication...');
        try {
            // Authenticate with CMS
            console.log('Attempting to authenticate with CMS API...');
            const authResponse = await fetch(`${this.cmsApiBaseUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: 'superadmin@example.com',
                    password: 'ChangeMe123!'
                })
            });
            
            console.log('Auth response status:', authResponse.status);
            
            if (authResponse.ok) {
                const authData = await authResponse.json();
                console.log('Authentication successful, token received');
                this.accessToken = authData.access_token;
                await this.loadCMSProcesses();
            } else {
                console.error('Authentication failed with status:', authResponse.status);
                this.loadFallbackProcesses();
            }
        } catch (error) {
            console.error('CORS or network error during authentication:', error);
            console.log('Falling back to local processes due to CORS/network issue');
            this.loadFallbackProcesses();
        }
    }
    
    async loadCMSProcesses() {
        console.log('Loading CMS processes...');
        try {
            const response = await fetch(`${this.cmsApiBaseUrl}/process/with-relations`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });
            
            console.log('Processes response status:', response.status);
            
            if (response.ok) {
                const processes = await response.json();
                console.log('Loaded', processes.length, 'processes from CMS');
                this.populateProcessDropdown(processes);
            } else {
                console.error('Failed to load processes with status:', response.status);
                this.loadFallbackProcesses();
            }
        } catch (error) {
            console.error('CORS or network error loading processes:', error);
            this.loadFallbackProcesses();
        }
    }
    
    loadFallbackProcesses() {
        console.log('Loading fallback processes due to CMS API unavailability');
        // Fallback to local processes if CMS API fails
        const fallbackProcesses = [
            { process_id: 'hospital_project', process_name: 'Hospital Patient Flow Optimization', company: { name: 'Local' } },
            { process_id: 'software_project', process_name: 'Software Development Project', company: { name: 'Local' } },
            { process_id: 'manufacturing_project', process_name: 'Manufacturing Process', company: { name: 'Local' } },
            { process_id: 'cms_ecommerce_project', process_name: 'CMS E-Commerce Platform Development', company: { name: 'Local' } }
        ];
        this.populateProcessDropdown(fallbackProcesses);
    }
    
    populateProcessDropdown(processes) {
        console.log('Populating dropdown with', processes.length, 'processes');
        const dropdown = document.getElementById('processDropdown');
        const searchInput = document.getElementById('processSearch');
        
        // Clear existing options except the first one
        dropdown.innerHTML = '<option value="">Select a process to optimize...</option>';
        
        processes.forEach(process => {
            const option = document.createElement('option');
            option.value = process.process_id || process.id;
            option.textContent = `${process.process_name || process.name} (${process.company?.name || 'Unknown'})`;
            
            // Only add process data for CMS processes (not local fallback)
            if (process.process_tasks !== undefined) {
                option.dataset.processData = JSON.stringify(process);
            }
            
            dropdown.appendChild(option);
            console.log('Added process:', option.textContent);
        });
        
        // Store all processes for search functionality
        this.allProcesses = processes;
        
        // Show search input
        if (searchInput) {
            searchInput.style.display = 'block';
        }
        
        console.log('Dropdown populated successfully');
    }
    
    filterProcesses(event) {
        const searchTerm = event.target.value.toLowerCase();
        const dropdown = document.getElementById('processDropdown');
        const options = dropdown.querySelectorAll('option');
        
        options.forEach((option, index) => {
            if (index === 0) return; // Skip the first "Select..." option
            
            const text = option.textContent.toLowerCase();
            if (text.includes(searchTerm)) {
                option.style.display = 'block';
            } else {
                option.style.display = 'none';
            }
        });
    }
    
    async optimizeProcess() {
        const processDropdown = document.getElementById('processDropdown');
        const selectedOption = processDropdown.options[processDropdown.selectedIndex];
        
        if (!selectedOption.value) return;

        // Show loading
        document.getElementById('loadingSpinner').classList.remove('hidden');
        document.getElementById('optimizeBtn').disabled = true;
        
        try {
            let response;
            
            // Check if this is a CMS process (has process_data)
            if (selectedOption.dataset.processData) {
                const processData = JSON.parse(selectedOption.dataset.processData);
                
                // Use CMS endpoint with process ID for live CMS data
                const processId = processData.process_id || processData.id || selectedOption.value;
                console.log('Making CMS API call to:', `${this.apiBaseUrl}/optimize/cms-process/${processId}`);
                console.log('Process data:', processData);
                
                response = await fetch(`${this.apiBaseUrl}/optimize/cms-process/${processId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
            } else {
                // Use standard endpoint for local processes
                response = await fetch(`${this.apiBaseUrl}/optimize/${selectedOption.value}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({})
                });
            }
            
            console.log('API Response status:', response.status);
            console.log('API Response ok:', response.ok);
            
            if (response.ok) {
                const responseText = await response.text();
                console.log('Raw response text:', responseText);
                
                let result;
                try {
                    result = JSON.parse(responseText);
                    console.log('Parsed API Response data:', result);
                } catch (parseError) {
                    console.error('JSON parse error:', parseError);
                    alert('Invalid JSON response from server');
                    return;
                }
                
                // Handle different response formats
                if (result.scenarios) {
                    // CMS response format
                    console.log('Processing CMS response format');
                    this.displayCMSScenarios(result);
                } else if (result.best_scenario) {
                    // Standard response format
                    console.log('Processing standard response format');
                    this.displayScenario(result.best_scenario);
                    this.originalScenario = result.best_scenario;
                    this.currentScenario = result.best_scenario;
                } else {
                    console.error('Unexpected response format:', result);
                    alert('Unexpected response format from server.');
                }
            } else {
                const errorText = await response.text();
                console.error('API Error:', response.status, errorText);
                alert('Error optimizing process. Please try again.');
            }
        } catch (error) {
            console.error('CRITICAL ERROR in optimizeProcess:', error);
            console.error('Error type:', typeof error);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            console.error('Response object:', typeof response !== 'undefined' ? response : 'undefined');
            alert(`Error optimizing process: ${error.message}. Check console for details.`);
        } finally {
            document.getElementById('loadingSpinner').classList.add('hidden');
            document.getElementById('optimizeBtn').disabled = false;
        }
    }
    
    displayCMSScenarios(result) {
        // Display the best scenario from CMS results
        const bestScenario = result.scenarios.reduce((best, current) => {
            const bestScore = best.quality_score * 0.4 + (1 / best.total_duration_days) * 0.3 + (1 / best.total_cost) * 0.3;
            const currentScore = current.quality_score * 0.4 + (1 / current.total_duration_days) * 0.3 + (1 / current.total_cost) * 0.3;
            return currentScore > bestScore ? current : best;
        });
        
        this.displayScenario(bestScenario);
        this.originalScenario = result.baseline;
        this.currentScenario = bestScenario;
        
        // Store all scenarios for comparison
        this.allScenarios = result.scenarios;
        
        console.log('CMS Optimization Results:', result);
    }

    displayScenario(scenario) {
        console.log('displayScenario called with:', scenario);
        
        // Convert CMS scenario format to match expected format
        const formattedScenario = {
            metrics: {
                total_time_days: scenario.total_duration_days,
                total_cost: scenario.total_cost,
                quality_score: scenario.quality_score,
                resource_utilization: scenario.resource_utilization || 0.85
            },
            scenario: {
                assignments: scenario.assignments || []
            }
        };
        
        console.log('Formatted scenario:', formattedScenario);
        
        this.displayBestScenario(formattedScenario);
        
        // Show results section using the actual HTML element ID
        const bestScenario = document.getElementById('bestScenario');
        if (bestScenario) {
            bestScenario.classList.remove('hidden');
            console.log('Best scenario section shown');
        } else {
            console.error('bestScenario element not found!');
        }
        
        // Create mock project data for CMS scenarios to populate constraints
        if (!this.projectData) {
            this.createMockProjectData(scenario);
        }
        
        // Show constraint adjustment section
        const constraintAdjustment = document.getElementById('constraintAdjustment');
        if (constraintAdjustment) {
            constraintAdjustment.classList.remove('hidden');
            console.log('Constraint adjustment section shown');
            
            // Setup controls for the constraints section
            this.setupResourceControls();
            this.setupTaskControls();
            
            // Initialize impact preview with current values
            this.updateImpactPreview();
        } else {
            console.error('constraintAdjustment element not found!');
        }
        
        // Show comparison section
        const comparisonSection = document.getElementById('comparisonSection');
        if (comparisonSection) {
            comparisonSection.classList.remove('hidden');
            console.log('Comparison section shown');
        } else {
            console.error('comparisonSection element not found!');
        }
        
        console.log('Scenario displayed successfully');
    }

    createMockProjectData(scenario) {
        console.log('Creating mock project data from scenario:', scenario);
        
        // Extract unique task and resource IDs from assignments
        const taskIds = [...new Set(scenario.assignments.map(a => a.task_id))];
        const resourceIds = [...new Set(scenario.assignments.map(a => a.resource_id))];
        
        // Create mock project data
        this.projectData = {
            tasks: taskIds.map(taskId => ({
                id: taskId,
                name: `Task ${taskId.replace('task_', '')}`,
                duration_hours: scenario.assignments.find(a => a.task_id === taskId)?.hours_allocated || 1,
                priority: 3, // Normal priority
                dependencies: []
            })),
            resources: resourceIds.map(resourceId => ({
                id: resourceId,
                name: `Resource ${resourceId.replace('resource_', '')}`,
                hourly_rate: 85, // Default rate
                max_hours_per_day: 8,
                skills: []
            }))
        };
        
        // Store original scenario for What-If Analysis comparison
        this.originalScenario = {
            metrics: {
                total_time_days: scenario.metrics?.total_time_days || 0.1,
                total_cost: scenario.metrics?.total_cost || 295.65,
                quality_score: scenario.metrics?.quality_score || 0.88,
                resource_utilization: scenario.metrics?.resource_utilization || 0.75
            }
        };
        
        // Initialize Impact Preview scenario (separate from What-If Analysis)
        this.impactPreviewScenario = {
            metrics: {
                total_time_days: scenario.metrics?.total_time_days || 0.1,
                total_cost: scenario.metrics?.total_cost || 295.65,
                quality_score: scenario.metrics?.quality_score || 0.88,
                resource_utilization: scenario.metrics?.resource_utilization || 0.75
            }
        };
        console.log('Mock project data created:', this.projectData);
    }

    displayBestScenario(scenario) {
        console.log('displayBestScenario called with:', scenario);
        
        // Update metrics
        const durationEl = document.getElementById('scenarioDuration');
        const costEl = document.getElementById('scenarioCost');
        const qualityEl = document.getElementById('scenarioQuality');
        
        if (durationEl) {
            // Handle different scenario data structures
            const metrics = scenario.metrics || scenario;
            const totalTimeDays = metrics.total_time_days || metrics.total_duration_days || 0;
            const durationInHours = (totalTimeDays * 8).toFixed(1);
            durationEl.textContent = durationInHours;
            console.log('Updated duration:', durationInHours, 'hours');
        } else {
            console.error('scenarioDuration element not found!');
        }
        
        if (costEl) {
            const metrics = scenario.metrics || scenario;
            const totalCost = metrics.total_cost || 0;
            costEl.textContent = `$${totalCost.toLocaleString()}`;
            console.log('Cost updated:', totalCost);
        } else {
            console.error('scenarioCost element not found!');
        }
        
        if (qualityEl) {
            const metrics = scenario.metrics || scenario;
            const qualityScore = metrics.quality_score || 0.88;
            qualityEl.textContent = `${(qualityScore * 100).toFixed(1)}`;
            console.log('Quality updated:', qualityScore);
        } else {
            console.error('scenarioQuality element not found!');
        }

        // Update allocation table
        const tbody = document.getElementById('allocationBody');
        if (!tbody) {
            console.error('allocationBody element not found!');
            return;
        }
        tbody.innerHTML = '';
        console.log('Allocation table cleared');

        let totalHours = 0;
        let totalCost = 0;

        // Handle different scenario data structures
        const scenarioData = scenario.scenario || scenario;
        const assignments = scenarioData.assignments || [];
        
        if (!assignments || assignments.length === 0) {
            console.log('No assignments found in scenario');
            // Create mock assignment data for display
            tbody.innerHTML = '<tr><td colspan="4">No assignment data available</td></tr>';
            return;
        }

        assignments.forEach(assignment => {
            // For CMS scenarios, we don't have projectData, so create mock data
            const task = this.projectData?.tasks?.find(t => t.id === assignment.task_id) || {
                id: assignment.task_id,
                name: `Task ${assignment.task_id}`
            };
            const resource = this.projectData?.resources?.find(r => r.id === assignment.resource_id) || {
                id: assignment.resource_id,
                name: `Resource ${assignment.resource_id}`,
                hourly_rate: 85 // Default rate
            };
            
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

            // Add event listeners with immediate feedback
            const rateSlider = controlGroup.querySelector(`#rateSlider-${resource.id}`);
            const hoursSlider = controlGroup.querySelector(`#hoursSlider-${resource.id}`);
            const availableCheckbox = controlGroup.querySelector(`#available-${resource.id}`);
            
            rateSlider.addEventListener('input', (e) => {
                console.log('Rate slider changed:', e.target.value);
                document.getElementById(`rate-${resource.id}`).textContent = e.target.value;
                this.onConstraintChange(e);
            });
            
            hoursSlider.addEventListener('input', (e) => {
                console.log('Hours slider changed:', e.target.value);
                document.getElementById(`hours-${resource.id}`).textContent = e.target.value;
                this.onConstraintChange(e);
            });
            
            availableCheckbox.addEventListener('change', (e) => {
                console.log('Availability changed:', e.target.checked);
                this.onConstraintChange(e);
            });
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
            
            // Add parallel checkbox event listener with debug
            const parallelCheckbox = controlGroup.querySelector(`#parallel-${task.id}`);
            parallelCheckbox.addEventListener('change', (event) => {
                console.log(`Parallel checkbox changed for task ${task.id}:`, event.target.checked);
                this.onConstraintChange(event);
            });
        });
    }

    onConstraintChange(event) {
        const element = event.target;
        const value = element.type === 'checkbox' ? element.checked : element.value;
        
        console.log(`=== CONSTRAINT CHANGE DETECTED ===`);
        console.log(`Type: ${element.dataset.type}, Value: ${value}`);
        console.log(`Resource ID: ${element.dataset.resource || 'N/A'}`);
        console.log(`Task ID: ${element.dataset.task || 'N/A'}`);
        
        // Update display values (already handled in event listeners above)
        
        // Always update impact preview when constraints change
        console.log('>>> Calling updateImpactPreview from onConstraintChange <<<');
        this.updateImpactPreview();
        console.log('=== CONSTRAINT CHANGE PROCESSING COMPLETE ===');
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
        
        // Always update impact preview when priorities change
        this.updateImpactPreview();
    }

    updateImpactPreview() {
        console.log(' === updateImpactPreview called ===');
        
        // Check if we have the required data
        if (!this.impactPreviewScenario || !this.projectData) {
            console.log(' Missing required data - impactPreviewScenario:', !!this.impactPreviewScenario, 'projectData:', !!this.projectData);
            
            // Force update with static values if data is missing
            const durationEl = document.getElementById('impactDuration');
            const costEl = document.getElementById('impactCost');
            if (durationEl) durationEl.textContent = '2.5 hours';
            if (costEl) costEl.textContent = '$296';
            return;
        }
        
        // Check if impactPreviewScenario has metrics (they might be direct properties)
        const hasNestedMetrics = this.impactPreviewScenario.metrics;
        const hasDirectMetrics = this.impactPreviewScenario.total_duration_days || this.impactPreviewScenario.total_cost;
        
        if (!hasNestedMetrics && !hasDirectMetrics) {
            console.log('❌ impactPreviewScenario missing both nested and direct metrics:', this.impactPreviewScenario);
            return;
        }
        
        console.log('✅ All required data available, proceeding with calculations...');
        console.log('Metrics structure - nested:', !!hasNestedMetrics, 'direct:', !!hasDirectMetrics);
        
        // Calculate estimated impact based on constraint changes
        let estimatedDuration = hasNestedMetrics ? 
            this.impactPreviewScenario.metrics.total_time_days : 
            this.impactPreviewScenario.total_duration_days;
        let estimatedCost = hasNestedMetrics ? 
            this.impactPreviewScenario.metrics.total_cost : 
            this.impactPreviewScenario.total_cost;
        
        console.log('Original duration:', estimatedDuration, 'days');
        console.log('Original cost:', estimatedCost);
        
        // Calculate cost impact from resource rate changes
        let impactCostMultiplier = 1.0;
        let impactDurationMultiplier = 1.0;
        
        this.projectData.resources.forEach(resource => {
            const rateSlider = document.getElementById(`rateSlider-${resource.id}`);
            const hoursSlider = document.getElementById(`hoursSlider-${resource.id}`);
            
            if (rateSlider) {
                const newRate = parseFloat(rateSlider.value);
                const originalRate = resource.hourly_rate;
                const rateChange = newRate / originalRate;
                
                // Apply proportional cost change
                impactCostMultiplier *= rateChange;
                console.log(`Resource ${resource.id}: rate ${originalRate} -> ${newRate} (${rateChange.toFixed(2)}x)`);
            }
            
            if (hoursSlider) {
                const newHours = parseFloat(hoursSlider.value);
                const originalHours = resource.max_hours_per_day;
                const hoursChange = newHours / originalHours;
                
                // More hours per day = potentially shorter duration
                impactDurationMultiplier *= (1 / hoursChange);
                console.log(`Resource ${resource.id}: hours ${originalHours} -> ${newHours} (duration factor: ${(1/hoursChange).toFixed(2)}x)`);
            }
        });
        
        estimatedCost = (hasNestedMetrics ? 
            this.impactPreviewScenario.metrics.total_cost : 
            this.impactPreviewScenario.total_cost) * impactCostMultiplier;
        estimatedDuration = (hasNestedMetrics ? 
            this.impactPreviewScenario.metrics.total_time_days : 
            this.impactPreviewScenario.total_duration_days) * impactDurationMultiplier;
        
        console.log('Cost multiplier:', impactCostMultiplier.toFixed(2), 'Duration multiplier:', impactDurationMultiplier.toFixed(2));
        console.log('New cost:', estimatedCost.toFixed(2), 'New duration:', estimatedDuration.toFixed(2));

        // Update display immediately with basic calculations
        const impactDurationElement = document.getElementById('impactDuration');
        const impactCostElement = document.getElementById('impactCost');
        
        console.log('Looking for impact elements...');
        console.log('Duration element found:', !!impactDurationElement);
        console.log('Cost element found:', !!impactCostElement);
        
        if (impactDurationElement) {
            const durationInHours = (estimatedDuration * 8).toFixed(1); // Convert days to hours (8 hours per day)
            const newDurationText = `${durationInHours} hours`;
            impactDurationElement.textContent = newDurationText;
            impactDurationElement.style.color = '#007bff';
            impactDurationElement.style.fontWeight = 'bold';
            console.log('✅ UPDATED duration element to:', newDurationText);
        } else {
            console.error('❌ impactDuration element not found in DOM!');
        }
        
        if (impactCostElement) {
            const newCostText = `$${Math.round(estimatedCost).toLocaleString()}`;
            impactCostElement.textContent = newCostText;
            impactCostElement.style.color = '#007bff';
            impactCostElement.style.fontWeight = 'bold';
            console.log('✅ UPDATED cost element to:', newCostText);
        } else {
            console.error('❌ impactCost element not found in DOM!');
        }

        // Calculate parallel task execution impact
        let parallelDurationReduction = 0;
        const parallelTasks = [];
        const sequentialTasks = [];
        
        this.projectData.tasks.forEach(task => {
            const parallelCheckbox = document.getElementById(`parallel-${task.id}`);
            const durationSlider = document.getElementById(`durationSlider-${task.id}`);
            
            const taskDuration = durationSlider ? parseFloat(durationSlider.value) : task.duration_hours;
            const isParallel = parallelCheckbox ? parallelCheckbox.checked : false;
            
            if (isParallel) {
                parallelTasks.push({ id: task.id, duration: taskDuration });
                console.log(`Task ${task.id} marked for parallel execution: ${taskDuration}h`);
            } else {
                sequentialTasks.push({ id: task.id, duration: taskDuration });
            }
        });
        
        if (parallelTasks.length > 1) {
            // Calculate parallel execution savings
            const totalParallelDuration = parallelTasks.reduce((sum, task) => sum + task.duration, 0);
            const maxParallelDuration = Math.max(...parallelTasks.map(task => task.duration));
            const parallelSavings = totalParallelDuration - maxParallelDuration;
            
            // Convert hours to days (assuming 8 hours per day)
            parallelDurationReduction = parallelSavings / 8;
            
            console.log(`🔄 Parallel execution analysis:`);
            console.log(`  - Tasks in parallel: ${parallelTasks.length}`);
            console.log(`  - Sequential total: ${totalParallelDuration}h`);
            console.log(`  - Parallel max: ${maxParallelDuration}h`);
            console.log(`  - Time savings: ${parallelSavings}h (${parallelDurationReduction.toFixed(2)} days)`);
            
            // Apply parallel reduction to estimated duration
            estimatedDuration = Math.max(0.1, estimatedDuration - parallelDurationReduction);
        }
        
        // Update display with parallel calculations
        const impactDurationElement2 = document.getElementById('impactDuration');
        const impactCostElement2 = document.getElementById('impactCost');
        
        if (impactDurationElement2) {
            const durationInHours = (estimatedDuration * 8).toFixed(1); // Convert days to hours
            const newDurationText = `${durationInHours} hours`;
            impactDurationElement2.textContent = newDurationText;
            impactDurationElement2.style.color = '#007bff';
            impactDurationElement2.style.fontWeight = 'bold';
            console.log('✅ FINAL UPDATED duration element to:', newDurationText);
        }
        
        if (impactCostElement2) {
            const newCostText = `$${Math.round(estimatedCost).toLocaleString()}`;
            impactCostElement2.textContent = newCostText;
            impactCostElement2.style.color = '#007bff';
            impactCostElement2.style.fontWeight = 'bold';
            console.log('✅ FINAL UPDATED cost element to:', newCostText);
        }
        
        console.log('=== updateImpactPreview completed with parallel calculations ===');
        return;

        // Collect current task configurations
        const taskConfigs = {};
        let hasParallelTasks = false;
        
        this.projectData.tasks.forEach(task => {
            const durationSlider = document.getElementById(`durationSlider-${task.id}`);
            const parallelCheckbox = document.getElementById(`parallel-${task.id}`);
            
            console.log(`Checking task ${task.id}:`);
            console.log('  - Duration slider exists:', !!durationSlider);
            console.log('  - Parallel checkbox exists:', !!parallelCheckbox);
            console.log('  - Parallel checkbox checked:', parallelCheckbox ? parallelCheckbox.checked : 'N/A');
            
            const prioritySlider = document.getElementById(`prioritySlider-${task.id}`);
            const priority = prioritySlider ? parseInt(prioritySlider.value) : 3;
            
            // Apply priority-based duration adjustment
            let baseDuration = durationSlider ? parseFloat(durationSlider.value) : task.duration_hours;
            let priorityAdjustedDuration = this.applyPriorityAdjustment(baseDuration, priority);
            
            taskConfigs[task.id] = {
                originalDuration: task.duration_hours,
                newDuration: priorityAdjustedDuration,
                allowParallel: parallelCheckbox ? parallelCheckbox.checked : false,
                priority: priority,
                order: task.order
            };
            
            console.log(`  - Priority: ${priority}, Base duration: ${baseDuration}h, Adjusted: ${priorityAdjustedDuration}h`);
            
            if (parallelCheckbox && parallelCheckbox.checked) {
                hasParallelTasks = true;
                console.log(`  - Task ${task.id} marked for parallel execution`);
            }
        });

        // Debug: Log task configurations
        console.log('Task configurations:', taskConfigs);
        console.log('Has parallel tasks:', hasParallelTasks);
        
        // Calculate duration considering parallel execution
        if (hasParallelTasks) {
            console.log('Has parallel tasks - using parallel calculation');
            estimatedDuration = this.calculateParallelDuration(taskConfigs);
        } else {
            console.log('No parallel tasks - using sequential calculation');
            // Sequential execution - sum all task durations
            let totalTaskHours = 0;
            Object.values(taskConfigs).forEach(config => {
                totalTaskHours += config.newDuration;
            });
            estimatedDuration = totalTaskHours / 8; // Convert to days
            console.log(`Sequential total: ${totalTaskHours} hours = ${estimatedDuration.toFixed(1)} days`);
        }

        // Calculate priority-adjusted cost
        let priorityAdjustedCost = this.calculatePriorityAdjustedCost(taskConfigs);
        estimatedCost = priorityAdjustedCost;
        
        // Apply resource rate and availability changes to cost
        let costMultiplier = 1.0;
        let durationMultiplier = 1.0;
        
        this.projectData.resources.forEach(resource => {
            const rateSlider = document.getElementById(`rateSlider-${resource.id}`);
            const hoursSlider = document.getElementById(`hoursSlider-${resource.id}`);
            const availableCheckbox = document.getElementById(`available-${resource.id}`);
            
            if (rateSlider && hoursSlider && availableCheckbox) {
                const rateMultiplier = rateSlider.value / resource.hourly_rate;
                const hoursMultiplier = hoursSlider.value / resource.max_hours_per_day;
                const isAvailable = availableCheckbox.checked;
                
                if (isAvailable) {
                    costMultiplier *= rateMultiplier;
                    durationMultiplier *= (1 / hoursMultiplier); // More hours per day = less total duration
                }
            }
        });
        
        estimatedCost *= costMultiplier;
        estimatedDuration *= durationMultiplier;

        // Update display
        console.log('Final estimated duration:', estimatedDuration.toFixed(1), 'days');
        console.log('Final estimated cost:', estimatedCost.toLocaleString());
        
        const durationElement = document.getElementById('impactDuration');
        const costElement = document.getElementById('impactCost');
        
        if (durationElement) {
            durationElement.textContent = `${estimatedDuration.toFixed(1)} days`;
            console.log('Updated duration element');
        } else {
            console.error('impactDuration element not found!');
        }
        
        if (costElement) {
            costElement.textContent = `$${estimatedCost.toLocaleString()}`;
            console.log('Updated cost element');
        } else {
            console.error('impactCost element not found!');
        }
        
        console.log('=== updateImpactPreview completed ===');
    }
    
    calculateParallelDuration(taskConfigs) {
        // Separate parallel and sequential tasks
        const parallelTasks = [];
        const sequentialTasks = [];
        
        Object.entries(taskConfigs).forEach(([taskId, config]) => {
            if (config.allowParallel) {
                parallelTasks.push(config);
            } else {
                sequentialTasks.push(config);
            }
        });
        
        let totalDuration = 0;
        
        // If we have parallel tasks, they can run simultaneously
        if (parallelTasks.length > 0) {
            // Parallel tasks: duration is the maximum of all parallel tasks
            const maxParallelDuration = Math.max(...parallelTasks.map(task => task.newDuration));
            totalDuration += maxParallelDuration;
            
            console.log(`Parallel tasks (${parallelTasks.length}): max duration = ${maxParallelDuration} hours`);
        }
        
        // Sequential tasks are added to the total duration
        if (sequentialTasks.length > 0) {
            const sequentialDuration = sequentialTasks.reduce((sum, task) => sum + task.newDuration, 0);
            totalDuration += sequentialDuration;
            
            console.log(`Sequential tasks (${sequentialTasks.length}): total duration = ${sequentialDuration} hours`);
        }
        
        console.log(`Total calculated duration: ${totalDuration} hours = ${(totalDuration / 8).toFixed(1)} days`);
        
        return totalDuration / 8; // Convert hours to days
    }
    
    applyPriorityAdjustment(baseDuration, priority) {
        // Priority affects resource allocation efficiency
        // Higher priority = better resources = faster completion
        const priorityMultipliers = {
            1: 1.3,   // Very Low - 30% slower (gets junior resources)
            2: 1.15,  // Low - 15% slower
            3: 1.0,   // Normal - baseline
            4: 0.85,  // High - 15% faster (gets senior resources)
            5: 0.7    // Critical - 30% faster (gets best resources)
        };
        
        const multiplier = priorityMultipliers[priority] || 1.0;
        return baseDuration * multiplier;
    }
    
    calculatePriorityAdjustedCost(taskConfigs) {
        // Calculate cost based on priority-adjusted durations and resource rates
        let totalCost = 0;
        
        Object.entries(taskConfigs).forEach(([taskId, config]) => {
            // Find the task in project data to get original cost calculation
            const task = this.projectData.tasks.find(t => t.id === taskId);
            if (!task) return;
            
            // Priority affects which resource tier gets assigned
            const priorityCostMultipliers = {
                1: 0.7,   // Very Low - gets cheapest resources (junior)
                2: 0.85,  // Low - gets lower-cost resources
                3: 1.0,   // Normal - baseline resource cost
                4: 1.25,  // High - gets expensive resources (senior)
                5: 1.5    // Critical - gets most expensive resources (expert)
            };
            
            const baseCostPerHour = 85; // Average hourly rate from original scenario
            const priorityMultiplier = priorityCostMultipliers[config.priority] || 1.0;
            const adjustedRate = baseCostPerHour * priorityMultiplier;
            
            const taskCost = config.newDuration * adjustedRate;
            totalCost += taskCost;
            
            console.log(`Task ${taskId}: Priority ${config.priority}, Duration ${config.newDuration}h, Rate $${adjustedRate}/h, Cost $${taskCost}`);
        });
        
        console.log(`Total priority-adjusted cost: $${totalCost}`);
        return totalCost;
    }
    
    updateImpactPreviewFromScenario(metrics) {
        // Update impact preview with actual scenario metrics
        const durationElement = document.getElementById('impactDuration');
        const costElement = document.getElementById('impactCost');
        
        if (durationElement && metrics) {
            const totalTimeDays = metrics.total_time_days || metrics.total_duration_days || 0;
            const durationInHours = (totalTimeDays * 24).toFixed(1);
            durationElement.textContent = `${durationInHours} hours`;
        }
        
        if (costElement && metrics) {
            const totalCost = metrics.total_cost || 0;
            costElement.textContent = `$${totalCost.toLocaleString()}`;
        }
    }

    async updateScenario() {
        // Get current Impact Preview values to preserve them
        const impactDurationText = document.getElementById('impactDuration').textContent;
        const impactCostText = document.getElementById('impactCost').textContent;
        
        // Parse the values
        const estimatedDuration = parseFloat(impactDurationText.replace(' days', ''));
        const estimatedCost = parseFloat(impactCostText.replace('$', '').replace(/,/g, ''));
        
        // Collect current constraint values
        const updatedConstraints = this.collectConstraints();
        
        try {
            // Call API to re-optimize with new constraints
            const response = await fetch(`${this.apiBaseUrl}/optimize/custom`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedConstraints)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            // Get current Impact Preview values for the custom scenario
            const impactDurationText = document.getElementById('impactDuration').textContent;
            const impactCostText = document.getElementById('impactCost').textContent;
            
            // Parse Impact Preview values
            const impactDurationHours = parseFloat(impactDurationText.replace(' hours', ''));
            const impactCost = parseFloat(impactCostText.replace('$', '').replace(/,/g, ''));
            
            // Create a custom scenario that matches the Impact Preview estimates
            const customScenario = {
                scenario: result.scenario.scenario,
                metrics: {
                    total_time_days: impactDurationHours / 24, // Convert hours back to days for internal consistency
                    total_cost: impactCost,
                    quality_score: result.scenario.metrics.quality_score,
                    resource_utilization: result.scenario.metrics.resource_utilization
                }
            };
            
            // Update ONLY the current scenario for comparison, NOT the original What-If Analysis scenario
            this.currentScenario = customScenario;
            
            // Don't update the main scenario display - keep What-If Analysis results intact
            
            // Keep Impact Preview values unchanged since they should match
            
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
        console.log('enableComparison called');
        console.log('originalScenario:', this.originalScenario);
        console.log('currentScenario:', this.currentScenario);
        
        if (!this.originalScenario || !this.currentScenario) {
            console.error('Missing scenarios for comparison');
            alert('Please optimize a scenario first before comparing.');
            return;
        }

        const comparisonTable = document.getElementById('comparisonTable');
        const tbody = document.getElementById('comparisonBody');
        
        if (!comparisonTable || !tbody) {
            console.error('Comparison table elements not found');
            return;
        }
        
        tbody.innerHTML = '';

        // Handle different scenario data structures
        const originalMetrics = this.originalScenario.metrics || this.originalScenario;
        const currentMetrics = this.currentScenario.metrics || this.currentScenario;
        
        console.log('originalMetrics:', originalMetrics);
        console.log('currentMetrics:', currentMetrics);
        
        if (!originalMetrics || !currentMetrics) {
            console.error('Missing metrics data for comparison');
            return;
        }

        // Compare metrics using flexible data access
        const metrics = [
            { 
                label: 'Duration (hours)', 
                original: (originalMetrics.total_time_days || originalMetrics.total_duration_days || 0) * 24, 
                current: (currentMetrics.total_time_days || currentMetrics.total_duration_days || 0) * 24 
            },
            { 
                label: 'Total Cost', 
                original: originalMetrics.total_cost || 0, 
                current: currentMetrics.total_cost || 0 
            },
            { 
                label: 'Quality Score', 
                original: (originalMetrics.quality_score || 0.88) * 100, 
                current: (currentMetrics.quality_score || 0.88) * 100 
            },
            { 
                label: 'Resource Utilization', 
                original: (originalMetrics.resource_utilization || 0.75) * 100, 
                current: (currentMetrics.resource_utilization || 0.75) * 100 
            }
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
        if (!this.originalScenario) {
            console.error('No original scenario to reset to');
            alert('No original scenario available to reset to.');
            return;
        }
        
        console.log('Resetting Impact Preview to original values');
        
        // Reset ONLY the Impact Preview scenario, not the What-If Analysis results
        this.impactPreviewScenario = { ...this.originalScenario };
        this.currentScenario = { ...this.originalScenario };
        
        // Reset impact preview to original values
        const originalMetrics = this.originalScenario.metrics || this.originalScenario;
        if (originalMetrics) {
            this.updateImpactPreviewFromScenario(originalMetrics);
        }
        
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
