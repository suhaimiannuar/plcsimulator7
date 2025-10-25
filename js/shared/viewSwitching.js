// ===== View Switching & Sidebar Management =====
// Handles switching between Ladder and 3D views with appropriate sidebar content

/**
 * Switch to Ladder view
 */
function switchToLadderView() {
    // Hide 3D workspace, show ladder workspace
    document.querySelector('.ladder-workspace').style.display = 'block';
    document.querySelector('.model-workspace').style.display = 'none';
    
    // Switch sidebar content
    document.getElementById('ladder-components').style.display = 'block';
    document.getElementById('model-components').style.display = 'none';
    
    // Switch right sidebar panels
    const ladderRightPanels = document.getElementById('ladder-right-panels');
    const modelRightPanels = document.getElementById('model-right-panels');
    if (ladderRightPanels) ladderRightPanels.style.display = 'block';
    if (modelRightPanels) modelRightPanels.style.display = 'none';
    
    // Update view buttons
    document.getElementById('viewLadder').classList.add('btn-primary');
    document.getElementById('viewLadder').classList.remove('btn-secondary');
    document.getElementById('view3D').classList.remove('btn-primary');
    document.getElementById('view3D').classList.add('btn-secondary');
    
    console.log('Switched to Ladder view');
}

/**
 * Switch to 3D Model view
 */
function switchTo3DView() {
    // Hide ladder workspace, show 3D workspace
    document.querySelector('.ladder-workspace').style.display = 'none';
    document.querySelector('.model-workspace').style.display = 'block';
    
    // Switch sidebar content
    document.getElementById('ladder-components').style.display = 'none';
    document.getElementById('model-components').style.display = 'block';
    
    // Switch right sidebar panels
    const ladderRightPanels = document.getElementById('ladder-right-panels');
    const modelRightPanels = document.getElementById('model-right-panels');
    if (ladderRightPanels) ladderRightPanels.style.display = 'none';
    if (modelRightPanels) modelRightPanels.style.display = 'block';
    
    // Update view buttons
    document.getElementById('view3D').classList.add('btn-primary');
    document.getElementById('view3D').classList.remove('btn-secondary');
    document.getElementById('viewLadder').classList.remove('btn-primary');
    document.getElementById('viewLadder').classList.add('btn-secondary');
    
    // Initialize 3D scene if needed
    if (typeof modelScene === 'undefined' || !modelScene) {
        initModel3D();
    }
    
    // Trigger resize to ensure proper canvas sizing
    if (typeof modelScene !== 'undefined' && modelScene.onWindowResize) {
        setTimeout(() => modelScene.onWindowResize(), 100);
    }
    
    console.log('Switched to 3D Model view');
}

/**
 * Switch to Split view (both Ladder and 3D)
 */
function switchToSplitView() {
    // Show both workspaces
    const ladderWorkspace = document.querySelector('.ladder-workspace');
    const modelWorkspace = document.querySelector('.model-workspace');
    
    ladderWorkspace.style.display = 'block';
    modelWorkspace.style.display = 'block';
    
    // Adjust layout for split view
    ladderWorkspace.style.width = '50%';
    modelWorkspace.style.width = '50%';
    ladderWorkspace.style.float = 'left';
    modelWorkspace.style.float = 'right';
    
    // Show 3D sidebar content in split view
    document.getElementById('ladder-components').style.display = 'none';
    document.getElementById('model-components').style.display = 'block';
    
    // Update view buttons
    document.getElementById('viewSplit').classList.add('btn-primary');
    document.getElementById('viewSplit').classList.remove('btn-secondary');
    document.getElementById('viewLadder').classList.remove('btn-primary');
    document.getElementById('viewLadder').classList.add('btn-secondary');
    document.getElementById('view3D').classList.remove('btn-primary');
    document.getElementById('view3D').classList.add('btn-secondary');
    
    // Initialize 3D scene if needed
    if (typeof modelScene === 'undefined' || !modelScene) {
        initModel3D();
    }
    
    console.log('Switched to Split view');
}

