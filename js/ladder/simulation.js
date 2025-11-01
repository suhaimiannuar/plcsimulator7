// ===== Simulation Logic =====

// ===== Simulation =====
/**
 * Sync all contact component states with their linked input states
 * This ensures contacts reflect the current input toggle states
 */
function syncContactStates() {
    state.diagram.inputs.forEach(input => {
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
    });
}

/**
 * Create or update a feedback entry for an output
 * Called when an output is created or updated
 */
function createOrUpdateFeedback(outputPin, outputLabel) {
    const feedbackPin = outputPin.replace('Q', 'QF'); // Q1 -> QF1
    const existing = state.diagram.feedbacks.find(f => f.pin === feedbackPin);
    
    if (existing) {
        // Update existing feedback - preserve custom label if it was set differently
        if (!existing.label || existing.label === `${existing.sourceOutputPin} (Feedback)`) {
            // If it has default label, update with output's label
            existing.label = outputLabel ? `${outputLabel} (Feedback)` : 'Feedback';
        }
        // Don't overwrite custom labels
    } else {
        // Create new feedback entry
        const feedback = {
            id: generateId(),
            pin: feedbackPin,
            sourceOutputPin: outputPin,
            state: false,
            label: outputLabel ? `${outputLabel} (Feedback)` : 'Feedback'
        };
        state.diagram.feedbacks.push(feedback);
    }
}

/**
 * Initialize feedback states (QF) for all outputs
 * Only creates feedbacks that are actually used by contacts
 */
function initializeFeedbacks() {
    // Keep existing feedbacks
    const existingFeedbacks = [...state.diagram.feedbacks];
    
    // Find all feedback pins actually used by contacts in the diagram
    const usedFeedbackPins = new Set();
    state.diagram.components.forEach(comp => {
        if ((comp.type === 'NO_CONTACT' || comp.type === 'NC_CONTACT') && 
            comp.pin && comp.pin.startsWith('QF')) {
            usedFeedbackPins.add(comp.pin);
        }
    });
    
    // For each used feedback pin, ensure it exists in feedbacks array
    usedFeedbackPins.forEach(feedbackPin => {
        const existing = state.diagram.feedbacks.find(f => f.pin === feedbackPin);
        
        if (existing) {
            // Keep existing feedback with its custom label
        } else {
            // Create new feedback for this used pin
            const sourceOutputPin = feedbackPin.replace('QF', 'Q'); // QF1 -> Q1
            const output = state.diagram.outputs.find(o => o.pin === sourceOutputPin);
            
            const feedback = {
                id: generateId(),
                pin: feedbackPin,
                sourceOutputPin: sourceOutputPin,
                state: false,
                label: output && output.label ? `${output.label} (Feedback)` : 'Feedback'
            };
            state.diagram.feedbacks.push(feedback);
        }
    });
}

/**
 * Initialize timer instances for all timer components
 */
function initializeTimers() {
    state.diagram.timers = [];
    
    // Find all timer components
    const timerComponents = state.diagram.components.filter(c => 
        c.type === 'TON' || c.type === 'TOF' || c.type === 'TP'
    );
    
    timerComponents.forEach(comp => {
        const timer = {
            id: comp.id,
            type: comp.type,
            preset: comp.preset || 1000,  // Preset time in ms (default 1s)
            elapsed: 0,                    // Elapsed time in ms
            done: false,                   // Done bit (Q output)
            running: false,                // Timer is counting
            prevInput: false               // Previous input state for edge detection
        };
        state.diagram.timers.push(timer);
    });
}

/**
 * Update all timers based on scan cycle
 */
/**
 * Check if reset pin of a timer has current flow
 * Reset pin is at position (x, y+1) - bottom left of the 2-cell timer block
 */
function checkResetPinFlow(timerComponent) {
    const resetX = timerComponent.position.x;
    const resetY = timerComponent.position.y + 1;
    
    // Check if there's a component to the left of the reset pin that has current flow
    const leftComponent = state.diagram.components.find(c => 
        c.position.x === resetX - 1 && c.position.y === resetY
    );
    
    return leftComponent && leftComponent.hasCurrentFlow;
}

