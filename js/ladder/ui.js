// ===== UI Updates =====

// ===== UI Updates =====
function updateUI() {
    updateInputList();
    updateFeedbackList();
    updateOutputList();
    
    // Update properties panel if a component is selected
    if (state.ui.selectedComponent) {
        const component = state.diagram.components.find(c => c.id === state.ui.selectedComponent);
        if (component) {
            displayProperties(component);
        }
    }
}

function updateInputList() {
    if (state.diagram.inputs.length === 0) {
        elements.inputList.innerHTML = '<p class="empty-message">No inputs assigned</p>';
        return;
    }
    
    // Check if we need to rebuild the list (number of inputs changed)
    const currentItems = elements.inputList.querySelectorAll('.io-item');
    const needsRebuild = currentItems.length !== state.diagram.inputs.length;
    
    if (needsRebuild) {
        // Full rebuild when inputs are added/removed
        elements.inputList.innerHTML = state.diagram.inputs.map(input => `
            <div class="io-item" data-input-id="${input.id}">
                <div class="io-item-header">
                    <div class="io-item-label">
                        <span class="pin-badge">${input.pin}</span>
                        <span>${input.label}</span>
                    </div>
                    <div class="io-toggle ${input.state ? 'active' : ''}" 
                         onclick="window.toggleInput('${input.id}')"></div>
                </div>
                <div class="io-item-state">State: ${input.state ? 'ON' : 'OFF'}</div>
            </div>
        `).join('');
    } else {
        // Just update existing elements (preserves event handlers during simulation)
        state.diagram.inputs.forEach(input => {
            const item = elements.inputList.querySelector(`[data-input-id="${input.id}"]`);
            if (item) {
                const toggle = item.querySelector('.io-toggle');
                const stateText = item.querySelector('.io-item-state');
                
                if (toggle) {
                    if (input.state) {
                        toggle.classList.add('active');
                    } else {
                        toggle.classList.remove('active');
                    }
                }
                
                if (stateText) {
                    stateText.textContent = `State: ${input.state ? 'ON' : 'OFF'}`;
                }
            }
        });
    }
}

function updateFeedbackList() {
    if (state.diagram.feedbacks.length === 0) {
        elements.feedbackList.innerHTML = '<p class="empty-message">No feedbacks available</p>';
        return;
    }
    
    // Check if we need to rebuild the list
    const currentItems = elements.feedbackList.querySelectorAll('.io-item');
    const needsRebuild = currentItems.length !== state.diagram.feedbacks.length;
    
    if (needsRebuild) {
        // Full rebuild when feedbacks are added/removed
        elements.feedbackList.innerHTML = state.diagram.feedbacks.map(feedback => `
            <div class="io-item" data-feedback-id="${feedback.id}">
                <div class="io-item-header">
                    <div class="io-item-label">
                        <span class="pin-badge">${feedback.pin}</span>
                        <span>${feedback.label}</span>
                    </div>
                </div>
                <div class="output-indicator ${feedback.state ? 'active' : ''}"></div>
                <div class="io-item-state">State: ${feedback.state ? 'ON' : 'OFF'}</div>
            </div>
        `).join('');
    } else {
        // Just update existing elements
        state.diagram.feedbacks.forEach(feedback => {
            const item = elements.feedbackList.querySelector(`[data-feedback-id="${feedback.id}"]`);
            if (item) {
                const indicator = item.querySelector('.output-indicator');
                const stateText = item.querySelector('.io-item-state');
                
                if (indicator) {
                    if (feedback.state) {
                        indicator.classList.add('active');
                    } else {
                        indicator.classList.remove('active');
                    }
                }
                
                if (stateText) {
                    stateText.textContent = `State: ${feedback.state ? 'ON' : 'OFF'}`;
                }
            }
        });
    }
}

function updateOutputList() {
    if (state.diagram.outputs.length === 0) {
        elements.outputList.innerHTML = '<p class="empty-message">No outputs assigned</p>';
        return;
    }
    
    // Check if we need to rebuild the list
    const currentItems = elements.outputList.querySelectorAll('.io-item');
    const needsRebuild = currentItems.length !== state.diagram.outputs.length;
    
    if (needsRebuild) {
        // Full rebuild when outputs are added/removed
        elements.outputList.innerHTML = state.diagram.outputs.map(output => `
            <div class="io-item" data-output-id="${output.id}">
                <div class="io-item-header">
                    <div class="io-item-label">
                        <span class="pin-badge">${output.pin}</span>
                        <span>${output.label}</span>
                    </div>
                </div>
                <div class="output-indicator ${output.state ? 'active' : ''}"></div>
                <div class="io-item-state">State: ${output.state ? 'ON' : 'OFF'}</div>
            </div>
        `).join('');
    } else {
        // Just update existing elements
        state.diagram.outputs.forEach(output => {
            const item = elements.outputList.querySelector(`[data-output-id="${output.id}"]`);
            if (item) {
                const indicator = item.querySelector('.output-indicator');
                const stateText = item.querySelector('.io-item-state');
                
                if (indicator) {
                    if (output.state) {
                        indicator.classList.add('active');
                    } else {
                        indicator.classList.remove('active');
                    }
                }
                
                if (stateText) {
                    stateText.textContent = `State: ${output.state ? 'ON' : 'OFF'}`;
                }
            }
        });
    }
}

