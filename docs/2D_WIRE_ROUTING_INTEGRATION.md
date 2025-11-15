# 2D Wire Routing Integration Guide

## Overview

The EasyEDA-style 2D wire routing system has been integrated into the main application. This allows you to route wires in 2D views (Top/Front/Side) and create true 3D wire paths.

## Files Added

### Core System
- **`js/drawing/viewManager.js`** - Manages 2D view orientations (Top XZ, Front XY, Side YZ)
- **`js/drawing/gridSystem.js`** - Configurable snap-to-grid (5/10/25/50mm)
- **`js/drawing/wireRouting.js`** - Wire routing logic with Manhattan routing
- **`js/drawing/wireRoutingInit.js`** - Integration layer connecting 2D canvas with 3D scene

### Modified Files
- **`js/drawing/init.js`** - Added `initWireRouting3D()` function
- **`js/model/modelWiring.js`** - Added `createWireFromWaypoints()` method
- **`index.html`** - Added script tags and UI controls (minimal changes)

## How to Use

### Activating 2D Wire Mode

1. Switch to **3D Model View**
2. In the right panel, find **"🔌 2D Wire Routing"** section
3. Click **"📐 2D Wire Mode: OFF"** button
   - Button turns green: **"✅ 2D Wire Mode: ON"**
   - Additional controls appear

### Basic 2D Wire Routing

1. **Start routing**: Click a port (red circle)
   - Port turns green when selected
2. **Add corners**: Click to add waypoints
   - Automatically snaps to 90° angles (Manhattan routing)
   - Orange preview line shows current path
3. **Complete wire**: 
   - Click another port to connect
   - OR press **SPACE/ENTER** to create hanging wire

### True 3D Wire Routing

This is the key feature - route in different planes:

1. **Start in Top View** (default)
   - Route in XZ plane (horizontal)
   - Press **SPACE** to create hanging wire (⊗ marker)

2. **Switch to Front View**
   - Click **"👁️ Front (XY)"** button
   - The hanging wire end is still visible

3. **Continue routing**
   - Click the hanging wire end ⊗
   - System resumes routing in XY plane
   - Plane transition marked with magenta double rings ⊚

4. **Optional: Add more planes**
   - Press SPACE again to hang
   - Switch to Side View
   - Continue routing in YZ plane

5. **Complete**
   - Click a port to finish
   - Wire syncs to 3D scene automatically

## UI Controls

### View Switching
- **⬇️ Top (XZ)**: Top-down view, Y is constant
- **👁️ Front (XY)**: Front view, Z is constant  
- **◀️ Side (YZ)**: Side view, X is constant

### Grid Settings
- **Grid Size Dropdown**: 5mm / 10mm (default) / 25mm / 50mm
- **⊞ Grid**: Toggle grid visibility
- **📍 Ports**: Toggle port visibility
- **🔄 Reset**: Reset zoom and pan

### Other Controls
- **🗑️ Clear All Wires**: Delete all 2D routed wires

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **Click Port** | Start wire routing |
| **Click** | Add corner/waypoint |
| **SPACE / ENTER** | Finish current segment (hanging wire) |
| **ESC** | Cancel routing |
| **DELETE** | Remove selected wire |
| **G** | Toggle grid visibility |
| **Shift + Drag** | Pan canvas |
| **Mouse Wheel** | Zoom in/out |

## Visual Indicators

- **🔴 Red Circles**: Ports (clickable)
- **🟢 Green Circle**: Currently selected start port
- **🟡 Yellow Circle**: Hovered port/hanging end
- **🟠 Orange Line**: Preview path while routing
- **⊗ Circle with X**: Hanging wire end (clickable)
- **⊚ Magenta Double Rings**: Plane transition point
- **🔵 Blue/Red Wires**: Completed wires (color by type)

## Wire List Display

Wires with plane transitions show their routing path:

