// modelLoader.js - Model Loading (STL, OBJ, Custom uploads, Catalog)

class ModelLoaderManager {
    constructor() {
        this.customModels = {};
    }
    
    async loadSTL(sceneInstance, file, name, modelData) {
        try {
            sceneInstance.log(`🔄 Loading ${name}...`, 'info');
            
            const loader = new THREE.STLLoader();
            const geometry = await new Promise((resolve, reject) => {
                loader.load(file, resolve, undefined, reject);
            });
            
            geometry.computeVertexNormals();
            geometry.center();
            
            const material = new THREE.MeshPhongMaterial({
                color: 0x00aaff,
                specular: 0x111111,
                shininess: 200
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.userData.name = name;
            mesh.userData.modelName = name;
            mesh.userData.format = 'stl';
            mesh.userData.modelData = modelData;
            
            // Calculate mesh size
            geometry.computeBoundingBox();
            const bbox = geometry.boundingBox;
            const size = new THREE.Vector3();
            bbox.getSize(size);
            
            // Position on floor with slight random X/Z offset to prevent stacking
            const randomOffset = (Math.random() - 0.5) * 100;
            mesh.position.set(randomOffset, size.y / 2 + 2, randomOffset);
            
            sceneInstance.scene.add(mesh);
            sceneInstance.sceneObjects.push(mesh);
            
            // Add physics body
            sceneInstance.addPhysicsBody(mesh, geometry);
            
            // Load ports from catalog if available
            if (modelData && modelData.ports && modelData.ports.length > 0) {
                sceneInstance.portsManager.loadPortsFromCatalog(sceneInstance, mesh, modelData);
            }
            
            sceneInstance.log(`✅ ${name} loaded and placed on floor!`, 'success');
            sceneInstance.updateSceneObjectsList();
            
            return mesh;
            
        } catch (error) {
            sceneInstance.log(`❌ Failed to load ${name}: ${error.message}`, 'error');
            return null;
        }
    }
    
    async loadOBJ(sceneInstance, objFile, mtlFile, name, modelData) {
        try {
            sceneInstance.log(`🔄 Loading ${name} (OBJ+MTL with materials)...`, 'info');
            
            // Extract directory path from objFile for MTL texture loading
            const objPath = objFile.substring(0, objFile.lastIndexOf('/') + 1);
            
            // Load MTL file first
            const mtlLoader = new THREE.MTLLoader();
            mtlLoader.setPath(objPath);
            
            const materials = await new Promise((resolve, reject) => {
                mtlLoader.load(
                    mtlFile.split('/').pop(), // Just filename for MTL
                    resolve,
                    undefined,
                    reject
                );
            });
            
            materials.preload();
            sceneInstance.log(`✅ Materials loaded for ${name}`, 'info');
            
            // Load OBJ file with materials
            const objLoader = new THREE.OBJLoader();
            objLoader.setMaterials(materials);
            
            const object = await new Promise((resolve, reject) => {
                objLoader.load(objFile, resolve, undefined, reject);
            });
            
            // Process the loaded object
            object.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    // Ensure material has emissive property for selection
                    if (child.material && !child.material.emissive) {
                        child.material.emissive = new THREE.Color(0x000000);
                    }
                }
            });
            
            object.userData.name = name;
            object.userData.modelName = name;
            object.userData.format = 'obj';
            object.userData.modelData = modelData;
            
            // SCALE UP: OBJ files are often in meters, we need millimeters
            object.scale.set(1000, 1000, 1000);
            
            // Calculate bounding box AFTER scaling
            const bbox = new THREE.Box3().setFromObject(object);
            const size = new THREE.Vector3();
            bbox.getSize(size);
            
            sceneInstance.log(`📏 Object size after scaling: ${size.x.toFixed(1)}×${size.y.toFixed(1)}×${size.z.toFixed(1)}mm`, 'info');
            
            // Center the object horizontally, but keep bottom at Y=0
            const center = new THREE.Vector3();
            bbox.getCenter(center);
            
            // Only center X and Z, adjust Y to put bottom at origin
            object.position.set(-center.x, -bbox.min.y, -center.z);
            
            // Position on floor with random offset
            const randomOffset = (Math.random() - 0.5) * 100;
            object.position.add(new THREE.Vector3(randomOffset, 2, randomOffset));
            
            sceneInstance.scene.add(object);
            sceneInstance.sceneObjects.push(object);
            
            // Add physics body using bounding box
            sceneInstance.addPhysicsBodyFromBBox(object, size);
            
            // Load ports from catalog if available
            if (modelData && modelData.ports && modelData.ports.length > 0) {
                sceneInstance.portsManager.loadPortsFromCatalog(sceneInstance, object, modelData);
            }
            
            sceneInstance.log(`✅ ${name} loaded! Size: ${size.x.toFixed(1)}×${size.y.toFixed(1)}×${size.z.toFixed(1)}mm`, 'success');
            sceneInstance.log(`📍 Position: (${object.position.x.toFixed(1)}, ${object.position.y.toFixed(1)}, ${object.position.z.toFixed(1)})`, 'info');
            sceneInstance.updateSceneObjectsList();
            
            // Select the object so user can see it
            sceneInstance.selectObject(object);
            
            return object;
            
        } catch (error) {
            sceneInstance.log(`❌ Failed to load ${name}: ${error.message}`, 'error');
            console.error('OBJ/MTL loading error:', error);
            return null;
        }
    }
    
    uploadSTLFile(sceneInstance) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.stl';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                sceneInstance.log(`Uploading ${file.name}...`, 'info');
                
                // Read file as ArrayBuffer
                const arrayBuffer = await file.arrayBuffer();
                const base64 = this.arrayBufferToBase64(arrayBuffer);
                
                // Save to localStorage
                const customModels = this.getCustomModels();
                const modelId = Date.now().toString();
                customModels[modelId] = {
                    id: modelId,
                    name: file.name.replace('.stl', ''),
                    format: 'stl',
                    data: base64,
                    size: file.size,
                    uploadDate: new Date().toISOString()
                };
                
                localStorage.setItem('customModels', JSON.stringify(customModels));
                sceneInstance.log(`✅ ${file.name} saved to storage`, 'success');
                this.refreshCustomModelsList(sceneInstance);
                
            } catch (error) {
                sceneInstance.log(`❌ Upload failed: ${error.message}`, 'error');
            }
        };
        
        input.click();
    }
    
    uploadOBJFile(sceneInstance) {
        const objInput = document.createElement('input');
        objInput.type = 'file';
        objInput.accept = '.obj';
        
        objInput.onchange = async (e) => {
            const objFile = e.target.files[0];
            if (!objFile) return;
            
            // Now ask for MTL file
            const mtlInput = document.createElement('input');
            mtlInput.type = 'file';
            mtlInput.accept = '.mtl';
            
            mtlInput.onchange = async (e2) => {
                const mtlFile = e2.target.files[0];
                if (!mtlFile) {
                    sceneInstance.log('MTL file required for OBJ models', 'warning');
                    return;
                }
                
                try {
                    sceneInstance.log(`Uploading ${objFile.name} + ${mtlFile.name}...`, 'info');
                    
                    // Read both files
                    const objArrayBuffer = await objFile.arrayBuffer();
                    const mtlArrayBuffer = await mtlFile.arrayBuffer();
                    const objBase64 = this.arrayBufferToBase64(objArrayBuffer);
                    const mtlBase64 = this.arrayBufferToBase64(mtlArrayBuffer);
                    
                    // Save to localStorage
                    const customModels = this.getCustomModels();
                    const modelId = Date.now().toString();
                    customModels[modelId] = {
                        id: modelId,
                        name: objFile.name.replace('.obj', ''),
                        format: 'obj',
                        objData: objBase64,
                        mtlData: mtlBase64,
                        size: objFile.size + mtlFile.size,
                        uploadDate: new Date().toISOString()
                    };
                    
                    localStorage.setItem('customModels', JSON.stringify(customModels));
                    sceneInstance.log(`✅ ${objFile.name} + ${mtlFile.name} saved to storage`, 'success');
                    this.refreshCustomModelsList(sceneInstance);
                    
                } catch (error) {
                    sceneInstance.log(`❌ Upload failed: ${error.message}`, 'error');
                }
            };
            
            mtlInput.click();
        };
        
        objInput.click();
    }
    
    arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }
    
    base64ToArrayBuffer(base64) {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }
    
    getCustomModels() {
        const stored = localStorage.getItem('customModels');
        return stored ? JSON.parse(stored) : {};
    }
    
    async loadCustomModel(sceneInstance, modelId) {
        const customModels = this.getCustomModels();
        const model = customModels[modelId];
        
        if (!model) {
            sceneInstance.log('Model not found in storage', 'error');
            return;
        }
        
        try {
            if (model.format === 'stl') {
                const arrayBuffer = this.base64ToArrayBuffer(model.data);
                const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
                const url = URL.createObjectURL(blob);
                await this.loadSTL(sceneInstance, url, model.name, model);
                URL.revokeObjectURL(url);
            } else if (model.format === 'obj') {
                const objArrayBuffer = this.base64ToArrayBuffer(model.objData);
                const mtlArrayBuffer = this.base64ToArrayBuffer(model.mtlData);
                const objBlob = new Blob([objArrayBuffer], { type: 'text/plain' });
                const mtlBlob = new Blob([mtlArrayBuffer], { type: 'text/plain' });
                const objUrl = URL.createObjectURL(objBlob);
                const mtlUrl = URL.createObjectURL(mtlBlob);
                await this.loadOBJ(sceneInstance, objUrl, mtlUrl, model.name, model);
                URL.revokeObjectURL(objUrl);
                URL.revokeObjectURL(mtlUrl);
            }
        } catch (error) {
            sceneInstance.log(`Failed to load custom model: ${error.message}`, 'error');
        }
    }
    
    deleteCustomModel(sceneInstance, modelId) {
        const customModels = this.getCustomModels();
        delete customModels[modelId];
        localStorage.setItem('customModels', JSON.stringify(customModels));
        sceneInstance.log('Model deleted from storage', 'info');
        this.refreshCustomModelsList(sceneInstance);
    }
    
    refreshCustomModelsList(sceneInstance) {
        const customModels = this.getCustomModels();
        const customList = document.getElementById('custom-model-list');
        const customSection = document.getElementById('custom-models-section');
        
        if (!customList) return;
        
        customList.innerHTML = '';
        const modelIds = Object.keys(customModels);
        
        if (modelIds.length === 0) {
            customSection.style.display = 'none';
            return;
        }
        
        customSection.style.display = 'block';
        
        modelIds.forEach(id => {
            const model = customModels[id];
            const div = document.createElement('div');
            div.style.cssText = 'display: flex; gap: 5px; margin-bottom: 5px;';
            
            const loadBtn = document.createElement('button');
            loadBtn.className = 'btn btn-secondary btn-small';
            loadBtn.style.flex = '1';
            loadBtn.textContent = model.format === 'stl' ? `📦 ${model.name}` : `🎨 ${model.name}`;
            loadBtn.onclick = () => this.loadCustomModel(sceneInstance, id);
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-danger btn-small';
            deleteBtn.textContent = '🗑️';
            deleteBtn.onclick = () => {
                if (confirm(`Delete ${model.name}?`)) {
                    this.deleteCustomModel(sceneInstance, id);
                }
            };
            
            div.appendChild(loadBtn);
            div.appendChild(deleteBtn);
            customList.appendChild(div);
        });
    }
}

