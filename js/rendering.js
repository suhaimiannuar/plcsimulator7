// ===== Rendering Functions =====

// ===== Rendering =====
function renderGrid() {
    const ctx = elements.ctx;
    ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
    
    // Draw grid lines
    ctx.strokeStyle = '#404040';
    ctx.lineWidth = 0.5;
    
    for (let row = 0; row <= CONFIG.grid.rows; row++) {
        const y = gridToScreen(0, row).y;
        ctx.beginPath();
        ctx.moveTo(40, y);
        ctx.lineTo(elements.canvas.width - 40, y);
        ctx.stroke();
    }
    
    for (let col = 0; col <= CONFIG.grid.columns; col++) {
        const x = gridToScreen(col, 0).x;
        ctx.beginPath();
        ctx.moveTo(x, 40);
        ctx.lineTo(x, gridToScreen(0, CONFIG.grid.rows).y);
        ctx.stroke();
    }
    
    // Draw left power rail (hot/live)
    const leftRailX = gridToScreen(0, 0).x - 15;
    const railTop = 40;
    const railBottom = gridToScreen(0, CONFIG.grid.rows).y;
    
    // Left rail background
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(leftRailX - 10, railTop, 20, railBottom - railTop);
    
    // Left rail border
    ctx.strokeStyle = '#922b21';
    ctx.lineWidth = 3;
    ctx.strokeRect(leftRailX - 10, railTop, 20, railBottom - railTop);
    
    // Left rail label
    ctx.fillStyle = 'white';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('L+', leftRailX, (railTop + railBottom) / 2);
    
    // Draw horizontal connections from left rail to grid
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 2;
    for (let row = 0; row < CONFIG.grid.rows; row++) {
        const y = gridToScreen(0, row).y + CONFIG.grid.cellSize / 2;
        const startX = leftRailX;
        const endX = gridToScreen(0, row).x;
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
    }
    
    // Draw right ground rail
    const rightRailX = gridToScreen(CONFIG.grid.columns, 0).x + 15;
    
    // Right rail background
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(rightRailX - 10, railTop, 20, railBottom - railTop);
    
    // Right rail border
    ctx.strokeStyle = '#1a252f';
    ctx.lineWidth = 3;
    ctx.strokeRect(rightRailX - 10, railTop, 20, railBottom - railTop);
    
    // Right rail label
    ctx.fillStyle = 'white';
    ctx.fillText('N', rightRailX, (railTop + railBottom) / 2);
    
    // Draw horizontal connections from grid to right rail
    ctx.strokeStyle = '#607D8B';
    ctx.lineWidth = 2;
    for (let row = 0; row < CONFIG.grid.rows; row++) {
        const y = gridToScreen(0, row).y + CONFIG.grid.cellSize / 2;
        const startX = gridToScreen(CONFIG.grid.columns - 1, row).x + CONFIG.grid.cellSize;
        const endX = rightRailX;
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
    }
    
    // Draw components
    state.diagram.components.forEach(component => {
        drawComponent(component);
    });
}

