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
    
    // Initialize mounting UI
    initMountingUI();
    
    // Add keyboard shortcut for magnetic snap toggle (M key)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'm' || e.key === 'M') {
            if (window.modelScene) {
                const enabled = window.modelScene.toggleMagneticSnap();
                // Show notification
                const notification = document.createElement('div');
                notification.style.cssText = `
                    position: fixed;
                    top: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: ${enabled ? '#27ae60' : '#e74c3c'};
                    color: white;
                    padding: 10px 20px;
                    border-radius: 4px;
                    z-index: 10000;
                    font-size: 14px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                `;
                notification.textContent = `🧲 Magnetic Snap: ${enabled ? 'ON' : 'OFF'}`;
                document.body.appendChild(notification);
                setTimeout(() => notification.remove(), 2000);
            }
        }
    });
    
    console.log('3D Model initialized');
    console.log('💡 Press M to toggle magnetic snapping');
    
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
    
    // Add mounting plate (REQUIRED - components cannot be added without mounting)
    const plate = window.modelScene.addMountingSurface('plate', {
        width: 800,
        length: 600,
        thickness: 2
    }, { x: 0, y: 0, z: 0 });
    
    if (!plate) {
        console.error('Failed to create mounting surface');
        return;
    }
    
    // Add DIN rail on plate at y=50 (above plate surface)
    const dinRail = window.modelScene.addMountingSurface('din-rail', {
        length: 500
    }, { x: 0, y: 50, z: -100 });
    
    console.log('✅ Mounting surfaces added');
    
    // Now components can be added (they will snap to mountings)
    // Add power supply
    const powerSupply = window.modelScene.addPLCComponent('power-supply', {
        x: -200,
        y: 50,
        z: -100
    });
    
    // Add CPU
    const cpu = window.modelScene.addPLCComponent('cpu', {
        x: -50,
        y: 50,
        z: -100
    });
    
    // Add I/O modules
    const diModule = window.modelScene.addPLCComponent('digital-input', {
        x: 50,
        y: 50,
        z: -100
    });
    
    const doModule = window.modelScene.addPLCComponent('digital-output', {
        x: 150,
        y: 50,
        z: -100
    });
    
    console.log('✅ PLC components added and snapped to DIN rail');
    
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

// Initialize mounting UI controls
function initMountingUI() {
    // Create mounting control panel
    const controlPanel = document.createElement('div');
    controlPanel.id = 'mounting-controls';
    controlPanel.style.cssText = `
        position: absolute;
        bottom: 20px;
        left: 20px;
        background: rgba(255, 255, 255, 0.95);
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        z-index: 1000;
        min-width: 250px;
    `;
    
    controlPanel.innerHTML = `
        <h4 style="margin: 0 0 10px 0; color: #2c3e50;">Add Mounting Surface</h4>
        <div style="margin-bottom: 10px;">
            <label style="display: block; margin-bottom: 5px; font-size: 12px;">Type:</label>
            <select id="mounting-type" style="width: 100%; padding: 5px; border-radius: 4px;">
                <option value="plate">Plate (Floor only)</option>
                <option value="box">Box (4 walls + floor)</option>
                <option value="shelf">Shelf (1 wall + floor)</option>
                <option value="din-rail">DIN Rail</option>
            </select>
        </div>
        <div style="margin-bottom: 10px;" id="dimensions-plate">
            <label style="display: block; margin-bottom: 5px; font-size: 12px;">Width:</label>
            <input type="number" id="mounting-width" value="400" style="width: 100%; padding: 5px; border-radius: 4px;">
            <label style="display: block; margin: 5px 0; font-size: 12px;">Length:</label>
            <input type="number" id="mounting-length" value="600" style="width: 100%; padding: 5px; border-radius: 4px;">
        </div>
        <div style="display: none; margin-bottom: 10px;" id="dimensions-box">
            <label style="display: block; margin-bottom: 5px; font-size: 12px;">Height:</label>
            <input type="number" id="mounting-height" value="300" style="width: 100%; padding: 5px; border-radius: 4px;">
        </div>
        <button id="add-mounting-btn" style="width: 100%; padding: 8px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
            ➕ Add Mounting
        </button>
        <div style="margin-top: 10px; font-size: 11px; color: #7f8c8d;">
            <strong>Rules:</strong><br>
            • Components require mounting<br>
            • Mountings cannot overlap<br>
            • Items snap to surfaces<br>
            <br>
            <label style="display: flex; align-items: center; gap: 5px; margin-top: 5px;">
                <input type="checkbox" id="magneticSnapToggle" checked style="cursor: pointer;">
                <span>🧲 Magnetic Snap (M)</span>
            </label>
        </div>
    `;
    
    const modelContainer = document.getElementById('model-container') || document.body;
    modelContainer.appendChild(controlPanel);

    // Event listeners (use controlPanel scoped selectors to avoid collisions)
    const typeSelect = controlPanel.querySelector('#mounting-type');
    const addBtn = controlPanel.querySelector('#add-mounting-btn');
    const magneticToggle = controlPanel.querySelector('#magneticSnapToggle');

    // Skip if elements don't exist yet
    if (!typeSelect || !addBtn) {
        console.log('Mounting UI elements not found, skipping initialization');
        return;
    }
    
    // Magnetic snap toggle
    if (magneticToggle && window.modelScene) {
        magneticToggle.addEventListener('change', (e) => {
            window.modelScene.toggleMagneticSnap(e.target.checked);
        });
    }

    typeSelect.addEventListener('change', () => {
        const plateDiv = controlPanel.querySelector('#dimensions-plate');
        const boxDiv = controlPanel.querySelector('#dimensions-box');

        if (typeSelect.value === 'box') {
            boxDiv.style.display = 'block';
        } else {
            boxDiv.style.display = 'none';
        }
    });

    addBtn.addEventListener('click', () => {
        const type = typeSelect.value;
        const width = parseInt(controlPanel.querySelector('#mounting-width').value);
        const length = parseInt(controlPanel.querySelector('#mounting-length').value);
        const height = parseInt(controlPanel.querySelector('#mounting-height').value);

        let dimensions = {};

        switch(type) {
            case 'plate':
                dimensions = { width, length, thickness: 2 };
                break;
            case 'box':
                dimensions = { width, length, height, wallThickness: 2 };
                break;
            case 'shelf':
                dimensions = { wallWidth: width, wallHeight: height, shelfDepth: 200, thickness: 2 };
                break;
            case 'din-rail':
                dimensions = { length: length };
                break;
        }

        // Add mounting at origin by default (bottom-left origin for box will be interpreted)
        const mounting = window.modelScene.addMountingSurface(type, dimensions, { x: 0, y: 0, z: 0 });

        if (mounting) {
            alert(`${type.charAt(0).toUpperCase() + type.slice(1)} mounting added! You can now add components.`);
        }
    });
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initModel,
        createExampleSetup,
        syncLadderTo3D,
        generateAutoWiring,
        exportBOM,
        toggleView,
        initMountingUI
    };
}
