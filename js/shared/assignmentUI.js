// ===== Assignment UI Management =====
// Handles the UI for linking 3D components to ladder diagram addresses

/**
 * Show assignment dialog for a specific component
 * @param {Object} component3D - 3D component to assign
 */
function showAssignmentDialog(component3D) {
    const modal = document.getElementById('assignmentModal');
    const singleView = document.getElementById('singleAssignment');
    const allView = document.getElementById('allAssignments');
    
    if (!modal || !singleView || !allView) return;
    
    // Show single assignment view
    singleView.style.display = 'block';
    allView.style.display = 'none';
    
    // Set component name
    const nameEl = document.getElementById('assignComponentName');
    if (nameEl) {
        nameEl.textContent = `Assign: ${component3D.name || component3D.type} (${component3D.id})`;
    }
    
    // Populate ladder address dropdown
    populateLadderAddresses(component3D);
    
    // Show current assignment
    updateCurrentAssignment(component3D);
    
    // Store component reference
    modal.dataset.componentId = component3D.id;
    
    // Show modal
    modal.style.display = 'block';
}

/**
 * Show all assignments view
 */
function showAllAssignments() {
    const modal = document.getElementById('assignmentModal');
    const singleView = document.getElementById('singleAssignment');
    const allView = document.getElementById('allAssignments');
    
    if (!modal || !singleView || !allView) return;
    
    // Show all assignments view
    singleView.style.display = 'none';
    allView.style.display = 'block';
    
    // Update statistics
    updateAssignmentStats();
    
    // Populate assignment table
    populateAssignmentTable();
    
    // Show unassigned components
    populateUnassignedComponents();
    
    // Show modal
    modal.style.display = 'block';
}

/**
 * Populate ladder address dropdown based on component type
 * @param {Object} component3D - Component being assigned
 */