function updateTimers() {
    const deltaMs = state.simulation.scanCycleMs * state.simulation.speedMultiplier;
    
    state.diagram.timers.forEach(timer => {
        const component = state.diagram.components.find(c => c.id === timer.id);
        if (!component) return;
        
        // Get input state (whether component has current flow to it on top input)
        const inputActive = component.hasCurrentFlow || false;
        
        // Check if reset pin has current flow (bottom left pin at position.y + 1)
        const resetActive = checkResetPinFlow(component);
        component.resetHasFlow = resetActive;
        
        // If reset is active, reset the timer
        if (resetActive) {
            timer.running = false;
            timer.elapsed = 0;
            timer.done = false;
            component.state = false;
            return; // Skip normal timer logic when resetting
        }
        
        switch (timer.type) {
            case 'TON': // On-Delay: Turns on after input is on for preset time
                if (inputActive) {
                    if (!timer.running) {
                        timer.running = true;
                        timer.elapsed = 0;
                    }
                    timer.elapsed += deltaMs;
                    if (timer.elapsed >= timer.preset) {
                        timer.done = true;
                        component.state = true;  // Timer output ON
                    }
                } else {
                    timer.running = false;
                    timer.elapsed = 0;
                    timer.done = false;
                    component.state = false;  // Timer output OFF
                }
                break;
                
            case 'TOF': // Off-Delay: Turns off after input goes off for preset time
                if (inputActive) {
                    timer.running = false;
                    timer.elapsed = 0;
                    timer.done = true;
                    component.state = true;  // Output follows input when ON
                } else {
                    if (!timer.running) {
                        timer.running = true;
                        timer.elapsed = 0;
                    }
                    timer.elapsed += deltaMs;
                    if (timer.elapsed >= timer.preset) {
                        timer.done = false;
                        component.state = false;  // Timer output OFF after delay
                    } else {
                        component.state = true;  // Still ON during delay
                    }
                }
                break;
                
            case 'TP': // Pulse: Creates a pulse of preset duration on rising edge
                const risingEdge = inputActive && !timer.prevInput;
                
                if (risingEdge) {
                    timer.running = true;
                    timer.elapsed = 0;
                    timer.done = false;
                    component.state = true;  // Pulse starts
                }
                
                if (timer.running) {
                    timer.elapsed += deltaMs;
                    if (timer.elapsed >= timer.preset) {
                        timer.running = false;
                        timer.done = true;
                        component.state = false;  // Pulse ends
                    }
                }
                
                timer.prevInput = inputActive;
                break;
        }
    });
}

/**
 * Update feedback states based on output states
 * Called after evaluateLogic to sync QF with Q
 */
function updateFeedbackStates() {
    state.diagram.feedbacks.forEach(feedback => {
        const output = state.diagram.outputs.find(o => o.pin === feedback.sourceOutputPin);
        if (output) {
            feedback.state = output.state;
        }
    });
    
    // Update contacts that use feedback pins
    state.diagram.feedbacks.forEach(feedback => {
        const feedbackContacts = state.diagram.components.filter(c => 
            (c.type === 'NO_CONTACT' || c.type === 'NC_CONTACT') && 
            c.pin === feedback.pin
        );
        
        feedbackContacts.forEach(contact => {
            if (contact.type === 'NO_CONTACT') {
                contact.state = feedback.state;
            } else if (contact.type === 'NC_CONTACT') {
                contact.state = !feedback.state; // NC is inverted
            }
        });
    });
}

function toggleRunPause() {
    if (!state.ui.isSimulationRunning) {
        // Start simulation
        startSimulation();
    } else if (state.ui.isPaused) {
        // Resume simulation
        resumeSimulation();
    } else {
        // Pause simulation
        pauseSimulation();
    }
}

function startSimulation() {
    state.ui.isSimulationRunning = true;
    state.ui.isPaused = false;
    state.simulation.timeElapsed = 0;  // Reset simulated time
    
    elements.runPauseBtn.innerHTML = '⏸️ Pause';
    elements.runPauseBtn.classList.remove('btn-success');
    elements.runPauseBtn.classList.add('btn-warning');
    elements.statusDot.className = 'status-dot status-running';
    elements.statusText.textContent = 'Running';
    
    // Initialize feedback states and timers
    initializeFeedbacks();
    initializeTimers();
    
    // Sync all contact states with their input states before starting
    syncContactStates();
    
    // Trace initial current flow
    traceCurrentFlow();
    
    // Run first evaluation immediately to show initial state
    evaluateLogic();
    updateOutputs();
    renderGrid();
    updateUI();
    
    // Start timer-based scan cycle
    startScanCycleTimer();
}

