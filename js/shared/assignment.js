// ===== Assignment Manager =====
// Links 3D components to ladder diagram addresses

class AssignmentManager {
    constructor() {
        this.assignments = new Map();        // 3D component → Ladder address
        this.reverseMap = new Map();         // Ladder address → 3D component
        this.unassigned3D = new Set();       // 3D components without ladder link
        this.unassignedLadder = new Set();   // Ladder I/O without 3D component
        this.listeners = new Map();          // Event listeners for sync
    }
    
    // ====================
    // Assignment Operations
    // ====================
    
    /**
     * Link a 3D component to a ladder diagram address
     * @param {Object} component3D - The 3D component object
     * @param {string} ladderAddress - Ladder address (e.g., 'I0.0', 'Q0.1', 'M0.0')
     * @returns {boolean} Success status
     */
    assign(component3D, ladderAddress) {
        // Validate inputs
        if (!component3D || !component3D.id) {
            console.error('Invalid 3D component');
            return false;
        }
        
        if (!this.isValidLadderAddress(ladderAddress)) {
            console.error(`Invalid ladder address: ${ladderAddress}`);
            return false;
        }
        
        // Check if component already assigned
        if (this.assignments.has(component3D.id)) {
            const oldAddress = this.assignments.get(component3D.id);
            console.warn(`Component ${component3D.id} was assigned to ${oldAddress}, reassigning to ${ladderAddress}`);
            this.unassign(component3D);
        }
        
        // Check if address already used
        if (this.reverseMap.has(ladderAddress)) {
            const oldComponent = this.reverseMap.get(ladderAddress);
            console.warn(`Address ${ladderAddress} was assigned to ${oldComponent.id}, reassigning to ${component3D.id}`);
            this.unassign(oldComponent);
        }
        
        // Create assignment
        this.assignments.set(component3D.id, {
            address: ladderAddress,
            component: component3D,
            assignedAt: Date.now()
        });
        this.reverseMap.set(ladderAddress, component3D);
        
        // Remove from unassigned lists
        this.unassigned3D.delete(component3D.id);
        this.unassignedLadder.delete(ladderAddress);
        
        // Store assignment in component userData
        if (component3D.mesh) {
            component3D.mesh.userData.ladderAddress = ladderAddress;
        }
        component3D.ladderAddress = ladderAddress;
        
        // Set up bi-directional sync
        this.setupSync(component3D, ladderAddress);
        
        console.log(`✅ Assigned ${component3D.name || component3D.type} (${component3D.id}) → ${ladderAddress}`);
        
        // Dispatch event
        this.dispatchEvent('assigned', { component3D, ladderAddress });
        
        return true;
    }
    
    /**
     * Remove assignment from a 3D component
     * @param {Object} component3D - The 3D component object
     * @returns {boolean} Success status
     */
    unassign(component3D) {
        const componentId = component3D.id || component3D;
        
        if (!this.assignments.has(componentId)) {
            console.warn(`Component ${componentId} is not assigned`);
            return false;
        }
        
        const assignment = this.assignments.get(componentId);
        const ladderAddress = assignment.address;
        
        // Remove from maps
        this.assignments.delete(componentId);
        this.reverseMap.delete(ladderAddress);
        
        // Add to unassigned lists
        this.unassigned3D.add(componentId);
        this.unassignedLadder.add(ladderAddress);
        
        // Remove from component userData
        if (component3D.mesh) {
            delete component3D.mesh.userData.ladderAddress;
        }
        delete component3D.ladderAddress;
        
        // Remove sync listeners
        this.removeSync(component3D);
        
        console.log(`❌ Unassigned ${component3D.name || componentId} from ${ladderAddress}`);
        
        // Dispatch event
        this.dispatchEvent('unassigned', { component3D, ladderAddress });
        
        return true;
    }
    
    /**
     * Get ladder address for a 3D component
     * @param {Object|string} component3D - Component object or ID
     * @returns {string|null} Ladder address or null
     */
    getLadderAddress(component3D) {
        const componentId = component3D.id || component3D;
        const assignment = this.assignments.get(componentId);
        return assignment ? assignment.address : null;
    }
    
    /**
     * Get 3D component for a ladder address
     * @param {string} ladderAddress - Ladder address
     * @returns {Object|null} 3D component or null
     */
    get3DComponent(ladderAddress) {
        return this.reverseMap.get(ladderAddress) || null;
    }
    
