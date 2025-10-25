# Component Transform & External Model Loading

## Overview

Enhanced the 3D model system with:
1. **Independent component files** - Each field device in its own file
2. **External 3D model support** - Load OBJ/MTL and STL files from CAD software
3. **Transform controls** - Rotate, translate, and scale components
4. **Grid/Axes visibility** - Toggle helpers on/off

---

## Component Files Structure

### Separated Field Devices

Each component now has its own independent file:

```
js/model/components/
├── plc.js          # PLC modules (CPU, I/O, Power Supply, Terminals)
├── wire.js         # Wire and cable duct
├── button.js       # Push button component
├── motor.js        # Motor component  
└── led.js          # LED indicator component
```

**Benefits:**
- Easier to maintain and update individual components
- Can load/unload components on demand
- Better code organization
- Simpler to add new component types

---

## External 3D Model Loading

### Supported Formats

1. **OBJ + MTL** - Wavefront Object with Material
2. **STL** - Stereolithography (common CAD export)

### Usage

#### Load OBJ Model
```javascript
const button = modelScene.addFieldDevice('button', {x: 0, y: 50, z: 0});

// OBJ only
await modelScene.loadComponentModel(button, 'models/button.obj', 'obj');

// OBJ with MTL
await modelScene.loadComponentModel(button, {
    obj: 'models/button.obj',
    mtl: 'models/button.mtl'
}, 'obj');
```

#### Load STL Model
```javascript
const motor = modelScene.addFieldDevice('motor', {x: 100, y: 50, z: 0});

await modelScene.loadComponentModel(motor, 'models/motor.stl', 'stl');
```

#### Component Method
```javascript
// Direct component method
await button.loadExternalModel('models/button.obj', 'obj');
await motor.loadExternalModel('models/motor.stl', 'stl');
```

### CAD Software Export

#### From SolidWorks:
1. File → Save As → OBJ or STL
2. Set units to millimeters
3. Export with materials (for OBJ)

#### From Fusion 360:
1. Right-click component → Save As STL/OBJ
2. Set refinement to High
3. Select mm as units

#### From Blender:
1. File → Export → Wavefront (.obj) or STL
2. Enable "Include Materials" for OBJ
3. Set scale to 0.001 (for mm)

### Best Practices

**File Size:**
- Keep models under 5MB for web performance
- Use medium detail level (not ultra-high poly)
- Typical range: 10k-50k polygons per model

**Scale:**
- Models should be in millimeters
- Button: ~30mm diameter
- Motor: ~150mm height
- LED: ~22mm diameter

**Materials:**
- For OBJ: Include MTL file for colors/textures
- For STL: Material will be auto-applied (metallic gray)

---

## Transform Controls

### Available Modes

1. **Translate** (Move) - Position the component
2. **Rotate** - Rotate around axes
3. **Scale** - Resize the component

### Using Transform Controls

#### In Main App (index.html)

**UI Controls:**
```html
<select id="transformMode">
    <option value="translate">Move</option>
    <option value="rotate">Rotate</option>
    <option value="scale">Scale</option>
</select>
```

**Set Mode:**
```javascript
// Set to translate mode
modelScene.setTransformMode('translate');

// Set to rotate mode
modelScene.setTransformMode('rotate');

// Set to scale mode
modelScene.setTransformMode('scale');
```

**Select Component:**
```javascript
// Click on component or select programmatically
const cpu = modelScene.plcComponents[0];
modelScene.selectComponent(cpu);

// Deselect
modelScene.deselectComponent();
```

#### Keyboard Shortcuts

When TransformControls are active:
- **T** - Switch to translate mode
- **R** - Switch to rotate mode  
- **S** - Switch to scale mode
- **+** - Increase transform size
- **-** - Decrease transform size
- **X/Y/Z** - Lock to specific axis

#### Manual Transform

```javascript
// Rotate component
modelScene.rotateComponent(
    Math.PI / 4,  // X rotation (45°)
    0,            // Y rotation
    0             // Z rotation
);

// Translate component
modelScene.translateComponent(
    50,   // X offset
    0,    // Y offset
    -20   // Z offset
);
```

#### Component Methods

```javascript
// Rotate
button.rotate(0, Math.PI / 2, 0);  // Rotate 90° around Y

// Translate
motor.translate(100, 0, 50);  // Move by offset

// Direct position/rotation
led.position = {x: 150, y: 50, z: 0};
led.rotation = {x: 0, y: Math.PI, z: 0};
```

