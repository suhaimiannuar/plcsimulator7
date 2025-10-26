/**
 * Drawing View Initialization
 */

// Global variables
window.drawingCanvas = null;
window.drawingToolbar = null;

// Initialize Drawing view
function initDrawing() {
    if (typeof DrawingCanvas === 'undefined') {
        console.error('DrawingCanvas not loaded');
        return;
    }
    
    // Create drawing canvas
    window.drawingCanvas = new DrawingCanvas('drawing-container');
    
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

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initDrawing };
}
