# PLC Ladder Diagram Simulator - Documentation

A web-based simulator for PLC (Programmable Logic Controller) ladder diagrams, built with vanilla JavaScript, HTML, and CSS.

## 📋 Project Status

**Current Phase**: Active Development - Logic Analysis System Complete

The simulator is fully functional with an advanced path-tracing algorithm for logic analysis.

## 📁 Current Documentation

### Core Documentation
- **`README.md`** (this file) - Main documentation overview
- **`PLANNING.md`** - Original planning and architecture document
- **`BRANCHING-DESIGN.md`** - Branch and wire connection design specifications

### Algorithm Documentation
- **`PATH-TRACING-ALGORITHM.md`** - Core path tracing algorithm that analyzes electrical flow
- **`COMMON-SUFFIX-FIX.md`** - Common suffix detection for convergence points
- **`PATH-DEDUPLICATION-FIX.md`** - Duplicate path elimination for complex branch structures
- **`MODULE-SEPARATION.md`** - Code organization into analysis.js module

### Data Structures
- **`ladder-structure.json`** - JSON schema for ladder diagrams
- **`component-types.json`** - Component library specifications
- **`algorithms.json`** - Algorithm documentation

## 🎯 Key Features

**Implemented:**
- ✅ Visual ladder diagram editor with drag-and-drop components
- ✅ NO (Normally Open) and NC (Normally Closed) contacts
- ✅ Output coils with state visualization
- ✅ Complex branching with multiple convergence points
- ✅ Path-tracing logic analysis algorithm
- ✅ JavaScript code generation from diagrams
- ✅ Real-time simulation and state updates
- ✅ Input/Output pin management

## 🔧 Technical Architecture

### File Structure
```
plcsim7/
├── index.html          # Main application
├── script.js           # UI, state management, rendering
├── analysis.js         # Logic analysis algorithms
├── styles.css          # Styling
└── docs/              # Documentation
```

### Logic Analysis System

The simulator uses a **path-tracing algorithm** that:
1. Traces all electrical paths from output coils back to power source (L+)
2. Identifies contacts along each path
3. Detects convergence points (common suffix)
4. Generates Boolean logic expressions
5. Deduplicates paths found through different traversals

**Example:**
```
Diagram:  I1-I2-|--Q5
              I3-|

Paths:    [[I1,I2], [I3]]
Logic:    if ((I1 && I2) || I3) { Q5 = true; }
```

## 📖 Algorithm Overview

### Path Tracing (`analysis.js`)
- **`detectBranches()`** - Main entry point for analyzing outputs
- **`tracePathsToSource()`** - Recursive backtracking from output to L+
- **`buildLogicFromPaths()`** - Converts paths to Boolean expressions

### Key Innovations
1. **Common Suffix Detection** - Identifies contacts after convergence points
2. **Path Deduplication** - Eliminates duplicate paths from complex branches
3. **Pure Functions** - No global state, all dependencies passed as parameters

## 🎯 Project Goals

Create an intuitive web-based tool that allows users to:
1. Build ladder logic diagrams on a grid
2. Assign input/output pins to components
3. Simulate circuit behavior in real-time
4. Toggle inputs and observe outputs
5. Support complex logic with branches (AND/OR)

## 🏗️ Architecture Overview

### Grid System
- 2D matrix-based coordinate system
- Configurable dimensions (default: 20×15)
- Fixed cell size for consistent layout
- Left rail (power) and right rail (ground)

### Core Components
- **Input Contacts**: NO (Normally Open), NC (Normally Closed)
- **Output Coils**: Standard, Latch, Unlatch
- **Branches**: For OR logic (parallel paths)
- **Wires**: Horizontal and vertical connections

### Logic Engine
- Continuous scan cycle (Input → Logic → Output)
- Top-to-bottom, left-to-right evaluation
- Series connections = AND logic
- Parallel branches = OR logic
- Real-time state updates

## 🚀 Planned Features

### Phase 1: Foundation
- [ ] Grid rendering system
- [ ] Basic component library
- [ ] Component placement
- [ ] Wire rendering

### Phase 2: Logic Engine
- [ ] Series connection evaluation
- [ ] Rung evaluation
- [ ] I/O state management
- [ ] Scan cycle implementation

### Phase 3: Advanced Logic
- [ ] Branch support (OR logic)
- [ ] Path detection
- [ ] Complex circuit evaluation
- [ ] NC contacts

### Phase 4: User Interface
- [ ] Pin assignment panel
- [ ] Input toggle controls
- [ ] Output indicators
- [ ] Save/Load functionality

### Phase 5: Enhancements
- [ ] Timer/Counter components
- [ ] Power flow animation
- [ ] Export capabilities
- [ ] Undo/Redo

## 💡 Example Use Case

**Motor Control Circuit**
```
Stop(NC)  Start(NO)   Motor(Output)
--| /|--+-----|  |----+-----( )--
        |              |
        +---Motor(NO)--+
        (seal-in contact)
```

This circuit demonstrates:
- Start button latches motor ON
- Stop button breaks the circuit
- Seal-in contact maintains motor state
- Combines AND and OR logic

## 🛠️ Technology Stack

- **HTML5** - Structure and canvas
- **CSS3** - Styling and grid layout
- **Vanilla JavaScript** - All logic and interactivity
- **localStorage** - Diagram persistence
- **No frameworks** - Lightweight and dependency-free

## 📖 Understanding Ladder Logic

Ladder diagrams are a graphical programming language used in PLCs:

- **Rungs**: Horizontal lines of logic (like ladder rungs)
- **Rails**: Vertical power lines (left = hot, right = neutral)
- **Contacts**: Input conditions (sensors, buttons, etc.)
- **Coils**: Outputs (motors, lights, relays, etc.)
- **Series = AND**: All contacts must be closed
- **Parallel = OR**: Vertical branches from parent path

### Branch Design (No Crossing Wires)
```
Parent Path  --|  |----------( )
                  |
Child Path        +--|  |----
```
- Parent continues horizontally
- Children drop down vertically
- Clean, scalable structure

## 🔄 Scan Cycle

The PLC continuously executes:
1. **Input Scan** - Read all input states
2. **Logic Solve** - Evaluate ladder logic
3. **Output Scan** - Update all outputs
4. **Repeat** - Next cycle

## 📐 Grid-Based Design

All components are placed on a grid:
- **Coordinates**: (x, y) where x=column, y=row
- **Connections**: Implicit based on adjacency
- **Tracing**: Left-to-right path finding
- **Branches**: Vertical connections for parallel paths

## 🎓 Implementation Status

- ✅ HTML structure with component palette
- ✅ Grid system with canvas rendering
- ✅ Component placement and management
- ✅ Path-tracing logic engine
- ✅ Branch detection with convergence support
- ✅ Real-time simulation
- ✅ JavaScript code generation
- ✅ Input/Output state management
- ✅ Debug console with detailed logging

## 📚 Further Reading

- **PATH-TRACING-ALGORITHM.md** - Deep dive into the path tracing approach
- **COMMON-SUFFIX-FIX.md** - How convergence points are detected
- **PATH-DEDUPLICATION-FIX.md** - Handling complex branch structures
- **MODULE-SEPARATION.md** - Code organization philosophy

## 📝 License

This project is open source and available for educational purposes.

---

**Last Updated**: October 19, 2025  
**Status**: Active Development - Core Features Complete