function pauseSimulation() {
    state.ui.isPaused = true;
    stopScanCycleTimer();
    
    elements.runPauseBtn.innerHTML = '▶️ Resume';
    elements.runPauseBtn.classList.remove('btn-warning');
    elements.runPauseBtn.classList.add('btn-success');
    elements.statusDot.className = 'status-dot status-stopped';
    elements.statusText.textContent = 'Paused';
}

function resumeSimulation() {
    state.ui.isPaused = false;
    state.simulation.startTime = Date.now() - (state.simulation.timeElapsed * 1000);
    
    elements.runPauseBtn.innerHTML = '⏸️ Pause';
    elements.runPauseBtn.classList.remove('btn-success');
    elements.runPauseBtn.classList.add('btn-warning');
    elements.statusDot.className = 'status-dot status-running';
    elements.statusText.textContent = 'Running';
    
    startScanCycleTimer();
}

function resetSimulation() {
    state.ui.isSimulationRunning = false;
    state.ui.isPaused = false;
    state.simulation.timeElapsed = 0;
    state.simulation.startTime = null;
    state.simulation.scanCount = 0;
    
    // Stop timer
    stopScanCycleTimer();
    
    // Reset all timers
    state.diagram.timers.forEach(timer => {
        timer.elapsed = 0;
        timer.done = false;
        timer.running = false;
    });
    
    // Clear all current flow AND component states
    state.diagram.components.forEach(comp => {
        comp.hasCurrentFlow = false;
        comp.state = false; // Reset all contacts to OFF/de-energized
    });
    
    // Reset all inputs to OFF
    state.diagram.inputs.forEach(input => {
        input.state = false;
    });
    
    // Reset all outputs to OFF
    state.diagram.outputs.forEach(output => {
        output.state = false;
    });
    
    // Reset all feedbacks to OFF
    state.diagram.feedbacks.forEach(feedback => {
        feedback.state = false;
    });
    
    elements.runPauseBtn.innerHTML = '▶️ Run';
    elements.runPauseBtn.classList.remove('btn-warning');
    elements.runPauseBtn.classList.add('btn-success');
    elements.statusDot.className = 'status-dot status-stopped';
    elements.statusText.textContent = 'Stopped';
    elements.timeElapsedDisplay.textContent = '0.00s';
    
    // Re-render to remove glow
    renderGrid();
    updateUI();
}

function startScanCycleTimer() {
    // Clear existing timer if any
    stopScanCycleTimer();
    
    // Calculate effective scan cycle with speed multiplier
    const effectiveCycleMs = state.simulation.scanCycleMs / state.simulation.speedMultiplier;
    
    // Start interval timer
    state.simulation.intervalId = setInterval(() => {
        if (state.ui.isSimulationRunning && !state.ui.isPaused) {
            scanCycle();
        }
    }, effectiveCycleMs);
}

function stopScanCycleTimer() {
    if (state.simulation.intervalId) {
        clearInterval(state.simulation.intervalId);
        state.simulation.intervalId = null;
    }
}

function scanCycle() {
    // Update elapsed time (simulated time, affected by speed multiplier)
    const deltaMs = state.simulation.scanCycleMs * state.simulation.speedMultiplier;
    state.simulation.timeElapsed += deltaMs / 1000;
    elements.timeElapsedDisplay.textContent = state.simulation.timeElapsed.toFixed(2) + 's';
    
    // Update timers
    updateTimers();
    
    // Normal scan cycle - trace current flow and evaluate logic
    traceCurrentFlow();
    evaluateLogic();
    updateOutputs();
    renderGrid();
    updateUI();
    
    state.simulation.scanCount++;
}

function updateScanCycle() {
    const newCycle = parseInt(elements.scanCycleInput.value);
    if (newCycle >= 10 && newCycle <= 5000) {
        state.simulation.scanCycleMs = newCycle;
        // Restart timer if simulation is running
        if (state.ui.isSimulationRunning && !state.ui.isPaused) {
            startScanCycleTimer();
        }
    }
}

function updateSpeedMultiplier() {
    state.simulation.speedMultiplier = parseFloat(elements.speedMultiplierSelect.value);
    // Restart timer if simulation is running
    if (state.ui.isSimulationRunning && !state.ui.isPaused) {
        startScanCycleTimer();
    }
}

/**
 * Trace current flow through the circuit
 * Makes wires glow when current is flowing through them
 */
