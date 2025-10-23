# Module Dependency Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         LOAD ORDER                                │
└─────────────────────────────────────────────────────────────────┘

1. CONFIG.JS
   └─> Defines: CONFIG, COMPONENT_TYPES
       Used by: All modules

2. STATE.JS
   └─> Defines: state (uses CONFIG)
       Used by: All modules

3. DOM.JS
   └─> Defines: elements
       Used by: All modules

┌─────────────────────────────────────────────────────────────────┐
│                      UTILITY MODULES                              │
└─────────────────────────────────────────────────────────────────┘

4. CANVAS.JS
   ├─> Functions: handleCanvasClick, handleCanvasMouseMove
   │              handleCanvasMouseDown, handleCanvasMouseUp
   │              screenToGrid, gridToScreen, isValidGridPosition
   ├─> Uses: state, elements, CONFIG
   └─> Used by: components.js, keyboard.js, rendering.js

5. KEYBOARD.JS
   ├─> Functions: handleKeyboardShortcuts, copyComponent, cutComponent
   │              pasteComponent, deleteSelectedComponent
   │              saveHistory, undo, redo, findEmptyPosition
   ├─> Uses: state, elements, canvas.js, components.js
   └─> Used by: init.js (event listener setup)

┌─────────────────────────────────────────────────────────────────┐
│                      FEATURE MODULES                              │
└─────────────────────────────────────────────────────────────────┘

6. COMPONENTS.JS
   ├─> Functions: placeComponent, deleteComponent, selectComponent
   │              setMode, selectComponentType, getComponentAt
   ├─> Uses: state, elements, CONFIG, canvas.js, modals.js
   └─> Used by: canvas.js, keyboard.js, ui.js

7. MODALS.JS
   ├─> Functions: openPinModal, closeModal, handlePinAssignment
   │              openTimerConfigModal, closeTimerModal
   │              handleTimerConfig, openLibrariesModal
   │              closeLibrariesModal, loadLibrary
   ├─> Uses: state, elements, CONFIG
   └─> Used by: components.js, init.js

8. RENDERING.JS
   ├─> Functions: renderGrid, drawRails, drawComponent, drawContact
   │              drawOutput, drawWire, drawCorner, drawBranchPoint
   │              drawFunctionBlock, drawGlow, wrapText
   ├─> Uses: state, elements, CONFIG, canvas.js
   └─> Used by: components.js, simulation.js, ui.js

9. UI.JS
   ├─> Functions: updateUI, updateInputList, updateFeedbackList
   │              updateOutputList, updatePinList
   │              displayProperties, toggleInput
   ├─> Uses: state, elements, rendering.js
   └─> Used by: simulation.js, components.js, keyboard.js

10. SIMULATION.JS
    ├─> Functions: toggleRunPause, resetSimulation, startSimulation
    │              stopSimulation, scanCycle, evaluateCurrentFlow
    │              updateOutputStates, updateTimers, detectLoops
    ├─> Uses: state, elements, CONFIG, rendering.js, ui.js
    └─> Used by: init.js (event listener setup)

11. DIAGRAM.JS
    ├─> Functions: newDiagram, saveDiagram, loadDiagram
    │              clearDiagram, exportDiagram, importDiagram
    ├─> Uses: state, elements, rendering.js, ui.js
    └─> Used by: init.js (event listener setup)

┌─────────────────────────────────────────────────────────────────┐
│                    INITIALIZATION                                 │
└─────────────────────────────────────────────────────────────────┘

12. INIT.JS
    ├─> Functions: init, loadPinConfiguration, updatePinList
    │              resizeCanvas, setupEventListeners
    ├─> Uses: ALL modules
    └─> Called by: main.js

13. MAIN.JS
    └─> Entry point: Calls init()

┌─────────────────────────────────────────────────────────────────┐
│                    DEPENDENCY GRAPH                               │
└─────────────────────────────────────────────────────────────────┘

main.js
  └─> init.js
       ├─> config.js
       ├─> state.js (uses config.js)
       ├─> dom.js
       ├─> canvas.js (uses config, state, dom)
       ├─> keyboard.js (uses canvas, components)
       ├─> components.js (uses canvas, modals, rendering)
       ├─> modals.js (uses config, state, dom)
       ├─> rendering.js (uses canvas, config, state, dom)
       ├─> ui.js (uses rendering, state, dom)
       ├─> simulation.js (uses rendering, ui, config, state)
       └─> diagram.js (uses rendering, ui, state)

┌─────────────────────────────────────────────────────────────────┐
│                    KEY RELATIONSHIPS                              │
└─────────────────────────────────────────────────────────────────┘

CORE DATA:
  config.js ──> state.js ──> dom.js
      │            │            │
      └────────────┴────────────┴──> ALL MODULES

RENDERING PIPELINE:
  state ──> rendering.js ──> canvas
                  │
                  └──> ui.js ──> display updates

SIMULATION FLOW:
  user input ──> canvas.js ──> components.js
                                     │
                                     └──> simulation.js ──> ui.js

HISTORY MANAGEMENT:
  user action ──> keyboard.js ──> saveHistory()
                                        │
                                        └──> state.history

FILE I/O:
  user action ──> diagram.js ──> state ──> JSON
```

## Critical Dependencies

### Must Load First:
1. **config.js** - Defines CONFIG constant
2. **state.js** - Defines state object (uses CONFIG)
3. **dom.js** - Defines elements object

### Utility Layer:
4. **canvas.js** - Grid utilities (no dependencies on features)
5. **keyboard.js** - Clipboard/history (uses canvas)

### Feature Layer:
6. **components.js** - Depends on: canvas, modals
7. **modals.js** - Depends on: config, state, dom
8. **rendering.js** - Depends on: canvas, config, state
9. **ui.js** - Depends on: rendering
10. **simulation.js** - Depends on: rendering, ui
11. **diagram.js** - Depends on: rendering, ui

### Initialization:
12. **init.js** - Uses everything
13. **main.js** - Calls init()

## Module Communication

```
User Interaction
      │
      ├──> Canvas Events ──> canvas.js
      │                        │
      │                        ├──> placeComponent() ──> components.js
      │                        ├──> deleteComponent() ──> components.js  
      │                        └──> selectComponent() ──> components.js
      │
      ├──> Keyboard Events ──> keyboard.js
      │                          │
      │                          ├──> copy/paste ──> clipboard
      │                          └──> undo/redo ──> history
      │
      ├──> Button Clicks ──> init.js event handlers
      │                        │
      │                        ├──> Run/Pause ──> simulation.js
      │                        ├──> Save/Load ──> diagram.js
      │                        └──> Modals ──> modals.js
      │
      └──> State Changes ──> rendering.js ──> Canvas
                                │
                                └──> ui.js ──> DOM Updates
```
