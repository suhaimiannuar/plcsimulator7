// modelPorts.js - Port System (Port editing, markers, configuration)

class ModelPortsManager {
    constructor() {
        this.modelPorts = new Map(); // Store ports per model
        this.portMarkers = [];
        this.portVisualScale = 1.0; // Global multiplier for port sphere size (1.0 = default, 2.0 = 2x larger)
    }
    
    togglePortEditMode(sceneInstance) {
        sceneInstance.portEditMode = !sceneInstance.portEditMode;
        const btn = document.getElementById('togglePortEditMode');
        const controls = document.getElementById('portEditorControls');
        
        if (sceneInstance.portEditMode) {
            btn.textContent = '📍 Edit Ports Mode: ON';
            btn.classList.remove('btn-secondary');
            btn.classList.add('btn-success');
            controls.style.display = 'block';
            sceneInstance.log('🔌 Port Edit Mode ENABLED - Click on models to add ports', 'success');
        } else {
            btn.textContent = '📍 Edit Ports Mode: OFF';
            btn.classList.remove('btn-success');
            btn.classList.add('btn-secondary');
            controls.style.display = 'none';
            sceneInstance.log('🔌 Port Edit Mode DISABLED', 'info');
        }
    }
    
    addPortToModel(sceneInstance, modelObj, worldPosition, shiftKey = false) {
        if (!sceneInstance.portEditMode) return;
        
        const modelName = modelObj.userData.modelData?.name || modelObj.userData.name;
        
        // Shift+Click removes nearest port
        if (shiftKey) {
            this.removeNearestPort(sceneInstance, modelName, worldPosition);
            return;
        }
        
        // Get port configuration
        const label = document.getElementById('portLabel').value || 'Port';
        const type = document.getElementById('portType').value;
        const size = parseFloat(document.getElementById('portSize').value) || 10;
        
        // Convert world position to local position relative to model
        const localPosition = modelObj.worldToLocal(worldPosition.clone());
        
        // Initialize ports array for this model if needed
        if (!sceneInstance.modelPorts.has(modelName)) {
            sceneInstance.modelPorts.set(modelName, []);
        }
        
        const port = {
            label: label,
            type: type,
            size: size,
            localPosition: { x: localPosition.x, y: localPosition.y, z: localPosition.z },
            worldPosition: { x: worldPosition.x, y: worldPosition.y, z: worldPosition.z }
        };
        
        sceneInstance.modelPorts.get(modelName).push(port);
        this.createPortMarker(sceneInstance, modelObj, port);
        this.updatePortsList(sceneInstance);
        
        sceneInstance.log(`✅ Added port "${label}" to ${modelName}`, 'success');
        
        // Clear label for next port
        document.getElementById('portLabel').value = '';
    }
    
    removeNearestPort(sceneInstance, modelName, worldPosition) {
        const ports = sceneInstance.modelPorts.get(modelName);
        if (!ports || ports.length === 0) return;
        
        // Find nearest port
        let nearestIndex = -1;
        let minDistance = Infinity;
        
        ports.forEach((port, index) => {
            const dx = port.worldPosition.x - worldPosition.x;
            const dy = port.worldPosition.y - worldPosition.y;
            const dz = port.worldPosition.z - worldPosition.z;
            const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
            
            if (distance < minDistance) {
                minDistance = distance;
                nearestIndex = index;
            }
        });
        
        if (nearestIndex >= 0 && minDistance < 30) { // Within 30mm
            const removedPort = ports.splice(nearestIndex, 1)[0];
            this.updatePortMarkers(sceneInstance);
            this.updatePortsList(sceneInstance);
            sceneInstance.log(`🗑️ Removed port "${removedPort.label}" from ${modelName}`, 'warning');
        }
    }
    
