// modelPhysics.js - Physics Engine (Rapier integration, Mounting structures, Boundaries, Snapping)

class ModelPhysicsManager {
    constructor() {
        this.world = null;
    }
    
    async setupPhysics(sceneInstance) {
        try {
            await RAPIER.init();
            const gravity = { x: 0.0, y: -9.81, z: 0.0 };
            this.world = new RAPIER.World(gravity);
            sceneInstance.world = this.world;
            sceneInstance.log('✅ Physics engine initialized', 'success');
        } catch (error) {
            sceneInstance.log('⚠️ Physics engine not available', 'warning');
        }
    }
    
    createMounting(sceneInstance) {
        const { type, width, height, depth } = sceneInstance.mountingConfig;
        const wallThickness = 5;
        
        // Clear existing mounting structures
        sceneInstance.mountingSurfaces.forEach(wall => sceneInstance.scene.remove(wall));
        sceneInstance.boundaryWalls.forEach(wall => {
            sceneInstance.scene.remove(wall);
            if (sceneInstance.world) {
                const body = sceneInstance.rigidBodies.get(wall);
                if (body) sceneInstance.world.removeRigidBody(body);
            }
        });
        sceneInstance.mountingSurfaces = [];
        sceneInstance.boundaryWalls = [];
        
        if (type === 'box') {
            this.createBox(sceneInstance, width, height, depth, wallThickness);
        } else if (type === 'plate') {
            this.createPlate(sceneInstance, width, height, wallThickness);
        } else if (type === 'shelf') {
            this.createShelf(sceneInstance, width, height, depth, wallThickness);
        }
        
        // Update grid helper
        sceneInstance.updateGrid();
        
        sceneInstance.log(`✅ ${type.toUpperCase()} created: ${width}×${height}×${depth}mm`, 'success');
    }
    
    createBox(sceneInstance, width, height, depth, thickness) {
        // Back wall (mounting plate) - visible
        const backWall = this.createWall(sceneInstance, width, height, thickness, 0x3498db, true);
        backWall.position.set(0, height / 2, -depth / 2);
        backWall.userData.isMountingSurface = true;
        backWall.userData.normal = new THREE.Vector3(0, 0, 1);
        sceneInstance.mountingSurfaces.push(backWall);
        
        // Bottom floor - visible
        const floor = this.createWall(sceneInstance, width, thickness, depth, 0x34495e, true);
        floor.position.set(0, 0, 0);
        floor.userData.isMountingSurface = true;
        floor.userData.normal = new THREE.Vector3(0, 1, 0);
        sceneInstance.mountingSurfaces.push(floor);
        
        // Side walls - visible
        const leftWall = this.createWall(sceneInstance, thickness, height, depth, 0x2c3e50, true);
        leftWall.position.set(-width / 2, height / 2, 0);
        leftWall.userData.isMountingSurface = true;
        leftWall.userData.normal = new THREE.Vector3(1, 0, 0);
        sceneInstance.mountingSurfaces.push(leftWall);
        
        const rightWall = this.createWall(sceneInstance, thickness, height, depth, 0x2c3e50, true);
        rightWall.position.set(width / 2, height / 2, 0);
        rightWall.userData.isMountingSurface = true;
        rightWall.userData.normal = new THREE.Vector3(-1, 0, 0);
        sceneInstance.mountingSurfaces.push(rightWall);
        
        // Top boundary (invisible collision)
        const topWall = this.createWall(sceneInstance, width, thickness, depth, 0xff0000, false);
        topWall.position.set(0, height, 0);
        topWall.visible = false;
        sceneInstance.boundaryWalls.push(topWall);
        
        // Front boundary (invisible collision) 
        const frontWall = this.createWall(sceneInstance, width, height, thickness, 0xff0000, false);
        frontWall.position.set(0, height / 2, depth / 2);
        frontWall.visible = false;
        sceneInstance.boundaryWalls.push(frontWall);
    }
    
    createPlate(sceneInstance, width, height, thickness) {
        // Just a back plate - vertical mounting surface
        const plate = this.createWall(sceneInstance, width, height, thickness, 0x3498db, true);
        plate.position.set(0, height / 2, 0);
        plate.userData.isMountingSurface = true;
        plate.userData.normal = new THREE.Vector3(0, 0, 1);
        sceneInstance.mountingSurfaces.push(plate);
        
        // Floor for catching objects
        const floor = this.createWall(sceneInstance, width * 2, thickness, width * 2, 0x34495e, true);
        floor.position.set(0, -50, 0);
        floor.userData.isMountingSurface = true;
        floor.userData.normal = new THREE.Vector3(0, 1, 0);
        sceneInstance.mountingSurfaces.push(floor);
    }
    
