/**
 * STEP File Loader for Three.js
 * Loads STEP/STP CAD files and converts to Three.js geometry
 * 
 * Note: Full STEP parsing requires OpenCascade.js or similar.
 * This is a simplified loader that creates placeholder geometry
 * until full STEP support is integrated.
 */

class STEPLoader {
    constructor(manager) {
        this.manager = manager || THREE.DefaultLoadingManager;
    }

    load(url, onLoad, onProgress, onError) {
        const loader = new THREE.FileLoader(this.manager);
        loader.setResponseType('text');
        
        loader.load(
            url,
            (text) => {
                try {
                    const object = this.parse(text, url);
                    if (onLoad) onLoad(object);
                } catch (e) {
                    if (onError) {
                        onError(e);
                    } else {
                        console.error('STEPLoader error:', e);
                    }
                }
            },
            onProgress,
            onError
        );
    }

    parse(text, url = '') {
        // Extract filename for metadata
        const filename = url.split('/').pop().replace(/\.(step|stp)$/i, '');
        
        // Create a group to hold the loaded geometry
        const group = new THREE.Group();
        group.name = filename || 'STEP_Model';
        
        // Parse STEP header to get metadata
        const metadata = this.parseHeader(text);
        group.userData.stepMetadata = metadata;
        
        // For now, create appropriate placeholder geometry based on component type
        // In production, this would use OpenCascade.js to parse actual STEP geometry
        const geometry = this.createGeometryFromType(filename, metadata);
        
        if (geometry) {
            const material = new THREE.MeshStandardMaterial({
                color: this.getColorForType(filename),
                metalness: 0.6,
                roughness: 0.4
            });
            
            const mesh = new THREE.Mesh(geometry, material);
            mesh.name = filename;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            
            // Scale to match scene units (STEP is in mm, scene is in mm too now)
            mesh.scale.set(1, 1, 1);
            
            group.add(mesh);
        }
        
        return group;
    }

