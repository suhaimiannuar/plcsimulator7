// Port Config Viewer - UI Management
// Handles UI updates and interactions

class PortConfigUI {
    constructor(statusDiv) {
        this.statusDiv = statusDiv;
    }

    updatePortsList(currentModelId, currentModelName, modelPorts, onEditCallback, onDeleteCallback) {
        const content = document.getElementById('portConfigPortsContent');
        
        if (!currentModelId || !modelPorts.has(currentModelId)) {
            content.innerHTML = '<p style="color: #888; font-size: 12px;">No ports configured</p>';
            return;
        }
        
        const ports = modelPorts.get(currentModelId);
        content.innerHTML = ''; // Clear content
        
        ports.forEach((port, index) => {
            const portDiv = document.createElement('div');
            portDiv.style.cssText = 'background: #2c3e50; padding: 10px; margin-bottom: 8px; border-radius: 3px; border-left: 3px solid #e74c3c;';
            
            // Port info
            const labelDiv = document.createElement('div');
            labelDiv.style.cssText = 'font-weight: bold; color: #ecf0f1; margin-bottom: 5px; display: flex; justify-content: space-between; align-items: center;';
            labelDiv.innerHTML = `
                <span>${port.label}</span>
                <div style="display: flex; gap: 5px;">
                    <button onclick="portConfigViewer.editPortLabel(${index})" 
                            style="background: #3498db; border: none; color: white; padding: 2px 8px; border-radius: 3px; cursor: pointer; font-size: 10px;">
                        ✏️ Edit
                    </button>
                    <button onclick="portConfigViewer.deletePort(${index})" 
                            style="background: #e74c3c; border: none; color: white; padding: 2px 8px; border-radius: 3px; cursor: pointer; font-size: 10px;">
                        🗑️ Delete
                    </button>
                </div>
            `;
            
            const coordDiv = document.createElement('div');
            coordDiv.style.cssText = 'font-size: 10px; color: #95a5a6; margin-bottom: 3px;';
            coordDiv.textContent = `X: ${port.worldPosition.x.toFixed(1)}  Y: ${port.worldPosition.y.toFixed(1)}  Z: ${port.worldPosition.z.toFixed(1)}`;
            
            // Add normal direction if available
            const normalDiv = document.createElement('div');
            normalDiv.style.cssText = 'font-size: 10px; color: #3498db;';
            if (port.normal) {
                normalDiv.innerHTML = `<strong>→</strong> Normal: (${port.normal.x.toFixed(2)}, ${port.normal.y.toFixed(2)}, ${port.normal.z.toFixed(2)})`;
            } else {
                normalDiv.innerHTML = `<strong>⚠️</strong> <span style="color: #e67e22;">No direction data</span>`;
            }
            
            portDiv.appendChild(labelDiv);
            portDiv.appendChild(coordDiv);
            portDiv.appendChild(normalDiv);
            content.appendChild(portDiv);
        });
    }

    updateModelName(modelId, modelName) {
        document.getElementById('portConfigModelName').textContent = `${modelName} (ID: ${modelId})`;
    }

    log(message, type = 'info') {
        if (!this.statusDiv) return;
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.style.color = type === 'success' ? '#2ecc71' :
                           type === 'error' ? '#e74c3c' :
                           type === 'warning' ? '#f39c12' : '#3498db';
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        this.statusDiv.appendChild(entry);
        this.statusDiv.scrollTop = this.statusDiv.scrollHeight;
        
        while (this.statusDiv.children.length > 10) {
            this.statusDiv.removeChild(this.statusDiv.firstChild);
        }
    }
}
