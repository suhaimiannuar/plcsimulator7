# 3D Model Code Refactoring Plan

## Analysis Summary

### Current State (index.html)
- **Total Lines**: ~4,370 lines
- **3D Model Code**: ~3,530 lines (lines 833-4363)
- **Percentage**: ~80% of file is 3D model related

### Code Components Identified

#### 1. **Interactive3DScene Class** (Lines 833-3305, ~2,472 lines)
**Purpose**: Main 3D scene manager for assembly view
**Features**:
- Scene setup (camera, renderer, lighting)
- Physics integration (Rapier.js)
- Object loading (STL/OBJ/MTL)
- Transform controls & selection
- Mounting structure (box/plate/shelf)
- Grid system with custom line segments
- Ruler measurement tool
- Port editor system
- Wiring system with THREE.CatmullRomCurve3
- Collision detection
- Save/Load layout
- Custom model upload to localStorage

#### 2. **STLModelCatalog Class** (Lines 3312-3357, ~45 lines)
**Purpose**: Load and manage model catalog from JSON
**Features**:
- Fetch catalog.json
- Fallback models
- Model data management

#### 3. **init3DViewer Function** (Lines 3359-3588, ~229 lines)
**Purpose**: Initialize Interactive3DScene
**Features**:
- Create viewer instance
- Setup event listeners for mounting controls
- Setup view switching (2D/3D)
- Setup grid controls
- Setup ruler/port editor

#### 4. **loadModelButtons Function** (Lines 3591-3637, ~46 lines)
**Purpose**: Generate catalog model buttons
**Features**:
- Load catalog
- Create DOM buttons
- Handle model loading clicks

#### 5. **setupCustomModelUpload Function** (Lines 3639-3662, ~23 lines)
**Purpose**: Setup STL/OBJ upload handlers
**Features**:
- Wire upload button events
- Refresh custom model list

#### 6. **setupWireSystem Function** (Lines 3665-3694, ~29 lines)
**Purpose**: Setup wiring button handlers
**Features**:
- Toggle wire mode
- Clear wires
- Export wire list

#### 7. **PortConfigViewer Class** (Lines 3712-4288, ~576 lines)
**Purpose**: Separate 3D viewer for port configuration
**Features**:
- Dedicated Three.js scene
- Model selection
- Port placement on surfaces
- Port management (add/edit/delete)
- Save/Load port configs

#### 8. **initPortConfigViewer Function** (Lines 4288-4363, ~75 lines)
**Purpose**: Initialize port config viewer
**Features**:
- Create PortConfigViewer instance
- Load model catalog
- Setup button handlers

---

## Logical Grouping Plan

### Group 1: Core 3D Scene (`Interactive3DScene.js`)
**Size**: ~2,500 lines
**Contains**:
- Interactive3DScene class (main scene manager)
- All scene management methods
- Physics integration
- Object manipulation
- Grid, ruler, ports, wires

### Group 2: Port Configuration (`PortConfigViewer.js`)
**Size**: ~650 lines
**Contains**:
- PortConfigViewer class
- Port configuration UI logic
- Port management methods

### Group 3: Model Catalog (`ModelCatalog.js`)
**Size**: ~50 lines
**Contains**:
- STLModelCatalog class
- Catalog loading logic

### Group 4: Viewer Initialization (`viewerInit.js`)
**Size**: ~400 lines
**Contains**:
- init3DViewer function
- loadModelButtons function
- setupCustomModelUpload function
- setupWireSystem function
- initPortConfigViewer function
- Event listener setup

---

## Implementation Strategy

### Phase 1: Duplicate to New Files (NO DELETION)
1. ✅ Create `/js/model/` directory
2. Create 4 new JavaScript files
3. Copy code to respective files
4. Add proper module structure
5. Keep ALL code in index.html (no deletion yet)

### Phase 2: Verification
1. Load new JS files in index.html
2. Test all 3D functionality
3. Test port configuration
4. Test save/load
5. Test wiring system
6. Verify no regressions

### Phase 3: Refactor index.html (CAREFUL DELETION)
1. Comment out duplicated code in index.html
2. Test thoroughly
3. If successful, remove commented code
4. Add script tags for new modules
5. Final testing

---

## File Structure

```
js/model/
├── Interactive3DScene.js      # Main 3D scene class (~2,500 lines)
├── PortConfigViewer.js         # Port configuration viewer (~650 lines)
├── ModelCatalog.js             # Model catalog loader (~50 lines)
└── viewerInit.js               # Initialization & setup (~400 lines)
```

---

## Dependencies

### Required External Libraries
- THREE.js (r128)
- THREE.STLLoader
- THREE.OBJLoader
- THREE.MTLLoader
- THREE.OrbitControls
- THREE.TransformControls
- Rapier Physics Engine

### Internal Dependencies
- Global variables:
  - `viewer3D` (Interactive3DScene instance)
  - `portConfigViewer` (PortConfigViewer instance)
  - `catalog` (STLModelCatalog instance)

### DOM Elements Required
- Model viewer container
- Port config container
- Various control buttons
- Status displays

---

## Testing Checklist

### Main 3D Viewer
- [ ] Load STL models
- [ ] Load OBJ+MTL models
- [ ] Upload custom models
- [ ] Select and move objects
- [ ] Physics simulation
- [ ] 2D/3D view switching
- [ ] Grid toggle and resize
- [ ] Ruler measurement
- [ ] Port editor
- [ ] Wiring system
- [ ] Save layout
- [ ] Load layout
- [ ] Collision detection

### Port Config Viewer
- [ ] Load models
- [ ] Click to add ports
- [ ] Edit port labels
- [ ] Delete ports
- [ ] Save port config
- [ ] Load port config
- [ ] Clear all ports

---

## Current Status
- ✅ Analysis Complete
- ✅ Directory Created
- ⏳ Phase 1: Duplication (IN PROGRESS)
- ⏸️ Phase 2: Verification (PENDING)
- ⏸️ Phase 3: Refactoring (PENDING)
