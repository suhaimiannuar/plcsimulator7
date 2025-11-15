// wireRouting.js - EasyEDA-style PCB trace routing for 3D wiring in 2D views

class WireRoutingSystem {
    constructor(viewManager, gridSystem) {
        this.viewManager = viewManager;
        this.gridSystem = gridSystem; // Still needed for snapping functionality
        
        // Routing state
        this.isRouting = false;
        this.currentWire = null; // { startPort, waypoints: [], previewPoint: null }
        this.wires = []; // Completed wires
        this.wireIdCounter = 0;
        
        // Editing state
        this.selectedWire = null;
        this.selectedSegment = null;
        this.selectedWaypoint = null;
        this.isDragging = false;
        this.dragStart = null;
        
        // Wire properties
        this.wireType = 'signal';
        this.wireGauge = '16';
        this.wireColors = {
            power: '#ff0000',
            signal: '#0000ff',
            ground: '#000000',
            data: '#ffff00'
        };
        
        // Visual settings
        this.wireWidth = 5; // Thicker line for visibility
        this.previewColor = '#00ff00'; // Bright green preview
        this.selectedColor = '#ffff00'; // Yellow when selected
        this.hoverColor = '#ff00ff'; // Magenta on hover
        this.waypointRadius = 6;
        this.segmentHitDistance = 5; // Click distance to select segment
    }

    /**
     * Start routing a new wire from a port
     */
    startWire(port, mouseWorldPos) {
        if (this.isRouting) {
            console.warn('Already routing a wire');
            return false;
        }

        const snappedStart = this.gridSystem.snapPoint3D(port.worldPosition || mouseWorldPos);
        
        this.isRouting = true;
        this.currentWire = {
            id: `wire-${this.wireIdCounter++}`,
            startPort: port,
            waypoints: [snappedStart],
            previewPoint: null,
            wireType: this.wireType,
            wireGauge: this.wireGauge,
            plane: this.viewManager.getCurrentView().plane
        };
        
        console.log(`🔌 Started wire from ${port.label || 'port'}`);
        return true;
    }

    /**
     * Resume routing from an existing hanging wire
     */
    resumeWire(wire) {
        if (this.isRouting) {
            console.warn('Already routing a wire');
            return false;
        }

        if (!wire || wire.endPort) {
            console.warn('Cannot resume - wire is already connected');
            return false;
        }

        // Remove the wire from completed wires array
        const index = this.wires.indexOf(wire);
        if (index > -1) {
            this.wires.splice(index, 1);
        }

        const currentView = this.viewManager.getCurrentView();
        const lastWaypoint = wire.waypoints[wire.waypoints.length - 1];

        // Resume routing with existing wire data
        // Update the plane to current view so routing continues in new plane
        this.isRouting = true;
        this.currentWire = {
            ...wire,
            plane: currentView.plane, // Update to current view's plane for 3D routing
            previewPoint: null,
            resumedFrom: wire.plane, // Track where it was resumed from
            planeTransitions: wire.planeTransitions || [] // Track plane changes
        };

        // Add plane transition record
        this.currentWire.planeTransitions.push({
            waypointIndex: wire.waypoints.length - 1,
            fromPlane: wire.plane,
            toPlane: currentView.plane,
            transitionPoint: { ...lastWaypoint }
        });

        console.log(`🔄 Resumed wire from ${wire.startPort.label || 'port'} - switching from ${wire.plane} to ${currentView.plane} plane`);
        return true;
    }

