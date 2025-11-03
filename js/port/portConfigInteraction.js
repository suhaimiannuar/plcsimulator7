// Port Config Viewer - Mouse Interaction
// Handles mouse picking and port placement

class PortConfigInteraction {
    constructor(sceneManager, onPortAdded, onWarning) {
        this.sceneManager = sceneManager;
        this.onPortAdded = onPortAdded || (() => {});
        this.onWarning = onWarning || (() => {});
        this.currentModel = null;
        this.surfaceHighlight = null;
        this.tempDots = []; // Store temporary dots on highlighted surface
        this.lastSurfaceData = null; // Store last clicked surface normal and point
    }

    setupMousePicking() {
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        const renderer = this.sceneManager.getRenderer();
        const camera = this.sceneManager.getCamera();
        const controls = this.sceneManager.getControls();
        const scene = this.sceneManager.getScene();
        
        renderer.domElement.addEventListener('click', (event) => {
            // Don't register clicks while dragging
            if (controls.isDragging) {
                console.log('Ignoring click - camera is dragging');
                return;
            }
            
            if (!this.currentModel) {
                this.onWarning('⚠️ Select a model first!', 'warning');
                return;
            }
            
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            
            console.log('Mouse click:', { x: mouse.x, y: mouse.y });
            
            raycaster.setFromCamera(mouse, camera);
            
            // Raycast against all objects in scene for debugging
            const allIntersects = raycaster.intersectObjects(scene.children, true);
            console.log('All intersects:', allIntersects.length);
            
            // Raycast specifically against the model
            const intersects = raycaster.intersectObject(this.currentModel, true);
            console.log('Model intersects:', intersects.length, intersects);
            
            if (intersects.length > 0) {
                const intersection = intersects[0];
                const clickPosition = intersection.point.clone();
                
                console.log('=== INTERSECTION DATA ===');
                console.log('Raw intersection point:', clickPosition);
                console.log('Point X:', clickPosition.x, 'Y:', clickPosition.y, 'Z:', clickPosition.z);
                console.log('Intersected object:', intersection.object.name, intersection.object.type);
                console.log('Object position:', intersection.object.position);
                console.log('Object world matrix:', intersection.object.matrixWorld);
                console.log('Face normal:', intersection.face ? intersection.face.normal : 'N/A');
                console.log('========================');
                
                // Highlight the clicked surface
                this.highlightSurface(intersection);
                
                // Get the surface normal (direction the port is facing)
                const surfaceNormal = intersection.face.normal.clone().normalize();
                
                // Add a temporary dot at the click position
                this.addTemporaryDot(clickPosition);
                
                // If shift key is held, add the port immediately
                if (event.shiftKey) {
                    this.clearTemporaryDots();
                    console.log('Calling onPortAdded with position:', clickPosition, 'normal:', surfaceNormal);
                    this.onPortAdded(clickPosition, surfaceNormal, true);
                } else {
                    // Just show the dot for now (can add port with another action)
                    console.log('Calling onPortAdded (no label) with position:', clickPosition, 'normal:', surfaceNormal);
                    this.onPortAdded(clickPosition, surfaceNormal, false);
                }
            } else {
                this.onWarning('⚠️ Click on the model surface to add a port', 'warning');
            }
        });
    }

