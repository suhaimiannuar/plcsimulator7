// ===== View Switching & Sidebar Management =====
// Handles switching between Ladder and Drawing views with appropriate sidebar content

/**
 * Switch between views (ladder, drawing, or 3D models)
 * @param {string} viewType - 'ladder', 'drawing', or '3dmodels'
 */
function switchToView(viewType) {
    const ladderWorkspace = document.querySelector('.ladder-workspace');
    const drawingWorkspace = document.querySelector('.drawing-workspace');
    const modelWorkspace = document.querySelector('.model-workspace');
    const ladderRightPanels = document.getElementById('ladder-right-panels');
    const modelRightPanels = document.getElementById('model-right-panels');
    
    // Sidebar content divs
    const ladderComponents = document.getElementById('ladder-components');
    const drawingComponents = document.getElementById('drawing-components');
    const modelComponents = document.getElementById('model-components');
    
    const viewLadderBtn = document.getElementById('viewLadder');
    const viewDrawingBtn = document.getElementById('viewDrawing');
    const view3DModelsBtn = document.getElementById('view3DModels');
    
    // Hide all views
    if (ladderWorkspace) ladderWorkspace.style.display = 'none';
    if (drawingWorkspace) drawingWorkspace.style.display = 'none';
    if (modelWorkspace) modelWorkspace.style.display = 'none';
    if (ladderRightPanels) ladderRightPanels.style.display = 'none';
    if (modelRightPanels) modelRightPanels.style.display = 'none';
    
    // Hide all sidebar content
    if (ladderComponents) ladderComponents.style.display = 'none';
    if (drawingComponents) drawingComponents.style.display = 'none';
    if (modelComponents) modelComponents.style.display = 'none';
    
    // Reset button styles
    [viewLadderBtn, viewDrawingBtn, view3DModelsBtn].forEach(btn => {
        if (btn) {
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-secondary');
        }
    });
    
    // Show selected view
    if (viewType === 'ladder') {
        if (ladderWorkspace) ladderWorkspace.style.display = 'block';
        if (ladderRightPanels) ladderRightPanels.style.display = 'block';
        if (ladderComponents) ladderComponents.style.display = 'block';
        if (viewLadderBtn) {
            viewLadderBtn.classList.remove('btn-secondary');
            viewLadderBtn.classList.add('btn-primary');
        }
        console.log('Switched to Ladder view');
        
    } else if (viewType === 'drawing') {
        if (drawingWorkspace) drawingWorkspace.style.display = 'block';
        if (drawingComponents) drawingComponents.style.display = 'block';
        if (viewDrawingBtn) {
            viewDrawingBtn.classList.remove('btn-secondary');
            viewDrawingBtn.classList.add('btn-primary');
        }
        
        // Initialize drawing view if not already
        if (!window.drawingCanvas && typeof initDrawing === 'function') {
            initDrawing();
        }
        
        console.log('Switched to Drawing view');
        
    } else if (viewType === '3dmodels') {
        if (modelWorkspace) modelWorkspace.style.display = 'block';
        if (modelComponents) modelComponents.style.display = 'block';
        if (modelRightPanels) modelRightPanels.style.display = 'block';
        if (view3DModelsBtn) {
            view3DModelsBtn.classList.remove('btn-secondary');
            view3DModelsBtn.classList.add('btn-primary');
        }
        
        // Initialize 3D viewer if not already
        if (typeof window.init3DModelViewer === 'function') {
            window.init3DModelViewer();
        }
        
        console.log('Switched to 3D Models view');
    }
}

/**
 * Switch to Ladder view (legacy function for backward compatibility)
 */
function switchToLadderView() {
    switchToView('ladder');
}

// Initialize on DOM load
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', function() {
        // Setup view switching buttons
        const viewLadder = document.getElementById('viewLadder');
        const viewDrawing = document.getElementById('viewDrawing');
        const view3DModels = document.getElementById('view3DModels');
        
        if (viewLadder) {
            viewLadder.addEventListener('click', () => switchToView('ladder'));
        }
        
        if (viewDrawing) {
            viewDrawing.addEventListener('click', () => switchToView('drawing'));
        }
        
        if (view3DModels) {
            view3DModels.addEventListener('click', () => switchToView('3dmodels'));
        }
        
        console.log('✅ View switching initialized');
    });
}
