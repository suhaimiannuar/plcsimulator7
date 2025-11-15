// modelWiring3D.js - 3D Wire Rendering System (draws wires as THREE.Line objects)

class ModelWiring3DManager {
    constructor() {
        // Wire storage
        this.wires = [];
        this.currentWire = null; // Wire being routed
        this.wireIdCounter = 0;
        
        // Visual elements
        this.wirePreviewLine = null;
        this.waypointMarkers = [];
        
        // Wire properties
        this.wireColors = {
            power: 0xff0000,    // Red
            signal: 0x0000ff,   // Blue
            ground: 0x000000,   // Black
            data: 0xffff00      // Yellow
        };
        this.wireType = 'signal';
        this.wireGauge = '16';
        
        // Grid snapping disabled - wire can move freely
        this.gridSize = 10; // mm (for reference, not used)
        this.snapEnabled = false; // User can position wire anywhere
    }

    /**
     * Enable wire routing mode
     */
    enableWireMode(sceneInstance) {
        sceneInstance.wireMode = true;
        const btn = document.getElementById('toggle2DWireMode');
        if (btn) {
            btn.textContent = '✅ 2D Wire Mode: ON';
            btn.style.background = '#27ae60';
        }
        
        // Keep orbit controls enabled so user can zoom/rotate while wiring
        if (sceneInstance.orbitControls) {
            sceneInstance.orbitControls.enabled = true;
        }
        
        // Hide transform controls (axis arrows) like when deselecting model
        if (sceneInstance.transformControls) {
            sceneInstance.transformControls.enabled = false;
            sceneInstance.transformControls.detach();
        }
        sceneInstance.deselectObject();
        
        // Hide port arrows and labels, keep only spheres
        this.hidePortDecoration(sceneInstance);
        
        sceneInstance.log('✅ 3D Wire Mode enabled - Click port spheres to route wires', 'success');
        console.log('🔌 3D Wire Mode: ON');
        console.log('💡 Click port sphere to start, click another to complete');
        console.log('💡 ESC to cancel, Can zoom/rotate camera while routing');
    }

    /**
     * Disable wire routing mode
     */
    disableWireMode(sceneInstance) {
        sceneInstance.wireMode = false;
        const btn = document.getElementById('toggle2DWireMode');
        if (btn) {
            btn.textContent = '📐 2D Wire Mode: OFF';
            btn.style.background = '#34495e';
        }
        
        // Cancel any current routing
        this.cancelWire(sceneInstance);
        
        // Restore port arrows and labels
        this.showPortDecoration(sceneInstance);
        
        sceneInstance.log('🔌 3D Wire Mode disabled', 'info');
        console.log('🔌 3D Wire Mode: OFF');
    }

    /**
     * Hide port arrows and labels (keep only spheres visible)
     */
    hidePortDecoration(sceneInstance) {
        if (!sceneInstance.portMarkers) return;
        
        sceneInstance.portMarkers.forEach(portGroup => {
            // Store original visibility
            if (!portGroup.userData.originalChildVisibility) {
                portGroup.userData.originalChildVisibility = new Map();
            }
            
            portGroup.children.forEach(child => {
                // Store original state
                portGroup.userData.originalChildVisibility.set(child, child.visible);
                
                // Hide everything except the sphere
                if (child !== portGroup.userData.sphereMesh) {
                    child.visible = false;
                }
            });
        });
        
        console.log('🙈 Port arrows and labels hidden during wire routing');
    }

    /**
     * Show port arrows and labels
     */
    showPortDecoration(sceneInstance) {
        if (!sceneInstance.portMarkers) return;
        
        sceneInstance.portMarkers.forEach(portGroup => {
            // Restore original visibility
            if (portGroup.userData.originalChildVisibility) {
                portGroup.children.forEach(child => {
                    const originalVis = portGroup.userData.originalChildVisibility.get(child);
                    child.visible = originalVis !== undefined ? originalVis : true;
                });
            } else {
                // Fallback - show all
                portGroup.children.forEach(child => {
                    child.visible = true;
                });
            }
        });
        
        console.log('👁️ Port arrows and labels restored');
    }

    /**
     * Start routing a wire from a port
     */
    startWire(sceneInstance, port) {
        if (this.currentWire) {
            console.warn('Already routing a wire');
            return false;
        }

        // Get world position from sphere mesh
        const sphereWorldPos = new THREE.Vector3();
        if (port.sphereMesh) {
            port.sphereMesh.getWorldPosition(sphereWorldPos);
        } else {
            sphereWorldPos.set(port.worldPosition.x, port.worldPosition.y, port.worldPosition.z);
        }

        const snappedStart = this.snapToGrid(sphereWorldPos);

        this.currentWire = {
            id: `wire-${this.wireIdCounter++}`,
            startPort: port,
            waypoints: [snappedStart],
            wireType: this.wireType,
            wireGauge: this.wireGauge
        };

        // Create preview line
        this.createPreviewLine(sceneInstance);

        sceneInstance.log(`🔌 Started wire from ${port.label}`, 'info');
        console.log(`🔌 Wire started from port: ${port.label}`);
        return true;
    }

