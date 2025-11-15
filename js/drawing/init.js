/**
 * Drawing View Initialization
 */

// Global variables
window.drawingCanvas = null;
window.drawingToolbar = null;
window.wireRouting3D = null; // 3D wire routing integration

// Initialize Drawing view
function initDrawing() {
    if (typeof DrawingCanvas === 'undefined') {
        console.error('DrawingCanvas not loaded');
        return;
    }
    
    // Create drawing canvas
    window.drawingCanvas = new DrawingCanvas('drawing-container');
    
    // Initialize 3D wire routing (if 3D scene exists)
    initWireRouting3D();
    
    // Create toolbar
    if (typeof DrawingToolbar !== 'undefined') {
        window.drawingToolbar = new DrawingToolbar(window.drawingCanvas);
    }
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Only when drawing view is active
        const drawingView = document.querySelector('.drawing-workspace');
        if (!drawingView || drawingView.style.display === 'none') return;
        
        // Delete key - remove selected component
        if (e.key === 'Delete' && window.drawingCanvas.selectedComponent) {
            window.drawingCanvas.deleteComponent(window.drawingCanvas.selectedComponent);
        }
        
        // Escape - cancel wire drawing
        if (e.key === 'Escape' && window.drawingCanvas.isDrawingWire) {
            window.drawingCanvas.cancelWireDrawing();
        }
        
        // G - toggle grid snap
        if (e.key === 'g' || e.key === 'G') {
            window.drawingCanvas.snapToGrid = !window.drawingCanvas.snapToGrid;
            const btn = document.getElementById('tool-snap');
            if (btn) {
                btn.textContent = window.drawingCanvas.snapToGrid ? '⊞ Snap: ON' : '⊟ Snap: OFF';
                btn.style.background = window.drawingCanvas.snapToGrid ? '#27ae60' : '#95a5a6';
            }
        }
        
        // Ctrl/Cmd + S - Save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            const filename = prompt('Enter filename:', 'schematic.json');
            if (filename) {
                window.drawingCanvas.saveToFile(filename);
            }
        }
    });
    
    console.log('✅ Drawing view initialized');
    console.log('💡 Keyboard shortcuts:');
    console.log('  - Delete: Remove selected component');
    console.log('  - Escape: Cancel wire drawing');
    console.log('  - G: Toggle grid snap');
    console.log('  - Ctrl/Cmd+S: Save schematic');
    
    return window.drawingCanvas;
}

/**
 * Initialize 3D wire routing integration
 * This creates the EasyEDA-style wire routing system for 3D models
 */
function initWireRouting3D() {
    // Check if required classes are loaded
    if (typeof WireRouting3DIntegration === 'undefined') {
        console.warn('WireRouting3DIntegration not loaded - skipping 3D wire routing init');
        return;
    }
    
    // Wait for 3D scene to be available
    const initWhenReady = () => {
        if (!window.viewer3D || !window.viewer3D.portsManager) {
            console.log('⏳ Waiting for 3D scene to initialize...');
            setTimeout(initWhenReady, 500);
            return;
        }
        
        // Get the wire routing overlay canvas (overlays the 3D view)
        let canvas = document.getElementById('wire-routing-overlay');
        
        if (!canvas) {
            console.warn('Wire routing overlay canvas not found');
            return;
        }
        
        // Set canvas size to match container
        const container = document.getElementById('model-viewer-container');
        if (container) {
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
        }
        
        // Create wire routing integration
        window.wireRouting3D = new WireRouting3DIntegration(
            canvas,
            window.viewer3D,
            window.viewer3D.portsManager
        );
        
        // Setup event listeners
        window.wireRouting3D.setupEventListeners();
        
        console.log('✅ 3D Wire Routing system initialized');
        console.log('💡 Wire Routing shortcuts:');
        console.log('  - Click port to start routing');
        console.log('  - Space/Enter: Create hanging wire (for 3D routing)');
        console.log('  - Click hanging end (⊗) to resume in different view');
        console.log('  - Escape: Cancel routing');
        console.log('  - Delete: Remove selected wire');
        console.log('  - G: Toggle grid');
        console.log('  - Shift+Drag: Pan canvas');
        console.log('  - Mouse wheel: Zoom');
    };
    
    // Start checking for 3D scene
    initWhenReady();
}

// Helper function to enable/disable wire routing mode
function enableWireRoutingMode(enable = true) {
    if (!window.wireRouting3D) {
        console.warn('Wire routing not initialized');
        return;
    }
    
    if (enable) {
        window.wireRouting3D.enable();
    } else {
        window.wireRouting3D.disable();
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initDrawing };
}
