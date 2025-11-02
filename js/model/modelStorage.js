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
            const objData = {
                name: obj.userData.name || 'Unnamed',
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
                }
            };
            
            // Save port configuration if exists
            if (sceneInstance.modelPorts.has(obj.userData.name)) {
                objData.ports = sceneInstance.modelPorts.get(obj.userData.name);
            }
            
            layout.objects.push(objData);
        });
        
        // Save wires
        sceneInstance.wires.forEach(wire => {
            layout.wires.push({
                id: wire.id,
                portA: {
                    label: wire.portA.label,
                    localPosition: wire.portA.localPosition,
                    worldPosition: wire.portA.worldPosition
                },
                portB: {
                    label: wire.portB.label,
                    localPosition: wire.portB.localPosition,
                    worldPosition: wire.portB.worldPosition
                },
                wireType: wire.wireType,
                wireGauge: wire.wireGauge
            });
        });
        
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
                
                if (!layout.version || !layout.objects) {
                    throw new Error('Invalid layout file format');
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
                            if (objData.ports) {
                                sceneInstance.modelPorts.set(objData.name, objData.ports);
                            }
                            
                            sceneInstance.log(`Loaded: ${objData.name}`, 'success');
                        }
                    } catch (err) {
                        sceneInstance.log(`Failed to load ${objData.modelName}: ${err.message}`, 'error');
                    }
                }
                
                // Restore wires if present
                if (layout.wires && layout.wires.length > 0) {
                    sceneInstance.log(`Restoring ${layout.wires.length} wires...`, 'info');
                    
                    // Small delay to ensure all ports are created
                    setTimeout(() => {
                        layout.wires.forEach(wireData => {
                            // Find ports by matching label and position
                            let portA = null;
                            let portB = null;
                            
                            sceneInstance.modelPorts.forEach((ports, modelName) => {
                                ports.forEach(port => {
                                    if (port.label === wireData.portA.label) {
                                        portA = port;
                                    }
                                    if (port.label === wireData.portB.label) {
                                        portB = port;
                                    }
                                });
                            });
                            
                            if (portA && portB) {
                                sceneInstance.createWire(portA, portB, wireData.wireType, wireData.wireGauge);
                            } else {
                                sceneInstance.log(`Could not restore wire: ${wireData.portA.label} → ${wireData.portB.label}`, 'warning');
                            }
                        });
                    }, 500);
                }
                
                sceneInstance.log('Layout loaded successfully!', 'success');
                
            } catch (error) {
                sceneInstance.log(`Error loading layout: ${error.message}`, 'error');
                alert(`Error loading layout: ${error.message}`);
            }
        };
        
        input.click();
    }
}
