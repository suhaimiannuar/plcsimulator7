#!/bin/bash

# Script to prepare model files for GitHub Release
# This creates a zip file with all model files that you can upload to GitHub Releases

echo "📦 Preparing 3D model files for GitHub Release..."

# Create a directory for the release
mkdir -p release-models

# Copy all model files
cp libs/model/*.stl release-models/
cp libs/model/*.obj release-models/
cp libs/model/*.mtl release-models/

# Create a zip file
cd release-models
zip -r ../3d-models-v1.0.zip *
cd ..

# Clean up
rm -rf release-models

echo "✅ Created: 3d-models-v1.0.zip"
echo ""
echo "📋 Next steps:"
echo "1. Go to: https://github.com/suhaimiannuar/plcsimulator7/releases/new"
echo "2. Tag version: v1.0-models"
echo "3. Release title: 3D Model Files"
echo "4. Upload the individual STL/OBJ files (or the zip file)"
echo "5. Publish release"
echo ""
echo "Then update catalog.json with URLs like:"
echo "https://github.com/suhaimiannuar/plcsimulator7/releases/download/v1.0-models/plc.stl"
