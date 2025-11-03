// Port Config Viewer - Main Class
// Coordinates all port configuration functionality

let portConfigViewer = null;

class PortConfigViewer {
    constructor() {
        this.container = document.getElementById('portconfig-viewer');
        this.statusDiv = document.getElementById('portconfig-status');
        
        // Initialize managers
        this.sceneManager = new PortConfigScene(this.container);
        this.ui = new PortConfigUI(this.statusDiv);
        this.storage = new PortConfigStorage(
            (msg, type) => this.log(msg, type),
            (msg, type) => this.log(msg, type)
        );
        this.markers = new PortConfigMarkers(this.sceneManager);
        this.loader = new PortConfigLoader(
            this.sceneManager,
            (msg, type) => this.log(msg, type),
            (msg, type) => this.log(msg, type)
        );
        this.interaction = new PortConfigInteraction(
            this.sceneManager,
            (position, shiftKey) => this.addPort(position, shiftKey),
            (msg, type) => this.log(msg, type)
        );
        
        // State
        this.currentModel = null;
        this.currentModelId = null;
        this.currentModelName = null;
        this.modelPorts = new Map(); // Store ports per model ID
        this.portEditMode = true; // Always in port edit mode
        this.catalogModels = []; // Store catalog for model loading
        
        this.init();
    }
    
    init() {
        // Initialize scene
        this.sceneManager.init();
        
        // Setup mouse picking
        this.interaction.setupMousePicking();
        
        // Start animation loop
        this.sceneManager.animate();
        
        this.log('Port Config Viewer initialized - You should see a red test cube', 'success');
    }
    
    async loadModel(modelData) {
        console.log('Loading model:', modelData);
        
        // Clear current model
        if (this.currentModel) {
            this.sceneManager.removeFromScene(this.currentModel);
            this.markers.clearAllMarkers();
        }
        
        // Remove test cube if it exists
        this.sceneManager.removeTestCube();
        
        try {
            const loadedModel = await this.loader.loadModel(modelData);
            
            this.currentModel = loadedModel;
            this.currentModelId = modelData.id;
            this.currentModelName = modelData.name;
            this.sceneManager.addToScene(loadedModel);
            this.interaction.setCurrentModel(loadedModel);
            
            console.log('Model added to scene');
            
            // Center camera on model
            this.sceneManager.centerCameraOnModel(loadedModel);
            
            // Update UI
            this.ui.updateModelName(modelData.id, modelData.name);
            
            // Load existing ports if any
            if (this.modelPorts.has(this.currentModelId)) {
                const ports = this.modelPorts.get(this.currentModelId);
                ports.forEach(port => {
                    this.markers.createPortMarker(port);
                });
            }
            
            this.updatePortsList();
            this.log(`✅ Loaded: ${modelData.name}`, 'success');
            
        } catch (error) {
            console.error('Error loading model:', error);
        }
    }
    
    addPort(worldPosition, surfaceNormal, withLabel = false) {
        let label = `Port_${this.markers.getMarkers().length / 2 + 1}`;
        
        if (withLabel) {
            label = prompt('Enter port label:', label);
            if (!label) return;
        }
        
        const port = {
            label: label,
            worldPosition: {
                x: worldPosition.x,
                y: worldPosition.y,
                z: worldPosition.z
            },
            localPosition: {
                x: worldPosition.x,
                y: worldPosition.y,
                z: worldPosition.z
            },
            normal: {
                x: surfaceNormal.x,
                y: surfaceNormal.y,
                z: surfaceNormal.z
            }
        };
        
        // Store port for current model
        if (!this.modelPorts.has(this.currentModelId)) {
            this.modelPorts.set(this.currentModelId, []);
        }
        this.modelPorts.get(this.currentModelId).push(port);
        
        // Create visual marker
        this.markers.createPortMarker(port);
        this.updatePortsList();
        
        this.log(`✅ Port added: ${label} at (${worldPosition.x.toFixed(1)}, ${worldPosition.y.toFixed(1)}, ${worldPosition.z.toFixed(1)})`, 'success');
    }
    
    clearTemporaryDots() {
        this.interaction.clearTemporaryDots();
        this.interaction.clearSurfaceHighlight();
        this.log('Temporary dots and highlight cleared', 'info');
    }
    
    clearAllPorts() {
        if (!this.currentModelId) {
            this.log('No model selected', 'warning');
            return;
        }
        
        if (!confirm(`Clear all ports for ${this.currentModelName}?`)) return;
        
        this.modelPorts.delete(this.currentModelId);
        this.markers.clearAllMarkers();
        this.updatePortsList();
        this.log('All ports cleared', 'info');
    }
    
    updatePortsList() {
        this.ui.updatePortsList(
            this.currentModelId,
            this.currentModelName,
            this.modelPorts,
            (index) => this.editPortLabel(index),
            (index) => this.deletePort(index)
        );
    }
    