```
Motor+ → Sensor1
Length: 250.5mm | Type: signal | Waypoints: 5 | 3D: XZ→XY→YZ
```

This indicates: Started in XZ plane → transitioned to XY → transitioned to YZ

## How It Works

### Initialization Sequence

1. **Page loads** → `index.html` loads all script files
2. **User switches to 3D view** → `init3DModelViewer()` called
3. **3D scene initializes** → Creates `viewer3D` with ports manager
4. **Drawing system inits** → `initDrawing()` in `init.js`
5. **Wire routing inits** → `initWireRouting3D()` waits for 3D scene
6. **Integration created** → `WireRouting3DIntegration` instance
7. **Event listeners setup** → Mouse/keyboard handlers attached

### When User Clicks "2D Wire Mode ON"

1. `enable()` called on `wireRouting3D`
2. Animation loop starts
3. Canvas clears and redraws every frame:
   - Grid (if enabled)
   - Ports from 3D scene
   - Wires being routed
   - Hover highlights
   - Mode indicator

### When User Completes a Wire

1. Wire data stored in `wireRouter.wires[]`
2. `syncWireTo3D()` called automatically
3. Calls `viewer3D.wiringManager.createWireFromWaypoints()`
4. 3D cylinder mesh created from waypoints
5. Added to 3D scene
6. Wire appears in both 2D and 3D views

## Integration Points

### With Existing 3D Scene

- Uses `viewer3D.portsManager.getAllPortsWithWorldPositions()`
- Accesses port world positions dynamically
- Works with existing port system (parented to models)

### With Existing Wiring System

- Calls existing `modelWiring.js` methods
- Stores wire data in same format
- Compatible with save/load system
- Shows in wire list

### With Drawing Canvas

- Uses same canvas element as existing 2D drawing
- Enables/disables based on mode
- Doesn't interfere with other drawing features

## Troubleshooting

### "2D Wire Routing not initialized yet"
- Wait a few seconds for 3D scene to fully load
- Make sure ports are visible (toggle ports ON)
- Check browser console for initialization messages

### Can't find hanging wire end
- Make sure you're in the correct view
- Zoom in if the wire is far away
- Hanging ends are only clickable in 2D plane (ignores 3rd axis)

### Wire doesn't appear in 3D scene
- Check console for sync errors
- Make sure `viewer3D.wiringManager` exists
- Try refreshing the page

### Preview not showing
- Make sure 2D Wire Mode is ON (green button)
- Click a port first to start routing
- Check that ports are visible

## Performance Notes

- Animation loop runs only when 2D Wire Mode is ON
- Automatically stops when disabled
- Each frame redraws full canvas (grid, ports, wires)
- Typically 60 FPS on modern hardware

## Future Enhancements

Possible additions:
- [ ] Drag wire segments to reshape
- [ ] Drag waypoints to reposition
- [ ] Multi-select wires
- [ ] Copy/paste wire routes
- [ ] Wire templates/presets
- [ ] Auto-routing suggestions
- [ ] Clearance checking
- [ ] Wire bundling/grouping

## Example Workflow: Cabinet Wiring

```
Scenario: Connect PLC to multiple sensors across cabinet

1. Enable 2D Wire Mode
2. Select Top View (XZ) - cabinet floor plan
3. Click PLC output port
4. Route horizontally along back panel
5. Press SPACE (hanging wire)
6. Switch to Front View (XY) - cabinet elevation
7. Click hanging end
8. Route vertically up cabinet
9. Press SPACE again
10. Switch to Side View (YZ) - depth routing
11. Click hanging end
12. Route to sensor depth
13. Click sensor port - DONE!

Result: True 3D wire path following cabinet structure
```

## Support

For issues or questions:
- Check browser console for error messages
- Review `docs/3D_WIRE_ROUTING.md` for technical details
- Test with `test-wire-routing.html` standalone demo

---

**Last Updated**: November 2025
