# PLC 3D Model System

## Overview

The 3D modeling system provides a visual representation of the physical PLC installation, including:
- Mounting surfaces (Plate, Box, Shelf, DIN Rail)
- PLC components (CPU, I/O modules, power supply, terminals)
- Wire routing and connections
- Auto-wiring based on ladder diagram

## Architecture

### Folder Structure
```
js/
├── ladder/          # Ladder diagram logic (2D)
│   ├── config.js
│   ├── state.js
│   ├── rendering.js
│   └── ...
├── model/           # 3D modeling system
│   ├── config.js    # 3D configuration & PLC components
│   ├── mounting.js  # Mounting system classes
│   ├── scene.js     # Three.js scene management
│   ├── init.js      # 3D initialization
│   └── components/
│       ├── plc.js   # PLC component classes
│       └── wire.js  # Wire routing classes
└── shared/          # Shared utilities
    └── utils.js     # I/O mapping & auto-wire generation
```

## Mounting System

### Gravity & Snap Behavior
All PLC components reference a mounting surface as their gravity anchor. Components automatically snap to the nearest grid point on the mounting surface.

### Mounting Types

#### 1. Plate (Flat Surface)
- Simple flat mounting plate
- Customizable width × length
- Components snap to top surface
- Use case: Wall mounting, floor mounting

```javascript
const plate = modelScene.addMountingSurface('plate', {
    width: 600,    // mm
    length: 400,   // mm
    thickness: 2   // mm
});
```

#### 2. Box (4-Wall Enclosure)
- Four walls with bottom plate (open top)
- Customizable width × length × height
- Components can snap to:
  - Bottom surface (horizontal mounting)
  - Back wall (vertical DIN rail)
  - Left/right walls (additional mounting)
- Use case: Cabinet enclosure, control panel box

```javascript
const box = modelScene.addMountingSurface('box', {
    width: 400,
    length: 600,
    height: 300,
    wallThickness: 2
});
```

#### 3. Shelf (Wall + Shelf)
- One vertical wall + one horizontal shelf
- Customizable wall and shelf dimensions
- Components snap to:
  - Shelf surface (horizontal mounting)
  - Wall surface (vertical mounting)
- Use case: Open rack mounting, partial enclosure

```javascript
const shelf = modelScene.addMountingSurface('shelf', {
    wallWidth: 400,
    wallHeight: 300,
    shelfDepth: 200,
    thickness: 2
});
```

#### 4. DIN Rail (Standard 35mm)
- Standard PLC mounting rail
- Customizable length
- Auto-aligns PLC modules horizontally
- Use case: Standard PLC mounting

```javascript
const dinRail = modelScene.addMountingSurface('din-rail', {
    length: 500  // mm
});
```

## PLC Components

### Standard Components

1. **Power Supply (24V DC)**
   - Dimensions: 70mm × 125mm × 120mm
   - Terminals: L+, N, 24V+, 0V
   - Converts AC to 24V DC

2. **CPU Module (S7-1200)**
   - Dimensions: 90mm × 100mm × 75mm
   - Onboard I/O: 14 DI, 10 DQ, 2 AI, 2 AQ
   - Main controller

3. **Digital Input Module (16-CH)**
   - Dimensions: 45mm × 100mm × 75mm
   - 16 digital input channels (24V)
   - Expandable I/O

4. **Digital Output Module (16-CH)**
   - Dimensions: 45mm × 100mm × 75mm
   - 16 digital output channels (24V, 0.5A)
   - Expandable I/O

5. **Terminal Blocks (12-Position)**
   - Dimensions: 60mm × 45mm × 50mm
   - Field wiring connection points

### Adding Components

```javascript
// Add CPU module
const cpu = modelScene.addPLCComponent('cpu', {
    x: 0,
    y: 50,
    z: 0
});

// Snap to DIN rail
modelScene.snapToMounting(cpu, dinRail, { x: 0, y: 0, z: 0 });
```

## Wire System

### Wire Types
- **Power** (Red): 24VDC+ distribution
- **Ground** (Blue): 24VDC- / 0V
- **Signal** (Green): Digital I/O signals
- **Analog** (Yellow): Analog signals
- **Communication** (Magenta): Network/bus

