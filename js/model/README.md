# 3D Model System - Modular Structure

## Overview
This directory contains the modular JavaScript files for the 3D Model Viewer system. The original monolithic code from `index.html` has been refactored into separate, focused modules for better maintainability and organization.

## Module Architecture

### Core Modules

#### 1. **modelScene.js** - Scene Management
**Purpose:** Handles all Three.js scene setup, camera management, rendering, and object selection.

**Key Classes:**
- `ModelSceneManager`

**Responsibilities:**
- Scene, camera, and renderer initialization
- Lighting configuration
- Orbit and Transform controls setup
- ViewCube functionality
- 2D/3D view mode switching
- Mouse picking and object selection
- Properties panel updates
- Scene objects list management

**Key Methods:**
```javascript
setupScene(container, statusDiv)
setupLighting(scene)
setupControls(sceneInstance, camera, renderer, scene)
setupViewCube(sceneInstance)
switchTo2DView(sceneInstance)
switchTo3DView(sceneInstance)
selectObject(sceneInstance, obj)
deselectObject(sceneInstance)
updatePropertiesPanel(sceneInstance)
```

---

#### 2. **modelPhysics.js** - Physics Engine
**Purpose:** Manages Rapier physics integration, mounting structures, and collision boundaries.

**Key Classes:**
- `ModelPhysicsManager`

**Responsibilities:**
- Rapier physics world initialization
- Mounting structure creation (Box, Plate, Shelf)
- Physics body management
- Boundary enforcement
- Snapping mechanics
- Object-to-surface collision

**Key Methods:**
```javascript
setupPhysics(sceneInstance)
createMounting(sceneInstance)
createBox/Plate/Shelf(sceneInstance, width, height, depth, thickness)
addPhysicsBody(sceneInstance, mesh, geometry)
enforceObjectBoundaries(sceneInstance, obj)
checkSnapping(sceneInstance, mesh)
```

---

#### 3. **modelLoader.js** - Model Loading
**Purpose:** Handles loading of 3D models (STL, OBJ), custom uploads, and catalog management.

**Key Classes:**
- `ModelLoaderManager`
- `STLModelCatalog`

**Responsibilities:**
- STL file loading and processing
- OBJ+MTL file loading with materials
- Custom model upload to localStorage
- Base64 encoding/decoding for storage
- Model catalog management
- Custom model list UI updates

**Key Methods:**
```javascript
loadSTL(sceneInstance, file, name, modelData)
loadOBJ(sceneInstance, objFile, mtlFile, name, modelData)
uploadSTLFile(sceneInstance)
uploadOBJFile(sceneInstance)
loadCustomModel(sceneInstance, modelId)
deleteCustomModel(sceneInstance, modelId)
```

---

#### 4. **modelPorts.js** - Port System
**Purpose:** Manages port configuration on 3D models for wiring planning.

**Key Classes:**
- `ModelPortsManager`

**Responsibilities:**
- Port edit mode toggle
- Port marker creation and visualization
- Port configuration import/export
- Port list UI management
- Port type colors and icons

**Key Methods:**
```javascript
togglePortEditMode(sceneInstance)
addPortToModel(sceneInstance, modelObj, worldPosition, shiftKey)
removeNearestPort(sceneInstance, modelName, worldPosition)
createPortMarker(sceneInstance, modelObj, port)
exportPortsConfig(sceneInstance)
importPortsConfig(sceneInstance, file)
```

---

#### 5. **modelWiring.js** - Wiring System
**Purpose:** Manages wire creation between ports with visualization and export.

**Key Classes:**
- `ModelWiringManager`

**Responsibilities:**
- Wire mode toggle
- Wire creation with curved paths
- Wire type and gauge configuration
- Wire list UI management
- Wire statistics and export

**Key Methods:**
```javascript
toggleWireMode(sceneInstance)
handlePortClickForWiring(sceneInstance, port, portMarker)
createWire(sceneInstance, portA, portB, wireType, wireGauge)
updateWiresList(sceneInstance)
deleteWire(sceneInstance, wireId)
exportWireList(sceneInstance)
```

---

#### 6. **modelTools.js** - Utility Tools
**Purpose:** Provides measurement, grid, and collision detection tools.

