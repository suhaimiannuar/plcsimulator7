// modelWiring.js - Wiring System (Wire creation, management, export)

class ModelWiringManager {
    constructor() {
        this.wires = [];
        this.wireIdCounter = 0;
        this.selectedPortForWire = null;
    }
    
    toggleWireMode(sceneInstance) {
        sceneInstance.wireMode = !sceneInstance.wireMode;
        this.selectedPortForWire = null;
        
        // Disable port edit mode if wire mode is enabled
        if (sceneInstance.wireMode && sceneInstance.portEditMode) {
            sceneInstance.togglePortEditMode();
        }
        
        const wireControls = document.getElementById('wireControls');
        if (wireControls) {
            wireControls.style.display = sceneInstance.wireMode ? 'block' : 'none';
        }
        
        sceneInstance.log(`Wire mode ${sceneInstance.wireMode ? 'enabled - Click two ports to connect' : 'disabled'}`, 
                         sceneInstance.wireMode ? 'success' : 'info');
    }
    
    handlePortClickForWiring(sceneInstance, port, portMarker) {
        if (!sceneInstance.wireMode) return;
        
        if (!this.selectedPortForWire) {
            // First port selected
            this.selectedPortForWire = { port, portMarker };
            
            // Highlight selected port
            portMarker.material.emissive = new THREE.Color(0xffff00);
            portMarker.material.emissiveIntensity = 0.5;
            
            sceneInstance.log(`First port selected: ${port.label}. Click second port to connect.`, 'info');
        } else {
            // Second port selected - create wire
            const wireType = document.getElementById('wireType').value;
            const wireGauge = document.getElementById('wireGauge').value;
            
            this.createWire(
                sceneInstance,
                this.selectedPortForWire.port,
                port,
                wireType,
                wireGauge
            );
            
            // Reset first port highlight
            this.selectedPortForWire.portMarker.material.emissive = new THREE.Color(0x000000);
            this.selectedPortForWire.portMarker.material.emissiveIntensity = 0;
            
            this.selectedPortForWire = null;
        }
    }
    
    createWire(sceneInstance, portA, portB, wireType, wireGauge) {
        const wireId = `wire-${this.wireIdCounter++}`;
        
        // Get positions
        const posA = new THREE.Vector3(
            portA.worldPosition.x,
            portA.worldPosition.y,
            portA.worldPosition.z
        );
        const posB = new THREE.Vector3(
            portB.worldPosition.x,
            portB.worldPosition.y,
            portB.worldPosition.z
        );
        
        // Calculate bend height (go up to avoid components)
        const maxY = Math.max(posA.y, posB.y) + 50;
        const midY1 = posA.y + (maxY - posA.y) * 0.7;
        const midY2 = posB.y + (maxY - posB.y) * 0.7;
        
        // Create control points for smooth curve
        const points = [
            posA,
            new THREE.Vector3(posA.x, midY1, posA.z),
            new THREE.Vector3(posA.x, maxY, posA.z),
            new THREE.Vector3(
                (posA.x + posB.x) / 2,
                maxY,
                (posA.z + posB.z) / 2
            ),
            new THREE.Vector3(posB.x, maxY, posB.z),
            new THREE.Vector3(posB.x, midY2, posB.z),
            posB
        ];
        
        // Create smooth curve
        const curve = new THREE.CatmullRomCurve3(points);
        const curvePoints = curve.getPoints(100);
        
        // Calculate wire length
        let wireLength = 0;
        for (let i = 0; i < curvePoints.length - 1; i++) {
            wireLength += curvePoints[i].distanceTo(curvePoints[i + 1]);
        }
        
        // Create wire geometry
        const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
        
        // Get wire color based on type
        const color = this.getWireColor(wireType);
        const material = new THREE.LineBasicMaterial({
            color: color,
            linewidth: 2
        });
        
        const wireMesh = new THREE.Line(geometry, material);
        wireMesh.userData = {
            type: 'wire',
            wireId: wireId,
            portA: portA,
            portB: portB,
            wireType: wireType,
            wireGauge: wireGauge,
            length: wireLength
        };
        
        sceneInstance.scene.add(wireMesh);
        
        // Store wire info
        const wireInfo = {
            id: wireId,
            mesh: wireMesh,
            portA: portA,
            portB: portB,
            wireType: wireType,
            wireGauge: wireGauge,
            length: wireLength,
            curvePoints: curvePoints
        };
        
        sceneInstance.wires.push(wireInfo);
        
        sceneInstance.log(`✅ Wire connected: ${portA.label} → ${portB.label} (${wireLength.toFixed(1)}mm)`, 'success');
        this.updateWiresList(sceneInstance);
    }
    
