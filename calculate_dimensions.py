#!/usr/bin/env python3
"""
Calculate dimensions of 3D models (STL/OBJ) from catalog.json
and update the catalog with W (width), H (height), L (length) values.
"""

import json
import os
import sys
import tempfile
import requests
from pathlib import Path

try:
    import numpy as np
    from stl import mesh as stl_mesh
except ImportError:
    print("ERROR: Required library 'numpy-stl' not found.")
    print("Please install it with: pip3 install numpy-stl")
    sys.exit(1)


def download_file(url, output_path):
    """Download file from URL (handles Google Drive links)"""
    print(f"  Downloading from: {url[:80]}...")
    
    # Remove corsproxy if present for direct download
    clean_url = url.replace("https://corsproxy.io/?", "")
    
    try:
        response = requests.get(clean_url, stream=True, timeout=60)
        response.raise_for_status()
        
        with open(output_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
        
        print(f"  Downloaded: {os.path.basename(output_path)} ({os.path.getsize(output_path)} bytes)")
        return True
    except Exception as e:
        print(f"  ERROR downloading: {e}")
        return False


def get_stl_dimensions(file_path):
    """Calculate dimensions of STL file"""
    try:
        mesh = stl_mesh.Mesh.from_file(file_path)
        
        # Get min and max coordinates
        min_coords = mesh.vectors.reshape(-1, 3).min(axis=0)
        max_coords = mesh.vectors.reshape(-1, 3).max(axis=0)
        
        # Calculate dimensions (in mm, rounded to 2 decimal places)
        width = round(float(max_coords[0] - min_coords[0]), 2)   # X axis
        height = round(float(max_coords[2] - min_coords[2]), 2)  # Z axis (up)
        length = round(float(max_coords[1] - min_coords[1]), 2)  # Y axis
        
        return {
            "W": width,
            "H": height,
            "L": length
        }
    except Exception as e:
        print(f"  ERROR reading STL: {e}")
        return None


def get_obj_dimensions(file_path):
    """Calculate dimensions of OBJ file"""
    try:
        vertices = []
        
        with open(file_path, 'r') as f:
            for line in f:
                if line.startswith('v '):
                    # Parse vertex line: v x y z
                    parts = line.strip().split()
                    if len(parts) >= 4:
                        x, y, z = float(parts[1]), float(parts[2]), float(parts[3])
                        vertices.append([x, y, z])
        
        if not vertices:
            print("  ERROR: No vertices found in OBJ file")
            return None
        
        vertices = np.array(vertices)
        min_coords = vertices.min(axis=0)
        max_coords = vertices.max(axis=0)
        
        # Calculate dimensions (in mm, rounded to 2 decimal places)
        width = round(float(max_coords[0] - min_coords[0]), 2)   # X axis
        height = round(float(max_coords[2] - min_coords[2]), 2)  # Z axis (up)
        length = round(float(max_coords[1] - min_coords[1]), 2)  # Y axis
        
        return {
            "W": width,
            "H": height,
            "L": length
        }
    except Exception as e:
        print(f"  ERROR reading OBJ: {e}")
        return None


def process_catalog(catalog_path):
    """Process catalog.json and update with dimensions"""
    
    # Load catalog
    print(f"Loading catalog: {catalog_path}")
    with open(catalog_path, 'r') as f:
        catalog = json.load(f)
    
    if 'models' not in catalog:
        print("ERROR: No 'models' key found in catalog.json")
        return False
    
    print(f"Found {len(catalog['models'])} models in catalog\n")
    
    # Create temporary directory for downloads
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        
        # Process each model
        for idx, model in enumerate(catalog['models']):
            print(f"[{idx + 1}/{len(catalog['models'])}] Processing: {model['name']}")
            
            file_format = model.get('format', '').lower()
            file_url = model.get('file', '')
            
            if not file_url:
                print("  WARNING: No file URL found, skipping")
                continue
            
            if file_format not in ['stl', 'obj']:
                print(f"  WARNING: Unsupported format '{file_format}', skipping")
                continue
            
            # Download file
            temp_file = temp_path / f"model_{idx}.{file_format}"
            if not download_file(file_url, temp_file):
                print("  WARNING: Download failed, skipping")
                continue
            
            # Calculate dimensions
            if file_format == 'stl':
                dimensions = get_stl_dimensions(temp_file)
            elif file_format == 'obj':
                dimensions = get_obj_dimensions(temp_file)
            else:
                dimensions = None
            
            if dimensions:
                # Update model with dimensions
                model['dimensions'] = dimensions
                print(f"  ✓ Dimensions: W={dimensions['W']}mm, H={dimensions['H']}mm, L={dimensions['L']}mm")
            else:
                print("  WARNING: Could not calculate dimensions")
            
            print()
    
    # Save updated catalog
    output_path = catalog_path
    print(f"Saving updated catalog to: {output_path}")
    
    with open(output_path, 'w') as f:
        json.dump(catalog, f, indent=2)
    
    print("\n✓ Catalog updated successfully!")
    return True


def main():
    """Main entry point"""
    catalog_path = Path(__file__).parent / 'libs' / 'model' / 'catalog.json'
    
    if not catalog_path.exists():
        print(f"ERROR: Catalog not found at: {catalog_path}")
        sys.exit(1)
    
    print("=" * 70)
    print("3D Model Dimension Calculator")
    print("=" * 70)
    print()
    
    success = process_catalog(catalog_path)
    
    if success:
        print("\nDone!")
        sys.exit(0)
    else:
        print("\nFailed!")
        sys.exit(1)


if __name__ == '__main__':
    main()