    createPortMarker(sceneInstance, modelObj, port) {
        const geometry = new THREE.PlaneGeometry(port.size, port.size);
        const color = this.getPortColor(port.type);
        const material = new THREE.MeshBasicMaterial({ 
            color: color,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8
        });
        
        const marker = new THREE.Mesh(geometry, material);
        marker.position.set(port.worldPosition.x, port.worldPosition.y, port.worldPosition.z);
        marker.userData.isPortMarker = true;
        marker.userData.portLabel = port.label;
        marker.userData.port = port;
        
        // Add text label
        this.addPortLabel(marker, port.label);
        
        sceneInstance.scene.add(marker);
        sceneInstance.portMarkers.push(marker);
    }
    
    addPortLabel(marker, text) {
        // Create canvas for text
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 128;
        
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        context.font = 'Bold 48px Arial';
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, 128, 64);
        
        const texture = new THREE.CanvasTexture(canvas);
        const labelMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(labelMaterial);
        sprite.scale.set(20, 10, 1);
        sprite.position.set(0, 0, 1);
        
        marker.add(sprite);
    }
    
    getPortColor(type) {
        const colors = {
            'power': 0xff0000,    // Red
            'input': 0x00ff00,    // Green
            'output': 0x0000ff,   // Blue
            'data': 0xffff00      // Yellow
        };
        return colors[type] || 0xffffff;
    }
    
    updatePortMarkers(sceneInstance) {
        // Remove all existing markers
        sceneInstance.portMarkers.forEach(marker => sceneInstance.scene.remove(marker));
        sceneInstance.portMarkers = [];
        
        // Recreate markers for all ports
        sceneInstance.modelPorts.forEach((ports, modelName) => {
            const modelObj = sceneInstance.sceneObjects.find(obj => 
                (obj.userData.modelData?.name || obj.userData.name) === modelName
            );
            
            if (modelObj) {
                ports.forEach(port => this.createPortMarker(sceneInstance, modelObj, port));
            }
        });
    }
    
    updatePortsList(sceneInstance) {
        const listDiv = document.getElementById('portsList');
        if (!listDiv) return;
        
        listDiv.innerHTML = '';
        
        if (sceneInstance.modelPorts.size === 0) {
            listDiv.innerHTML = '<p style="color: #888; font-size: 10px;">No ports defined</p>';
            return;
        }
        
        sceneInstance.modelPorts.forEach((ports, modelName) => {
            if (ports.length > 0) {
                const modelSection = document.createElement('div');
                modelSection.style.marginBottom = '10px';
                modelSection.innerHTML = `<strong style="color: #3498db;">${modelName}:</strong>`;
                
                ports.forEach(port => {
                    const portItem = document.createElement('div');
                    portItem.style.marginLeft = '10px';
                    portItem.style.fontSize = '10px';
                    portItem.style.color = '#ecf0f1';
                    
                    const typeIcon = {
                        'power': '⚡',
                        'input': '📥',
                        'output': '📤',
                        'data': '💾'
                    }[port.type] || '🔌';
                    
                    portItem.textContent = `${typeIcon} ${port.label}`;
                    modelSection.appendChild(portItem);
                });
                
                listDiv.appendChild(modelSection);
            }
        });
    }
    
    exportPortsConfig(sceneInstance) {
        const config = {};
        
        sceneInstance.modelPorts.forEach((ports, modelName) => {
            config[modelName] = ports.map(port => ({
                label: port.label,
                type: port.type,
                size: port.size,
                localPosition: port.localPosition
            }));
        });
        
        const json = JSON.stringify(config, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'model-ports-config.json';
        a.click();
        
        URL.revokeObjectURL(url);
        sceneInstance.log('💾 Port configuration exported!', 'success');
    }
    
    importPortsConfig(sceneInstance, file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const config = JSON.parse(e.target.result);
                
                // Clear existing ports
                sceneInstance.modelPorts.clear();
                
                // Load ports from config
                Object.keys(config).forEach(modelName => {
                    sceneInstance.modelPorts.set(modelName, []);
                    
                    config[modelName].forEach(portData => {
                        // Find the model object
                        const modelObj = sceneInstance.sceneObjects.find(obj => 
                            (obj.userData.modelData?.name || obj.userData.name) === modelName
                        );
                        
                        if (modelObj) {
                            // Convert local to world position
                            const localPos = new THREE.Vector3(
                                portData.localPosition.x,
                                portData.localPosition.y,
                                portData.localPosition.z
                            );
                            const worldPos = modelObj.localToWorld(localPos.clone());
                            
                            const port = {
                                label: portData.label,
                                type: portData.type,
                                size: portData.size,
                                localPosition: portData.localPosition,
                                worldPosition: { x: worldPos.x, y: worldPos.y, z: worldPos.z }
                            };
                            
                            sceneInstance.modelPorts.get(modelName).push(port);
                        }
                    });
                });
                
                this.updatePortMarkers(sceneInstance);
                this.updatePortsList(sceneInstance);
                sceneInstance.log('📁 Port configuration imported!', 'success');
                
            } catch (error) {
                sceneInstance.log(`❌ Failed to import config: ${error.message}`, 'error');
            }
        };
        reader.readAsText(file);
    }
    
    clearPortMarkers(sceneInstance) {
        // Remove all port markers from scene
        sceneInstance.portMarkers.forEach(marker => {
            sceneInstance.scene.remove(marker);
            // Dispose geometry and material
            if (marker.geometry) marker.geometry.dispose();
            if (marker.material) marker.material.dispose();
        });
        sceneInstance.portMarkers = [];
    }

    /**
     * Load and display ports from catalog data for a model
     * @param {Object} sceneInstance - The 3D scene instance
     * @param {THREE.Object3D} modelObject - The loaded 3D model
     * @param {Object} modelData - Model data from catalog (includes ports array)
     */
    loadPortsFromCatalog(sceneInstance, modelObject, modelData) {
        if (!modelData || !modelData.ports || modelData.ports.length === 0) {
            console.log('No ports defined in catalog for model:', modelData?.name);
            return;
        }

        const modelName = modelData.name;
        console.log(`Loading ${modelData.ports.length} ports from catalog for ${modelName}`);
        
        // Store ports in the model's port map
        if (!sceneInstance.modelPorts.has(modelName)) {
            sceneInstance.modelPorts.set(modelName, []);
        }
        
        // Add each port from catalog
        modelData.ports.forEach((catalogPort, index) => {
            // Calculate actual world position based on model's current transform
            // The catalog has local positions that need to be transformed by the model's matrix
            const localPos = new THREE.Vector3(
                catalogPort.localPosition.x,
                catalogPort.localPosition.y,
                catalogPort.localPosition.z
            );
            const worldPos = modelObject.localToWorld(localPos.clone());
            
            // Convert catalog port format to internal format with instance info
            const port = {
                label: catalogPort.label,
                type: 'input', // Default type
                worldPosition: { x: worldPos.x, y: worldPos.y, z: worldPos.z }, // Use calculated world position
                localPosition: catalogPort.localPosition,
                normal: catalogPort.normal,
                size: 8, // Default size
                // Add instance identification
                instanceId: modelObject.userData.instanceId,
                instanceName: modelObject.userData.instanceName,
                modelName: modelName,
                // Create unique port identifier
                portId: `${modelObject.userData.instanceId}_${catalogPort.label}`
            };
            
            // Add to model's port list (keyed by instance name for uniqueness)
            const instanceKey = modelObject.userData.instanceName || modelName;
            if (!sceneInstance.modelPorts.has(instanceKey)) {
                sceneInstance.modelPorts.set(instanceKey, []);
            }
            sceneInstance.modelPorts.get(instanceKey).push(port);
            
            // Create visual marker
            this.createCatalogPortMarker(sceneInstance, modelObject, port);
        });
        
        const instanceInfo = modelObject.userData.instanceName || modelName;
        sceneInstance.log(`✅ ${modelData.ports.length} port(s) loaded from catalog for ${instanceInfo}`, 'success');
        this.updatePortsList(sceneInstance);
    }

    /**
     * Create visual marker for a catalog port
     * @param {Object} sceneInstance - The 3D scene instance
     * @param {THREE.Object3D} modelObject - The parent model object
     * @param {Object} port - Port data with worldPosition, normal, label
     */
    createCatalogPortMarker(sceneInstance, modelObject, port) {
        // Create a group to hold all port visual elements
        const portGroup = new THREE.Group();
        portGroup.userData = {
            isPortGroup: true,
            portLabel: port.label,
            portId: port.portId,
            instanceId: port.instanceId,
            instanceName: port.instanceName,
            modelName: port.modelName,
            portData: port,
            isPort: true
        };
        
        // Convert port position to Vector3 (use localPosition if available, otherwise worldPosition)
        // The positions are stored in world coordinates, but we need to convert to local coordinates
        // accounting for the model's current scale
        const worldPos = new THREE.Vector3(
            port.localPosition?.x || port.worldPosition.x,
            port.localPosition?.y || port.worldPosition.y,
            port.localPosition?.z || port.worldPosition.z
        );
        
        // Convert world position to local position by dividing by model's scale
        // This is necessary because when parented, the position gets multiplied by the parent's scale
        const portPos = new THREE.Vector3(
            worldPos.x / modelObject.scale.x,
            worldPos.y / modelObject.scale.y,
            worldPos.z / modelObject.scale.z
        );
        
        // Calculate scale factor for visual elements (use average scale)
        const avgScale = (modelObject.scale.x + modelObject.scale.y + modelObject.scale.z) / 3;
        const visualScale = 1 / avgScale; // Scale down visuals to compensate for parent scale
        
        // 1. Port sphere (small red dot)
        const sphereSize = (port.size || 3) * visualScale * this.portVisualScale;
        const sphereGeometry = new THREE.SphereGeometry(sphereSize, 16, 16);
        const sphereMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xff0000,
            transparent: true,
            opacity: 0.9,
            depthTest: true,
            emissive: 0x000000,  // Add emissive for wire mode highlighting
            emissiveIntensity: 0
        });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.position.copy(portPos);
        sphere.userData = { 
            isPort: true, 
            portLabel: port.label,
            portId: port.portId,
            instanceId: port.instanceId,
            instanceName: port.instanceName,
            modelName: port.modelName,
            portData: port
        };
        
        portGroup.add(sphere);
        
        // Store reference to sphere for highlighting (wire mode needs material access)
        portGroup.userData.sphereMesh = sphere;
        
        // 2. Direction arrow (cyan) - if port has normal
        if (port.normal) {
            const normalVector = new THREE.Vector3(
                port.normal.x, 
                port.normal.y, 
                port.normal.z
            );
            const arrowStart = portPos.clone();
            const arrowLength = 15 * visualScale;
            const arrowEnd = portPos.clone().add(normalVector.multiplyScalar(arrowLength));
            
            // Arrow line
            const arrowGeometry = new THREE.BufferGeometry().setFromPoints([
                arrowStart,
                arrowEnd
            ]);
            const arrowMaterial = new THREE.LineBasicMaterial({ 
                color: 0x00ffff,
                linewidth: 2,
                depthTest: true
            });
            const arrowLine = new THREE.Line(arrowGeometry, arrowMaterial);
            arrowLine.userData = { isPort: true, portLabel: port.label };
            
            portGroup.add(arrowLine);
            
            // Arrow cone head
            const coneRadius = 2 * visualScale;
            const coneHeight = 6 * visualScale;
            const coneGeometry = new THREE.ConeGeometry(coneRadius, coneHeight, 8);
            const coneMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });
            const cone = new THREE.Mesh(coneGeometry, coneMaterial);
            cone.position.copy(arrowEnd);
            
            // Orient cone to point along normal
            cone.quaternion.setFromUnitVectors(
                new THREE.Vector3(0, 1, 0),
                normalVector.clone().normalize()
            );
            cone.userData = { isPort: true, portLabel: port.label };
            
            portGroup.add(cone);
        }
        
        // 3. Label (text sprite)
        if (port.label) {
            const labelOffsetDistance = 20 * visualScale;
            const labelOffset = new THREE.Vector3(0, labelOffsetDistance, 0);
            const labelPos = portPos.clone().add(labelOffset);
            
            // Create text sprite
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 256;
            canvas.height = 64;
            
            context.fillStyle = 'rgba(0, 0, 0, 0.7)';
            context.fillRect(0, 0, canvas.width, canvas.height);
            
            context.font = 'Bold 28px Arial';
            context.fillStyle = 'white';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(port.label, canvas.width / 2, canvas.height / 2);
            
            const texture = new THREE.CanvasTexture(canvas);
            const spriteMaterial = new THREE.SpriteMaterial({ 
                map: texture,
                depthTest: false,
                transparent: true
            });
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.position.copy(labelPos);
            const labelWidth = 15 * visualScale;
            const labelHeight = 4 * visualScale;
            sprite.scale.set(labelWidth, labelHeight, 1);
            sprite.userData = { isPort: true, portLabel: port.label };
            sprite.renderOrder = 1000;
            
            portGroup.add(sprite);
            
            // Label connection line (yellow)
            const lineGeometry = new THREE.BufferGeometry().setFromPoints([
                portPos,
                labelPos
            ]);
            const lineMaterial = new THREE.LineBasicMaterial({ 
                color: 0xffff00,
                linewidth: 1,
                depthTest: false
            });
            const line = new THREE.Line(lineGeometry, lineMaterial);
            line.userData = { isPort: true, portLabel: port.label };
            line.renderOrder = 999;
            
            portGroup.add(line);
        }
        
        // Add the entire port group as a child of the model
        // This makes all port visuals move with the model
        modelObject.add(portGroup);
        
        // Also track in portMarkers for visibility toggling
        sceneInstance.portMarkers.push(portGroup);
        
        // Log port creation with model linkage details
        const instanceInfo = port.instanceName || modelObject.userData.instanceName || modelObject.userData.name;
        const portWorldPos = port.worldPosition;
        sceneInstance.log(
            `🔗 Port "${port.label}" → ${instanceInfo} at (${portWorldPos.x.toFixed(1)}, ${portWorldPos.y.toFixed(1)}, ${portWorldPos.z.toFixed(1)})`,
            'info'
        );
        console.log(`✅ Port "${port.label}" created - Parent: ${instanceInfo}, Local pos:`, portPos, 'Sphere size:', sphereSize, 'Visual scale:', visualScale, 'Parent object:', modelObject);
    }

    /**
     * Toggle visibility of all port markers
     * @param {Object} sceneInstance - The 3D scene instance
     * @param {boolean} visible - Whether ports should be visible
     */
    togglePortsVisibility(sceneInstance, visible) {
        sceneInstance.portMarkers.forEach(marker => {
            marker.visible = visible;
        });
        sceneInstance.portsVisible = visible;
        sceneInstance.log(`🔄 Ports ${visible ? 'shown' : 'hidden'}`, 'info');
    }

    /**
     * Set port visual scale (affects sphere size)
     * @param {Object} sceneInstance - The 3D scene instance
     * @param {number} scale - Scale multiplier (1.0 = default, 2.0 = 2x size)
     */
    setPortVisualScale(sceneInstance, scale) {
        this.portVisualScale = scale;
        
        // Update all existing port markers
        sceneInstance.portMarkers.forEach(portGroup => {
            // Find the sphere mesh in the port group
            const sphere = portGroup.userData.sphereMesh;
            if (sphere && sphere.geometry) {
                const portData = portGroup.userData.portData;
                
                // Calculate parent model's scale
                const parent = portGroup.parent;
                if (parent) {
                    const avgScale = (parent.scale.x + parent.scale.y + parent.scale.z) / 3;
                    const visualScale = 1 / avgScale;
                    const newSize = (portData.size || 3) * visualScale * this.portVisualScale;
                    
                    // Replace geometry with new sized sphere
                    sphere.geometry.dispose();
                    sphere.geometry = new THREE.SphereGeometry(newSize, 16, 16);
                }
            }
        });
        
        sceneInstance.log(`🔄 Port display size updated (scale: ${scale.toFixed(1)}x)`, 'info');
    }

    /**
     * Get all ports with their current world positions (for wire routing)
     * Required by WireRouting3DIntegration
     * @returns {Array} Array of port objects with modelName, instanceId, label, worldPosition, etc.
     */
    getAllPortsWithWorldPositions() {
        const allPorts = [];
        
        // Access modelPorts through the scene instance
        // This is stored in viewer3D.modelPorts
        if (!window.viewer3D || !window.viewer3D.modelPorts) {
            console.warn('getAllPortsWithWorldPositions: viewer3D or modelPorts not found');
            return allPorts;
        }
        
        const modelPorts = window.viewer3D.modelPorts;
        const scene = window.viewer3D.scene;
        
        // Iterate through all stored port collections
        // These are keyed by either modelName or instanceName (e.g., "PCB Board_obj_0")
        modelPorts.forEach((ports, key) => {
            // For each port in this collection
            ports.forEach((port, portIndex) => {
                // Find the actual port sphere mesh in the scene to get accurate world position
                let worldPosition = null;
                
                // Search for the port sphere by portId in the scene's portMarkers
                if (window.viewer3D.portMarkers && port.portId) {
                    const portMarker = window.viewer3D.portMarkers.find(marker => 
                        marker.userData.portId === port.portId
                    );
                    
                    if (portMarker && portMarker.userData.sphereMesh) {
                        // Get world position from the actual sphere mesh
                        const sphereWorldPos = new THREE.Vector3();
                        portMarker.userData.sphereMesh.getWorldPosition(sphereWorldPos);
                        worldPosition = {
                            x: sphereWorldPos.x,
                            y: sphereWorldPos.y,
                            z: sphereWorldPos.z
                        };
                    }
                }
                
                // If we found the sphere's world position, use it
                if (worldPosition) {
                    allPorts.push({
                        modelName: port.modelName || key,
                        instanceId: port.instanceId,
                        instanceName: port.instanceName || key,
                        label: port.label,
                        type: port.type || 'input',
                        size: port.size || 8,
                        localPosition: port.localPosition,
                        worldPosition: worldPosition, // Use actual sphere world position
                        portIndex: portIndex,
                        portId: port.portId
                    });
                } else {
                    // Legacy port format - need to find model object and calculate world position
                    scene.traverse((obj) => {
                        const objModelName = obj.userData.modelData?.name || obj.userData.name;
                        const objInstanceName = obj.userData.instanceName;
                        
                        // Match by key (could be modelName or instanceName)
                        if (objModelName === key || objInstanceName === key) {
                            const instanceId = obj.userData.instanceId || obj.uuid;
                            
                            // Convert local port position to world position
                            const localPos = new THREE.Vector3(
                                port.localPosition.x,
                                port.localPosition.y,
                                port.localPosition.z
                            );
                            const worldPos = obj.localToWorld(localPos.clone());
                            
                            allPorts.push({
                                modelName: objModelName,
                                instanceId: instanceId,
                                instanceName: objInstanceName || objModelName,
                                label: port.label,
                                type: port.type || 'input',
                                size: port.size || 8,
                                localPosition: port.localPosition,
                                worldPosition: {
                                    x: worldPos.x,
                                    y: worldPos.y,
                                    z: worldPos.z
                                },
                                portIndex: portIndex,
                                modelObject: obj
                            });
                        }
                    });
                }
            });
        });
        
        return allPorts;
    }
}
