/**
 * 3D Model Property Editor
 * Handles editing of position, rotation, scale for selected 3D components
 */

class PropertyEditor {
    constructor(scene) {
        this.scene = scene;
        this.selectedComponent = null;
        this.isUpdating = false; // Prevent feedback loops
        
        this.initializeElements();
        this.attachEventListeners();
    }

    initializeElements() {
        // Transform inputs
        this.posXInput = document.getElementById('posX');
        this.posYInput = document.getElementById('posY');
        this.posZInput = document.getElementById('posZ');
        
        this.rotXInput = document.getElementById('rotX');
        this.rotYInput = document.getElementById('rotY');
        this.rotZInput = document.getElementById('rotZ');
        
        this.scaleInput = document.getElementById('scaleUniform');
        
        // Component info
        this.nameInput = document.getElementById('componentName');
        this.typeSpan = document.getElementById('componentType');
        this.assignmentSpan = document.getElementById('componentAssignment');
        
        // Buttons
        this.resetBtn = document.getElementById('resetTransform');
        this.deleteBtn = document.getElementById('deleteComponent3D');
        
        // Panels
        this.transformPanel = document.getElementById('transformPanel');
    }

    attachEventListeners() {
        // Position changes
        this.posXInput?.addEventListener('input', () => this.onPositionChange());
        this.posYInput?.addEventListener('input', () => this.onPositionChange());
        this.posZInput?.addEventListener('input', () => this.onPositionChange());
        
        // Rotation changes
        this.rotXInput?.addEventListener('input', () => this.onRotationChange());
        this.rotYInput?.addEventListener('input', () => this.onRotationChange());
        this.rotZInput?.addEventListener('input', () => this.onRotationChange());
        
        // Scale change
        this.scaleInput?.addEventListener('input', () => this.onScaleChange());
        
        // Name change
        this.nameInput?.addEventListener('change', () => this.onNameChange());
        
        // Buttons
        this.resetBtn?.addEventListener('click', () => this.resetTransform());
        this.deleteBtn?.addEventListener('click', () => this.deleteComponent());
    }

    /**
     * Update the property panel with selected component data
     */
    updatePanel(component) {
        this.selectedComponent = component;
        
        if (!component) {
            this.transformPanel.style.display = 'none';
            return;
        }
        
        this.transformPanel.style.display = 'block';
        this.isUpdating = true;
        
        // Check if it's a mounting surface
        const isMounting = !!component.snapPoints || !!component.type && 
            (component.type === 'plate' || component.type === 'box' || 
             component.type === 'shelf' || component.type === 'din-rail');
        
        // Get mesh (component might be the mesh itself or have a mesh property)
        const mesh = component.mesh || 
                    (isMounting ? this.scene.scene.children.find(c => c.userData.mounting === component) : null) ||
                    component;
        
        if (mesh && mesh.position) {
            // Update position (convert from Three.js units to meters)
            this.posXInput.value = mesh.position.x.toFixed(2);
            this.posYInput.value = mesh.position.y.toFixed(2);
            this.posZInput.value = mesh.position.z.toFixed(2);
            
            // Update rotation (convert radians to degrees)
            this.rotXInput.value = THREE.MathUtils.radToDeg(mesh.rotation.x).toFixed(0);
            this.rotYInput.value = THREE.MathUtils.radToDeg(mesh.rotation.y).toFixed(0);
            this.rotZInput.value = THREE.MathUtils.radToDeg(mesh.rotation.z).toFixed(0);
            
            // Update scale (use x as uniform scale)
            this.scaleInput.value = mesh.scale.x.toFixed(1);
        }
        
        // Update component info
        if (isMounting) {
            this.nameInput.value = `${component.type.charAt(0).toUpperCase() + component.type.slice(1)} Mounting`;
            this.typeSpan.textContent = `Mounting Surface (${component.type})`;
            this.assignmentSpan.textContent = 'N/A';
        } else {
            this.nameInput.value = component.name || component.id || 'Unnamed';
            this.typeSpan.textContent = component.type || 'Unknown';
            
            // Check for assignment
            if (window.assignmentManager) {
                const assignment = window.assignmentManager.getLadderAddress(component);
                this.assignmentSpan.textContent = assignment || 'None';
            } else {
                this.assignmentSpan.textContent = 'None';
            }
        }
        
        this.isUpdating = false;
    }

