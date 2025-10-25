// ===== Mounting System - Gravity & Snap Reference =====

class MountingBase {
    constructor(dimensions = {}) {
        this.id = `mount_${Date.now()}`;
        this.type = 'base';
        this.dimensions = dimensions;
        this.position = { x: 0, y: 0, z: 0 };
        this.rotation = { x: 0, y: 0, z: 0 };
        this.components = []; // Components attached to this mounting
        this.snapPoints = []; // Auto-generated snap locations
    }
    
    // Calculate gravity reference (surface normal direction)
    getGravityDirection() {
        // Default: Y-up (components snap down to surface)
        return { x: 0, y: -1, z: 0 };
    }
    
    // Get surface points for component placement
    getSurfacePoints() {
        return [];
    }
    
    // Add component to this mounting surface
    attachComponent(component, snapPoint) {
        component.mountingSurface = this;
        component.snapPoint = snapPoint;
        this.components.push(component);
        return true;
    }
    
    // Remove component
    detachComponent(component) {
        const index = this.components.indexOf(component);
        if (index > -1) {
            this.components.splice(index, 1);
            component.mountingSurface = null;
            component.snapPoint = null;
            return true;
        }
        return false;
    }
    
    // Generate Three.js mesh
    createMesh() {
        return null; // Override in subclasses
    }
}

// ===== PLATE - Simple Flat Mounting Surface =====
class MountingPlate extends MountingBase {
    constructor(width = 400, length = 600, thickness = 2) {
        super({ width, length, thickness });
        this.type = 'plate';
        this.generateSnapGrid();
    }
    
    generateSnapGrid() {
        this.snapPoints = [];
        const gridSize = MODEL_CONFIG.snapGrid.size;
        
        // Generate grid across the plate surface
        for (let x = 0; x < this.dimensions.width; x += gridSize) {
            for (let z = 0; z < this.dimensions.length; z += gridSize) {
                this.snapPoints.push({
                    x: x - this.dimensions.width / 2,
                    y: this.dimensions.thickness / 2, // Top surface
                    z: z - this.dimensions.length / 2,
                    normal: { x: 0, y: 1, z: 0 } // Surface points up
                });
            }
        }
    }
    
    getSurfacePoints() {
        return this.snapPoints;
    }
    
    // Find nearest snap point to given position
    findNearestSnapPoint(position) {
        let nearest = null;
        let minDist = Infinity;
        
        for (const snap of this.snapPoints) {
            const dx = position.x - snap.x;
            const dz = position.z - snap.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            
            if (dist < minDist) {
                minDist = dist;
                nearest = snap;
            }
        }
        
        return nearest;
    }
    
