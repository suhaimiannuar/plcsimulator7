// ===== Configuration =====
const CONFIG = {
    grid: {
        rows: 15,
        columns: 18, // Component grid (rails are separate)
        cellSize: 50,
        railWidth: 30 // Width of power rails
    },
    pins: {
        maxInputs: 16,
        maxOutputs: 16
    },
    simulation: {
        scanCycleMs: 100 // 100ms scan cycle (10 Hz)
    }
};

// ===== Component Types Definition =====
const COMPONENT_TYPES = {
    NO_CONTACT: {
        name: 'Normally Open Contact',
        symbol: '┤ ├',
        color: '#2196F3',
        activeColor: '#4CAF50',
        isInput: true
    },
    NC_CONTACT: {
        name: 'Normally Closed Contact',
        symbol: '┤/├',
        color: '#2196F3',
        activeColor: '#FF5722',
        isInput: true
    },
    OUTPUT_COIL: {
        name: 'Output Coil',
        symbol: '─( )─',
        color: '#FF5722',
        activeColor: '#4CAF50',
        isOutput: true
    },
    HORIZONTAL_WIRE: {
        name: 'Horizontal Wire',
        symbol: '─',
        color: '#607D8B',
        activeColor: '#4CAF50',
        isWire: true
    },
    VERTICAL_WIRE: {
        name: 'Vertical Wire',
        symbol: '│',
        color: '#607D8B',
        activeColor: '#4CAF50',
        isWire: true
    },
    CORNER_DOWN_RIGHT: {
        name: 'Corner Down-Right',
        symbol: '└',
        color: '#607D8B',
        activeColor: '#4CAF50',
        isWire: true,
        isCorner: true
    },
    CORNER_UP_RIGHT: {
        name: 'Corner Up-Right',
        symbol: '┌',
        color: '#607D8B',
        activeColor: '#4CAF50',
        isWire: true,
        isCorner: true
    },
    CORNER_DOWN_LEFT: {
        name: 'Corner Down-Left',
        symbol: '┘',
        color: '#607D8B',
        activeColor: '#4CAF50',
        isWire: true,
        isCorner: true
    },
    CORNER_UP_LEFT: {
        name: 'Corner Up-Left',
        symbol: '┐',
        color: '#607D8B',
        activeColor: '#4CAF50',
        isWire: true,
        isCorner: true
    },
    BRANCH_POINT: {
        name: 'Branch Point',
        symbol: '┬',
        color: '#607D8B',
        activeColor: '#00BCD4',
        isBranch: true
    }
};

// ===== Global State =====
const state = {
    diagram: {
        metadata: {
            name: 'Untitled Diagram',
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        },
        grid: CONFIG.grid,
        components: [],
        inputs: [],
        outputs: []
    },
    ui: {
        selectedComponentType: null,
        selectedComponent: null,
        mode: 'place', // 'place', 'select', 'delete'
        isSimulationRunning: false
    },
    simulation: {
        intervalId: null,
        scanCount: 0,
        lastLoggedState: null  // Track last logged state to detect changes
    }
};

// ===== DOM Elements =====
const elements = {
    canvas: document.getElementById('ladderCanvas'),
    ctx: null,
    
    // Buttons
    runBtn: document.getElementById('runSimulation'),
    stopBtn: document.getElementById('stopSimulation'),
    stepBtn: document.getElementById('stepSimulation'),
    newBtn: document.getElementById('newDiagram'),
    saveBtn: document.getElementById('saveDiagram'),
    loadBtn: document.getElementById('loadDiagram'),
    clearBtn: document.getElementById('clearDiagram'),
    deleteToolBtn: document.getElementById('deleteTool'),
    selectToolBtn: document.getElementById('selectTool'),
    addInputBtn: document.getElementById('addInput'),
    addOutputBtn: document.getElementById('addOutput'),
    
    // Display areas
    statusDot: document.getElementById('statusDot'),
    statusText: document.getElementById('statusText'),
    cursorPosition: document.getElementById('cursorPosition'),
    selectedComponentDisplay: document.getElementById('selectedComponent'),
    inputList: document.getElementById('inputList'),
    outputList: document.getElementById('outputList'),
    propertiesContent: document.getElementById('propertiesContent'),
    
    // Modal
    pinModal: document.getElementById('pinModal'),
    pinForm: document.getElementById('pinAssignmentForm'),
    pinNumber: document.getElementById('pinNumber'),
    pinLabel: document.getElementById('pinLabel'),
    pinDescription: document.getElementById('pinDescription'),
    cancelPinBtn: document.getElementById('cancelPin'),
    closeModal: document.querySelector('.close')
};

