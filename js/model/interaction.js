// ===== Interaction Manager =====
// Enhanced click, touch, hover, and long-press detection for 3D components

class InteractionManager {
    constructor(scene) {
        this.scene = scene;
        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();
        
        // State tracking
        this.hoveredObject = null;
        this.selectedObject = null;
        this.pressedObject = null;
        this.pressStartTime = 0;
        this.lastClickTime = 0;
        this.clickCount = 0;
        
        // Configuration
        this.longPressDuration = 1000;  // ms for long press
        this.doubleClickDelay = 300;    // ms for double click
        this.hoverDelay = 200;          // ms before showing tooltip
        
        // Callbacks
        this.callbacks = {
            click: new Map(),
            doubleClick: new Map(),
            longPress: new Map(),
            hover: new Map(),
            hoverEnd: new Map(),
            press: new Map(),
            release: new Map(),
            drag: new Map()
        };
        
        // Tooltip element
        this.tooltip = null;
        this.hoverTimer = null;
        
        // Dragging state
        this.isDragging = false;
        this.dragStartPos = new THREE.Vector2();
        
        this.init();
    }
    
    // ====================
    // Initialization
    // ====================
    
    init() {
        const canvas = this.scene.renderer.domElement;
        
        // Universal pointer events (works on mouse, touch, pen)
        canvas.addEventListener('pointerdown', this.onPointerDown.bind(this));
        canvas.addEventListener('pointermove', this.onPointerMove.bind(this));
        canvas.addEventListener('pointerup', this.onPointerUp.bind(this));
        canvas.addEventListener('pointercancel', this.onPointerCancel.bind(this));
        canvas.addEventListener('pointerleave', this.onPointerLeave.bind(this));
        
        // Create tooltip element
        this.createTooltip();
        
        console.log('✅ Interaction Manager initialized');
    }
    
    // ====================
    // Event Handlers
    // ====================
    
    onPointerDown(event) {
        this.updatePointer(event);
        const hit = this.raycast();
        
        if (hit) {
            this.pressedObject = hit.object;
            this.pressStartTime = Date.now();
            this.dragStartPos.set(this.pointer.x, this.pointer.y);
            
            // Visual feedback - highlight
            this.highlightObject(hit.object, 'press');
            
            // Get component from mesh
            const component = this.getComponent(hit.object);
            
            if (component) {
                // Trigger press callback
                this.triggerCallback('press', component, { event, hit });
                
                // Component-specific press action
                if (component.onPress && typeof component.onPress === 'function') {
                    component.onPress();
                }
                
                console.log(`👆 Pressed: ${component.name || component.type} (${component.id})`);
            }
        }
    }
    
    onPointerMove(event) {
        this.updatePointer(event);
        
        // Check for drag
        if (this.pressedObject) {
            const distance = this.dragStartPos.distanceTo(this.pointer);
            if (distance > 0.01) {  // Threshold for drag detection
                this.isDragging = true;
                
                const component = this.getComponent(this.pressedObject);
                if (component) {
                    this.triggerCallback('drag', component, { 
                        event, 
                        delta: new THREE.Vector2(
                            this.pointer.x - this.dragStartPos.x,
                            this.pointer.y - this.dragStartPos.y
                        )
                    });
                }
            }
            return;
        }
        
        // Hover detection
        const hit = this.raycast();
        
        if (hit && hit.object !== this.hoveredObject) {
            // Leave previous object
            if (this.hoveredObject) {
                this.onHoverEnd(this.hoveredObject);
            }
            
            // Enter new object
            this.hoveredObject = hit.object;
            this.onHoverStart(hit.object, hit);
            
        } else if (!hit && this.hoveredObject) {
            // Left all objects
            this.onHoverEnd(this.hoveredObject);
            this.hoveredObject = null;
        }
    }
    
