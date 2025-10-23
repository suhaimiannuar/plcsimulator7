// ===== Diagram Management =====

// ===== Diagram Management =====
function newDiagram() {
    if (confirm('Create a new diagram? Current work will be lost.')) {
        state.diagram = {
            metadata: {
                name: 'Untitled Diagram',
                created: new Date().toISOString(),
                modified: new Date().toISOString()
            },
            grid: CONFIG.grid,
            components: [],
            inputs: [],
            outputs: []
        };
        
        stopSimulation();
        renderGrid();
        updateUI();
    }
}

function saveDiagram() {
    const json = JSON.stringify(state.diagram, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `ladder_diagram_${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    console.log('Diagram saved');
}

function loadDiagram() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        
        reader.onload = (event) => {
            try {
                const diagram = JSON.parse(event.target.result);
                state.diagram = diagram;
                stopSimulation();
                renderGrid();
                updateUI();
                updatePinList();
                console.log('Diagram loaded');
            } catch (error) {
                alert('Error loading diagram: ' + error.message);
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

function clearDiagram() {
    if (confirm('Clear all components? This cannot be undone.')) {
        state.diagram.components = [];
        state.diagram.inputs = [];
        state.diagram.outputs = [];
        state.diagram.feedbacks = [];
        
        stopSimulation();
        renderGrid();
        updateUI();
        updatePinList();
    }
}

