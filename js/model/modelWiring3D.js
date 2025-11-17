// modelWiring3D.js - 3D Wire Rendering System (draws wires as THREE.Line objects)

class ModelWiring3DManager {
    constructor() {
        // Wire storage
        this.wires = [];
        this.currentWire = null; // Wire being routed
        this.selectedWire = null; // Wire selected for editing
        this.draggingWire = null; // Wire segment being dragged
        this.draggingMarker = null; // Hanging marker being dragged
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
        this.wireGauge = 5;  // Default thickness (1-10 scale)
        
        // Grid snapping disabled - wire can move freely
        this.gridSize = 10; // mm (for reference, not used)
        this.snapEnabled = false; // User can position wire anywhere
        
        // Auto-connect settings
        this.autoConnectEnabled = true;
        this.autoConnectDistance = 50; // mm - distance to auto-connect to nearby port
        
        // Undo/Redo system
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySize = 50; // Keep last 50 actions
        
        // Save initial empty state
        this.history.push({
            action: 'Initial state',
            timestamp: Date.now(),
            wires: []
        });
        this.historyIndex = 0;
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
            wireGauge: parseInt(this.wireGauge) || 5  // Ensure it's a number
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

        // Update committed segments visualization
        this.updateCommittedSegments(sceneInstance);

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

        // Save to history
        this.saveToHistory(sceneInstance, `Wire completed: ${this.currentWire.startPort.label} → ${endPort.label}`);

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

        // Save to history
        this.saveToHistory(sceneInstance, `Wire hung from ${this.currentWire.startPort.label}`);

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
        
        // Also create/update committed segments line
        this.updateCommittedSegments(sceneInstance);
    }

