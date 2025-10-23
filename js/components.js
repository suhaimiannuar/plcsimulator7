// ===== Component Management =====

// ===== Component Management =====
function placeComponent(gridPos) {
    saveHistory(); // Save state before placing component
    
    // Check if cell is occupied
    const existing = getComponentAt(gridPos.x, gridPos.y);
    if (existing) {
        // Replace existing component
        const index = state.diagram.components.indexOf(existing);
        if (index > -1) {
            state.diagram.components.splice(index, 1);
            
            // Remove from inputs/outputs if applicable
            state.diagram.inputs = state.diagram.inputs.filter(i => !i.componentIds.includes(existing.id));
            state.diagram.outputs = state.diagram.outputs.filter(o => !o.componentIds.includes(existing.id));
        }
    }
    
    // Create component
    const component = {
        id: generateId(),
        type: state.ui.selectedComponentType,
        position: { x: gridPos.x, y: gridPos.y },
        pin: null,
        label: '',
        state: false,
        metadata: {}
    };
    
    // For timers, add preset time (default 1000ms = 1s)
    if (component.type === 'TON' || component.type === 'TOF' || component.type === 'TP') {
        component.preset = 1000; // Default 1 second
    }
    
    state.diagram.components.push(component);
    
    // Select the component for further configuration
    state.ui.selectedComponent = component;
    
    // If it's a timer (function block), prompt for configuration
    const typeInfo = COMPONENT_TYPES[component.type];
    if (typeInfo.isFunctionBlock) {
        openTimerConfigModal(component);
    }
    // If it's an input or output contact/coil, prompt for pin assignment
    else if (typeInfo.isInput || typeInfo.isOutput) {
        openPinModal(component);
    }
    
    renderGrid();
    updateUI();
}

function deleteComponent(gridPos) {
    const component = getComponentAt(gridPos.x, gridPos.y);
    if (!component) return;
    
    saveHistory(); // Save state before deleting component
    
    const index = state.diagram.components.indexOf(component);
    if (index > -1) {
        state.diagram.components.splice(index, 1);
        
        // Remove from inputs/outputs if applicable
        state.diagram.inputs = state.diagram.inputs.filter(i => !i.componentIds.includes(component.id));
        state.diagram.outputs = state.diagram.outputs.filter(o => !o.componentIds.includes(component.id));
        
        renderGrid();
        updateUI();
        updatePinList();
    }
}

function selectComponent(gridPos) {
    const component = getComponentAt(gridPos.x, gridPos.y);
    state.ui.selectedComponent = component;
    
    if (component) {
        elements.selectedComponentDisplay.textContent = `Selected: ${COMPONENT_TYPES[component.type].name}`;
        displayProperties(component);
    } else {
        elements.selectedComponentDisplay.textContent = 'Selected: None';
        elements.propertiesContent.innerHTML = '<p class="empty-message">Select a component to view properties</p>';
    }
    
    renderGrid();
}

function getComponentAt(x, y) {
    return state.diagram.components.find(c => c.position.x === x && c.position.y === y);
}

function generateId() {
    return 'comp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

