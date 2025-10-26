# Mounting System & Navigation Guide

## Overview
The 3D modeling view now enforces realistic mounting constraints and provides advanced navigation controls.

## Mounting System Rules

### 1. Components Require Mounting
- **NO components can be added without a mounting surface**
- When attempting to add a component without mounting, you'll see:
  ```
  ❌ Cannot add component: No mounting surface available. Please add a mounting surface first.
  ```

### 2. Mounting Types & Surface Rules

#### **Plate** (Floor Only)
- Components snap to the **top surface only**
- Best for: Floor-mounted equipment
- Dimensions: Width × Length × Thickness

#### **Box** (4 Walls + Floor)
- Components can mount on:
  - Bottom (floor)
  - Back wall (vertical)
  - Left wall (vertical)
  - Right wall (vertical)
  - Front wall (vertical)
- Best for: Control cabinets, electrical enclosures
- Dimensions: Width × Length × Height × Wall Thickness

#### **Shelf** (1 Wall + 1 Floor)
- Components can mount on:
  - Wall (vertical)
  - Shelf surface (horizontal)
- Best for: Wall-mounted panels with shelf
- Dimensions: Wall Width × Wall Height × Shelf Depth × Thickness

#### **DIN Rail**
- Components auto-align along the rail
- All items must be aligned on the DIN rail axis
- Perfect for: PLC modules, circuit breakers, power supplies
- Dimensions: Length

### 3. Collision Detection
- **Mounting surfaces cannot overlap**
- When adding a mounting that collides:
  ```
  ❌ Cannot add mounting: Collision detected with existing mounting
  ```

### 4. Snap-to-Surface Behavior
- Components automatically snap to nearest mounting point
- Snap distance: Within 200 units
- Surface normals determine component orientation:
  - **Floor/Shelf**: Component sits upright (normal: +Y)
  - **Walls**: Component mounts flat against wall
  - **DIN Rail**: Component aligns along rail axis

## ViewCube Navigation

### Location
Top-right corner of 3D viewport

### Features

#### 1. **Interactive Cube**
- Click on any face to orient camera to that view
- Faces are color-coded:
  - **Red**: Left/Right (X-axis)
  - **Green**: Top/Bottom (Y-axis)
  - **Blue**: Front/Back (Z-axis)

#### 2. **Quick View Buttons**
- **⬆️ Top**: Overhead view (looking down Y-axis)
- **◀️ Front**: Front view (looking along Z-axis)
- **▶️ Right**: Side view (looking along X-axis)
- **🔄 Iso**: Isometric view (default perspective)

#### 3. **Smooth Camera Animation**
- 600ms ease-out transition
- Automatically updates orbit controls target

## Adding Mountings

### UI Controls (Bottom-left corner)

1. **Select Type**: Choose mounting type from dropdown
2. **Set Dimensions**: Adjust width, length, height
3. **Click "➕ Add Mounting"**

### Programmatically

```javascript
// Add a plate
const plate = window.modelScene.addMountingSurface('plate', {
    width: 800,
    length: 600,
    thickness: 2
}, { x: 0, y: 0, z: 0 });

// Add a DIN rail on the plate
const dinRail = window.modelScene.addMountingSurface('din-rail', {
    length: 500
}, { x: 0, y: 50, z: -100 });

// Add a box enclosure
const box = window.modelScene.addMountingSurface('box', {
    width: 400,
    length: 600,
    height: 300,
    wallThickness: 2
}, { x: 500, y: 0, z: 0 });
```

## Adding Components

Components will now automatically:
1. **Validate** mounting surface exists
2. **Find nearest** snap point
3. **Snap to surface** at exact mounting point
4. **Orient correctly** based on surface normal

```javascript
// This will snap to nearest mounting
const cpu = window.modelScene.addPLCComponent('cpu', {
    x: 0,
    y: 50,
    z: -100
});

// Field devices also snap
const motor = window.modelScene.addFieldDevice('motor', {
    x: 250,
    y: 50,
    z: 0
});
```

## Validation Messages

### Success
```
✅ Mounting surface added: plate {x: 0, y: 0, z: 0}
✅ Component added and snapped to mounting: PLC CPU
```

### Errors
```
❌ Cannot add component: No mounting surface available. Please add a mounting surface first.
❌ Position too far from mounting surface. Move closer to snap.
❌ Cannot add mounting: Collision detected with existing mounting
```

## Best Practices

1. **Start with a base mounting** (plate or box)
2. **Add DIN rails** on top of plates for PLC modules
3. **Use walls** for panel-mounted devices (buttons, indicators)
4. **Check spacing** before adding multiple mountings
5. **Use ViewCube** to inspect from all angles

## Example Workflow

```javascript
// 1. Add base plate
const plate = window.modelScene.addMountingSurface('plate', {
    width: 1000,
    length: 800,
    thickness: 2
}, { x: 0, y: 0, z: 0 });

// 2. Add DIN rail for PLC modules
const rail = window.modelScene.addMountingSurface('din-rail', {
    length: 500
}, { x: 0, y: 50, z: 0 });

// 3. Add control box for field devices
const controlBox = window.modelScene.addMountingSurface('box', {
    width: 300,
    height: 400,
    length: 200,
    wallThickness: 2
}, { x: 600, y: 0, z: 0 });

// 4. Add components - they auto-snap!
const cpu = window.modelScene.addPLCComponent('cpu', { x: 0, y: 50, z: 0 });
const button = window.modelScene.addFieldDevice('button', { x: 600, y: 200, z: -100 });

// 5. Use ViewCube to inspect
// Click "Top" to see overhead layout
// Click "Front" to verify heights
```

## Technical Details

### Snap Grid
- Default grid size: 25mm (from `MODEL_CONFIG.snapGrid.size`)
- All snap points are pre-calculated on mounting creation
- Grid covers entire mounting surface

### Collision Detection
- Uses Three.js `Box3.intersectsBox()` for AABB collision
- Bounding boxes calculated per mounting type
- Checked before mounting is added to scene

### Surface Normals
- **Floor**: `{x: 0, y: 1, z: 0}`
- **Back Wall**: `{x: 0, y: 0, z: 1}`
- **Left Wall**: `{x: 1, y: 0, z: 0}`
- **Right Wall**: `{x: -1, y: 0, z: 0}`
- DIN Rails automatically handle orientation

## Troubleshooting

**Q: Component won't add**  
A: Make sure you have at least one mounting surface. Check console for validation messages.

**Q: Component is floating**  
A: This shouldn't happen anymore! All components snap to mounting surfaces. If you see this, it's a bug.

**Q: Can't add second mounting**  
A: Check if mountings are overlapping. Move them apart or adjust dimensions.

**Q: ViewCube not visible**  
A: Check that `viewCube.js` is loaded and ViewCube is initialized in `init.js`.

**Q: Camera won't animate**  
A: Make sure OrbitControls is loaded (Three.js addon required).
