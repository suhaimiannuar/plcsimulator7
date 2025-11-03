// Port Config Viewer - Storage Management
// Handles saving and loading port configurations

class PortConfigStorage {
    constructor(onSuccess, onError) {
        this.onSuccess = onSuccess || (() => {});
        this.onError = onError || ((error) => console.error(error));
    }

    savePorts(modelPorts, getCurrentModelInfo) {
        const portsData = {
            models: []
        };
        
        modelPorts.forEach((ports, modelId) => {
            portsData.models.push({
                modelId: modelId,
                ports: ports
            });
        });
        
        const json = JSON.stringify(portsData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'port-config.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.onSuccess('Port configuration saved', 'success');
    }

    loadPorts(onLoaded) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const text = await file.text();
                const portsData = JSON.parse(text);
                
                onLoaded(portsData);
                this.onSuccess('Port configuration loaded', 'success');
            } catch (error) {
                this.onError(`Failed to load: ${error.message}`, 'error');
            }
        };
        
        input.click();
    }
}