// ===== Initialization =====
function init() {
    // Setup canvas
    elements.ctx = elements.canvas.getContext('2d');
    resizeCanvas();
    
    // Event listeners
    setupEventListeners();
    
    // Initial render
    renderGrid();
    updateUI();
    
    console.log('PLC Ladder Diagram Simulator initialized');
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
    elements.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // Control buttons
    elements.runBtn.addEventListener('click', startSimulation);
    elements.stopBtn.addEventListener('click', stopSimulation);
    elements.stepBtn.addEventListener('click', stepSimulation);
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

// ===== Canvas Interaction =====
function handleCanvasClick(e) {
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
    
    if (isValidGridPosition(gridPos)) {
        elements.cursorPosition.textContent = `Position: (${gridPos.x}, ${gridPos.y})`;
    } else {
        elements.cursorPosition.textContent = 'Position: (-, -)';
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

// ===== Component Management =====
function placeComponent(gridPos) {
    // Check if cell is occupied
    const existing = getComponentAt(gridPos.x, gridPos.y);
    if (existing) {
        alert('Cell is already occupied!');
        return;
    }
    
    // Create component
    const component = {
        id: generateId(),
        type: state.ui.selectedComponentType,
        position: { x: gridPos.x, y: gridPos.y },
        pinAssignment: null,
        label: '',
        state: false,
        metadata: {}
    };
    
    state.diagram.components.push(component);
    
    // If it's an input or output, prompt for pin assignment
    const typeInfo = COMPONENT_TYPES[component.type];
    if (typeInfo.isInput || typeInfo.isOutput) {
        state.ui.selectedComponent = component;
        openPinModal(component);
    }
    
    renderGrid();
    updateUI();
}

function deleteComponent(gridPos) {
    const component = getComponentAt(gridPos.x, gridPos.y);
    if (!component) return;
    
    const index = state.diagram.components.indexOf(component);
    if (index > -1) {
        state.diagram.components.splice(index, 1);
        
        // Remove from inputs/outputs if applicable
        state.diagram.inputs = state.diagram.inputs.filter(i => !i.componentIds.includes(component.id));
        state.diagram.outputs = state.diagram.outputs.filter(o => !o.componentIds.includes(component.id));
        
        renderGrid();
        updateUI();
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

// ===== Pin Assignment Modal =====
function openPinModal(component) {
    const typeInfo = COMPONENT_TYPES[component.type];
    
    if (typeInfo.isInput) {
        elements.pinNumber.max = CONFIG.pins.maxInputs - 1;
    } else if (typeInfo.isOutput) {
        elements.pinNumber.max = CONFIG.pins.maxOutputs - 1;
    }
    
    elements.pinNumber.value = '';
    elements.pinLabel.value = component.label || '';
    elements.pinDescription.value = component.metadata.description || '';
    
    elements.pinModal.classList.add('show');
}

function closeModal() {
    elements.pinModal.classList.remove('show');
}

function handlePinAssignment(e) {
    e.preventDefault();
    
    const component = state.ui.selectedComponent;
    if (!component) return;
    
    const pinNumber = parseInt(elements.pinNumber.value);
    const label = elements.pinLabel.value;
    const description = elements.pinDescription.value;
    
    const typeInfo = COMPONENT_TYPES[component.type];
    
    // Check if pin is already assigned
    const ioList = typeInfo.isInput ? state.diagram.inputs : state.diagram.outputs;
    const existing = ioList.find(io => io.pinNumber === pinNumber);
    
    if (existing && !existing.componentIds.includes(component.id)) {
        // Pin already exists, just add this component to it
        existing.componentIds.push(component.id);
    } else if (!existing) {
        // Create new I/O
        const io = {
            id: generateId(),
            pinNumber: pinNumber,
            label: label,
            type: 'DIGITAL',
            state: false,
            componentIds: [component.id]
        };
        
        if (typeInfo.isInput) {
            state.diagram.inputs.push(io);
        } else {
            state.diagram.outputs.push(io);
        }
    }
    
    component.pinAssignment = pinNumber;
    component.label = label;
    component.metadata.description = description;
    
    closeModal();
    updateUI();
    renderGrid();
}

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
    
    // Determine color based on state
    const color = component.state ? typeInfo.activeColor : typeInfo.color;
    
    // Highlight if selected
    if (state.ui.selectedComponent === component) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(pos.x, pos.y, CONFIG.grid.cellSize, CONFIG.grid.cellSize);
    }
    
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

// ===== UI Updates =====
function updateUI() {
    updateInputList();
    updateOutputList();
}

function updateInputList() {
    if (state.diagram.inputs.length === 0) {
        elements.inputList.innerHTML = '<p class="empty-message">No inputs assigned</p>';
        return;
    }
    
    elements.inputList.innerHTML = state.diagram.inputs.map(input => `
        <div class="io-item">
            <div class="io-item-header">
                <div class="io-item-label">
                    <span class="pin-badge">I${input.pinNumber}</span>
                    <span>${input.label}</span>
                </div>
                <div class="io-toggle ${input.state ? 'active' : ''}" 
                     onclick="toggleInput('${input.id}')"></div>
            </div>
            <div class="io-item-state">State: ${input.state ? 'ON' : 'OFF'}</div>
        </div>
    `).join('');
}

function updateOutputList() {
    if (state.diagram.outputs.length === 0) {
        elements.outputList.innerHTML = '<p class="empty-message">No outputs assigned</p>';
        return;
    }
    
    elements.outputList.innerHTML = state.diagram.outputs.map(output => `
        <div class="io-item">
            <div class="io-item-header">
                <div class="io-item-label">
                    <span class="pin-badge">Q${output.pinNumber}</span>
                    <span>${output.label}</span>
                </div>
            </div>
            <div class="output-indicator ${output.state ? 'active' : ''}"></div>
            <div class="io-item-state">State: ${output.state ? 'ON' : 'OFF'}</div>
        </div>
    `).join('');
}

function displayProperties(component) {
    const typeInfo = COMPONENT_TYPES[component.type];
    
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
            <div class="property-value">${component.pinAssignment !== null ? component.pinAssignment : 'None'}</div>
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

// ===== Input Toggle =====
window.toggleInput = function(inputId) {
    console.log('🔘 Toggle input clicked:', inputId);
    
    const input = state.diagram.inputs.find(i => i.id === inputId);
    if (!input) {
        console.error('❌ Input not found:', inputId);
        console.log('   Available inputs:', state.diagram.inputs.map(i => i.id));
        return;
    }
    
    // Toggle state
    input.state = !input.state;
    console.log(`   Input ${input.id} (I${input.pinNumber}) state: ${input.state ? 'ON' : 'OFF'}`);
    
    // Update linked components
    input.componentIds.forEach(compId => {
        const component = state.diagram.components.find(c => c.id === compId);
        if (component) {
            if (component.type === 'NO_CONTACT') {
                component.state = input.state;
                console.log(`     Updated NO contact ${compId}: ${component.state}`);
            } else if (component.type === 'NC_CONTACT') {
                component.state = !input.state; // NC is inverted
                console.log(`     Updated NC contact ${compId}: ${component.state}`);
            }
        }
    });
    
    updateUI();
    renderGrid();
    
    // If simulation is running, trigger evaluation
    if (state.ui.isSimulationRunning) {
        console.log('   🔄 Triggering logic evaluation...');
        evaluateLogic();
    }
};

window.editComponentPin = function(componentId) {
    const component = state.diagram.components.find(c => c.id === componentId);
    if (component) {
        state.ui.selectedComponent = component;
        openPinModal(component);
    }
};

// ===== Simulation =====
function startSimulation() {
    state.ui.isSimulationRunning = true;
    
    elements.runBtn.disabled = true;
    elements.stopBtn.disabled = false;
    elements.statusDot.className = 'status-dot status-running';
    elements.statusText.textContent = 'Running';
    
    // Reset last logged state to force initial log
    state.simulation.lastLoggedState = null;
    
    // Log initial state
    console.log('%c🚀 SIMULATION STARTED', 'color: #4CAF50; font-weight: bold; font-size: 16px;');
    console.log('');
    
    // Run first scan immediately to show initial state
    scanCycle();
    
    // Start scan cycle
    state.simulation.intervalId = setInterval(() => {
        scanCycle();
    }, CONFIG.simulation.scanCycleMs);
}

function stopSimulation() {
    state.ui.isSimulationRunning = false;
    
    if (state.simulation.intervalId) {
        clearInterval(state.simulation.intervalId);
        state.simulation.intervalId = null;
    }
    
    elements.runBtn.disabled = false;
    elements.stopBtn.disabled = true;
    elements.statusDot.className = 'status-dot status-stopped';
    elements.statusText.textContent = 'Stopped';
    
    console.log('');
    console.log('%c⏹ SIMULATION STOPPED', 'color: #F44336; font-weight: bold; font-size: 16px;');
    console.log('');
}

function stepSimulation() {
    console.log('%c⏯ STEP EXECUTION', 'color: #FF9800; font-weight: bold; font-size: 14px;');
    console.log('');
    // Force log on step (user explicitly requested it)
    state.simulation.lastLoggedState = null;
    scanCycle();
}

function scanCycle() {
    state.simulation.scanCount++;
    
    // Phase 1: Input Scan (already done via UI toggles)
    
    // Phase 2: Logic Solve
    evaluateLogic();
    
    // Phase 3: Output Scan
    updateOutputs();
    
    // Phase 4: Render
    renderGrid();
    updateUI();
}

function evaluateLogic() {
    console.log('🔧 Evaluating logic with V2 formulas...');
    
    // Get all outputs
    const outputs = state.diagram.components.filter(c => c.type === 'OUTPUT_COIL');
    
    if (outputs.length === 0) {
        console.log('  ℹ️  No outputs to evaluate');
        return;
    }
    
    // For each output, use the generated formula from V2 analysis
    outputs.forEach(output => {
        if (output.pinAssignment === null) return;
        
        // Run V2 analysis to get formula
        const result = detectBranchesV2(output, state.diagram.components, CONFIG.grid.rows);
        
        if (!result || result.length === 0 || !result[0] || result[0].length === 0) {
            console.log(`  ⚠️  No formula for Q${output.pinAssignment}`);
            output.state = false;
            return;
        }
        
        const formula = result[0][0]; // Get the formula string
        console.log(`  📝 Q${output.pinAssignment} formula: ${formula}`);
        
        // Evaluate the formula with current input states
        const result_value = evaluateFormula(formula);
        output.state = result_value;
        
        console.log(`  ✅ Q${output.pinAssignment} = ${result_value ? 'ON' : 'OFF'}`);
    });
    
    // Update output list in UI
    updateOutputsFromComponents();
    
    // Check for state changes and log only if changed
    checkAndLogStateChanges();
}

/**
 * Evaluate a boolean formula string with current input states
 * Formula uses I1, I2, !I3 notation
 * Returns true/false based on current input states
 */
function evaluateFormula(formula) {
    if (!formula || formula === 'true') return true;
    if (formula === 'false') return false;
    
    // Build evaluation context with current input states
    const context = {};
    
    // Add all inputs to context
    state.diagram.inputs.forEach(input => {
        const varName = `I${input.pinNumber}`;
        context[varName] = input.state;
    });
    
    // Replace !I notation with NOT operator
    // Convert: !I1 -> !context.I1
    let jsFormula = formula.replace(/!I(\d+)/g, '!context.I$1');
    
    // Convert: I1 -> context.I1 (but not already prefixed)
    jsFormula = jsFormula.replace(/(?<!context\.)I(\d+)/g, 'context.I$1');
    
    // Convert && and || to JavaScript operators (already correct)
    // Formula is now ready to evaluate
    
    try {
        const result = eval(jsFormula);
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
            c.pinAssignment === outputObj.pinNumber
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
                c.pinAssignment === input.pinNumber
            );
            
            const contactTypes = [];
            const hasNO = contactsUsingThisPin.some(c => c.type === 'NO_CONTACT');
            const hasNC = contactsUsingThisPin.some(c => c.type === 'NC_CONTACT');
            
            if (hasNO) contactTypes.push('NO');
            if (hasNC) contactTypes.push('NC');
            
            const typeDisplay = contactTypes.length > 0 ? ` [${contactTypes.join('/')}]` : '';
            
            console.log(`**I${input.pinNumber}** (${input.label})${typeDisplay}: ${stateIcon} [${input.state}]`);
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
            console.log(`**Q${output.pinNumber}** (${output.label}): ${stateIcon} [${output.state}]`);
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
            const pin = comp.pinAssignment !== null ? comp.pinAssignment : '-';
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
        console.log(`    const I${input.pinNumber} = ${input.state}; // ${input.label}`);
    });
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
            if (output.pinAssignment === null) return;
            
            // Use V2 algorithm (Loop Detection)
            console.log('🔄 Using Analysis V2 (Loop Detection)');
            const branches = detectBranchesV2(output, state.diagram.components, CONFIG.grid.rows);
            
            if (!outputRowsMap.has(output.pinAssignment)) {
                outputRowsMap.set(output.pinAssignment, []);
            }
            outputRowsMap.get(output.pinAssignment).push({
                row: row,
                branches: branches,
                label: output.label || 'Output'
            });
        });
    }
    
    // Generate code for each output
    outputRowsMap.forEach((pathsData, outputPin) => {
        console.log(`    // Output Q${outputPin}`);
        
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
        
        console.log(`    if (${finalCondition}) {`);
        console.log(`        Q${outputPin} = true;`);
        console.log(`    } else {`);
        console.log(`        Q${outputPin} = false;`);
        console.log(`    }`);
        console.log('');
    });
    
    console.log('    // Output results');
    state.diagram.outputs.forEach(output => {
        const stateStr = output.state ? 'ON' : 'OFF';
        console.log(`    console.log("Q${output.pinNumber} (${output.label}): " + Q${output.pinNumber} + " [${stateStr}]");`);
    });
    
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
                if (contact.pinAssignment !== null) {
                    // Determine if this is a real input or feedback from output
                    const isInputPin = state.diagram.inputs.find(inp => inp.pinNumber === contact.pinAssignment);
                    const isOutputFeedback = state.diagram.outputs.find(out => out.pinNumber === contact.pinAssignment);
                    
                    let sourceType = '';
                    let pinLabel = '';
                    
                    if (isInputPin) {
                        sourceType = 'Input';
                        pinLabel = `I${contact.pinAssignment}`;
                    } else if (isOutputFeedback) {
                        sourceType = 'Output Feedback';
                        pinLabel = `Q${contact.pinAssignment}`;
                    } else {
                        sourceType = 'Unassigned';
                        pinLabel = `Pin ${contact.pinAssignment}`;
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
                    if (output.pinAssignment !== null) {
                        console.log(`**→ Q${output.pinAssignment}** (${output.label || 'Output'}): ${result ? '🟢 ON' : '⚫ OFF'}`);
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

// ===== Diagram Management =====
function newDiagram() {
    if (confirm('Create a new diagram? Current work will be lost.')) {
        state.diagram = {
            metadata: {
                name: 'Untitled Diagram',
                created: new Date().toISOString(),
                modified: new Date().toISOString()
            },
            grid: CONFIG.grid,
            components: [],
            inputs: [],
            outputs: []
        };
        
        stopSimulation();
        renderGrid();
        updateUI();
    }
}

function saveDiagram() {
    const json = JSON.stringify(state.diagram, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `ladder_diagram_${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    console.log('Diagram saved');
}

function loadDiagram() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        
        reader.onload = (event) => {
            try {
                const diagram = JSON.parse(event.target.result);
                state.diagram = diagram;
                stopSimulation();
                renderGrid();
                updateUI();
                console.log('Diagram loaded');
            } catch (error) {
                alert('Error loading diagram: ' + error.message);
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

function clearDiagram() {
    if (confirm('Clear all components? This cannot be undone.')) {
        state.diagram.components = [];
        state.diagram.inputs = [];
        state.diagram.outputs = [];
        
        stopSimulation();
        renderGrid();
        updateUI();
    }
}

// ===== Start Application =====
document.addEventListener('DOMContentLoaded', init);
