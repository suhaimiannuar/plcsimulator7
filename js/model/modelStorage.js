// modelStorage.js - 3D Layout Save/Load Functionality

class ModelStorageManager {
    save3DLayout(sceneInstance) {
        console.log('save3DLayout called, sceneObjects:', sceneInstance.sceneObjects.length);
        
        if (sceneInstance.sceneObjects.length === 0) {
            alert('No objects in scene to save!');
            console.log('No objects to save');
            return;
        }
        
        console.log('Creating layout JSON...');
        const layout = {
            version: '1.1',
            timestamp: new Date().toISOString(),
            mountingConfig: sceneInstance.mountingConfig,
            objects: [],
            wires: []
        };
        
        // Save each object's position, rotation, and model info
        sceneInstance.sceneObjects.forEach(obj => {
            const modelName = obj.userData.name || obj.userData.modelName || 'Unnamed';
            
            const objData = {
                name: modelName,
                modelName: obj.userData.modelName,
                format: obj.userData.format,
                position: {
                    x: obj.position.x,
                    y: obj.position.y,
                    z: obj.position.z
                },
                rotation: {
                    x: obj.rotation.x,
                    y: obj.rotation.y,
                    z: obj.rotation.z
                },
                scale: {
                    x: obj.scale.x,
                    y: obj.scale.y,
                    z: obj.scale.z
                },
                ports: []  // Initialize empty ports array
            };
            
            // Save port configuration if exists - try multiple possible keys
            const portKeys = [modelName, obj.userData.name, obj.userData.modelName];
            for (const key of portKeys) {
                if (key && sceneInstance.modelPorts.has(key)) {
                    objData.ports = sceneInstance.modelPorts.get(key);
                    console.log(`Found ports for ${key}:`, objData.ports.length);
                    break;
                }
            }
            
            console.log(`Saving object: ${modelName}, ports: ${objData.ports.length}`);
            layout.objects.push(objData);
        });
        
        // Save wires from wiring3DManager
        if (sceneInstance.wiring3DManager && sceneInstance.wiring3DManager.wires) {
            console.log('Saving wires:', sceneInstance.wiring3DManager.wires.length);
            
            sceneInstance.wiring3DManager.wires.forEach(wire => {
                const wireData = {
                    id: wire.id,
                    wireType: wire.wireType,
                    wireGauge: wire.wireGauge || 5,
                    isHanging: wire.isHanging || false,
                    waypoints: wire.waypoints.map(wp => ({
                        x: wp.x,
                        y: wp.y,
                        z: wp.z
                    }))
                };
                
                // Save start port reference
                if (wire.startPort) {
                    wireData.startPort = {
                        portId: wire.startPort.portId,
                        label: wire.startPort.label,
                        worldPosition: {
                            x: wire.startPort.worldPosition.x,
                            y: wire.startPort.worldPosition.y,
                            z: wire.startPort.worldPosition.z
                        }
                    };
                }
                
                // Save end port reference (if not hanging)
                if (wire.endPort) {
                    wireData.endPort = {
                        portId: wire.endPort.portId,
                        label: wire.endPort.label,
                        worldPosition: {
                            x: wire.endPort.worldPosition.x,
                            y: wire.endPort.worldPosition.y,
                            z: wire.endPort.worldPosition.z
                        }
                    };
                }
                
                // Save hanging marker position if exists
                if (wire.isHanging && wire.hangingMarker) {
                    wireData.hangingMarkerPosition = {
                        x: wire.hangingMarker.position.x,
                        y: wire.hangingMarker.position.y,
                        z: wire.hangingMarker.position.z
                    };
                }
                
                layout.wires.push(wireData);
            });
        } else {
            console.log('No wiring3DManager or no wires to save');
        }
        
        // Create download link
        const json = JSON.stringify(layout, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `3d-layout-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        sceneInstance.log(`Layout saved: ${layout.objects.length} objects, ${layout.wires.length} wires`, 'success');
    }
    
    load3DLayout(sceneInstance) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const text = await file.text();
                const layout = JSON.parse(text);
                
                console.log('Loaded layout:', layout);
                console.log('Layout has objects:', layout.objects);
                console.log('Layout has wires:', layout.wires);
                
                if (!layout.version || !layout.objects) {
                    throw new Error('Invalid layout file format');
                }
                
                // Verify required managers exist
                if (!sceneInstance.modelPorts) {
                    console.warn('modelPorts Map not initialized, creating it');
                    sceneInstance.modelPorts = new Map();
                }
                
                // Clear current scene
                sceneInstance.clearScene();
                
                // Restore mounting configuration
                if (layout.mountingConfig) {
                    sceneInstance.mountingConfig = layout.mountingConfig;
                    sceneInstance.createMounting();
                }
                
                sceneInstance.log(`Loading layout: ${layout.objects.length} objects...`, 'info');
                
                // Load each object
                for (const objData of layout.objects) {
                    try {
                        // Find model in catalog
                        const catalogResponse = await fetch('libs/model/catalog.json');
                        const catalog = await catalogResponse.json();
                        const model = catalog.models.find(m => m.name === objData.modelName);
                        
                        if (!model) {
                            sceneInstance.log(`Model not found in catalog: ${objData.modelName}`, 'warning');
                            continue;
                        }
                        
                        // Load the model
                        let loadedObject;
                        if (objData.format === 'stl') {
                            loadedObject = await sceneInstance.loadSTL(model.file, objData.modelName, model);
                        } else if (objData.format === 'obj') {
                            loadedObject = await sceneInstance.loadOBJ(model.file, model.mtlFile, objData.modelName, model);
                        }
                        
                        if (loadedObject) {
                            // Restore position, rotation, scale
                            loadedObject.position.set(
                                objData.position.x,
                                objData.position.y,
                                objData.position.z
                            );
                            loadedObject.rotation.set(
                                objData.rotation.x,
                                objData.rotation.y,
                                objData.rotation.z
                            );
                            loadedObject.scale.set(
                                objData.scale.x,
                                objData.scale.y,
                                objData.scale.z
                            );
                            
                            // Restore ports if exists
                            if (objData.ports && Array.isArray(objData.ports) && objData.ports.length > 0) {
                                console.log(`Restoring ${objData.ports.length} ports for ${objData.name}`);
                                sceneInstance.modelPorts.set(objData.name, objData.ports);
                                
                                // Recreate port markers for each port
                                if (sceneInstance.modelPortsManager) {
                                    objData.ports.forEach(portData => {
                                        sceneInstance.modelPortsManager.createPortMarker(
                                            sceneInstance, 
                                            loadedObject, 
                                            portData
                                        );
                                    });
                                } else {
                                    console.error('modelPortsManager not available');
                                }
                            } else {
                                console.log(`No ports to restore for ${objData.name}`);
                            }
                            
                            sceneInstance.log(`Loaded: ${objData.name} with ${objData.ports?.length || 0} ports`, 'success');
                        }
                    } catch (err) {
                        console.error('Error loading object:', err);
                        console.error('Stack trace:', err.stack);
                        sceneInstance.log(`Failed to load ${objData.modelName}: ${err.message}`, 'error');
                    }
                }
                
                // Restore wires if present
                if (layout.wires && layout.wires.length > 0 && sceneInstance.wiring3DManager) {
                    sceneInstance.log(`Restoring ${layout.wires.length} wires...`, 'info');
                    console.log('Available ports:', sceneInstance.modelPorts);
                    
                    // Small delay to ensure all ports are created and positioned
                    setTimeout(() => {
                        if (!sceneInstance.modelPorts || sceneInstance.modelPorts.size === 0) {
                            console.warn('No ports available to restore wires');
                            sceneInstance.log('⚠️ No ports found - wires cannot be restored', 'warning');
                            return;
                        }
                        
                        layout.wires.forEach(wireData => {
                            try {
                                // Find ports by matching portId
                                let startPort = null;
                                let endPort = null;
                                
                                console.log(`Looking for ports: ${wireData.startPort?.portId} → ${wireData.endPort?.portId}`);
                                
                                // Search all model ports for matching portIds
                                sceneInstance.modelPorts.forEach((ports, modelName) => {
                                    if (!ports || !Array.isArray(ports)) {
                                        console.warn(`Invalid ports for model ${modelName}:`, ports);
                                        return;
                                    }
                                    
                                    ports.forEach(port => {
                                        if (wireData.startPort && port.portId === wireData.startPort.portId) {
                                            startPort = port;
                                            console.log(`Found start port: ${port.portId}`);
                                        }
                                        if (wireData.endPort && port.portId === wireData.endPort.portId) {
                                            endPort = port;
                                            console.log(`Found end port: ${port.portId}`);
                                        }
                                    });
                                });
                                
                                if (!startPort) {
                                    console.warn(`Could not find start port: ${wireData.startPort?.label}`);
                                    return;
                                }
                                
                                // Recreate the wire with saved waypoints
                                const wire = {
                                    id: wireData.id,
                                    startPort: startPort,
                                    endPort: endPort,  // null if hanging
                                    waypoints: wireData.waypoints.map(wp => 
                                        new THREE.Vector3(wp.x, wp.y, wp.z)
                                    ),
                                    wireType: wireData.wireType,
                                    wireGauge: wireData.wireGauge || 5,
                                    isHanging: wireData.isHanging || false
                                };
                                
                                // Create the wire mesh
                                sceneInstance.wiring3DManager.createWireLine(sceneInstance, wire);
                                
                                // If hanging, create the blue marker
                                if (wire.isHanging && wireData.hangingMarkerPosition) {
                                    const markerPos = new THREE.Vector3(
                                        wireData.hangingMarkerPosition.x,
                                        wireData.hangingMarkerPosition.y,
                                        wireData.hangingMarkerPosition.z
                                    );
                                    sceneInstance.wiring3DManager.createHangingEndMarker(
                                        sceneInstance, 
                                        wire, 
                                        markerPos
                                    );
                                }
                                
                                // Add to wires array
                                sceneInstance.wiring3DManager.wires.push(wire);
                                
                                console.log(`✅ Restored wire: ${wireData.id} (${wireData.wireType}, gauge ${wireData.wireGauge})`);
                                
                            } catch (err) {
                                console.error(`Failed to restore wire ${wireData.id}:`, err);
                                sceneInstance.log(`Could not restore wire: ${wireData.id}`, 'warning');
                            }
                        });
                        
                        // Update wire ID counter to avoid conflicts with loaded wire IDs
                        if (sceneInstance.wiring3DManager.wires.length > 0) {
                            const maxId = Math.max(...sceneInstance.wiring3DManager.wires.map(w => {
                                const match = w.id.match(/wire-(\d+)/);
                                return match ? parseInt(match[1]) : 0;
                            }));
                            sceneInstance.wiring3DManager.wireIdCounter = maxId + 1;
                            console.log(`Wire ID counter updated to: ${sceneInstance.wiring3DManager.wireIdCounter}`);
                        }
                        
                        sceneInstance.log(`✅ Restored ${layout.wires.length} wires`, 'success');
                    }, 1000);  // Increased delay to ensure ports are ready
                }
                
                sceneInstance.log('Layout loaded successfully!', 'success');
                
            } catch (error) {
                console.error('Full error loading layout:', error);
                console.error('Error stack:', error.stack);
                console.error('Error at line:', error.lineNumber || error.line);
                sceneInstance.log(`Error loading layout: ${error.message}`, 'error');
                alert(`Error loading layout: ${error.message}\n\nCheck console for details.`);
            }
        };
        
        input.click();
    }
}
