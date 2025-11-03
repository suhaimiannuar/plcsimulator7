// Port Config Viewer - Port Markers
// Handles creation and management of port markers

class PortConfigMarkers {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.portMarkers = [];
    }

    createPortMarker(port) {
        const scene = this.sceneManager.getScene();
        const camera = this.sceneManager.getCamera();
        
        // Port sphere (small red dot at exact location)
        const geometry = new THREE.SphereGeometry(3, 16, 16);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xff0000,
            transparent: true,
            opacity: 0.9,
            depthTest: true
        });
        const marker = new THREE.Mesh(geometry, material);
        marker.position.copy(port.worldPosition);
        marker.userData = { port: port };
        
        this.sceneManager.addToScene(marker);
        this.portMarkers.push(marker);
        
        // Get port position as Vector3
        const portPos = new THREE.Vector3(
            port.worldPosition.x,
            port.worldPosition.y,
            port.worldPosition.z
        );
        
        // If port has normal direction, show direction arrow (cyan)
        if (port.normal) {
            const normalVector = new THREE.Vector3(port.normal.x, port.normal.y, port.normal.z);
            const arrowStart = portPos.clone();
            const arrowEnd = portPos.clone().add(normalVector.multiplyScalar(15)); // 15 units long
            
            const directionArrowGeometry = new THREE.BufferGeometry().setFromPoints([
                arrowStart,
                arrowEnd
            ]);
            const directionArrowMaterial = new THREE.LineBasicMaterial({ 
                color: 0x00ffff, // Cyan for direction
                linewidth: 3,
                depthTest: true
            });
            const directionArrow = new THREE.Line(directionArrowGeometry, directionArrowMaterial);
            
            this.sceneManager.addToScene(directionArrow);
            this.portMarkers.push(directionArrow);
            
            // Add arrow head (cone)
            const coneGeometry = new THREE.ConeGeometry(2, 6, 8);
            const coneMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });
            const cone = new THREE.Mesh(coneGeometry, coneMaterial);
            cone.position.copy(arrowEnd);
            
            // Orient cone to point along normal
            cone.quaternion.setFromUnitVectors(
                new THREE.Vector3(0, 1, 0),
                normalVector.clone().normalize()
            );
            
            this.sceneManager.addToScene(cone);
            this.portMarkers.push(cone);
        }
        
        // Calculate offset direction (away from model center, towards camera)
        const cameraPos = camera.position.clone();
        
        // Direction from port to camera
        const offsetDirection = new THREE.Vector3()
            .subVectors(cameraPos, portPos)
            .normalize();
        
        // Offset distance for label (further away from surface)
        const labelOffset = 30;
        const labelPosition = portPos.clone().add(
            offsetDirection.multiplyScalar(labelOffset)
        );
        
        // Create arrow line from port to label (yellow)
        const arrowGeometry = new THREE.BufferGeometry().setFromPoints([
            portPos,
            labelPosition
        ]);
        const arrowMaterial = new THREE.LineBasicMaterial({ 
            color: 0xffff00,
            linewidth: 2,
            depthTest: false
        });
        const arrowLine = new THREE.Line(arrowGeometry, arrowMaterial);
        arrowLine.renderOrder = 999;
        
        this.sceneManager.addToScene(arrowLine);
        this.portMarkers.push(arrowLine);
        
        // Port label (positioned at end of arrow)
        const sprite = this.createLabelSprite(port, labelPosition);
        this.sceneManager.addToScene(sprite);
        this.portMarkers.push(sprite);
    }

    createLabelSprite(port, position) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 128;
        
        // Background with border
        context.fillStyle = 'rgba(0, 0, 0, 0.8)';
        context.strokeStyle = 'rgba(255, 255, 0, 0.9)';
        context.lineWidth = 4;
        
        const padding = 10;
        const rectWidth = canvas.width - padding * 2;
        const rectHeight = canvas.height - padding * 2;
        
        context.fillRect(padding, padding, rectWidth, rectHeight);
        context.strokeRect(padding, padding, rectWidth, rectHeight);
        
        // Text
        context.fillStyle = 'white';
        context.font = 'bold 48px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(port.label, canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ 
            map: texture,
            depthTest: false,
            depthWrite: false
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.position.copy(position);
        sprite.scale.set(40, 10, 1);
        sprite.renderOrder = 1000;
        
        return sprite;
    }

    clearAllMarkers() {
        this.portMarkers.forEach(marker => {
            this.sceneManager.removeFromScene(marker);
            if (marker.geometry) marker.geometry.dispose();
            if (marker.material) {
                if (marker.material.map) marker.material.map.dispose();
                marker.material.dispose();
            }
        });
        this.portMarkers = [];
    }

    getMarkers() {
        return this.portMarkers;
    }
}
