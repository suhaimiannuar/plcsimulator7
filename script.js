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
        color: '#2196F3',        // Blue when no current
        activeColor: '#4CAF50',  // Green when current flows
        isInput: true
    },
    NC_CONTACT: {
        name: 'Normally Closed Contact',
        symbol: '┤/├',
        color: '#2196F3',        // Blue when no current
        activeColor: '#4CAF50',  // Green when current flows (changed from orange)
        isInput: true
    },
    OUTPUT_COIL: {
        name: 'Output Coil',
        symbol: '─( )─',
        color: '#2196F3',        // Blue when no current (changed from red)
        activeColor: '#4CAF50',  // Green when current flows
        isOutput: true
    },
    TON: {
        name: 'Timer On-Delay',
        symbol: 'TON',
        color: '#9C27B0',        // Purple
        activeColor: '#4CAF50',
        isTimer: true,
        isFunctionBlock: true  // Function block, not a simple contact
    },
    TOF: {
        name: 'Timer Off-Delay',
        symbol: 'TOF',
        color: '#9C27B0',
        activeColor: '#4CAF50',
        isTimer: true,
        isFunctionBlock: true
    },
    TP: {
        name: 'Timer Pulse',
        symbol: 'TP',
        color: '#9C27B0',
        activeColor: '#4CAF50',
        isTimer: true,
        isFunctionBlock: true
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
        outputs: [],
        feedbacks: [],  // Track feedback states (QF1, QF2, etc.)
        timers: []      // Track timer instances
    },
    ui: {
        selectedComponentType: null,
        selectedComponent: null,
        mode: 'place', // 'place', 'select', 'delete'
        isSimulationRunning: false,
        isPaused: false
    },
    drag: {
        isDragging: false,
        draggedComponent: null,
        startPos: null,
        offset: { x: 0, y: 0 },
        lastValidPos: null
    },
    clipboard: {
        component: null
    },
    history: {
        undoStack: [],
        redoStack: [],
        maxHistory: 50
    },
    simulation: {
        intervalId: null,
        scanCount: 0,
        lastLoggedState: null,  // Track last logged state to detect changes
        scanCycleMs: 100,       // Default scan cycle in milliseconds
        speedMultiplier: 1,     // Speed multiplier (0.1x to 10x)
        timeElapsed: 0,         // Total elapsed time in seconds
        startTime: null         // Timestamp when simulation started
    },
    pinConfig: null // Will store loaded pin configuration
};

// ===== DOM Elements =====
const elements = {
    canvas: document.getElementById('ladderCanvas'),
    ctx: null,
    
    // Buttons
    runPauseBtn: document.getElementById('runPauseSimulation'),
    resetBtn: document.getElementById('resetSimulation'),
    scanCycleInput: document.getElementById('scanCycle'),
    speedMultiplierSelect: document.getElementById('speedMultiplier'),
    timeElapsedDisplay: document.getElementById('timeElapsed'),
    librariesBtn: document.getElementById('librariesBtn'),
    librariesModal: document.getElementById('librariesModal'),
    libraryList: document.getElementById('libraryList'),
    loadLibraryBtn: document.getElementById('loadLibraryBtn'),
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
    feedbackList: document.getElementById('feedbackList'),
    outputList: document.getElementById('outputList'),
    propertiesContent: document.getElementById('propertiesContent'),
    
    // Pin List
    inputPinList: document.getElementById('inputPinList'),
    feedbackPinList: document.getElementById('feedbackPinList'),
    outputPinList: document.getElementById('outputPinList'),
    
    // Pin Modal
    pinModal: document.getElementById('pinModal'),
    pinForm: document.getElementById('pinAssignmentForm'),
    modalTitle: document.getElementById('modalTitle'),
    pinNumber: document.getElementById('pinNumber'),
    pinLabel: document.getElementById('pinLabel'),
    cancelPinBtn: document.getElementById('cancelPin'),
    closeModal: document.querySelector('.close'),
    
    // Timer Modal
    timerModal: document.getElementById('timerModal'),
    timerForm: document.getElementById('timerConfigForm'),
    timerModalTitle: document.getElementById('timerModalTitle'),
    timerLabel: document.getElementById('timerLabel'),
    timerPreset: document.getElementById('timerPreset'),
    timerTypeDisplay: document.getElementById('timerTypeDisplay'),
    cancelTimerBtn: document.getElementById('cancelTimer'),
    closeTimerModal: document.querySelector('.close-timer')
};

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

// ===== Keyboard Shortcuts =====
function handleKeyboardShortcuts(e) {
    // Detect if Mac (Cmd) or Windows/Linux (Ctrl)
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifier = isMac ? e.metaKey : e.ctrlKey;
    
    // Don't trigger shortcuts when typing in input fields
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
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
function updateTimers() {
    const deltaMs = state.simulation.scanCycleMs * state.simulation.speedMultiplier;
    
    state.diagram.timers.forEach(timer => {
        const component = state.diagram.components.find(c => c.id === timer.id);
        if (!component) return;
        
        // Get input state (whether component has current flow to it)
        const inputActive = component.hasCurrentFlow || false;
        
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
                updatePinList();
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
        state.diagram.feedbacks = [];
        
        stopSimulation();
        renderGrid();
        updateUI();
        updatePinList();
    }
}

// ===== Start Application =====
document.addEventListener('DOMContentLoaded', init);
