// ===== 3D Model Configuration =====

const MODEL_CONFIG = {
    // Mounting surfaces act as gravity reference
    mountingSurfaces: {
        PLATE: 'plate',      // Flat mounting plate
        BOX: 'box',          // 4-wall enclosure (open top)
        SHELF: 'shelf'       // Wall + shelf combination
    },
    
    // Standard dimensions (in mm)
    standards: {
        dinRailWidth: 35,        // Standard DIN rail width
        plcModuleDepth: 120,     // Typical PLC module depth
        terminalBlockHeight: 45,  // Standard terminal block
        wireGauge: {
            power: 2.5,          // mm² for power wires
            signal: 1.5,         // mm² for signal wires
            ground: 4.0          // mm² for ground wires
        }
    },
    
    // Colors for visual coding
    colors: {
        wireColors: {
            power: 0xff0000,     // Red - 24VDC+
            ground: 0x0000ff,    // Blue - 24VDC-
            signal: 0x00ff00,    // Green - I/O signals
            analog: 0xffff00,    // Yellow - Analog signals
            comm: 0xff00ff       // Magenta - Communication
        },
        materials: {
            dinRail: 0xc0c0c0,   // Silver
            plcBody: 0x2c3e50,   // Dark blue-gray
            terminal: 0x34495e,  // Gray
            plate: 0x95a5a6      // Light gray
        }
    },
    
    // Snap grid for component placement
    snapGrid: {
        enabled: true,
        size: 5,  // 5mm snap grid
        tolerance: 2.5  // 2.5mm snap tolerance
    }
};

// PLC Component Types (Physical 3D)
const PLC_COMPONENTS = {
    // Power Supplies
    POWER_SUPPLY_24V: {
        type: 'power',
        name: '24V DC Power Supply',
        dimensions: { width: 70, height: 125, depth: 120 },
        mountType: 'din-rail',
        terminals: [
            { label: 'L+', type: 'power-in', voltage: 230 },
            { label: 'N', type: 'power-in', voltage: 230 },
            { label: '24V+', type: 'power-out', voltage: 24 },
            { label: '0V', type: 'ground', voltage: 0 }
        ]
    },
    
    // CPU Modules
    CPU_S7_1200: {
        type: 'cpu',
        name: 'Siemens S7-1200 CPU',
        dimensions: { width: 90, height: 100, depth: 75 },
        mountType: 'din-rail',
        onboardIO: {
            DI: 14,  // Digital inputs
            DQ: 10,  // Digital outputs
            AI: 2,   // Analog inputs
            AQ: 2    // Analog outputs
        },
        terminals: [] // Generated based on onboardIO
    },
    
    // Digital Input Modules
    DI_16CH: {
        type: 'digital-input',
        name: '16-Channel Digital Input',
        dimensions: { width: 45, height: 100, depth: 75 },
        mountType: 'din-rail',
        channels: 16,
        voltage: 24,
        terminals: [] // Auto-generate 16 input terminals
    },
    
    // Digital Output Modules
    DQ_16CH: {
        type: 'digital-output',
        name: '16-Channel Digital Output',
        dimensions: { width: 45, height: 100, depth: 75 },
        mountType: 'din-rail',
        channels: 16,
        voltage: 24,
        current: 0.5, // 0.5A per channel
        terminals: []
    },
    
    // Analog Input Modules
    AI_8CH: {
        type: 'analog-input',
        name: '8-Channel Analog Input',
        dimensions: { width: 45, height: 100, depth: 75 },
        mountType: 'din-rail',
        channels: 8,
        signalType: '4-20mA / 0-10V',
        terminals: []
    },
    
    // Terminal Blocks
    TERMINAL_BLOCK_12P: {
        type: 'terminal',
        name: '12-Position Terminal Block',
        dimensions: { width: 60, height: 45, depth: 50 },
        mountType: 'din-rail',
        positions: 12,
        wireGauge: 2.5
    },
    
    // DIN Rail
    DIN_RAIL_35MM: {
        type: 'mounting',
        name: 'DIN Rail 35mm',
        dimensions: { width: 35, height: 7.5, depth: 'custom' },
        material: 'steel'
    },
    
    // Field Devices
    PUSH_BUTTON: {
        type: 'button',
        name: 'Push Button (NO/NC)',
        dimensions: { width: 30, height: 30, depth: 40 },
        mountType: 'panel',
        contacts: [
            { label: 'NO1', type: 'normally-open' },
            { label: 'NO2', type: 'normally-open' },
            { label:'NC1', type: 'normally-closed' },
            { label: 'COM', type: 'common' }
        ],
        color: 0xff0000 // Red button
    },
    
    MOTOR_3PHASE: {
        type: 'motor',
        name: '3-Phase Induction Motor',
        dimensions: { width: 150, height: 200, depth: 150 },
        mountType: 'floor',
        terminals: [
            { label: 'U', type: 'phase', voltage: 400 },
            { label: 'V', type: 'phase', voltage: 400 },
            { label: 'W', type: 'phase', voltage: 400 },
            { label: 'PE', type: 'ground', voltage: 0 }
        ],
        power: 1500, // 1.5kW
        rpm: 1440
    },
    
    INDICATOR_LED: {
        type: 'led',
        name: 'LED Indicator Light',
        dimensions: { width: 22, height: 22, depth: 35 },
        mountType: 'panel',
        terminals: [
            { label: '+', type: 'power' },
            { label: '-', type: 'ground' }
        ],
        voltage: 24,
        colors: {
            red: 0xff0000,
            green: 0x00ff00,
            yellow: 0xffff00,
            blue: 0x0000ff,
            white: 0xffffff
        }
    }
};