    onPointerUp(event) {
        if (!this.pressedObject) return;
        
        const pressDuration = Date.now() - this.pressStartTime;
        const component = this.getComponent(this.pressedObject);
        
        // Release visual feedback
        this.unhighlightObject(this.pressedObject);
        
        if (component) {
            // Trigger release callback
            this.triggerCallback('release', component, { event, duration: pressDuration });
            
            // Component-specific release action
            if (component.onRelease && typeof component.onRelease === 'function') {
                component.onRelease(pressDuration);
            }
            
            // Detect long press
            if (pressDuration >= this.longPressDuration) {
                this.triggerCallback('longPress', component, { event, duration: pressDuration });
                console.log(`⏱️ Long press: ${component.name || component.type} (${pressDuration}ms)`);
            }
            // Detect click (if not dragging)
            else if (!this.isDragging) {
                // Double click detection
                const now = Date.now();
                if (now - this.lastClickTime < this.doubleClickDelay) {
                    this.clickCount++;
                    if (this.clickCount === 2) {
                        this.triggerCallback('doubleClick', component, { event });
                        console.log(`👆👆 Double click: ${component.name || component.type}`);
                        this.clickCount = 0;
                    }
                } else {
                    this.clickCount = 1;
                }
                this.lastClickTime = now;
                
                // Single click (delayed to detect double click)
                setTimeout(() => {
                    if (this.clickCount === 1) {
                        this.triggerCallback('click', component, { event });
                        this.onClick(component, event);
                    }
                    this.clickCount = 0;
                }, this.doubleClickDelay);
            }
        }
        
        // Reset state
        this.pressedObject = null;
        this.isDragging = false;
    }
    
    onPointerCancel(event) {
        this.onPointerUp(event);
    }
    
    onPointerLeave(event) {
        if (this.hoveredObject) {
            this.onHoverEnd(this.hoveredObject);
            this.hoveredObject = null;
        }
    }
    
    // ====================
    // Hover Handling
    // ====================
    
    onHoverStart(object, hit) {
        const component = this.getComponent(object);
        if (!component) return;
        
        // Highlight on hover
        this.highlightObject(object, 'hover');
        
        // Show tooltip after delay
        clearTimeout(this.hoverTimer);
        this.hoverTimer = setTimeout(() => {
            this.showTooltip(component, hit);
        }, this.hoverDelay);
        
        // Trigger hover callback
        this.triggerCallback('hover', component, { object, hit });
        
        // Change cursor
        this.scene.renderer.domElement.style.cursor = 'pointer';
    }
    
    onHoverEnd(object) {
        const component = this.getComponent(object);
        
        // Remove highlight
        this.unhighlightObject(object);
        
        // Hide tooltip
        clearTimeout(this.hoverTimer);
        this.hideTooltip();
        
        // Trigger hover end callback
        if (component) {
            this.triggerCallback('hoverEnd', component, { object });
        }
        
        // Reset cursor
        this.scene.renderer.domElement.style.cursor = 'default';
    }
    
    // ====================
    // Click Handling
    // ====================
    
    onClick(component, event) {
        console.log(`🖱️ Click: ${component.name || component.type} (${component.id})`);
        
        // For input components (buttons, switches), activate on any click
        // This simplifies interaction - user doesn't need to click specific mesh
        const isInputComponent = component.type && (
            component.type.toLowerCase().includes('button') ||
            component.type.toLowerCase().includes('switch') ||
            component.type.toLowerCase().includes('input')
        );
        
        if (isInputComponent) {
            // Toggle input state directly
            if (component.toggle && typeof component.toggle === 'function') {
                component.toggle();
                console.log(`⚡ Input toggled: ${component.name || component.type} - State: ${component.state}`);
            } else if (component.state !== undefined) {
                // Manual state toggle if no toggle method
                component.state = !component.state;
                console.log(`⚡ Input state changed: ${component.name || component.type} - State: ${component.state}`);
                
                // Update visual state if component has mesh
                if (component.mesh && component.updateState) {
                    component.updateState();
                }
            }
        } else {
            // For non-input components, use existing toggle behavior
            if (component.toggle && typeof component.toggle === 'function') {
                component.toggle();
            }
        }
        
        // Select component (for transform controls)
        if (this.scene.selectComponent) {
            this.scene.selectComponent(component);
        }
        
        // Update assignment UI if needed
        if (typeof updateAssignmentUI === 'function') {
            updateAssignmentUI(component);
        }
    }
    