---

## Grid & Axes Visibility

### Toggle Grid

**UI Button:**
```html
<button id="toggleGrid">Grid</button>
```

**JavaScript:**
```javascript
// Toggle (on/off)
modelScene.toggleGrid();

// Set explicitly
modelScene.toggleGrid(true);   // Show
modelScene.toggleGrid(false);  // Hide

// Get current state
const isVisible = modelScene.showGrid;
```

**Grid Specifications:**
- Size: 1000mm × 1000mm
- Divisions: 50 (20mm per division)
- Center lines: Dark gray (0x444444)
- Grid lines: Light gray (0x222222)

### Toggle Axes

**UI Button:**
```html
<button id="toggleAxes">Axes</button>
```

**JavaScript:**
```javascript
// Toggle (on/off)
modelScene.toggleAxes();

// Set explicitly
modelScene.toggleAxes(true);   // Show
modelScene.toggleAxes(false);  // Hide

// Get current state
const isVisible = modelScene.showAxes;
```

**Axes Specifications:**
- Length: 200mm each
- Red: X-axis (right)
- Green: Y-axis (up)
- Blue: Z-axis (forward)

### Use Cases

**Design Phase:**
- Grid ON - Helps with alignment
- Axes ON - Shows orientation

**Presentation:**
- Grid OFF - Cleaner look
- Axes OFF - Focus on model

---

## Test File Usage

Open `test-3d.html` for testing:

### Test Functions

```javascript
// Toggle helpers
toggleGrid();    // Show/hide grid
toggleAxes();    // Show/hide axes

// Transform controls
testTransform(); // Activate transform on last component

// Load external model
loadExternalModel(); // Opens file picker for OBJ/STL
```

### Loading CAD Models

1. Click "Load CAD Model" button
2. Select .obj, .stl, or .mtl file
3. Model loads into a test button component
4. Use transform controls to position

---

## Complete Example

```javascript
// Create scene
window.addEventListener('DOMContentLoaded', function() {
    modelScene = new ModelScene('model-container');
    
    // Add mounting
    const plate = modelScene.addMountingSurface('plate', {
        width: 600, length: 400, thickness: 2
    });
    
    // Add motor
    const motor = modelScene.addFieldDevice('motor', {
        x: 0, y: 100, z: 0
    }, { power: 1500 });
    
    // Load external CAD model for motor
    await modelScene.loadComponentModel(
        motor, 
        'models/motor.stl', 
        'stl'
    );
    
    // Position motor
    motor.rotate(0, Math.PI / 2, 0);  // Rotate 90°
    motor.translate(50, 0, -50);       // Move position
    
    // Or use transform controls
    modelScene.selectComponent(motor);
    modelScene.setTransformMode('translate');
    
    // Toggle helpers
    modelScene.toggleGrid(true);   // Show grid
    modelScene.toggleAxes(false);  // Hide axes
});
```

---

## API Reference

### ModelScene Methods

```javascript
// Transform controls
setTransformMode(mode)              // 'translate', 'rotate', 'scale'
selectComponent(component)          // Attach transform controls
deselectComponent()                 // Detach transform controls
rotateComponent(x, y, z)           // Rotate selected (radians)
translateComponent(x, y, z)        // Move selected (mm)

// External models
loadComponentModel(component, url, format)  // Load OBJ/STL

// Helpers
toggleGrid(visible)                // Show/hide grid
toggleAxes(visible)                // Show/hide axes
```

### Component Methods

```javascript
// All components (PushButton, Motor, LEDIndicator)
rotate(x, y, z)                    // Set rotation (radians)
translate(x, y, z)                 // Translate by offset (mm)
loadExternalModel(url, format)     // Load OBJ/STL model
```

---

## Notes

### Performance

- External models are cloned when added to scene
- Large STL files may cause slowdown
- Recommended: < 50k polygons per model

### File Loading

- Models must be accessible via HTTP(S)
- Local files require file picker or server
- CORS must be enabled for external URLs

### Transform Persistence

- Transforms are stored in component.position and component.rotation
- Can save/load with diagram data
- Transform controls update both mesh and component data

---

## Future Enhancements

1. **GLTF/GLB Support** - Better for textured models
2. **Model Library** - Pre-made component models
3. **Snap to Grid** - Auto-align when moving
4. **Collision Detection** - Prevent overlapping
5. **Export Scene** - Save entire 3D layout
6. **Animation Export** - Record assembly process