function drawComponent(component) {
    const ctx = elements.ctx;
    const typeInfo = COMPONENT_TYPES[component.type];
    const pos = gridToScreen(component.position.x, component.position.y);
    const cellCenter = {
        x: pos.x + CONFIG.grid.cellSize / 2,
        y: pos.y + CONFIG.grid.cellSize / 2
    };
    
    // Determine color based on component type
    let color;
    
    if (typeInfo.isInput) {
        // Contacts: Blue when OFF, Green when ON (based on switch state)
        // For NO: state=true means switch ON
        // For NC: state=true means switch OFF (inverted), so check actual input state
        
        // Check if this is a feedback contact (QF pin)
        const isFeedbackContact = component.pin && component.pin.startsWith('QF');
        
        if (isFeedbackContact) {
            // Feedback contacts: Use component state directly (already synced by updateFeedbackStates)
            color = component.state ? typeInfo.activeColor : typeInfo.color;
        } else {
            // Regular input contacts: Look up input state
            const input = state.diagram.inputs.find(i => i.componentIds.includes(component.id));
            const switchIsOn = input ? input.state : false;
            color = switchIsOn ? typeInfo.activeColor : typeInfo.color;
        }
    } else if (typeInfo.isWire || typeInfo.isBranch || typeInfo.isCorner) {
        // Wires: Blue when no current, Green when current flows
        color = component.hasCurrentFlow ? typeInfo.activeColor : typeInfo.color;
    } else if (typeInfo.isOutput) {
        // Outputs: Blue when OFF, Green when ON (based on current flow)
        color = component.hasCurrentFlow ? typeInfo.activeColor : typeInfo.color;
    } else {
        color = typeInfo.color;
    }
    
    // Highlight if selected
    if (state.ui.selectedComponent === component) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(pos.x, pos.y, CONFIG.grid.cellSize, CONFIG.grid.cellSize);
    }
    
    // No shadow/glow effects - just use color changes
    ctx.shadowBlur = 0;
    
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.font = '20px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    switch (component.type) {
        case 'NO_CONTACT':
            drawContact(ctx, cellCenter, false, color);
            break;
        case 'NC_CONTACT':
            drawContact(ctx, cellCenter, true, color);
            break;
        case 'OUTPUT_COIL':
            drawCoil(ctx, cellCenter, color);
            break;
        case 'TON':
        case 'TOF':
        case 'TP':
            drawTimer(ctx, cellCenter, component.type, color, component);
            break;
        case 'HORIZONTAL_WIRE':
            drawHorizontalWire(ctx, cellCenter, color);
            break;
        case 'VERTICAL_WIRE':
            drawVerticalWire(ctx, cellCenter, color);
            break;
        case 'CORNER_DOWN_RIGHT':
            drawCornerDownRight(ctx, cellCenter, color, component);
            break;
        case 'CORNER_UP_RIGHT':
            drawCornerUpRight(ctx, cellCenter, color);
            break;
        case 'CORNER_DOWN_LEFT':
            drawCornerDownLeft(ctx, cellCenter, color, component);
            break;
        case 'CORNER_UP_LEFT':
            drawCornerUpLeft(ctx, cellCenter, color);
            break;
        case 'BRANCH_POINT':
            drawBranchPoint(ctx, cellCenter, color, component);
            break;
    }
    
    // Draw label if assigned
    if (component.label) {
        ctx.font = '10px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(component.label, cellCenter.x, pos.y + CONFIG.grid.cellSize - 5);
    }
}

function drawContact(ctx, center, isNC, color) {
    const width = 30;
    const height = 35;
    
    // Horizontal lines
    ctx.beginPath();
    ctx.moveTo(center.x - width, center.y);
    ctx.lineTo(center.x - 10, center.y);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(center.x + 10, center.y);
    ctx.lineTo(center.x + width, center.y);
    ctx.stroke();
    
    // Vertical lines (contacts)
    ctx.beginPath();
    ctx.moveTo(center.x - 8, center.y - height/2);
    ctx.lineTo(center.x - 8, center.y + height/2);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(center.x + 8, center.y - height/2);
    ctx.lineTo(center.x + 8, center.y + height/2);
    ctx.stroke();
    
    // Diagonal line for NC
    if (isNC) {
        ctx.beginPath();
        ctx.moveTo(center.x - 8, center.y - height/2);
        ctx.lineTo(center.x + 8, center.y + height/2);
        ctx.stroke();
    }
}

function drawCoil(ctx, center, color) {
    const radius = 15;
    
    // Horizontal lines
    ctx.beginPath();
    ctx.moveTo(center.x - 30, center.y);
    ctx.lineTo(center.x - radius, center.y);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(center.x + radius, center.y);
    ctx.lineTo(center.x + 30, center.y);
    ctx.stroke();
    
    // Circle
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.stroke();
}

