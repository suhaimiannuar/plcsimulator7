// ===== Initialization & Event Listeners =====

// ===== Initialization =====
async function init() {
    // Load pin configuration
    await loadPinConfiguration();
    
    // Setup canvas
    elements.ctx = elements.canvas.getContext('2d');
    resizeCanvas();
    
    // Event listeners
    setupEventListeners();
    
    // Initial render
    renderGrid();
    updateUI();
    updatePinList();
}

/**
 * Load pin configuration from JSON file
 */
async function loadPinConfiguration() {
    try {
        const response = await fetch('pin-config.json');
        state.pinConfig = await response.json();
    } catch (error) {
        console.error('Failed to load pin configuration:', error);
        // Fallback to default configuration
        state.pinConfig = {
            inputs: Array.from({length: 8}, (_, i) => ({
                id: i + 1,
                label: `I${i + 1}`,
                description: `Input ${i + 1}`
            })),
            outputs: Array.from({length: 8}, (_, i) => ({
                id: i + 1,
                label: `Q${i + 1}`,
                description: `Output ${i + 1}`
            })),
            feedbackOutputs: Array.from({length: 8}, (_, i) => ({
                id: i + 1,
                label: `Q${i + 1}`,
                description: `Output ${i + 1} Feedback`,
                sourceOutput: i + 1
            }))
        };
    }
}

/**
 * Update the pin list display to show all available pins and their assignments
 */
function updatePinList() {
    if (!state.pinConfig) return;
    
    // Helper function to create pin item element
    function createPinItem(pin, componentType) {
        const item = document.createElement('div');
        item.className = 'pin-item';
        
        // Create pin identifier based on type
        let pinId;
        if (componentType === 'input') {
            pinId = `I${pin.id}`;
        } else if (componentType === 'feedback') {
            pinId = `QF${pin.id}`;
        } else {
            pinId = `Q${pin.id}`;
        }
        
        // Find if this pin is assigned
        let assignment = null;
        let assignmentLabel = '';
        
        if (componentType === 'input') {
            // Check I/O list for input assignments
            assignment = state.diagram.inputs.find(input => input.pin === pinId);
            if (assignment) {
                assignmentLabel = assignment.label;
            } else {
                // Also check if any contact is using this input pin
                const contactUsingPin = state.diagram.components.find(c => 
                    (c.type === 'NO_CONTACT' || c.type === 'NC_CONTACT') && c.pin === pinId
                );
                if (contactUsingPin) {
                    assignment = contactUsingPin;
                    assignmentLabel = contactUsingPin.label;
                }
            }
        } else if (componentType === 'feedback') {
            // Check if feedback exists and get its state
            const feedback = state.diagram.feedbacks ? state.diagram.feedbacks.find(f => f.pin === pinId) : null;
            
            // Check if any contact is using this feedback pin
            const contactUsingFeedback = state.diagram.components.find(c => 
                (c.type === 'NO_CONTACT' || c.type === 'NC_CONTACT') && c.pin === pinId
            );
            
            if (contactUsingFeedback) {
                assignment = contactUsingFeedback;
                assignmentLabel = contactUsingFeedback.label || (feedback ? feedback.label : '');
            } else if (feedback) {
                // Feedback exists but no contact using it yet
                assignment = feedback;
                assignmentLabel = feedback.label;
            }
        } else if (componentType === 'output') {
            // Check I/O list for output assignments
            assignment = state.diagram.outputs.find(output => output.pin === pinId);
            if (assignment) {
                assignmentLabel = assignment.label;
            }
        }
        
        if (assignment) {
            item.classList.add('assigned');
        } else {
            item.classList.add('available');
        }
        
        // Pin ID
        const pinIdSpan = document.createElement('span');
        pinIdSpan.className = 'pin-id';
        pinIdSpan.textContent = componentType === 'feedback' ? `QF${pin.id}` : pin.label;
        
        // Pin Label (user-assigned or empty)
        const pinLabel = document.createElement('span');
        pinLabel.className = 'pin-label';
        if (assignmentLabel) {
            pinLabel.textContent = assignmentLabel;
        } else {
            pinLabel.textContent = '—';
            pinLabel.classList.add('empty');
        }
        
        item.appendChild(pinIdSpan);
        item.appendChild(pinLabel);
        
        return item;
    }
    
    // Clear existing lists
    elements.inputPinList.innerHTML = '';
    elements.feedbackPinList.innerHTML = '';
    elements.outputPinList.innerHTML = '';
    
    // Populate inputs
    state.pinConfig.inputs.forEach(pin => {
        elements.inputPinList.appendChild(createPinItem(pin, 'input'));
    });
    
    // Populate feedbacks
    state.pinConfig.outputs.forEach(pin => {
        elements.feedbackPinList.appendChild(createPinItem(pin, 'feedback'));
    });
    
    // Populate outputs
    state.pinConfig.outputs.forEach(pin => {
        elements.outputPinList.appendChild(createPinItem(pin, 'output'));
    });
}