### Auto-Wiring

```javascript
// Power distribution
autoWireGen.generatePowerWires(powerSupply, components);

// Signal wiring from ladder diagram
autoWireGen.generateSignalWires(ladderDiagram);
```

### Manual Wiring

```javascript
// Connect terminal 2 of powerSupply to terminal 0 of cpu
modelScene.addWire(powerSupply, 2, cpu, 0, 'power');
```

## Ladder Diagram Integration

### I/O Extraction

```javascript
const extractor = new LadderIOExtractor(state.diagram);
const io = extractor.extract();
// Returns: { inputs: [], outputs: [], timers: [], counters: [] }
```

### PLC Configuration Suggestion

```javascript
const suggestions = extractor.suggestPLCConfig();
// Automatically calculates required modules based on I/O count
```

### I/O Mapping

```javascript
const ioMapping = new IOMapping();

// Map ladder input "I0.0" to physical terminal
ioMapping.mapInput("I0.0", cpu, 0);

// Map ladder output "Q0.0" to physical terminal
ioMapping.mapOutput("Q0.0", cpu, 14);
```

## Usage Example

```javascript
// 1. Initialize 3D scene
initModel();

// 2. Create mounting surface
const dinRail = modelScene.addMountingSurface('din-rail', {
    length: 500
});

// 3. Add components
const powerSupply = modelScene.addPLCComponent('power-supply');
const cpu = modelScene.addPLCComponent('cpu');

// 4. Snap to mounting
modelScene.snapToMounting(powerSupply, dinRail, { x: -100, y: 0, z: 0 });
modelScene.snapToMounting(cpu, dinRail, { x: 0, y: 0, z: 0 });

// 5. Add wiring
modelScene.addWire(powerSupply, 2, cpu, 0, 'power');

// 6. Sync with ladder diagram
const result = syncLadderTo3D();

// 7. Generate BOM
const bom = exportBOM();
```

## View Controls

### Switching Views
- **Ladder View**: Show only ladder diagram (default)
- **3D View**: Show only 3D model
- **Split View**: Show both side-by-side

```javascript
toggleView('ladder');  // or '3d' or 'split'
```

### 3D Navigation
- **Rotate**: Left mouse drag
- **Pan**: Right mouse drag
- **Zoom**: Mouse wheel

## Dependencies

- **Three.js** (r128+): 3D rendering engine
- **OrbitControls**: Camera navigation

## Standards & Dimensions

All dimensions follow standard PLC component sizing:
- DIN Rail: 35mm width (EN 50022 standard)
- Module spacing: 5mm snap grid
- Wire gauge: 1.5mm² (signal), 2.5mm² (power), 4.0mm² (ground)
- Voltage: 24V DC (typical PLC voltage)

## Future Enhancements

1. **Drag & Drop**: Direct component placement with mouse
2. **Wire Labeling**: Automatic terminal labels on wires
3. **BOM Export**: CSV/Excel export of component list
4. **CAD Export**: DXF/STEP export for manufacturing
5. **Collision Detection**: Prevent component overlap
6. **Cable Duct**: Organize wires in ducts/trays
7. **Multi-page Diagrams**: Support for large installations
8. **Real PLC Catalog**: Load actual vendor part numbers

## API Reference

### ModelScene
- `addMountingSurface(type, dimensions)`: Add mounting surface
- `addPLCComponent(type, position)`: Add PLC component
- `addWire(fromComponent, fromTerminal, toComponent, toTerminal, wireType)`: Connect components
- `snapToMounting(component, mounting, position)`: Snap component to surface

### LadderIOExtractor
- `extract()`: Get all I/O addresses from ladder
- `getIOCount()`: Count inputs/outputs
- `suggestPLCConfig()`: Suggest required components

### IOMapping
- `mapInput(address, component, terminalIndex)`: Map input
- `mapOutput(address, component, terminalIndex)`: Map output
- `getPhysicalTerminal(address)`: Get terminal for address

### AutoWireGenerator
- `generatePowerWires(powerSupply, components)`: Auto power distribution
- `generateSignalWires(diagram)`: Auto signal wiring
- `exportWireList()`: Get wire BOM