    // ====================
    // Visual Feedback
    // ====================
    
    highlightObject(object, type = 'select') {
        // Remove existing outline
        this.unhighlightObject(object);
        
        // Don't highlight helpers
        if (object.type === 'GridHelper' || object.type === 'AxesHelper') {
            return;
        }
        
        // Get geometry
        let geometry = object.geometry;
        if (!geometry) return;
        
        // Create outline
        const color = type === 'hover' ? 0xffff00 : 
                      type === 'press' ? 0x00ff00 : 
                      type === 'select' ? 0x00ffff : 0xffffff;
        
        const outline = new THREE.LineSegments(
            new THREE.EdgesGeometry(geometry),
            new THREE.LineBasicMaterial({ 
                color: color,
                linewidth: 2,
                transparent: true,
                opacity: 0.8
            })
        );
        outline.name = 'outline';
        outline.renderOrder = 999;  // Render on top
        
        object.add(outline);
    }
    
    unhighlightObject(object) {
        if (!object) return;
        
        const outline = object.getObjectByName('outline');
        if (outline) {
            object.remove(outline);
            outline.geometry.dispose();
            outline.material.dispose();
        }
    }
    
    // ====================
    // Tooltip
    // ====================
    
    createTooltip() {
        this.tooltip = document.createElement('div');
        this.tooltip.id = 'model-tooltip';
        this.tooltip.style.cssText = `
            position: absolute;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            pointer-events: none;
            z-index: 10000;
            display: none;
            max-width: 250px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        `;
        document.body.appendChild(this.tooltip);
    }
    
    showTooltip(component, hit) {
        if (!this.tooltip) return;
        
        // Build tooltip content
        let content = `<strong>${component.name || component.type}</strong>`;
        
        // Add type
        if (component.type) {
            content += `<br><small>Type: ${component.type}</small>`;
        }
        
        // Add assignment status
        if (typeof assignmentManager !== 'undefined') {
            const address = assignmentManager.getLadderAddress(component);
            if (address) {
                content += `<br><small style="color: #4CAF50;">📌 ${address}</small>`;
            } else {
                content += `<br><small style="color: #FF9800;">⚠️ Not assigned</small>`;
            }
        }
        
        // Add state
        if (component.state !== undefined) {
            content += `<br><small>State: ${component.state ? 'ON' : 'OFF'}</small>`;
        }
        
        // Add custom tooltip
        if (component.getTooltip && typeof component.getTooltip === 'function') {
            content += `<br>${component.getTooltip()}`;
        }
        
        this.tooltip.innerHTML = content;
        this.tooltip.style.display = 'block';
        
        // Position tooltip near mouse
        const canvas = this.scene.renderer.domElement;
        const rect = canvas.getBoundingClientRect();
        this.tooltip.style.left = (rect.left + (this.pointer.x + 1) / 2 * rect.width + 10) + 'px';
        this.tooltip.style.top = (rect.top + (1 - this.pointer.y) / 2 * rect.height - 30) + 'px';
    }
    
    hideTooltip() {
        if (this.tooltip) {
            this.tooltip.style.display = 'none';
        }
    }
    
    // ====================
    // Raycasting
    // ====================
    
    updatePointer(event) {
        const rect = this.scene.renderer.domElement.getBoundingClientRect();
        this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }
    