    parseHeader(text) {
        const metadata = {
            fileDescription: '',
            fileName: '',
            schema: '',
            timestamp: ''
        };

        // Extract FILE_DESCRIPTION
        const descMatch = text.match(/FILE_DESCRIPTION\s*\(\s*\(\s*'([^']*)'/);
        if (descMatch) metadata.fileDescription = descMatch[1];

        // Extract FILE_NAME
        const nameMatch = text.match(/FILE_NAME\s*\(\s*'([^']*)'/);
        if (nameMatch) metadata.fileName = nameMatch[1];

        // Extract schema (AP203, AP214, etc.)
        const schemaMatch = text.match(/FILE_SCHEMA\s*\(\s*\(\s*'([^']*)'/);
        if (schemaMatch) metadata.schema = schemaMatch[1];

        return metadata;
    }

    createGeometryFromType(filename, metadata) {
        const name = filename.toLowerCase();
        
        // Circuit Breaker
        if (name.includes('breaker') || name.includes('mcb')) {
            return this.createCircuitBreakerGeometry();
        }
        
        // Motor Controller / VFD
        if (name.includes('motor') || name.includes('vfd') || name.includes('controller')) {
            return this.createMotorControllerGeometry();
        }
        
        // Power Converter / Supply
        if (name.includes('power') || name.includes('converter') || name.includes('supply')) {
            return this.createPowerSupplyGeometry();
        }
        
        // PLC CPU Module
        if (name.includes('plc') || name.includes('cpu')) {
            return this.createPLCGeometry();
        }
        
        // Light / Indicator
        if (name.includes('light') || name.includes('led') || name.includes('indicator')) {
            return this.createLightGeometry();
        }
        
        // Default box
        return new THREE.BoxGeometry(1, 1, 1);
    }

    createCircuitBreakerGeometry() {
        // DIN rail mounted circuit breaker (1-pole, modular)
        const group = new THREE.Group();
        
        // Main body (18mm wide DIN rail module)
        const bodyGeom = new THREE.BoxGeometry(18, 85, 65);
        const body = new THREE.Mesh(bodyGeom);
        body.position.y = 42.5;
        group.add(body);
        
        // Switch handle
        const handleGeom = new THREE.BoxGeometry(14, 15, 5);
        const handle = new THREE.Mesh(handleGeom);
        handle.position.set(0, 80, 35);
        group.add(handle);
        
        // DIN rail clip
        const clipGeom = new THREE.BoxGeometry(16, 5, 10);
        const clip = new THREE.Mesh(clipGeom);
        clip.position.y = -5;
        group.add(clip);
        
        return this.mergeGroup(group);
    }

    createMotorControllerGeometry() {
        // Variable Frequency Drive (VFD)
        const group = new THREE.Group();
        
        // Main housing
        const housingGeom = new THREE.BoxGeometry(150, 200, 120);
        const housing = new THREE.Mesh(housingGeom);
        housing.position.y = 100;
        group.add(housing);
        
        // Display panel
        const displayGeom = new THREE.BoxGeometry(100, 60, 5);
        const display = new THREE.Mesh(displayGeom);
        display.position.set(0, 150, 63);
        group.add(display);
        
        // Keypad buttons
        for (let i = 0; i < 4; i++) {
            const btnGeom = new THREE.CylinderGeometry(8, 8, 3, 16);
            const btn = new THREE.Mesh(btnGeom);
            btn.rotation.x = Math.PI / 2;
            btn.position.set((i - 1.5) * 25, 80, 63);
            group.add(btn);
        }
        
        // Cooling fins
        for (let i = 0; i < 8; i++) {
            const finGeom = new THREE.BoxGeometry(140, 15, 2);
            const fin = new THREE.Mesh(finGeom);
            fin.position.set(0, 20 + i * 20, -61);
            group.add(fin);
        }
        
        return this.mergeGroup(group);
    }

    createPowerSupplyGeometry() {
        // DIN rail power supply (24VDC)
        const group = new THREE.Group();
        
        // Main body (wider DIN module)
        const bodyGeom = new THREE.BoxGeometry(54, 90, 65);
        const body = new THREE.Mesh(bodyGeom);
        body.position.y = 45;
        group.add(body);
        
        // Terminal blocks (output)
        const termGeom = new THREE.BoxGeometry(45, 12, 15);
        const term = new THREE.Mesh(termGeom);
        term.position.set(0, 96, 25);
        group.add(term);
        
        // LED indicator
        const ledGeom = new THREE.CylinderGeometry(3, 3, 2, 16);
        const led = new THREE.Mesh(ledGeom);
        led.rotation.x = Math.PI / 2;
        led.position.set(15, 70, 33);
        group.add(led);
        
        // Label area
        const labelGeom = new THREE.BoxGeometry(40, 25, 1);
        const label = new THREE.Mesh(labelGeom);
        label.position.set(0, 50, 33);
        group.add(label);
        
        return this.mergeGroup(group);
    }

    createPLCGeometry() {
        // PLC CPU Module (S7-1200 style)
        const group = new THREE.Group();
        
        // Main housing
        const housingGeom = new THREE.BoxGeometry(100, 100, 75);
        const housing = new THREE.Mesh(housingGeom);
        housing.position.y = 50;
        group.add(housing);
        
        // Display panel
        const displayGeom = new THREE.BoxGeometry(60, 30, 2);
        const display = new THREE.Mesh(displayGeom);
        display.position.set(0, 65, 39);
        group.add(display);
        
        // Status LEDs
        const ledColors = ['RUN', 'ERROR', 'MAINT'];
        for (let i = 0; i < 3; i++) {
            const ledGeom = new THREE.CylinderGeometry(3, 3, 2, 16);
            const led = new THREE.Mesh(ledGeom);
            led.rotation.x = Math.PI / 2;
            led.position.set(-25 + i * 15, 90, 39);
            group.add(led);
        }
        
        // Connector panel
        const connectorGeom = new THREE.BoxGeometry(80, 20, 10);
        const connector = new THREE.Mesh(connectorGeom);
        connector.position.set(0, 20, 43);
        group.add(connector);
        
        // SD card slot
        const sdGeom = new THREE.BoxGeometry(15, 12, 3);
        const sd = new THREE.Mesh(sdGeom);
        sd.position.set(35, 50, 39);
        group.add(sd);
        
        return this.mergeGroup(group);
    }

    createLightGeometry() {
        // Stack/Tower Light
        const group = new THREE.Group();
        
        // Base
        const baseGeom = new THREE.CylinderGeometry(40, 45, 15, 32);
        const base = new THREE.Mesh(baseGeom);
        base.position.y = 7.5;
        group.add(base);
        
        // Light segments (red, amber, green)
        const colors = [0xff0000, 0xffaa00, 0x00ff00];
        for (let i = 0; i < 3; i++) {
            const segmentGeom = new THREE.CylinderGeometry(30, 30, 40, 32);
            const segment = new THREE.Mesh(segmentGeom);
            segment.position.y = 25 + i * 42;
            group.add(segment);
            
            // Inner light (translucent)
            const lightGeom = new THREE.CylinderGeometry(28, 28, 38, 32);
            const light = new THREE.Mesh(lightGeom);
            light.position.y = 25 + i * 42;
            group.add(light);
        }
        
        // Top dome
        const domeGeom = new THREE.SphereGeometry(30, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const dome = new THREE.Mesh(domeGeom);
        dome.position.y = 151;
        group.add(dome);
        
        return this.mergeGroup(group);
    }

    mergeGroup(group) {
        // Merge all meshes in group into single geometry
        const geometries = [];
        group.traverse((child) => {
            if (child instanceof THREE.Mesh && child.geometry) {
                const geo = child.geometry.clone();
                geo.applyMatrix4(child.matrix);
                geometries.push(geo);
            }
        });
        
        if (geometries.length === 0) return null;
        
        // Use BufferGeometryUtils if available, otherwise return first geometry
        if (THREE.BufferGeometryUtils) {
            return THREE.BufferGeometryUtils.mergeGeometries(geometries);
        } else {
            return geometries[0];
        }
    }

    getColorForType(filename) {
        const name = filename.toLowerCase();
        
        if (name.includes('breaker')) return 0x2c3e50; // Dark gray
        if (name.includes('motor') || name.includes('vfd')) return 0x3498db; // Blue
        if (name.includes('power') || name.includes('converter')) return 0x27ae60; // Green
        if (name.includes('plc') || name.includes('cpu')) return 0x95a5a6; // Light gray
        if (name.includes('light') || name.includes('led')) return 0xe74c3c; // Red
        
        return 0x7f8c8d; // Default gray
    }
}

// Make available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = STEPLoader;
} else {
    window.STEPLoader = STEPLoader;
}