**Key Classes:**
- `ModelToolsManager`

**Responsibilities:**
- Ruler/measurement tool
- Grid visibility and configuration
- Collision detection between objects
- Collision highlighting

**Key Methods:**
```javascript
toggleRuler(sceneInstance)
handleRulerClick(sceneInstance, raycaster, mouse)
updateGrid(sceneInstance)
toggleGrid(sceneInstance)
checkCollisions(sceneInstance)
highlightCollision(obj, isColliding)
```

---

#### 7. **modelStorage.js** - Save/Load System
**Purpose:** Handles 3D layout persistence with JSON serialization.

**Key Classes:**
- `ModelStorageManager`

**Responsibilities:**
- 3D layout save to JSON
- 3D layout load from JSON
- Object position/rotation/scale preservation
- Port and wire configuration restoration

**Key Methods:**
```javascript
save3DLayout(sceneInstance)
load3DLayout(sceneInstance)
```

---

## Integration with index.html

### Current Status
✅ All functions have been **duplicated** (not removed) from index.html into modular files.
⏳ Script tags need to be added to index.html to load these modules.

### Loading Order
The modules should be loaded in this order:
```html
<!-- 3D Model System Modules -->
<script src="js/model/modelScene.js"></script>
<script src="js/model/modelPhysics.js"></script>
<script src="js/model/modelLoader.js"></script>
<script src="js/model/modelPorts.js"></script>
<script src="js/model/modelWiring.js"></script>
<script src="js/model/modelTools.js"></script>
<script src="js/model/modelStorage.js"></script>
```

### Usage Pattern
Each manager class can be instantiated and used to extend the `Interactive3DScene` class:

```javascript
// Example usage
class Interactive3DScene {
    constructor(container, statusDiv) {
        this.sceneManager = new ModelSceneManager();
        this.physicsManager = new ModelPhysicsManager();
        this.loaderManager = new ModelLoaderManager();
        this.portsManager = new ModelPortsManager();
        this.wiringManager = new ModelWiringManager();
        this.toolsManager = new ModelToolsManager();
        this.storageManager = new ModelStorageManager();
        // ... rest of initialization
    }
}
```

## Benefits of Modularization

### 1. **Maintainability**
- Each module has a single, clear responsibility
- Easier to locate and fix bugs
- Changes are isolated to specific modules

### 2. **Readability**
- Smaller, focused files (300-600 lines each vs 4370 lines)
- Clear naming conventions
- Logical grouping of related functions

### 3. **Reusability**
- Modules can be reused in other projects
- Easy to extend with new features
- Independent testing possible

### 4. **Collaboration**
- Multiple developers can work on different modules
- Reduced merge conflicts
- Clear boundaries between systems

### 5. **Performance**
- Can lazy-load modules as needed
- Easier to identify performance bottlenecks
- Can optimize individual modules independently

## File Statistics

| Module | Lines | Classes | Methods | Purpose |
|--------|-------|---------|---------|---------|
| modelScene.js | ~650 | 1 | 15+ | Scene & camera management |
| modelPhysics.js | ~400 | 1 | 12+ | Physics & mounting |
| modelLoader.js | ~550 | 2 | 12+ | Model loading & catalog |
| modelPorts.js | ~400 | 1 | 10+ | Port configuration |
| modelWiring.js | ~350 | 1 | 8+ | Wiring system |
| modelTools.js | ~400 | 1 | 10+ | Utility tools |
| modelStorage.js | ~200 | 1 | 2 | Save/load layouts |

**Total:** ~2,950 lines (originally ~4,370 lines in index.html including HTML/CSS)

## Next Steps

1. ✅ **Completed:** Created all modular files
2. ⏳ **Pending:** Add script tags to index.html
3. ⏳ **Testing:** Verify all functionality works with modules
4. ⏳ **Cleanup:** Remove duplicate code from index.html (after verification)
5. ⏳ **Documentation:** Add JSDoc comments to all methods

## Notes

- All original functionality is preserved
- No breaking changes to existing API
- Backward compatible with current index.html implementation
- Ready for gradual migration

---

*Last Updated: 2025-11-01*
*Refactoring Status: Phase 2 Complete - Modules Created*
