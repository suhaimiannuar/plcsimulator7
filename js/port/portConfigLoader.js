// Port Config Viewer - Model Loader
// Handles loading STL and OBJ models

class PortConfigLoader {
    constructor(sceneManager, onProgress, onError) {
        this.sceneManager = sceneManager;
        this.onProgress = onProgress || (() => {});
        this.onError = onError || ((error) => console.error(error));
    }

    async loadModel(modelData) {
        console.log('Loading model:', modelData);
        
        this.onProgress(`Loading ${modelData.name}...`, 'info');
        
        try {
            let loadedModel = null;
            
            // Construct proper file paths
            let filePath = modelData.file;
            let mtlPath = modelData.mtlFile;
            
            // If file doesn't start with http, prepend libs/model/
            if (!filePath.startsWith('http')) {
                filePath = `libs/model/${filePath}`;
            }
            if (mtlPath && !mtlPath.startsWith('http')) {
                mtlPath = `libs/model/${mtlPath}`;
            }
            
            console.log('File path:', filePath);
            console.log('MTL path:', mtlPath);
            
            if (modelData.format === 'stl') {
                loadedModel = await this.loadSTL(filePath);
            } else if (modelData.format === 'obj') {
                loadedModel = await this.loadOBJ(filePath, mtlPath);
            }
            
            if (loadedModel) {
                console.log('Model loaded successfully:', loadedModel);
                return loadedModel;
            } else {
                console.error('Model loaded but is null/undefined');
                throw new Error('Failed to load model');
            }
            
        } catch (error) {
            console.error('Error loading model:', error);
            this.onError(`Failed to load model: ${error.message}`, 'error');
            throw error;
        }
    }

    async loadSTL(filePath) {
        const loader = new THREE.STLLoader();
        const geometry = await new Promise((resolve, reject) => {
            loader.load(
                filePath, 
                resolve, 
                (progress) => {
                    const percent = (progress.loaded / progress.total * 100).toFixed(0);
                    this.onProgress(`Loading... ${percent}%`, 'info');
                },
                reject
            );
        });
        
        // Ensure geometry has proper normals and is indexed for face detection
        geometry.computeVertexNormals();
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
        
        console.log('STL geometry loaded:', {
            vertices: geometry.attributes.position.count,
            hasNormals: !!geometry.attributes.normal,
            isBufferGeometry: geometry.isBufferGeometry
        });
        
        const material = new THREE.MeshPhongMaterial({
            color: 0x3498db,
            specular: 0x111111,
            shininess: 200
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = 'STL_Model';
        
        return mesh;
    }

    async loadOBJ(filePath, mtlPath) {
        // Load MTL first
        const mtlLoader = new THREE.MTLLoader();
        const materialPath = mtlPath || filePath.replace('.obj', '.mtl');
        
        const materials = await new Promise((resolve, reject) => {
            mtlLoader.load(
                materialPath,
                resolve,
                undefined,
                (error) => {
                    console.warn('MTL loading failed, using default material:', error);
                    resolve(null); // Continue with default material
                }
            );
        });
        
        if (materials) {
            materials.preload();
        }
        
        // Load OBJ
        const objLoader = new THREE.OBJLoader();
        if (materials) {
            objLoader.setMaterials(materials);
        }
        
        const loadedObj = await new Promise((resolve, reject) => {
            objLoader.load(
                filePath,
                resolve,
                (progress) => {
                    if (progress.total > 0) {
                        const percent = (progress.loaded / progress.total * 100).toFixed(0);
                        this.onProgress(`Loading... ${percent}%`, 'info');
                    }
                },
                reject
            );
        });
        
        // Calculate bounding box to detect scale
        const bbox = new THREE.Box3().setFromObject(loadedObj);
        const size = new THREE.Vector3();
        bbox.getSize(size);
        
        const maxDimension = Math.max(size.x, size.y, size.z);
        console.log('OBJ dimensions:', size);
        console.log('Max dimension:', maxDimension);
        
        // If the model is very small (< 1 unit), it's likely in meters - scale to mm
        let scaleFactor = 1;
        if (maxDimension < 1) {
            scaleFactor = 1000;
            console.log('Model appears to be in meters, scaling by 1000x to millimeters');
            this.onProgress('Model scaled 1000x (meters → millimeters)', 'info');
        } else if (maxDimension < 10) {
            scaleFactor = 100;
            console.log('Model appears to be in centimeters, scaling by 100x to millimeters');
            this.onProgress('Model scaled 100x (centimeters → millimeters)', 'info');
        } else {
            console.log('Model dimensions look reasonable, no scaling applied');
        }
        
        if (scaleFactor !== 1) {
            loadedObj.scale.set(scaleFactor, scaleFactor, scaleFactor);
            loadedObj.updateMatrix();
            loadedObj.updateMatrixWorld(true);
        }
        
        loadedObj.name = 'OBJ_Model';
        
        return loadedObj;
    }
}
