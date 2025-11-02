# Wiring System Implementation Plan

## Current Status ✅

### What's Already Working:
1. **Port Editor System**
   - Click to add ports on any surface (X-Y, X-Z, Y-Z)
   - Label each port with custom text
   - Color-coded by type (Power=Red, Input=Green, Output=Blue, Communication=Yellow)
   - Visual markers with text labels in 3D space
   - Save/Load port configurations to JSON

2. **3D Model System**
   - Upload custom STL/OBJ+MTL files
   - Saved to browser localStorage
   - Load from both catalog and custom uploads
   - Full 3D positioning and collision detection

## Next Step: 3D Wiring System

### Recommended Approach: **Stay in Three.js** (Not Unity)

**Why NOT Unity:**
- ❌ Completely different ecosystem (C#, separate engine)
- ❌ Would need to rewrite everything from scratch
- ❌ Export to WebGL adds 50-100MB overhead
- ❌ Poor web browser performance
- ❌ Can't easily share data with existing ladder logic
- ❌ Over-engineered for this use case

**Why Three.js + Additional Libraries:**
- ✅ Already using Three.js for 3D models
- ✅ Stays in JavaScript ecosystem
- ✅ Can integrate with ladder diagram directly
- ✅ Lightweight and web-optimized
- ✅ Many physics/curve libraries available

## Proposed Solution: Three.js + Curve Libraries

### Option 1: **THREE.CatmullRomCurve3** (Built-in) ⭐ RECOMMENDED
**Best for:** Automatic smooth curves between points

```javascript
// Create wire from Port A to Port B
const pointA = new THREE.Vector3(x1, y1, z1);
const pointB = new THREE.Vector3(x2, y2, z2);

// Add intermediate points for bending
const midPoint = new THREE.Vector3(
    (x1 + x2) / 2,
    Math.max(y1, y2) + 50, // Bend upward
    (z1 + z2) / 2
);

const curve = new THREE.CatmullRomCurve3([pointA, midPoint, pointB]);
const points = curve.getPoints(50); // 50 segments for smooth curve
const geometry = new THREE.BufferGeometry().setFromPoints(points);
const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
const wire = new THREE.Line(geometry, material);
scene.add(wire);
```

**Advantages:**
- ✅ Built into Three.js (no extra library)
- ✅ Smooth curves through control points
- ✅ Easy to implement
- ✅ Good for simple wire routing

### Option 2: **THREE.TubeGeometry** (3D Cables)
**Best for:** Realistic cable appearance

```javascript
const curve = new THREE.CatmullRomCurve3([pointA, midPoint, pointB]);
const tubeGeometry = new THREE.TubeGeometry(
    curve,
    50,  // segments
    0.5, // radius (cable thickness)
    8,   // radial segments
    false
);
const material = new THREE.MeshPhongMaterial({ 
    color: 0x00ff00,
    shininess: 30 
});
const cable = new THREE.Mesh(tubeGeometry, material);
scene.add(cable);
```

**Advantages:**
- ✅ Realistic 3D cables with thickness
- ✅ Different colors for different wire types
- ✅ Professional appearance

### Option 3: **Pathfinding Libraries** (Auto-routing)
**Best for:** Automatic obstacle avoidance

Libraries to consider:
- **PathFinding.js** - 2D/3D grid-based pathfinding
- **Three-pathfinding** - Navigation mesh for Three.js

```javascript
// Pseudo-code
const pathfinder = new ThreePathfinding();
const navmesh = createNavmeshFromMountingBox();
pathfinder.setZoneData('cabinet', navmesh);

const path = pathfinder.findPath(startPos, endPos, 'cabinet');
const curve = new THREE.CatmullRomCurve3(path);
// ... create wire from curve
```

**Advantages:**
- ✅ Automatic routing around obstacles
- ✅ Finds shortest path
- ✅ Avoids component collisions

**Disadvantages:**
- ❌ More complex setup
- ❌ Requires navigation mesh
- ❌ Overkill for simple cabinet

## Recommended Implementation Plan

### Phase 1: Basic Wire Drawing ✅ (Start Here)
**Tools:** THREE.CatmullRomCurve3 + THREE.Line

**Features:**
1. Click "Wire Mode" button
2. Click Port A → Click Port B
3. Automatically creates smooth curve wire
4. Wire bends upward to avoid components
5. Color-coded by wire type (Power, Signal, Ground)

**Implementation:**
```javascript
class WireSystem {
    constructor(scene) {
        this.scene = scene;
        this.wires = [];
        this.wireMode = false;
        this.selectedPort = null;
    }
    
    createWire(portA, portB, wireType) {
        // Calculate bend height based on component positions
        const maxY = Math.max(portA.y, portB.y) + 50;
        
        // Create control points
        const points = [
            new THREE.Vector3(portA.x, portA.y, portA.z),
            new THREE.Vector3(portA.x, maxY, portA.z), // Up
            new THREE.Vector3(portB.x, maxY, portB.z), // Across
            new THREE.Vector3(portB.x, portB.y, portB.z)  // Down
        ];
        
        const curve = new THREE.CatmullRomCurve3(points);
        const geometry = new THREE.BufferGeometry().setFromPoints(
            curve.getPoints(100)
        );
        
        const color = this.getWireColor(wireType);
        const material = new THREE.LineBasicMaterial({ 
            color: color,
            linewidth: 2 
        });
        
        const wire = new THREE.Line(geometry, material);
        wire.userData = {
            type: 'wire',
            portA: portA,
            portB: portB,
            wireType: wireType
        };
        
        this.scene.add(wire);
        this.wires.push(wire);
        return wire;
    }
    
    getWireColor(type) {
        return {
            'power': 0xff0000,      // Red
            'signal': 0x0000ff,     // Blue
            'ground': 0x000000,     // Black
            'communication': 0xffff00 // Yellow
        }[type] || 0x888888;
    }
}
```

### Phase 2: Enhanced Wiring (Later)
**Tools:** THREE.TubeGeometry for realistic cables

**Features:**
1. 3D cable appearance with thickness
2. Multiple wire bundles (cable trays)
3. Wire labels (voltage, signal name)
4. Wire length calculation
5. BOM export (Bill of Materials)

### Phase 3: Smart Routing (Future)
**Tools:** Pathfinding library

**Features:**
1. Automatic wire routing
2. Obstacle avoidance
3. Optimal path calculation
4. Cable tray suggestions

## Data Structure

### Wire Configuration (JSON)
```json
{
  "wires": [
    {
      "id": "wire-001",
      "type": "power",
      "gauge": "16AWG",
      "color": "red",
      "ports": {
        "start": {
          "component": "Motor Controller",
          "port": "Power In"
        },
        "end": {
          "component": "Circuit Breaker",
          "port": "Output"
        }
      },
      "path": [
        {"x": 10, "y": 50, "z": 20},
        {"x": 10, "y": 100, "z": 20},
        {"x": 50, "y": 100, "z": 20},
        {"x": 50, "y": 60, "z": 20}
      ],
      "length": 150.5
    }
  ]
}
```

## Integration with Ladder Logic

### Auto-wire from Ladder Diagram:
1. Parse ladder diagram connections
2. Find matching ports in 3D models
3. Auto-generate wires between connected components
4. Show electrical continuity in 3D

Example:
```javascript
// From ladder: X0 connected to Y0 through M0
const connections = ladderDiagram.getConnections();

connections.forEach(conn => {
    const componentA = find3DComponent(conn.sourceDevice);
    const componentB = find3DComponent(conn.targetDevice);
    const portA = componentA.getPort(conn.sourcePin);
    const portB = componentB.getPort(conn.targetPin);
    
    wireSystem.createWire(portA, portB, conn.wireType);
});
```

## UI Implementation

### New Panel: "⚡ Wiring"
```
📍 Port: Power In
🔌 Wire Type: [Power ▼]
📏 Wire Gauge: [16 AWG ▼]

[🎯 Start Wiring]
[🗑️ Clear All Wires]
[📋 Export Wire List]

Connected Wires:
• Motor → Breaker (Power, 16AWG, 150mm)
• PLC In → Sensor Out (Signal, 22AWG, 85mm)
```

## Performance Considerations

### Optimization:
1. **LOD (Level of Detail):** Use simple lines when zoomed out, detailed tubes when zoomed in
2. **Instancing:** Reuse geometry for similar wire segments
3. **Culling:** Hide wires behind components
4. **Simplification:** Use fewer curve points for distant wires

### Storage:
- Wires stored as port connections + curve points
- Curves regenerated on load
- localStorage for browser storage
- JSON export for sharing

## Next Steps (Priority Order)

1. ✅ **Port system** (Already done!)
2. ✅ **Custom model upload** (Already done!)
3. 🔄 **Basic wire drawing** (Implement Phase 1)
4. ⏳ **Wire save/load** (Part of layout system)
5. ⏳ **Wire editing** (Delete, modify path)
6. ⏳ **Auto-routing** (Phase 3)

## Conclusion

**DO NOT USE UNITY.** Stay with Three.js and use:
1. **THREE.CatmullRomCurve3** for smooth curves
2. **THREE.TubeGeometry** for realistic cables
3. **Optional:** Pathfinding library for auto-routing

This keeps everything in the same ecosystem, maintains performance, and integrates perfectly with your existing ladder diagram and 3D model system.

Start with Phase 1 (basic wire drawing) - it's simple, effective, and can be implemented in a few hours.
