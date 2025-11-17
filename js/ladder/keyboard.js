// ===== Keyboard Shortcuts =====

// ===== Keyboard Shortcuts =====
function handleKeyboardShortcuts(e) {
    // Detect if Mac (Cmd) or Windows/Linux (Ctrl)
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifier = isMac ? e.metaKey : e.ctrlKey;
    
    // Don't trigger shortcuts when typing in input fields
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    // Don't trigger ladder shortcuts when in 3D wire mode
    if (window.viewer3D && window.viewer3D.wireMode) return;
    
    // Copy: Cmd/Ctrl + C
    if (modifier && e.key === 'c') {
        e.preventDefault();
        copyComponent();
        return;
    }
    
    // Cut: Cmd/Ctrl + X
    if (modifier && e.key === 'x') {
        e.preventDefault();
        cutComponent();
        return;
    }
    
    // Paste: Cmd/Ctrl + V
    if (modifier && e.key === 'v') {
        e.preventDefault();
        pasteComponent();
        return;
    }
    
    // Undo: Cmd/Ctrl + Z (without Shift)
    if (modifier && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
    }
    
    // Redo: Cmd/Ctrl + Shift + Z
    if (modifier && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        redo();
        return;
    }
    
    // Delete: Delete or Backspace key
    if ((e.key === 'Delete' || e.key === 'Backspace') && state.ui.selectedComponent) {
        e.preventDefault();
        deleteSelectedComponent();
        return;
    }
    
    // ESC: Deselect component and deactivate tool
    if (e.key === 'Escape') {
        e.preventDefault();
        deselectAndDeactivate();
        return;
    }
}

function deselectAndDeactivate() {
    // Deselect any selected component
    state.ui.selectedComponent = null;
    
    // Deactivate any selected component type (return to select mode)
    state.ui.selectedComponentType = null;
    state.ui.mode = 'select';
    
    // Remove active state from all component buttons
    document.querySelectorAll('.component-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Activate select tool button
    elements.selectToolBtn.classList.add('active');
    elements.deleteToolBtn.classList.remove('active');
    
    // Update UI
    renderGrid();
    updateUI();
    
    console.log('Component deselected and tool deactivated');
}

function copyComponent() {
    if (!state.ui.selectedComponent) {
        console.log('No component selected to copy');
        return;
    }
    
    // Deep clone the component
    state.clipboard.component = JSON.parse(JSON.stringify(state.ui.selectedComponent));
    console.log('Component copied:', state.clipboard.component.type);
}

function cutComponent() {
    if (!state.ui.selectedComponent) {
        console.log('No component selected to cut');
        return;
    }
    
    // Copy then delete
    copyComponent();
    deleteSelectedComponent();
    console.log('Component cut');
}

function pasteComponent() {
    if (!state.clipboard.component) {
        console.log('No component in clipboard');
        return;
    }
    
    // Get current mouse position or use a default position
    const rect = elements.canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const gridPos = screenToGrid(centerX, centerY);
    
    // Find an empty position near the center
    let targetPos = findEmptyPosition(gridPos.x, gridPos.y);
    
    if (!targetPos) {
        console.log('No empty space to paste component');
        return;
    }
    
    saveHistory();
    
    // Create new component from clipboard with new ID and position
    const newComponent = JSON.parse(JSON.stringify(state.clipboard.component));
    newComponent.id = generateId();
    newComponent.position = targetPos;
    newComponent.hasCurrentFlow = false;
    newComponent.state = false;
    
    state.diagram.components.push(newComponent);
    
    // If it has a pin assignment, create corresponding input/output/feedback/timer
    if (newComponent.pin) {
        const componentType = newComponent.type;
        
        if (componentType === 'NO_CONTACT' || componentType === 'NC_CONTACT') {
            // Check if it's a feedback
            const existingFeedback = state.diagram.feedbacks.find(f => f.pin === newComponent.pin);
            if (existingFeedback) {
                existingFeedback.componentIds.push(newComponent.id);
            } else {
                // Check if it's an input
                const existingInput = state.diagram.inputs.find(i => i.pin === newComponent.pin);
                if (existingInput) {
                    existingInput.componentIds.push(newComponent.id);
                }
            }
        } else if (componentType === 'OUTPUT_COIL') {
            const existingOutput = state.diagram.outputs.find(o => o.pin === newComponent.pin);
            if (existingOutput) {
                existingOutput.componentIds.push(newComponent.id);
            }
        } else if (componentType === 'TON' || componentType === 'TOF' || componentType === 'TP') {
            // Copy timer data
            const existingTimer = state.diagram.timers.find(t => t.componentId === state.clipboard.component.id);
            if (existingTimer) {
                const newTimer = JSON.parse(JSON.stringify(existingTimer));
                newTimer.componentId = newComponent.id;
                newTimer.elapsed = 0;
                newTimer.done = false;
                newTimer.running = false;
                state.diagram.timers.push(newTimer);
            }
        }
    }
    
    state.ui.selectedComponent = newComponent;
    renderGrid();
    updateUI();
    console.log('Component pasted at:', targetPos);
}

function deleteSelectedComponent() {
    if (!state.ui.selectedComponent) return;
    
    saveHistory();
    
    const comp = state.ui.selectedComponent;
    const pos = comp.position;
    
    // Remove from components array
    state.diagram.components = state.diagram.components.filter(c => c.id !== comp.id);
    
    // Remove from inputs/outputs/feedbacks/timers
    state.diagram.inputs.forEach(input => {
        input.componentIds = input.componentIds.filter(id => id !== comp.id);
    });
    state.diagram.outputs.forEach(output => {
        output.componentIds = output.componentIds.filter(id => id !== comp.id);
    });
    state.diagram.feedbacks.forEach(feedback => {
        feedback.componentIds = feedback.componentIds.filter(id => id !== comp.id);
    });
    state.diagram.timers = state.diagram.timers.filter(t => t.componentId !== comp.id);
    
    // Clean up empty inputs/outputs/feedbacks
    state.diagram.inputs = state.diagram.inputs.filter(i => i.componentIds.length > 0);
    state.diagram.outputs = state.diagram.outputs.filter(o => o.componentIds.length > 0);
    state.diagram.feedbacks = state.diagram.feedbacks.filter(f => f.componentIds.length > 0);
    
    state.ui.selectedComponent = null;
    renderGrid();
    updateUI();
}

function findEmptyPosition(startX, startY) {
    // Try the starting position first
    if (!getComponentAt(startX, startY)) {
        return { x: startX, y: startY };
    }
    
    // Search in a spiral pattern around the starting position
    for (let radius = 1; radius <= 5; radius++) {
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
                const x = startX + dx;
                const y = startY + dy;
                if (isValidGridPosition({ x, y }) && !getComponentAt(x, y)) {
                    return { x, y };
                }
            }
        }
    }
    
    return null; // No empty space found
}

