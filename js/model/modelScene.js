// modelScene.js - 3D Scene Management (Camera, Renderer, Lighting, Controls, Animation)

class ModelSceneManager {
    constructor(sceneInstance) {
        this.scene = sceneInstance;
    }
    
    setupScene(container, statusDiv) {
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf0f0f0); // Light white/gray background
        
        // Create both cameras
        const aspect = container.clientWidth / container.clientHeight;
        
        // Perspective camera for 3D mode
        const perspectiveCamera = new THREE.PerspectiveCamera(75, aspect, 0.1, 10000);
        perspectiveCamera.position.set(400, 300, 400);
        
        // Orthographic camera for perfect 2D mode (no perspective distortion)
        const viewSize = 500;
        const orthographicCamera = new THREE.OrthographicCamera(
            -viewSize * aspect, viewSize * aspect,  // left, right
            viewSize, -viewSize,                     // top, bottom
            0.1, 10000                              // near, far
        );
        orthographicCamera.position.set(0, 800, 0);
        orthographicCamera.lookAt(0, 0, 0);
        
        // Start with orthographic camera for 2D mode
        const camera = orthographicCamera;
        
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.insertBefore(renderer.domElement, statusDiv);
        
        return {
            scene,
            perspectiveCamera,
            orthographicCamera,
            camera,
            renderer,
            is2DMode: true
        };
    }
    
    setupLighting(scene) {
        // Bright ambient light for well-lit scene
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);
        
        // Main directional light (sun-like)
        const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight1.position.set(200, 300, 200);
        directionalLight1.castShadow = true;
        directionalLight1.shadow.mapSize.width = 2048;
        directionalLight1.shadow.mapSize.height = 2048;
        scene.add(directionalLight1);
        
        // Fill light from opposite side
        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
        directionalLight2.position.set(-200, 200, -200);
        scene.add(directionalLight2);
        
        // Additional top light
        const topLight = new THREE.DirectionalLight(0xffffff, 0.3);
        topLight.position.set(0, 500, 0);
        scene.add(topLight);
    }
    
    setupControls(sceneInstance, camera, renderer, scene) {
        // Orbit controls for camera
        const orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
        orbitControls.enableDamping = true;
        orbitControls.dampingFactor = 0.05;
        
        // Start locked in 2D top-view mode
        orbitControls.enableRotate = false;
        orbitControls.maxPolarAngle = 0;
        orbitControls.minPolarAngle = 0;
        
        // Transform controls for object manipulation
        const transformControls = new THREE.TransformControls(camera, renderer.domElement);
        transformControls.addEventListener('dragging-changed', (event) => {
            orbitControls.enabled = !event.value;
            
            // When user releases object after dragging
            if (!event.value && sceneInstance.selectedObject) {
                const body = sceneInstance.rigidBodies.get(sceneInstance.selectedObject);
                if (body) {
                    // Make it dynamic so it falls
                    body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
                    // Reset velocities
                    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
                    body.setAngvel({ x: 0, y: 0, z: 0 }, true);
                    sceneInstance.log(`🎯 Released ${sceneInstance.selectedObject.userData.name} - falling with gravity`, 'info');
                }
            }
        });
        transformControls.addEventListener('objectChange', () => {
            if (sceneInstance.selectedObject) {
                sceneInstance.checkSnapping(sceneInstance.selectedObject);
                sceneInstance.updatePropertiesPanel();
            }
        });
        scene.add(transformControls);
        
        return { orbitControls, transformControls };
    }
    
    setupViewCube(sceneInstance) {
        // Create mini Three.js scene for ViewCube
        const canvas = document.getElementById('viewCubeCanvas');
        if (!canvas) return null;
        
        const viewCubeScene = new THREE.Scene();
        const viewCubeCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
        viewCubeCamera.position.set(0, 0, 3);
        
        const viewCubeRenderer = new THREE.WebGLRenderer({ 
            canvas: canvas, 
            alpha: true,
            antialias: true
        });
        viewCubeRenderer.setSize(150, 150);
        viewCubeRenderer.setClearColor(0x000000, 0);
        
        // Create cube geometry with different colors per face
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const materials = [
            new THREE.MeshBasicMaterial({ color: 0xf39c12 }), // Right - Orange
            new THREE.MeshBasicMaterial({ color: 0xe74c3c }), // Left - Red
            new THREE.MeshBasicMaterial({ color: 0x3498db }), // Top - Blue
            new THREE.MeshBasicMaterial({ color: 0x95a5a6 }), // Bottom - Gray
            new THREE.MeshBasicMaterial({ color: 0x2ecc71 }), // Front - Green
            new THREE.MeshBasicMaterial({ color: 0x9b59b6 })  // Back - Purple
        ];
        
        const viewCubeMesh = new THREE.Mesh(geometry, materials);
        viewCubeScene.add(viewCubeMesh);
        
        // Add edges for better visibility
        const edges = new THREE.EdgesGeometry(geometry);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
        const wireframe = new THREE.LineSegments(edges, lineMaterial);
        viewCubeMesh.add(wireframe);
        
        // Mouse interaction with ViewCube
        canvas.addEventListener('click', (event) => {
            const rect = canvas.getBoundingClientRect();
            const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera({ x, y }, viewCubeCamera);
            const intersects = raycaster.intersectObject(viewCubeMesh);
            
            if (intersects.length > 0) {
                const faceIndex = Math.floor(intersects[0].faceIndex / 2);
                const views = ['right', 'left', 'top', 'bottom', 'front', 'back'];
                sceneInstance.setView(views[faceIndex]);
            }
        });
        
        return { viewCubeScene, viewCubeCamera, viewCubeRenderer, viewCubeMesh };
    }
    
    renderViewCube(viewCubeMesh, viewCubeRenderer, viewCubeScene, viewCubeCamera, camera) {
        if (!viewCubeMesh || !viewCubeRenderer) return;
        
        // Sync ViewCube rotation with main camera
        const mainCameraDir = new THREE.Vector3();
        camera.getWorldDirection(mainCameraDir);
        
        // Copy main camera rotation to ViewCube
        viewCubeMesh.quaternion.copy(camera.quaternion);
        viewCubeMesh.quaternion.invert();
        
        viewCubeRenderer.render(viewCubeScene, viewCubeCamera);
    }
    
    setView(sceneInstance, viewName) {
        const { width, height, depth } = sceneInstance.mountingConfig;
        const distance = Math.max(width, height, depth) * 1.5;
        
        // Store target for smooth transition
        const targetPos = { x: 0, y: 0, z: 0 };
        const targetLookAt = { x: 0, y: height / 2, z: 0 };
        
        switch(viewName) {
            case 'top':
                targetPos.x = 0;
                targetPos.y = distance;
                targetPos.z = 0;
                break;
            case 'bottom':
                targetPos.x = 0;
                targetPos.y = -distance;
                targetPos.z = 0;
                break;
            case 'front':
                targetPos.x = 0;
                targetPos.y = height / 2;
                targetPos.z = distance;
                break;
            case 'back':
                targetPos.x = 0;
                targetPos.y = height / 2;
                targetPos.z = -distance;
                break;
            case 'left':
                targetPos.x = -distance;
                targetPos.y = height / 2;
                targetPos.z = 0;
                break;
            case 'right':
                targetPos.x = distance;
                targetPos.y = height / 2;
                targetPos.z = 0;
                break;
        }
        
        // Animate camera to new position
        this.animateCamera(sceneInstance, targetPos, targetLookAt);
        sceneInstance.log(`📷 View changed to: ${viewName.toUpperCase()}`, 'info');
    }
    
    animateCamera(sceneInstance, targetPos, targetLookAt) {
        const startPos = sceneInstance.camera.position.clone();
        const startLookAt = sceneInstance.orbitControls.target.clone();
        
        const duration = 800; // ms
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease-in-out function
            const eased = progress < 0.5 
                ? 4 * progress * progress * progress 
                : 1 - Math.pow(-2 * progress + 2, 3) / 2;
            
            // Interpolate camera position
            sceneInstance.camera.position.x = startPos.x + (targetPos.x - startPos.x) * eased;
            sceneInstance.camera.position.y = startPos.y + (targetPos.y - startPos.y) * eased;
            sceneInstance.camera.position.z = startPos.z + (targetPos.z - startPos.z) * eased;
            
            // Interpolate look-at target
            sceneInstance.orbitControls.target.x = startLookAt.x + (targetLookAt.x - startLookAt.x) * eased;
            sceneInstance.orbitControls.target.y = startLookAt.y + (targetLookAt.y - startLookAt.y) * eased;
            sceneInstance.orbitControls.target.z = startLookAt.z + (targetLookAt.z - startLookAt.z) * eased;
            
            sceneInstance.orbitControls.update();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }
    
    switchTo2DView(sceneInstance) {
        sceneInstance.is2DMode = true;
        sceneInstance.viewMode = '2d';
        sceneInstance.interactionEnabled = true; // Enable selection and movement in 2D
        
        // Enable transform controls
        if (sceneInstance.transformControls) {
            sceneInstance.transformControls.enabled = true;
        }
        
        // Switch to orthographic camera for perfect 2D (no perspective distortion)
        sceneInstance.camera = sceneInstance.orthographicCamera;
        const { width, depth } = sceneInstance.mountingConfig;
        const distance = Math.max(width, depth) * 2;
        
        // Position orthographic camera directly above
        sceneInstance.orthographicCamera.position.set(0, distance, 0);
        sceneInstance.orthographicCamera.lookAt(0, 0, 0);
        sceneInstance.orthographicCamera.updateProjectionMatrix();
        
        // Update orbit controls to use orthographic camera
        sceneInstance.orbitControls.object = sceneInstance.orthographicCamera;
        sceneInstance.orbitControls.target.set(0, 0, 0);
        sceneInstance.orbitControls.enableRotate = false;
        sceneInstance.orbitControls.update();
        
        sceneInstance.log('📐 Switched to 2D Top View - Objects can be moved', 'info');
    }
    
    switchTo3DView(sceneInstance) {
        sceneInstance.is2DMode = false;
        sceneInstance.viewMode = '3d';
        sceneInstance.interactionEnabled = false; // Disable selection and movement in 3D (view-only)
        
        // Disable transform controls and deselect any object
        if (sceneInstance.transformControls) {
            sceneInstance.transformControls.enabled = false;
            sceneInstance.transformControls.detach();
        }
        sceneInstance.deselectObject();
        
        // Switch to perspective camera for 3D view
        sceneInstance.camera = sceneInstance.perspectiveCamera;
        const { width, height, depth } = sceneInstance.mountingConfig;
        const distance = Math.max(width, height, depth) * 1.5;
        
        // Position perspective camera at angle
        sceneInstance.perspectiveCamera.position.set(distance * 0.7, distance * 0.5, distance * 0.7);
        sceneInstance.perspectiveCamera.lookAt(0, height / 2, 0);
        sceneInstance.perspectiveCamera.updateProjectionMatrix();
        
        // Update orbit controls to use perspective camera
        sceneInstance.orbitControls.object = sceneInstance.perspectiveCamera;
        sceneInstance.orbitControls.target.set(0, height / 2, 0);
        sceneInstance.orbitControls.enableRotate = true;
        sceneInstance.orbitControls.maxPolarAngle = Math.PI;
        sceneInstance.orbitControls.minPolarAngle = 0;
        sceneInstance.orbitControls.update();
        
        sceneInstance.log('🎨 Switched to 3D View - View-only mode (use 2D to move objects)', 'info');
        sceneInstance.log('🎲 Switched to 3D View - See your assembly in perspective!', 'success');
    }
    
    setupMousePicking(sceneInstance, renderer, camera, transformControls) {
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        
        renderer.domElement.addEventListener('click', (event) => {
            // Disable interaction in 3D view mode (view-only) unless in wire/ruler mode
            if (sceneInstance.viewMode === '3d' && !sceneInstance.rulerMode && !sceneInstance.wireMode) return;
            
            if (transformControls.dragging) return;
            
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            
            raycaster.setFromCamera(mouse, camera);
            
            // Ruler mode: Measure distance between two points
            if (sceneInstance.rulerMode) {
                sceneInstance.handleRulerClick(raycaster, mouse);
                return;
            }
            
            // Wire mode: Check for port marker clicks first
            if (sceneInstance.wireMode) {
                const portIntersects = raycaster.intersectObjects(sceneInstance.portMarkers, false);
                if (portIntersects.length > 0) {
                    const portMarker = portIntersects[0].object;
                    const port = portMarker.userData.port;
                    sceneInstance.handlePortClickForWiring(port, portMarker);
                    return;
                }
            }
            
            const intersects = raycaster.intersectObjects(sceneInstance.sceneObjects, true);
            
            if (intersects.length > 0) {
                // Find the top-level parent object (for OBJ groups)
                let selectedObj = intersects[0].object;
                while (selectedObj.parent && !sceneInstance.sceneObjects.includes(selectedObj)) {
                    selectedObj = selectedObj.parent;
                }
                
                // Port Edit Mode: Add port at click position
                if (sceneInstance.portEditMode) {
                    const clickPosition = intersects[0].point;
                    sceneInstance.addPortToModel(selectedObj, clickPosition, event.shiftKey);
                } else {
                    // Normal mode: Select object (only in 2D mode)
                    if (sceneInstance.viewMode === '2d' && !sceneInstance.wireMode) {
                        sceneInstance.selectObject(selectedObj);
                    }
                }
            } else {
                if (!sceneInstance.wireMode) {
                    sceneInstance.deselectObject();
                }
            }
        });
    }
    
    selectObject(sceneInstance, obj) {
        if (sceneInstance.selectedObject === obj) return;
        
        sceneInstance.deselectObject();
        sceneInstance.selectedObject = obj;
        sceneInstance.transformControls.attach(obj);
        
        // Highlight selected object (handle both Mesh and Group)
        if (obj.material) {
            // Single Mesh (STL files)
            obj.material.emissive = new THREE.Color(0x00ff00);
            obj.material.emissiveIntensity = 0.3;
        } else {
            // Group with multiple meshes (OBJ files)
            obj.traverse((child) => {
                if (child instanceof THREE.Mesh && child.material) {
                    if (child.material.emissive) {
                        child.material.emissive = new THREE.Color(0x00ff00);
                        child.material.emissiveIntensity = 0.3;
                    }
                }
            });
        }
        
        sceneInstance.log(`✅ Selected: ${obj.userData.name}`, 'info');
        sceneInstance.updatePropertiesPanel();
    }
    
    deselectObject(sceneInstance) {
        if (sceneInstance.selectedObject) {
            // Remove highlight (handle both Mesh and Group)
            if (sceneInstance.selectedObject.material) {
                // Single Mesh (STL files)
                sceneInstance.selectedObject.material.emissive = new THREE.Color(0x000000);
            } else {
                // Group with multiple meshes (OBJ files)
                sceneInstance.selectedObject.traverse((child) => {
                    if (child instanceof THREE.Mesh && child.material) {
                        if (child.material.emissive) {
                            child.material.emissive = new THREE.Color(0x000000);
                        }
                    }
                });
            }
            
            sceneInstance.transformControls.detach();
            sceneInstance.selectedObject = null;
            sceneInstance.updatePropertiesPanel();
        }
    }
    
    updatePropertiesPanel(sceneInstance) {
        const panel = document.getElementById('model-properties-content');
        if (!panel) return;
        
        if (sceneInstance.selectedObject) {
            const obj = sceneInstance.selectedObject;
            const pos = obj.position;
            const rot = obj.rotation;
            
            panel.innerHTML = `
                <div style="padding: 10px; font-size: 12px;">
                    <h3 style="margin-top: 0; color: #2ecc71;">${obj.userData.name}</h3>
                    <div style="margin: 10px 0;">
                        <strong>Position (mm):</strong><br>
                        X: ${pos.x.toFixed(1)}<br>
                        Y: ${pos.y.toFixed(1)}<br>
                        Z: ${pos.z.toFixed(1)}
                    </div>
                    <div style="margin: 10px 0;">
                        <strong>Rotation (deg):</strong><br>
                        X: ${(rot.x * 180 / Math.PI).toFixed(1)}°<br>
                        Y: ${(rot.y * 180 / Math.PI).toFixed(1)}°<br>
                        Z: ${(rot.z * 180 / Math.PI).toFixed(1)}°
                    </div>
                    <div style="margin-top: 15px;">
                        <button onclick="viewer3D.transformControls.setMode('translate')" class="btn btn-secondary btn-small">Move</button>
                        <button onclick="viewer3D.transformControls.setMode('rotate')" class="btn btn-secondary btn-small">Rotate</button>
                    </div>
                    <button onclick="viewer3D.deleteSelected()" class="btn btn-danger btn-small" style="margin-top: 10px; width: 100%;">Delete</button>
                </div>
            `;
        } else {
            panel.innerHTML = '<p class="empty-message">Select a component to view properties</p>';
        }
    }
    
    updateSceneObjectsList(sceneInstance) {
        const list = document.getElementById('scene-objects-list');
        if (!list) return;
        
        if (sceneInstance.sceneObjects.length === 0) {
            list.innerHTML = '<p class="empty-message">No objects in scene</p>';
        } else {
            list.innerHTML = sceneInstance.sceneObjects.map((obj, index) => `
                <div style="padding: 5px; margin: 3px 0; background: #34495e; border-radius: 3px; cursor: pointer; font-size: 11px;"
                     onclick="viewer3D.selectObject(viewer3D.sceneObjects[${index}])">
                    ${obj.userData.name}
                </div>
            `).join('');
        }
    }
    
    deleteSelected(sceneInstance) {
        if (!sceneInstance.selectedObject) return;
        
        const obj = sceneInstance.selectedObject;
        sceneInstance.scene.remove(obj);
        const index = sceneInstance.sceneObjects.indexOf(obj);
        if (index > -1) sceneInstance.sceneObjects.splice(index, 1);
        
        // Remove physics body
        const body = sceneInstance.rigidBodies.get(obj);
        if (body && sceneInstance.world) {
            sceneInstance.world.removeRigidBody(body);
            sceneInstance.rigidBodies.delete(obj);
        }
        
        sceneInstance.log(`🗑️ Deleted: ${obj.userData.name}`, 'info');
        sceneInstance.deselectObject();
        sceneInstance.updateSceneObjectsList();
    }
    
    clearScene(sceneInstance) {
        // Remove all objects from scene
        while (sceneInstance.sceneObjects.length > 0) {
            const obj = sceneInstance.sceneObjects.pop();
            sceneInstance.scene.remove(obj);
            
            // Clean up physics body if exists
            if (sceneInstance.rigidBodies.has(obj)) {
                const body = sceneInstance.rigidBodies.get(obj);
                if (sceneInstance.world) {
                    sceneInstance.world.removeRigidBody(body);
                }
                sceneInstance.rigidBodies.delete(obj);
            }
            
            // Dispose geometry and materials
            obj.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => mat.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        }
        
        // Clear ports
        sceneInstance.modelPorts.clear();
        sceneInstance.clearPortMarkers();
        
        // Clear wires
        sceneInstance.clearAllWires();
        
        // Clear collision highlights
        sceneInstance.collisionMeshes.clear();
        
        sceneInstance.log('Scene cleared', 'info');
    }
}
