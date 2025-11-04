// modelPorts.js - Port System (Port editing, markers, configuration)

class ModelPortsManager {
    constructor() {
        this.modelPorts = new Map(); // Store ports per model
        this.portMarkers = [];
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
            // Convert catalog port format to internal format
            const port = {
                label: catalogPort.label,
                type: 'input', // Default type
                worldPosition: catalogPort.worldPosition,
                localPosition: catalogPort.localPosition,
                normal: catalogPort.normal,
                size: 8 // Default size
            };
            
            // Add to model's port list
            sceneInstance.modelPorts.get(modelName).push(port);
            
            // Create visual marker
            this.createCatalogPortMarker(sceneInstance, modelObject, port);
        });
        
        sceneInstance.log(`✅ ${modelData.ports.length} port(s) loaded from catalog for ${modelName}`, 'success');
        this.updatePortsList(sceneInstance);
    }

    /**
     * Create visual marker for a catalog port
     * @param {Object} sceneInstance - The 3D scene instance
     * @param {THREE.Object3D} modelObject - The parent model object
     * @param {Object} port - Port data with worldPosition, normal, label
     */
    createCatalogPortMarker(sceneInstance, modelObject, port) {
        // Convert port position to Vector3
        const portPos = new THREE.Vector3(
            port.worldPosition.x,
            port.worldPosition.y,
            port.worldPosition.z
        );
        
        // Adjust position relative to model's current position
        const adjustedPos = portPos.clone().add(modelObject.position);
        
        // 1. Port sphere (small red dot)
        const sphereGeometry = new THREE.SphereGeometry(port.size || 3, 16, 16);
        const sphereMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000,
            transparent: true,
            opacity: 0.9,
            depthTest: true
        });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.position.copy(adjustedPos);
        sphere.userData = { 
            isPort: true, 
            portLabel: port.label,
            modelName: modelObject.userData.modelName || modelObject.userData.name,
            portData: port
        };
        
        sceneInstance.scene.add(sphere);
        sceneInstance.portMarkers.push(sphere);
        
        // 2. Direction arrow (cyan) - if port has normal
        if (port.normal) {
            const normalVector = new THREE.Vector3(
                port.normal.x, 
                port.normal.y, 
                port.normal.z
            );
            const arrowStart = adjustedPos.clone();
            const arrowEnd = adjustedPos.clone().add(normalVector.multiplyScalar(15));
            
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
            
            sceneInstance.scene.add(arrowLine);
            sceneInstance.portMarkers.push(arrowLine);
            
            // Arrow cone head
            const coneGeometry = new THREE.ConeGeometry(2, 6, 8);
            const coneMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });
            const cone = new THREE.Mesh(coneGeometry, coneMaterial);
            cone.position.copy(arrowEnd);
            
            // Orient cone to point along normal
            cone.quaternion.setFromUnitVectors(
                new THREE.Vector3(0, 1, 0),
                normalVector.clone().normalize()
            );
            cone.userData = { isPort: true, portLabel: port.label };
            
            sceneInstance.scene.add(cone);
            sceneInstance.portMarkers.push(cone);
        }
        
        // 3. Label (text sprite)
        if (port.label) {
            const labelOffset = new THREE.Vector3(0, 20, 0);
            const labelPos = adjustedPos.clone().add(labelOffset);
            
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
            sprite.scale.set(15, 4, 1);
            sprite.userData = { isPort: true, portLabel: port.label };
            sprite.renderOrder = 1000;
            
            sceneInstance.scene.add(sprite);
            sceneInstance.portMarkers.push(sprite);
            
            // Label connection line (yellow)
            const lineGeometry = new THREE.BufferGeometry().setFromPoints([
                adjustedPos,
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
            
            sceneInstance.scene.add(line);
            sceneInstance.portMarkers.push(line);
        }
    }
}