    editPortLabel(index) {
        if (!this.currentModelId || !this.modelPorts.has(this.currentModelId)) return;
        
        const ports = this.modelPorts.get(this.currentModelId);
        if (index < 0 || index >= ports.length) return;
        
        const port = ports[index];
        const newLabel = prompt('Enter new port label:', port.label);
        
        if (newLabel && newLabel !== port.label) {
            port.label = newLabel;
            
            // Update visual marker
            this.markers.clearAllMarkers();
            ports.forEach(p => this.markers.createPortMarker(p));
            
            this.updatePortsList();
            this.log(`✏️ Port label updated: ${newLabel}`, 'success');
        }
    }
    
    deletePort(index) {
        if (!this.currentModelId || !this.modelPorts.has(this.currentModelId)) return;
        
        const ports = this.modelPorts.get(this.currentModelId);
        if (index < 0 || index >= ports.length) return;
        
        const port = ports[index];
        if (!confirm(`Delete port "${port.label}"?`)) return;
        
        // Remove from array
        ports.splice(index, 1);
        
        // Update visual markers
        this.markers.clearAllMarkers();
        ports.forEach(p => this.markers.createPortMarker(p));
        
        this.updatePortsList();
        this.log(`🗑️ Port deleted: ${port.label}`, 'info');
    }
    
    savePorts() {
        this.storage.savePorts(this.modelPorts);
    }
    
    async loadPorts() {
        this.storage.loadPorts(async (portsData) => {
            this.modelPorts.clear();
            
            // Handle both old format (object with model names as keys) and new format (array of models with IDs)
            if (portsData.models && Array.isArray(portsData.models)) {
                // New format
                portsData.models.forEach(modelData => {
                    this.modelPorts.set(modelData.modelId, modelData.ports);
                });
                
                // Auto-load models that have ports
                if (portsData.models.length > 0) {
                    this.log(`📦 Loading ${portsData.models.length} model(s) with port configurations...`, 'info');
                    
                    // Get the first model with ports to display
                    const firstModelId = portsData.models[0].modelId;
                    const modelToLoad = this.catalogModels.find(m => m.id === firstModelId);
                    
                    if (modelToLoad) {
                        this.log(`Loading model: ${modelToLoad.name}`, 'info');
                        await this.loadModel(modelToLoad);
                    } else {
                        this.log(`⚠️ Model with ID ${firstModelId} not found in catalog`, 'warning');
                    }
                    
                    // Show summary of all models with ports
                    const modelSummary = portsData.models.map(m => {
                        const model = this.catalogModels.find(cat => cat.id === m.modelId);
                        const modelName = model ? model.name : `ID:${m.modelId}`;
                        return `${modelName} (${m.ports.length} ports)`;
                    }).join(', ');
                    
                    this.log(`✅ Port config loaded: ${modelSummary}`, 'success');
                }
            } else {
                // Old format - convert model names to IDs (if possible)
                // For now, just warn the user
                this.log('⚠️ Old port config format detected. Please re-save after loading models.', 'warning');
                Object.entries(portsData).forEach(([modelName, ports]) => {
                    // Store by name temporarily - will need manual conversion
                    this.modelPorts.set(modelName, ports);
                });
            }
            
            // Refresh current model ports if loaded
            if (this.currentModelId && this.modelPorts.has(this.currentModelId)) {
                this.markers.clearAllMarkers();
                const ports = this.modelPorts.get(this.currentModelId);
                ports.forEach(port => this.markers.createPortMarker(port));
                this.updatePortsList();
            }
        });
    }
    
    setCatalogModels(models) {
        this.catalogModels = models;
    }
    
    applyScale() {
        if (!this.currentModel) {
            this.log('⚠️ No model loaded', 'warning');
            return;
        }
        
        const scaleInput = document.getElementById('portConfigScaleFactor');
        const scaleFactor = parseFloat(scaleInput.value);
        
        if (isNaN(scaleFactor) || scaleFactor <= 0) {
            this.log('⚠️ Invalid scale factor', 'warning');
            return;
        }
        
        console.log('Applying scale factor:', scaleFactor);
        
        // Clear all ports first
        if (this.modelPorts.has(this.currentModelName)) {
            this.modelPorts.delete(this.currentModelName);
        }
        this.markers.clearAllMarkers();
        
        // Apply scale
        this.currentModel.scale.set(scaleFactor, scaleFactor, scaleFactor);
        this.currentModel.updateMatrix();
        this.currentModel.updateMatrixWorld(true);
        
        // Re-center camera
        this.sceneManager.centerCameraOnModel(this.currentModel);
        
        this.updatePortsList();
        this.log(`✅ Scale applied: ${scaleFactor}x (ports cleared)`, 'success');
    }

    setCubicView(view) {
        this.sceneManager.setCubicView(view, this.currentModel);
        this.log(`📐 View set to: ${view}`, 'info');
    }

    viewNormalToSurface() {
        const lastHighlight = this.interaction.getLastSurfaceData();
        
        if (!lastHighlight) {
            this.log('⚠️ Click on a surface first!', 'warning');
            return;
        }
        
        const { normal, point } = lastHighlight;
        this.sceneManager.viewNormalToSurface(normal, point);
        this.log('📍 Camera aligned perpendicular to surface', 'success');
    }
    
    log(message, type = 'info') {
        this.ui.log(message, type);
    }
}
