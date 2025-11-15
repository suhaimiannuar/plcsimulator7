// viewManager.js - Manage 2D view orientations (Top, Front, Side) for wire routing

class ViewManager {
    constructor() {
        this.currentView = 'top'; // 'top', 'front', 'side-left', 'side-right'
        this.views = {
            top: {
                name: 'Top View',
                icon: '⬇️',
                plane: 'XZ', // X-Z plane, Y is constant
                normal: { x: 0, y: 1, z: 0 }, // Looking down
                up: { x: 0, y: 0, z: -1 },
                horizontal: 'x', // X axis is horizontal
                vertical: 'z'    // Z axis is vertical
            },
            front: {
                name: 'Front View',
                icon: '👁️',
                plane: 'XY', // X-Y plane, Z is constant
                normal: { x: 0, y: 0, z: 1 }, // Looking from front
                up: { x: 0, y: 1, z: 0 },
                horizontal: 'x', // X axis is horizontal
                vertical: 'y'    // Y axis is vertical
            },
            'side-left': {
                name: 'Side View (Left)',
                icon: '◀️',
                plane: 'YZ', // Y-Z plane, X is constant
                normal: { x: -1, y: 0, z: 0 }, // Looking from left
                up: { x: 0, y: 1, z: 0 },
                horizontal: 'z', // Z axis is horizontal
                vertical: 'y'    // Y axis is vertical
            },
            'side-right': {
                name: 'Side View (Right)',
                icon: '▶️',
                plane: 'YZ', // Y-Z plane, X is constant
                normal: { x: 1, y: 0, z: 0 }, // Looking from right
                up: { x: 0, y: 1, z: 0 },
                horizontal: 'z', // Z axis is horizontal (reversed)
                vertical: 'y'    // Y axis is vertical
            }
        };
    }

    /**
     * Set the current view orientation
     */
    setView(viewName) {
        if (!this.views[viewName]) {
            console.error('Invalid view:', viewName);
            return false;
        }
        this.currentView = viewName;
        console.log(`📐 View changed to: ${this.views[viewName].name}`);
        return true;
    }

    /**
     * Get current view configuration
     */
    getCurrentView() {
        return this.views[this.currentView];
    }

    /**
     * Convert 3D world position to 2D canvas coordinates for current view
     */
    worldToCanvas(worldPos, canvasWidth, canvasHeight, scale = 1, offset = { x: 0, y: 0 }) {
        const view = this.getCurrentView();
        let x, y;

        switch (view.plane) {
            case 'XZ': // Top view
                x = worldPos.x;
                y = worldPos.z;
                break;
            case 'XY': // Front view
                x = worldPos.x;
                y = -worldPos.y; // Invert Y for screen coordinates
                break;
            case 'YZ': // Side view
                x = worldPos.z;
                y = -worldPos.y; // Invert Y for screen coordinates
                break;
        }

        // Convert to canvas coordinates
        return {
            x: (x * scale) + canvasWidth / 2 + offset.x,
            y: (y * scale) + canvasHeight / 2 + offset.y
        };
    }

    /**
     * Convert 2D canvas coordinates to 3D world position for current view
     * constantValue is the fixed coordinate (e.g., Y=0 for top view)
     */
    canvasToWorld(canvasX, canvasY, canvasWidth, canvasHeight, scale = 1, offset = { x: 0, y: 0 }, constantValue = 0) {
        const view = this.getCurrentView();
        
        // Convert canvas to plane coordinates
        const planeX = (canvasX - canvasWidth / 2 - offset.x) / scale;
        const planeY = (canvasY - canvasHeight / 2 - offset.y) / scale;

        let worldPos = { x: 0, y: 0, z: 0 };

        switch (view.plane) {
            case 'XZ': // Top view
                worldPos.x = planeX;
                worldPos.y = constantValue; // Y is constant
                worldPos.z = planeY;
                break;
            case 'XY': // Front view
                worldPos.x = planeX;
                worldPos.y = -planeY; // Invert Y back to world space
                worldPos.z = constantValue; // Z is constant
                break;
            case 'YZ': // Side view
                worldPos.x = constantValue; // X is constant
                worldPos.y = -planeY; // Invert Y back to world space
                worldPos.z = planeX;
                break;
        }

        return worldPos;
    }

    /**
     * Get the constant axis for the current view
     * (the axis perpendicular to the view plane)
     */
    getConstantAxis() {
        const view = this.getCurrentView();
        switch (view.plane) {
            case 'XZ': return 'y';
            case 'XY': return 'z';
            case 'YZ': return 'x';
        }
    }

    /**
     * Get all available views as array
     */
    getAllViews() {
        return Object.keys(this.views).map(key => ({
            id: key,
            ...this.views[key]
        }));
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ViewManager;
}
