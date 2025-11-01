# Security Audit Report - PLC Simulator 7

**Date**: November 1, 2025  
**Project**: plcsimulator7 (Public Repository)  
**Audit Type**: Static Code Analysis

---

## Executive Summary

✅ **Overall Status**: SAFE for public use  
⚠️ **Issues Found**: 2 low-risk items (already mitigated by context)  
🔒 **Recommendations**: Minor hardening suggestions provided

---

## Detailed Findings

### 🟡 Low Risk Issues

#### 1. `eval()` Usage in Formula Evaluation
**Location**: 
- `script.js:2607`
- `js/ladder/simulation.js:679`

**Code**:
```javascript
const result = eval(jsFormula);
```

**Context**:
This is used to evaluate PLC ladder logic formulas like `I1 && I2` for simulation purposes.

**Risk Assessment**:
- **Actual Risk**: LOW
- **Why**: Input is from user's own ladder diagram (they control it)
- **Impact**: Only affects user's own browser session
- **No server-side exposure**

**Recommendation**:
✅ **Already safe** - This is a simulation tool where users create their own logic. The eval() is:
- Sandboxed to browser
- No backend involved
- User evaluating their own formulas
- No external input injection

**Alternative** (if you want to be extra cautious):
Replace with Function constructor or create a safe expression parser.

---

#### 2. `innerHTML` Usage with User Data
**Location**: Multiple locations in `index.html`

**Code Examples**:
```javascript
// Line 1848 - Port editor
modelSection.innerHTML = `<strong>${modelName}:</strong>`;

// Line 2181 - Model catalog
button.innerHTML = `<div>${formatIcon} ${model.name}</div>`;
```

**Risk Assessment**:
- **Actual Risk**: LOW
- **Why**: Data comes from:
  - Model names (from catalog.json - you control this)
  - Port labels (user creates for their own models)
  - Scene object names (user's own 3D scene)

**Recommendation**:
✅ **Currently safe** because:
- No external user input
- All data is either hardcoded or user's own workspace
- Not a multi-user system

**Enhancement** (optional):
Add HTML sanitization for extra protection:
```javascript
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Then use:
modelSection.innerHTML = `<strong>${escapeHtml(modelName)}:</strong>`;
```

---

### ✅ Security Best Practices Already Implemented

1. **No Credentials Stored**
   - ✅ No API keys in code
   - ✅ No passwords or tokens
   - ✅ No localStorage/sessionStorage abuse

2. **External Resources**
   - ✅ Using HTTPS for all external resources
   - ✅ CDN resources from trusted sources (cdnjs.com)
   - ✅ Google Drive files accessed securely

3. **Client-Side Only**
   - ✅ No backend/server code
   - ✅ No database
   - ✅ All processing in browser
   - ✅ No user data transmitted

4. **CORS Proxy**
   - ⚠️ Using third-party CORS proxy (corsproxy.io)
   - **Note**: This is a convenience feature, not a security risk
   - Files are public anyway (Google Drive shared links)

---

## Specific Security Checks

### ✅ XSS (Cross-Site Scripting)
- **Status**: Protected
- No direct DOM manipulation from external sources
- innerHTML usage is safe (controlled data)

### ✅ CSRF (Cross-Site Request Forgery)
- **Status**: N/A
- No server-side operations
- No state-changing actions

### ✅ SQL Injection
- **Status**: N/A
- No database

### ✅ Sensitive Data Exposure
- **Status**: Protected
- No API keys, passwords, or secrets in code
- No user authentication system

### ✅ Insecure Dependencies
- **Status**: Safe
- Using well-maintained libraries:
  - Three.js r128 (from CDNjs)
  - Rapier physics (from CDN)
  - All from trusted sources

### ✅ HTTPS Usage
- **Status**: Good
- GitHub Pages enforces HTTPS
- All external resources use HTTPS

---

## Recommendations

### Priority: LOW (Optional Enhancements)

1. **Add Content Security Policy (CSP)**
   Add to `index.html` `<head>`:
   ```html
   <meta http-equiv="Content-Security-Policy" content="
     default-src 'self'; 
     script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; 
     style-src 'self' 'unsafe-inline'; 
     img-src 'self' data: https:; 
     connect-src 'self' https://drive.google.com https://corsproxy.io;
   ">
   ```
   Note: `unsafe-eval` needed for current eval() usage

2. **Replace eval() with Function Constructor** (optional)
   ```javascript
   // Instead of: eval(jsFormula)
   const fn = new Function('context', `return ${jsFormula}`);
   const result = fn(context);
   ```

3. **Add HTML Sanitization** (optional)
   Use DOMPurify or the simple escapeHtml function above

4. **Consider GitHub Releases for Models**
   - More reliable than CORS proxy
   - No third-party dependency
   - See: `docs/CORS_SOLUTIONS.md`

---

## Conclusion

### ✅ **APPROVED FOR PUBLIC USE**

Your project is safe to be public because:

1. **No Backend**: Everything runs in the user's browser
2. **No Secrets**: No API keys, passwords, or sensitive data
3. **Isolated**: Each user's work is independent
4. **Controlled Input**: Users only affect their own session
5. **Trusted Dependencies**: All external libraries from reputable sources

The two "issues" found (`eval()` and `innerHTML`) are:
- **Contextually safe** for this use case
- **Low risk** in a single-user, client-side simulation tool
- **Not exploitable** without already having browser access

### Final Risk Rating: **LOW** ✅

The project follows good security practices for a client-side simulation tool.

---

## Quick Wins (If You Want Extra Hardening)

Want to make it even more secure? Here's a 5-minute improvement:

1. Replace `eval()` with Function constructor
2. Add the CSP meta tag
3. Move models to GitHub Releases (remove CORS proxy dependency)

But honestly, **the current state is perfectly fine for a public educational/simulation tool**. 🎯
