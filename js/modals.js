// ===== Modal Dialogs =====

// ===== Pin Assignment Modal =====
function openPinModal(component) {
    const typeInfo = COMPONENT_TYPES[component.type];
    const pinNumberSelect = elements.pinNumber;
    
    // Clear existing options
    pinNumberSelect.innerHTML = '<option value="">Select pin...</option>';
    
    if (!state.pinConfig) return;
    
    let pinTypeName = '';
    
    // Auto-detect component type and populate appropriate pins
    if (typeInfo.isInput || typeInfo.isContact) {
        // For inputs and contacts, show both input pins and output pins (for feedback)
        pinTypeName = typeInfo.isInput ? 'Input' : 'Contact';
        
        // Create optgroup for Input Pins
        const inputGroup = document.createElement('optgroup');
        inputGroup.label = 'Input Pins';
        state.pinConfig.inputs.forEach(pin => {
            const option = document.createElement('option');
            option.value = `I${pin.id}`;
            
            // Check if this pin has been assigned and use the actual label
            const assignedInput = state.diagram.inputs.find(i => i.pin === `I${pin.id}`);
            const displayLabel = assignedInput && assignedInput.label ? assignedInput.label : pin.description;
            
            option.textContent = `I${pin.id} - ${displayLabel}`;
            inputGroup.appendChild(option);
        });
        pinNumberSelect.appendChild(inputGroup);
        
        // Create optgroup for Output Pins (Feedback)
        const feedbackGroup = document.createElement('optgroup');
        feedbackGroup.label = 'Output Pins (Feedback)';
        state.pinConfig.outputs.forEach(pin => {
            const option = document.createElement('option');
            option.value = `QF${pin.id}`;  // Use QF for feedback
            
            // Check if this feedback has been assigned and use the actual label
            const assignedFeedback = state.diagram.feedbacks.find(f => f.pin === `QF${pin.id}`);
            const displayLabel = assignedFeedback && assignedFeedback.label ? assignedFeedback.label : `${pin.description} (Feedback)`;
            
            option.textContent = `QF${pin.id} - ${displayLabel}`;
            feedbackGroup.appendChild(option);
        });
        pinNumberSelect.appendChild(feedbackGroup);
        
    } else if (typeInfo.isOutput) {
        // For outputs, only show output pins
        pinTypeName = 'Output';
        
        state.pinConfig.outputs.forEach(pin => {
            const option = document.createElement('option');
            option.value = `Q${pin.id}`;
            
            // Check if this pin has been assigned and use the actual label
            const assignedOutput = state.diagram.outputs.find(o => o.pin === `Q${pin.id}`);
            const displayLabel = assignedOutput && assignedOutput.label ? assignedOutput.label : pin.description;
            
            option.textContent = `Q${pin.id} - ${displayLabel}`;
            pinNumberSelect.appendChild(option);
        });
    }
    
    // Update modal title
    elements.modalTitle.textContent = `Assign ${pinTypeName} Pin`;
    
    // Pre-fill existing values
    if (component.pin !== null && component.pin !== undefined) {
        elements.pinNumber.value = component.pin;
    }
    elements.pinLabel.value = component.label || '';
    
    elements.pinModal.classList.add('show');
}

function closeModal() {
    elements.pinModal.classList.remove('show');
}

function openTimerConfigModal(component) {
    const typeInfo = COMPONENT_TYPES[component.type];
    
    // Update modal title
    elements.timerModalTitle.textContent = `Configure ${typeInfo.name}`;
    
    // Pre-fill existing values
    elements.timerLabel.value = component.label || '';
    elements.timerPreset.value = (component.preset || 1000) / 1000; // Convert ms to seconds
    
    // Show timer type
    const timerDescriptions = {
        'TON': 'TON - On Delay (Output turns ON after preset time)',
        'TOF': 'TOF - Off Delay (Output turns OFF after preset time)',
        'TP': 'TP - Pulse (Output pulses for preset time duration)'
    };
    elements.timerTypeDisplay.textContent = timerDescriptions[component.type] || component.type;
    
    elements.timerModal.classList.add('show');
}

function closeTimerModal() {
    elements.timerModal.classList.remove('show');
}

function handleTimerConfig(e) {
    e.preventDefault();
    
    const component = state.ui.selectedComponent;
    if (!component) return;
    
    saveHistory(); // Save state before timer configuration
    
    const label = elements.timerLabel.value;
    const presetSeconds = parseFloat(elements.timerPreset.value);
    
    if (presetSeconds <= 0) {
        alert('Preset time must be greater than 0');
        return;
    }
    
    // Update component
    component.label = label || '';
    component.preset = presetSeconds * 1000; // Convert seconds to milliseconds
    
    closeTimerModal();
    
    // Update UI
    if (state.ui.selectedComponent === component) {
        displayProperties(component);
    }
    
    renderGrid();
}