    /**
     * Update preview point as mouse moves (with Manhattan routing)
     */
    updatePreview(mouseWorldPos) {
        if (!this.isRouting || !this.currentWire) return;

        const snapped = this.gridSystem.snapPoint3D(mouseWorldPos);
        const lastPoint = this.currentWire.waypoints[this.currentWire.waypoints.length - 1];

        // Manhattan routing: snap to horizontal or vertical from last point
        const dx = Math.abs(snapped.x - lastPoint.x);
        const dy = Math.abs(snapped.y - lastPoint.y);
        const dz = Math.abs(snapped.z - lastPoint.z);

        const view = this.viewManager.getCurrentView();
        
        // Determine which axis to follow based on current view
        let manhattanPoint = { ...snapped };
        
        switch (view.plane) {
            case 'XZ': // Top view - constrain to X or Z
                if (dx > dz) {
                    manhattanPoint.z = lastPoint.z; // Horizontal in X
                } else {
                    manhattanPoint.x = lastPoint.x; // Vertical in Z
                }
                manhattanPoint.y = lastPoint.y; // Keep Y constant
                break;
            case 'XY': // Front view - constrain to X or Y
                if (dx > dy) {
                    manhattanPoint.y = lastPoint.y; // Horizontal in X
                } else {
                    manhattanPoint.x = lastPoint.x; // Vertical in Y
                }
                manhattanPoint.z = lastPoint.z; // Keep Z constant
                break;
            case 'YZ': // Side view - constrain to Y or Z
                if (dy > dz) {
                    manhattanPoint.z = lastPoint.z; // Vertical in Y
                } else {
                    manhattanPoint.y = lastPoint.y; // Horizontal in Z
                }
                manhattanPoint.x = lastPoint.x; // Keep X constant
                break;
        }

        this.currentWire.previewPoint = manhattanPoint;
    }

    /**
     * Add waypoint at current preview position
     */
    addWaypoint() {
        if (!this.isRouting || !this.currentWire || !this.currentWire.previewPoint) return false;

        const lastPoint = this.currentWire.waypoints[this.currentWire.waypoints.length - 1];
        const preview = this.currentWire.previewPoint;

        // Don't add if same as last point
        if (this.pointsEqual(lastPoint, preview)) return false;

        this.currentWire.waypoints.push({ ...preview });
        console.log(`📍 Waypoint added at (${preview.x}, ${preview.y}, ${preview.z})`);
        return true;
    }

    /**
     * Complete wire at target port (optional - can be null for hanging wire)
     */
    completeWire(endPort = null) {
        if (!this.isRouting || !this.currentWire) return false;

        // Add final point - either at end port or at current preview point
        if (endPort) {
            const snappedEnd = this.gridSystem.snapPoint3D(endPort.worldPosition);
            this.currentWire.waypoints.push(snappedEnd);
            this.currentWire.endPort = endPort;
        } else {
            // Hanging wire - end at last waypoint or preview point
            if (this.currentWire.previewPoint) {
                this.currentWire.waypoints.push({ ...this.currentWire.previewPoint });
            }
            this.currentWire.endPort = null; // No end port
        }
        
        this.currentWire.previewPoint = null;

        // Calculate wire length
        this.currentWire.length = this.calculateWireLength(this.currentWire.waypoints);

        // Add to wires array
        this.wires.push(this.currentWire);
        
        if (endPort) {
            console.log(`✅ Wire completed: ${this.currentWire.startPort.label} → ${endPort.label} (${this.currentWire.length.toFixed(1)}mm)`);
        } else {
            console.log(`✅ Hanging wire created from ${this.currentWire.startPort.label} (${this.currentWire.length.toFixed(1)}mm)`);
        }
        
        this.currentWire = null;
        this.isRouting = false;
        return true;
    }

    /**
     * Cancel current wire routing
     */
    cancelWire() {
        if (!this.isRouting) return false;
        
        console.log('❌ Wire routing cancelled');
        this.currentWire = null;
        this.isRouting = false;
        return true;
    }