    /**
     * Check if component is assigned
     * @param {Object|string} component3D - Component object or ID
     * @returns {boolean}
     */
    isAssigned(component3D) {
        const componentId = component3D.id || component3D;
        return this.assignments.has(componentId);
    }
    
    // ====================
    // Validation
    // ====================
    
    /**
     * Validate ladder diagram address format
     * @param {string} address - Address to validate
     * @returns {boolean}
     */
    isValidLadderAddress(address) {
        if (!address || typeof address !== 'string') {
            return false;
        }
        
        // Valid formats:
        // I0.0 - I7.7 (Inputs)
        // Q0.0 - Q7.7 (Outputs)
        // M0.0 - M255.7 (Memory bits)
        // T0 - T255 (Timers)
        // C0 - C255 (Counters)
        
        const patterns = [
            /^I[0-7]\.[0-7]$/,      // Digital Input
            /^Q[0-7]\.[0-7]$/,      // Digital Output
            /^M\d{1,3}\.[0-7]$/,    // Memory bit
            /^T\d{1,3}$/,           // Timer
            /^C\d{1,3}$/            // Counter
        ];
        
        return patterns.some(pattern => pattern.test(address));
    }
    
    // ====================
    // Unassigned Tracking
    // ====================
    
    /**
     * Register a 3D component as available for assignment
     * @param {Object} component3D - Component to register
     */
    register3DComponent(component3D) {
        if (!this.isAssigned(component3D)) {
            this.unassigned3D.add(component3D.id);
        }
    }
    
    /**
     * Register a ladder address as available for assignment
     * @param {string} ladderAddress - Address to register
     */
    registerLadderAddress(ladderAddress) {
        if (!this.reverseMap.has(ladderAddress)) {
            this.unassignedLadder.add(ladderAddress);
        }
    }
    
    /**
     * Get all unassigned 3D components
     * @returns {Array} Array of component IDs
     */
    getUnassigned3D() {
        return Array.from(this.unassigned3D);
    }
    
    /**
     * Get all unassigned ladder addresses
     * @returns {Array} Array of ladder addresses
     */
    getUnassignedLadder() {
        return Array.from(this.unassignedLadder);
    }
    
    /**
     * Get count of unassigned items
     * @returns {Object} Counts
     */
    getUnassignedCount() {
        return {
            components3D: this.unassigned3D.size,
            ladderAddresses: this.unassignedLadder.size
        };
    }
    
    // ====================
    // State Synchronization
    // ====================
    
    /**
     * Set up bidirectional state sync between 3D component and ladder
     * @param {Object} component3D - 3D component
     * @param {string} ladderAddress - Ladder address
     */
    setupSync(component3D, ladderAddress) {
        const componentId = component3D.id;
        
        // Store listener references for cleanup
        if (!this.listeners.has(componentId)) {
            this.listeners.set(componentId, {});
        }
        
        // 3D → Ladder (when user interacts with 3D component)
        const to3D = (newState) => {
            if (typeof ladderDiagram !== 'undefined') {
                // Update ladder diagram state
                const addressType = ladderAddress[0]; // I, Q, M, T, C
                
                if (addressType === 'I') {
                    // Input - set from 3D interaction
                    ladderDiagram.setInputState(ladderAddress, newState);
                } else if (addressType === 'Q') {
                    // Output - normally controlled by ladder, but can be forced
                    console.log(`3D component ${componentId} trying to set output ${ladderAddress}`);
                }
            }
        };
        
        // Ladder → 3D (when ladder logic changes output)
        const toLadder = (newState) => {
            // Update 3D component visual state
            if (component3D.setState && typeof component3D.setState === 'function') {
                component3D.setState(newState);
            }
            
            // For outputs that have visual indicators (LEDs, motors, etc.)
            if (component3D.turnOn && component3D.turnOff) {
                if (newState) {
                    component3D.turnOn();
                } else {
                    component3D.turnOff();
                }
            }
        };
        
        // Store listeners
        this.listeners.get(componentId).to3D = to3D;
        this.listeners.get(componentId).toLadder = toLadder;
        
        // Hook into component events
        if (component3D.on && typeof component3D.on === 'function') {
            component3D.on('stateChange', to3D);
        }
    }
    
