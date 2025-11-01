# GitHub Pages + Git LFS Issue Fix

## Problem
GitHub Pages doesn't serve Git LFS files directly. When you push STL/OBJ files tracked by LFS, GitHub Pages serves the small LFS pointer files instead of the actual binary data, causing "Array buffer allocation failed" errors.

## Solutions

### Option 1: Use a CDN or External Hosting (Recommended)

Host your large 3D model files on a CDN or external service and reference them via URL.

**Services you can use:**
- **GitHub Releases** (Free, same repo)
- **Cloudflare R2** (Free tier: 10GB)
- **AWS S3** (Pay as you go)
- **Any web hosting with CORS enabled**

### Option 2: Use Git LFS with a Custom Domain + Proxy

Set up a proxy server that fetches LFS files from GitHub's LFS storage.

### Option 3: Remove Git LFS for GitHub Pages (Simplest)

Since GitHub Pages needs direct file access, keep small files in Git and use external hosting for large files.

---

## Recommended Approach: GitHub Releases

### Step 1: Create a Release with Model Files

1. Go to your GitHub repository
2. Click **Releases** → **Create a new release**
3. Tag: `v1.0-models`
4. Title: `3D Model Files`
5. **Attach files**: Upload all `.stl`, `.obj`, `.mtl` files
6. Publish release

### Step 2: Update catalog.json to use Release URLs

The files will be available at:
```
https://github.com/suhaimiannuar/plcsimulator7/releases/download/v1.0-models/plc.stl
https://github.com/suhaimiannuar/plcsimulator7/releases/download/v1.0-models/pcb.obj
```

Update `libs/model/catalog.json`:

```json
{
  "models": [
    {
      "name": "PLC",
      "file": "https://github.com/suhaimiannuar/plcsimulator7/releases/download/v1.0-models/plc.stl",
      "format": "stl",
      "size": "26MB",
      "type": "cpu"
    }
  ]
}
```

### Step 3: Update Code to Handle Full URLs

The STL loader already supports full URLs, so this should work immediately.

---

## Alternative: Quick Fix (Remove LFS for Pages)

If you want to keep it simple:

1. **Untrack files from LFS**:
   ```bash
   git lfs untrack "*.stl" "*.obj" "*.mtl"
   git add .gitattributes
   git commit -m "Untrack large files from LFS"
   ```

2. **Add files back as regular Git files**:
   ```bash
   git rm --cached libs/model/*.stl libs/model/*.obj libs/model/*.mtl
   git add libs/model/*.stl libs/model/*.obj libs/model/*.mtl
   git commit -m "Add model files as regular files"
   git push
   ```

**Warning**: This will make your repository large (~125MB), but GitHub allows up to 100MB per file and up to 5GB total repository size.

---

## Current Status

- ✅ Git LFS is working correctly in your local repo
- ✅ Git LFS files pushed to GitHub successfully
- ❌ GitHub Pages cannot serve LFS files (by design)
- 🎯 **Action needed**: Choose one of the solutions above

## Recommendation

Use **GitHub Releases** approach - it's free, keeps your repo clean, and works perfectly with GitHub Pages.
