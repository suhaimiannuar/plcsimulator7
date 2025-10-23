// ===== Canvas Interaction & Grid Utilities =====

// ===== Canvas Interaction =====
function handleCanvasClick(e) {
    // Don't handle click if we just finished dragging
    if (state.drag.isDragging) return;
    
    const rect = elements.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const gridPos = screenToGrid(x, y);
    
    if (!isValidGridPosition(gridPos)) return;
    
    if (state.ui.mode === 'place' && state.ui.selectedComponentType) {
        placeComponent(gridPos);
    } else if (state.ui.mode === 'delete') {
        deleteComponent(gridPos);
    } else if (state.ui.mode === 'select') {
        selectComponent(gridPos);
    }
}

function handleCanvasMouseMove(e) {
    const rect = elements.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const gridPos = screenToGrid(x, y);
    
    // Handle dragging
    if (state.drag.isDragging && state.drag.draggedComponent) {
        if (isValidGridPosition(gridPos)) {
            // Check if target position is empty or same as current position
            const targetComp = getComponentAt(gridPos.x, gridPos.y);
            if (!targetComp || targetComp.id === state.drag.draggedComponent.id) {
                state.drag.draggedComponent.position = { x: gridPos.x, y: gridPos.y };
                state.drag.lastValidPos = { x: gridPos.x, y: gridPos.y };
                renderGrid();
            }
        }
    }
    
    // Update cursor position display
    if (isValidGridPosition(gridPos)) {
        elements.cursorPosition.textContent = `Position: (${gridPos.x}, ${gridPos.y})`;
    } else {
        elements.cursorPosition.textContent = 'Position: (-, -)';
    }
}

function handleCanvasMouseDown(e) {
    // Only start drag in select mode
    if (state.ui.mode !== 'select') return;
    
    const rect = elements.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const gridPos = screenToGrid(x, y);
    
    if (!isValidGridPosition(gridPos)) return;
    
    const component = getComponentAt(gridPos.x, gridPos.y);
    if (component) {
        // Start dragging
        saveHistory(); // Save state before dragging
        state.drag.isDragging = true;
        state.drag.draggedComponent = component;
        state.drag.startPos = { x: gridPos.x, y: gridPos.y };
        state.drag.lastValidPos = { x: gridPos.x, y: gridPos.y };
        state.ui.selectedComponent = component;
        elements.canvas.style.cursor = 'grabbing';
    }
}

function handleCanvasMouseUp(e) {
    if (state.drag.isDragging) {
        state.drag.isDragging = false;
        state.drag.draggedComponent = null;
        state.drag.startPos = null;
        elements.canvas.style.cursor = 'default';
        renderGrid();
    }
}

function screenToGrid(x, y) {
    const offsetX = 50; // Left rail offset
    const offsetY = 50; // Top offset
    
    return {
        x: Math.floor((x - offsetX) / CONFIG.grid.cellSize),
        y: Math.floor((y - offsetY) / CONFIG.grid.cellSize)
    };
}

function gridToScreen(gridX, gridY) {
    const offsetX = 50;
    const offsetY = 50;
    
    return {
        x: gridX * CONFIG.grid.cellSize + offsetX,
        y: gridY * CONFIG.grid.cellSize + offsetY
    };
}

function isValidGridPosition(pos) {
    return pos.x >= 0 && pos.x < CONFIG.grid.columns &&
           pos.y >= 0 && pos.y < CONFIG.grid.rows;
}

