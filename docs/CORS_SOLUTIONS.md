# Google Drive CORS Issue - Solutions

## Problem
Google Drive doesn't send CORS headers, causing "Access-Control-Allow-Origin" errors when trying to load 3D models directly from JavaScript.

## Current Solution: CORS Proxy

We're using `https://corsproxy.io/` which is a free CORS proxy service that adds the necessary headers.

**Pros:**
- ✅ Quick and easy
- ✅ No server setup required
- ✅ Works immediately

**Cons:**
- ⚠️ Depends on third-party service
- ⚠️ May have rate limits
- ⚠️ Slightly slower (extra hop)

## Alternative Solutions

### 1. GitHub Releases (Recommended for Production)

**Best for:** Permanent, reliable hosting

```bash
# Upload files to GitHub Releases
1. Go to: https://github.com/suhaimiannuar/plcsimulator7/releases/new
2. Create release: v1.0-models
3. Upload STL/OBJ files
4. Use URLs like:
   https://github.com/suhaimiannuar/plcsimulator7/releases/download/v1.0-models/plc.stl
```

**Pros:**
- ✅ No CORS issues
- ✅ Fast CDN delivery
- ✅ Version control
- ✅ Reliable (GitHub infrastructure)

**Cons:**
- Takes a few minutes to set up

### 2. Cloudflare R2 (Best for Large Files)

**Best for:** Professional hosting with lots of storage

- Free tier: 10GB storage
- No bandwidth fees
- Automatic CORS support
- Fast global CDN

### 3. AWS S3 (Enterprise Solution)

Configure CORS policy on your S3 bucket:
```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET"],
      "AllowedHeaders": ["*"]
    }
  ]
}
```

### 4. Your Own Server/CDN

Host files on any web server with CORS enabled.

## Recommendation

For this project, I suggest:

1. **Short term**: Use CORS proxy (current solution) ✅
2. **Long term**: Move to GitHub Releases for reliability

GitHub Releases is free, has no rate limits, and is specifically designed for distributing release assets like your 3D model files.

## Testing

The CORS proxy solution should work immediately. Try loading a model on:
- https://suhaimiannuar.github.io/plcsimulator7/
- http://localhost/plcsim7/

If you encounter issues with corsproxy.io, alternative CORS proxies:
- https://api.allorigins.win/raw?url=
- https://cors-anywhere.herokuapp.com/
- https://thingproxy.freeboard.io/fetch/