function populateLadderAddresses(component3D) {
    const select = document.getElementById('ladderAddressSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">-- Select Ladder Address --</option>';
    
    // Determine appropriate addresses based on component type
    let addresses = [];
    
    if (component3D.type === 'button' || component3D.type === 'switch') {
        // Input devices: I0.0 - I7.7
        for (let byte = 0; byte <= 7; byte++) {
            for (let bit = 0; bit <= 7; bit++) {
                addresses.push(`I${byte}.${bit}`);
            }
        }
    } else if (component3D.type === 'motor' || component3D.type === 'led') {
        // Output devices: Q0.0 - Q7.7
        for (let byte = 0; byte <= 7; byte++) {
            for (let bit = 0; bit <= 7; bit++) {
                addresses.push(`Q${byte}.${bit}`);
            }
        }
    } else {
        // Generic: show all I/O
        for (let byte = 0; byte <= 7; byte++) {
            for (let bit = 0; bit <= 7; bit++) {
                addresses.push(`I${byte}.${bit}`);
                addresses.push(`Q${byte}.${bit}`);
            }
        }
    }
    
    // Add options
    addresses.forEach(address => {
        const option = document.createElement('option');
        option.value = address;
        
        // Check if already assigned
        if (typeof assignmentManager !== 'undefined') {
            const assigned = assignmentManager.get3DComponent(address);
            if (assigned && assigned.id !== component3D.id) {
                option.textContent = `${address} (assigned to ${assigned.name || assigned.id})`;
                option.disabled = true;
            } else {
                option.textContent = address;
            }
        } else {
            option.textContent = address;
        }
        
        select.appendChild(option);
    });
    
    // Pre-select current assignment
    if (typeof assignmentManager !== 'undefined') {
        const current = assignmentManager.getLadderAddress(component3D);
        if (current) {
            select.value = current;
        }
    }
}

/**
 * Update current assignment display
 * @param {Object} component3D - Component to show assignment for
 */
function updateCurrentAssignment(component3D) {
    const div = document.getElementById('currentAssignment');
    if (!div || typeof assignmentManager === 'undefined') return;
    
    const address = assignmentManager.getLadderAddress(component3D);
    
    if (address) {
        div.innerHTML = `
            <strong>Current Assignment:</strong> ${address}
            <button onclick="unassignComponentFromDialog()" class="btn btn-danger btn-sm" style="margin-left: 10px;">
                ❌ Unassign
            </button>
        `;
        div.style.background = '#27ae60';
    } else {
        div.innerHTML = '<strong>Status:</strong> ⚠️ Not assigned to any ladder address';
        div.style.background = '#e67e22';
    }
}

/**
 * Confirm assignment from dialog
 */
function confirmAssignmentFromDialog() {
    const modal = document.getElementById('assignmentModal');
    const select = document.getElementById('ladderAddressSelect');
    
    if (!modal || !select || typeof assignmentManager === 'undefined' || typeof modelScene === 'undefined') {
        return;
    }
    
    const componentId = modal.dataset.componentId;
    const ladderAddress = select.value;
    
    if (!componentId || !ladderAddress) {
        alert('Please select a ladder address');
        return;
    }
    
    // Get component
    const component = modelScene.getComponentById(componentId);
    if (!component) {
        alert('Component not found');
        return;
    }
    
    // Assign
    if (assignmentManager.assign(component, ladderAddress)) {
        alert(`✅ Assigned ${component.name || component.type} to ${ladderAddress}`);
        updateAssignmentCount();
        updateComponentInfo(component);
        modal.style.display = 'none';
    } else {
        alert('❌ Failed to assign component');
    }
}

/**
 * Unassign component from dialog
 */
function unassignComponentFromDialog() {
    const modal = document.getElementById('assignmentModal');
    
    if (!modal || typeof assignmentManager === 'undefined' || typeof modelScene === 'undefined') {
        return;
    }
    
    const componentId = modal.dataset.componentId;
    const component = modelScene.getComponentById(componentId);
    
    if (!component) {
        alert('Component not found');
        return;
    }
    
    if (confirm(`Unassign ${component.name || component.type} from ladder diagram?`)) {
        if (assignmentManager.unassign(component)) {
            alert('✅ Component unassigned');
            updateAssignmentCount();
            updateCurrentAssignment(component);
            updateComponentInfo(component);
        }
    }
}

/**
 * Update assignment statistics
 */
function updateAssignmentStats() {
    if (typeof assignmentManager === 'undefined') return;
    
    const stats = assignmentManager.getStats();
    const unassigned = assignmentManager.getUnassignedCount();
    
    // Update counts
    const assignedEl = document.getElementById('assignedCount');
    const unassigned3DEl = document.getElementById('unassigned3DCount');
    const unassignedLadderEl = document.getElementById('unassignedLadderCount');
    
    if (assignedEl) assignedEl.textContent = stats.totalAssignments;
    if (unassigned3DEl) unassigned3DEl.textContent = unassigned.components3D;
    if (unassignedLadderEl) unassignedLadderEl.textContent = unassigned.ladderAddresses;
}

/**
 * Populate assignment table
 */
function populateAssignmentTable() {
    const tbody = document.getElementById('assignmentTableBody');
    if (!tbody || typeof assignmentManager === 'undefined') return;
    
    const assignments = assignmentManager.getAllAssignments();
    
    if (assignments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="padding: 20px; text-align: center; color: #7f8c8d;">No assignments yet</td></tr>';
        return;
    }
    
    tbody.innerHTML = assignments.map(assignment => `
        <tr style="border-bottom: 1px solid #34495e;">
            <td style="padding: 8px;">${assignment.componentName || assignment.componentId}</td>
            <td style="padding: 8px;">${assignment.componentType}</td>
            <td style="padding: 8px;"><strong style="color: #4CAF50;">${assignment.ladderAddress}</strong></td>
            <td style="padding: 8px;">
                <button onclick="unassignById('${assignment.componentId}')" class="btn btn-danger btn-sm">
                    ❌ Unassign
                </button>
            </td>
        </tr>
    `).join('');
}

/**
 * Populate unassigned components list
 */
function populateUnassignedComponents() {
    const div = document.getElementById('unassigned3DList');
    if (!div || typeof assignmentManager === 'undefined' || typeof modelScene === 'undefined') return;
    
    const unassignedIds = assignmentManager.getUnassigned3D();
    
    if (unassignedIds.length === 0) {
        div.innerHTML = '<p style="color: #7f8c8d;">No unassigned components</p>';
        return;
    }
    
    div.innerHTML = unassignedIds.map(id => {
        const component = modelScene.getComponentById(id);
        if (!component) return '';
        
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #34495e;">
                <div>
                    <strong>${component.name || component.type}</strong>
                    <small style="color: #7f8c8d; margin-left: 10px;">${component.id}</small>
                </div>
                <button onclick="assignComponentById('${id}')" class="btn btn-success btn-sm">
                    📌 Assign
                </button>
            </div>
        `;
    }).join('');
}

/**
 * Assign component by ID (from unassigned list)
 * @param {string} componentId - Component ID
 */
function assignComponentById(componentId) {
    if (typeof modelScene === 'undefined') return;
    
    const component = modelScene.getComponentById(componentId);
    if (component) {
        showAssignmentDialog(component);
    }
}

/**
 * Unassign component by ID
 * @param {string} componentId - Component ID
 */
function unassignById(componentId) {
    if (typeof assignmentManager === 'undefined' || typeof modelScene === 'undefined') return;
    
    const component = modelScene.getComponentById(componentId);
    if (!component) return;
    
    if (confirm(`Unassign ${component.name || component.type}?`)) {
        assignmentManager.unassign(component);
        updateAssignmentStats();
        populateAssignmentTable();
        populateUnassignedComponents();
        updateAssignmentCount();
    }
}

/**
 * Clear all assignments
 */
function clearAllAssignments() {
    if (typeof assignmentManager === 'undefined') return;
    
    if (confirm('Clear all component assignments? This cannot be undone.')) {
        assignmentManager.clear();
        updateAssignmentStats();
        populateAssignmentTable();
        populateUnassignedComponents();
        updateAssignmentCount();
        alert('✅ All assignments cleared');
    }
}

/**
 * Update assignment count badge in header
 */
function updateAssignmentCount() {
    const badge = document.getElementById('assignmentCount');
    if (!badge || typeof assignmentManager === 'undefined') return;
    
    const stats = assignmentManager.getStats();
    badge.textContent = stats.totalAssignments;
}

/**
 * Update component info panel when component is selected
 * @param {Object} component - Selected component
 */
function updateComponentInfo(component) {
    const panel = document.getElementById('componentInfo');
    const nameEl = document.getElementById('compInfoName');
    const detailsEl = document.getElementById('compInfoDetails');
    
    if (!panel || !nameEl || !detailsEl) return;
    
    if (!component) {
        panel.style.display = 'none';
        return;
    }
    
    // Show panel
    panel.style.display = 'block';
    
    // Set name
    nameEl.textContent = component.name || component.type;
    
    // Build details
    let details = `<div style="margin-bottom: 5px;"><strong>Type:</strong> ${component.type}</div>`;
    details += `<div style="margin-bottom: 5px;"><strong>ID:</strong> ${component.id}</div>`;
    
    // Add assignment status
    if (typeof assignmentManager !== 'undefined') {
        const address = assignmentManager.getLadderAddress(component);
        if (address) {
            details += `<div style="margin-bottom: 5px; color: #4CAF50;"><strong>📌 Assigned:</strong> ${address}</div>`;
        } else {
            details += `<div style="margin-bottom: 5px; color: #FF9800;"><strong>⚠️ Status:</strong> Not assigned</div>`;
        }
    }
    
    // Add state if available
    if (component.state !== undefined) {
        details += `<div style="margin-bottom: 5px;"><strong>State:</strong> ${component.state ? 'ON' : 'OFF'}</div>`;
    }
    
    // Add position
    if (component.position) {
        details += `<div style="margin-bottom: 5px; font-size: 10px; color: #7f8c8d;">
            Pos: (${Math.round(component.position.x)}, ${Math.round(component.position.y)}, ${Math.round(component.position.z)})
        </div>`;
    }
    
    detailsEl.innerHTML = details;
}

// Event listeners setup
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', function() {
        // Assign button (in sidebar)
        const assignBtn = document.getElementById('assignSelected');
        if (assignBtn) {
            assignBtn.addEventListener('click', function() {
                if (typeof modelScene !== 'undefined' && modelScene.selectedComponent) {
                    showAssignmentDialog(modelScene.selectedComponent);
                }
            });
        }
        
        // View assignments button (in sidebar)
        const viewBtn = document.getElementById('viewAssignments3D');
        if (viewBtn) {
            viewBtn.addEventListener('click', showAllAssignments);
        }
        
        // Confirm assignment button (in modal)
        const confirmBtn = document.getElementById('confirmAssignment');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', confirmAssignmentFromDialog);
        }
        
        // Clear all button
        const clearAllBtn = document.getElementById('clearAllAssignments');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', clearAllAssignments);
        }
        
        // Listen to assignment events
        if (typeof assignmentManager !== 'undefined') {
            assignmentManager.on('assigned', updateAssignmentCount);
            assignmentManager.on('unassigned', updateAssignmentCount);
            assignmentManager.on('cleared', updateAssignmentCount);
        }
    });
}