    /**
     * Remove sync listeners for a component
     * @param {Object} component3D - Component to unsync
     */
    removeSync(component3D) {
        const componentId = component3D.id || component3D;
        
        if (this.listeners.has(componentId)) {
            // Remove event listeners
            const listeners = this.listeners.get(componentId);
            
            if (component3D.off && typeof component3D.off === 'function') {
                component3D.off('stateChange', listeners.to3D);
            }
            
            this.listeners.delete(componentId);
        }
    }
    
    /**
     * Sync ladder state to 3D component
     * @param {string} ladderAddress - Ladder address that changed
     * @param {*} newState - New state value
     */
    syncLadderTo3D(ladderAddress, newState) {
        const component3D = this.get3DComponent(ladderAddress);
        if (!component3D) return;
        
        const componentId = component3D.id;
        const listeners = this.listeners.get(componentId);
        
        if (listeners && listeners.toLadder) {
            listeners.toLadder(newState);
        }
    }
    
    // ====================
    // Import/Export
    // ====================
    
    /**
     * Export assignments for saving
     * @returns {Array} Assignment data
     */
    export() {
        const data = [];
        
        for (let [componentId, assignment] of this.assignments) {
            data.push({
                component3DId: componentId,
                component3DType: assignment.component.type,
                component3DName: assignment.component.name,
                ladderAddress: assignment.address,
                assignedAt: assignment.assignedAt
            });
        }
        
        return data;
    }
    
    /**
     * Import assignments when loading
     * @param {Array} data - Assignment data
     * @param {Object} scene3D - 3D scene with components
     * @returns {Object} Import results
     */
    import(data, scene3D) {
        const results = {
            success: 0,
            failed: 0,
            errors: []
        };
        
        if (!Array.isArray(data)) {
            results.errors.push('Invalid data format');
            return results;
        }
        
        data.forEach(item => {
            try {
                // Find component in scene
                const component3D = scene3D.getComponentById(item.component3DId);
                
                if (component3D) {
                    if (this.assign(component3D, item.ladderAddress)) {
                        results.success++;
                    } else {
                        results.failed++;
                        results.errors.push(`Failed to assign ${item.component3DId} to ${item.ladderAddress}`);
                    }
                } else {
                    results.failed++;
                    results.errors.push(`Component ${item.component3DId} not found in scene`);
                }
            } catch (error) {
                results.failed++;
                results.errors.push(`Error processing ${item.component3DId}: ${error.message}`);
            }
        });
        
        console.log(`Import complete: ${results.success} success, ${results.failed} failed`);
        
        return results;
    }
    
    /**
     * Clear all assignments
     */
    clear() {
        // Remove all sync listeners
        for (let [componentId, assignment] of this.assignments) {
            this.removeSync(assignment.component);
        }
        
        this.assignments.clear();
        this.reverseMap.clear();
        this.listeners.clear();
        
        console.log('All assignments cleared');
        
        this.dispatchEvent('cleared');
    }
    
    // ====================
    // Statistics
    // ====================
    
    /**
     * Get assignment statistics
     * @returns {Object} Statistics
     */
    getStats() {
        const stats = {
            totalAssignments: this.assignments.size,
            unassigned3D: this.unassigned3D.size,
            unassignedLadder: this.unassignedLadder.size,
            byType: {}
        };
        
        // Count by address type
        for (let [componentId, assignment] of this.assignments) {
            const addressType = assignment.address[0];
            stats.byType[addressType] = (stats.byType[addressType] || 0) + 1;
        }
        
        return stats;
    }
    
    /**
     * Get all assignments
     * @returns {Array} All assignments
     */
    getAllAssignments() {
        const list = [];
        
        for (let [componentId, assignment] of this.assignments) {
            list.push({
                componentId: componentId,
                componentType: assignment.component.type,
                componentName: assignment.component.name,
                ladderAddress: assignment.address,
                assignedAt: assignment.assignedAt
            });
        }
        
        return list;
    }
    
    // ====================
    // Event System
    // ====================
    
    /**
     * Dispatch custom event
     * @param {string} eventName - Event name
     * @param {Object} detail - Event detail
     */
    dispatchEvent(eventName, detail = {}) {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(`assignment:${eventName}`, { detail }));
        }
    }
    
    /**
     * Listen to assignment events
     * @param {string} eventName - Event name (assigned, unassigned, cleared)
     * @param {Function} callback - Callback function
     */
    on(eventName, callback) {
        if (typeof window !== 'undefined') {
            window.addEventListener(`assignment:${eventName}`, (e) => callback(e.detail));
        }
    }
}

// Create global instance
const assignmentManager = new AssignmentManager();