    createShelf(sceneInstance, width, height, depth, thickness) {
        // Back wall
        const backWall = this.createWall(sceneInstance, width, height, thickness, 0x3498db, true);
        backWall.position.set(0, height / 2, -depth / 2);
        backWall.userData.isMountingSurface = true;
        backWall.userData.normal = new THREE.Vector3(0, 0, 1);
        sceneInstance.mountingSurfaces.push(backWall);
        
        // Bottom shelf
        const floor = this.createWall(sceneInstance, width, thickness, depth, 0x34495e, true);
        floor.position.set(0, 0, 0);
        floor.userData.isMountingSurface = true;
        floor.userData.normal = new THREE.Vector3(0, 1, 0);
        sceneInstance.mountingSurfaces.push(floor);
        
        // Side walls
        const leftWall = this.createWall(sceneInstance, thickness, height, depth, 0x2c3e50, true);
        leftWall.position.set(-width / 2, height / 2, 0);
        leftWall.userData.isMountingSurface = true;
        leftWall.userData.normal = new THREE.Vector3(1, 0, 0);
        sceneInstance.mountingSurfaces.push(leftWall);
        
        const rightWall = this.createWall(sceneInstance, thickness, height, depth, 0x2c3e50, true);
        rightWall.position.set(width / 2, height / 2, 0);
        rightWall.userData.isMountingSurface = true;
        rightWall.userData.normal = new THREE.Vector3(-1, 0, 0);
        sceneInstance.mountingSurfaces.push(rightWall);
        
        // Top boundary (invisible)
        const topWall = this.createWall(sceneInstance, width, thickness, depth, 0xff0000, false);
        topWall.position.set(0, height, 0);
        topWall.visible = false;
        sceneInstance.boundaryWalls.push(topWall);
        
        // NO front wall - open front for shelf
    }
    
    createWall(sceneInstance, width, height, depth, color, visible = true) {
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshPhongMaterial({
            color: color,
            transparent: true,
            opacity: visible ? 0.3 : 0,
            side: THREE.DoubleSide
        });
        const wall = new THREE.Mesh(geometry, material);
        wall.receiveShadow = true;
        sceneInstance.scene.add(wall);
        
        // Add physics body for collision (always, even if invisible)
        if (sceneInstance.world) {
            const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed();
            const rigidBody = sceneInstance.world.createRigidBody(rigidBodyDesc);
            const colliderDesc = RAPIER.ColliderDesc.cuboid(width / 2, height / 2, depth / 2);
            sceneInstance.world.createCollider(colliderDesc, rigidBody);
            rigidBody.setTranslation(wall.position, true);
            sceneInstance.rigidBodies.set(wall, rigidBody);
        }
        
        return wall;
    }
    
    rebuildMounting(sceneInstance) {
        // Save current objects
        const savedObjects = sceneInstance.sceneObjects.map(obj => ({
            mesh: obj,
            position: obj.position.clone(),
            rotation: obj.rotation.clone()
        }));
        
        // Rebuild mounting structure
        this.createMounting(sceneInstance);
        
        // Restore objects and update their physics
        savedObjects.forEach(({ mesh, position, rotation }) => {
            mesh.position.copy(position);
            mesh.rotation.copy(rotation);
            this.updatePhysicsBody(sceneInstance, mesh);
        });
    }
    
    addPhysicsBody(sceneInstance, mesh, geometry) {
        // Compute bounding box for collider
        geometry.computeBoundingBox();
        const bbox = geometry.boundingBox;
        const size = new THREE.Vector3();
        bbox.getSize(size);
        
        // Store size for boundary checking
        mesh.userData.size = size;
        
        if (!sceneInstance.world) {
            sceneInstance.log(`⚠️ Physics not available for ${mesh.userData.name}, object will be static`, 'warning');
            return;
        }
        
        const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(mesh.position.x, mesh.position.y, mesh.position.z)
            .setLinearDamping(2.0) // Add damping to reduce bouncing
            .setAngularDamping(2.0);
        const rigidBody = sceneInstance.world.createRigidBody(rigidBodyDesc);
        
        const colliderDesc = RAPIER.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2)
            .setRestitution(0.1) // Low bounce
            .setFriction(0.9) // High friction to prevent sliding
            .setDensity(1.0);
        sceneInstance.world.createCollider(colliderDesc, rigidBody);
        
