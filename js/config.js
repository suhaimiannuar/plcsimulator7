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