/**
 * Handle 3D component button clicks from sidebar
 */
function setup3DComponentButtons() {
    const componentButtons = document.querySelectorAll('.model-component-btn');
    
    componentButtons.forEach(button => {
        button.addEventListener('click', function() {
            const componentType = this.getAttribute('data-component');
            add3DComponent(componentType);
        });
    });
}

/**
 * Add 3D component to scene
 * @param {string} componentType - Type of component to add
 */
function add3DComponent(componentType) {
    if (typeof modelScene === 'undefined' || !modelScene) {
        console.error('3D scene not initialized');
        alert('Please switch to 3D view first');
        return;
    }
    
    // Random position for new components
    const position = {
        x: Math.random() * 200 - 100,
        y: 50,
        z: Math.random() * 200 - 100
    };
    
    let component;
    
    // Mounting surfaces
    if (['plate', 'box', 'shelf', 'din-rail'].includes(componentType)) {
        const dimensions = {
            width: 600,
            length: 400,
            thickness: 2,
            height: 300,
            wallThickness: 2,
            wallWidth: 400,
            wallHeight: 300,
            shelfDepth: 200
        };
        
        component = modelScene.addMountingSurface(componentType, dimensions);
        console.log(`Added mounting surface: ${componentType}`);
    }
    // PLC components
    else if (['power-supply', 'cpu', 'digital-input', 'digital-output'].includes(componentType)) {
        component = modelScene.addPLCComponent(componentType, position);
        console.log(`Added PLC component: ${componentType} at`, position);
    }
    // Field devices
    else if (['button', 'motor', 'led'].includes(componentType)) {
        const options = {
            color: componentType === 'button' ? 0xff0000 : 
                   componentType === 'led' ? 'red' : null,
            power: componentType === 'motor' ? 1500 : null
        };
        
        component = modelScene.addFieldDevice(componentType, position, options);
        console.log(`Added field device: ${componentType} at`, position);
        
        // Show success message
        showToast(`✅ Added ${componentType.toUpperCase()}`, 'success');
    }
    
    return component;
}

/**
 * Setup sidebar 3D controls
 */
function setup3DSidebarControls() {
    // Toggle Grid button
    const toggleGrid3D = document.getElementById('toggleGrid3D');
    if (toggleGrid3D) {
        toggleGrid3D.addEventListener('click', function() {
            if (typeof modelScene !== 'undefined' && modelScene.toggleGrid) {
                const isVisible = modelScene.toggleGrid();
                this.classList.toggle('btn-primary', isVisible);
                this.classList.toggle('btn-secondary', !isVisible);
            }
        });
    }
    
    // Toggle Axes button
    const toggleAxes3D = document.getElementById('toggleAxes3D');
    if (toggleAxes3D) {
        toggleAxes3D.addEventListener('click', function() {
            if (typeof modelScene !== 'undefined' && modelScene.toggleAxes) {
                const isVisible = modelScene.toggleAxes();
                this.classList.toggle('btn-primary', isVisible);
                this.classList.toggle('btn-secondary', !isVisible);
            }
        });
    }
    
    // Transform Mode selector
    const transformMode3D = document.getElementById('transformMode3D');
    if (transformMode3D) {
        transformMode3D.addEventListener('change', function() {
            if (typeof modelScene !== 'undefined' && modelScene.setTransformMode) {
                modelScene.setTransformMode(this.value);
                console.log('Transform mode set to:', this.value);
            }
        });
    }
    
    // Create Example button
    const createExample3D = document.getElementById('createExample3D');
    if (createExample3D) {
        createExample3D.addEventListener('click', function() {
            createExample3DSetup();
        });
    }
    
    // View Assignments button
    const viewAssignments3D = document.getElementById('viewAssignments3D');
    if (viewAssignments3D) {
        viewAssignments3D.addEventListener('click', function() {
            if (typeof showAllAssignments === 'function') {
                showAllAssignments();
            }
        });
    }
    
    // Assign Selected button
    const assignSelected = document.getElementById('assignSelected');
    if (assignSelected) {
        assignSelected.addEventListener('click', function() {
            if (typeof modelScene !== 'undefined' && modelScene.selectedComponent) {
                if (typeof showAssignmentDialog === 'function') {
                    showAssignmentDialog(modelScene.selectedComponent);
                }
            }
        });
    }
}