function traceCurrentFlow() {
    // Step 1: Reset all components - no current by default
    state.diagram.components.forEach(comp => {
        comp.hasCurrentFlow = false;
    });
    
    // Step 2: Start from L+ (leftmost column, x=0 or x=1)
    // Find all components at x=0 or x=1 (directly connected to L+)
    const lPlusComponents = state.diagram.components.filter(c => c.position.x <= 1);
    
    // Step 3: Trace from each L+ component
    lPlusComponents.forEach(startComp => {
        traceFromComponent(startComp, 'right');
    });
}

/**
 * Recursively trace current flow from a component
 * @param {Object} component - Starting component
 * @param {String} direction - Direction to trace: 'right', 'down', 'up', 'left'
 */
function traceFromComponent(component, direction) {
    if (!component) return;
    
    // Mark this component as having current
    component.hasCurrentFlow = true;
    
    const x = component.position.x;
    const y = component.position.y;
    const type = component.type;
    
    // If we hit a contact, check if current can pass through
    if (type === 'NO_CONTACT') {
        // NO Contact: component.state = true means input is ON, contact conducts
        if (!component.state) {
            // Contact is open - stop tracing
            return;
        }
        // Contact is closed - continue tracing
        traceInDirection(x, y, 'right');
        return;
    }
    
    if (type === 'NC_CONTACT') {
        // NC Contact: component.state is INVERTED (state=true means input OFF, contact conducts)
        if (!component.state) {
            // Contact is open - stop tracing
            return;
        }
        // Contact is closed - continue tracing
        traceInDirection(x, y, 'right');
        return;
    }
    
    // If we hit a timer, check if it conducts (acts like a contact)
    if (type === 'TON' || type === 'TOF' || type === 'TP') {
        // Timer acts like a contact - conducts when state is true (done bit)
        if (!component.state) {
            // Timer not done - stop tracing
            return;
        }
        // Timer done - continue tracing
        traceInDirection(x, y, 'right');
        return;
    }
    
    // If we hit an output coil, mark it and continue
    if (type === 'OUTPUT_COIL') {
        // Current continues through coil to N
        traceInDirection(x, y, 'right');
        return;
    }
    
    // For wires and branches, continue tracing in appropriate directions
    if (type === 'HORIZONTAL_WIRE') {
        // Continue horizontally
        if (direction === 'right' || direction === 'left') {
            traceInDirection(x, y, direction);
        }
        return;
    }
    
    if (type === 'VERTICAL_WIRE') {
        // Continue vertically
        if (direction === 'down' || direction === 'up') {
            traceInDirection(x, y, direction);
        }
        return;
    }
    
    if (type === 'BRANCH_POINT') {
        // Branch splits current - trace right (main path) and down (branch path)
        traceInDirection(x, y, 'right'); // Main horizontal path
        traceInDirection(x, y, 'down');  // Branch down
        return;
    }
    
    if (type === 'CORNER_DOWN_RIGHT') {
        // └ corner (L1): vertical from top, horizontal to right
        // Current coming down -> turns right
        // Current coming from left -> goes down (not typical, but handle it)
        if (direction === 'down') {
            traceInDirection(x, y, 'right');
        } else if (direction === 'left') {
            traceInDirection(x, y, 'down');
        }
        return;
    }
    
    if (type === 'CORNER_DOWN_LEFT') {
        // ┘ corner (L2): horizontal from right, vertical up
        // Current coming right -> turns up
        // Current coming down -> goes left
        if (direction === 'right') {
            traceInDirection(x, y, 'up');
        } else if (direction === 'down') {
            traceInDirection(x, y, 'left');
        }
        return;
    }
    
    if (type === 'CORNER_UP_RIGHT') {
        // ┌ corner: vertical down, horizontal right
        // Current coming up -> turns right
        // Current coming left -> goes up
        if (direction === 'up') {
            traceInDirection(x, y, 'right');
        } else if (direction === 'left') {
            traceInDirection(x, y, 'up');
        }
        return;
    }
    
    if (type === 'CORNER_UP_LEFT') {
        // ┐ corner: horizontal from right, vertical down
        // Current coming right -> turns down
        // Current coming up -> goes left
        if (direction === 'right') {
            traceInDirection(x, y, 'down');
        } else if (direction === 'up') {
            traceInDirection(x, y, 'left');
        }
        return;
    }
}

/**
 * Find next component in a direction and trace from it
 */
