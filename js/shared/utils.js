// ===== Shared Utilities - Bridge between Ladder Diagram and 3D Model =====

// Data structure to map ladder I/O to physical terminals
class IOMapping {
    constructor() {
        this.inputs = new Map();  // ladder input address -> physical terminal
        this.outputs = new Map(); // ladder output address -> physical terminal
        this.timers = new Map();  // ladder timer -> physical representation
        this.counters = new Map();
    }
    
    // Map input from ladder diagram to physical terminal
    mapInput(ladderAddress, component, terminalIndex) {
        this.inputs.set(ladderAddress, {
            component,
            terminal: component.terminals[terminalIndex],
            type: 'input'
        });
    }
    
    // Map output from ladder diagram to physical terminal
    mapOutput(ladderAddress, component, terminalIndex) {
        this.outputs.set(ladderAddress, {
            component,
            terminal: component.terminals[terminalIndex],
            type: 'output'
        });
    }
    
    // Get physical terminal for ladder address
    getPhysicalTerminal(address) {
        return this.inputs.get(address) || this.outputs.get(address);
    }
    
    // Export mapping as JSON
    exportMapping() {
        return {
            inputs: Array.from(this.inputs.entries()),
            outputs: Array.from(this.outputs.entries()),
            timers: Array.from(this.timers.entries()),
            counters: Array.from(this.counters.entries())
        };
    }
}

// Extract I/O from ladder diagram
class LadderIOExtractor {
    constructor(diagram) {
        this.diagram = diagram;
        this.inputs = new Set();
        this.outputs = new Set();
        this.timers = new Set();
        this.counters = new Set();
    }
    
    // Extract all I/O addresses from diagram
    extract() {
        // Extract from components
        if (this.diagram.components) {
            this.diagram.components.forEach(comp => {
                if (comp.type === 'INPUT' || comp.type === 'NO_CONTACT' || comp.type === 'NC_CONTACT') {
                    if (comp.label) this.inputs.add(comp.label);
                } else if (comp.type === 'OUTPUT' || comp.type === 'COIL') {
                    if (comp.label) this.outputs.add(comp.label);
                }
            });
        }
        
        // Extract from timers
        if (this.diagram.timers) {
            this.diagram.timers.forEach(timer => {
                if (timer.label) this.timers.add(timer.label);
            });
        }
        
        // Extract from counters
        if (this.diagram.counters) {
            this.diagram.counters.forEach(counter => {
                if (counter.label) this.counters.add(counter.label);
            });
        }
        
        return {
            inputs: Array.from(this.inputs).sort(),
            outputs: Array.from(this.outputs).sort(),
            timers: Array.from(this.timers).sort(),
            counters: Array.from(this.counters).sort()
        };
    }
    
    // Get I/O count
    getIOCount() {
        const io = this.extract();
        return {
            inputs: io.inputs.length,
            outputs: io.outputs.length,
            timers: io.timers.length,
            counters: io.counters.length,
            total: io.inputs.length + io.outputs.length
        };
    }
    
    // Suggest PLC configuration based on I/O count
    suggestPLCConfig() {
        const count = this.getIOCount();
        const suggestions = [];
        
        // Calculate required I/O modules
        const inputModules = Math.ceil(count.inputs / 16);
        const outputModules = Math.ceil(count.outputs / 16);
        
        suggestions.push({
            component: 'CPU',
            type: 'CPU_S7_1200',
            quantity: 1,
            reason: 'Main controller with onboard I/O'
        });
        
        if (inputModules > 0) {
            suggestions.push({
                component: 'Digital Input Module',
                type: 'DI_16CH',
                quantity: inputModules,
                reason: `${count.inputs} digital inputs required`
            });
        }
        
        if (outputModules > 0) {
            suggestions.push({
                component: 'Digital Output Module',
                type: 'DQ_16CH',
                quantity: outputModules,
                reason: `${count.outputs} digital outputs required`
            });
        }
        
        suggestions.push({
            component: '24V Power Supply',
            type: 'POWER_SUPPLY_24V',
            quantity: 1,
            reason: 'Power for PLC and I/O modules'
        });
        
        suggestions.push({
            component: 'Terminal Blocks',
            type: 'TERMINAL_BLOCK_12P',
            quantity: Math.ceil((count.inputs + count.outputs) / 12),
            reason: 'Field wiring terminals'
        });
        
        return suggestions;
    }
}

// Auto-wire generator based on ladder diagram
class AutoWireGenerator {
    constructor(ioMapping) {
        this.ioMapping = ioMapping;
        this.wireList = [];
    }
    
    // Generate wires for power distribution
    generatePowerWires(powerSupply, components) {
        const wires = [];
        
        // Connect power supply to each component
        components.forEach(comp => {
            if (comp.type !== 'power-supply') {
                // Find power terminals
                const powerInTerminal = comp.terminals.find(t => 
                    t.type === 'power-in' || t.label.includes('24V')
                );
                
                if (powerInTerminal) {
                    const powerOutTerminal = powerSupply.terminals.find(t => 
                        t.label === '24V+'
                    );
                    
                    if (powerOutTerminal) {
                        wires.push({
                            from: { component: powerSupply, terminal: powerOutTerminal },
                            to: { component: comp, terminal: powerInTerminal },
                            type: 'power',
                            label: '24VDC+'
                        });
                    }
                }
                
                // Ground connection
                const groundTerminal = comp.terminals.find(t => 
                    t.type === 'ground' || t.label.includes('0V')
                );
                
                if (groundTerminal) {
                    const groundOutTerminal = powerSupply.terminals.find(t => 
                        t.label === '0V'
                    );
                    
                    if (groundOutTerminal) {
                        wires.push({
                            from: { component: powerSupply, terminal: groundOutTerminal },
                            to: { component: comp, terminal: groundTerminal },
                            type: 'ground',
                            label: '0VDC'
                        });
                    }
                }
            }
        });
        
        return wires;
    }
    
    // Generate signal wires based on ladder logic
    generateSignalWires(ladderDiagram) {
        const wires = [];
        
        // This would analyze the ladder diagram connections
        // and generate corresponding physical wires
        
        return wires;
    }
    
    // Export wire list for BOM
    exportWireList() {
        const wireSummary = {};
        
        this.wireList.forEach(wire => {
            const key = `${wire.type}_${wire.gauge}mm`;
            if (!wireSummary[key]) {
                wireSummary[key] = {
                    type: wire.type,
                    gauge: wire.gauge,
                    color: wire.color,
                    totalLength: 0,
                    count: 0
                };
            }
            
            // Calculate wire length (simplified)
            const length = this.calculateWireLength(wire);
            wireSummary[key].totalLength += length;
            wireSummary[key].count++;
        });
        
        return Object.values(wireSummary);
    }
    
    calculateWireLength(wire) {
        if (!wire.path || wire.path.length < 2) return 0;
        
        let length = 0;
        for (let i = 0; i < wire.path.length - 1; i++) {
            const p1 = wire.path[i];
            const p2 = wire.path[i + 1];
            length += Math.sqrt(
                Math.pow(p2.x - p1.x, 2) +
                Math.pow(p2.y - p1.y, 2) +
                Math.pow(p2.z - p1.z, 2)
            );
        }
        
        return length;
    }
}

// Export utility classes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        IOMapping,
        LadderIOExtractor,
        AutoWireGenerator
    };
}