// ===== Libraries =====
function openLibrariesModal() {
    elements.librariesModal.classList.add('show');
}

function closeLibrariesModal() {
    elements.librariesModal.classList.remove('show');
}

async function loadLibrary(libraryName) {
    // Confirm with user
    const confirmed = confirm(`Load "${libraryName}" circuit? This will replace your current diagram.`);
    if (!confirmed) return;
    
    try {
        const response = await fetch(`libs/${libraryName}.json`);
        if (!response.ok) {
            throw new Error(`Failed to load library: ${response.statusText}`);
        }
        
        const libraryData = await response.json();
        
        // Stop simulation if running
        if (state.ui.isSimulationRunning) {
            resetSimulation();
        }
        
        // Load the library data into the diagram
        state.diagram = {
            metadata: libraryData.metadata || {
                name: libraryData.metadata?.name || 'Library Circuit',
                created: new Date().toISOString(),
                modified: new Date().toISOString()
            },
            grid: CONFIG.grid,
            components: libraryData.components || [],
            inputs: libraryData.inputs || [],
            outputs: libraryData.outputs || [],
            feedbacks: libraryData.feedbacks || [],
            timers: libraryData.timers || []
        };
        
        // Update UI
        renderGrid();
        updateUI();
        updatePinList();
        
        closeLibrariesModal();
        
        alert(`Library "${libraryData.metadata.name}" loaded successfully!`);
    } catch (error) {
        console.error('Failed to load library:', error);
        alert(`Failed to load library: ${error.message}`);
    }
}

function handlePinAssignment(e) {
    e.preventDefault();
    
    const component = state.ui.selectedComponent;
    if (!component) return;
    
    saveHistory(); // Save state before pin assignment
    
    const pinValue = elements.pinNumber.value;
    const label = elements.pinLabel.value;
    
    if (!pinValue) {
        alert('Please select a pin number');
        return;
    }
    
    const typeInfo = COMPONENT_TYPES[component.type];
    const isFeedbackPin = pinValue.startsWith('QF');
    
    // For inputs and outputs, manage the I/O list
    // BUT: Don't create I/O entries for feedback pins (QF) - they're read-only
    if ((typeInfo.isInput || typeInfo.isOutput) && !isFeedbackPin) {
        const ioList = typeInfo.isInput ? state.diagram.inputs : state.diagram.outputs;
        const existing = ioList.find(io => io.pin === pinValue);
        
        if (existing) {
            // Pin already exists
            if (!existing.componentIds.includes(component.id)) {
                // Add this component to the existing pin
                existing.componentIds.push(component.id);
            }
            // Always update the label
            if (label) {
                existing.label = label;
                // Update label for all components using this pin
                existing.componentIds.forEach(compId => {
                    const comp = state.diagram.components.find(c => c.id === compId);
                    if (comp) {
                        comp.label = label;
                    }
                });
            }
        } else {
            // Create new I/O
            const io = {
                id: generateId(),
                pin: pinValue,
                label: label || '',
                type: 'DIGITAL',
                state: false,
                componentIds: [component.id]
            };
            
            if (typeInfo.isInput) {
                state.diagram.inputs.push(io);
            } else {
                state.diagram.outputs.push(io);
                // Don't auto-create feedback - only create when a contact uses it
            }
        }
    }
    
    // Handle feedback pin assignment (QF1, QF2, etc.)
    if (isFeedbackPin) {
        // Update or create feedback entry with the given label
        const existing = state.diagram.feedbacks.find(f => f.pin === pinValue);
        if (existing) {
            existing.label = label || existing.label;
            // Update label for all feedback contacts using this pin
            state.diagram.components.forEach(comp => {
                if ((comp.type === 'NO_CONTACT' || comp.type === 'NC_CONTACT') && comp.pin === pinValue) {
                    comp.label = label || comp.label;
                }
            });
        } else {
            // Create feedback entry if it doesn't exist
            const sourceOutputPin = pinValue.replace('QF', 'Q'); // QF1 -> Q1
            const feedback = {
                id: generateId(),
                pin: pinValue,
                sourceOutputPin: sourceOutputPin,
                state: false,
                label: label || 'Feedback'
            };
            state.diagram.feedbacks.push(feedback);
        }
    }
    
    // Update component properties (always, including for feedback contacts)
    component.pin = pinValue;
    component.label = label || '';
    
    closeModal();
    
    // Refresh all UI elements
    updateUI();
    updatePinList();
    
    // Update the properties panel if this component is still selected
    if (state.ui.selectedComponent === component) {
        displayProperties(component);
    }
    
    renderGrid();
}

