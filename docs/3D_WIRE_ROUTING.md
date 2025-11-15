# 3D Wire Routing Guide

## Overview
The EasyEDA-style wire routing system supports **true 3D wire paths** by allowing you to route in different planes (XZ, XY, YZ) and transition between them.

## Key Concepts

### Planes
- **Top View (XZ)**: Routes wires in the horizontal plane, Y is constant
- **Front View (XY)**: Routes wires in the front plane, Z is constant  
- **Side View (YZ)**: Routes wires in the side plane, X is constant

### Visual Indicators
- **⊗ Symbol**: Hanging wire end (not connected to a port)
- **⊚ Magenta Double Rings**: Plane transition point (where wire switches planes)
- **Red Circles**: Ports
- **Yellow Circle**: Hovered hanging wire end (clickable)
- **Orange Preview Line**: Current routing path

## 3D Routing Workflow

### Example: Route from Top to Front Plane

```
1. Start in Top View (XZ plane)
   ├─ Click Motor+ port
   ├─ Click to add waypoints (routing in XZ)
   └─ Press SPACE → Creates hanging wire with ⊗ marker

2. Switch to Front View (XY plane)
   ├─ Wire from step 1 is still visible
   └─ Click the hanging end ⊗

3. Continue Routing in Front View
   ├─ Now routing in XY plane
   ├─ Transition point marked with ⊚
   ├─ Add waypoints in this new plane
   └─ Either:
       ├─ Click another port to complete
       └─ Press SPACE to create another hanging end

4. (Optional) Switch to Side View
   ├─ Click the hanging end again
   └─ Continue routing in YZ plane
```

## Wire Data Structure

When you create a 3D wire with plane transitions, it stores:

```javascript
{
  id: "wire-1",
  startPort: { label: "Motor+", worldPosition: {...} },
  endPort: { label: "Sensor1", worldPosition: {...} } or null,
  waypoints: [
    { x: 50, y: 0, z: 50 },   // Start in XZ
    { x: 150, y: 0, z: 50 },  // Still XZ
    { x: 150, y: 100, z: 50 }, // Transition to XY
    { x: 150, y: 100, z: 150 } // End in YZ
  ],
  plane: "YZ", // Current/last plane
  planeTransitions: [
    {
      waypointIndex: 2,
      fromPlane: "XZ",
      toPlane: "XY",
      transitionPoint: { x: 150, y: 0, z: 50 }
    },
    {
      waypointIndex: 3,
      fromPlane: "XY",
      toPlane: "YZ",
      transitionPoint: { x: 150, y: 100, z: 50 }
    }
  ],
  length: 250.5, // Total wire length in mm
  wireType: "signal",
  wireGauge: "16"
}
```

## Manhattan Routing per Plane

The system enforces **90° angles** (Manhattan routing) within each plane:

- **XZ Plane**: Can only move in X or Z direction (not both at once)
- **XY Plane**: Can only move in X or Y direction
- **YZ Plane**: Can only move in Y or Z direction

When you switch planes, you can then move in the axes of the new plane.

## Visual Representation

```
Top View (XZ):
    Z
    ↑
    │  ┌──────⊚ (transition point)
    │  │      
    │  ●──────→ (routing in XZ)
    └──────────→ X

Switch to Front View (XY):

    Y
    ↑
    │      ●──→ (routing in XY)
    │      │
    │      ⊚ (from transition)
    └──────────→ X

Result: True 3D wire path!
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **SPACE** | Finish current segment (create hanging wire) |
| **ENTER** | Same as SPACE |
| **ESC** | Cancel routing (delete current wire) |
| **DELETE** | Delete selected wire |
| **G** | Toggle grid visibility |

## Wire List Display

Wires with plane transitions show their path:

```
Motor+ → Sensor1
Length: 250.5mm | Type: signal | Waypoints: 5 | 3D: XZ→XY→YZ
```

This indicates the wire transitions through 3 planes: XZ → XY → YZ

## Tips

1. **Plan your route**: Think about which planes you need before starting
2. **Use grid snap**: The 10mm grid helps align transitions
3. **Start simple**: Try 2-plane routing before complex 3-plane paths
4. **Zoom in**: Use mouse wheel to zoom when clicking small hanging ends
5. **Label waypoints**: Plane transitions are automatically marked with ⊚

## Example Use Cases

### Cable Routing in Cabinet
```
1. Route along back panel (XZ - horizontal)
2. Transition to vertical run (XY - going up)
3. Transition to side panel (YZ - depth)
4. Connect to front device
```

### PCB to External Connector
```
1. Start at PCB pad (XY - board surface)
2. Transition vertical (XZ - wire going up)
3. Route to edge connector (YZ - side routing)
```

## Integration with 3D Scene

When synced to the 3D view, these wires will be rendered as:
- Cylinder mesh connecting all waypoints
- Proper 3D positioning in world space
- Color coding by wire type
- Collision detection with models

---

**Note**: This 2D routing system creates the waypoint data structure. The actual 3D cylinder rendering is handled by `modelWiring.js` in the 3D scene.
