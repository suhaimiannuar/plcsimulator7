/**
 * 2D Schematic Drawing Canvas
 * Grid-based canvas for component placement and wiring diagrams
 */

class DrawingCanvas {
    constructor(containerId) {
        this.containerId = containerId;
        this.canvas = null;
        this.ctx = null;
        
        // Grid settings
        this.gridSize = 20; // pixels
        this.gridColor = '#d0d0d0'; // Light gray for white background
        this.backgroundColor = '#ffffff'; // White background for printing
        
        // Viewport/Camera
        this.offsetX = 0;
        this.offsetY = 0;
        this.scale = 1.0;
        this.minScale = 0.25;
        this.maxScale = 4.0;
        
        // Drawing state
        this.components = [];
        this.wires = [];
        this.selectedComponent = null;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        
        // Placement mode
        this.componentToPlace = null; // Type of component to place on next click
        this.selectedTool = null; // 'select', 'wire', 'delete'
        
        // Wire drawing mode
        this.isDrawingWire = false;
        this.wireStart = null;
        this.wirePreview = null;
        this.currentWireColor = '#000000'; // Default black
        
        // Snap to grid
        this.snapToGrid = true;
        
        this.init();
    }
    
    init() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`Container ${this.containerId} not found`);
            return;
        }
        
        // Create canvas
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'drawingCanvas';
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.canvas.style.cssText = 'display: block; cursor: default;';
        
        container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        
        // Event listeners
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.onWheel.bind(this));
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Keyboard listener for ESC and Space
        document.addEventListener('keydown', this.onKeyDown.bind(this));
        
        // Window resize
        window.addEventListener('resize', this.onResize.bind(this));
        
        // Setup toolbar listeners
        this.setupToolbarListeners();
        
        // Start render loop
        this.render();
        
        console.log('✅ Drawing Canvas initialized');
    }
    
    setupToolbarListeners() {
        // Component buttons
        document.querySelectorAll('.drawing-component-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const componentType = btn.dataset.component;
                this.selectComponentToPlace(componentType);
                
                // Visual feedback
                document.querySelectorAll('.drawing-component-btn, .drawing-tool-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
        
        // Tool buttons
        document.querySelectorAll('.drawing-tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tool = btn.dataset.tool;
                this.selectTool(tool);
                
                // Visual feedback
                document.querySelectorAll('.drawing-component-btn, .drawing-tool-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
        
        // Clear button
        const clearBtn = document.getElementById('clearDrawing');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (confirm('Clear all components and wires?')) {
                    this.clear();
                }
            });
        }
        
        // Save button
        const saveBtn = document.getElementById('saveDrawing');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveToJSON());
        }
        
        // Load button
        const loadBtn = document.getElementById('loadDrawing');
        if (loadBtn) {
            loadBtn.addEventListener('click', () => this.loadFromJSON());
        }
        
        // Wire color buttons
        document.querySelectorAll('.wire-color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const color = btn.dataset.color;
                this.currentWireColor = color;
                
                // Visual feedback
                document.querySelectorAll('.wire-color-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                console.log(`🎨 Wire color set to: ${color}`);
            });
        });
    }
    
    selectComponentToPlace(type) {
        this.componentToPlace = type;
        this.selectedTool = null;
        this.isDrawingWire = false;
        this.canvas.style.cursor = 'crosshair';
        console.log(`📍 Ready to place: ${type}`);
    }
    
    selectTool(tool) {
        this.selectedTool = tool;
        this.componentToPlace = null;
        
        switch(tool) {
            case 'select':
                this.canvas.style.cursor = 'default';
                this.isDrawingWire = false;
                this.cancelWireDrawing();
                break;
            case 'wire':
                this.canvas.style.cursor = 'crosshair';
                // Don't set isDrawingWire here - wait for terminal click
                break;
            case 'delete':
                this.canvas.style.cursor = 'not-allowed';
                this.isDrawingWire = false;
                this.cancelWireDrawing();
                break;
        }
        
        console.log(`🔧 Tool selected: ${tool}`);
    }
    
    placeComponent(type, x, y) {
        // Snap to grid if enabled
        if (this.snapToGrid) {
            x = Math.round(x / this.gridSize) * this.gridSize;
            y = Math.round(y / this.gridSize) * this.gridSize;
        }
        
        // Get component template based on type
        const template = this.getComponentTemplate(type);
        if (!template) {
            console.error(`Unknown component type: ${type}`);
            return;
        }
        
        // Create component instance
        const component = {
            id: `${type}_${Date.now()}`,
            type: type,
            x: x,
            y: y,
            width: template.width,
            height: template.height,
            color: template.color,
            label: template.label,
            terminals: template.terminals.map(t => ({...t})) // Clone terminals
        };
        
        // Add to components array
        this.components.push(component);
        console.log(`✅ Placed ${type} at (${x}, ${y})`);
        
        // Clear placement mode (or keep it for multiple placements)
        // this.componentToPlace = null;
        // this.canvas.style.cursor = 'default';
    }
    
    deleteComponent(component) {
        // Remove component from array
        const index = this.components.indexOf(component);
        if (index > -1) {
            this.components.splice(index, 1);
            console.log(`🗑️ Deleted component: ${component.id}`);
        }
        
        // Remove any wires connected to this component
        this.wires = this.wires.filter(wire => {
            return wire.startComponent !== component && wire.endComponent !== component;
        });
        
        // Clear selection if this was the selected component
        if (this.selectedComponent === component) {
            this.selectedComponent = null;
        }
    }
    
    getComponentTemplate(type) {
        // Component templates with default properties
        const templates = {
            'plc': {
                width: 80,
                height: 100,
                color: '#2c3e50',
                label: 'PLC',
                terminals: [
                    { id: 'power', x: 0, y: 10, label: '24V+', type: 'input' },
                    { id: 'gnd', x: 0, y: 30, label: 'GND', type: 'input' },
                    { id: 'i0', x: 0, y: 50, label: 'I0', type: 'input' },
                    { id: 'i1', x: 0, y: 70, label: 'I1', type: 'input' },
                    { id: 'q0', x: 80, y: 50, label: 'Q0', type: 'output' },
                    { id: 'q1', x: 80, y: 70, label: 'Q1', type: 'output' }
                ]
            },
            'power-supply': {
                width: 60,
                height: 60,
                color: '#e74c3c',
                label: 'PSU',
                terminals: [
                    { id: 'ac_l', x: 0, y: 15, label: 'L', type: 'input' },
                    { id: 'ac_n', x: 0, y: 30, label: 'N', type: 'input' },
                    { id: 'dc_plus', x: 60, y: 15, label: '+24V', type: 'output' },
                    { id: 'dc_gnd', x: 60, y: 30, label: 'GND', type: 'output' }
                ]
            },
            'io-module': {
                width: 60,
                height: 80,
                color: '#16a085',
                label: 'I/O',
                terminals: [
                    { id: 'i0', x: 0, y: 20, label: 'I0', type: 'input' },
                    { id: 'i1', x: 0, y: 40, label: 'I1', type: 'input' },
                    { id: 'o0', x: 60, y: 20, label: 'O0', type: 'output' },
                    { id: 'o1', x: 60, y: 40, label: 'O1', type: 'output' }
                ]
            },
            'motor': {
                width: 60,
                height: 60,
                color: '#9b59b6',
                label: 'M',
                terminals: [
                    { id: 'u', x: 30, y: 0, label: 'U', type: 'input' },
                    { id: 'v', x: 0, y: 60, label: 'V', type: 'input' },
                    { id: 'w', x: 60, y: 60, label: 'W', type: 'input' }
                ]
            },
            'sensor': {
                width: 40,
                height: 40,
                color: '#3498db',
                label: 'S',
                terminals: [
                    { id: 'signal', x: 40, y: 20, label: 'OUT', type: 'output' },
                    { id: 'power', x: 0, y: 10, label: '+', type: 'input' },
                    { id: 'gnd', x: 0, y: 30, label: '-', type: 'input' }
                ]
            },
            'button': {
                width: 40,
                height: 40,
                color: '#27ae60',
                label: 'BTN',
                terminals: [
                    { id: 'no', x: 0, y: 20, label: 'NO', type: 'input' },
                    { id: 'com', x: 40, y: 20, label: 'COM', type: 'output' }
                ]
            },
            'led': {
                width: 30,
                height: 30,
                color: '#f39c12',
                label: 'LED',
                terminals: [
                    { id: 'anode', x: 0, y: 15, label: '+', type: 'input' },
                    { id: 'cathode', x: 30, y: 15, label: '-', type: 'output' }
                ]
            },
            'relay': {
                width: 50,
                height: 60,
                color: '#34495e',
                label: 'K',
                terminals: [
                    { id: 'coil_a', x: 0, y: 20, label: 'A1', type: 'input' },
                    { id: 'coil_b', x: 0, y: 40, label: 'A2', type: 'input' },
                    { id: 'no', x: 50, y: 20, label: 'NO', type: 'output' },
                    { id: 'com', x: 50, y: 30, label: 'COM', type: 'output' },
                    { id: 'nc', x: 50, y: 40, label: 'NC', type: 'output' }
                ]
            },
            'terminal': {
                width: 40,
                height: 40,
                color: '#95a5a6',
                label: 'TB',
                terminals: [
                    { id: 't1', x: 0, y: 20, label: '1', type: 'input' },
                    { id: 't2', x: 40, y: 20, label: '2', type: 'output' }
                ]
            }
        };
        
        return templates[type] || null;
    }
    
    // ===== Canvas Actions =====
    
    clear() {
        this.components = [];
        this.wires = [];
        this.selectedComponent = null;
        this.wireStart = null;
        this.isDrawingWire = false;
        this.componentToPlace = null;
        this.selectedTool = null;
        this.canvas.style.cursor = 'default';
        console.log('🗑️ Canvas cleared');
    }
    
    saveToJSON() {
        const data = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            components: this.components,
            wires: this.wires
        };
        
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `plc-schematic-${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        console.log('💾 Schematic saved');
    }
    
    loadFromJSON() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    
                    if (!data.components || !data.wires) {
                        throw new Error('Invalid schematic file format');
                    }
                    
                    this.components = data.components;
                    this.wires = data.wires;
                    this.selectedComponent = null;
                    this.wireStart = null;
                    
                    console.log(`📂 Loaded schematic with ${this.components.length} components and ${this.wires.length} wires`);
                } catch (error) {
                    console.error('❌ Failed to load schematic:', error);
                    alert('Failed to load schematic file. Please check the file format.');
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    }
    
    // ===== Grid & Rendering =====
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = this.backgroundColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Save context state
        this.ctx.save();
        
        // Apply camera transform
        this.ctx.translate(this.offsetX, this.offsetY);
        this.ctx.scale(this.scale, this.scale);
        
        // Draw grid
        this.drawGrid();
        
        // Draw wires (behind components)
        this.drawWires();
        
        // Draw components
        this.drawComponents();
        
        // Draw wire preview
        if (this.isDrawingWire && this.wirePreview) {
            this.drawWirePreview();
        }
        
        // Restore context
        this.ctx.restore();
        
        // Draw UI overlays (not affected by camera)
        this.drawUI();
        
        // Continue render loop
        requestAnimationFrame(() => this.render());
    }
    
    drawGrid() {
        const startX = Math.floor(-this.offsetX / this.scale / this.gridSize) * this.gridSize;
        const startY = Math.floor(-this.offsetY / this.scale / this.gridSize) * this.gridSize;
        const endX = startX + (this.canvas.width / this.scale) + this.gridSize;
        const endY = startY + (this.canvas.height / this.scale) + this.gridSize;
        
        this.ctx.strokeStyle = this.gridColor;
        this.ctx.lineWidth = 1 / this.scale;
        this.ctx.beginPath();
        
        // Vertical lines
        for (let x = startX; x <= endX; x += this.gridSize) {
            this.ctx.moveTo(x, startY);
            this.ctx.lineTo(x, endY);
        }
        
        // Horizontal lines
        for (let y = startY; y <= endY; y += this.gridSize) {
            this.ctx.moveTo(startX, y);
            this.ctx.lineTo(endX, y);
        }
        
        this.ctx.stroke();
        
        // Draw origin axes (thicker)
        this.ctx.strokeStyle = '#444';
        this.ctx.lineWidth = 2 / this.scale;
        this.ctx.beginPath();
        this.ctx.moveTo(0, startY);
        this.ctx.lineTo(0, endY);
        this.ctx.moveTo(startX, 0);
        this.ctx.lineTo(endX, 0);
        this.ctx.stroke();
    }
    
    drawComponents() {
        for (const comp of this.components) {
            this.drawComponent(comp);
        }
    }
    
    drawComponent(comp) {
        const isSelected = comp === this.selectedComponent;
        
        // Save context for rotation
        this.ctx.save();
        
        // Apply rotation if component has rotation
        if (comp.rotation) {
            const centerX = comp.x + comp.width / 2;
            const centerY = comp.y + comp.height / 2;
            this.ctx.translate(centerX, centerY);
            this.ctx.rotate((comp.rotation * Math.PI) / 180);
            this.ctx.translate(-centerX, -centerY);
        }
        
        // Draw component body
        this.ctx.fillStyle = comp.color || '#34495e';
        this.ctx.strokeStyle = isSelected ? '#0066cc' : '#000000';
        this.ctx.lineWidth = isSelected ? 3 / this.scale : 2 / this.scale;
        
        this.ctx.fillRect(comp.x, comp.y, comp.width, comp.height);
        this.ctx.strokeRect(comp.x, comp.y, comp.width, comp.height);
        
        // Draw component label (single label, centered)
        this.ctx.fillStyle = '#000000';
        this.ctx.font = `bold ${14 / this.scale}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        const label = comp.label || comp.type.toUpperCase();
        
        // Single line text - no word wrap for clarity
        this.ctx.fillText(
            label,
            comp.x + comp.width / 2,
            comp.y + comp.height / 2
        );
        
        // Draw terminals
        if (comp.terminals) {
            for (const term of comp.terminals) {
                this.drawTerminal(comp, term);
            }
        }
        
        this.ctx.restore();
    }
    
    drawTerminal(comp, terminal) {
        const termSize = 8 / this.scale; // Increased from 6 to 8 for better visibility
        
        // Calculate terminal position using x,y from terminal definition
        // These are relative to component position
        const termX = comp.x + terminal.x;
        const termY = comp.y + terminal.y;
        
        // Store world position FIRST (before any drawing)
        // This is critical for wire connection detection
        terminal.worldX = termX;
        terminal.worldY = termY;
        
        // Draw terminal circle with proper color
        const terminalColor = terminal.type === 'input' ? '#4CAF50' : '#F44336';
        
        // If in wire mode, draw a larger hover area indicator
        if (this.selectedTool === 'wire' || this.isDrawingWire) {
            this.ctx.fillStyle = 'rgba(255, 255, 0, 0.1)'; // Yellow transparent
            this.ctx.beginPath();
            this.ctx.arc(termX, termY, 25 / this.scale, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Outer circle (border)
        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(termX, termY, termSize + 2/this.scale, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Inner circle (colored)
        this.ctx.fillStyle = terminalColor;
        this.ctx.beginPath();
        this.ctx.arc(termX, termY, termSize, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw terminal label (small, black text)
        this.ctx.fillStyle = '#000000';
        this.ctx.font = `bold ${10 / this.scale}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Position label outside the component
        // Determine side based on terminal.x position relative to component
        let labelX = termX;
        let labelY = termY;
        const offset = 16 / this.scale;
        
        // If terminal is on the left edge (x = 0)
        if (terminal.x === 0) {
            labelX -= offset;
            this.ctx.textAlign = 'right';
        }
        // If terminal is on the right edge (x = comp.width)
        else if (terminal.x >= comp.width - 1) {
            labelX += offset;
            this.ctx.textAlign = 'left';
        }
        // If terminal is on top edge (y = 0)
        else if (terminal.y === 0) {
            labelY -= offset;
            this.ctx.textBaseline = 'bottom';
        }
        // If terminal is on bottom edge (y = comp.height)
        else if (terminal.y >= comp.height - 1) {
            labelY += offset;
            this.ctx.textBaseline = 'top';
        }
        
        this.ctx.fillText(terminal.label, labelX, labelY);
    }
    
    drawWires() {
        for (const wire of this.wires) {
            this.drawWire(wire);
        }
    }
    
    drawWire(wire) {
        this.ctx.strokeStyle = wire.color || '#f39c12';
        this.ctx.lineWidth = 2 / this.scale;
        this.ctx.lineCap = 'round';
        
        this.ctx.beginPath();
        this.ctx.moveTo(wire.startX, wire.startY);
        
        // Draw with right-angle routing
        const midX = (wire.startX + wire.endX) / 2;
        this.ctx.lineTo(midX, wire.startY);
        this.ctx.lineTo(midX, wire.endY);
        this.ctx.lineTo(wire.endX, wire.endY);
        
        this.ctx.stroke();
    }
    
    drawWirePreview() {
        if (!this.wireStart || !this.wirePreview) return;
        
        this.ctx.strokeStyle = '#3498db';
        this.ctx.lineWidth = 2 / this.scale;
        this.ctx.setLineDash([5 / this.scale, 5 / this.scale]);
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.wireStart.worldX, this.wireStart.worldY);
        this.ctx.lineTo(this.wirePreview.x, this.wirePreview.y);
        this.ctx.stroke();
        
        this.ctx.setLineDash([]);
    }
    
    drawUI() {
        // Draw zoom indicator (dark text on white background)
        this.ctx.fillStyle = '#000000';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Zoom: ${(this.scale * 100).toFixed(0)}%`, 10, 20);
        
        // Draw mode indicator
        if (this.isDrawingWire) {
            this.ctx.fillStyle = '#0066cc';
            this.ctx.fillText('Mode: Drawing Wire', 10, 40);
        }
        
        // Draw snap indicator
        if (this.snapToGrid) {
            this.ctx.fillStyle = '#006600';
            this.ctx.fillText('⊞ Snap: ON', 10, 60);
        }
    }
    
    // ===== Mouse Interaction =====
    
    onMouseDown(e) {
        const worldPos = this.screenToWorld(e.clientX, e.clientY);
        
        // Right click - cancel actions
        if (e.button === 2) {
            if (this.isDrawingWire) {
                this.cancelWireDrawing();
            }
            this.componentToPlace = null;
            this.selectedTool = null;
            this.canvas.style.cursor = 'default';
            // Clear toolbar selection
            document.querySelectorAll('.drawing-component-btn, .drawing-tool-btn').forEach(b => b.classList.remove('active'));
            return;
        }
        
        // Left click
        if (e.button === 0) {
            // PLACEMENT MODE: Place component on canvas
            if (this.componentToPlace) {
                this.placeComponent(this.componentToPlace, worldPos.x, worldPos.y);
                return;
            }
            
            // DELETE MODE: Delete component
            if (this.selectedTool === 'delete') {
                const component = this.getComponentAt(worldPos.x, worldPos.y);
                if (component) {
                    this.deleteComponent(component);
                }
                return;
            }
            
            // WIRE MODE: Check if clicked on terminal
            if (this.isDrawingWire || this.selectedTool === 'wire') {
                const terminal = this.getTerminalAt(worldPos.x, worldPos.y);
                console.log('🔍 Wire mode click - Terminal found:', terminal ? 'YES' : 'NO', 'at', worldPos);
                if (terminal) {
                    this.handleTerminalClick(terminal);
                    return;
                } else {
                    // In wire mode but no terminal clicked - don't pan, just do nothing
                    console.log('⚠️ Wire mode: Click on a terminal (green/red circle) to draw wire');
                    return;
                }
            }
            
            // SELECT MODE: Check if clicked on component
            if (this.selectedTool === 'select') {
                const component = this.getComponentAt(worldPos.x, worldPos.y);
                if (component) {
                    this.selectComponent(component);
                    this.isDragging = true;
                    this.dragStartX = worldPos.x - component.x;
                    this.dragStartY = worldPos.y - component.y;
                    return;
                }
            }
            
            // Default: Pan canvas (only if no specific tool is selected)
            if (!this.selectedTool && !this.componentToPlace) {
                this.selectedComponent = null;
                this.isDragging = true;
                this.dragStartX = e.clientX - this.offsetX;
                this.dragStartY = e.clientY - this.offsetY;
                this.canvas.style.cursor = 'grabbing';
            }
        }
    }
    
    onMouseMove(e) {
        const worldPos = this.screenToWorld(e.clientX, e.clientY);
        
        // Update wire preview
        if (this.isDrawingWire) {
            this.wirePreview = worldPos;
            return;
        }
        
        // Drag component
        if (this.isDragging && this.selectedComponent) {
            let newX = worldPos.x - this.dragStartX;
            let newY = worldPos.y - this.dragStartY;
            
            // Snap to grid
            if (this.snapToGrid) {
                newX = Math.round(newX / this.gridSize) * this.gridSize;
                newY = Math.round(newY / this.gridSize) * this.gridSize;
            }
            
            this.selectedComponent.x = newX;
            this.selectedComponent.y = newY;
            return;
        }
        
        // Pan canvas
        if (this.isDragging && !this.selectedComponent) {
            this.offsetX = e.clientX - this.dragStartX;
            this.offsetY = e.clientY - this.dragStartY;
            return;
        }
        
        // Update cursor
        const terminal = this.getTerminalAt(worldPos.x, worldPos.y);
        const component = this.getComponentAt(worldPos.x, worldPos.y);
        
        if (terminal) {
            this.canvas.style.cursor = 'crosshair';
        } else if (component) {
            this.canvas.style.cursor = 'move';
        } else {
            this.canvas.style.cursor = 'default';
        }
    }
    
    onMouseUp(e) {
        this.isDragging = false;
        this.canvas.style.cursor = 'default';
    }
    
    onKeyDown(e) {
        // ESC - Deselect tool/component
        if (e.key === 'Escape') {
            this.componentToPlace = null;
            this.selectedTool = null;
            this.isDrawingWire = false;
            this.cancelWireDrawing();
            this.selectedComponent = null;
            this.canvas.style.cursor = 'default';
            
            // Clear all active buttons
            document.querySelectorAll('.drawing-component-btn, .drawing-tool-btn, .wire-color-btn').forEach(b => b.classList.remove('active'));
            
            // Re-activate default black wire color
            const blackBtn = document.querySelector('.wire-color-btn[data-color="#000000"]');
            if (blackBtn) blackBtn.classList.add('active');
            
            console.log('🔄 Selection cleared (ESC)');
        }
        
        // SPACE - Rotate selected component 90 degrees
        if (e.code === 'Space' && this.selectedComponent) {
            e.preventDefault(); // Prevent page scroll
            this.selectedComponent.rotation = (this.selectedComponent.rotation || 0) + 90;
            if (this.selectedComponent.rotation >= 360) {
                this.selectedComponent.rotation = 0;
            }
            console.log(`🔄 Component rotated to ${this.selectedComponent.rotation}°`);
        }
    }
    
    onWheel(e) {
        e.preventDefault();
        
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = this.scale * delta;
        
        if (newScale >= this.minScale && newScale <= this.maxScale) {
            // Zoom towards mouse position
            const mouseX = e.clientX - this.offsetX;
            const mouseY = e.clientY - this.offsetY;
            
            this.scale = newScale;
            
            this.offsetX = e.clientX - mouseX * this.scale / (this.scale / delta);
            this.offsetY = e.clientY - mouseY * this.scale / (this.scale / delta);
        }
    }
    
    onResize() {
        const container = document.getElementById(this.containerId);
        if (container) {
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;
        }
    }
    
    // ===== Helper Methods =====
    
    screenToWorld(screenX, screenY) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (screenX - rect.left - this.offsetX) / this.scale;
        const y = (screenY - rect.top - this.offsetY) / this.scale;
        return { x, y };
    }
    
    getComponentAt(x, y) {
        // Check from top to bottom (reverse order)
        for (let i = this.components.length - 1; i >= 0; i--) {
            const comp = this.components[i];
            if (x >= comp.x && x <= comp.x + comp.width &&
                y >= comp.y && y <= comp.y + comp.height) {
                return comp;
            }
        }
        return null;
    }
    
    getTerminalAt(x, y) {
        const threshold = 25 / this.scale; // Increased from 15 to 25 for MUCH easier clicking
        
        let closestDist = Infinity;
        let closestTerminal = null;
        
        for (const comp of this.components) {
            if (!comp.terminals) continue;
            
            for (const term of comp.terminals) {
                if (!term.worldX || !term.worldY) {
                    console.warn('⚠️ Terminal missing worldX/worldY:', term);
                    continue;
                }
                
                const dx = x - term.worldX;
                const dy = y - term.worldY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < closestDist) {
                    closestDist = dist;
                    closestTerminal = { component: comp, terminal: term, distance: dist };
                }
                
                if (dist <= threshold) {
                    console.log('✅ Terminal found:', term.label, 'distance:', dist.toFixed(2), 'threshold:', threshold.toFixed(2));
                    return { component: comp, terminal: term };
                }
            }
        }
        
        if (closestTerminal) {
            console.log('❌ Closest terminal:', closestTerminal.terminal.label, 'distance:', closestDist.toFixed(2), 'threshold:', threshold.toFixed(2));
        } else {
            console.log('❌ No terminals found. Total components:', this.components.length);
        }
        
        return null;
    }
    
    selectComponent(comp) {
        this.selectedComponent = comp;
        console.log('Selected:', comp.label || comp.type);
        
        // Update property panel if exists
        if (window.drawingPropertyPanel) {
            window.drawingPropertyPanel.update(comp);
        }
    }
    
    // ===== Wire Drawing =====
    
    handleTerminalClick(terminalInfo) {
        if (!this.isDrawingWire) {
            // Start drawing wire
            this.isDrawingWire = true;
            this.wireStart = terminalInfo.terminal;
            console.log('Wire drawing started from:', terminalInfo.component.label);
        } else {
            // Complete wire
            this.completeWire(terminalInfo.terminal);
        }
    }
    
    completeWire(endTerminal) {
        if (!this.wireStart) return;
        
        // Create wire
        const wire = {
            id: `wire_${Date.now()}`,
            startX: this.wireStart.worldX,
            startY: this.wireStart.worldY,
            endX: endTerminal.worldX,
            endY: endTerminal.worldY,
            color: this.currentWireColor
        };
        
        this.wires.push(wire);
        console.log(`✅ Wire created (${this.currentWireColor})`);
        
        this.cancelWireDrawing();
        
        // Keep wire tool active for drawing more wires
        if (this.selectedTool === 'wire') {
            this.canvas.style.cursor = 'crosshair';
        }
    }
    
    cancelWireDrawing() {
        this.isDrawingWire = false;
        this.wireStart = null;
        this.wirePreview = null;
        console.log('Wire drawing cancelled');
    }
    
    // ===== Component Management =====
    
    addComponent(type, x, y) {
        let width, height, terminals, color, label;
        const grid = this.gridSize; // 20px
        
        switch (type) {
            case 'plc':
                width = grid * 6;  // 120px = 6 grids
                height = grid * 8; // 160px = 8 grids
                color = '#34495e';
                label = 'PLC';
                terminals = [
                    { side: 'left', position: 0.25, type: 'input', label: 'I0.0' },
                    { side: 'left', position: 0.375, type: 'input', label: 'I0.1' },
                    { side: 'left', position: 0.5, type: 'input', label: 'I0.2' },
                    { side: 'left', position: 0.625, type: 'input', label: 'I0.3' },
                    { side: 'left', position: 0.75, type: 'input', label: 'I0.4' },
                    { side: 'right', position: 0.25, type: 'output', label: 'Q0.0' },
                    { side: 'right', position: 0.375, type: 'output', label: 'Q0.1' },
                    { side: 'right', position: 0.5, type: 'output', label: 'Q0.2' },
                    { side: 'right', position: 0.625, type: 'output', label: 'Q0.3' },
                    { side: 'right', position: 0.75, type: 'output', label: 'Q0.4' },
                ];
                break;
            case 'power-supply':
                width = grid * 4;  // 80px = 4 grids
                height = grid * 4; // 80px = 4 grids
                color = '#f39c12';
                label = 'PSU';
                terminals = [
                    { side: 'bottom', position: 0.33, type: 'output', label: '24V' },
                    { side: 'bottom', position: 0.66, type: 'output', label: 'GND' }
                ];
                break;
            case 'io-module':
                width = grid * 4;  // 80px = 4 grids
                height = grid * 6; // 120px = 6 grids
                color = '#9b59b6';
                label = 'I/O';
                terminals = [
                    { side: 'left', position: 0.25, type: 'input', label: 'IN1' },
                    { side: 'left', position: 0.5, type: 'input', label: 'IN2' },
                    { side: 'left', position: 0.75, type: 'input', label: 'IN3' },
                    { side: 'right', position: 0.25, type: 'output', label: 'OUT1' },
                    { side: 'right', position: 0.5, type: 'output', label: 'OUT2' },
                    { side: 'right', position: 0.75, type: 'output', label: 'OUT3' }
                ];
                break;
            case 'button':
                width = grid * 3;  // 60px = 3 grids
                height = grid * 3; // 60px = 3 grids
                color = '#27ae60';
                label = 'BUTTON';
                terminals = [
                    { side: 'top', position: 0.33, type: 'input', label: 'COM' },
                    { side: 'bottom', position: 0.33, type: 'output', label: 'NO' },
                    { side: 'bottom', position: 0.66, type: 'output', label: 'NC' }
                ];
                break;
            case 'motor':
                width = grid * 4;  // 80px = 4 grids
                height = grid * 4; // 80px = 4 grids
                color = '#3498db';
                label = 'MOTOR';
                terminals = [
                    { side: 'top', position: 0.33, type: 'input', label: 'L1' },
                    { side: 'top', position: 0.5, type: 'input', label: 'L2' },
                    { side: 'top', position: 0.66, type: 'input', label: 'L3' }
                ];
                break;
            case 'sensor':
                width = grid * 3;  // 60px = 3 grids
                height = grid * 3; // 60px = 3 grids
                color = '#16a085';
                label = 'SENSOR';
                terminals = [
                    { side: 'top', position: 0.25, type: 'input', label: '+' },
                    { side: 'top', position: 0.75, type: 'input', label: '-' },
                    { side: 'bottom', position: 0.5, type: 'output', label: 'OUT' }
                ];
                break;
            case 'led':
                width = grid * 2;  // 40px = 2 grids (fixed from 1.5)
                height = grid * 2; // 40px = 2 grids
                color = '#e74c3c';
                label = 'LED';
                terminals = [
                    { side: 'top', position: 0.33, type: 'input', label: '+' },
                    { side: 'top', position: 0.66, type: 'input', label: '-' }
                ];
                break;
            case 'relay':
                width = grid * 4;  // 80px = 4 grids
                height = grid * 4; // 80px = 4 grids
                color = '#e67e22';
                label = 'RELAY';
                terminals = [
                    { side: 'left', position: 0.33, type: 'input', label: 'A1' },
                    { side: 'left', position: 0.66, type: 'input', label: 'A2' },
                    { side: 'right', position: 0.25, type: 'output', label: 'COM' },
                    { side: 'right', position: 0.5, type: 'output', label: 'NO' },
                    { side: 'right', position: 0.75, type: 'output', label: 'NC' }
                ];
                break;
            case 'terminal':
                width = grid * 2;  // 40px = 2 grids
                height = grid * 2; // 40px = 2 grids
                color = '#95a5a6';
                label = 'TERM';
                terminals = [
                    { side: 'left', position: 0.5, type: 'input', label: 'IN' },
                    { side: 'right', position: 0.5, type: 'output', label: 'OUT' }
                ];
                break;
            default:
                width = grid * 4;  // 80px = 4 grids
                height = grid * 4; // 80px = 4 grids
                color = '#95a5a6';
                label = type.toUpperCase();
                terminals = [
                    { side: 'left', position: 0.5, type: 'input', label: 'IN' },
                    { side: 'right', position: 0.5, type: 'output', label: 'OUT' }
                ];
        }
        
        // Snap to grid
        if (this.snapToGrid) {
            x = Math.round(x / this.gridSize) * this.gridSize;
            y = Math.round(y / this.gridSize) * this.gridSize;
        }
        
        const component = {
            id: `comp_${Date.now()}`,
            type,
            label,
            x,
            y,
            width,
            height,
            color,
            terminals,
            rotation: 0 // Initialize rotation
        };
        
        this.components.push(component);
        console.log('Component added:', type);
        
        return component;
    }
    
    deleteComponent(comp) {
        const index = this.components.indexOf(comp);
        if (index > -1) {
            this.components.splice(index, 1);
            if (this.selectedComponent === comp) {
                this.selectedComponent = null;
            }
        }
    }
    
    // ===== JSON Import/Export =====
    
    toJSON() {
        return {
            version: '1.0',
            gridSize: this.gridSize,
            components: this.components.map(comp => ({
                id: comp.id,
                type: comp.type,
                label: comp.label,
                x: comp.x,
                y: comp.y,
                width: comp.width,
                height: comp.height,
                color: comp.color,
                terminals: comp.terminals,
                rotation: comp.rotation || 0
            })),
            wires: this.wires.map(wire => ({
                id: wire.id,
                startX: wire.startX,
                startY: wire.startY,
                endX: wire.endX,
                endY: wire.endY,
                color: wire.color
            }))
        };
    }
    
    fromJSON(data) {
        if (!data || !data.version) {
            console.error('Invalid JSON data');
            return;
        }
        
        this.gridSize = data.gridSize || 20;
        this.components = data.components.map(comp => ({
            ...comp,
            rotation: comp.rotation || 0 // Ensure rotation is set
        })) || [];
        this.wires = data.wires || [];
        
        console.log('Loaded schematic:', this.components.length, 'components,', this.wires.length, 'wires');
    }
    
    saveToFile(filename = 'schematic.json') {
        const json = JSON.stringify(this.toJSON(), null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        
        URL.revokeObjectURL(url);
        console.log('Saved to:', filename);
    }
    
    loadFromFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.fromJSON(data);
            } catch (error) {
                console.error('Error loading file:', error);
                alert('Error loading file. Invalid JSON format.');
            }
        };
        reader.readAsText(file);
    }
    
    clear() {
        this.components = [];
        this.wires = [];
        this.selectedComponent = null;
        console.log('Canvas cleared');
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DrawingCanvas;
}
