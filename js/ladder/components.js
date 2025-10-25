// ===== Component Management =====

// ===== Component Management =====
function placeComponent(gridPos) {
    saveHistory(); // Save state before placing component
    
    const typeInfo = COMPONENT_TYPES[state.ui.selectedComponentType];
    const gridSize = typeInfo.gridSize || { width: 1, height: 1 };
    
    // Check if all required cells are available for multi-cell components
    const cellsToCheck = [];
    for (let dy = 0; dy < gridSize.height; dy++) {
        for (let dx = 0; dx < gridSize.width; dx++) {
            const checkX = gridPos.x + dx;
            const checkY = gridPos.y + dy;
            // Check if cell is within bounds
            if (checkY >= CONFIG.grid.rows) {
                alert('Component does not fit in grid (exceeds bottom boundary)');
                return;
            }
            cellsToCheck.push({ x: checkX, y: checkY });
        }
    }
    
    // Remove existing components in all required cells
    cellsToCheck.forEach(cell => {
        const existing = getComponentAt(cell.x, cell.y);
        if (existing) {
            const index = state.diagram.components.indexOf(existing);
            if (index > -1) {
                state.diagram.components.splice(index, 1);
                
                // Remove from inputs/outputs if applicable
                state.diagram.inputs = state.diagram.inputs.filter(i => !i.componentIds.includes(existing.id));
                state.diagram.outputs = state.diagram.outputs.filter(o => !o.componentIds.includes(existing.id));
                state.diagram.timers = state.diagram.timers.filter(t => t.id !== existing.id);
            }
        }
    });
    
    // Create component
    const component = {
        id: generateId(),
        type: state.ui.selectedComponentType,
        position: { x: gridPos.x, y: gridPos.y },
        pin: null,
        label: '',
        state: false,
        metadata: {},
        gridSize: gridSize  // Store grid size in component
    };
    
    // For timers, add preset time and reset flow tracking
    if (component.type === 'TON' || component.type === 'TOF' || component.type === 'TP') {
        component.preset = 1000; // Default 1 second
        component.resetHasFlow = false; // Track reset pin current flow
    }
    
    state.diagram.components.push(component);
    
    // Select the component for further configuration
    state.ui.selectedComponent = component;
    
    // If it's a timer (function block), prompt for configuration
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
    // Check if position matches component or falls within its grid size
    return state.diagram.components.find(c => {
        const gridSize = c.gridSize || { width: 1, height: 1 };
        return x >= c.position.x && x < c.position.x + gridSize.width &&
               y >= c.position.y && y < c.position.y + gridSize.height;
    });
}

function generateId() {
    return 'comp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

