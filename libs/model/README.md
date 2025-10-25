# 3D Model Library

This folder contains STEP/STP files for 3D CAD models used in the PLC simulator.

## Available Models

### Circuit Breaker (`circuit-breaker.step`)
- **Type**: 1-Pole MCB (Miniature Circuit Breaker)
- **Mounting**: DIN Rail
- **Dimensions**: 18mm × 85mm × 65mm
- **Features**: Switch handle, DIN rail clip

### Motor Controller (`motor-controller.step`)
- **Type**: Variable Frequency Drive (VFD)
- **Power**: 2.2kW rated
- **Dimensions**: 150mm × 200mm × 120mm
- **Features**: Display panel, control buttons, cooling fins

### Power Supply (`power-converter.step`)
- **Type**: 24VDC Power Supply
- **Current**: 5A rated
- **Mounting**: DIN Rail (3-module width)
- **Dimensions**: 54mm × 90mm × 65mm
- **Features**: Input/output terminals, LED indicator

### PLC CPU (`plc-cpu.step`)
- **Type**: Compact PLC CPU Module
- **Style**: Similar to Siemens S7-1200
- **Dimensions**: 100mm × 100mm × 75mm
- **Features**: Display panel, status LEDs, I/O connectors, SD card slot

### Stack Light (`stack-light.step`)
- **Type**: 3-Tier Signal Tower
- **Colors**: Red (bottom), Amber (middle), Green (top)
- **Dimensions**: 80mm diameter × 175mm height
- **Features**: Base mount, translucent segments, dome cap

## File Format

All files use the ISO 10303-21 STEP format (STandard for the Exchange of Product model data).

### STEP Format Details
- **Standard**: ISO 10303 (STEP)
- **Part**: AP214 (Automotive Design)
- **Encoding**: ASCII text format
- **Extensions**: `.step` or `.stp`

## Usage in Code

### Loading a STEP Model

```javascript
// Using the scene's loadComponentModel method
await modelScene.loadComponentModel(component, 'libs/model/circuit-breaker.step', 'step');

// Or directly in component
const button = new PushButton({ name: 'Emergency Stop' });
await button.loadExternalModel('libs/model/circuit-breaker.step', 'step');
```

### Supported Formats
The loader supports multiple CAD formats:
- **STEP/STP**: `.step`, `.stp` - CAD exchange format (this folder)
- **STL**: `.stl` - Stereolithography (3D printing)
- **OBJ**: `.obj` - Wavefront (with optional `.mtl` materials)

## CAD Software Compatibility

These STEP files can be:
- **Imported** into: SolidWorks, Fusion 360, AutoCAD, CATIA, Creo, FreeCAD
- **Edited**: In any CAD software supporting STEP AP214
- **Exported**: From most professional CAD applications

## Creating Custom Models

To add your own models:

1. **Design** in your CAD software (SolidWorks, Fusion 360, etc.)
2. **Export** as STEP AP214 format
3. **Name** with descriptive filename (e.g., `my-component.step`)
4. **Place** in this `libs/model/` folder
5. **Load** using the loadComponentModel method

### Export Settings
- Format: STEP AP214 (Automotive Design)
- Units: Millimeters (mm)
- Coordinate System: Right-handed (X right, Y up, Z forward)
- Origin: Component center or mounting point

## Notes

- **Current Implementation**: The STEPLoader creates placeholder geometry based on filename patterns. For full STEP parsing, integrate OpenCascade.js or similar STEP parser.
- **Performance**: STEP files contain detailed geometry and may be larger than procedural models.
- **Metadata**: All files include product metadata in the STEP header (name, description, date).

## Future Enhancements

- [ ] Full STEP parser integration (OpenCascade.js)
- [ ] Automatic material assignment from STEP color data
- [ ] Assembly support (multiple components in one STEP file)
- [ ] PMI (Product Manufacturing Information) extraction
- [ ] Parametric model support

## License

Models are for educational/demonstration purposes in the PLC simulator.
