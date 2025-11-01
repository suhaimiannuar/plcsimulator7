#!/usr/bin/env python3
"""
Convert STEP files from libs/model/step/ to STL in libs/model/
"""

import sys
import os
import glob

def convert_step_to_stl(step_file, stl_file):
    """Convert a STEP file to STL format"""
    try:
        import cadquery as cq
        print(f"✅ Using CadQuery to convert {step_file}")
        
        # Import STEP
        result = cq.importers.importStep(step_file)
        
        # Export to STL
        cq.exporters.export(result, stl_file)
        print(f"✅ Converted: {os.path.basename(step_file)} -> {os.path.basename(stl_file)}")
        return True
        
    except ImportError:
        print(f"❌ CadQuery not installed. Run: pip install cadquery")
        return False
    except Exception as e:
        print(f"❌ Error converting {step_file}: {e}")
        return False

def main():
    # Get paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    step_dir = os.path.join(script_dir, 'libs', 'model', 'step')
    stl_dir = os.path.join(script_dir, 'libs', 'model')
    
    # Check if step directory exists
    if not os.path.exists(step_dir):
        print(f"❌ Directory not found: {step_dir}")
        return
    
    # Find all STEP files (case insensitive)
    step_files = []
    for ext in ['*.step', '*.STEP', '*.stp', '*.STP']:
        step_files.extend(glob.glob(os.path.join(step_dir, ext)))
    
    if not step_files:
        print(f"⚠️  No STEP files found in {step_dir}")
        return
    
    print("=" * 60)
    print("STEP to STL Converter")
    print(f"Source: {step_dir}")
    print(f"Output: {stl_dir}")
    print("=" * 60)
    print(f"\nFound {len(step_files)} STEP files\n")
    
    converted = 0
    failed = 0
    
    for step_file in step_files:
        # Get base filename without extension
        base_name = os.path.splitext(os.path.basename(step_file))[0]
        stl_file = os.path.join(stl_dir, f"{base_name}.stl")
        
        print(f"🔄 Converting {os.path.basename(step_file)}...")
        
        if convert_step_to_stl(step_file, stl_file):
            converted += 1
            # Get file size
            size_mb = os.path.getsize(stl_file) / (1024 * 1024)
            print(f"   📦 Output: {size_mb:.1f} MB\n")
        else:
            failed += 1
            print()
    
    print("=" * 60)
    print(f"✅ Converted: {converted}")
    print(f"❌ Failed: {failed}")
    print("=" * 60)
    
    if converted > 0:
        print("\n📝 STL files created in libs/model/")
        print("   Ready to use in Three.js!")

if __name__ == '__main__':
    main()
