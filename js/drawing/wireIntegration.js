// wireIntegration.js - Integration layer between 2D canvas and EasyEDA-style wire routing

class WireCanvasIntegration {
    constructor(canvasElement, scene3D, portsManager) {
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        this.scene3D = scene3D;
        this.portsManager = portsManager;
        
        // Initialize subsystems
        this.viewManager = new ViewManager();
        this.gridSystem = new GridSystem();
        this.wireRouter = new WireRoutingSystem(this.viewManager, this.gridSystem);
        
        // Canvas state
        this.scale = 1;
        this.offset = { x: 0, y: 0 };
        this.isDraggingCanvas = false;
        this.lastMousePos = null;
        
        // Interaction mode
        this.mode = 'view'; // 'view', 'wire-routing', 'wire-editing'
        this.hoveredPort = null;
        
        // Settings
        this.showGrid = true;
        this.showPorts = true;
        
        // Port detection radius in canvas pixels
        this.portClickRadius = 10;
        
        this.setupEventListeners();
        this.startAnimationLoop();
        
        console.log('✅ Wire Canvas Integration initialized');
    }

    /**
     * Setup mouse/keyboard event listeners
     */
    setupEventListeners() {
        // Mouse down - start routing or dragging
        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const canvasX = e.clientX - rect.left;
            const canvasY = e.clientY - rect.top;
            
            this.lastMousePos = { x: canvasX, y: canvasY };
            
            if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
                // Middle mouse or Shift+Left - pan canvas
                this.isDraggingCanvas = true;
                this.canvas.style.cursor = 'grabbing';
            } else if (e.button === 0) {
                // Left click
                this.handleLeftClick(canvasX, canvasY);
            }
        });

        // Mouse move - update preview or pan
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const canvasX = e.clientX - rect.left;
            const canvasY = e.clientY - rect.top;
            
            if (this.isDraggingCanvas && this.lastMousePos) {
                // Pan canvas
                const dx = canvasX - this.lastMousePos.x;
                const dy = canvasY - this.lastMousePos.y;
                this.offset.x += dx;
                this.offset.y += dy;
            } else {
                // Update wire preview or check port hover
                this.handleMouseMove(canvasX, canvasY);
            }
            
            this.lastMousePos = { x: canvasX, y: canvasY };
        });

        // Mouse up - end dragging
        this.canvas.addEventListener('mouseup', (e) => {
            if (e.button === 1 || (e.button === 0 && this.isDraggingCanvas)) {
                this.isDraggingCanvas = false;
                this.canvas.style.cursor = 'default';
            }
            this.lastMousePos = null;
        });

        // Mouse wheel - zoom
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            this.scale *= delta;
            this.scale = Math.max(0.1, Math.min(5, this.scale)); // Clamp zoom
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // Cancel wire routing
                if (this.wireRouter.cancelWire()) {
                    this.mode = 'view';
                    console.log('Wire routing cancelled');
                }
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                // Delete selected wire
                if (this.wireRouter.deleteSelectedWire()) {
                    console.log('Wire deleted');
                }
            } else if (e.key === 'g' || e.key === 'G') {
                // Toggle grid
                this.showGrid = !this.showGrid;
                console.log(`Grid: ${this.showGrid ? 'ON' : 'OFF'}`);
            }
        });
    }

    /**
     * Handle left click - start/continue wire or select
     */
    handleLeftClick(canvasX, canvasY) {
        const worldPos = this.viewManager.canvasToWorld(
            canvasX, canvasY,
            this.canvas.width, this.canvas.height,
            this.scale, this.offset
        );

        if (this.mode === 'wire-routing' && this.wireRouter.isRouting) {
            // Continue routing - add waypoint or complete at port
            const clickedPort = this.findPortAtCanvas(canvasX, canvasY);
            
            if (clickedPort && clickedPort !== this.wireRouter.currentWire.startPort) {
                // Complete wire at end port
                this.wireRouter.completeWire(clickedPort);
                this.mode = 'view';
                console.log('Wire completed');
                
                // Update 3D scene with new wire
                this.syncWireTo3D(this.wireRouter.wires[this.wireRouter.wires.length - 1]);
            } else {
                // Add waypoint
                this.wireRouter.addWaypoint();
            }
        } else {
            // Start new wire or select existing
            const clickedPort = this.findPortAtCanvas(canvasX, canvasY);
            
            if (clickedPort) {
                // Start new wire from this port
                if (this.wireRouter.startWire(clickedPort, worldPos)) {
                    this.mode = 'wire-routing';
                    console.log('Started routing wire');
                }
            } else {
                // Try to select existing wire
                const selectedWire = this.wireRouter.selectWire(worldPos);
                if (selectedWire) {
                    this.mode = 'wire-editing';
                    console.log('Wire selected for editing');
                } else {
                    this.mode = 'view';
                }
            }
        }
    }

    /**
     * Handle mouse move - update preview and hover state
     */
    handleMouseMove(canvasX, canvasY) {
        const worldPos = this.viewManager.canvasToWorld(
            canvasX, canvasY,
            this.canvas.width, this.canvas.height,
            this.scale, this.offset
        );

        // Update wire preview if routing
        if (this.mode === 'wire-routing' && this.wireRouter.isRouting) {
            this.wireRouter.updatePreview(worldPos);
        }

        // Update hovered port
        this.hoveredPort = this.findPortAtCanvas(canvasX, canvasY);
        
        // Update cursor
        if (this.hoveredPort) {
            this.canvas.style.cursor = 'pointer';
        } else if (!this.isDraggingCanvas) {
            this.canvas.style.cursor = 'default';
        }
    }

    /**
     * Find port at canvas coordinates
     */
    findPortAtCanvas(canvasX, canvasY) {
        if (!this.portsManager || !this.showPorts) return null;

        const ports = this.portsManager.getAllPortsWithWorldPositions();
        
        for (const port of ports) {
            if (!port.worldPosition) continue;
            
            const canvasPos = this.viewManager.worldToCanvas(
                port.worldPosition,
                this.canvas.width, this.canvas.height,
                this.scale, this.offset
            );
            
            const dx = canvasX - canvasPos.x;
            const dy = canvasY - canvasPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.portClickRadius) {
                return port;
            }
        }
        
        return null;
    }

    /**
     * Sync completed wire to 3D scene
     */
    syncWireTo3D(wire) {
        if (!this.scene3D || !this.scene3D.wiringManager) {
            console.warn('Cannot sync wire to 3D - wiring manager not available');
            return;
        }

        // Convert 2D wire to 3D wire format
        const wire3D = {
            startPort: wire.startPort,
            endPort: wire.endPort,
            waypoints: wire.waypoints,
            wireType: wire.wireType,
            wireGauge: wire.wireGauge,
            length: wire.length
        };

        // Create wire in 3D scene using existing wiring system
        console.log('Syncing wire to 3D scene...');
        // Note: This will need to interface with modelWiring.js
        // For now, just log the data structure
        console.log('Wire data for 3D:', wire3D);
    }

    /**
     * Animation loop - redraw canvas
     */
    startAnimationLoop() {
        const animate = () => {
            this.draw();
            requestAnimationFrame(animate);
        };
        animate();
    }

    /**
     * Main draw function
     */
    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid
        if (this.showGrid) {
            this.gridSystem.drawGrid(
                this.ctx,
                this.viewManager,
                this.canvas.width,
                this.canvas.height,
                this.scale,
                this.offset
            );
        }

        // Draw ports
        if (this.showPorts) {
            this.drawPorts();
        }

        // Draw wires
        this.wireRouter.drawWires(
            this.ctx,
            this.viewManager,
            this.scale,
            this.offset
        );

        // Draw mode indicator
        this.drawModeIndicator();
    }

    /**
     * Draw all ports as circles
     */
    drawPorts() {
        if (!this.portsManager) return;

        const ports = this.portsManager.getAllPortsWithWorldPositions();
        
        ports.forEach(port => {
            if (!port.worldPosition) return;
            
            const canvasPos = this.viewManager.worldToCanvas(
                port.worldPosition,
                this.canvas.width, this.canvas.height,
                this.scale, this.offset
            );

            const isHovered = port === this.hoveredPort;
            const isStartPort = this.wireRouter.isRouting && 
                               port === this.wireRouter.currentWire.startPort;

            this.ctx.save();
            
            // Draw port circle
            this.ctx.beginPath();
            this.ctx.arc(canvasPos.x, canvasPos.y, 5, 0, Math.PI * 2);
            this.ctx.fillStyle = isStartPort ? '#00ff00' : (isHovered ? '#ffff00' : '#ff0000');
            this.ctx.fill();
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();

            // Draw port label
            if (isHovered || isStartPort) {
                this.ctx.font = '12px Arial';
                this.ctx.fillStyle = '#000000';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(port.label || 'Port', canvasPos.x, canvasPos.y - 10);
            }

            this.ctx.restore();
        });
    }

    /**
     * Draw mode indicator in corner
     */
    drawModeIndicator() {
        this.ctx.save();
        this.ctx.font = '14px Arial';
        this.ctx.fillStyle = '#000000';
        this.ctx.textAlign = 'left';
        
        let modeText = 'Mode: ';
        switch (this.mode) {
            case 'view':
                modeText += 'View (click port to start wire)';
                break;
            case 'wire-routing':
                modeText += 'Routing Wire (click to add corner, ESC to cancel)';
                break;
            case 'wire-editing':
                modeText += 'Editing Wire (DEL to delete)';
                break;
        }
        
        const view = this.viewManager.getCurrentView();
        const viewText = `View: ${view.name} | Grid: ${this.gridSystem.gridSize}mm`;
        
        this.ctx.fillText(modeText, 10, 20);
        this.ctx.fillText(viewText, 10, 40);
        
        this.ctx.restore();
    }

    /**
     * Switch view (Top/Front/Side)
     */
    setView(viewName) {
        this.viewManager.setView(viewName);
        console.log(`Switched to ${viewName} view`);
    }

    /**
     * Set grid size
     */
    setGridSize(size) {
        this.gridSystem.setGridSize(size);
        console.log(`Grid size: ${size}mm`);
    }

    /**
     * Toggle grid visibility
     */
    toggleGrid() {
        this.showGrid = !this.showGrid;
    }

    /**
     * Toggle port visibility
     */
    togglePorts() {
        this.showPorts = !this.showPorts;
    }

    /**
     * Reset view (zoom and pan)
     */
    resetView() {
        this.scale = 1;
        this.offset = { x: 0, y: 0 };
    }

    /**
     * Get wire routing system (for external access)
     */
    getWireRouter() {
        return this.wireRouter;
    }

    /**
     * Get view manager (for external access)
     */
    getViewManager() {
        return this.viewManager;
    }

    /**
     * Get grid system (for external access)
     */
    getGridSystem() {
        return this.gridSystem;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WireCanvasIntegration;
}