/**
 * Create example 3D setup
 */
function createExample3DSetup() {
    if (typeof modelScene === 'undefined') {
        alert('3D scene not initialized');
        return;
    }
    
    console.log('Creating example 3D setup...');
    
    // Add mounting plate
    modelScene.addMountingSurface('plate', {
        width: 600,
        length: 400,
        thickness: 2
    });
    
    // Add some components
    modelScene.addFieldDevice('button', { x: -100, y: 50, z: 0 }, { color: 0x00ff00 });
    modelScene.addFieldDevice('button', { x: -100, y: 50, z: 60 }, { color: 0xff0000 });
    modelScene.addFieldDevice('motor', { x: 0, y: 80, z: 0 }, { power: 1500 });
    modelScene.addFieldDevice('led', { x: 100, y: 50, z: 0 }, { color: 'green' });
    modelScene.addFieldDevice('led', { x: 100, y: 50, z: 60 }, { color: 'red' });
    
    showToast('✅ Example setup created!', 'success');
    console.log('Example 3D setup complete');
}

/**
 * Update selected component info in sidebar
 * @param {Object} component - Selected component
 */
function updateSidebarComponentInfo(component) {
    const infoPanel = document.getElementById('selectedComponentInfo3D');
    const compName = document.getElementById('compName');
    const compType = document.getElementById('compType');
    const compAssignment = document.getElementById('compAssignment');
    
    if (!infoPanel || !compName || !compType || !compAssignment) return;
    
    if (!component) {
        infoPanel.style.display = 'none';
        return;
    }
    
    // Show panel
    infoPanel.style.display = 'block';
    
    // Update info
    compName.textContent = component.name || component.id || 'Unknown';
    compType.textContent = component.type || 'Unknown';
    
    // Check assignment
    if (typeof assignmentManager !== 'undefined') {
        const address = assignmentManager.getLadderAddress(component);
        if (address) {
            compAssignment.innerHTML = `<span style="color: #4CAF50;">📌 ${address}</span>`;
        } else {
            compAssignment.innerHTML = '<span style="color: #FF9800;">⚠️ Not assigned</span>';
        }
    } else {
        compAssignment.textContent = '-';
    }
}

/**
 * Show toast notification
 * @param {string} message - Message to show
 * @param {string} type - Type (success, error, info)
 */
function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        padding: 15px 20px;
        border-radius: 4px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize on DOM load
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', function() {
        // Setup view switching buttons
        const viewLadder = document.getElementById('viewLadder');
        const view3D = document.getElementById('view3D');
        const viewSplit = document.getElementById('viewSplit');
        
        if (viewLadder) {
            viewLadder.addEventListener('click', switchToLadderView);
        }
        
        if (view3D) {
            view3D.addEventListener('click', switchTo3DView);
        }
        
        if (viewSplit) {
            viewSplit.addEventListener('click', switchToSplitView);
        }
        
        // Setup 3D component buttons in sidebar
        setup3DComponentButtons();
        
        // Setup 3D sidebar controls
        setup3DSidebarControls();
        
        console.log('✅ View switching initialized');
    });
    
    // Listen to component selection changes
    if (typeof window.addEventListener !== 'undefined') {
        window.addEventListener('componentSelected', function(e) {
            updateSidebarComponentInfo(e.detail.component);
        });
        
        window.addEventListener('componentDeselected', function() {
            updateSidebarComponentInfo(null);
        });
    }
}