function resizeCanvas() {
    const container = elements.canvas.parentElement;
    elements.canvas.width = CONFIG.grid.columns * CONFIG.grid.cellSize + 100;
    elements.canvas.height = CONFIG.grid.rows * CONFIG.grid.cellSize + 100;
}

// ===== Event Listeners =====
function setupEventListeners() {
    // Component palette buttons
    document.querySelectorAll('.component-btn').forEach(btn => {
        btn.addEventListener('click', () => selectComponentType(btn.dataset.type));
    });
    
    // Canvas events
    elements.canvas.addEventListener('click', handleCanvasClick);
    elements.canvas.addEventListener('mousemove', handleCanvasMouseMove);
    elements.canvas.addEventListener('mousedown', handleCanvasMouseDown);
    elements.canvas.addEventListener('mouseup', handleCanvasMouseUp);
    elements.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Control buttons
    elements.runPauseBtn.addEventListener('click', toggleRunPause);
    elements.resetBtn.addEventListener('click', resetSimulation);
    elements.scanCycleInput.addEventListener('change', updateScanCycle);
    elements.speedMultiplierSelect.addEventListener('change', updateSpeedMultiplier);
    elements.newBtn.addEventListener('click', newDiagram);
    elements.saveBtn.addEventListener('click', saveDiagram);
    elements.loadBtn.addEventListener('click', loadDiagram);
    elements.clearBtn.addEventListener('click', clearDiagram);
    elements.deleteToolBtn.addEventListener('click', () => setMode('delete'));
    elements.selectToolBtn.addEventListener('click', () => setMode('select'));
    
    // Modal events
    elements.closeModal.addEventListener('click', closeModal);
    elements.cancelPinBtn.addEventListener('click', closeModal);
    elements.pinForm.addEventListener('submit', handlePinAssignment);
    
    // Timer modal events
    elements.closeTimerModal.addEventListener('click', closeTimerModal);
    elements.cancelTimerBtn.addEventListener('click', closeTimerModal);
    elements.timerForm.addEventListener('submit', handleTimerConfig);
    
    // Libraries modal events
    elements.librariesBtn.addEventListener('click', openLibrariesModal);
    document.querySelector('.close-libraries').addEventListener('click', closeLibrariesModal);
    document.querySelectorAll('.library-item').forEach(btn => {
        btn.addEventListener('click', () => loadLibrary(btn.dataset.library));
    });
    
    // Window resize
    window.addEventListener('resize', () => {
        resizeCanvas();
        renderGrid();
    });
}

function selectComponentType(type) {
    state.ui.selectedComponentType = type;
    state.ui.mode = 'place';
    
    // Update button states
    document.querySelectorAll('.component-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });
    
    elements.deleteToolBtn.classList.remove('active');
    elements.selectToolBtn.classList.remove('active');
}

function setMode(mode) {
    state.ui.mode = mode;
    state.ui.selectedComponentType = null;
    
    // Update button states
    document.querySelectorAll('.component-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    elements.deleteToolBtn.classList.toggle('active', mode === 'delete');
    elements.selectToolBtn.classList.toggle('active', mode === 'select');
}

// ===== Start Application =====
document.addEventListener('DOMContentLoaded', init);