function displayProperties(component) {
    const typeInfo = COMPONENT_TYPES[component.type];
    
    // For timer components, show different properties
    if (typeInfo.isTimer) {
        const presetSeconds = (component.preset || 1000) / 1000;
        const timer = state.diagram.timers?.find(t => t.id === component.id);
        const elapsedSeconds = timer ? (timer.elapsed / 1000).toFixed(2) : '0.00';
        const doneState = timer?.done ? 'YES' : 'NO';
        
        elements.propertiesContent.innerHTML = `
            <div class="property-group">
                <div class="property-label">Type</div>
                <div class="property-value">${typeInfo.name}</div>
            </div>
            <div class="property-group">
                <div class="property-label">Label</div>
                <div class="property-value">${component.label || 'None'}</div>
            </div>
            <div class="property-group">
                <div class="property-label">Preset</div>
                <div class="property-value">${presetSeconds}s</div>
            </div>
            <div class="property-group">
                <div class="property-label">Elapsed</div>
                <div class="property-value">${elapsedSeconds}s</div>
            </div>
            <div class="property-group">
                <div class="property-label">Done (Q)</div>
                <div class="property-value">${doneState}</div>
            </div>
            <div class="property-group">
                <div class="property-label">State</div>
                <div class="property-value">${component.state ? 'ON' : 'OFF'}</div>
            </div>
            <button class="btn btn-primary btn-block" onclick="editTimerConfig('${component.id}')">
                Edit Configuration
            </button>
        `;
        return;
    }
    
    // For regular components
    elements.propertiesContent.innerHTML = `
        <div class="property-group">
            <div class="property-label">Type</div>
            <div class="property-value">${typeInfo.name}</div>
        </div>
        <div class="property-group">
            <div class="property-label">Position</div>
            <div class="property-value">(${component.position.x}, ${component.position.y})</div>
        </div>
        <div class="property-group">
            <div class="property-label">Pin Assignment</div>
            <div class="property-value">${component.pin !== null ? component.pin : 'None'}</div>
        </div>
        <div class="property-group">
            <div class="property-label">Label</div>
            <div class="property-value">${component.label || 'None'}</div>
        </div>
        <div class="property-group">
            <div class="property-label">State</div>
            <div class="property-value">${component.state ? 'ON' : 'OFF'}</div>
        </div>
        ${typeInfo.isInput || typeInfo.isOutput ? `
            <button class="btn btn-primary btn-block" onclick="editComponentPin('${component.id}')">
                Edit Pin Assignment
            </button>
        ` : ''}
    `;
}

window.editTimerConfig = function(componentId) {
    const component = state.diagram.components.find(c => c.id === componentId);
    if (component) {
        state.ui.selectedComponent = component;
        openTimerConfigModal(component);
    }
};

// ===== Input Toggle =====
window.toggleInput = function(inputId) {
    const input = state.diagram.inputs.find(i => i.id === inputId);
    if (!input) {
        console.error('Input not found:', inputId);
        return;
    }
    
    // Toggle state
    input.state = !input.state;
    
    // Update linked components
    input.componentIds.forEach(compId => {
        const component = state.diagram.components.find(c => c.id === compId);
        if (component) {
            if (component.type === 'NO_CONTACT') {
                component.state = input.state;
            } else if (component.type === 'NC_CONTACT') {
                component.state = !input.state; // NC is inverted
            }
        }
    });
    
    // If simulation is running, trigger evaluation immediately on change
    if (state.ui.isSimulationRunning) {
        traceCurrentFlow(); // Re-trace current flow
        evaluateLogic();
        updateOutputs();
        renderGrid(); // Re-render to show updated current flow
        updateUI();
    } else {
        // Not running - just update UI and render
        updateUI();
        renderGrid();
    }
};

window.editComponentPin = function(componentId) {
    const component = state.diagram.components.find(c => c.id === componentId);
    if (component) {
        state.ui.selectedComponent = component;
        openPinModal(component);
    }
};