    /**
     * Continue wire from hanging end (blue dot)
     */
    continueFromHangingWire(sceneInstance, marker) {
        if (this.currentWire) {
            console.warn('Already routing a wire');
            return false;
        }

        const wireId = marker.userData.wireId;
        const wire = this.wires.find(w => w.id === wireId);
        
        if (!wire || !wire.isHanging) {
            console.warn('Invalid hanging wire');
            return false;
        }

        // Remove the blue marker
        sceneInstance.scene.remove(marker);
        marker.geometry.dispose();
        marker.material.dispose();
        wire.hangingMarker = null;

        // Continue from this wire
        this.currentWire = {
            id: wire.id,
            startPort: wire.startPort,
            waypoints: [...wire.waypoints], // Copy existing waypoints
            wireType: wire.wireType,
            wireGauge: wire.wireGauge,
            isContinuation: true, // Mark as continuation
            originalWire: wire
        };

        // Keep the existing wire visible - don't remove it
        // We'll update it as we add waypoints
        this.currentWire.lineMesh = wire.lineMesh; // Keep reference to existing line

        // Remove from wires array (will be re-added when completed or hung again)
        const index = this.wires.indexOf(wire);
        if (index > -1) {
            this.wires.splice(index, 1);
        }

        // Create preview line from last waypoint
        this.createPreviewLine(sceneInstance);

        sceneInstance.log(`🔵 Continuing wire from hanging point`, 'info');
        console.log(`🔵 Continuing wire ${wire.id} from hanging end`);
        return true;
    }

    /**
     * Add waypoint at current position (changes wire direction)
     */
    addWaypoint(sceneInstance) {
        if (!this.currentWire || !this.currentManhattanPoint) return false;

        const lastPoint = this.currentWire.waypoints[this.currentWire.waypoints.length - 1];

        // Don't add if same as last point
        if (lastPoint.distanceTo(this.currentManhattanPoint) < 0.1) {
            return false;
        }

        this.currentWire.waypoints.push(this.currentManhattanPoint.clone());
        sceneInstance.log(`📍 Waypoint added`, 'info');
        console.log(`📍 Waypoint ${this.currentWire.waypoints.length - 1} added at`, this.currentManhattanPoint);

        // Update existing wire line if continuing from hanging wire
        if (this.currentWire.isContinuation && this.currentWire.lineMesh) {
            const points = this.currentWire.waypoints.map(wp => new THREE.Vector3(wp.x, wp.y, wp.z));
            this.currentWire.lineMesh.geometry.setFromPoints(points);
        }

        // Update preview line to start from new waypoint
        this.createPreviewLine(sceneInstance);

        return true;
    }

    /**
     * Complete wire at target port
     */
    completeWire(sceneInstance, endPort) {
        if (!this.currentWire) return false;

        // Check if connecting to same port
        if (endPort.portId === this.currentWire.startPort.portId) {
            sceneInstance.log('⚠️ Cannot connect port to itself', 'warning');
            return false;
        }

        // Get end port world position
        const sphereWorldPos = new THREE.Vector3();
        if (endPort.sphereMesh) {
            endPort.sphereMesh.getWorldPosition(sphereWorldPos);
        } else {
            sphereWorldPos.set(endPort.worldPosition.x, endPort.worldPosition.y, endPort.worldPosition.z);
        }

        const snappedEnd = this.snapToGrid(sphereWorldPos);
        this.currentWire.waypoints.push(snappedEnd);
        this.currentWire.endPort = endPort;

        // Create permanent wire line
        this.createWireLine(sceneInstance, this.currentWire);

        // Add to wires array
        this.wires.push(this.currentWire);

        // Calculate length
        const length = this.calculateWireLength(this.currentWire.waypoints);

        sceneInstance.log(`✅ Wire completed: ${this.currentWire.startPort.label} → ${endPort.label} (${length.toFixed(1)}mm)`, 'success');
        console.log(`✅ Wire ${this.currentWire.id}: ${this.currentWire.startPort.label} → ${endPort.label}, ${length.toFixed(1)}mm`);

        // Clear current wire
        this.removePreviewLine(sceneInstance);
        this.currentWire = null;

        return true;
    }

