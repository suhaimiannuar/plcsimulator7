// modelTools.js - Utility Tools (Ruler, Grid, Collision Detection)

class ModelToolsManager {
    constructor() {
        this.rulerPoints = [];
        this.rulerLine = null;
        this.rulerLabel = null;
        // Note: gridHelper removed - using 3D mounting grids in modelPhysics.js
        this.collisionMeshes = new Map();
    }
    
    // ==================== RULER METHODS ====================
    
    toggleRuler(sceneInstance) {
        sceneInstance.rulerMode = !sceneInstance.rulerMode;
        
        if (!sceneInstance.rulerMode) {
            this.clearRuler(sceneInstance);
        }
        
        sceneInstance.log(`Ruler mode ${sceneInstance.rulerMode ? 'enabled' : 'disabled'}`, 'info');
    }
    
    handleRulerClick(sceneInstance, raycaster, mouse) {
        // Intersect with all objects and mounting surfaces
        const allObjects = [...sceneInstance.sceneObjects, ...sceneInstance.mountingSurfaces];
        const intersects = raycaster.intersectObjects(allObjects, true);
        
        if (intersects.length === 0) return;
        
        const point = intersects[0].point;
        this.rulerPoints.push(point);
        
        // Draw point marker
        const markerGeometry = new THREE.SphereGeometry(2, 16, 16);
        const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.position.copy(point);
        sceneInstance.scene.add(marker);
        this.rulerPoints.push(marker); // Store marker too for cleanup
        
        if (this.rulerPoints.filter(p => p instanceof THREE.Vector3).length === 2) {
            // Two points selected - draw line and show distance
            const points = this.rulerPoints.filter(p => p instanceof THREE.Vector3);
            const distance = points[0].distanceTo(points[1]);
            
            // Draw line
            const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
            const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 2 });
            this.rulerLine = new THREE.Line(lineGeometry, lineMaterial);
            sceneInstance.scene.add(this.rulerLine);
            
            // Show distance label
            sceneInstance.log(`📏 Distance: ${distance.toFixed(2)}mm`, 'success');
            
            // Create text sprite for distance
            const midPoint = new THREE.Vector3().addVectors(points[0], points[1]).multiplyScalar(0.5);
            this.createDistanceLabel(sceneInstance, midPoint, distance);
            
