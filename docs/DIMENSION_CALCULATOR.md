# 3D Model Dimension Calculator

This script automatically calculates the physical dimensions (Width, Height, Length) of all 3D models in the catalog and updates `catalog.json`.

## Features

- ✅ Supports STL and OBJ file formats
- ✅ Downloads files from Google Drive via catalog URLs
- ✅ Calculates bounding box dimensions (W, H, L in mm)
- ✅ Updates existing dimension values (re-scans even if dimensions exist)
- ✅ Handles both local and remote files

## Requirements

```bash
pip3 install numpy-stl requests
```

## Usage

Simply run the script from the project root:

```bash
python3 calculate_dimensions.py
```

The script will:
1. Read `libs/model/catalog.json`
2. Download each model file
3. Calculate dimensions using bounding box analysis
4. Update the catalog with `dimensions: {W, H, L}` values
5. Save the updated catalog

## Output Format

Each model in the catalog will have a `dimensions` key added:

```json
{
  "name": "Motor Controller",
  "file": "https://...",
  "format": "stl",
  "dimensions": {
    "W": 118.11,
    "H": 85.0,
    "L": 33.02
  }
}
```

Where:
- **W** (Width) = X-axis dimension in mm
- **H** (Height) = Z-axis dimension in mm (vertical)
- **L** (Length) = Y-axis dimension in mm

## Notes

- PCB OBJ files show very small dimensions (0.09mm) because they use different unit scales
- The script applies a 1000× scale multiplier in the 3D viewer for proper display
- Dimensions are rounded to 2 decimal places
- The script always re-scans files, even if dimensions already exist