    createMesh() {
        if (typeof THREE === 'undefined') return null;
        
        const geometry = new THREE.BoxGeometry(
            this.dimensions.width,
            this.dimensions.thickness,
            this.dimensions.length
        );
        
        const material = new THREE.MeshStandardMaterial({
            color: MODEL_CONFIG.colors.materials.plate,
            metalness: 0.3,
            roughness: 0.7
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData.mounting = this;
        
        return mesh;
    }
}

// ===== BOX - 4 Walls with Bottom Plate (Open Top) =====
class MountingBox extends MountingBase {
    constructor(width = 400, length = 600, height = 300, wallThickness = 2) {
        super({ width, length, height, wallThickness });
        this.type = 'box';
        this.walls = {
            bottom: null,
            front: null,
            back: null,
            left: null,
            right: null
        };
        this.generateSnapGrid();
    }
    
    generateSnapGrid() {
        this.snapPoints = [];
        const gridSize = MODEL_CONFIG.snapGrid.size;
        const { width, length, height, wallThickness } = this.dimensions;
        
        // Bottom plate snap points (inside the box)
        for (let x = 0; x < width - 2 * wallThickness; x += gridSize) {
            for (let z = 0; z < length - 2 * wallThickness; z += gridSize) {
                this.snapPoints.push({
                    x: x - width / 2 + wallThickness,
                    y: -height / 2 + wallThickness, // Bottom inside surface
                    z: z - length / 2 + wallThickness,
                    normal: { x: 0, y: 1, z: 0 },
                    surface: 'bottom'
                });
            }
        }
        
        // Back wall snap points (vertical mounting)
        for (let x = 0; x < width - 2 * wallThickness; x += gridSize) {
            for (let y = 0; y < height - wallThickness; y += gridSize) {
                this.snapPoints.push({
                    x: x - width / 2 + wallThickness,
                    y: y - height / 2 + wallThickness,
                    z: -length / 2 + wallThickness / 2, // Back wall inside
                    normal: { x: 0, y: 0, z: 1 },
                    surface: 'back'
                });
            }
        }
        
        // Left wall snap points
        for (let z = 0; z < length - 2 * wallThickness; z += gridSize) {
            for (let y = 0; y < height - wallThickness; y += gridSize) {
                this.snapPoints.push({
                    x: -width / 2 + wallThickness / 2,
                    y: y - height / 2 + wallThickness,
                    z: z - length / 2 + wallThickness,
                    normal: { x: 1, y: 0, z: 0 },
                    surface: 'left'
                });
            }
        }
        
        // Right wall snap points
        for (let z = 0; z < length - 2 * wallThickness; z += gridSize) {
            for (let y = 0; y < height - wallThickness; y += gridSize) {
                this.snapPoints.push({
                    x: width / 2 - wallThickness / 2,
                    y: y - height / 2 + wallThickness,
                    z: z - length / 2 + wallThickness,
                    normal: { x: -1, y: 0, z: 0 },
                    surface: 'right'
                });
            }
        }
    }
    
    getSurfacePoints() {
        return this.snapPoints;
    }
    
    // Find snap points on specific surface
    getSnapPointsOnSurface(surfaceName) {
        return this.snapPoints.filter(snap => snap.surface === surfaceName);
    }
    
    createMesh() {
        if (typeof THREE === 'undefined') return null;
        
        const group = new THREE.Group();
        const { width, length, height, wallThickness } = this.dimensions;
        const material = new THREE.MeshStandardMaterial({
            color: MODEL_CONFIG.colors.materials.plate,
            metalness: 0.3,
            roughness: 0.7,
            side: THREE.DoubleSide
        });
        
        // Bottom plate
        const bottomGeom = new THREE.BoxGeometry(width, wallThickness, length);
        const bottom = new THREE.Mesh(bottomGeom, material);
        bottom.position.y = -height / 2 + wallThickness / 2;
        group.add(bottom);
        
        // Back wall
        const backGeom = new THREE.BoxGeometry(width, height, wallThickness);
        const back = new THREE.Mesh(backGeom, material);
        back.position.z = -length / 2 + wallThickness / 2;
        group.add(back);
        
        // Front wall
        const frontGeom = new THREE.BoxGeometry(width, height, wallThickness);
        const front = new THREE.Mesh(frontGeom, material);
        front.position.z = length / 2 - wallThickness / 2;
        group.add(front);
        
        // Left wall
        const leftGeom = new THREE.BoxGeometry(wallThickness, height, length);
        const left = new THREE.Mesh(leftGeom, material);
        left.position.x = -width / 2 + wallThickness / 2;
        group.add(left);
        
        // Right wall
        const rightGeom = new THREE.BoxGeometry(wallThickness, height, length);
        const right = new THREE.Mesh(rightGeom, material);
        right.position.x = width / 2 - wallThickness / 2;
        group.add(right);
        
        group.userData.mounting = this;
        return group;
    }
}

// ===== SHELF - Wall + Shelf Combination =====
class MountingShelf extends MountingBase {
    constructor(wallWidth = 400, wallHeight = 300, shelfDepth = 200, thickness = 2) {
        super({ wallWidth, wallHeight, shelfDepth, thickness });
        this.type = 'shelf';
        this.generateSnapGrid();
    }
    
    generateSnapGrid() {
        this.snapPoints = [];
        const gridSize = MODEL_CONFIG.snapGrid.size;
        const { wallWidth, wallHeight, shelfDepth, thickness } = this.dimensions;
        
        // Wall snap points (vertical mounting)
        for (let x = 0; x < wallWidth; x += gridSize) {
            for (let y = 0; y < wallHeight - shelfDepth; y += gridSize) {
                this.snapPoints.push({
                    x: x - wallWidth / 2,
                    y: y - wallHeight / 2 + shelfDepth,
                    z: thickness / 2, // Front of wall
                    normal: { x: 0, y: 0, z: -1 },
                    surface: 'wall'
                });
            }
        }
        
        // Shelf snap points (horizontal mounting)
        for (let x = 0; x < wallWidth; x += gridSize) {
            for (let z = 0; z < shelfDepth; z += gridSize) {
                this.snapPoints.push({
                    x: x - wallWidth / 2,
                    y: -wallHeight / 2 + thickness / 2, // Top of shelf
                    z: z + thickness / 2,
                    normal: { x: 0, y: 1, z: 0 },
                    surface: 'shelf'
                });
            }
        }
    }
    
    getSurfacePoints() {
        return this.snapPoints;
    }
    
    getSnapPointsOnSurface(surfaceName) {
        return this.snapPoints.filter(snap => snap.surface === surfaceName);
    }
    
    createMesh() {
        if (typeof THREE === 'undefined') return null;
        
        const group = new THREE.Group();
        const { wallWidth, wallHeight, shelfDepth, thickness } = this.dimensions;
        const material = new THREE.MeshStandardMaterial({
            color: MODEL_CONFIG.colors.materials.plate,
            metalness: 0.3,
            roughness: 0.7,
            side: THREE.DoubleSide
        });
        
        // Back wall
        const wallGeom = new THREE.BoxGeometry(wallWidth, wallHeight, thickness);
        const wall = new THREE.Mesh(wallGeom, material);
        wall.position.z = 0;
        group.add(wall);
        
        // Shelf
        const shelfGeom = new THREE.BoxGeometry(wallWidth, thickness, shelfDepth);
        const shelf = new THREE.Mesh(shelfGeom, material);
        shelf.position.y = -wallHeight / 2 + thickness / 2;
        shelf.position.z = shelfDepth / 2 + thickness / 2;
        group.add(shelf);
        
        group.userData.mounting = this;
        return group;
    }
}

// ===== DIN Rail - Standard 35mm Mounting Rail =====
class DINRail extends MountingBase {
    constructor(length = 500) {
        super({ width: 35, height: 7.5, length });
        this.type = 'din-rail';
        this.generateSnapGrid();
    }
    
    generateSnapGrid() {
        this.snapPoints = [];
        const gridSize = MODEL_CONFIG.snapGrid.size;
        
        // Snap points along the rail length
        for (let z = 0; z < this.dimensions.length; z += gridSize) {
            this.snapPoints.push({
                x: 0,
                y: this.dimensions.height / 2,
                z: z - this.dimensions.length / 2,
                normal: { x: 0, y: 1, z: 0 },
                railPosition: z
            });
        }
    }
    
    getSurfacePoints() {
        return this.snapPoints;
    }
    
    // Snap PLC module to rail (auto-align)
    snapModule(module, position) {
        // Find nearest snap point
        const snapPoint = this.snapPoints.reduce((nearest, snap) => {
            const dist = Math.abs(snap.z - position.z);
            return dist < Math.abs(nearest.z - position.z) ? snap : nearest;
        });
        
        // Align module to rail
        module.position.x = snapPoint.x;
        module.position.y = snapPoint.y + module.dimensions.height / 2;
        module.position.z = snapPoint.z;
        
        this.attachComponent(module, snapPoint);
        return snapPoint;
    }
    
    createMesh() {
        if (typeof THREE === 'undefined') return null;
        
        // Simplified DIN rail profile
        const geometry = new THREE.BoxGeometry(
            this.dimensions.width,
            this.dimensions.height,
            this.dimensions.length
        );
        
        const material = new THREE.MeshStandardMaterial({
            color: MODEL_CONFIG.colors.materials.dinRail,
            metalness: 0.8,
            roughness: 0.2
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData.mounting = this;
        
        return mesh;
    }
}

// Export mounting classes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MountingBase,
        MountingPlate,
        MountingBox,
        MountingShelf,
        DINRail
    };
}