    getWireColor(wireType) {
        const colors = {
            'power': 0xff0000,
            'signal': 0x0000ff,
            'ground': 0x000000,
            'data': 0xffff00
        };
        return colors[wireType] || 0x888888;
    }
    
    updateWiresList(sceneInstance) {
        const wiresList = document.getElementById('wiresList');
        if (!wiresList) return;
        
        if (sceneInstance.wires.length === 0) {
            wiresList.innerHTML = '<p style="color: #888; font-size: 10px;">No wires connected</p>';
            return;
        }
        
        let html = '';
        sceneInstance.wires.forEach((wire, index) => {
            const icon = {
                'power': '⚡',
                'signal': '📊',
                'ground': '🔌',
                'data': '💾'
            }[wire.wireType] || '🔌';
            
            html += `
                <div style="padding: 5px; background: #2c3e50; margin-bottom: 3px; border-radius: 3px; display: flex; justify-content: space-between; align-items: center;">
                    <div style="flex: 1;">
                        <div style="font-weight: bold;">${icon} ${wire.portA.label} → ${wire.portB.label}</div>
                        <div style="font-size: 10px; color: #888;">${wire.wireGauge} AWG, ${wire.length.toFixed(1)}mm</div>
                    </div>
                    <button onclick="viewer3D.deleteWire('${wire.id}')" class="btn btn-danger" style="padding: 2px 6px; font-size: 10px;">🗑️</button>
                </div>
            `;
        });
        
        wiresList.innerHTML = html;
    }
    
    deleteWire(sceneInstance, wireId) {
        const index = sceneInstance.wires.findIndex(w => w.id === wireId);
        if (index === -1) return;
        
        const wire = sceneInstance.wires[index];
        sceneInstance.scene.remove(wire.mesh);
        wire.mesh.geometry.dispose();
        wire.mesh.material.dispose();
        
        sceneInstance.wires.splice(index, 1);
        this.updateWiresList(sceneInstance);
        sceneInstance.log('Wire removed', 'info');
    }
    
    clearAllWires(sceneInstance) {
        sceneInstance.wires.forEach(wire => {
            sceneInstance.scene.remove(wire.mesh);
            wire.mesh.geometry.dispose();
            wire.mesh.material.dispose();
        });
        
        sceneInstance.wires = [];
        this.updateWiresList(sceneInstance);
        sceneInstance.log('All wires cleared', 'info');
    }
    
    exportWireList(sceneInstance) {
        if (sceneInstance.wires.length === 0) {
            alert('No wires to export!');
            return;
        }
        
        const wireList = {
            exportDate: new Date().toISOString(),
            totalWires: sceneInstance.wires.length,
            wires: sceneInstance.wires.map(wire => ({
                id: wire.id,
                from: {
                    component: wire.portA.label,
                    position: wire.portA.worldPosition
                },
                to: {
                    component: wire.portB.label,
                    position: wire.portB.worldPosition
                },
                wireType: wire.wireType,
                wireGauge: wire.wireGauge,
                length: Math.round(wire.length * 10) / 10,
                path: wire.curvePoints.map(p => ({
                    x: Math.round(p.x * 10) / 10,
                    y: Math.round(p.y * 10) / 10,
                    z: Math.round(p.z * 10) / 10
                }))
            }))
        };
        
        // Calculate totals by gauge
        const gaugeStats = {};
        sceneInstance.wires.forEach(wire => {
            const gauge = wire.wireGauge;
            if (!gaugeStats[gauge]) {
                gaugeStats[gauge] = { count: 0, totalLength: 0 };
            }
            gaugeStats[gauge].count++;
            gaugeStats[gauge].totalLength += wire.length;
        });
        
        wireList.statistics = {
            byGauge: gaugeStats,
            totalLength: sceneInstance.wires.reduce((sum, w) => sum + w.length, 0)
        };
        
        // Download as JSON
        const json = JSON.stringify(wireList, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wire-list-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        sceneInstance.log(`✅ Wire list exported: ${sceneInstance.wires.length} wires`, 'success');
    }
}