function traceInDirection(x, y, direction) {
    let nextX = x;
    let nextY = y;
    
    switch (direction) {
        case 'right':
            nextX = x + 1;
            break;
        case 'left':
            nextX = x - 1;
            break;
        case 'down':
            nextY = y + 1;
            break;
        case 'up':
            nextY = y - 1;
            break;
    }
    
    // Find component at next position
    const nextComp = state.diagram.components.find(c =>
        c.position.x === nextX && c.position.y === nextY
    );
    
    if (nextComp && !nextComp.hasCurrentFlow) {
        // Only trace if we haven't been here before (prevent infinite loops)
        traceFromComponent(nextComp, direction);
    }
}

function evaluateLogic() {
    // Get all output coils
    const outputs = state.diagram.components.filter(c => c.type === 'OUTPUT_COIL');
    
    if (outputs.length === 0) {
        return;
    }
    
    // For each output coil, set its state based on whether it has current flow
    // This is the correct PLC behavior: output is ON only if there's a complete electrical path from L+ to N
    outputs.forEach(output => {
        if (output.pin === null) {
            output.state = false;
            return;
        }
        
        // Output state is determined by current flow (requires complete path from L+ through coil to N)
        const hasCurrentFlow = output.hasCurrentFlow || false;
        output.state = hasCurrentFlow;
    });
    
    // Update output objects from component states (sync state.diagram.outputs with coil components)
    updateOutputsFromComponents();
    
    // Update feedback states to match output states (AFTER output objects are synced)
    updateFeedbackStates();
}

/**
 * Evaluate a boolean formula string with current input states
 * Formula uses I1, I2, !I3 notation
 * Returns true/false based on current input states
 */
function evaluateFormula(formula) {
    if (!formula || formula === 'true') return true;
    if (formula === 'false') return false;
    
    // Build evaluation context with current input states and feedback states
    const context = {};
    
    // Add all inputs to context
    state.diagram.inputs.forEach(input => {
        const varName = input.pin;
        context[varName] = input.state;
    });
    
    // Add all feedbacks to context (QF1, QF2, etc.)
    if (state.diagram.feedbacks) {
        state.diagram.feedbacks.forEach(feedback => {
            const varName = feedback.pin;
            context[varName] = feedback.state;
        });
    }
    
    // Replace !I and !Q notation with NOT operator
    // Convert: !I1 -> !context.I1, !QF1 -> !context.QF1
    let jsFormula = formula.replace(/!(I|Q|QF)(\d+)/g, '!context.$1$2');
    
    // Convert: I1 -> context.I1, QF1 -> context.QF1 (but not already prefixed)
    jsFormula = jsFormula.replace(/(?<!context\.)(I|Q|QF)(\d+)/g, 'context.$1$2');
    
    // Convert && and || to JavaScript operators (already correct)
    // Formula is now ready to evaluate
    
    try {
        // Use Function constructor instead of eval for better security
        const evalFunc = new Function('context', `return ${jsFormula}`);
        const result = evalFunc(context);
        return Boolean(result);
    } catch (error) {
        console.error('❌ Formula evaluation error:', error);
        console.error('   Formula:', formula);
        console.error('   JS Formula:', jsFormula);
        console.error('   Context:', context);
        return false;
    }
}

/**
 * Update output objects from component states
 */
function updateOutputsFromComponents() {
    state.diagram.outputs.forEach(outputObj => {
        const component = state.diagram.components.find(c => 
            c.type === 'OUTPUT_COIL' && 
            c.pin === outputObj.pin
        );
        if (component) {
            outputObj.state = component.state;
        }
    });
}

function checkAndLogStateChanges() {
    // Create current state snapshot
    const currentState = {
        inputs: state.diagram.inputs.map(i => ({ id: i.id, state: i.state })),
        outputs: state.diagram.outputs.map(o => ({ id: o.id, state: o.state })),
        components: state.diagram.components.map(c => ({ id: c.id, state: c.state }))
    };
    
    // Compare with last logged state
    const stateChanged = hasStateChanged(state.simulation.lastLoggedState, currentState);
    
    if (stateChanged) {
        logDiagramAnalysis();
        state.simulation.lastLoggedState = currentState;
    }
}

function hasStateChanged(lastState, currentState) {
    // First run - no previous state
    if (!lastState) {
        return true;
    }
    
    // Check if any input changed
    for (let i = 0; i < currentState.inputs.length; i++) {
        const current = currentState.inputs[i];
        const last = lastState.inputs.find(inp => inp.id === current.id);
        if (!last || last.state !== current.state) {
            return true;
        }
    }
    
    // Check if any output changed
    for (let i = 0; i < currentState.outputs.length; i++) {
        const current = currentState.outputs[i];
        const last = lastState.outputs.find(out => out.id === current.id);
        if (!last || last.state !== current.state) {
            return true;
        }
    }
    
    // Check if any component changed
    for (let i = 0; i < currentState.components.length; i++) {
        const current = currentState.components[i];
        const last = lastState.components.find(comp => comp.id === current.id);
        if (!last || last.state !== current.state) {
            return true;
        }
    }
    
    // No changes detected
    return false;
}

