// ===== 3D Model Initialization =====

// Global variables
window.modelScene = null;
window.ioMapping = null;
window.autoWireGen = null;
window.propertyEditor = null;

// Initialize 3D model view
function initModel() {
    // Check if Three.js is loaded
    if (typeof THREE === 'undefined') {
        console.error('Three.js not loaded. Please include Three.js library.');
        return;
    }
    
    // Create scene
    window.modelScene = new ModelScene('model-container');
    
    // Initialize I/O mapping
    window.ioMapping = new IOMapping();
    
    // Initialize property editor
    if (typeof PropertyEditor !== 'undefined') {
        window.propertyEditor = new PropertyEditor(window.modelScene);
        console.log('Property Editor initialized');
    }
    
    console.log('3D Model initialized');
    
    return window.modelScene;
}

// Create example PLC setup
function createExampleSetup() {
    if (!window.modelScene) {
        console.error('Model scene not initialized');
        return;
    }
    
    // Clear first
    window.modelScene.clear();
    
    // Add mounting plate
    const plate = window.modelScene.addMountingSurface('plate', {
        width: 800,
        length: 600,
        thickness: 2
    });
    
    // Add DIN rail on plate
    const dinRail = window.modelScene.addMountingSurface('din-rail', {
        length: 500
    });
    
    // Position DIN rail on plate
    if (dinRail) {
        dinRail.position = { x: 0, y: 50, z: -100 };
        const railMesh = window.modelScene.scene.children.find(
            child => child.userData.mounting === dinRail
        );
        if (railMesh) {
            railMesh.position.set(0, 50, -100);
        }
    }
    
    // Add power supply
    const powerSupply = window.modelScene.addPLCComponent('power-supply', {
        x: -200,
        y: 100,
        z: -100
    });
    
    // Add CPU
    const cpu = window.modelScene.addPLCComponent('cpu', {
        x: -100,
        y: 100,
        z: -100
    });
    
    // Add I/O modules
    const diModule = window.modelScene.addPLCComponent('digital-input', {
        x: 0,
        y: 100,
        z: -100
    });
    
    const doModule = window.modelScene.addPLCComponent('digital-output', {
        x: 50,
        y: 100,
        z: -100
    });
    
    // Snap components to DIN rail
    if (dinRail) {
        if (powerSupply) window.modelScene.snapToMounting(powerSupply, dinRail, { x: -200, y: 0, z: -100 });
        if (cpu) window.modelScene.snapToMounting(cpu, dinRail, { x: -100, y: 0, z: -100 });
        if (diModule) window.modelScene.snapToMounting(diModule, dinRail, { x: 0, y: 0, z: -100 });
        if (doModule) window.modelScene.snapToMounting(doModule, dinRail, { x: 50, y: 0, z: -100 });
    }
    
    // Add field devices
    // Start button (Green)
    const startButton = window.modelScene.addFieldDevice('button', {
        x: -250,
        y: 50,
        z: 150
    }, {
        color: 0x00ff00, // Green
        buttonType: 'momentary'
    });
    
    // Stop button (Red)
    const stopButton = window.modelScene.addFieldDevice('button', {
        x: -150,
        y: 50,
        z: 150
    }, {
        color: 0xff0000, // Red
        buttonType: 'momentary'
    });
    
    // Motor
    const motor = window.modelScene.addFieldDevice('motor', {
        x: 250,
        y: 100,
        z: 0
    }, {
        power: 1500
    });
    
    // Running LED (Green)
    const runningLED = window.modelScene.addFieldDevice('led', {
        x: -50,
        y: 50,
        z: 150
    }, {
        color: 'green'
    });
    
    // Fault LED (Red)
    const faultLED = window.modelScene.addFieldDevice('led', {
        x: 50,
        y: 50,
        z: 150
    }, {
        color: 'red'
    });
    
    // Add power wiring
    if (powerSupply && cpu) {
        // 24V+ wire
        window.modelScene.addWire(powerSupply, 2, cpu, 0, 'power');
        // 0V wire
        window.modelScene.addWire(powerSupply, 3, cpu, 1, 'ground');
    }
    
    console.log('Example PLC setup created with field devices');
    
    // Demo: Make running LED blink after 3 seconds
    setTimeout(() => {
        if (runningLED) {
            runningLED.startBlinking(500);
            console.log('Running LED blinking');
        }
    }, 3000);
}