// ===== Undo/Redo Functions =====
function saveHistory() {
    // Deep clone current diagram state
    const stateCopy = {
        components: JSON.parse(JSON.stringify(state.diagram.components)),
        inputs: JSON.parse(JSON.stringify(state.diagram.inputs)),
        outputs: JSON.parse(JSON.stringify(state.diagram.outputs)),
        feedbacks: JSON.parse(JSON.stringify(state.diagram.feedbacks)),
        timers: JSON.parse(JSON.stringify(state.diagram.timers))
    };
    
    state.history.undoStack.push(stateCopy);
    
    // Limit history size
    if (state.history.undoStack.length > state.history.maxHistory) {
        state.history.undoStack.shift();
    }
    
    // Clear redo stack when new action is performed
    state.history.redoStack = [];
}

function undo() {
    if (state.history.undoStack.length === 0) {
        console.log('Nothing to undo');
        return;
    }
    
    // Save current state to redo stack
    const currentState = {
        components: JSON.parse(JSON.stringify(state.diagram.components)),
        inputs: JSON.parse(JSON.stringify(state.diagram.inputs)),
        outputs: JSON.parse(JSON.stringify(state.diagram.outputs)),
        feedbacks: JSON.parse(JSON.stringify(state.diagram.feedbacks)),
        timers: JSON.parse(JSON.stringify(state.diagram.timers))
    };
    state.history.redoStack.push(currentState);
    
    // Restore previous state
    const previousState = state.history.undoStack.pop();
    state.diagram.components = previousState.components;
    state.diagram.inputs = previousState.inputs;
    state.diagram.outputs = previousState.outputs;
    state.diagram.feedbacks = previousState.feedbacks;
    state.diagram.timers = previousState.timers;
    
    state.ui.selectedComponent = null;
    renderGrid();
    updateUI();
    console.log('Undo performed');
}

function redo() {
    if (state.history.redoStack.length === 0) {
        console.log('Nothing to redo');
        return;
    }
    
    // Save current state to undo stack
    const currentState = {
        components: JSON.parse(JSON.stringify(state.diagram.components)),
        inputs: JSON.parse(JSON.stringify(state.diagram.inputs)),
        outputs: JSON.parse(JSON.stringify(state.diagram.outputs)),
        feedbacks: JSON.parse(JSON.stringify(state.diagram.feedbacks)),
        timers: JSON.parse(JSON.stringify(state.diagram.timers))
    };
    state.history.undoStack.push(currentState);
    
    // Restore next state
    const nextState = state.history.redoStack.pop();
    state.diagram.components = nextState.components;
    state.diagram.inputs = nextState.inputs;
    state.diagram.outputs = nextState.outputs;
    state.diagram.feedbacks = nextState.feedbacks;
    state.diagram.timers = nextState.timers;
    
    state.ui.selectedComponent = null;
    renderGrid();
    updateUI();
    console.log('Redo performed');
}