    highlightSurface(intersection) {
        // Clear previous highlight
        this.clearSurfaceHighlight();
        
        const scene = this.sceneManager.getScene();
        
        // Get the face that was clicked
        const face = intersection.face;
        if (!face) {
            console.warn('No face data in intersection');
            return;
        }
        
        // Get the geometry and position of the intersected object
        const object = intersection.object;
        const geometry = object.geometry;
        
        console.log('Geometry type:', geometry.type);
        console.log('Face indices:', face.a, face.b, face.c);
        console.log('Has index:', !!geometry.index);
        
        // Get the normal of the clicked face
        const clickedNormal = face.normal.clone().normalize();
        console.log('Clicked face normal:', clickedNormal);
        
        // Store surface data for "View Normal" feature
        this.lastSurfaceData = {
            normal: clickedNormal.clone(),
            point: intersection.point.clone()
        };
        
        // Find all coplanar faces (same normal direction)
        const positionAttribute = geometry.getAttribute('position');
        const normalAttribute = geometry.getAttribute('normal');
        const faceCount = positionAttribute.count / 3;
        
        const coplanarFaces = [];
        const normalTolerance = 0.99; // cosine of ~8 degrees
        
        for (let i = 0; i < faceCount; i++) {
            const i0 = i * 3;
            const i1 = i * 3 + 1;
            const i2 = i * 3 + 2;
            
            // Get the normal for this face (average of vertex normals)
            const n1 = new THREE.Vector3(
                normalAttribute.getX(i0),
                normalAttribute.getY(i0),
                normalAttribute.getZ(i0)
            ).normalize();
            
            const n2 = new THREE.Vector3(
                normalAttribute.getX(i1),
                normalAttribute.getY(i1),
                normalAttribute.getZ(i1)
            ).normalize();
            
            const n3 = new THREE.Vector3(
                normalAttribute.getX(i2),
                normalAttribute.getY(i2),
                normalAttribute.getZ(i2)
            ).normalize();
            
            const faceNormal = new THREE.Vector3()
                .add(n1)
                .add(n2)
                .add(n3)
                .divideScalar(3)
                .normalize();
            
            // Check if this face is coplanar with the clicked face
            const dotProduct = clickedNormal.dot(faceNormal);
            
            if (dotProduct > normalTolerance) {
                coplanarFaces.push({ i0, i1, i2 });
            }
        }
        
        console.log(`Found ${coplanarFaces.length} coplanar faces out of ${faceCount} total faces`);
        
        // Create geometry from all coplanar faces
        const highlightVertices = [];
        
        for (const face of coplanarFaces) {
            // Add the three vertices of this face
            highlightVertices.push(
                positionAttribute.getX(face.i0),
                positionAttribute.getY(face.i0),
                positionAttribute.getZ(face.i0),
                
                positionAttribute.getX(face.i1),
                positionAttribute.getY(face.i1),
                positionAttribute.getZ(face.i1),
                
                positionAttribute.getX(face.i2),
                positionAttribute.getY(face.i2),
                positionAttribute.getZ(face.i2)
            );
        }
        
        const highlightGeometry = new THREE.BufferGeometry();
        highlightGeometry.setAttribute('position', 
            new THREE.BufferAttribute(new Float32Array(highlightVertices), 3)
        );
        highlightGeometry.computeVertexNormals();
        
        // Create a semi-transparent green material
        const highlightMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide,
            depthTest: true,
            depthWrite: false
        });
        
        // Create the highlight mesh
        this.surfaceHighlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
        
        // Apply the same transformation as the intersected object
        this.surfaceHighlight.position.copy(object.position);
        this.surfaceHighlight.rotation.copy(object.rotation);
        this.surfaceHighlight.scale.copy(object.scale);
        this.surfaceHighlight.matrix.copy(object.matrix);
        this.surfaceHighlight.matrixWorld.copy(object.matrixWorld);
        
        // For OBJ files, we need to handle parent transformations
        if (object.parent && object.parent !== scene) {
            this.surfaceHighlight.applyMatrix4(object.parent.matrixWorld);
        }
        
        scene.add(this.surfaceHighlight);
        console.log('Surface highlighted with', coplanarFaces.length, 'faces');
    }

    clearSurfaceHighlight() {
        if (this.surfaceHighlight) {
            const scene = this.sceneManager.getScene();
            scene.remove(this.surfaceHighlight);
            this.surfaceHighlight.geometry.dispose();
            this.surfaceHighlight.material.dispose();
            this.surfaceHighlight = null;
            console.log('Surface highlight cleared');
        }
    }

    addTemporaryDot(position) {
        const scene = this.sceneManager.getScene();
        
        // Create a small red sphere at the click position
        const dotGeometry = new THREE.SphereGeometry(0.5, 16, 16);
        const dotMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            depthTest: true,
            depthWrite: false
        });
        
        const dot = new THREE.Mesh(dotGeometry, dotMaterial);
        dot.position.copy(position);
        
        scene.add(dot);
        this.tempDots.push(dot);
        
        console.log('Temporary dot added at world position:', position);
    }

    clearTemporaryDots() {
        const scene = this.sceneManager.getScene();
        
        this.tempDots.forEach(dot => {
            scene.remove(dot);
            dot.geometry.dispose();
            dot.material.dispose();
        });
        
        this.tempDots = [];
        console.log('All temporary dots cleared');
    }

    setCurrentModel(model) {
        this.currentModel = model;
        // Clear highlight and dots when switching models
        this.clearSurfaceHighlight();
        this.clearTemporaryDots();
        this.lastSurfaceData = null;
    }

    getLastSurfaceData() {
        return this.lastSurfaceData;
    }
}
