// ===== DOM Elements =====
const elements = {
    canvas: document.getElementById('ladderCanvas'),
    ctx: null,
    
    // Buttons
    runPauseBtn: document.getElementById('runPauseSimulation'),
    resetBtn: document.getElementById('resetSimulation'),
    scanCycleInput: document.getElementById('scanCycle'),
    speedMultiplierSelect: document.getElementById('speedMultiplier'),
    timeElapsedDisplay: document.getElementById('timeElapsed'),
    librariesBtn: document.getElementById('librariesBtn'),
    librariesModal: document.getElementById('librariesModal'),
    libraryList: document.getElementById('libraryList'),
    loadLibraryBtn: document.getElementById('loadLibraryBtn'),
    newBtn: document.getElementById('newDiagram'),
    saveBtn: document.getElementById('saveDiagram'),
    loadBtn: document.getElementById('loadDiagram'),
    clearBtn: document.getElementById('clearDiagram'),
    deleteToolBtn: document.getElementById('deleteTool'),
    selectToolBtn: document.getElementById('selectTool'),
    addInputBtn: document.getElementById('addInput'),
    addOutputBtn: document.getElementById('addOutput'),
    
    // Display areas
    statusDot: document.getElementById('statusDot'),
    statusText: document.getElementById('statusText'),
    cursorPosition: document.getElementById('cursorPosition'),
    selectedComponentDisplay: document.getElementById('selectedComponent'),
    inputList: document.getElementById('inputList'),
    feedbackList: document.getElementById('feedbackList'),
    outputList: document.getElementById('outputList'),
    propertiesContent: document.getElementById('propertiesContent'),
    
    // Pin List
    inputPinList: document.getElementById('inputPinList'),
    feedbackPinList: document.getElementById('feedbackPinList'),
    outputPinList: document.getElementById('outputPinList'),
    
    // Pin Modal
    pinModal: document.getElementById('pinModal'),
    pinForm: document.getElementById('pinAssignmentForm'),
    modalTitle: document.getElementById('modalTitle'),
    pinNumber: document.getElementById('pinNumber'),
    pinLabel: document.getElementById('pinLabel'),
    cancelPinBtn: document.getElementById('cancelPin'),
    closeModal: document.querySelector('.close'),
    
    // Timer Modal
    timerModal: document.getElementById('timerModal'),
    timerForm: document.getElementById('timerConfigForm'),
    timerModalTitle: document.getElementById('timerModalTitle'),
    timerLabel: document.getElementById('timerLabel'),
    timerPreset: document.getElementById('timerPreset'),
    timerTypeDisplay: document.getElementById('timerTypeDisplay'),
    cancelTimerBtn: document.getElementById('cancelTimer'),
    closeTimerModal: document.querySelector('.close-timer')
};