function drawTimer(ctx, center, type, color, component) {
    const width = 40;
    const height = 35;
    
    // Draw box
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    
    // Box around timer
    ctx.beginPath();
    ctx.rect(center.x - width/2, center.y - height/2, width, height);
    ctx.stroke();
    
    // Timer type text
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(type, center.x, center.y - 5);
    
    // Show timer state
    const timer = state.diagram.timers.find(t => t.id === component.id);
    if (timer) {
        ctx.font = '8px sans-serif';
        const timeText = `${(timer.elapsed / 1000).toFixed(1)}s`;
        ctx.fillText(timeText, center.x, center.y + 8);
        
        // Show done indicator
        if (timer.done) {
            ctx.fillStyle = '#4CAF50';
            ctx.beginPath();
            ctx.arc(center.x + width/2 - 5, center.y - height/2 + 5, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Draw connections (horizontal lines for current flow)
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(center.x - width, center.y);
    ctx.lineTo(center.x - width/2, center.y);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(center.x + width/2, center.y);
    ctx.lineTo(center.x + width, center.y);
    ctx.stroke();
}

function drawHorizontalWire(ctx, center, color) {
    ctx.beginPath();
    ctx.moveTo(center.x - CONFIG.grid.cellSize / 2, center.y);
    ctx.lineTo(center.x + CONFIG.grid.cellSize / 2, center.y);
    ctx.stroke();
}

function drawVerticalWire(ctx, center, color) {
    ctx.beginPath();
    ctx.moveTo(center.x, center.y - CONFIG.grid.cellSize / 2);
    ctx.lineTo(center.x, center.y + CONFIG.grid.cellSize / 2);
    ctx.stroke();
}

function drawCornerDownRight(ctx, center, color, component) {
    // Corner: └ (from top to right) - L1 shape
    const halfCell = CONFIG.grid.cellSize / 2;
    
    ctx.beginPath();
    // Vertical line from top to center
    ctx.moveTo(center.x, center.y - halfCell);
    ctx.lineTo(center.x, center.y);
    // Horizontal line from center to right
    ctx.lineTo(center.x + halfCell, center.y);
    ctx.stroke();
    
    // Draw L-shape ID if assigned
    if (component && component.lshapeId) {
        ctx.font = 'bold 9px monospace';
        ctx.fillStyle = '#FF9800';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(component.lshapeId, center.x + 5, center.y + 3);
    }
}

function drawCornerUpRight(ctx, center, color) {
    // Corner: ┌ (from bottom to right)
    const halfCell = CONFIG.grid.cellSize / 2;
    
    ctx.beginPath();
    // Vertical line from bottom to center
    ctx.moveTo(center.x, center.y + halfCell);
    ctx.lineTo(center.x, center.y);
    // Horizontal line from center to right
    ctx.lineTo(center.x + halfCell, center.y);
    ctx.stroke();
}

function drawCornerDownLeft(ctx, center, color, component) {
    // Corner: ┘ (from top to left) - L2 shape
    const halfCell = CONFIG.grid.cellSize / 2;
    
    ctx.beginPath();
    // Vertical line from top to center
    ctx.moveTo(center.x, center.y - halfCell);
    ctx.lineTo(center.x, center.y);
    // Horizontal line from center to left
    ctx.lineTo(center.x - halfCell, center.y);
    ctx.stroke();
    
    // Draw L-shape ID if assigned
    if (component && component.lshapeId) {
        ctx.font = 'bold 9px monospace';
        ctx.fillStyle = '#FF9800';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText(component.lshapeId, center.x - 5, center.y + 3);
    }
}

function drawCornerUpLeft(ctx, center, color) {
    // Corner: ┐ (from bottom to left)
    const halfCell = CONFIG.grid.cellSize / 2;
    
    ctx.beginPath();
    // Vertical line from bottom to center
    ctx.moveTo(center.x, center.y + halfCell);
    ctx.lineTo(center.x, center.y);
    // Horizontal line from center to left
    ctx.lineTo(center.x - halfCell, center.y);
    ctx.stroke();
}

function drawBranchPoint(ctx, center, color, component) {
    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(center.x - CONFIG.grid.cellSize / 2, center.y);
    ctx.lineTo(center.x + CONFIG.grid.cellSize / 2, center.y);
    ctx.stroke();
    
    // Vertical line going down
    ctx.beginPath();
    ctx.moveTo(center.x, center.y);
    ctx.lineTo(center.x, center.y + CONFIG.grid.cellSize / 2);
    ctx.stroke();
    
    // Junction dot
    ctx.beginPath();
    ctx.arc(center.x, center.y, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw branch ID if assigned
    if (component && component.branchId) {
        ctx.font = 'bold 10px monospace';
        ctx.fillStyle = '#00BCD4';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(component.branchId, center.x, center.y - 8);
    }
}