function logDiagramAnalysis() {
    const timestamp = new Date().toLocaleTimeString();
    
    console.clear();
    console.log('%c╔════════════════════════════════════════════════════════════╗', 'color: #2196F3; font-weight: bold;');
    console.log('%c║         PLC LADDER DIAGRAM - SIMULATION ANALYSIS          ║', 'color: #2196F3; font-weight: bold;');
    console.log('%c╚════════════════════════════════════════════════════════════╝', 'color: #2196F3; font-weight: bold;');
    console.log('');
    console.log(`%c🔄 STATE CHANGE DETECTED at ${timestamp}`, 'color: #FF9800; font-weight: bold;');
    console.log('');
    
    // Diagram Overview
    console.log('%c## DIAGRAM OVERVIEW', 'color: #4CAF50; font-weight: bold; font-size: 14px;');
    console.log('');
    console.log(`**Name:** ${state.diagram.metadata.name}`);
    console.log(`**Grid:** ${CONFIG.grid.columns} columns × ${CONFIG.grid.rows} rows`);
    console.log(`**Total Components:** ${state.diagram.components.length}`);
    console.log(`**Inputs Defined:** ${state.diagram.inputs.length}`);
    console.log(`**Outputs Defined:** ${state.diagram.outputs.length}`);
    console.log(`**Scan Count:** ${state.simulation.scanCount}`);
    console.log('');
    
    // Input States
    console.log('%c## INPUT STATES', 'color: #FF9800; font-weight: bold; font-size: 14px;');
    console.log('');
    if (state.diagram.inputs.length === 0) {
        console.log('*No inputs defined*');
    } else {
        state.diagram.inputs.forEach(input => {
            const stateIcon = input.state ? '🟢 ON' : '⚫ OFF';
            
            // Find all contacts using this input pin to determine types
            const contactsUsingThisPin = state.diagram.components.filter(c => 
                (c.type === 'NO_CONTACT' || c.type === 'NC_CONTACT') && 
                c.pin === input.pin
            );
            
            const contactTypes = [];
            const hasNO = contactsUsingThisPin.some(c => c.type === 'NO_CONTACT');
            const hasNC = contactsUsingThisPin.some(c => c.type === 'NC_CONTACT');
            
            if (hasNO) contactTypes.push('NO');
            if (hasNC) contactTypes.push('NC');
            
            const typeDisplay = contactTypes.length > 0 ? ` [${contactTypes.join('/')}]` : '';
            
            console.log(`**${input.pin}** (${input.label})${typeDisplay}: ${stateIcon} [${input.state}]`);
        });
    }
    console.log('');
    
    // Output States
    console.log('%c## OUTPUT STATES', 'color: #F44336; font-weight: bold; font-size: 14px;');
    console.log('');
    if (state.diagram.outputs.length === 0) {
        console.log('*No outputs defined*');
    } else {
        state.diagram.outputs.forEach(output => {
            const stateIcon = output.state ? '🟢 ON' : '⚫ OFF';
            console.log(`**${output.pin}** (${output.label}): ${stateIcon} [${output.state}]`);
        });
    }
    console.log('');
    
    // Component List by Row
    console.log('%c## COMPONENT LAYOUT', 'color: #9C27B0; font-weight: bold; font-size: 14px;');
    console.log('');
    
    for (let row = 0; row < CONFIG.grid.rows; row++) {
        const rowComponents = state.diagram.components.filter(c => c.position.y === row);
        if (rowComponents.length === 0) continue;
        
        rowComponents.sort((a, b) => a.position.x - b.position.x);
        
        console.log(`%c### Row ${row}`, 'color: #00BCD4; font-weight: bold;');
        console.log('');
        console.log('```');
        let rowDiagram = '[L+]─';
        
        let lastX = -1;
        rowComponents.forEach(comp => {
            // Add spacing for gaps
            const gap = comp.position.x - lastX - 1;
            if (gap > 0) {
                rowDiagram += '─'.repeat(gap * 3);
            }
            
            const typeInfo = COMPONENT_TYPES[comp.type];
            const symbol = typeInfo.symbol;
            const stateIcon = comp.state ? '✓' : '✗';
            
            rowDiagram += `[${symbol}]`;
            lastX = comp.position.x;
        });
        
        rowDiagram += '─[N]';
        console.log(rowDiagram);
        console.log('```');
        console.log('');
        
        // Component details
        console.log('| Pos | Type | Label | Pin | State |');
        console.log('|-----|------|-------|-----|-------|');
        rowComponents.forEach(comp => {
            const typeInfo = COMPONENT_TYPES[comp.type];
            const pos = `(${comp.position.x}, ${comp.position.y})`;
            const label = comp.label || '-';
            const pin = comp.pin !== null ? comp.pin : '-';
            const stateStr = comp.state ? '🟢 ON' : '⚫ OFF';
            console.log(`| ${pos} | ${comp.type} | ${label} | ${pin} | ${stateStr} |`);
        });
        console.log('');
    }
    
    // Logic Evaluation
    console.log('%c## LOGIC EVALUATION', 'color: #4CAF50; font-weight: bold; font-size: 14px;');
    console.log('');
    
    generateLogicCode();
    
    console.log('');
    console.log('%c' + '─'.repeat(60), 'color: #607D8B;');
    console.log('');
}