    raycast() {
        this.raycaster.setFromCamera(this.pointer, this.scene.camera);
        
        // Get all interactive objects
        const intersects = this.raycaster.intersectObjects(this.scene.scene.children, true);
        
        // Filter out helpers and non-interactive objects
        for (let intersect of intersects) {
            const obj = intersect.object;
            
            // Skip helpers
            if (obj.type === 'GridHelper' || obj.type === 'AxesHelper' || 
                obj.type === 'Line' || obj.name === 'outline') {
                continue;
            }
            
            // Check if interactive
            if (this.isInteractive(obj)) {
                return intersect;
            }
        }
        
        return null;
    }
    
    isInteractive(object) {
        // Check userData
        if (object.userData.interactive === false) {
            return false;
        }
        
        // Check if has component
        return this.getComponent(object) !== null;
    }
    
    // ====================
    // Component Resolution
    // ====================
    
    /**
     * Get component from mesh object by traversing up the hierarchy
     * @param {THREE.Object3D} mesh - Mesh object
     * @returns {Object|null} Component or null
     */
    getComponent(mesh) {
        let obj = mesh;
        
        // Traverse up the object hierarchy
        while (obj) {
            // Check userData for component reference
            if (obj.userData.component) {
                return obj.userData.component;
            }
            
            // Check if object itself is the component
            if (obj.id && obj.type && obj.mesh) {
                return obj;
            }
            
            obj = obj.parent;
        }
        
        return null;
    }
    
    // ====================
    // Callback System
    // ====================
    
    /**
     * Register event callback
     * @param {string} eventType - Event type (click, longPress, hover, etc.)
     * @param {Object|string} component - Component or component ID
     * @param {Function} callback - Callback function
     */
    on(eventType, component, callback) {
        if (!this.callbacks[eventType]) {
            console.warn(`Unknown event type: ${eventType}`);
            return;
        }
        
        const componentId = component.id || component;
        this.callbacks[eventType].set(componentId, callback);
    }
    
    /**
     * Unregister event callback
     * @param {string} eventType - Event type
     * @param {Object|string} component - Component or component ID
     */
    off(eventType, component) {
        if (!this.callbacks[eventType]) return;
        
        const componentId = component.id || component;
        this.callbacks[eventType].delete(componentId);
    }
    
    /**
     * Trigger callback for component
     * @param {string} eventType - Event type
     * @param {Object} component - Component
     * @param {Object} data - Event data
     */
    triggerCallback(eventType, component, data = {}) {
        if (!this.callbacks[eventType]) return;
        
        const callback = this.callbacks[eventType].get(component.id);
        if (callback && typeof callback === 'function') {
            callback(component, data);
        }
    }
    
    // ====================
    // Utility
    // ====================
    
    /**
     * Get currently hovered component
     * @returns {Object|null}
     */
    getHoveredComponent() {
        return this.hoveredObject ? this.getComponent(this.hoveredObject) : null;
    }
    
    /**
     * Get currently selected component
     * @returns {Object|null}
     */
    getSelectedComponent() {
        return this.selectedObject ? this.getComponent(this.selectedObject) : null;
    }
    
    /**
     * Clear selection
     */
    clearSelection() {
        if (this.selectedObject) {
            this.unhighlightObject(this.selectedObject);
            this.selectedObject = null;
        }
    }
    
    /**
     * Cleanup
     */
    dispose() {
        // Remove event listeners
        const canvas = this.scene.renderer.domElement;
        canvas.removeEventListener('pointerdown', this.onPointerDown);
        canvas.removeEventListener('pointermove', this.onPointerMove);
        canvas.removeEventListener('pointerup', this.onPointerUp);
        canvas.removeEventListener('pointercancel', this.onPointerCancel);
        canvas.removeEventListener('pointerleave', this.onPointerLeave);
        
        // Remove tooltip
        if (this.tooltip && this.tooltip.parentNode) {
            this.tooltip.parentNode.removeChild(this.tooltip);
        }
        
        // Clear callbacks
        for (let key in this.callbacks) {
            this.callbacks[key].clear();
        }
        
        console.log('Interaction Manager disposed');
    }
}