    /**
     * Hang wire (create open-ended wire for continuation)
     */
    hangWire(sceneInstance) {
        if (!this.currentWire || !this.currentManhattanPoint) return false;

        // Add final waypoint
        const endPoint = this.currentManhattanPoint.clone();
        this.currentWire.waypoints.push(endPoint);
        this.currentWire.endPort = null; // No end port - hanging wire
        this.currentWire.isHanging = true;

        // Create permanent wire line (hanging)
        this.createWireLine(sceneInstance, this.currentWire);

        // Create blue dot marker at hanging end to show wire can be continued
        this.createHangingEndMarker(sceneInstance, this.currentWire, endPoint);

        // Add to wires array
        this.wires.push(this.currentWire);

        // Calculate length
        const length = this.calculateWireLength(this.currentWire.waypoints);

        sceneInstance.log(`⚓ Wire hung from ${this.currentWire.startPort.label} (${length.toFixed(1)}mm) - Click blue dot to continue`, 'info');
        console.log(`⚓ Wire ${this.currentWire.id} hung (open-ended) from ${this.currentWire.startPort.label}`);

        // Clear current wire
        this.removePreviewLine(sceneInstance);
        this.currentWire = null;

        return true;
    }

    /**
     * Create blue dot marker at hanging wire end
     */
    createHangingEndMarker(sceneInstance, wire, position) {
        const geometry = new THREE.SphereGeometry(8, 16, 16); // 8mm radius sphere
        const material = new THREE.MeshBasicMaterial({
            color: 0x0088ff, // Blue color
            transparent: true,
            opacity: 0.9
        });

        const marker = new THREE.Mesh(geometry, material);
        marker.position.copy(position);
        marker.userData.isHangingWireEnd = true;
        marker.userData.wireId = wire.id;

        sceneInstance.scene.add(marker);
        wire.hangingMarker = marker;

        console.log(`🔵 Blue hanging marker created at`, position);
    }

    /**
     * Cancel current wire routing
     */
    cancelWire(sceneInstance) {
        if (!this.currentWire) return false;

        this.removePreviewLine(sceneInstance);
        this.currentWire = null;

        sceneInstance.log('❌ Wire routing cancelled', 'warning');
        console.log('❌ Wire cancelled');
        return true;
    }

    /**
     * Create preview line (green line following mouse)
     */
    createPreviewLine(sceneInstance) {
        if (this.wirePreviewLine) {
            sceneInstance.scene.remove(this.wirePreviewLine);
        }

        const lastPoint = this.currentWire.waypoints[this.currentWire.waypoints.length - 1];
        const geometry = new THREE.BufferGeometry().setFromPoints([
            lastPoint,
            lastPoint.clone() // Will be updated by mouse
        ]);

        const material = new THREE.LineBasicMaterial({
            color: 0x00ff00, // Bright green
            linewidth: 5,  // Thicker preview (was 3)
            depthTest: false,
            transparent: true,
            opacity: 0.8
        });

        this.wirePreviewLine = new THREE.Line(geometry, material);
        this.wirePreviewLine.renderOrder = 1000; // Render on top
        sceneInstance.scene.add(this.wirePreviewLine);
    }

