# 3D Layout Save/Load System

The 3D Model Viewer now supports saving and loading complete 3D layouts, including object positions, rotations, and port configurations.

## Features

### ✅ Save Layout
- Saves all objects in the current 3D scene
- Includes position, rotation, and scale for each object
- Preserves mounting configuration (box/plate/shelf settings)
- Saves port configurations (connection points)
- Downloads as JSON file with timestamp

### ✅ Load Layout
- Restores entire 3D scene from JSON file
- Automatically downloads models from catalog
- Restores exact positions and rotations
- Restores port configurations
- Clears current scene before loading

### ✅ Clear Scene
- Removes all objects from the scene
- Cleans up physics bodies
- Disposes geometries and materials properly
- Confirmation dialog to prevent accidents

## Usage

### Header Controls Visibility

The header now shows context-specific controls:

**Ladder Diagram View:**
- New, Save, Load, Libraries, Clear (ladder diagram controls)

**Schematic Drawing View:**
- (No specific controls yet)

**3D Models View:**
- 💾 Save Layout
- 📂 Load Layout
- Clear Scene

### Saving a 3D Layout

1. Arrange your 3D models in the scene
2. Click "💾 Save Layout" button
3. A JSON file will be downloaded automatically
4. File name format: `3d-layout-YYYY-MM-DD.json`

### Loading a 3D Layout

1. Click "📂 Load Layout" button
2. Select a previously saved JSON layout file
3. The system will:
   - Clear the current scene
   - Download models from the catalog
   - Restore positions, rotations, and scales
   - Restore port configurations
4. Check the status log for progress

### Clearing the Scene

1. Click "Clear Scene" button
2. Confirm the action in the dialog
3. All objects will be removed and memory cleaned up

## Layout File Format

```json
{
  "version": "1.0",
  "timestamp": "2025-11-01T12:00:00.000Z",
  "mountingConfig": {
    "type": "box",
    "width": 300,
    "height": 400,
    "depth": 200
  },
  "objects": [
    {
      "name": "Motor Controller",
      "modelName": "Motor Controller",
      "format": "stl",
      "position": {
        "x": 50,
        "y": 42.5,
        "z": 0
      },
      "rotation": {
        "x": 0,
        "y": 0,
        "z": 0
      },
      "scale": {
        "x": 1,
        "y": 1,
        "z": 1
      },
      "ports": [
        {
          "position": {"x": 0, "y": 10, "z": 5},
          "label": "Power In",
          "type": "power",
          "size": 5
        }
      ]
    }
  ]
}
```

### Field Descriptions

- **version**: Layout format version (for future compatibility)
- **timestamp**: When the layout was created
- **mountingConfig**: Cabinet/mounting surface settings
- **objects**: Array of 3D objects with:
  - **name**: Display name (can be customized)
  - **modelName**: Model name from catalog (used to reload)
  - **format**: File format (stl/obj)
  - **position**: X, Y, Z coordinates in mm
  - **rotation**: Euler angles in radians
  - **scale**: Scale multipliers (usually 1, 1, 1)
  - **ports** (optional): Connection point configurations

## Integration with Dimensions

The system uses the dimension data from `catalog.json`:

- Dimensions calculated by `calculate_dimensions.py`
- Format: `{"W": width, "H": height, "L": length}` in mm
- Used for collision detection and layout validation
- Automatically available when models are loaded

## Example Workflow

1. **Design Phase:**
   - Switch to 3D Models view
   - Drag models from the library
   - Position and rotate objects
   - Add connection ports if needed
   - Check collision warnings (red highlights)

2. **Save Progress:**
   - Click "💾 Save Layout"
   - File saved with timestamp

3. **Resume Work:**
   - Click "📂 Load Layout"
   - Select your saved file
   - Continue designing

4. **Share Layouts:**
   - Email or share the JSON file
   - Others can load it with the same catalog

## Technical Notes

### Model Loading
- Models are re-downloaded from Google Drive when loading
- Uses catalog.json to find model URLs
- Applies same CORS proxy as initial loading

### Memory Management
- Proper disposal of geometries and materials
- Physics bodies cleaned up
- No memory leaks on scene clear

### Error Handling
- Missing models logged as warnings
- Invalid JSON shows error dialog
- Failed downloads reported in status log

### Coordinate System
- X: Width (left-right)
- Y: Height (up-down)
- Z: Depth (front-back)
- Origin: Center of mounting surface floor

## Future Enhancements

Potential additions:
- Auto-save functionality
- Layout templates
- Collision validation before load
- Wiring diagram generation from ports
- BOM (Bill of Materials) export
- DIN rail auto-arrangement