function generateLogicCode() {
    console.log('```javascript');
    console.log('// Generated Ladder Logic Code');
    console.log('function executeLadderLogic() {');
    console.log('    // Input values');
    
    state.diagram.inputs.forEach(input => {
        console.log(`    const ${input.pin} = ${input.state}; // ${input.label}`);
    });
    console.log('');
    
    // Declare feedback variables
    console.log('    // Feedback values (from previous cycle)');
    if (state.diagram.feedbacks && state.diagram.feedbacks.length > 0) {
        state.diagram.feedbacks.forEach(feedback => {
            console.log(`    let ${feedback.pin} = ${feedback.state}; // ${feedback.label}`);
        });
    } else {
        console.log('    // (No feedbacks initialized)');
    }
    console.log('');
    
    // Analyze the diagram to detect branches and paths
    const outputRowsMap = new Map(); // Map output pins to their logic expressions
    
    // Find all outputs and trace back to find all paths
    for (let row = 0; row < CONFIG.grid.rows; row++) {
        const rowComponents = state.diagram.components.filter(c => c.position.y === row);
        if (rowComponents.length === 0) continue;
        
        const outputs = rowComponents.filter(c => c.type === 'OUTPUT_COIL');
        if (outputs.length === 0) continue;
        
        outputs.forEach(output => {
            if (output.pin === null) return;
            
            // Use V2 algorithm (Loop Detection)
            console.log('🔄 Using Analysis V2 (Loop Detection)');
            const branches = detectBranchesV2(output, state.diagram.components, CONFIG.grid.rows);
            
            if (!outputRowsMap.has(output.pin)) {
                outputRowsMap.set(output.pin, []);
            }
            outputRowsMap.get(output.pin).push({
                row: row,
                branches: branches,
                label: output.label || 'Output'
            });
        });
    }
    
    // Generate code for each output
    outputRowsMap.forEach((pathsData, outputPin) => {
        console.log(`    // Output ${outputPin}`);
        
        // Combine all paths with OR logic
        const allConditions = [];
        
        pathsData.forEach(pathData => {
            if (pathData.branches.length > 0) {
                // Each branch array contains either:
                // - An array with a single string (the complete expression)
                // - An array of condition strings (to be AND'ed)
                pathData.branches.forEach(branchConditions => {
                    if (Array.isArray(branchConditions) && branchConditions.length > 0) {
                        if (branchConditions.length === 1 && typeof branchConditions[0] === 'string') {
                            // Single string = complete expression, use as-is
                            allConditions.push(branchConditions[0]);
                        } else {
                            // Multiple conditions = AND them together
                            const condition = branchConditions.join(' && ');
                            if (condition) allConditions.push(condition);
                        }
                    }
                });
            }
        });
        
        // If multiple conditions, they represent different paths (OR logic between paths)
        let finalCondition;
        if (allConditions.length === 0) {
            finalCondition = 'false';
        } else if (allConditions.length === 1) {
            finalCondition = allConditions[0];
        } else {
            // Multiple paths means OR logic
            finalCondition = allConditions.join(' || ');
        }
        
        // Generate the feedback pin name (Q1 -> QF1, Q2 -> QF2, etc.)
        const feedbackPin = outputPin.replace('Q', 'QF');
        
        console.log(`    if (${finalCondition}) {`);
        console.log(`        ${outputPin} = true;`);
        console.log(`        ${feedbackPin} = true;  // Feedback follows output`);
        console.log(`    } else {`);
        console.log(`        ${outputPin} = false;`);
        console.log(`        ${feedbackPin} = false;`);
        console.log(`    }`);
        console.log('');
    });
    
    console.log('    // Output results');
    state.diagram.outputs.forEach(output => {
        const stateStr = output.state ? 'ON' : 'OFF';
        console.log(`    console.log("${output.pin} (${output.label}): " + ${output.pin} + " [${stateStr}]");`);
    });
    
    console.log('');
    console.log('    // Feedback results');
    if (state.diagram.feedbacks && state.diagram.feedbacks.length > 0) {
        state.diagram.feedbacks.forEach(feedback => {
            const stateStr = feedback.state ? 'ON' : 'OFF';
            console.log(`    console.log("${feedback.pin} (${feedback.label}): " + ${feedback.pin} + " [${stateStr}]");`);
        });
    }
    
    console.log('}');
    console.log('```');
    console.log('');
    
    // Show actual evaluation
    console.log('%c### Actual Evaluation Results:', 'color: #FF9800; font-weight: bold;');
    console.log('');
    
    for (let row = 0; row < CONFIG.grid.rows; row++) {
        const rowComponents = state.diagram.components.filter(c => c.position.y === row);
        if (rowComponents.length === 0) continue;
        
        rowComponents.sort((a, b) => a.position.x - b.position.x);
        
        const contacts = rowComponents.filter(c => COMPONENT_TYPES[c.type]?.isInput);
        const outputs = rowComponents.filter(c => COMPONENT_TYPES[c.type]?.isOutput);
        
        if (contacts.length > 0 || outputs.length > 0) {
            let evaluations = [];
            let result = true;
            
            contacts.forEach(contact => {
                if (contact.pin !== null) {
                    // Determine if this is a real input or feedback from output
                    const isInputPin = state.diagram.inputs.find(inp => inp.pin === contact.pin);
                    const isOutputFeedback = state.diagram.outputs.find(out => out.pin === contact.pin);
                    
                    let sourceType = '';
                    let pinLabel = contact.pin;
                    
                    if (isInputPin) {
                        sourceType = 'Input';
                    } else if (isOutputFeedback) {
                        sourceType = 'Output Feedback';
                    } else {
                        sourceType = 'Unassigned';
                    }
                    
                    let inputValue = contact.state;
                    let conducts = false;
                    let contactType = '';
                    
                    if (contact.type === 'NO_CONTACT') {
                        contactType = 'NO';
                        conducts = inputValue;
                        const label = contact.label || pinLabel;
                        evaluations.push(`${label}=${inputValue ? 'ON' : 'OFF'} [${contactType} ${sourceType}] → ${conducts ? '✅ CONDUCTS' : '❌ BLOCKS'}`);
                        result = result && conducts;
                    } else if (contact.type === 'NC_CONTACT') {
                        contactType = 'NC';
                        conducts = !inputValue;
                        const label = contact.label || pinLabel;
                        evaluations.push(`${label}=${inputValue ? 'ON' : 'OFF'} [${contactType} ${sourceType}] → ${conducts ? '✅ CONDUCTS' : '❌ BLOCKS'}`);
                        result = result && conducts;
                    }
                }
            });
            
            if (evaluations.length > 0) {
                console.log(`**Row ${row} Evaluation:**`);
                evaluations.forEach((evaluation, idx) => {
                    console.log(`  ${idx + 1}. ${evaluation}`);
                });
                console.log(`**Combined Logic:** ${evaluations.length > 1 ? evaluations.map((e, i) => `Contact${i+1}`).join(' AND ') : 'Single Contact'}`);
                console.log(`**Result:** ${result ? '✅ ROW ENERGIZED' : '❌ ROW NOT ENERGIZED'}`);
                
                outputs.forEach(output => {
                    if (output.pin !== null) {
                        console.log(`**→ ${output.pin}** (${output.label || 'Output'}): ${result ? '🟢 ON' : '⚫ OFF'}`);
                    }
                });
                console.log('');
            }
        }
    }
}

function updateOutputs() {
    // Update output states based on linked output coils
    state.diagram.outputs.forEach(output => {
        output.state = false;
        
        output.componentIds.forEach(compId => {
            const component = state.diagram.components.find(c => c.id === compId);
            if (component && component.state) {
                output.state = true;
            }
        });
    });
}