    /**
     * Update preview line endpoint (called on mouse move)
     * Implements Manhattan routing - wire follows only X, Y, or Z axis
     * Respects current view plane:
     *   - Top view (looking down Y): X-Z plane (left/right, front/back)
     *   - Front view (looking from Z): X-Y plane (left/right, up/down)
     *   - Side view (looking from X): Z-Y plane (front/back, up/down)
     */
    updatePreviewLine(sceneInstance, worldPosition) {
        if (!this.currentWire || !this.wirePreviewLine) return;

        const lastPoint = this.currentWire.waypoints[this.currentWire.waypoints.length - 1];
        const snappedPos = this.snapToGrid(worldPosition);

        // Determine which axes are active based on current view
        const currentView = sceneInstance.currentView || 'top';
        
        const dx = Math.abs(snappedPos.x - lastPoint.x);
        const dy = Math.abs(snappedPos.y - lastPoint.y);
        const dz = Math.abs(snappedPos.z - lastPoint.z);

        const manhattanPoint = new THREE.Vector3();

        // Manhattan routing based on view plane
        if (currentView === 'top') {
            // Top view: X-Z plane (Y is up, looking down)
            // Wire can go left/right (X) or front/back (Z)
            if (dx >= dz) {
                manhattanPoint.set(snappedPos.x, lastPoint.y, lastPoint.z);
            } else {
                manhattanPoint.set(lastPoint.x, lastPoint.y, snappedPos.z);
            }
        } else if (currentView === 'front') {
            // Front view: X-Y plane (Z is depth, looking from front)
            // Wire can go left/right (X) or up/down (Y)
            if (dx >= dy) {
                manhattanPoint.set(snappedPos.x, lastPoint.y, lastPoint.z);
            } else {
                manhattanPoint.set(lastPoint.x, snappedPos.y, lastPoint.z);
            }
        } else if (currentView === 'left') {
            // Side view: Z-Y plane (X is depth, looking from side)
            // Wire can go front/back (Z) or up/down (Y)
            if (dz >= dy) {
                manhattanPoint.set(lastPoint.x, lastPoint.y, snappedPos.z);
            } else {
                manhattanPoint.set(lastPoint.x, snappedPos.y, lastPoint.z);
            }
        } else {
            // Fallback: 3D mode - use largest change across all axes
            if (dx >= dy && dx >= dz) {
                manhattanPoint.set(snappedPos.x, lastPoint.y, lastPoint.z);
            } else if (dy >= dx && dy >= dz) {
                manhattanPoint.set(lastPoint.x, snappedPos.y, lastPoint.z);
            } else {
                manhattanPoint.set(lastPoint.x, lastPoint.y, snappedPos.z);
            }
        }

        const positions = new Float32Array([
            lastPoint.x, lastPoint.y, lastPoint.z,
            manhattanPoint.x, manhattanPoint.y, manhattanPoint.z
        ]);

        this.wirePreviewLine.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.wirePreviewLine.geometry.attributes.position.needsUpdate = true;
        
        // Store the current manhattan point for waypoint creation
        this.currentManhattanPoint = manhattanPoint;
    }

    /**
     * Remove preview line
     */
    removePreviewLine(sceneInstance) {
        if (this.wirePreviewLine) {
            sceneInstance.scene.remove(this.wirePreviewLine);
            this.wirePreviewLine.geometry.dispose();
            this.wirePreviewLine.material.dispose();
            this.wirePreviewLine = null;
        }
    }

    /**
     * Create permanent wire line in scene
     */
    createWireLine(sceneInstance, wire) {
        const points = wire.waypoints.map(wp => new THREE.Vector3(wp.x, wp.y, wp.z));
        const geometry = new THREE.BufferGeometry().setFromPoints(points);

        const color = this.wireColors[wire.wireType] || 0x0000ff;
        const material = new THREE.LineBasicMaterial({
            color: color,
            linewidth: 5  // Thicker wire (was 2)
        });

        const line = new THREE.Line(geometry, material);
        line.userData.wireId = wire.id;
        line.userData.isWire = true;

        sceneInstance.scene.add(line);
        wire.lineMesh = line; // Store reference
    }

    /**
     * Calculate total wire length
     */
    calculateWireLength(waypoints) {
        let length = 0;
        for (let i = 0; i < waypoints.length - 1; i++) {
            const p1 = waypoints[i];
            const p2 = waypoints[i + 1];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dz = p2.z - p1.z;
            length += Math.sqrt(dx * dx + dy * dy + dz * dz);
        }
        return length;
    }

    /**
     * Snap point to grid - DISABLED, wire moves freely
     */
    snapToGrid(point) {
        // Grid snapping disabled - wire can be positioned anywhere
        // Grid is only for visual reference to help with model placement
        return point.clone();
    }

    /**
     * Clear all wires
     */
    clearAllWires(sceneInstance) {
        this.wires.forEach(wire => {
            if (wire.lineMesh) {
                sceneInstance.scene.remove(wire.lineMesh);
                wire.lineMesh.geometry.dispose();
                wire.lineMesh.material.dispose();
            }
            // Remove hanging end marker if exists
            if (wire.hangingMarker) {
                sceneInstance.scene.remove(wire.hangingMarker);
                wire.hangingMarker.geometry.dispose();
                wire.hangingMarker.material.dispose();
            }
        });

        this.wires = [];
        sceneInstance.log('🗑️ All wires cleared', 'info');
        console.log('🗑️ All wires cleared');
    }

    /**
     * Export wire list
     */
    exportWires() {
        const wireList = this.wires.map(wire => ({
            id: wire.id,
            from: wire.startPort.label,
            to: wire.endPort.label,
            type: wire.wireType,
            gauge: wire.wireGauge,
            length: this.calculateWireLength(wire.waypoints).toFixed(1) + 'mm',
            waypoints: wire.waypoints
        }));

        const json = JSON.stringify(wireList, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'wire-list.json';
        a.click();

        URL.revokeObjectURL(url);
        console.log('💾 Wire list exported:', wireList);
        return wireList;
    }
}

// Make available globally
window.ModelWiring3DManager = ModelWiring3DManager;