    /**
     * Update committed segments (waypoints that are already placed)
     * This shows the wire path that's been committed while still routing
     */
    updateCommittedSegments(sceneInstance) {
        if (!this.currentWire) return;
        
        // Remove old committed segments line if it exists
        if (this.wireCommittedLine) {
            sceneInstance.scene.remove(this.wireCommittedLine);
            this.wireCommittedLine.geometry.dispose();
            this.wireCommittedLine.material.dispose();
        }
        
        // Only draw if we have 2 or more waypoints (at least 1 committed segment)
        if (this.currentWire.waypoints.length >= 2) {
            const points = this.currentWire.waypoints.map(wp => new THREE.Vector3(wp.x, wp.y, wp.z));
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            
            const color = this.wireColors[this.currentWire.wireType] || 0x0000ff;
            const material = new THREE.LineBasicMaterial({
                color: color,
                linewidth: 5,
                depthTest: false,
                transparent: true,
                opacity: 0.7
            });
            
            this.wireCommittedLine = new THREE.Line(geometry, material);
            this.wireCommittedLine.renderOrder = 999; // Below preview line
            sceneInstance.scene.add(this.wireCommittedLine);
        }
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
     * Update preview line to snap to a specific port
     */
    updatePreviewLineToPort(sceneInstance, port) {
        if (!this.currentWire || !this.wirePreviewLine) return;

        const lastPoint = this.currentWire.waypoints[this.currentWire.waypoints.length - 1];
        
        // Get port world position
        const portPos = new THREE.Vector3();
        if (port.sphereMesh) {
            port.sphereMesh.getWorldPosition(portPos);
        } else {
            portPos.set(port.worldPosition.x, port.worldPosition.y, port.worldPosition.z);
        }

        const positions = new Float32Array([
            lastPoint.x, lastPoint.y, lastPoint.z,
            portPos.x, portPos.y, portPos.z
        ]);

        this.wirePreviewLine.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.wirePreviewLine.geometry.attributes.position.needsUpdate = true;
        
        // Change preview color to indicate snap
        this.wirePreviewLine.material.color.setHex(0xffff00); // Yellow for snap indication
        
        // Store the manhattan point at port position for potential waypoint
        this.currentManhattanPoint = portPos.clone();
    }

    /**
     * Find nearby port within auto-connect distance
     */
    findNearbyPort(sceneInstance, position) {
        if (!this.autoConnectEnabled || !this.currentWire) return null;

        // Get all ports with world positions
        const allPorts = sceneInstance.getAllPortsWithWorldPositions ? 
            sceneInstance.getAllPortsWithWorldPositions() : [];

        let nearestPort = null;
        let minDistance = this.autoConnectDistance;

        allPorts.forEach(port => {
            // Don't connect to the same port we started from
            if (port.portId === this.currentWire.startPort.portId) return;

            const portPos = new THREE.Vector3(
                port.worldPosition.x,
                port.worldPosition.y,
                port.worldPosition.z
            );

            const distance = position.distanceTo(portPos);

            if (distance < minDistance) {
                minDistance = distance;
                nearestPort = port;
            }
        });

        // Reset preview color if no nearby port
        if (!nearestPort && this.wirePreviewLine) {
            this.wirePreviewLine.material.color.setHex(0x00ff00); // Green
        }

        return nearestPort;
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
        
        // Also remove committed segments line
        if (this.wireCommittedLine) {
            sceneInstance.scene.remove(this.wireCommittedLine);
            this.wireCommittedLine.geometry.dispose();
            this.wireCommittedLine.material.dispose();
            this.wireCommittedLine = null;
        }
    }

    /**
     * Create permanent wire line in scene
     * Uses TubeGeometry for variable thickness support
     */
    createWireLine(sceneInstance, wire) {
        const points = wire.waypoints.map(wp => new THREE.Vector3(wp.x, wp.y, wp.z));
        
        // Get wire thickness (default to 5 if not set)
        const thickness = wire.wireGauge || 5;
        const radius = thickness * 0.2; // Convert gauge to radius in mm
        
        let geometry;
        
        // Use TubeGeometry for thick 3D wires
        if (points.length >= 2) {
            const curve = new THREE.CatmullRomCurve3(points);
            curve.curveType = 'catmullrom';
            curve.tension = 0; // Straight segments, no smoothing
            
            geometry = new THREE.TubeGeometry(
                curve,
                points.length * 8, // segments (more for smoother tubes)
                radius,            // radius based on thickness
                8,                 // radial segments (octagonal cross-section)
                false              // not closed
            );
        } else {
            // Fallback for single point (shouldn't happen)
            geometry = new THREE.BufferGeometry().setFromPoints(points);
        }

        const color = this.wireColors[wire.wireType] || 0x0000ff;
        const material = new THREE.MeshBasicMaterial({
            color: color,
            side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData.wireId = wire.id;
        mesh.userData.isWire = true;

        sceneInstance.scene.add(mesh);
        wire.lineMesh = mesh; // Store reference
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

    /**
     * Save current state to history for undo/redo
     */
    saveToHistory(sceneInstance, actionName) {
        // Remove any history after current index (when making new action after undo)
        this.history = this.history.slice(0, this.historyIndex + 1);

        // Deep clone wires state
        const state = {
            action: actionName,
            timestamp: Date.now(),
            wires: this.wires.map(wire => ({
                id: wire.id,
                startPort: wire.startPort ? {
                    portId: wire.startPort.portId,
                    label: wire.startPort.label,
                    worldPosition: { ...wire.startPort.worldPosition }
                } : null,
                endPort: wire.endPort ? {
                    portId: wire.endPort.portId,
                    label: wire.endPort.label,
                    worldPosition: { ...wire.endPort.worldPosition }
                } : null,
                waypoints: wire.waypoints.map(wp => ({ x: wp.x, y: wp.y, z: wp.z })),
                wireType: wire.wireType,
                wireGauge: wire.wireGauge,
                isHanging: wire.isHanging || false,
                hangingMarkerPosition: wire.hangingMarker ? {
                    x: wire.hangingMarker.position.x,
                    y: wire.hangingMarker.position.y,
                    z: wire.hangingMarker.position.z
                } : null
            }))
        };

        this.history.push(state);
        this.historyIndex++;

        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
            this.historyIndex--;
        }

        console.log(`💾 History saved: ${actionName} (${this.historyIndex + 1}/${this.history.length})`);
    }

    /**
     * Undo last action (Ctrl+Z)
     */
    undo(sceneInstance) {
        console.log(`🔍 Undo check: historyIndex=${this.historyIndex}, history.length=${this.history.length}`);
        
        // Can't undo if we're at the initial state (index 0)
        if (this.historyIndex <= 0) {
            sceneInstance.log('⚠️ Nothing to undo - at initial state', 'warning');
            console.log('⚠️ Cannot undo - at beginning of history');
            return false;
        }

        // Go back one state
        this.historyIndex--;
        this.restoreState(sceneInstance, this.history[this.historyIndex]);
        
        const action = this.history[this.historyIndex + 1].action;
        sceneInstance.log(`↩️ Undo: ${action}`, 'info');
        console.log(`↩️ Undo: ${action} (now at ${this.historyIndex + 1}/${this.history.length})`);
        return true;
    }

    /**
     * Redo last undone action (Ctrl+Y)
     */
    redo(sceneInstance) {
        if (this.historyIndex >= this.history.length - 1) {
            sceneInstance.log('⚠️ Nothing to redo', 'warning');
            console.log('⚠️ No history to redo');
            return false;
        }

        this.historyIndex++;
        this.restoreState(sceneInstance, this.history[this.historyIndex]);
        
        const action = this.history[this.historyIndex].action;
        sceneInstance.log(`↪️ Redo: ${action}`, 'info');
        console.log(`↪️ Redo: ${action} (${this.historyIndex + 1}/${this.history.length})`);
        return true;
    }

    /**
     * Restore wires to a saved state
     */
    restoreState(sceneInstance, state) {
        // Clear current wires from scene
        this.wires.forEach(wire => {
            if (wire.lineMesh) {
                sceneInstance.scene.remove(wire.lineMesh);
                wire.lineMesh.geometry.dispose();
                wire.lineMesh.material.dispose();
            }
            if (wire.hangingMarker) {
                sceneInstance.scene.remove(wire.hangingMarker);
                wire.hangingMarker.geometry.dispose();
                wire.hangingMarker.material.dispose();
            }
        });

        // Restore wires from state
        this.wires = [];
        
        state.wires.forEach(savedWire => {
            // Find actual port references
            const startPort = savedWire.startPort ? 
                this.findPortByData(sceneInstance, savedWire.startPort) : null;
            const endPort = savedWire.endPort ? 
                this.findPortByData(sceneInstance, savedWire.endPort) : null;

            const wire = {
                id: savedWire.id,
                startPort: startPort,
                endPort: endPort,
                waypoints: savedWire.waypoints.map(wp => new THREE.Vector3(wp.x, wp.y, wp.z)),
                wireType: savedWire.wireType,
                wireGauge: savedWire.wireGauge,
                isHanging: savedWire.isHanging
            };

            // Create wire line in scene
            this.createWireLine(sceneInstance, wire);

            // Restore hanging marker if exists
            if (savedWire.isHanging && savedWire.hangingMarkerPosition) {
                const markerPos = new THREE.Vector3(
                    savedWire.hangingMarkerPosition.x,
                    savedWire.hangingMarkerPosition.y,
                    savedWire.hangingMarkerPosition.z
                );
                this.createHangingEndMarker(sceneInstance, wire, markerPos);
            }

            this.wires.push(wire);
        });

        console.log(`🔄 State restored: ${state.wires.length} wires`);
    }

    /**
     * Find port by saved port data
     */
    findPortByData(sceneInstance, portData) {
        if (!portData || !sceneInstance.getAllPortsWithWorldPositions) return null;

        const allPorts = sceneInstance.getAllPortsWithWorldPositions();
        return allPorts.find(port => port.portId === portData.portId);
    }

    /**
     * Show context menu for wire (right-click)
     */
    showWireContextMenu(sceneInstance, wire, x, y) {
        // Remove any existing context menu
        const existingMenu = document.getElementById('wire-context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }

        // Create context menu
        const menu = document.createElement('div');
        menu.id = 'wire-context-menu';
        menu.style.position = 'fixed';
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        menu.style.background = 'white';
        menu.style.border = '1px solid #ccc';
        menu.style.borderRadius = '4px';
        menu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
        menu.style.padding = '8px 0';
        menu.style.zIndex = '10000';
        menu.style.minWidth = '150px';
        menu.style.fontSize = '13px';

        // Menu option: Select/Edit Properties
        const selectOption = document.createElement('div');
        selectOption.textContent = '🎨 Edit Properties';
        selectOption.style.padding = '8px 16px';
        selectOption.style.cursor = 'pointer';
        selectOption.style.transition = 'background 0.2s';
        selectOption.onmouseover = () => selectOption.style.background = '#f0f0f0';
        selectOption.onmouseout = () => selectOption.style.background = 'white';
        selectOption.onclick = () => {
            this.selectWire(sceneInstance, wire);
            menu.remove();
        };
        menu.appendChild(selectOption);

        // Menu option: Delete Wire
        const deleteOption = document.createElement('div');
        deleteOption.textContent = '🗑️ Delete Wire';
        deleteOption.style.padding = '8px 16px';
        deleteOption.style.cursor = 'pointer';
        deleteOption.style.color = '#e74c3c';
        deleteOption.style.transition = 'background 0.2s';
        deleteOption.onmouseover = () => deleteOption.style.background = '#f0f0f0';
        deleteOption.onmouseout = () => deleteOption.style.background = 'white';
        deleteOption.onclick = () => {
            this.deleteWire(sceneInstance, wire);
            menu.remove();
        };
        menu.appendChild(deleteOption);

        document.body.appendChild(menu);

        // Close menu when clicking elsewhere
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 100);
    }

    /**
     * Select wire and show properties panel
     */
    selectWire(sceneInstance, wire) {
        this.selectedWire = wire;

        // Highlight selected wire (yellow)
        if (wire.lineMesh) {
            wire.lineMesh.material.color.setHex(0xffff00); // Yellow highlight
            wire.lineMesh.material.needsUpdate = true;
        }

        // Show properties panel
        this.showWireProperties(sceneInstance, wire);

        sceneInstance.log(`🎯 Wire selected: ${wire.id}`, 'info');
        console.log('🎯 Selected wire:', wire);
    }

    /**
     * Show wire properties panel
     */
    showWireProperties(sceneInstance, wire) {
        // Create or update properties panel
        let panel = document.getElementById('wire-properties-panel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'wire-properties-panel';
            panel.style.position = 'fixed';
            panel.style.right = '20px';
            panel.style.top = '100px';
            panel.style.background = 'white';
            panel.style.border = '2px solid #3498db';
            panel.style.borderRadius = '8px';
            panel.style.padding = '16px';
            panel.style.zIndex = '9999';
            panel.style.minWidth = '250px';
            panel.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            document.body.appendChild(panel);
        }

        const length = this.calculateWireLength(wire.waypoints).toFixed(1);
        const from = wire.startPort ? wire.startPort.label : 'Hanging start';
        const to = wire.endPort ? wire.endPort.label : wire.isHanging ? 'Hanging end' : 'Unknown';

        panel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h3 style="margin: 0; color: #2c3e50; font-size: 16px;">⚡ Wire Properties</h3>
                <button onclick="document.getElementById('wire-properties-panel').remove(); viewer3D.wiring3DManager.deselectWire(viewer3D);" style="border: none; background: none; font-size: 18px; cursor: pointer; color: #95a5a6;">×</button>
            </div>
            <div style="margin-bottom: 8px; color: #2c3e50;"><strong>ID:</strong> ${wire.id}</div>
            <div style="margin-bottom: 8px; color: #2c3e50;"><strong>From:</strong> ${from}</div>
            <div style="margin-bottom: 8px; color: #2c3e50;"><strong>To:</strong> ${to}</div>
            <div style="margin-bottom: 8px; color: #2c3e50;"><strong>Length:</strong> ${length} mm</div>
            <div style="margin-bottom: 8px; color: #2c3e50;"><strong>Waypoints:</strong> ${wire.waypoints.length}</div>
            
            <div style="margin-top: 16px;">
                <label style="display: block; margin-bottom: 4px; font-weight: bold; color: #2c3e50;">Wire Type:</label>
                <select id="wire-type-select" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; color: #2c3e50; background: white;">
                    <option value="signal" ${wire.wireType === 'signal' ? 'selected' : ''}>Signal (Blue)</option>
                    <option value="power" ${wire.wireType === 'power' ? 'selected' : ''}>Power (Red)</option>
                    <option value="ground" ${wire.wireType === 'ground' ? 'selected' : ''}>Ground (Black)</option>
                    <option value="data" ${wire.wireType === 'data' ? 'selected' : ''}>Data (Yellow)</option>
                </select>
            </div>
            
            <div style="margin-top: 12px;">
                <label style="display: block; margin-bottom: 4px; font-weight: bold; color: #2c3e50;">Thickness:</label>
                <input type="range" id="wire-thickness-slider" min="1" max="10" value="${wire.wireGauge || 5}" style="width: 100%;">
                <span id="wire-thickness-value" style="color: #2c3e50;">${wire.wireGauge || 5}</span>
            </div>
            
            <button onclick="viewer3D.wiring3DManager.applyWireProperties(viewer3D)" style="width: 100%; margin-top: 16px; padding: 8px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Apply Changes</button>
        `;

        // Add event listeners
        const thicknessSlider = document.getElementById('wire-thickness-slider');
        const thicknessValue = document.getElementById('wire-thickness-value');
        thicknessSlider.oninput = () => {
            thicknessValue.textContent = thicknessSlider.value;
        };
    }

    /**
     * Deselect wire
     */
    deselectWire(sceneInstance) {
        if (this.selectedWire && this.selectedWire.lineMesh) {
            // Restore original color
            const color = this.wireColors[this.selectedWire.wireType] || 0x0000ff;
            this.selectedWire.lineMesh.material.color.setHex(color);
            this.selectedWire.lineMesh.material.needsUpdate = true;
        }
        this.selectedWire = null;
    }

    /**
     * Apply wire property changes
     */
    applyWireProperties(sceneInstance) {
        if (!this.selectedWire) return;

        const typeSelect = document.getElementById('wire-type-select');
        const thicknessSlider = document.getElementById('wire-thickness-slider');

        const newType = typeSelect.value;
        const newThickness = parseInt(thicknessSlider.value);

        // Update wire properties
        this.selectedWire.wireType = newType;
        this.selectedWire.wireGauge = newThickness;
        
        // Need to recreate the entire wire mesh for both color and thickness changes
        if (this.selectedWire.lineMesh) {
            // Remove old mesh
            sceneInstance.scene.remove(this.selectedWire.lineMesh);
            this.selectedWire.lineMesh.geometry.dispose();
            this.selectedWire.lineMesh.material.dispose();
            
            // Create new mesh with updated properties
            this.createWireLine(sceneInstance, this.selectedWire);
            
            console.log(`🎨 Wire updated: type=${newType}, thickness=${newThickness}`);
        }

        sceneInstance.log(`✅ Wire properties updated: ${newType}, thickness=${newThickness}`, 'success');
        console.log(`✅ Wire ${this.selectedWire.id} updated: type=${newType}, thickness=${newThickness}`);

        // Save to history
        this.saveToHistory(sceneInstance, `Wire properties changed: ${this.selectedWire.id} to ${newType}, thickness ${newThickness}`);

        // Close panel
        document.getElementById('wire-properties-panel')?.remove();
        this.deselectWire(sceneInstance);
    }

    /**
     * Delete wire
     */
    deleteWire(sceneInstance, wire) {
        // Remove wire line from scene
        if (wire.lineMesh) {
            sceneInstance.scene.remove(wire.lineMesh);
            wire.lineMesh.geometry.dispose();
            wire.lineMesh.material.dispose();
        }

        // Remove hanging marker if exists
        if (wire.hangingMarker) {
            sceneInstance.scene.remove(wire.hangingMarker);
            wire.hangingMarker.geometry.dispose();
            wire.hangingMarker.material.dispose();
        }

        // Remove from wires array
        const index = this.wires.indexOf(wire);
        if (index > -1) {
            this.wires.splice(index, 1);
        }

        // Check for floating wires and remove them
        this.removeFloatingWires(sceneInstance);

        // Save to history
        this.saveToHistory(sceneInstance, `Wire deleted: ${wire.id}`);

        sceneInstance.log(`🗑️ Wire deleted: ${wire.id}`, 'warning');
        console.log(`🗑️ Wire ${wire.id} deleted`);
    }

    /**
     * Remove floating wires (wires with hanging ends that are disconnected)
     */
    removeFloatingWires(sceneInstance) {
        // Find and remove wires that are completely disconnected (both ends hanging)
        const floatingWires = this.wires.filter(wire => {
            return wire.isHanging && !wire.startPort && !wire.endPort;
        });

        floatingWires.forEach(wire => {
            console.log(`🗑️ Removing floating wire: ${wire.id}`);
            this.deleteWire(sceneInstance, wire);
        });

        if (floatingWires.length > 0) {
            sceneInstance.log(`🗑️ Removed ${floatingWires.length} floating wire(s)`, 'info');
        }
    }

    /**
     * Start dragging a wire segment (double-click)
     */
    startWireDragging(sceneInstance, wire, clickPoint, renderer, camera) {
        // Find nearest segment to click point
        const segmentInfo = this.findNearestSegment(wire, clickPoint);
        if (!segmentInfo) return;

        this.draggingWire = {
            wire: wire,
            segmentIndex: segmentInfo.index,
            originalWaypoints: [...wire.waypoints],
            isDragging: true
        };

        // Highlight the wire being dragged
        if (wire.lineMesh) {
            wire.lineMesh.material.color.setHex(0x00ff00); // Green highlight
        }

        sceneInstance.log(`✋ Drag wire segment (ESC to cancel)`, 'info');
        console.log('✋ Wire dragging started:', wire.id, 'segment:', segmentInfo.index);

        // Setup drag handlers
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        const onMouseMove = (event) => {
            if (!this.draggingWire || !this.draggingWire.isDragging) return;

            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);

            // Raycast against mounting surfaces
            const mountingIntersects = raycaster.intersectObjects(sceneInstance.mountingSurfaces || [], true);
            if (mountingIntersects.length > 0) {
                const newPosition = mountingIntersects[0].point;
                this.updateWireSegment(sceneInstance, newPosition);
            }
        };

        const onMouseUp = () => {
            this.stopWireDragging(sceneInstance);
            renderer.domElement.removeEventListener('mousemove', onMouseMove);
            renderer.domElement.removeEventListener('mouseup', onMouseUp);
        };

        renderer.domElement.addEventListener('mousemove', onMouseMove);
        renderer.domElement.addEventListener('mouseup', onMouseUp);

        // ESC to cancel
        const onKeyDown = (e) => {
            if (e.key === 'Escape' && this.draggingWire) {
                this.cancelWireDragging(sceneInstance);
                renderer.domElement.removeEventListener('mousemove', onMouseMove);
                renderer.domElement.removeEventListener('mouseup', onMouseUp);
                document.removeEventListener('keydown', onKeyDown);
            }
        };
        document.addEventListener('keydown', onKeyDown);
    }

    /**
     * Find nearest segment to click point
     */
    findNearestSegment(wire, clickPoint) {
        let minDist = Infinity;
        let nearestIndex = -1;

        for (let i = 0; i < wire.waypoints.length - 1; i++) {
            const p1 = wire.waypoints[i];
            const p2 = wire.waypoints[i + 1];

            // Calculate distance from point to line segment
            const dist = this.pointToSegmentDistance(clickPoint, p1, p2);
            if (dist < minDist) {
                minDist = dist;
                nearestIndex = i;
            }
        }

        return nearestIndex >= 0 ? { index: nearestIndex, distance: minDist } : null;
    }

    /**
     * Calculate distance from point to line segment
     */
    pointToSegmentDistance(point, p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dz = p2.z - p1.z;
        const lengthSquared = dx * dx + dy * dy + dz * dz;

        if (lengthSquared === 0) {
            // p1 and p2 are the same point
            return point.distanceTo(p1);
        }

        // Calculate projection of point onto line segment
        const t = Math.max(0, Math.min(1, (
            (point.x - p1.x) * dx +
            (point.y - p1.y) * dy +
            (point.z - p1.z) * dz
        ) / lengthSquared));

        const projection = new THREE.Vector3(
            p1.x + t * dx,
            p1.y + t * dy,
            p1.z + t * dz
        );

        return point.distanceTo(projection);
    }

    /**
     * Update wire segment position during drag
     */
    updateWireSegment(sceneInstance, newPosition) {
        if (!this.draggingWire) return;

        const wire = this.draggingWire.wire;
        const segmentIndex = this.draggingWire.segmentIndex;
        const currentView = sceneInstance.currentView || 'top';

        // Check if this is the first segment (connected to start port)
        const isFirstSegment = segmentIndex === 0 && wire.startPort;
        // Check if this is the last segment (connected to end port or hanging)
        const isLastSegment = segmentIndex === wire.waypoints.length - 2 && (wire.endPort || wire.isHanging);

        // If dragging first or last segment, insert new waypoints to maintain connection
        if (isFirstSegment && !this.draggingWire.waypointsInserted) {
            // Insert two new waypoints after the port to create a bendable section
            const portPos = wire.waypoints[0];
            const nextPos = wire.waypoints[1];
            
            // Create intermediate waypoint at port position
            const newWaypoint1 = new THREE.Vector3(portPos.x, portPos.y, portPos.z);
            const newWaypoint2 = new THREE.Vector3(portPos.x, portPos.y, portPos.z);
            
            wire.waypoints.splice(1, 0, newWaypoint1, newWaypoint2);
            this.draggingWire.segmentIndex = 1; // Now drag the new segment
            this.draggingWire.waypointsInserted = true;
            
            console.log('📍 Inserted waypoints at port connection');
        } else if (isLastSegment && !this.draggingWire.waypointsInserted) {
            // Insert two new waypoints before the end to create a bendable section
            const endPos = wire.waypoints[wire.waypoints.length - 1];
            
            // Create intermediate waypoint at end position
            const newWaypoint1 = new THREE.Vector3(endPos.x, endPos.y, endPos.z);
            const newWaypoint2 = new THREE.Vector3(endPos.x, endPos.y, endPos.z);
            
            wire.waypoints.splice(wire.waypoints.length - 1, 0, newWaypoint1, newWaypoint2);
            this.draggingWire.segmentIndex = wire.waypoints.length - 3; // Drag the second-to-last segment
            this.draggingWire.waypointsInserted = true;
            
            console.log('📍 Inserted waypoints at end connection');
        }

        // Get the two waypoints of the segment
        const p1 = wire.waypoints[this.draggingWire.segmentIndex];
        const p2 = wire.waypoints[this.draggingWire.segmentIndex + 1];

        // Determine which axis the segment is on
        const isHorizontalX = Math.abs(p1.x - p2.x) > 0.1 && Math.abs(p1.y - p2.y) < 0.1 && Math.abs(p1.z - p2.z) < 0.1;
        const isHorizontalZ = Math.abs(p1.z - p2.z) > 0.1 && Math.abs(p1.x - p2.x) < 0.1 && Math.abs(p1.y - p2.y) < 0.1;
        const isVertical = Math.abs(p1.y - p2.y) > 0.1 && Math.abs(p1.x - p2.x) < 0.1 && Math.abs(p1.z - p2.z) < 0.1;

        // Move the segment perpendicular to its current direction
        if (isHorizontalX) {
            // Segment is along X, move it in Z or Y
            if (currentView === 'top') {
                p1.z = newPosition.z;
                p2.z = newPosition.z;
            } else {
                p1.y = newPosition.y;
                p2.y = newPosition.y;
            }
        } else if (isHorizontalZ) {
            // Segment is along Z, move it in X or Y
            if (currentView === 'top') {
                p1.x = newPosition.x;
                p2.x = newPosition.x;
            } else {
                p1.y = newPosition.y;
                p2.y = newPosition.y;
            }
        } else if (isVertical) {
            // Segment is along Y, move it in X or Z
            if (currentView === 'front') {
                p1.x = newPosition.x;
                p2.x = newPosition.x;
            } else {
                p1.z = newPosition.z;
                p2.z = newPosition.z;
            }
        }

        // Update wire line geometry
        this.updateWireGeometry(sceneInstance, wire);
    }

    /**
     * Update wire line geometry
     */
    updateWireGeometry(sceneInstance, wire) {
        if (!wire.lineMesh) return;

        // Dispose old geometry to prevent memory leaks and visual artifacts
        wire.lineMesh.geometry.dispose();
        
        // Create new geometry with updated points
        const points = wire.waypoints.map(wp => new THREE.Vector3(wp.x, wp.y, wp.z));
        const newGeometry = new THREE.BufferGeometry().setFromPoints(points);
        
        // Replace geometry
        wire.lineMesh.geometry = newGeometry;
    }

    /**
     * Stop wire dragging (complete)
     */
    stopWireDragging(sceneInstance) {
        if (!this.draggingWire) return;

        const wire = this.draggingWire.wire;

        // Restore original color
        if (wire.lineMesh) {
            const color = this.wireColors[wire.wireType] || 0x0000ff;
            wire.lineMesh.material.color.setHex(color);
        }

        // Save to history
        this.saveToHistory(sceneInstance, `Wire segment adjusted: ${wire.id}`);

        sceneInstance.log(`✅ Wire segment adjusted`, 'success');
        console.log('✅ Wire dragging completed');

        this.draggingWire = null;
    }

    /**
     * Cancel wire dragging (restore original)
     */
    cancelWireDragging(sceneInstance) {
        if (!this.draggingWire) return;

        const wire = this.draggingWire.wire;

        // Restore original waypoints
        wire.waypoints = [...this.draggingWire.originalWaypoints];
        this.updateWireGeometry(sceneInstance, wire);

        // Restore original color
        if (wire.lineMesh) {
            const color = this.wireColors[wire.wireType] || 0x0000ff;
            wire.lineMesh.material.color.setHex(color);
        }

        sceneInstance.log(`❌ Wire drag cancelled`, 'warning');
        console.log('❌ Wire dragging cancelled');

        this.draggingWire = null;
    }

    /**
     * Start dragging a hanging marker (blue dot)
     */
    startHangingMarkerDrag(sceneInstance, wire, marker, renderer, camera) {
        this.draggingMarker = {
            wire: wire,
            marker: marker,
            originalPosition: marker.position.clone(),
            isDragging: true
        };

        // Highlight the marker
        marker.material.color.setHex(0x00ff00); // Green while dragging

        sceneInstance.log(`✋ Drag hanging wire end (ESC to cancel)`, 'info');
        console.log('✋ Hanging marker dragging started:', wire.id);

        // Setup drag handlers
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        const onMouseMove = (event) => {
            if (!this.draggingMarker || !this.draggingMarker.isDragging) return;

            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);

            // Raycast against mounting surfaces
            const mountingIntersects = raycaster.intersectObjects(sceneInstance.mountingSurfaces || [], true);
            if (mountingIntersects.length > 0) {
                const newPosition = mountingIntersects[0].point;
                this.updateHangingMarkerPosition(sceneInstance, newPosition);
            }
        };

        const onMouseUp = () => {
            this.stopHangingMarkerDrag(sceneInstance);
            renderer.domElement.removeEventListener('mousemove', onMouseMove);
            renderer.domElement.removeEventListener('mouseup', onMouseUp);
        };

        renderer.domElement.addEventListener('mousemove', onMouseMove);
        renderer.domElement.addEventListener('mouseup', onMouseUp);

        // ESC to cancel
        const onKeyDown = (e) => {
            if (e.key === 'Escape' && this.draggingMarker) {
                this.cancelHangingMarkerDrag(sceneInstance);
                renderer.domElement.removeEventListener('mousemove', onMouseMove);
                renderer.domElement.removeEventListener('mouseup', onMouseUp);
                document.removeEventListener('keydown', onKeyDown);
            }
        };
        document.addEventListener('keydown', onKeyDown);
    }

    /**
     * Update hanging marker position during drag
     */
    updateHangingMarkerPosition(sceneInstance, newPosition) {
        if (!this.draggingMarker) return;

        const wire = this.draggingMarker.wire;
        const marker = this.draggingMarker.marker;

        // Update marker position
        marker.position.copy(newPosition);

        // Update last waypoint of the wire
        const lastWaypoint = wire.waypoints[wire.waypoints.length - 1];
        lastWaypoint.x = newPosition.x;
        lastWaypoint.y = newPosition.y;
        lastWaypoint.z = newPosition.z;

        // Update wire geometry
        this.updateWireGeometry(sceneInstance, wire);
    }

    /**
     * Stop hanging marker drag (complete)
     */
    stopHangingMarkerDrag(sceneInstance) {
        if (!this.draggingMarker) return;

        const marker = this.draggingMarker.marker;

        // Restore blue color
        marker.material.color.setHex(0x0088ff);

        sceneInstance.log(`✅ Hanging wire end repositioned`, 'success');
        console.log('✅ Hanging marker drag completed');

        this.draggingMarker = null;
    }

    /**
     * Cancel hanging marker drag (restore original)
     */
    cancelHangingMarkerDrag(sceneInstance) {
        if (!this.draggingMarker) return;

        const wire = this.draggingMarker.wire;
        const marker = this.draggingMarker.marker;
        const originalPosition = this.draggingMarker.originalPosition;

        // Restore marker position
        marker.position.copy(originalPosition);

        // Restore last waypoint
        const lastWaypoint = wire.waypoints[wire.waypoints.length - 1];
        lastWaypoint.x = originalPosition.x;
        lastWaypoint.y = originalPosition.y;
        lastWaypoint.z = originalPosition.z;

        // Update wire geometry
        this.updateWireGeometry(sceneInstance, wire);

        // Restore blue color
        marker.material.color.setHex(0x0088ff);

        sceneInstance.log(`❌ Marker drag cancelled`, 'warning');
        console.log('❌ Hanging marker drag cancelled');

        this.draggingMarker = null;
    }
}

// Make available globally
window.ModelWiring3DManager = ModelWiring3DManager;