            // Auto-clear after showing measurement
            setTimeout(() => {
                this.clearRuler(sceneInstance);
                sceneInstance.log('Ruler cleared - click to measure again', 'info');
            }, 5000);
        }
    }
    
    createDistanceLabel(sceneInstance, position, distance) {
        // Create canvas for text
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        
        context.fillStyle = '#000000';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.font = 'Bold 24px Arial';
        context.fillStyle = '#ffffff';
        context.textAlign = 'center';
        context.fillText(`${distance.toFixed(2)}mm`, canvas.width / 2, canvas.height / 2 + 8);
        
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        this.rulerLabel = new THREE.Sprite(spriteMaterial);
        this.rulerLabel.position.copy(position);
        this.rulerLabel.scale.set(50, 12.5, 1);
        sceneInstance.scene.add(this.rulerLabel);
    }
    
    clearRuler(sceneInstance) {
        // Remove markers
        this.rulerPoints.forEach(item => {
            if (item instanceof THREE.Mesh) {
                sceneInstance.scene.remove(item);
                item.geometry.dispose();
                item.material.dispose();
            }
        });
        this.rulerPoints = [];
        
        // Remove line
        if (this.rulerLine) {
            sceneInstance.scene.remove(this.rulerLine);
            this.rulerLine.geometry.dispose();
            this.rulerLine.material.dispose();
            this.rulerLine = null;
        }
        
        // Remove label
        if (this.rulerLabel) {
            sceneInstance.scene.remove(this.rulerLabel);
            this.rulerLabel.material.map.dispose();
            this.rulerLabel.material.dispose();
            this.rulerLabel = null;
        }
    }
    
    // ==================== GRID METHODS ====================
    // Note: Grid rendering moved to modelPhysics.js (3D mounting grids)
    // These methods now only control the 3D mounting grids
    
    toggleGrid(sceneInstance) {
        sceneInstance.gridVisible = !sceneInstance.gridVisible;
        
        // Toggle 3D mounting grids
        if (sceneInstance.mountingGrids) {
            sceneInstance.mountingGrids.visible = sceneInstance.gridVisible;
        }
        
        sceneInstance.log(`Grid ${sceneInstance.gridVisible ? 'shown' : 'hidden'}`, 'info');
    }
    
    setGridSize(sceneInstance, divisions) {
        // Update 3D mounting grids
        if (sceneInstance.physicsManager) {
            sceneInstance.physicsManager.updateMountingGridSize(sceneInstance, divisions);
        }
        
        sceneInstance.log(`Grid size: ${divisions}mm`, 'info');
    }    // ==================== COLLISION DETECTION ====================
    
    checkCollisions(sceneInstance) {
        const collisionWarning = document.getElementById('collision-warning');
        const collisionDetails = document.getElementById('collision-details');
        const collidingPairs = [];
        
        // Check all pairs of objects for intersection
        for (let i = 0; i < sceneInstance.sceneObjects.length; i++) {
            for (let j = i + 1; j < sceneInstance.sceneObjects.length; j++) {
                const objA = sceneInstance.sceneObjects[i];
                const objB = sceneInstance.sceneObjects[j];
                
                if (this.checkIntersection(objA, objB)) {
                    collidingPairs.push([objA, objB]);
                }
            }
        }
        
        // Update collision highlighting
        if (collidingPairs.length > 0) {
            // Show warning
            collisionWarning.style.display = 'block';
            
            // Update warning text
            const names = collidingPairs.map(pair => 
                `${pair[0].userData.name} ↔ ${pair[1].userData.name}`
            ).join(', ');
            collisionDetails.textContent = `${collidingPairs.length} collision(s): ${names}`;
            
            // Highlight colliding objects in red
            collidingPairs.forEach(pair => {
                this.highlightCollision(pair[0], true);
                this.highlightCollision(pair[1], true);
            });
            
            // Remove highlight from non-colliding objects
            sceneInstance.sceneObjects.forEach(obj => {
                const isColliding = collidingPairs.some(pair => 
                    pair[0] === obj || pair[1] === obj
                );
                if (!isColliding) {
                    this.highlightCollision(obj, false);
                }
            });
        } else {
            // Hide warning
            collisionWarning.style.display = 'none';
            
            // Remove all collision highlights
            sceneInstance.sceneObjects.forEach(obj => {
                this.highlightCollision(obj, false);
            });
        }
    }
    
    checkIntersection(objA, objB) {
        // Get bounding boxes
        const boxA = new THREE.Box3().setFromObject(objA);
        const boxB = new THREE.Box3().setFromObject(objB);
        
        // Check if boxes intersect
        return boxA.intersectsBox(boxB);
    }
    
    highlightCollision(obj, isColliding) {
        // Apply red tint to colliding objects
        if (isColliding) {
            // Store original colors if not already stored
            if (!obj.userData.originalColors) {
                obj.userData.originalColors = [];
                obj.traverse((child) => {
                    if (child instanceof THREE.Mesh && child.material) {
                        if (Array.isArray(child.material)) {
                            obj.userData.originalColors.push(child.material.map(m => m.color.clone()));
                        } else {
                            obj.userData.originalColors.push(child.material.color.clone());
                        }
                    }
                });
            }
            
            // Apply red tint
            obj.traverse((child) => {
                if (child instanceof THREE.Mesh && child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => {
                            mat.color.set(0xff3333); // Red
                            mat.emissive.set(0x660000); // Dark red glow
                            mat.emissiveIntensity = 0.5;
                        });
                    } else {
                        child.material.color.set(0xff3333);
                        if (child.material.emissive) {
                            child.material.emissive.set(0x660000);
                            child.material.emissiveIntensity = 0.5;
                        }
                    }
                }
            });
        } else {
            // Restore original colors
            if (obj.userData.originalColors) {
                let colorIndex = 0;
                obj.traverse((child) => {
                    if (child instanceof THREE.Mesh && child.material) {
                        if (Array.isArray(child.material)) {
                            const originalColors = obj.userData.originalColors[colorIndex];
                            if (originalColors) {
                                child.material.forEach((mat, i) => {
                                    mat.color.copy(originalColors[i]);
                                    if (mat.emissive) {
                                        mat.emissive.set(0x000000);
                                        mat.emissiveIntensity = 0;
                                    }
                                });
                            }
                        } else {
                            const originalColor = obj.userData.originalColors[colorIndex];
                            if (originalColor) {
                                child.material.color.copy(originalColor);
                                if (child.material.emissive) {
                                    child.material.emissive.set(0x000000);
                                    child.material.emissiveIntensity = 0;
                                }
                            }
                        }
                        colorIndex++;
                    }
                });
                delete obj.userData.originalColors;
            }
        }
    }
}
