// modelWiring.js - Wiring System (Wire creation, management, export)

class ModelWiringManager {
    constructor() {
        this.wires = [];
        this.wireIdCounter = 0;
        this.selectedPortForWire = null;
        // Waypoint-based wiring
        this.waypointMode = false;
        this.currentWireWaypoints = null; // Stores { sourcePort, waypoints: [], tempObjects: [] }
        this.gridSnapSize = 10; // 10mm grid
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
    
    toggleWaypointMode(sceneInstance) {
        this.waypointMode = !this.waypointMode;
        const btn = document.getElementById('toggleWaypointMode');
        
        if (this.waypointMode) {
            if (btn) {
                btn.textContent = '📍 Waypoint Mode: ON';
                btn.classList.remove('btn-secondary');
                btn.classList.add('btn-warning');
            }
            sceneInstance.log('📍 Waypoint Mode ON - Click port, then click waypoints, then target port', 'success');
            
            // Cancel any current waypoint wire
            if (this.currentWireWaypoints) {
                this.cancelWaypointWire(sceneInstance);
            }
        } else {
            if (btn) {
                btn.textContent = '📍 Waypoint Mode: OFF';
                btn.classList.remove('btn-warning');
                btn.classList.add('btn-secondary');
            }
            sceneInstance.log('📍 Waypoint Mode OFF - Auto-routing enabled', 'info');
            
            // Cancel any current waypoint wire
            if (this.currentWireWaypoints) {
                this.cancelWaypointWire(sceneInstance);
            }
        }
    }

    handlePortClickForWiring(sceneInstance, port, portMarker) {
        if (!sceneInstance.wireMode) return;
        
        // Waypoint mode handling
        if (this.waypointMode) {
            if (!this.currentWireWaypoints) {
                // Start waypoint wire
                this.startWaypointWire(sceneInstance, port, portMarker);
            } else {
                // Complete waypoint wire
                this.completeWaypointWire(sceneInstance, port, portMarker);
            }
            return;
        }
        
        // Auto-routing mode (original behavior)
        if (!this.selectedPortForWire) {
            // First port selected
            this.selectedPortForWire = { port, portMarker };
            
            // Highlight selected port (check if material and emissive exist)
            if (portMarker && portMarker.material) {
                if (!portMarker.material.emissive) {
                    portMarker.material.emissive = new THREE.Color(0x000000);
                }
                portMarker.material.emissive.set(0xffff00);
                portMarker.material.emissiveIntensity = 0.5;
            }
            
            const portInfo = port.instanceName ? `${port.instanceName}::${port.label}` : port.label;
            sceneInstance.log(`First port selected: ${portInfo}. Click second port to connect.`, 'info');
        } else {
            // Second port selected - create wire
            const wireTypeEl = document.getElementById('wireType');
            const wireGaugeEl = document.getElementById('wireGauge');
            const wireType = wireTypeEl ? wireTypeEl.value : 'signal';
            const wireGauge = wireGaugeEl ? wireGaugeEl.value : '16';
            
            this.createWire(
                sceneInstance,
                this.selectedPortForWire.port,
                port,
                wireType,
                wireGauge
            );
            
            // Reset first port highlight
            if (this.selectedPortForWire.portMarker && this.selectedPortForWire.portMarker.material) {
                if (this.selectedPortForWire.portMarker.material.emissive) {
                    this.selectedPortForWire.portMarker.material.emissive.set(0x000000);
                }
                this.selectedPortForWire.portMarker.material.emissiveIntensity = 0;
            }
            
            this.selectedPortForWire = null;
        }
    }

    handleWaypointClick(sceneInstance, worldPosition) {
        if (!sceneInstance.wireMode || !this.waypointMode || !this.currentWireWaypoints) {
            return false;
        }
        
        // Add waypoint
        const snapped = this.snapToAxisAndGrid(worldPosition, this.currentWireWaypoints.waypoints);
        this.addWaypoint(sceneInstance, snapped);
        return true;
    }

    startWaypointWire(sceneInstance, port, portMarker) {
        // Get actual world position from port marker
        const sourcePos = new THREE.Vector3();
        const portGroup = sceneInstance.portMarkers.find(m => 
            m.userData.portId === port.portId || 
            (m.userData.portLabel === port.label && m.userData.instanceId === port.instanceId)
        );
        
        if (portGroup) {
            portGroup.getWorldPosition(sourcePos);
        } else if (port.worldPosition) {
            sourcePos.set(port.worldPosition.x, port.worldPosition.y, port.worldPosition.z);
        }
        
        this.currentWireWaypoints = {
            sourcePort: port,
            sourceMarker: portMarker,
            waypoints: [sourcePos.clone()],
            tempObjects: []
        };
        
        // Highlight source port
        if (portMarker && portMarker.material) {
            if (!portMarker.material.emissive) {
                portMarker.material.emissive = new THREE.Color(0x000000);
            }
            portMarker.material.emissive.set(0x00ffff);
            portMarker.material.emissiveIntensity = 0.7;
        }
        
        sceneInstance.log(`📍 Waypoint wire started from ${port.label}`, 'info');
        sceneInstance.log('💡 Click in space to add waypoints (ESC to cancel)', 'info');
    }

    addWaypoint(sceneInstance, position) {
        if (!this.currentWireWaypoints) return;
        
        this.currentWireWaypoints.waypoints.push(position.clone());
        sceneInstance.log(`📍 Waypoint ${this.currentWireWaypoints.waypoints.length - 1} added`, 'info');
        
        this.updateWaypointPreview(sceneInstance);
    }

    completeWaypointWire(sceneInstance, targetPort, targetMarker) {
        if (!this.currentWireWaypoints) return;
        
        // Check if same port (use portId for accurate comparison)
        if (this.currentWireWaypoints.sourcePort.portId === targetPort.portId) {
            sceneInstance.log('❌ Cannot connect port to itself', 'error');
            return;
        }
        
        // Get actual world position from port marker
        const targetPos = new THREE.Vector3();
        const portGroup = sceneInstance.portMarkers.find(m => 
            m.userData.portId === targetPort.portId || 
            (m.userData.portLabel === targetPort.label && m.userData.instanceId === targetPort.instanceId)
        );
        
        if (portGroup) {
            portGroup.getWorldPosition(targetPos);
        } else if (targetPort.worldPosition) {
            targetPos.set(targetPort.worldPosition.x, targetPort.worldPosition.y, targetPort.worldPosition.z);
        }
        
        this.currentWireWaypoints.waypoints.push(targetPos);
        
        // Create wire with custom waypoints
        const wireTypeEl = document.getElementById('wireType');
        const wireGaugeEl = document.getElementById('wireGauge');
        const wireType = wireTypeEl ? wireTypeEl.value : 'signal';
        const wireGauge = wireGaugeEl ? wireGaugeEl.value : '16';
        
        this.createWireWithWaypoints(
            sceneInstance,
            this.currentWireWaypoints.sourcePort,
            targetPort,
            this.currentWireWaypoints.waypoints,
            wireType,
            wireGauge
        );
        
        // Clean up
        this.clearWaypointPreview(sceneInstance);
        this.currentWireWaypoints.sourceMarker.material.emissive = new THREE.Color(0x000000);
        this.currentWireWaypoints.sourceMarker.material.emissiveIntensity = 0;
        this.currentWireWaypoints = null;
    }

    cancelWaypointWire(sceneInstance) {
        if (!this.currentWireWaypoints) return;
        
        this.clearWaypointPreview(sceneInstance);
        if (this.currentWireWaypoints.sourceMarker && this.currentWireWaypoints.sourceMarker.material) {
            if (this.currentWireWaypoints.sourceMarker.material.emissive) {
                this.currentWireWaypoints.sourceMarker.material.emissive.set(0x000000);
            }
            this.currentWireWaypoints.sourceMarker.material.emissiveIntensity = 0;
        }
        this.currentWireWaypoints = null;
        sceneInstance.log('❌ Waypoint wire cancelled', 'warning');
    }

    snapToAxisAndGrid(position, waypoints) {
        if (waypoints.length === 0) return position;
        
        const lastPoint = waypoints[waypoints.length - 1];
        const delta = {
            x: Math.abs(position.x - lastPoint.x),
            y: Math.abs(position.y - lastPoint.y),
            z: Math.abs(position.z - lastPoint.z)
        };
        
        // Find dominant axis
        let snapped = position.clone();
        
        if (delta.x >= delta.y && delta.x >= delta.z) {
            // X axis dominant
            snapped.y = lastPoint.y;
            snapped.z = lastPoint.z;
        } else if (delta.y >= delta.x && delta.y >= delta.z) {
            // Y axis dominant
            snapped.x = lastPoint.x;
            snapped.z = lastPoint.z;
        } else {
            // Z axis dominant
            snapped.x = lastPoint.x;
            snapped.y = lastPoint.y;
        }
        
        // Snap to grid
        snapped.x = Math.round(snapped.x / this.gridSnapSize) * this.gridSnapSize;
        snapped.y = Math.round(snapped.y / this.gridSnapSize) * this.gridSnapSize;
        snapped.z = Math.round(snapped.z / this.gridSnapSize) * this.gridSnapSize;
        
        return snapped;
    }

    updateWaypointPreview(sceneInstance) {
        this.clearWaypointPreview(sceneInstance);
        
        if (!this.currentWireWaypoints || this.currentWireWaypoints.waypoints.length < 2) return;
        
        const waypoints = this.currentWireWaypoints.waypoints;
        
        // Draw segments
        for (let i = 0; i < waypoints.length - 1; i++) {
            const tube = this.createWireTube(waypoints[i], waypoints[i + 1], 1.5, 0xffff00, 0.6);
            sceneInstance.scene.add(tube);
            this.currentWireWaypoints.tempObjects.push(tube);
        }
        
        // Draw waypoint markers
        waypoints.forEach((point, index) => {
            if (index > 0) { // Skip first (source port)
                const marker = this.createWaypointMarker(point);
                sceneInstance.scene.add(marker);
                this.currentWireWaypoints.tempObjects.push(marker);
            }
        });
    }

    clearWaypointPreview(sceneInstance) {
        if (!this.currentWireWaypoints) return;
        
        this.currentWireWaypoints.tempObjects.forEach(obj => {
            sceneInstance.scene.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
        });
        this.currentWireWaypoints.tempObjects = [];
    }

    createWireTube(start, end, radius, color, opacity) {
        const direction = new THREE.Vector3().subVectors(end, start);
        const length = direction.length();
        
        const geometry = new THREE.CylinderGeometry(radius, radius, length, 8);
        const material = new THREE.MeshPhongMaterial({ 
            color: color,
            transparent: opacity < 1,
            opacity: opacity,
            shininess: 30
        });
        
        const tube = new THREE.Mesh(geometry, material);
        tube.position.copy(start).add(direction.multiplyScalar(0.5));
        tube.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            direction.normalize()
        );
        
        return tube;
    }

