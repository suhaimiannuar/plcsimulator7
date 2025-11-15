# 3D Wiring System Guide

## Overview
The 3D Model view includes a comprehensive wiring system for connecting ports between models, with support for both automatic and manual routing.

## How to Create Wires

### Step 1: Enable Wire Mode
1. Load models with ports (e.g., PCB Board)
2. Click **"🔌 Wire Mode: OFF"** button
3. Button turns green: **"⚡ Wire Mode: ON"**
4. Wire controls panel appears

### Step 2A: Auto-Routing (Quick & Easy)
1. Make sure **"📍 Waypoint Mode: OFF"**
2. Click on **first port** (red sphere) - it highlights yellow
3. Click on **second port** - wire is created automatically
4. Wire follows a curved path that goes up and over

**Use for**: Quick connections, clean layouts, when routing doesn't matter

### Step 2B: Manual Waypoint Routing (Precise Control)
1. Click **"📍 Waypoint Mode: OFF"** to enable it
2. Click on **source port** (red sphere)
3. Click in **3D space** to add waypoints (they snap to axis and grid)
4. Add as many waypoints as needed
5. Click on **destination port** to complete wire
6. Press **ESC** to cancel anytime

**Features**:
- Waypoints snap to 10mm grid
- Segments snap to X/Y/Z axis (axis-aligned routing)
- Real-time yellow preview shows path
- Yellow spheres mark each waypoint

**Use for**: BIM-style routing, conduit paths, avoiding obstacles, following walls

### Step 3: Configure Wire Properties
Before creating wires, set:

**Wire Type**:
- ⚡ Power (L/N/PE) - Red color
- 📊 Signal - Blue color
- 🔌 Ground - Black color
- 💾 Data/Comm - Yellow color

**Wire Gauge**:
- 22 AWG (0.5mm²) - Smallest
- 20 AWG (0.75mm²)
- 18 AWG (1.0mm²)
- **16 AWG (1.5mm²)** - Default
- 14 AWG (2.5mm²)
- 12 AWG (4.0mm²) - Largest

## Wire Management

### View Wire List
- Wires appear in the **"Wiring"** panel sidebar
- Shows: Port A → Port B, Type, Gauge, Length
- Waypoint wires show: **"📍 X waypoints"**

### Export Wire List
1. Click **"📋 Export Wire List"**
2. Downloads CSV with:
   - Wire ID
   - From Port / To Port
   - Wire Type
   - Wire Gauge
   - Length (mm)
   - Waypoint count (if applicable)

**Use for**: Bill of Materials, cable schedule, installation guide

### Clear Wires
1. Click **"🗑️ Clear All Wires"**
2. Confirm deletion
3. All wires removed from scene

## Save/Load Complete Scenes

### Save Layout
1. Arrange models and create wires
2. Click **"💾 Save 3D Layout"** (in left sidebar)
3. Downloads JSON file: `3d-layout-YYYY-MM-DD.json`

**Saves**:
- All model positions, rotations, scales
- Port configurations
- **All wires** (both auto-routed and waypoint)
- Waypoint coordinates for manual wires
- Wire types, gauges, lengths
- Mounting configuration

### Load Layout
1. Click **"📁 Load 3D Layout"**
2. Select previously saved JSON file
3. Scene is cleared and restored exactly as saved
4. Models load → Ports appear → Wires reconnect

## JSON Format

### Complete Scene Structure
```json
{
  "version": "1.1",
  "timestamp": "ISO date",
  "mountingConfig": { ... },
  "objects": [
    {
      "name": "Model Name",
      "position": { "x": 0, "y": 0, "z": 0 },
      "rotation": { "x": 0, "y": 0, "z": 0 },
      "scale": { "x": 1, "y": 1, "z": 1 },
      "ports": [ ... ]
    }
  ],
  "wires": [
    {
      "id": "wire-0",
      "portA": { "label": "Port_1", "worldPosition": {...} },
      "portB": { "label": "Port_2", "worldPosition": {...} },
      "wireType": "signal",
      "wireGauge": "16",
      "length": 123.45,
      "hasWaypoints": true,
      "waypoints": [
        { "x": 0, "y": 0, "z": 0 },
        { "x": 10, "y": 20, "z": 0 }
      ]
    }
  ]
}
```

### Wire Object Properties
- **id**: Unique wire identifier
- **portA / portB**: Source and destination port data
- **wireType**: "power", "signal", "ground", "data"
- **wireGauge**: "22", "20", "18", "16", "14", "12"
- **length**: Calculated wire length in millimeters
- **hasWaypoints**: Boolean (true for manual routing)
- **waypoints**: Array of 3D points (only if hasWaypoints = true)

## Keyboard Shortcuts
- **ESC**: Cancel current waypoint wire

## Tips & Best Practices

### Wire Routing
1. **Plan your layout** before wiring - move models to minimize wire length
2. **Use waypoint mode** for conduit/tray routing
3. **Group wires** by type - run all power together, all signals together
4. **Label ports clearly** in Port Config view before wiring
5. **Save often** - use Save 3D Layout after major changes

### Waypoint Techniques
- Start from source port, follow a path, end at destination
- Use grid snapping to align with walls/edges
- Create "bus" paths - main conduit with branches
- Snap to axis for clean horizontal/vertical runs
- Preview shows exactly where wire will go

### Performance
- Wires are lightweight (just lines in 3D)
- Can handle hundreds of wires easily
- Each waypoint is just a Vector3 coordinate

## Example Workflow

1. **Load models**: Add PLC, PCB, sensors to scene
2. **Position models**: Arrange in cabinet layout
3. **Configure ports**: Use Port Config view if needed
4. **Enable Wire Mode**
5. **Create power wires** (red): Power supply → Components
6. **Create signal wires** (blue): Sensors → PLC inputs
7. **Create data wires** (yellow): PLC → HMI
8. **Export wire list** for documentation
9. **Save 3D layout** for future editing
10. **Share JSON file** with team

## Current Status
✅ Auto-routing mode implemented
✅ Waypoint mode implemented  
✅ Wire types and colors
✅ Wire gauge selection
✅ Length calculation
✅ Wire list display
✅ Export to CSV
✅ Save/Load with wiring data
✅ Waypoint data preservation
✅ Ports move with models
✅ Port visibility toggle

## See Also
- `examples/sample-scene-with-wiring.json` - Example saved scene
- `docs/PORT_CONFIG_SYSTEM.md` - Port configuration guide
- `docs/3D_LAYOUT_SYSTEM.md` - 3D scene system overview
