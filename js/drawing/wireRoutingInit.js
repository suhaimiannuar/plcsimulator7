// wireRoutingInit.js - Initialize EasyEDA-style 3D wire routing for 2D canvas

/**
 * Initialize the 3D wire routing system in 2D canvas mode
 * This integrates the ViewManager, GridSystem, and WireRoutingSystem
 * with the existing 3D scene and ports manager
 */
class WireRouting3DIntegration {
    constructor(canvasElement, scene3D, portsManager) {
        if (!canvasElement || !scene3D || !portsManager) {
            console.error('WireRouting3DIntegration requires canvas, scene3D, and portsManager');
            return;
        }

        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        this.scene3D = scene3D;
        this.portsManager = portsManager;
        
        // Initialize subsystems
        this.viewManager = new ViewManager();
        this.gridSystem = new GridSystem(); // Still needed for snapping, but not for drawing
        this.wireRouter = new WireRoutingSystem(this.viewManager, this.gridSystem);
        
        // Canvas state
        this.scale = 1.2; // Initial zoom - shows full mounting area
        this.offset = { x: 0, y: 0 }; // Initial pan - centered
        this.isDraggingCanvas = false;
        this.lastMousePos = null;
        
        // Interaction mode
        this.mode = 'view'; // 'view', 'wire-routing', 'wire-editing'
        this.hoveredPort = null;
        this.hoveredHangingWire = null;
        
        // Settings
        this.enabled = false; // Start disabled, enable when switching to wire mode
        // Note: Grid rendering moved to 3D scene (modelPhysics.js)
        this.showPorts = true;
        
        // Port detection radius in canvas pixels
        this.portClickRadius = 15;
        
        // Port display radius (visual size)
        this.portDisplayRadius = 6;
        
        // Animation loop
        this.animationFrameId = null;
        
        console.log('✅ Wire Routing 3D Integration initialized');
    }

    /**
     * Fit the mounting area to fill the canvas view
     */
    fitToMounting() {
        if (!this.scene3D || !this.scene3D.mountingConfig) {
            console.warn('⚠️ Cannot fit to mounting - no mounting config');
            return;
        }

        const { width, height, depth } = this.scene3D.mountingConfig;
        const currentView = this.viewManager.currentView;
        
        // Determine which dimensions to fit based on view
        let mountingWidth, mountingHeight;
        switch (currentView) {
            case 'top':
                mountingWidth = width;
                mountingHeight = depth;
                break;
            case 'front':
                mountingWidth = width;
                mountingHeight = height;
                break;
            case 'side-left':
                mountingWidth = depth;
                mountingHeight = height;
                break;
            default:
                mountingWidth = width;
                mountingHeight = depth;
        }

        // Calculate scale to fit mounting in canvas with some padding
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        const padding = 50; // pixels of padding around mounting

        const scaleX = (canvasWidth - padding * 2) / mountingWidth;
        const scaleY = (canvasHeight - padding * 2) / mountingHeight;
        
        // Use smaller scale to ensure both dimensions fit
        this.scale = Math.min(scaleX, scaleY);
        
        // Center the view
        this.offset = { x: 0, y: 0 };
        
        console.log(`📏 Fit to mounting: ${mountingWidth}x${mountingHeight}mm, scale=${this.scale.toFixed(2)}`);
    }

