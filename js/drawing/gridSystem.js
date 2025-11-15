// gridSystem.js - Grid snapping utilities for wire routing
// Note: Visual grid rendering moved to modelPhysics.js (3D mounting grids)

class GridSystem {
    constructor(gridSize = 10) {
        this.gridSize = gridSize; // Default 10mm
    }

    /**
     * Set grid size for snapping
     */
    setGridSize(size) {
        this.gridSize = size;
        console.log(`📏 Grid snap size set to ${size}mm`);
    }

    /**
     * Snap a value to the nearest grid line
     */
    snapToGrid(value) {
        return Math.round(value / this.gridSize) * this.gridSize;
    }

    /**
     * Snap a 2D point to grid
     */
    snapPoint(point) {
        return {
            x: this.snapToGrid(point.x),
            y: this.snapToGrid(point.y)
        };
    }

    /**
     * Snap a 3D point to grid
     */
    snapPoint3D(point) {
        return {
            x: this.snapToGrid(point.x),
            y: this.snapToGrid(point.y),
            z: this.snapToGrid(point.z)
        };
    }
}

// Node.js export (if running in Node environment)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GridSystem;
}