    /**
     * Handle position input changes
     */
    onPositionChange() {
        if (this.isUpdating || !this.selectedComponent) return;
        
        // Check if it's a mounting surface
        const isMounting = !!this.selectedComponent.snapPoints;
        
        const mesh = this.selectedComponent.mesh || 
                    (isMounting ? this.scene.scene.children.find(c => c.userData.mounting === this.selectedComponent) : null) ||
                    this.selectedComponent;
        if (!mesh || !mesh.position) return;
        
        const x = parseFloat(this.posXInput.value) || 0;
        const y = parseFloat(this.posYInput.value) || 0;
        const z = parseFloat(this.posZInput.value) || 0;
        
        const newPosition = { x, y, z };
        
        // For mounting surfaces, check collision with other mountings
        if (isMounting) {
            // Temporarily update position
            this.selectedComponent.position = newPosition;
            
            if (this.scene.checkMountingCollision(this.selectedComponent)) {
                alert('Mounting surface would collide with another mounting. Position not updated.');
                // Revert
                this.updatePanel(this.selectedComponent);
                return;
            }
        } else {
            // Check for collisions if scene has collision detection
            if (this.scene && this.scene.checkComponentCollision && this.selectedComponent.dimensions) {
                const collision = this.scene.checkComponentCollision(
                    newPosition,
                    this.selectedComponent.dimensions,
                    this.selectedComponent // Exclude self from collision check
                );
                
                if (collision.collides) {
                    alert(collision.reason + ' Position not updated.');
                    // Revert to current position
                    this.updatePanel(this.selectedComponent);
                    return;
                }
            }
        }
        
        mesh.position.set(x, y, z);
        
        // Update component's position if it exists
        if (this.selectedComponent.position) {
            this.selectedComponent.position.x = x;
            this.selectedComponent.position.y = y;
            this.selectedComponent.position.z = z;
        }
        
        console.log(`Position updated: (${x}, ${y}, ${z})`);
    }

    /**
     * Handle rotation input changes
     */
    onRotationChange() {
        if (this.isUpdating || !this.selectedComponent) return;
        
        const mesh = this.selectedComponent.mesh || this.selectedComponent;
        if (!mesh || !mesh.rotation) return;
        
        const x = parseFloat(this.rotXInput.value) || 0;
        const y = parseFloat(this.rotYInput.value) || 0;
        const z = parseFloat(this.rotZInput.value) || 0;
        
        // Convert degrees to radians
        mesh.rotation.set(
            THREE.MathUtils.degToRad(x),
            THREE.MathUtils.degToRad(y),
            THREE.MathUtils.degToRad(z)
        );
        
        // Update component's rotation if it exists
        if (this.selectedComponent.rotation) {
            this.selectedComponent.rotation.x = x;
            this.selectedComponent.rotation.y = y;
            this.selectedComponent.rotation.z = z;
        }
        
        console.log(`Rotation updated: (${x}°, ${y}°, ${z}°)`);
    }

    /**
     * Handle scale input change
     */
    onScaleChange() {
        if (this.isUpdating || !this.selectedComponent) return;
        
        const mesh = this.selectedComponent.mesh || this.selectedComponent;
        if (!mesh || !mesh.scale) return;
        
        const scale = parseFloat(this.scaleInput.value) || 1;
        
        // Clamp scale to reasonable values
        const clampedScale = Math.max(0.1, Math.min(10, scale));
        if (clampedScale !== scale) {
            this.scaleInput.value = clampedScale.toFixed(1);
        }
        
        mesh.scale.set(clampedScale, clampedScale, clampedScale);
        
        console.log(`Scale updated: ${clampedScale}`);
    }

    /**
     * Handle name input change
     */
    onNameChange() {
        if (this.isUpdating || !this.selectedComponent) return;
        
        const newName = this.nameInput.value.trim();
        if (newName) {
            this.selectedComponent.name = newName;
            
            // Update mesh name if it exists
            const mesh = this.selectedComponent.mesh || this.selectedComponent;
            if (mesh) {
                mesh.name = newName;
            }
            
            console.log(`Component renamed to: ${newName}`);
        }
    }

    /**
     * Reset transform to default values
     */
    resetTransform() {
        if (!this.selectedComponent) return;
        
        const mesh = this.selectedComponent.mesh || this.selectedComponent;
        if (!mesh) return;
        
        // Reset to origin
        mesh.position.set(0, 0, 0);
        mesh.rotation.set(0, 0, 0);
        mesh.scale.set(1, 1, 1);
        
        // Update component data
        if (this.selectedComponent.position) {
            this.selectedComponent.position = { x: 0, y: 0, z: 0 };
        }
        if (this.selectedComponent.rotation) {
            this.selectedComponent.rotation = { x: 0, y: 0, z: 0 };
        }
        
        // Update UI
        this.updatePanel(this.selectedComponent);
        
        console.log('Transform reset to default');
    }

    /**
     * Delete the selected component
     */
    deleteComponent() {
        if (!this.selectedComponent) return;
        
        const componentName = this.selectedComponent.name || this.selectedComponent.id || 'component';
        
        if (!confirm(`Delete ${componentName}?`)) {
            return;
        }
        
        // Remove from scene
        if (this.scene && this.scene.removeFieldDevice) {
            this.scene.removeFieldDevice(this.selectedComponent);
        } else {
            // Manual removal
            const mesh = this.selectedComponent.mesh || this.selectedComponent;
            if (mesh && this.scene && this.scene.scene) {
                this.scene.scene.remove(mesh);
            }
        }
        
        // Clear assignment if exists
        if (window.assignmentManager) {
            window.assignmentManager.unassign(this.selectedComponent);
        }
        
        // Clear selection
        this.selectedComponent = null;
        this.transformPanel.style.display = 'none';
        
        console.log(`Deleted: ${componentName}`);
    }

    /**
     * Clear selection
     */
    clearSelection() {
        this.selectedComponent = null;
        this.transformPanel.style.display = 'none';
    }
}

// Make available globally
window.PropertyEditor = PropertyEditor;
