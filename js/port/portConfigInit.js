// Port Config Viewer - Initialization
// Initializes the port config viewer and sets up button handlers

// Initialize Port Config Viewer
window.initPortConfigViewer = async function() {
    if (portConfigViewer) return; // Already initialized
    
    portConfigViewer = new PortConfigViewer();
    
    // Store models globally for button access
    window.portConfigModels = [];
    
    // Setup model list
    try {
        // Add cache-busting parameter to ensure fresh catalog data
        const catalogResponse = await fetch('libs/model/catalog.json?v=' + Date.now());
        const catalog = await catalogResponse.json();
        const modelListDiv = document.getElementById('portConfigAvailableModels');
        
        modelListDiv.innerHTML = ''; // Clear loading message
        
        // Add catalog models
        catalog.models.forEach((model, index) => {
            window.portConfigModels.push(model);
            const formatIcon = model.format === 'obj' ? '🎨' : '📦';
            
            const button = document.createElement('button');
            button.className = 'btn btn-secondary btn-small';
            button.style.cssText = 'width: 100%; margin-bottom: 5px; text-align: left;';
            button.innerHTML = `${formatIcon} ${model.name}`;
            button.onclick = () => {
                portConfigViewer.loadModel(model);
            };
            
            modelListDiv.appendChild(button);
        });
        
        // Store catalog in viewer for port config loading
        portConfigViewer.setCatalogModels(catalog.models);
        
        // Add custom models from localStorage
        const customModels = JSON.parse(localStorage.getItem('customModels') || '[]');
        if (customModels.length > 0) {
            const hr = document.createElement('hr');
            hr.style.cssText = 'border-color: #555; margin: 10px 0;';
            modelListDiv.appendChild(hr);
            
            const label = document.createElement('div');
            label.style.cssText = 'font-size: 11px; color: #888; margin-bottom: 5px;';
            label.textContent = 'Custom Models:';
            modelListDiv.appendChild(label);
            
            customModels.forEach(model => {
                window.portConfigModels.push(model);
                const formatIcon = model.format === 'obj' ? '🎨' : '📦';
                
                const button = document.createElement('button');
                button.className = 'btn btn-secondary btn-small';
                button.style.cssText = 'width: 100%; margin-bottom: 5px; text-align: left;';
                button.innerHTML = `${formatIcon} ${model.name}`;
                button.onclick = () => {
                    portConfigViewer.loadModel(model);
                };
                
                modelListDiv.appendChild(button);
            });
        }
        
    } catch (error) {
        console.error('Failed to load model catalog:', error);
        document.getElementById('portConfigAvailableModels').innerHTML = 
            '<p style="color: #e74c3c; font-size: 11px;">Failed to load models</p>';
    }
    
    // Setup buttons
    document.getElementById('portConfigClearDots').onclick = () => portConfigViewer.clearTemporaryDots();
    document.getElementById('portConfigClearPorts').onclick = () => portConfigViewer.clearAllPorts();
    document.getElementById('portConfigSavePorts').onclick = () => portConfigViewer.savePorts();
    document.getElementById('portConfigLoadPorts').onclick = () => portConfigViewer.loadPorts();
    document.getElementById('portConfigApplyScale').onclick = () => portConfigViewer.applyScale();
    document.getElementById('portConfigViewNormal').onclick = () => portConfigViewer.viewNormalToSurface();
    
    // Upload buttons (reuse existing upload functions from main 3D viewer)
    document.getElementById('portConfigUploadSTL').onclick = () => {
        alert('STL upload for port config - To be implemented');
    };
    document.getElementById('portConfigUploadOBJ').onclick = () => {
        alert('OBJ upload for port config - To be implemented');
    };
};