    /**
     * Enable wire routing mode (start drawing loop)
     */
    enable() {
        if (this.enabled) return;
        this.enabled = true;
        
        // Show canvas overlay BUT keep pointer-events: none
        // This allows 3D scene to handle port sphere clicks via raycasting
        this.canvas.style.display = 'block';
        this.canvas.style.pointerEvents = 'none';
        
        // Disable 3D orbit controls for wiring (but keep raycasting active)
        if (this.scene3D && this.scene3D.orbitControls) {
            this.scene3D.orbitControls.enabled = false;
            console.log('🔒 3D orbit controls disabled (wire routing active - click port spheres to wire)');
        }
        
        // Add mousemove listener to 3D renderer for wire preview
        if (this.scene3D && this.scene3D.renderer) {
            this.mouseMoveHandler = (e) => this.handleRendererMouseMove(e);
            this.scene3D.renderer.domElement.addEventListener('mousemove', this.mouseMoveHandler);
            console.log('🖱️ Added mousemove handler to 3D renderer for wire preview');
        }
        
        // Add wheel listener for zoom in/out during wire routing
        if (this.scene3D && this.scene3D.renderer) {
            this.wheelHandler = (e) => this.handleWheel(e);
            this.scene3D.renderer.domElement.addEventListener('wheel', this.wheelHandler, { passive: false });
            console.log('🔍 Added wheel handler for zoom control');
        }
        
        // Hide port markers (arrows and labels) during wire routing
        // Keep only the red spheres visible for cleaner view
        if (this.scene3D && this.scene3D.portMarkers) {
            this.portMarkersOriginalVisibility = new Map();
            this.scene3D.portMarkers.forEach(portGroup => {
                // Store original visibility
                this.portMarkersOriginalVisibility.set(portGroup, portGroup.visible);
                
                // Hide the entire port group (arrows, labels, etc)
                // But we need to keep the sphere visible
                if (portGroup.userData.sphereMesh) {
                    // Hide all children except the sphere
                    portGroup.children.forEach(child => {
                        if (child !== portGroup.userData.sphereMesh) {
                            child.visible = false;
                        }
                    });
                }
            });
            console.log('🙈 Port arrows and labels hidden (spheres still visible)');
        }
        
        // Resize canvas to match container
        const container = this.canvas.parentElement;
        if (container) {
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;
        }
        
        // Fit mounting to view
        this.fitToMounting();
        
        this.startAnimationLoop();
        
        // Log helpful information
        const portCount = this.portsManager ? this.portsManager.getAllPortsWithWorldPositions().length : 0;
        console.log('🔌 Wire routing mode enabled - Canvas overlay visible');
        console.log(`📍 Available ports: ${portCount}`);
        console.log(`👁️ Show ports: ${this.showPorts}`);
        console.log(`📐 Current view: ${this.viewManager.currentView}`);
        console.log(`🎨 Canvas size: ${this.canvas.width}x${this.canvas.height}`);
        console.log(`📏 Scale: ${this.scale}, Offset: (${this.offset.x}, ${this.offset.y})`);
        
        if (portCount === 0) {
            console.warn('⚠️ NO PORTS FOUND! You need to:');
            console.warn('  1. Load a model (use buttons or upload STEP file)');
            console.warn('  2. Enable "Edit Ports Mode" in the Ports section');
            console.warn('  3. Click on the model to add ports');
            console.warn('  4. Then you can wire between ports');
            
            // Show alert to user
            if (window.viewer3D) {
                window.viewer3D.log('⚠️ No ports found! Add ports to models first before wiring.', 'warning');
            }
        } else {
            console.log('✅ Ready to route wires!');
            console.log('💡 Click on a port to start routing');
            if (window.viewer3D) {
                window.viewer3D.log(`✅ Wire routing ready - ${portCount} ports available`, 'success');
            }
        }
    }