    createWaypointMarker(position) {
        const geometry = new THREE.SphereGeometry(3, 8, 8);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xffff00,
            transparent: true,
            opacity: 0.8
        });
        const marker = new THREE.Mesh(geometry, material);
        marker.position.copy(position);
        return marker;
    }

    createWireWithWaypoints(sceneInstance, portA, portB, waypoints, wireType, wireGauge) {
        const wireId = `wire-${this.wireIdCounter++}`;
        
        // Calculate wire length
        let wireLength = 0;
        for (let i = 0; i < waypoints.length - 1; i++) {
            wireLength += waypoints[i].distanceTo(waypoints[i + 1]);
        }
        
        // Create wire geometry from waypoints
        const geometry = new THREE.BufferGeometry().setFromPoints(waypoints);
        const color = this.getWireColor(wireType);
        const material = new THREE.LineBasicMaterial({
            color: color,
            linewidth: 3
        });
        
        const wireMesh = new THREE.Line(geometry, material);
        wireMesh.userData = {
            type: 'wire',
            wireId: wireId,
            portA: portA,
            portB: portB,
            wireType: wireType,
            wireGauge: wireGauge,
            length: wireLength,
            hasWaypoints: true,
            waypointCount: waypoints.length - 2 // Exclude start/end
        };
        
        sceneInstance.scene.add(wireMesh);
        
        // Store wire info with world positions from waypoints
        const wireInfo = {
            id: wireId,
            mesh: wireMesh,
            portA: {
                ...portA,
                worldPosition: { x: waypoints[0].x, y: waypoints[0].y, z: waypoints[0].z }
            },
            portB: {
                ...portB,
                worldPosition: { x: waypoints[waypoints.length - 1].x, y: waypoints[waypoints.length - 1].y, z: waypoints[waypoints.length - 1].z }
            },
            wireType: wireType,
            wireGauge: wireGauge,
            length: wireLength,
            curvePoints: waypoints,
            hasWaypoints: true
        };
        
        sceneInstance.wires.push(wireInfo);
        
        const portAInfo = portA.instanceName ? `${portA.instanceName}::${portA.label}` : portA.label;
        const portBInfo = portB.instanceName ? `${portB.instanceName}::${portB.label}` : portB.label;
        sceneInstance.log(`✅ Waypoint wire connected: ${portAInfo} → ${portBInfo} (${waypoints.length - 2} waypoints, ${wireLength.toFixed(1)}mm)`, 'success');
        this.updateWiresList(sceneInstance);
    }
    
    createWire(sceneInstance, portA, portB, wireType, wireGauge) {
        const wireId = `wire-${this.wireIdCounter++}`;
        
        // Get actual world positions (ports are now parented to models, so we need to get from the markers)
        let posA, posB;
        
        // Find the port markers to get world position
        const portAMarker = sceneInstance.portMarkers.find(m => 
            m.userData.portId === portA.portId || 
            (m.userData.portLabel === portA.label && m.userData.instanceId === portA.instanceId)
        );
        const portBMarker = sceneInstance.portMarkers.find(m => 
            m.userData.portId === portB.portId || 
            (m.userData.portLabel === portB.label && m.userData.instanceId === portB.instanceId)
        );
        
        if (portAMarker && portBMarker) {
            // Get world position from the port group
            posA = new THREE.Vector3();
            posB = new THREE.Vector3();
            portAMarker.getWorldPosition(posA);
            portBMarker.getWorldPosition(posB);
        } else {
            // Fallback to stored worldPosition if available
            posA = new THREE.Vector3(
                portA.worldPosition?.x || 0,
                portA.worldPosition?.y || 0,
                portA.worldPosition?.z || 0
            );
            posB = new THREE.Vector3(
                portB.worldPosition?.x || 0,
                portB.worldPosition?.y || 0,
                portB.worldPosition?.z || 0
            );
        }
        
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
        
        // Store wire info with current world positions
        const wireInfo = {
            id: wireId,
            mesh: wireMesh,
            portA: {
                ...portA,
                worldPosition: { x: posA.x, y: posA.y, z: posA.z }
            },
            portB: {
                ...portB,
                worldPosition: { x: posB.x, y: posB.y, z: posB.z }
            },
            wireType: wireType,
            wireGauge: wireGauge,
            length: wireLength,
            curvePoints: curvePoints
        };
        
        sceneInstance.wires.push(wireInfo);
        
        const portAInfo = portA.instanceName ? `${portA.instanceName}::${portA.label}` : portA.label;
        const portBInfo = portB.instanceName ? `${portB.instanceName}::${portB.label}` : portB.label;
        sceneInstance.log(`✅ Wire connected: ${portAInfo} → ${portBInfo} (${wireLength.toFixed(1)}mm)`, 'success');
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
            
            const waypointInfo = wire.hasWaypoints ? ` | 📍 ${wire.mesh.userData.waypointCount} waypoints` : '';
            
            const portAInfo = wire.portA.instanceName ? `${wire.portA.instanceName}::${wire.portA.label}` : wire.portA.label;
            const portBInfo = wire.portB.instanceName ? `${wire.portB.instanceName}::${wire.portB.label}` : wire.portB.label;
            
            html += `
                <div style="padding: 5px; background: #2c3e50; margin-bottom: 3px; border-radius: 3px; display: flex; justify-content: space-between; align-items: center;">
                    <div style="flex: 1;">
                        <div style="font-weight: bold; font-size: 10px;">${icon} ${portAInfo} → ${portBInfo}</div>
                        <div style="font-size: 10px; color: #888;">${wire.wireGauge} AWG, ${wire.length.toFixed(1)}mm${waypointInfo}</div>
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
                    instance: wire.portA.instanceName || wire.portA.label,
                    port: wire.portA.label,
                    position: wire.portA.worldPosition || { x: 0, y: 0, z: 0 }
                },
                to: {
                    instance: wire.portB.instanceName || wire.portB.label,
                    port: wire.portB.label,
                    position: wire.portB.worldPosition || { x: 0, y: 0, z: 0 }
                },
                wireType: wire.wireType,
                wireGauge: wire.wireGauge,
                length: Math.round(wire.length * 10) / 10,
                path: wire.curvePoints ? wire.curvePoints.map(p => ({
                    x: Math.round(p.x * 10) / 10,
                    y: Math.round(p.y * 10) / 10,
                    z: Math.round(p.z * 10) / 10
                })) : []
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
    
    /**
     * Create wire from 2D wire routing waypoints
     * Used by the 2D wire routing system to create 3D wires
     */
    createWireFromWaypoints(startPort, endPort, waypoints, options = {}) {
        if (!startPort || !waypoints || waypoints.length < 2) {
            console.error('Invalid wire data for 3D creation');
            return null;
        }
        
        const wireType = options.wireType || 'signal';
        const wireGauge = options.wireGauge || '16';
        
        // Create wire geometry from waypoints
        const path = new THREE.CatmullRomCurve3(
            waypoints.map(wp => new THREE.Vector3(wp.x, wp.y, wp.z)),
            false, // Not closed
            'centripetal'
        );
        
        const tubeGeometry = new THREE.TubeGeometry(path, 64, 1, 8, false);
        
        // Material based on wire type
        const colors = {
            power: 0xff0000,
            signal: 0x0000ff,
            ground: 0x000000,
            data: 0xffff00
        };
        
        const material = new THREE.MeshPhongMaterial({
            color: colors[wireType] || 0x0000ff,
            emissive: 0x000000
        });
        
        const wireMesh = new THREE.Mesh(tubeGeometry, material);
        wireMesh.userData.isWire = true;
        wireMesh.userData.wireId = `2d-wire-${this.wireIdCounter++}`;
        
        // Store wire data
        const wireData = {
            id: wireMesh.userData.wireId,
            startPort: {
                instanceName: startPort.instanceName || startPort.label,
                portLabel: startPort.label,
                portId: startPort.portId || startPort.id
            },
            endPort: endPort ? {
                instanceName: endPort.instanceName || endPort.label,
                portLabel: endPort.label,
                portId: endPort.portId || endPort.id
            } : null,
            waypoints: waypoints,
            hasWaypoints: true,
            wireType: wireType,
            wireGauge: wireGauge,
            length: this.calculateWireLength(waypoints),
            mesh: wireMesh,
            source: '2D-routing' // Mark as created from 2D routing
        };
        
        this.wires.push(wireData);
        
        console.log(`✅ Created 3D wire from 2D routing: ${wireData.startPort.portLabel} → ${wireData.endPort ? wireData.endPort.portLabel : 'hanging'}`);
        
        return wireMesh;
    }
    
    /**
     * Calculate wire length from waypoints
     */
    calculateWireLength(waypoints) {
        let length = 0;
        for (let i = 0; i < waypoints.length - 1; i++) {
            const p1 = waypoints[i];
            const p2 = waypoints[i + 1];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dz = p2.z - p1.z;
            length += Math.sqrt(dx * dx + dy * dy + dz * dz);
        }
        return length;
    }
}
