# Google Drive Setup for 3D Models

## Google Drive Folder
https://drive.google.com/drive/folders/1NH1HLujs_cgenKfVD2uK8FQG01eB8let?usp=sharing

## Files to Upload

Upload these files to your Google Drive folder:
- `circuit-breaker.stl` (43MB)
- `emergency-push-button.stl` (12MB)
- `motor-controller.stl` (23MB)
- `pcb-mount-relay.stl` (0.8MB)
- `pcb.obj` (404KB)
- `pcb.mtl` (2KB)
- `plc.stl` (26MB)
- `stack-led-light.stl` (14MB)

## Getting Direct Download Links

### Method 1: Manual Conversion

For each file in Google Drive:

1. Right-click → **Get link** → Copy link
2. The link looks like: `https://drive.google.com/file/d/1ABC123XYZ456/view?usp=sharing`
3. Extract the FILE_ID: `1ABC123XYZ456`
4. Create direct link: `https://drive.google.com/uc?export=download&id=1ABC123XYZ456`

### Method 2: Use Google Drive API (if you have many files)

Or simply:
1. Share each file with "Anyone with the link can view"
2. Copy the file ID from the URL
3. Use the template below

## Template for catalog.json

```json
{
  "models": [
    {
      "name": "PLC",
      "file": "https://drive.google.com/uc?export=download&id=YOUR_FILE_ID_HERE",
      "format": "stl",
      "size": "26MB",
      "type": "cpu"
    }
  ]
}
```

## Quick Reference Table

Fill in the FILE_IDs after uploading:

| File Name | Google Drive File ID | Direct Link |
|-----------|---------------------|-------------|
| plc.stl | __________________ | `https://drive.google.com/uc?export=download&id=__________` |
| circuit-breaker.stl | __________________ | `https://drive.google.com/uc?export=download&id=__________` |
| motor-controller.stl | __________________ | `https://drive.google.com/uc?export=download&id=__________` |
| emergency-push-button.stl | __________________ | `https://drive.google.com/uc?export=download&id=__________` |
| pcb-mount-relay.stl | __________________ | `https://drive.google.com/uc?export=download&id=__________` |
| stack-led-light.stl | __________________ | `https://drive.google.com/uc?export=download&id=__________` |
| pcb.obj | __________________ | `https://drive.google.com/uc?export=download&id=__________` |
| pcb.mtl | __________________ | `https://drive.google.com/uc?export=download&id=__________` |

## Next Steps

After you upload the files and get the file IDs, provide them here and I'll update the catalog.json automatically!