    /**
     * Disable wire routing mode (stop drawing loop)
     */
    disable() {
        if (!this.enabled) return;
        this.enabled = false;
        
        // Hide canvas overlay
        this.canvas.style.display = 'none';
        this.canvas.style.pointerEvents = 'none';
        
        // Remove mousemove listener from 3D renderer
        if (this.scene3D && this.scene3D.renderer && this.mouseMoveHandler) {
            this.scene3D.renderer.domElement.removeEventListener('mousemove', this.mouseMoveHandler);
            this.mouseMoveHandler = null;
            console.log('🖱️ Removed mousemove handler from 3D renderer');
        }
        
        // Remove wheel listener from 3D renderer
        if (this.scene3D && this.scene3D.renderer && this.wheelHandler) {
            this.scene3D.renderer.domElement.removeEventListener('wheel', this.wheelHandler);
            this.wheelHandler = null;
            console.log('🔍 Removed wheel handler from 3D renderer');
        }
        
        // Restore port markers visibility (arrows and labels)
        if (this.scene3D && this.scene3D.portMarkers && this.portMarkersOriginalVisibility) {
            this.scene3D.portMarkers.forEach(portGroup => {
                // Restore all children visibility
                portGroup.children.forEach(child => {
                    child.visible = true;
                });
            });
            this.portMarkersOriginalVisibility = null;
            console.log('👁️ Port arrows and labels restored');
        }
        
        // Re-enable 3D orbit controls
        if (this.scene3D && this.scene3D.orbitControls) {
            this.scene3D.orbitControls.enabled = true;
            console.log('🔓 3D orbit controls re-enabled');
        }
        
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        console.log('🔌 Wire routing mode disabled - Canvas overlay hidden');
    }

    /**
     * Setup mouse/keyboard event listeners
     */
    setupEventListeners() {
        // Mouse down - start routing or dragging
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        
        // Mouse move - update preview or pan
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        
        // Mouse up - end dragging
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        
        // Mouse wheel - zoom
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }

    handleMouseDown(e) {
        if (!this.enabled) {
            console.log('⚠️ Wire routing not enabled - mouse event ignored');
            return;
        }
        
        const rect = this.canvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;
        
        console.log('🖱️ Mouse down at:', canvasX, canvasY, 'button:', e.button, 'shift:', e.shiftKey);
        
        this.lastMousePos = { x: canvasX, y: canvasY };
        
        if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
            // Middle mouse or Shift+Left - pan canvas
            this.isDraggingCanvas = true;
            this.canvas.style.cursor = 'grabbing';
            console.log('📐 Pan mode activated');
        } else if (e.button === 0) {
            // Left click
            console.log('👆 Left click detected - checking for ports/wires');
            this.handleLeftClick(canvasX, canvasY);
        }
    }

    handleMouseMove(e) {
        if (!this.enabled) return;
        
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
            const worldPos = this.viewManager.canvasToWorld(
                canvasX, canvasY,
                this.canvas.width, this.canvas.height,
                this.scale, this.offset
            );
            
            if (this.mode === 'wire-routing' && this.wireRouter.isRouting) {
                this.wireRouter.updatePreview(worldPos);
            }
            
            // Check for hovering over hanging wire end or port
            this.hoveredHangingWire = this.wireRouter.findHangingWireEnd(worldPos);
            this.hoveredPort = this.findPortAtCanvas(canvasX, canvasY);
            
            this.canvas.style.cursor = (this.hoveredPort || this.hoveredHangingWire) ? 'pointer' : 
                                       this.isDraggingCanvas ? 'grabbing' : 'default';
        }
        
        this.lastMousePos = { x: canvasX, y: canvasY };
    }

    handleMouseUp(e) {
        if (!this.enabled) return;
        
        if (e.button === 1 || (e.button === 0 && this.isDraggingCanvas)) {
            this.isDraggingCanvas = false;
            this.canvas.style.cursor = 'default';
        }
        this.lastMousePos = null;
    }

    handleWheel(e) {
        if (!this.enabled) return;
        
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        
        // Update 2D canvas scale
        this.scale *= delta;
        this.scale = Math.max(0.1, Math.min(10, this.scale)); // Clamp zoom
        
        // Sync 3D camera zoom (orthographic camera)
        if (this.scene3D && this.scene3D.camera && this.scene3D.camera.isOrthographicCamera) {
            const camera = this.scene3D.camera;
            const zoomFactor = 1 / delta; // Inverse because we're moving camera, not scaling view
            
            camera.zoom *= zoomFactor;
            camera.zoom = Math.max(0.1, Math.min(10, camera.zoom)); // Clamp camera zoom
            camera.updateProjectionMatrix();
            
            console.log('🔍 Zoom:', this.scale.toFixed(2), 'Camera zoom:', camera.zoom.toFixed(2));
        }
    }

    handleKeyDown(e) {
        if (!this.enabled) return;
        
        if (e.key === 'Escape') {
            // Cancel wire routing
            if (this.wireRouter.cancelWire()) {
                this.mode = 'view';
                console.log('Wire routing cancelled');
            }
        } else if (e.key === 'Enter' || e.key === ' ') {
            // Finish wire without connecting to port (hanging wire)
            if (this.mode === 'wire-routing' && this.wireRouter.isRouting) {
                e.preventDefault();
                this.wireRouter.completeWire(null); // null = no end port
                this.mode = 'view';
                console.log('Hanging wire completed');
                this.syncWireTo3D();
            }
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
            // Delete selected wire
            if (this.wireRouter.deleteSelectedWire()) {
                console.log('Wire deleted');
            }
        } else if (e.key === 'g' || e.key === 'G') {
            // Toggle 3D grid (use main scene toggle)
            if (this.scene3D && this.scene3D.toggleGrid) {
                this.scene3D.toggleGrid();
            }
        }
    }

    /**
     * Handle mouse move on 3D renderer (for wire preview)
     */
    handleRendererMouseMove(e) {
        if (!this.enabled || !this.wireRouter.isRouting) return;
        
        // Get 3D world position by raycasting against mounting surfaces
        const rect = this.scene3D.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.scene3D.camera);
        
        // Raycast against mounting surfaces (floor and walls)
        const mountingSurfaces = [];
        if (this.scene3D.mountingSurfaces) {
            mountingSurfaces.push(...this.scene3D.mountingSurfaces);
        }
        
        const intersects = raycaster.intersectObjects(mountingSurfaces, true);
        if (intersects.length > 0) {
            const worldPos = intersects[0].point;
            
            // Update wire router preview
            this.wireRouter.updatePreview(worldPos);
        }
    }

    /**
     * Handle mouse wheel for zoom in/out
     */
    handleWheel(e) {
        e.preventDefault();
        
        const zoomSpeed = 0.1;
        const delta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed;
        
        // Update scale (zoom)
        const newScale = this.scale * (1 + delta);
        const minScale = 0.5;
        const maxScale = 10;
        
        if (newScale >= minScale && newScale <= maxScale) {
            this.scale = newScale;
            console.log(`🔍 Zoom: ${this.scale.toFixed(2)}x`);
        }
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

        console.log('Left click at canvas:', canvasX, canvasY, 'world:', worldPos, 'mode:', this.mode);

        if (this.mode === 'wire-routing' && this.wireRouter.isRouting) {
            // Continue routing - add waypoint or complete at port
            const clickedPort = this.findPortAtCanvas(canvasX, canvasY);
            
            if (clickedPort && clickedPort !== this.wireRouter.currentWire.startPort) {
                // Complete wire at end port
                this.wireRouter.completeWire(clickedPort);
                this.mode = 'view';
                console.log('✅ Wire completed');
                this.syncWireTo3D();
            } else {
                // Add waypoint
                this.wireRouter.addWaypoint();
                console.log('📍 Waypoint added');
            }
        } else {
            // Check for hanging wire end first
            const hangingWire = this.wireRouter.findHangingWireEnd(worldPos);
            if (hangingWire) {
                // Resume routing from hanging wire
                if (this.wireRouter.resumeWire(hangingWire)) {
                    this.mode = 'wire-routing';
                    console.log('✅ Resumed routing from hanging wire');
                }
                return;
            }
            
            // Check for port click
            const clickedPort = this.findPortAtCanvas(canvasX, canvasY);
            console.log('Clicked port:', clickedPort);
            
            if (clickedPort) {
                // Start new wire from this port
                if (this.wireRouter.startWire(clickedPort, worldPos)) {
                    this.mode = 'wire-routing';
                    console.log('✅ Started routing wire from port:', clickedPort.label);
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
     * Find port at canvas coordinates
     */
    findPortAtCanvas(canvasX, canvasY) {
        if (!this.portsManager) {
            console.warn('No portsManager available');
            return null;
        }
        
        if (!this.showPorts) {
            console.log('Ports hidden - enable "Show Ports" to click on them');
            return null;
        }

        const ports = this.portsManager.getAllPortsWithWorldPositions();
        console.log('Finding port at canvas:', canvasX, canvasY, 'Total ports:', ports.length);
        
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
    syncWireTo3D() {
        const lastWire = this.wireRouter.wires[this.wireRouter.wires.length - 1];
        if (!lastWire) return;
        
        if (!this.scene3D || !this.scene3D.wiringManager) {
            console.warn('Cannot sync wire to 3D - wiring manager not available');
            return;
        }

        // Create wire in 3D using existing wiring system
        // The 3D wiring system expects waypoint mode format
        try {
            this.scene3D.wiringManager.createWireFromWaypoints(
                lastWire.startPort,
                lastWire.endPort,
                lastWire.waypoints,
                {
                    wireType: lastWire.wireType,
                    wireGauge: lastWire.wireGauge,
                    hasWaypoints: true
                }
            );
            console.log('✅ Wire synced to 3D scene');
        } catch (error) {
            console.error('Failed to sync wire to 3D:', error);
        }
    }

    /**
     * Animation loop - redraw canvas
     */
    startAnimationLoop() {
        const animate = () => {
            if (!this.enabled) return;
            
            this.draw();
            this.animationFrameId = requestAnimationFrame(animate);
        };
        animate();
    }

    /**
     * Main draw function
     */
    draw() {
        // Clear canvas (transparent)
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw semi-transparent background for better visibility
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // DEBUG: Draw a test border to confirm canvas is rendering
        this.ctx.strokeStyle = '#ff0000';
        this.ctx.lineWidth = 5;
        this.ctx.strokeRect(10, 10, this.canvas.width - 20, this.canvas.height - 20);
        
        // Note: Grid is now part of 3D scene (in modelPhysics.js)
        // No need to draw 2D grid overlay anymore

        // Note: Ports are now 3D sphere meshes in the scene
        // No need to draw 2D canvas port circles - they don't sync with 3D camera
        // Users click on the actual 3D spheres via raycasting
        
        // Draw ports - DISABLED - use 3D spheres instead
        // if (this.showPorts) {
        //     this.drawPorts();
        // }

        // Draw wires
        this.wireRouter.drawWires(
            this.ctx,
            this.viewManager,
            this.scale,
            this.offset
        );

        // Highlight hovered hanging wire end
        if (this.hoveredHangingWire) {
            this.drawHangingWireHighlight(this.hoveredHangingWire);
        }

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
                               this.wireRouter.currentWire &&
                               port === this.wireRouter.currentWire.startPort;

            this.ctx.save();
            
            // Draw port circle with configurable radius
            this.ctx.beginPath();
            this.ctx.arc(canvasPos.x, canvasPos.y, this.portDisplayRadius, 0, Math.PI * 2);
            this.ctx.fillStyle = isStartPort ? '#00ff00' : (isHovered ? '#ffff00' : '#ff0000');
            this.ctx.fill();
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            // Draw port label
            if (isHovered || isStartPort) {
                this.ctx.font = 'bold 12px Arial';
                this.ctx.fillStyle = '#000000';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(port.label || 'Port', canvasPos.x, canvasPos.y - 15);
            }

            this.ctx.restore();
        });
    }

    /**
     * Draw highlight for hovered hanging wire end
     */
    drawHangingWireHighlight(wire) {
        if (!wire || !wire.waypoints || wire.waypoints.length === 0) return;
        
        const endPoint = wire.waypoints[wire.waypoints.length - 1];
        const canvasPos = this.viewManager.worldToCanvas(
            endPoint,
            this.canvas.width, this.canvas.height,
            this.scale, this.offset
        );
        
        this.ctx.save();
        
        // Draw pulsing yellow circle
        this.ctx.beginPath();
        this.ctx.arc(canvasPos.x, canvasPos.y, 12, 0, Math.PI * 2);
        this.ctx.strokeStyle = '#ffff00';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        
        // Draw smaller inner circle
        this.ctx.beginPath();
        this.ctx.arc(canvasPos.x, canvasPos.y, 8, 0, Math.PI * 2);
        this.ctx.strokeStyle = '#ff8800';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        this.ctx.restore();
    }

    /**
     * Draw mode indicator in corner
     */
    drawModeIndicator() {
        this.ctx.save();
        this.ctx.font = '14px Arial';
        this.ctx.fillStyle = '#000000';
        this.ctx.textAlign = 'left';
        
        let modeText = '🔌 Wire Mode: ';
        switch (this.mode) {
            case 'view':
                modeText += 'Click port to start';
                break;
            case 'wire-routing':
                modeText += 'Routing (SPACE=hang, ESC=cancel)';
                break;
            case 'wire-editing':
                modeText += 'Editing (DEL=delete)';
                break;
        }
        
        const view = this.viewManager.getCurrentView();
        const viewText = `View: ${view.name} | Grid: ${this.gridSystem.gridSize}mm`;
        
        this.ctx.fillText(modeText, 10, 20);
        this.ctx.fillText(viewText, 10, 40);
        
        this.ctx.restore();
    }

    /**
     * Handle port click from 3D scene (called by modelScene.js)
     * @param {Object} portData - Port data with label, worldPosition, instanceId, etc.
     */
    handlePortClick(portData) {
        if (!this.enabled) {
            console.warn('⚠️ Wire routing not enabled - port click ignored');
            return;
        }

        console.log('🔌 Port clicked from 3D scene:', portData.label, portData);

        if (this.mode === 'wire-routing' && this.wireRouter.isRouting) {
            // Complete wire at this port
            if (portData !== this.wireRouter.currentWire.startPort) {
                this.wireRouter.completeWire(portData);
                this.mode = 'view';
                console.log('✅ Wire completed at port:', portData.label);
                this.syncWireTo3D();
            } else {
                console.log('⚠️ Cannot connect port to itself');
            }
        } else {
            // Start new wire from this port
            this.wireRouter.startWire(portData);
            this.mode = 'wire-routing';
            console.log('🔌 Started wire routing from port:', portData.label);
        }
    }

    /**
     * Switch view (Top/Front/Side)
     */
    setView(viewName) {
        this.viewManager.setView(viewName);
        // Refit mounting to new view
        this.fitToMounting();
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
     * Set port display radius
     */
    setPortRadius(radius) {
        this.portDisplayRadius = parseInt(radius);
        console.log(`Port display radius: ${this.portDisplayRadius}px`);
    }

    /**
     * Toggle grid visibility (delegates to 3D scene)
     */
    toggleGrid() {
        if (this.scene3D && this.scene3D.toggleGrid) {
            this.scene3D.toggleGrid();
        }
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
        this.scale = 3;
        this.offset = { x: 100, y: 100 };
        
        // Reset 3D camera zoom
        if (this.scene3D && this.scene3D.camera && this.scene3D.camera.isOrthographicCamera) {
            this.scene3D.camera.zoom = 1;
            this.scene3D.camera.updateProjectionMatrix();
        }
        
        console.log('🔄 View reset: zoom and pan restored to defaults');
    }

    /**
     * Get all wires for export/save
     */
    getAllWires() {
        return this.wireRouter.getAllWires();
    }

    /**
     * Clear all wires
     */
    clearAllWires() {
        this.wireRouter.clearAllWires();
    }
}

// Make available globally
window.WireRouting3DIntegration = WireRouting3DIntegration;
