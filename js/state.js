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