    /**
     * Find hanging wire end near click point (2D distance in current view plane)
     * Ignores the constant axis - only checks the 2 axes visible in current view
     */
    findHangingWireEnd(mouseWorldPos) {
        const clickPoint = this.gridSystem.snapPoint3D(mouseWorldPos);
        const clickRadius = this.segmentHitDistance * 3; // Larger hit area for endpoints (in world units)
        
        const view = this.viewManager.getCurrentView();
        
        console.log(`🔍 Searching for hanging wire ends in ${view.plane} plane, click at:`, clickPoint);
        
        for (const wire of this.wires) {
            // Only check hanging wires (no end port)
            if (!wire.endPort && wire.waypoints.length > 0) {
                const endPoint = wire.waypoints[wire.waypoints.length - 1];
                
                // Calculate distance in 2D plane of current view only (ignore constant axis)
                let distance;
                switch (view.plane) {
                    case 'XZ': // Top view - check X and Z only (ignore Y)
                        const dxTop = clickPoint.x - endPoint.x;
                        const dzTop = clickPoint.z - endPoint.z;
                        distance = Math.sqrt(dxTop * dxTop + dzTop * dzTop);
                        console.log(`  Wire ${wire.id} end at (${endPoint.x}, Y:${endPoint.y}, ${endPoint.z}), 2D distance: ${distance.toFixed(1)}mm`);
                        break;
                    case 'XY': // Front view - check X and Y only (ignore Z)
                        const dxFront = clickPoint.x - endPoint.x;
                        const dyFront = clickPoint.y - endPoint.y;
                        distance = Math.sqrt(dxFront * dxFront + dyFront * dyFront);
                        console.log(`  Wire ${wire.id} end at (${endPoint.x}, ${endPoint.y}, Z:${endPoint.z}), 2D distance: ${distance.toFixed(1)}mm`);
                        break;
                    case 'YZ': // Side view - check Y and Z only (ignore X)
                        const dySide = clickPoint.y - endPoint.y;
                        const dzSide = clickPoint.z - endPoint.z;
                        distance = Math.sqrt(dySide * dySide + dzSide * dzSide);
                        console.log(`  Wire ${wire.id} end at (X:${endPoint.x}, ${endPoint.y}, ${endPoint.z}), 2D distance: ${distance.toFixed(1)}mm`);
                        break;
                }
                
                if (distance < clickRadius) {
                    console.log(`🎯 Found hanging wire end! Distance ${distance.toFixed(1)}mm < ${clickRadius.toFixed(1)}mm`);
                    return wire;
                }
            }
        }
        
        console.log(`❌ No hanging wire end found within ${clickRadius.toFixed(1)}mm`);
        return null;
    }

    /**
     * Select wire by clicking near it
     */
    selectWire(mouseWorldPos) {
        const clickPoint = this.gridSystem.snapPoint3D(mouseWorldPos);
        
        // Find nearest wire
        let nearestWire = null;
        let nearestDistance = Infinity;

        this.wires.forEach(wire => {
            for (let i = 0; i < wire.waypoints.length - 1; i++) {
                const p1 = wire.waypoints[i];
                const p2 = wire.waypoints[i + 1];
                const dist = this.pointToSegmentDistance(clickPoint, p1, p2);
                
                if (dist < nearestDistance && dist < this.segmentHitDistance) {
                    nearestDistance = dist;
                    nearestWire = wire;
                    this.selectedSegment = { wire, segmentIndex: i };
                }
            }
        });

        if (nearestWire) {
            this.selectedWire = nearestWire;
            console.log(`🔍 Wire selected: ${nearestWire.id}`);
            return nearestWire;
        }

        this.selectedWire = null;
        this.selectedSegment = null;
        return null;
    }

    /**
     * Delete selected wire
     */
    deleteSelectedWire() {
        if (!this.selectedWire) return false;

        const index = this.wires.indexOf(this.selectedWire);
        if (index > -1) {
            this.wires.splice(index, 1);
            console.log(`🗑️ Wire deleted: ${this.selectedWire.id}`);
            this.selectedWire = null;
            this.selectedSegment = null;
            return true;
        }
        return false;
    }

    /**
     * Calculate distance from point to line segment
     */
    pointToSegmentDistance(point, segStart, segEnd) {
        const view = this.viewManager.getCurrentView();
        
        // Project to 2D based on current view
        let p, a, b;
        switch (view.plane) {
            case 'XZ':
                p = { x: point.x, y: point.z };
                a = { x: segStart.x, y: segStart.z };
                b = { x: segEnd.x, y: segEnd.z };
                break;
            case 'XY':
                p = { x: point.x, y: point.y };
                a = { x: segStart.x, y: segStart.y };
                b = { x: segEnd.x, y: segEnd.y };
                break;
            case 'YZ':
                p = { x: point.y, y: point.z };
                a = { x: segStart.y, y: segStart.z };
                b = { x: segEnd.y, y: segEnd.z };
                break;
        }

        const l2 = Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2);
        if (l2 === 0) return Math.sqrt(Math.pow(p.x - a.x, 2) + Math.pow(p.y - a.y, 2));

        let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
        t = Math.max(0, Math.min(1, t));

