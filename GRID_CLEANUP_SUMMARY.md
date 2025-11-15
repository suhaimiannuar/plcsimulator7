# Grid System Cleanup Summary

## Changes Made

### ✅ **Kept: 3D Mounting Grid System** (Primary Grid)
**Location**: `js/model/modelPhysics.js`

- **Purpose**: Physical 3D grid lines painted on mounting surfaces
- **Features**:
  - Grids on floor, back wall, left wall, right wall
  - Fixed physical dimensions (doesn't scale with zoom)
  - Resizable via slider (5-50mm in 5mm steps)
  - Toggle visibility with "Show Grid" checkbox
- **Methods**:
  - `addMountingGrids()` - Create grid lines on surfaces
  - `createSurfaceGrid()` - Draw grid on specific plane
  - `updateMountingGridSize()` - Resize grids dynamically

### ✅ **Kept: Grid Snapping Utilities**
**Location**: `js/drawing/gridSystem.js` (simplified to 47 lines)

- **Purpose**: Snap wire waypoints to grid for clean routing
- **Features**:
  - `snapToGrid(value)` - Snap single value
  - `snapPoint(point)` - Snap 2D point
  - `snapPoint3D(point)` - Snap 3D point
  - `setGridSize(size)` - Update snap grid size
- **Note**: No drawing code, only mathematical snapping

### ✅ **Kept: Ladder Diagram Grid**
**Location**: `js/ladder/` directory

- **Purpose**: Separate grid system for ladder logic diagrams
- **Note**: Independent system, not related to 3D mounting grids

---

## ❌ **Removed: Redundant Systems**

### 1. **Old 3D Grid Helper** 
**Location**: `js/model/modelTools.js`

**Removed**:
- `updateGrid()` method (70+ lines)
- `this.gridHelper` property
- Floor-only grid creation using THREE.BufferGeometry
- Manual vertex calculations for grid lines

**Replaced with**: 3D mounting grids in modelPhysics.js

### 2. **2D Canvas Grid Drawing**
**Location**: `js/drawing/gridSystem.js`

**Removed**:
- `drawGrid()` method (~170 lines)
- `drawGridInfo()` method
- Canvas projection and drawing logic
- Mounting boundary calculations
- All visual grid properties (colors, opacity, etc.)

**Kept**: Only snapping utilities (reduced from 253 to 47 lines)

### 3. **Wire Routing Grid State**
**Location**: `js/drawing/wireRoutingInit.js`

**Removed**:
- `this.showGrid` property
- Grid visibility console logs
- Local grid toggle handler

**Replaced with**: Delegation to 3D scene's toggleGrid()

---

## Current Grid Architecture

```
┌─────────────────────────────────────┐
│   3D MOUNTING GRIDS (PRIMARY)       │
│   - modelPhysics.js                 │
│   - Visual grid on surfaces         │
│   - Resizable, toggleable           │
└─────────────┬───────────────────────┘
              │
              │ Controls
              │
┌─────────────▼───────────────────────┐
│   GRID CONTROLS                     │
│   - modelTools.js                   │
│   - toggleGrid()                    │
│   - setGridSize()                   │
└─────────────┬───────────────────────┘
              │
              │ Uses
              │
┌─────────────▼───────────────────────┐
│   GRID SNAPPING UTILITIES           │
│   - gridSystem.js                   │
│   - Wire waypoint snapping          │
│   - Mathematical functions only     │
└─────────────────────────────────────┘
```

---

## Benefits

1. **No Duplication**: Single source of truth for visual grids
2. **Better Performance**: One grid system instead of multiple overlapping systems
3. **Cleaner Code**: Reduced from ~400 lines to ~200 lines of grid-related code
4. **Consistent Behavior**: Grid always matches mounting structure
5. **Easier Maintenance**: Changes to grid only need to be made in one place

---

## Usage

### Toggle Grid
```javascript
// In 3D view
viewer3D.toggleGrid();

// In wire routing mode (press 'G' or use checkbox)
```

### Resize Grid
```javascript
// Via slider (5-50mm)
viewer3D.setGridSize(10); // 10mm grid

// Or via modelPhysics directly
physicsManager.updateMountingGridSize(sceneInstance, 15);
```

### Snap Points (Wire Routing)
```javascript
const snappedPoint = gridSystem.snapPoint3D({x: 23.4, y: 56.7, z: 89.1});
// Returns: {x: 20, y: 60, z: 90} (if gridSize=10)
```

---

## Files Modified

- ✅ `js/model/modelPhysics.js` - Added 3D mounting grid system
- ✅ `js/model/modelTools.js` - Simplified grid methods (removed old grid helper)
- ✅ `js/drawing/gridSystem.js` - Removed drawing code, kept snapping only
- ✅ `js/drawing/wireRoutingInit.js` - Removed local grid state, delegate to 3D scene
- ✅ `index.html` - Updated grid size slider (5-50mm, shows "mm" suffix)

## Backup Files

- `js/drawing/gridSystem.js.backup` - Original file with drawing code (for reference)