        sceneInstance.rigidBodies.set(mesh, rigidBody);
    }
    
    addPhysicsBodyFromBBox(sceneInstance, object, size) {
        // Store size even if physics is not available
        object.userData.size = size;
        
        if (!sceneInstance.world) {
            sceneInstance.log(`⚠️ Physics not available for ${object.userData.name}, object will be static`, 'warning');
            return;
        }
        
        const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(object.position.x, object.position.y, object.position.z)
            .setLinearDamping(2.0)
            .setAngularDamping(2.0);
        const rigidBody = sceneInstance.world.createRigidBody(rigidBodyDesc);
        
        const colliderDesc = RAPIER.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2)
            .setRestitution(0.1)
            .setFriction(0.9)
            .setDensity(1.0);
        sceneInstance.world.createCollider(colliderDesc, rigidBody);
        
        sceneInstance.rigidBodies.set(object, rigidBody);
    }
    
    updatePhysicsBody(sceneInstance, mesh) {
        const body = sceneInstance.rigidBodies.get(mesh);
        if (body) {
            body.setTranslation(mesh.position, true);
            body.setRotation(mesh.quaternion, true);
            body.setLinvel({ x: 0, y: 0, z: 0 }, true);
            body.setAngvel({ x: 0, y: 0, z: 0 }, true);
            
            // Check boundaries when manually moving
            this.enforceObjectBoundaries(sceneInstance, mesh);
        }
    }
    
    enforceObjectBoundaries(sceneInstance, obj) {
        // Ensure object stays within mounting boundaries
        const { width, height, depth } = sceneInstance.mountingConfig;
        const size = obj.userData.size || new THREE.Vector3(50, 50, 50);
        
        const halfWidth = width / 2;
        const halfDepth = depth / 2;
        
        let corrected = false;
        
        // X boundaries (left/right)
        if (obj.position.x - size.x / 2 < -halfWidth) {
            obj.position.x = -halfWidth + size.x / 2;
            corrected = true;
        }
        if (obj.position.x + size.x / 2 > halfWidth) {
            obj.position.x = halfWidth - size.x / 2;
            corrected = true;
        }
        
        // Y boundaries (floor/ceiling)
        if (obj.position.y - size.y / 2 < 0) {
            obj.position.y = size.y / 2;
            corrected = true;
        }
        if (obj.position.y + size.y / 2 > height) {
            obj.position.y = height - size.y / 2;
            corrected = true;
        }
        
        // Z boundaries (back/front) - only for box and shelf
        if (sceneInstance.mountingConfig.type !== 'plate') {
            if (obj.position.z - size.z / 2 < -halfDepth) {
                obj.position.z = -halfDepth + size.z / 2;
                corrected = true;
            }
            if (obj.position.z + size.z / 2 > halfDepth) {
                obj.position.z = halfDepth - size.z / 2;
                corrected = true;
            }
        }
        
        // Update physics body if corrected
        if (corrected) {
            this.updatePhysicsBody(sceneInstance, obj);
        }
    }
    
    checkSnapping(sceneInstance, mesh) {
        if (!sceneInstance.snapEnabled) return;
        
        const meshBox = new THREE.Box3().setFromObject(mesh);
        const meshSize = new THREE.Vector3();
        meshBox.getSize(meshSize);
        
        for (const surface of sceneInstance.mountingSurfaces) {
            const surfaceBox = new THREE.Box3().setFromObject(surface);
            
            // Snap to back wall (mounting plate)
            if (surface.userData.normal && surface.userData.normal.z > 0.9) {
                const targetZ = surfaceBox.max.z + meshSize.z / 2 + 2;
                const distanceToSurface = Math.abs(meshBox.min.z - surfaceBox.max.z);
                
                if (distanceToSurface < sceneInstance.snapDistance) {
                    mesh.position.z = targetZ;
                    sceneInstance.log(`🧲 Snapped ${mesh.userData.name} to mounting plate`, 'success');
                }
            }
            // Snap to floor
            else if (surface.userData.normal && surface.userData.normal.y > 0.9) {
                const distanceToFloor = Math.abs(meshBox.min.y - surfaceBox.max.y);
                
                if (distanceToFloor < sceneInstance.snapDistance) {
                    // Calculate the offset needed to move bottom of object to floor surface
                    const bottomOffset = meshBox.min.y - mesh.position.y;
                    const targetY = surfaceBox.max.y - bottomOffset;
                    mesh.position.y = targetY;
                    sceneInstance.log(`🧲 Snapped ${mesh.userData.name} to floor`, 'success');
                }
            }
            // Snap to side walls
            else if (surface.userData.normal) {
                // Left wall (normal points right, +X)
                if (surface.userData.normal.x > 0.9) {
                    const targetX = surfaceBox.max.x + meshSize.x / 2 + 2;
                    const distanceToWall = Math.abs(meshBox.min.x - surfaceBox.max.x);
                    
                    if (distanceToWall < sceneInstance.snapDistance) {
                        mesh.position.x = targetX;
                        sceneInstance.log(`🧲 Snapped ${mesh.userData.name} to left wall`, 'success');
                    }
                }
                // Right wall (normal points left, -X)
                else if (surface.userData.normal.x < -0.9) {
                    const targetX = surfaceBox.min.x - meshSize.x / 2 - 2;
                    const distanceToWall = Math.abs(meshBox.max.x - surfaceBox.min.x);
                    
                    if (distanceToWall < sceneInstance.snapDistance) {
                        mesh.position.x = targetX;
                        sceneInstance.log(`🧲 Snapped ${mesh.userData.name} to right wall`, 'success');
                    }
                }
            }
        }
    }
}