        const projX = a.x + t * (b.x - a.x);
        const projY = a.y + t * (b.y - a.y);

        return Math.sqrt(Math.pow(p.x - projX, 2) + Math.pow(p.y - projY, 2));
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
     * Check if two 3D points are equal
     */
    pointsEqual(p1, p2, tolerance = 0.1) {
        return Math.abs(p1.x - p2.x) < tolerance &&
               Math.abs(p1.y - p2.y) < tolerance &&
               Math.abs(p1.z - p2.z) < tolerance;
    }

    /**
     * Draw all wires on canvas
     */
    drawWires(ctx, viewManager, scale = 1, offset = { x: 0, y: 0 }) {
        const canvasWidth = ctx.canvas.width;
        const canvasHeight = ctx.canvas.height;

        // Draw completed wires
        this.wires.forEach(wire => {
            const isSelected = wire === this.selectedWire;
            const color = isSelected ? this.selectedColor : this.wireColors[wire.wireType];
            
            this.drawWire(ctx, wire, color, viewManager, canvasWidth, canvasHeight, scale, offset);
        });

        // Draw current wire being routed
        if (this.isRouting && this.currentWire) {
            this.drawWire(ctx, this.currentWire, this.previewColor, viewManager, canvasWidth, canvasHeight, scale, offset, true);
        }
    }

    /**
     * Draw a single wire
     */
    drawWire(ctx, wire, color, viewManager, canvasWidth, canvasHeight, scale, offset, isPreview = false) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = this.wireWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const points = [...wire.waypoints];
        if (isPreview && wire.previewPoint) {
            points.push(wire.previewPoint);
        }

        // Draw segments
        ctx.beginPath();
        for (let i = 0; i < points.length; i++) {
            const canvasPos = viewManager.worldToCanvas(points[i], canvasWidth, canvasHeight, scale, offset);
            if (i === 0) {
                ctx.moveTo(canvasPos.x, canvasPos.y);
            } else {
                ctx.lineTo(canvasPos.x, canvasPos.y);
            }
        }
        ctx.stroke();

        // Draw waypoints as circles
        if (!isPreview) {
            ctx.fillStyle = color;
            points.forEach((point, index) => {
                if (index > 0 && index < points.length - 1) { // Skip start/end ports
                    const canvasPos = viewManager.worldToCanvas(point, canvasWidth, canvasHeight, scale, offset);
                    
                    // Check if this is a plane transition point
                    const isTransition = wire.planeTransitions && 
                                        wire.planeTransitions.some(t => t.waypointIndex === index);
                    
                    ctx.beginPath();
                    ctx.arc(canvasPos.x, canvasPos.y, this.waypointRadius, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Draw double ring for plane transition points
                    if (isTransition) {
                        ctx.strokeStyle = '#ff00ff'; // Magenta for plane transitions
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.arc(canvasPos.x, canvasPos.y, this.waypointRadius + 3, 0, Math.PI * 2);
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.arc(canvasPos.x, canvasPos.y, this.waypointRadius + 6, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                }
            });
            
            // Draw hanging wire end marker (if no end port)
            if (!wire.endPort && points.length > 0) {
                const lastPoint = points[points.length - 1];
                const canvasPos = viewManager.worldToCanvas(lastPoint, canvasWidth, canvasHeight, scale, offset);
                
                // Draw X marker for hanging end
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                const size = 6;
                ctx.beginPath();
                ctx.moveTo(canvasPos.x - size, canvasPos.y - size);
                ctx.lineTo(canvasPos.x + size, canvasPos.y + size);
                ctx.moveTo(canvasPos.x + size, canvasPos.y - size);
                ctx.lineTo(canvasPos.x - size, canvasPos.y + size);
                ctx.stroke();
                
                // Draw circle around X
                ctx.beginPath();
                ctx.arc(canvasPos.x, canvasPos.y, this.waypointRadius + 2, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    /**
     * Get all wires
     */
    getAllWires() {
        return this.wires;
    }

    /**
     * Clear all wires
     */
    clearAllWires() {
        this.wires = [];
        this.selectedWire = null;
        this.selectedSegment = null;
        console.log('🗑️ All wires cleared');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WireRoutingSystem;
}