// STL Model Catalog class
class STLModelCatalog {
    constructor() {
        this.models = [];
        this.modelsLoaded = false;
    }
    
    async loadCatalog() {
        if (this.modelsLoaded) return this.models;
        
        try {
            const response = await fetch('libs/model/catalog.json');
            if (response.ok) {
                const data = await response.json();
                this.models = data.models || [];
            } else {
                this.models = this.getFallbackModels();
            }
            this.modelsLoaded = true;
            return this.models;
        } catch (error) {
            this.models = this.getFallbackModels();
            this.modelsLoaded = true;
            return this.models;
        }
    }
    
    getFallbackModels() {
        return [
            { name: 'Motor Controller', file: 'motor-controller.stl', format: 'stl', size: '23MB', type: 'motor' },
            { name: 'PLC', file: 'plc.stl', format: 'stl', size: '26MB', type: 'cpu' },
            { name: 'Circuit Breaker', file: 'circuit-breaker.stl', format: 'stl', size: '43MB', type: 'circuit-breaker' },
            { name: 'Emergency Push Button', file: 'emergency-push-button.stl', format: 'stl', size: '12MB', type: 'button' },
            { name: 'PCB Mount Relay', file: 'pcb-mount-relay.stl', format: 'stl', size: '0.8MB', type: 'relay' },
            { name: 'Stack LED Light', file: 'stack-led-light.stl', format: 'stl', size: '14MB', type: 'led' },
            { name: 'PCB Board', file: 'pcb.obj', mtlFile: 'pcb.mtl', format: 'obj', size: '1MB', type: 'pcb' }
        ];
    }
    
    getAllModels() {
        return this.models;
    }
}