// Sync ladder diagram to 3D model
function syncLadderTo3D() {
    if (!state || !state.diagram) {
        console.error('Ladder diagram not available');
        return;
    }
    
    // Extract I/O from ladder diagram
    const extractor = new LadderIOExtractor(state.diagram);
    const io = extractor.extract();
    
    console.log('Ladder I/O extracted:', io);
    
    // Get PLC configuration suggestions
    const suggestions = extractor.suggestPLCConfig();
    console.log('Suggested PLC configuration:', suggestions);
    
    return { io, suggestions };
}

// Generate auto-wiring based on ladder diagram
function generateAutoWiring() {
    if (!window.modelScene || !window.ioMapping) {
        console.error('Model scene or IO mapping not initialized');
        return;
    }
    
    window.autoWireGen = new AutoWireGenerator(window.ioMapping);
    
    // Generate power distribution wires
    const powerSupply = window.modelScene.plcComponents.find(c => c.type === 'power-supply');
    if (powerSupply) {
        const powerWires = window.autoWireGen.generatePowerWires(
            powerSupply,
            window.modelScene.plcComponents
        );
        
        console.log(`Generated ${powerWires.length} power distribution wires`);
    }
    
    // Generate signal wires from ladder diagram
    if (state && state.diagram) {
        const signalWires = window.autoWireGen.generateSignalWires(state.diagram);
        console.log(`Generated ${signalWires.length} signal wires`);
    }
}

// Export BOM (Bill of Materials)
function exportBOM() {
    if (!window.modelScene) {
        console.error('Model scene not initialized');
        return null;
    }
    
    const bom = {
        components: [],
        wires: [],
        hardware: []
    };
    
    // Components
    window.modelScene.plcComponents.forEach(comp => {
        const existing = bom.components.find(item => item.type === comp.type);
        if (existing) {
            existing.quantity++;
        } else {
            bom.components.push({
                type: comp.type,
                name: comp.config.name,
                dimensions: comp.dimensions,
                quantity: 1
            });
        }
    });
    
    // Mounting surfaces
    window.modelScene.mountingSurfaces.forEach(mount => {
        bom.hardware.push({
            type: mount.type,
            dimensions: mount.dimensions,
            quantity: 1
        });
    });
    
    // Wires
    if (window.autoWireGen) {
        bom.wires = window.autoWireGen.exportWireList();
    }
    
    return bom;
}

// Toggle between ladder view and 3D model view (deprecated - kept for compatibility)
function toggleView(viewType) {
    const ladderContainer = document.getElementById('ladder-container');
    const modelWorkspace = document.querySelector('.model-workspace');
    
    if (viewType === 'ladder') {
        ladderContainer.style.display = 'flex';
        modelWorkspace.style.display = 'none';
    } else if (viewType === '3d') {
        ladderContainer.style.display = 'none';
        modelWorkspace.style.display = 'flex';
        
        // Initialize 3D model if not already
        if (!window.modelScene) {
            initModel();
        }
    } else if (viewType === 'split') {
        ladderContainer.style.display = 'flex';
        ladderContainer.style.width = '50%';
        modelWorkspace.style.display = 'flex';
        modelWorkspace.style.width = '50%';
        
        // Initialize 3D model if not already
        if (!window.modelScene) {
            initModel();
        }
    }
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initModel,
        createExampleSetup,
        syncLadderTo3D,
        generateAutoWiring,
        exportBOM,
        toggleView
    };
}
