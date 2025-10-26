// ===== 3D Scene Setup & Management =====

class ModelScene {
    constructor(containerId = 'model-container') {
        this.containerId = containerId;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.animationId = null;
        
        // Scene objects
        this.mountingSurfaces = [];
        this.plcComponents = [];
        this.wires = [];
        this.lights = [];
        this.fieldDevices = [];  // Field devices (buttons, motors, LEDs)
        
        // Interaction (legacy - will be replaced by InteractionManager)
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.selectedObject = null;
        this.selectedComponent = null;
        this.isDragging = false;
        
        // Enhanced interaction manager
        this.interactionManager = null;
        
        // UI helpers
        this.gridHelper = null;
        this.axesHelper = null;
        this.showGrid = true;
        this.showAxes = true;
        
        // Transform controls
        this.transformControls = null;
        this.transformMode = 'translate'; // 'translate', 'rotate', 'scale'
        
        // Magnetic snapping
        this.magneticSnapEnabled = true;
        this.snapDistance = 50; // Distance within which magnetic snap activates (mm)
        
        this.init();
    }
    
    // Initialize Three.js scene
    init() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`Container ${this.containerId} not found`);
            return;
        }
        
        console.log('Initializing 3D scene in container:', container);
        console.log('Container dimensions:', container.clientWidth, 'x', container.clientHeight);
        
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1e1e1e);
        
        // Setup camera
        const width = container.clientWidth || 800;
        const height = container.clientHeight || 600;
        const aspect = width / height;
        this.camera = new THREE.PerspectiveCamera(45, aspect, 1, 5000);
        this.camera.position.set(500, 400, 800);
        this.camera.lookAt(0, 0, 0);
        
        // Setup renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Ensure container is positioned so overlays (view cube, UI) can be absolute inside it
    if (!container.style.position) container.style.position = 'relative';
    this.renderer.domElement.id = 'modelCanvas';
    container.appendChild(this.renderer.domElement);
        
        console.log('Renderer created with size:', width, 'x', height);
        
        // Setup controls
        if (typeof THREE.OrbitControls !== 'undefined') {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.minDistance = 100;
            this.controls.maxDistance = 2000;
            console.log('OrbitControls initialized');
        } else {
            console.warn('OrbitControls not available');
        }
        
        // Add lights
        this.setupLights();
        
        // Add grid helper
        this.gridHelper = new THREE.GridHelper(1000, 50, 0x444444, 0x222222);
        this.scene.add(this.gridHelper);
        
        // Add axes helper
        this.axesHelper = new THREE.AxesHelper(200);
        this.scene.add(this.axesHelper);
        
        // Add transform controls if available
        if (typeof THREE.TransformControls !== 'undefined') {
            this.transformControls = new THREE.TransformControls(this.camera, this.renderer.domElement);
            this.transformControls.addEventListener('dragging-changed', (event) => {
                if (this.controls) {
                    this.controls.enabled = !event.value;
                }
                
                // On drag end, validate final position
                if (!event.value && this.transformControls.object) {
                    const attachedObj = this.transformControls.object;
                    const component = attachedObj.userData.component || attachedObj.userData.mounting;
                    
                    if (component && component.dimensions && !component.snapPoints) {
                        const collision = this.checkComponentCollision(
                            {
                                x: attachedObj.position.x,
                                y: attachedObj.position.y,
                                z: attachedObj.position.z
                            },
                            component.dimensions,
                            component
                        );
                        
                        if (collision.collides) {
                            alert(collision.reason + '\nComponent will be reverted to previous position.');
                            
                            // Revert to stored position
                            if (component.position) {
                                attachedObj.position.set(
                                    component.position.x,
                                    component.position.y,
                                    component.position.z
                                );
                            }
                        } else {
                            // Update component position
                            component.position.x = attachedObj.position.x;
                            component.position.y = attachedObj.position.y;
                            component.position.z = attachedObj.position.z;
                        }
                        
                        // Reset visual feedback
                        attachedObj.traverse((child) => {
                            if (child.material && child.userData.originalColor) {
                                child.material.color.copy(child.userData.originalColor);
                                child.material.opacity = 1.0;
                                child.material.transparent = false;
                            }
                        });
                    }
                }
            });
            
            // Add magnetic snapping on drag - use 'change' event instead of 'objectChange'
            this.transformControls.addEventListener('change', () => {
                if (this.transformControls.dragging) {
                    // Get component from attached object's userData
                    const attachedObj = this.transformControls.object;
                    if (attachedObj && attachedObj.userData) {
                        const component = attachedObj.userData.component || attachedObj.userData.mounting;
                        if (component) {
                            // Apply magnetic snapping if enabled
                            if (this.magneticSnapEnabled) {
                                this.applyMagneticSnap(component);
                            }
                            
                            // Check for collisions in real-time (for non-mounting objects)
                            if (component.dimensions && !component.snapPoints) {
                                const collision = this.checkComponentCollision(
                                    {
                                        x: attachedObj.position.x,
                                        y: attachedObj.position.y,
                                        z: attachedObj.position.z
                                    },
                                    component.dimensions,
                                    component
                                );
                                
                                if (collision.collides) {
                                    // Visual feedback: make it semi-transparent red to show collision
                                    attachedObj.traverse((child) => {
                                        if (child.material) {
                                            if (!child.userData.originalColor) {
                                                child.userData.originalColor = child.material.color.clone();
                                            }
                                            child.material.color.setHex(0xff0000);
                                            child.material.opacity = 0.5;
                                            child.material.transparent = true;
                                        }
                                    });
                                } else {
                                    // Reset color
                                    attachedObj.traverse((child) => {
                                        if (child.material && child.userData.originalColor) {
                                            child.material.color.copy(child.userData.originalColor);
                                            child.material.opacity = 1.0;
                                            child.material.transparent = false;
                                        }
                                    });
                                }
                            }
                        }
                    }
                }
            });
            
            this.scene.add(this.transformControls);
        }
        
        console.log('Scene setup complete. Grid and axes added.');
        
        // Initialize Interaction Manager (replaces old mouse handlers)
        if (typeof InteractionManager !== 'undefined') {
            this.interactionManager = new InteractionManager(this);
            console.log('✅ Interaction Manager enabled');
        } else {
            console.warn('⚠️ InteractionManager not loaded, using legacy mouse handlers');
            // Legacy event listeners
            this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
            this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
            this.renderer.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
        }
        
        // Window resize listener
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        // Start animation loop
        this.animate();
        
        console.log('3D scene initialized successfully');
    }
    
    // Setup scene lighting
    setupLights() {
        // Ambient light
        const ambient = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambient);
        
        // Main directional light
        const mainLight = new THREE.DirectionalLight(0xffffff, 0.6);
        mainLight.position.set(500, 500, 500);
        mainLight.castShadow = true;
        mainLight.shadow.camera.left = -500;
        mainLight.shadow.camera.right = 500;
        mainLight.shadow.camera.top = 500;
        mainLight.shadow.camera.bottom = -500;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        this.scene.add(mainLight);
        
        // Fill light
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(-300, 200, -300);
        this.scene.add(fillLight);
        
        this.lights = [ambient, mainLight, fillLight];
    }
    
    // Add mounting surface to scene
    addMountingSurface(mountingType, dimensions, position = { x: 0, y: 0, z: 0 }) {
        let mounting;
        
        switch (mountingType) {
            case 'plate':
                mounting = new MountingPlate(
                    dimensions.width || 400,
                    dimensions.length || 600,
                    dimensions.thickness || 2
                );
                break;
                
            case 'box':
                mounting = new MountingBox(
                    dimensions.width || 400,
                    dimensions.length || 600,
                    dimensions.height || 300,
                    dimensions.wallThickness || 2
                );
                break;
                
            case 'shelf':
                mounting = new MountingShelf(
                    dimensions.wallWidth || 400,
                    dimensions.wallHeight || 300,
                    dimensions.shelfDepth || 200,
                    dimensions.thickness || 2
                );
                break;
                
            case 'din-rail':
                mounting = new DINRail(dimensions.length || 500);
                break;
                
            default:
                console.error('Unknown mounting type:', mountingType);
                return null;
        }
        
        // Compute mounting center position (for some mountings we accept bottom-left origin input)
        let computedPos = { ...position };

        // If user provided a bottom-left origin for 'box' mountings, convert to center-based position
        if (mountingType === 'box') {
            const w = mounting.dimensions.width;
            const h = mounting.dimensions.height;
            const l = mounting.dimensions.length;
            // Interpret provided position as bottom-left corner on the ground (y = ground)
            computedPos = {
                x: position.x + w / 2,
                y: position.y + h / 2,
                z: position.z + l / 2
            };
        }

        // Set position
        mounting.position = { ...computedPos };
        
        // CHECK COLLISION with existing mountings
        if (this.checkMountingCollision(mounting)) {
            console.warn('❌ Cannot add mounting: Collision detected with existing mounting');
            alert('Cannot add mounting surface here - it would collide with an existing mounting.');
            return null;
        }
        
        const mesh = mounting.createMesh();
        if (mesh) {
            mesh.position.set(mounting.position.x, mounting.position.y, mounting.position.z);
            mesh.userData.mounting = mounting;
            mesh.userData.interactive = true; // Make mounting surfaces selectable
            this.scene.add(mesh);
            this.mountingSurfaces.push(mounting);
            console.log('✅ Mounting surface added:', mountingType, position);
        }
        
        return mounting;
    }
    
    // Add PLC component to scene
    addPLCComponent(componentType, position = { x: 0, y: 0, z: 0 }) {
        // VALIDATE: Check if mounting surface exists
    const validation = this.canAddComponent(position, componentType);
        if (!validation.valid) {
            console.warn('❌ Cannot add component:', validation.reason);
            alert(validation.reason);
            return null;
        }
        
        // Snap position to mounting surface
        const snapPoint = validation.snapPoint;
        const snappedPosition = {
            x: snapPoint.x,
            y: snapPoint.y,
            z: snapPoint.z
        };
        
        // Determine component dimensions (used for snapping/alignment)
        let compDims = { width: 50, height: 50, depth: 50 };
        switch (componentType) {
            case 'power-supply': compDims = { width: 54, height: 90, depth: 65 }; break;
            case 'cpu': compDims = { width: 100, height: 100, depth: 75 }; break;
            case 'digital-input':
            case 'digital-output': compDims = { width: 36, height: 90, depth: 65 }; break;
            case 'terminal-block': compDims = { width: 20, height: 50, depth: 40 }; break;
            default: compDims = { width: 50, height: 50, depth: 50 };
        }
        
        // Adjust Y position to sit ON the surface (not inside it)
        snappedPosition.y = snapPoint.y + compDims.height / 2;
        
        // Check for collisions
        const collision = this.checkComponentCollision(snappedPosition, compDims);
        if (collision.collides) {
            console.warn('❌ Cannot add component:', collision.reason);
            alert(collision.reason);
            return null;
        }

        // Create simple component object (no class needed)
        const component = {
            id: `plc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: componentType,
            name: this.getComponentName(componentType),
            position: { ...snappedPosition },
            dimensions: compDims,
            rotation: { x: 0, y: 0, z: 0 },
            scale: 1,
            state: false,
            terminals: [],
            mountingSurface: validation.mounting,
            snapPoint: snapPoint
        };
        
        // Create mesh based on type
        const mesh = this.createComponentMesh(componentType, component);
        
        if (mesh) {
            mesh.position.set(snappedPosition.x, snappedPosition.y, snappedPosition.z);
            mesh.userData.component = component;
            mesh.userData.interactive = true;
            component.mesh = mesh;
            
            this.scene.add(mesh);
            this.plcComponents.push(component);
            
            // Attach to mounting surface
            validation.mounting.attachComponent(component, snapPoint);
            
            // Try to load STEP model if available
            this.tryLoadStepModel(component, componentType);
            
            console.log('✅ Component added and snapped to mounting:', component.name);
        }
        
        return component;
    }
    
    // Add field device to scene (button, motor, LED)
    addFieldDevice(deviceType, position = { x: 0, y: 0, z: 0 }, options = {}) {
        // VALIDATE: Check if mounting surface exists
    const validation = this.canAddComponent(position, deviceType);
        if (!validation.valid) {
            console.warn('❌ Cannot add device:', validation.reason);
            alert(validation.reason);
            return null;
        }
        
        // Snap position to mounting surface
        const snapPoint = validation.snapPoint;
        const snappedPosition = {
            x: snapPoint.x,
            y: snapPoint.y,
            z: snapPoint.z
        };
        
        // Determine device dimensions for snapping
        let devDims = { width: 20, height: 20, depth: 20 };
        switch (deviceType) {
            case 'button': devDims = { width: 15, height: 30, depth: 15 }; break;
            case 'motor': devDims = { width: 100, height: 40, depth: 100 }; break;
            case 'led': devDims = { width: 10, height: 25, depth: 10 }; break;
            default: devDims = { width: 20, height: 20, depth: 20 };
        }
        
        // Adjust Y position to sit ON the surface
        snappedPosition.y = snapPoint.y + devDims.height / 2;
        
        // Check for collisions
        const collision = this.checkComponentCollision(snappedPosition, devDims);
        if (collision.collides) {
            console.warn('❌ Cannot add device:', collision.reason);
            alert(collision.reason);
            return null;
        }
        
        // Create simple device object
        const device = {
            id: `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: deviceType,
            name: options.name || this.getComponentName(deviceType),
            position: { ...snappedPosition },
            dimensions: devDims,
            rotation: { x: 0, y: 0, z: 0 },
            scale: 1,
            state: false,
            mountingSurface: validation.mounting,
            snapPoint: snapPoint,
            color: options.color || 0xff0000,
            buttonType: options.buttonType || 'momentary',
            power: options.power || 1500,
            // Toggle method for buttons/switches
            toggle: function() {
                this.state = !this.state;
                console.log(`${this.name} state: ${this.state}`);
                // Update mesh material if exists
                if (this.mesh) {
                    this.updateMeshState();
                }
            },
            updateMeshState: function() {
                // Update visual state of mesh
                if (this.mesh && this.mesh.children && this.mesh.children.length > 0) {
                    const buttonCap = this.mesh.children.find(child => child.name === 'buttonCap');
                    if (buttonCap && buttonCap.material) {
                        buttonCap.material.emissive = this.state ? 
                            new THREE.Color(this.color) : new THREE.Color(0x000000);
                        buttonCap.material.emissiveIntensity = this.state ? 0.5 : 0;
                    }
                }
            }
        };
        
        // Create mesh based on type
        const mesh = this.createComponentMesh(deviceType, device);
        
        if (mesh) {
            mesh.position.set(snappedPosition.x, snappedPosition.y, snappedPosition.z);
            mesh.userData.component = device;
            mesh.userData.interactive = true;
            device.mesh = mesh;
            
            this.scene.add(mesh);
            this.fieldDevices.push(device);
            
            // Attach to mounting surface
            validation.mounting.attachComponent(device, snapPoint);
            
            // Register with assignment manager
            if (typeof assignmentManager !== 'undefined') {
                assignmentManager.register3DComponent(device);
            }
            
            // Try to load STEP model if available
            this.tryLoadStepModel(device, deviceType);
            
            console.log('✅ Device added and snapped to mounting:', device.name);
        }
        
        return device;
    }
    
    // Get human-readable component name
    getComponentName(type) {
        const names = {
            'power-supply': 'Power Supply',
            'cpu': 'PLC CPU',
            'digital-input': 'Digital Input Module',
            'digital-output': 'Digital Output Module',
            'terminal-block': 'Terminal Block',
            'button': 'Push Button',
            'motor': 'Motor',
            'led': 'LED Indicator'
        };
        return names[type] || type;
    }
    
    // Create placeholder mesh for component (before STEP loads)
    createComponentMesh(type, component) {
        const group = new THREE.Group();
        group.name = component.name;
        
        // Scale factor: convert meters to scene units (1m = 1000 units)
        const SCALE = 1000;
        
        let geometry, material, mesh;
        
        switch (type) {
            case 'power-supply':
                // 3-module DIN rail power supply (54mm x 90mm x 65mm)
                geometry = new THREE.BoxGeometry(54, 90, 65);
                material = new THREE.MeshStandardMaterial({ 
                    color: 0x27ae60,
                    metalness: 0.6,
                    roughness: 0.4
                });
                mesh = new THREE.Mesh(geometry, material);
                mesh.position.y = 45;
                group.add(mesh);
                break;
                
            case 'cpu':
                // PLC CPU module (100mm x 100mm x 75mm)
                geometry = new THREE.BoxGeometry(100, 100, 75);
                material = new THREE.MeshStandardMaterial({ 
                    color: 0x95a5a6,
                    metalness: 0.5,
                    roughness: 0.5
                });
                mesh = new THREE.Mesh(geometry, material);
                mesh.position.y = 50;
                group.add(mesh);
                break;
                
            case 'digital-input':
            case 'digital-output':
                // I/O module (36mm x 90mm x 65mm)
                geometry = new THREE.BoxGeometry(36, 90, 65);
                material = new THREE.MeshStandardMaterial({ 
                    color: type === 'digital-input' ? 0x3498db : 0xe74c3c,
                    metalness: 0.5,
                    roughness: 0.5
                });
                mesh = new THREE.Mesh(geometry, material);
                mesh.position.y = 45;
                group.add(mesh);
                break;
                
            case 'terminal-block':
                // Terminal block (20mm x 50mm x 40mm)
                geometry = new THREE.BoxGeometry(20, 50, 40);
                material = new THREE.MeshStandardMaterial({ 
                    color: 0x7f8c8d,
                    metalness: 0.3,
                    roughness: 0.7
                });
                mesh = new THREE.Mesh(geometry, material);
                group.add(mesh);
                break;
                
            case 'button':
                // Push button (15mm diameter, 30mm height)
                const housingGeom = new THREE.CylinderGeometry(15, 15, 30, 16);
                const housingMat = new THREE.MeshStandardMaterial({ 
                    color: 0x2c3e50,
                    metalness: 0.6,
                    roughness: 0.4
                });
                const housing = new THREE.Mesh(housingGeom, housingMat);
                housing.rotation.x = Math.PI / 2;
                group.add(housing);
                
                // Button cap (12mm diameter, 10mm height)
                const capGeom = new THREE.CylinderGeometry(12, 12, 10, 16);
                const capMat = new THREE.MeshStandardMaterial({ 
                    color: component.color || 0xff0000,
                    metalness: 0.3,
                    roughness: 0.6
                });
                const cap = new THREE.Mesh(capGeom, capMat);
                cap.rotation.x = Math.PI / 2;
                cap.position.z = 20;
                cap.name = 'buttonCap';
                group.add(cap);
                break;
                
            case 'motor':
                // Motor body (40mm diameter, 100mm length)
                const bodyGeom = new THREE.CylinderGeometry(40, 40, 100, 32);
                const bodyMat = new THREE.MeshStandardMaterial({ 
                    color: 0x34495e,
                    metalness: 0.7,
                    roughness: 0.3
                });
                const body = new THREE.Mesh(bodyGeom, bodyMat);
                body.rotation.z = Math.PI / 2;
                group.add(body);
                
                // Shaft (8mm diameter, 50mm length)
                const shaftGeom = new THREE.CylinderGeometry(8, 8, 50, 16);
                const shaftMat = new THREE.MeshStandardMaterial({ 
                    color: 0xbdc3c7,
                    metalness: 0.9,
                    roughness: 0.1
                });
                const shaft = new THREE.Mesh(shaftGeom, shaftMat);
                shaft.rotation.z = Math.PI / 2;
                shaft.position.x = 75;
                group.add(shaft);
                break;
                
            case 'led':
                // LED housing (10mm diameter, 25mm height)
                const ledHousingGeom = new THREE.CylinderGeometry(10, 10, 25, 16);
                const ledHousingMat = new THREE.MeshStandardMaterial({ 
                    color: 0x2c3e50,
                    metalness: 0.6,
                    roughness: 0.4
                });
                const ledHousing = new THREE.Mesh(ledHousingGeom, ledHousingMat);
                group.add(ledHousing);
                
                // LED lens (8mm diameter, 5mm height)
                const lensGeom = new THREE.CylinderGeometry(8, 8, 5, 16);
                const lensColor = component.color === 'green' ? 0x00ff00 : 
                                 component.color === 'amber' ? 0xffaa00 : 0xff0000;
                const lensMat = new THREE.MeshStandardMaterial({ 
                    color: lensColor,
                    transparent: true,
                    opacity: 0.8,
                    emissive: lensColor,
                    emissiveIntensity: 0.3
                });
                const lens = new THREE.Mesh(lensGeom, lensMat);
                lens.position.y = 15;
                lens.position.y = 0.015;
                group.add(lens);
                break;
                
            default:
                // Generic box (50mm cube)
                geometry = new THREE.BoxGeometry(50, 50, 50);
                material = new THREE.MeshStandardMaterial({ 
                    color: 0x7f8c8d,
                    metalness: 0.5,
                    roughness: 0.5
                });
                mesh = new THREE.Mesh(geometry, material);
                group.add(mesh);
        }
        
        // Add shadow casting
        group.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        return group;
    }
    
    // Try to load STEP model and replace placeholder
    async tryLoadStepModel(component, type) {
        if (typeof STEPLoader === 'undefined') {
            console.log('STEPLoader not available, using placeholder geometry');
            return;
        }
        
        // Map component types to STEP files
        const stepFiles = {
            'power-supply': 'libs/model/power-converter.step',
            'cpu': 'libs/model/plc-cpu.step',
            'digital-input': 'libs/model/circuit-breaker.step',
            'digital-output': 'libs/model/circuit-breaker.step',
            'button': 'libs/model/circuit-breaker.step',
            'motor': 'libs/model/motor-controller.step',
            'led': 'libs/model/stack-light.step'
        };
        
        const stepFile = stepFiles[type];
        if (!stepFile) {
            console.log(`No STEP file mapped for type: ${type}`);
            return;
        }
        
        try {
            const loader = new STEPLoader();
            const stepModel = await new Promise((resolve, reject) => {
                loader.load(stepFile, resolve, undefined, reject);
            });
            
            if (stepModel && component.mesh) {
                // Remove placeholder geometry
                while (component.mesh.children.length > 0) {
                    component.mesh.remove(component.mesh.children[0]);
                }
                
                // Add STEP model
                component.mesh.add(stepModel);
                console.log(`Loaded STEP model for ${component.name}: ${stepFile}`);
            }
        } catch (error) {
            console.warn(`Failed to load STEP model for ${type}:`, error);
            // Keep using placeholder geometry
        }
    }
    
    // Toggle grid visibility
    toggleGrid(visible = null) {
        if (visible === null) {
            this.showGrid = !this.showGrid;
        } else {
            this.showGrid = visible;
        }
        
        if (this.gridHelper) {
            this.gridHelper.visible = this.showGrid;
        }
        
        return this.showGrid;
    }
    
    // Toggle axes visibility
    toggleAxes(visible = null) {
        if (visible === null) {
            this.showAxes = !this.showAxes;
        } else {
            this.showAxes = visible;
        }
        
        if (this.axesHelper) {
            this.axesHelper.visible = this.showAxes;
        }
        
        return this.showAxes;
    }
    
    // Set transform mode
    setTransformMode(mode) {
        if (['translate', 'rotate', 'scale'].includes(mode)) {
            this.transformMode = mode;
            if (this.transformControls) {
                this.transformControls.setMode(mode);
            }
        }
    }
    
    // Select component for transformation
    selectComponent(component) {
        if (!component) return;
        
        // Store selected component
        this.selectedComponent = component;
        
        // Find mesh in scene
        const mesh = this.scene.children.find(
            child => child.userData.component === component || child.userData.mounting === component
        );
        
        if (mesh && this.transformControls) {
            this.transformControls.attach(mesh);
            this.selectedObject = mesh;
            
            // Check if it's a mounting surface
            const isMounting = !!component.snapPoints;
            console.log('Selected:', component.name || component.type, isMounting ? '(Mounting Surface)' : '(Component)');
        }
        
        // Update property editor if exists
        if (window.propertyEditor) {
            window.propertyEditor.updatePanel(component);
        }
        
        // Update UI
        if (typeof updateComponentInfo === 'function') {
            updateComponentInfo(component);
        }
        
        // Update sidebar info
        if (typeof updateSidebarComponentInfo === 'function') {
            updateSidebarComponentInfo(component);
        }
        
        // Dispatch event
        window.dispatchEvent(new CustomEvent('componentSelected', { 
            detail: { component } 
        }));
        
        // Show/hide assign buttons
        this.updateAssignmentButtons(component);
    }
    
    // Deselect component
    deselectComponent() {
        if (this.transformControls) {
            this.transformControls.detach();
        }
        this.selectedObject = null;
        this.selectedComponent = null;
        
        // Clear property editor
        if (window.propertyEditor) {
            window.propertyEditor.clearSelection();
        }
        
        // Hide component info
        if (typeof updateComponentInfo === 'function') {
            updateComponentInfo(null);
        }
        
        // Update sidebar info
        if (typeof updateSidebarComponentInfo === 'function') {
            updateSidebarComponentInfo(null);
        }
        
        // Dispatch event
        window.dispatchEvent(new CustomEvent('componentDeselected'));
        
        // Hide assign buttons
        this.updateAssignmentButtons(null);
    }
    
    // Update assignment button visibility
    updateAssignmentButtons(component) {
        const assignBtn = document.getElementById('assignSelected');
        const selectedInfoPanel = document.getElementById('selectedComponentInfo3D');
        
        if (!assignBtn || !selectedInfoPanel) return;
        
        if (component && (component.type === 'button' || component.type === 'motor' || component.type === 'led')) {
            // Show selected component panel
            selectedInfoPanel.style.display = 'block';
            
            // Update component details
            document.getElementById('compName').textContent = component.name || component.type;
            document.getElementById('compType').textContent = component.type;
            
            // Update assignment status
            const assignmentSpan = document.getElementById('compAssignment');
            if (typeof assignmentManager !== 'undefined' && assignmentManager.isAssigned(component)) {
                const address = assignmentManager.getLadderAddress(component);
                assignmentSpan.textContent = `📌 ${address}`;
                assignmentSpan.style.color = '#4CAF50';
            } else {
                assignmentSpan.textContent = '⚠️ Not assigned';
                assignmentSpan.style.color = '#FF9800';
            }
        } else {
            // Hide selected component panel
            selectedInfoPanel.style.display = 'none';
        }
    }
    
    // Rotate selected component
    rotateComponent(x, y, z) {
        if (this.selectedObject && this.selectedObject.userData.component) {
            const component = this.selectedObject.userData.component;
            // Update component's rotation data
            component.rotation = { x, y, z };
            this.selectedObject.rotation.set(x, y, z);
        }
    }
    
    // Translate selected component
    translateComponent(x, y, z) {
        if (this.selectedObject && this.selectedObject.userData.component) {
            const component = this.selectedObject.userData.component;
            // Update component's position data
            component.position.x += x;
            component.position.y += y;
            component.position.z += z;
            this.selectedObject.position.add(new THREE.Vector3(x, y, z));
        }
    }
    
    // Load external model for component (STEP, OBJ, STL)
    async loadComponentModel(component, url, format = 'obj') {
        if (!component) return null;
        
        let model = null;
        
        try {
            if (format === 'step' || format === 'stp') {
                if (typeof STEPLoader === 'undefined') {
                    console.error('STEPLoader not available');
                    return null;
                }
                const loader = new STEPLoader();
                model = await new Promise((resolve, reject) => {
                    loader.load(url, resolve, undefined, reject);
                });
            } else if (format === 'obj') {
                if (typeof THREE.OBJLoader === 'undefined') {
                    console.error('OBJLoader not available');
                    return null;
                }
                const loader = new THREE.OBJLoader();
                model = await loader.loadAsync(url);
            } else if (format === 'stl') {
                if (typeof THREE.STLLoader === 'undefined') {
                    console.error('STLLoader not available');
                    return null;
                }
                const loader = new THREE.STLLoader();
                const geometry = await loader.loadAsync(url);
                const material = new THREE.MeshStandardMaterial({
                    color: 0x7f8c8d,
                    metalness: 0.5,
                    roughness: 0.5
                });
                model = new THREE.Mesh(geometry, material);
            }
            
            if (model && component.mesh) {
                // Remove placeholder geometry from mesh
                while (component.mesh.children.length > 0) {
                    component.mesh.remove(component.mesh.children[0]);
                }
                
                // Add loaded model to component's mesh
                component.mesh.add(model);
                console.log(`Loaded ${format.toUpperCase()} model for ${component.name}`);
            }
            
            return model;
        } catch (error) {
            console.error(`Failed to load ${format.toUpperCase()} model:`, error);
            return null;
        }
    }
    
    // Add wire between terminals
    addWire(fromComponent, fromTerminalIdx, toComponent, toTerminalIdx, wireType = 'signal') {
        const fromTerminal = fromComponent.terminals[fromTerminalIdx];
        const toTerminal = toComponent.terminals[toTerminalIdx];
        
        if (!fromTerminal || !toTerminal) {
            console.error('Invalid terminal indices');
            return null;
        }
        
        const wire = new Wire(fromTerminal, toTerminal, wireType);
        
        const fromPos = fromComponent.getTerminalWorldPosition(fromTerminal);
        const toPos = toComponent.getTerminalWorldPosition(toTerminal);
        
        wire.calculatePath(fromPos, toPos);
        const wireMesh = wire.createMesh();
        
        if (wireMesh) {
            this.scene.add(wireMesh);
            this.wires.push(wire);
            
            fromComponent.connectWire(fromTerminal, wire);
            toComponent.connectWire(toTerminal, wire);
        }
        
        return wire;
    }
    
    // ===== MOUNTING VALIDATION SYSTEM =====
    
    // Check if any mounting surface exists
    hasMountingSurface() {
        return this.mountingSurfaces.length > 0;
    }
    
    // Check if two mountings collide
    checkMountingCollision(newMounting) {
        for (const existing of this.mountingSurfaces) {
            if (this.mountingsIntersect(existing, newMounting)) {
                return true; // Collision detected
            }
        }
        return false;
    }
    
    // Check if two mounting surfaces intersect
    mountingsIntersect(mount1, mount2) {
        // Get bounding boxes for both mountings
        const box1 = this.getMountingBoundingBox(mount1);
        const box2 = this.getMountingBoundingBox(mount2);
        
        return box1.intersectsBox(box2);
    }
    
    // Get bounding box for mounting surface
    getMountingBoundingBox(mounting) {
        const pos = mounting.position;
        const dims = mounting.dimensions;
        
        let min, max;
        
        switch(mounting.type) {
            case 'plate':
                min = new THREE.Vector3(
                    pos.x - dims.width / 2,
                    pos.y - dims.thickness / 2,
                    pos.z - dims.length / 2
                );
                max = new THREE.Vector3(
                    pos.x + dims.width / 2,
                    pos.y + dims.thickness / 2,
                    pos.z + dims.length / 2
                );
                break;
                
            case 'box':
                min = new THREE.Vector3(
                    pos.x - dims.width / 2,
                    pos.y - dims.height / 2,
                    pos.z - dims.length / 2
                );
                max = new THREE.Vector3(
                    pos.x + dims.width / 2,
                    pos.y + dims.height / 2,
                    pos.z + dims.length / 2
                );
                break;
                
            case 'shelf':
                min = new THREE.Vector3(
                    pos.x - dims.wallWidth / 2,
                    pos.y - dims.wallHeight / 2,
                    pos.z - dims.thickness / 2
                );
                max = new THREE.Vector3(
                    pos.x + dims.wallWidth / 2,
                    pos.y + dims.wallHeight / 2,
                    pos.z + dims.shelfDepth + dims.thickness / 2
                );
                break;
                
            case 'din-rail':
                min = new THREE.Vector3(
                    pos.x - dims.width / 2,
                    pos.y - dims.height / 2,
                    pos.z - dims.length / 2
                );
                max = new THREE.Vector3(
                    pos.x + dims.width / 2,
                    pos.y + dims.height / 2,
                    pos.z + dims.length / 2
                );
                break;
                
            default:
                min = new THREE.Vector3(pos.x, pos.y, pos.z);
                max = new THREE.Vector3(pos.x, pos.y, pos.z);
        }
        
        return new THREE.Box3(min, max);
    }
    
    // Find nearest mounting surface for a component
    findNearestMounting(position) {
        if (this.mountingSurfaces.length === 0) {
            return null;
        }
        
        let nearest = null;
        let minDist = Infinity;
        
        for (const mounting of this.mountingSurfaces) {
            const snapPoint = this.getNearestSnapPoint(mounting, position);
            if (snapPoint) {
                const dist = this.distance3D(position, snapPoint);
                if (dist < minDist) {
                    minDist = dist;
                    nearest = { mounting, snapPoint, distance: dist };
                }
            }
        }
        
        return nearest;
    }
    
    // Get nearest snap point on a mounting surface
    getNearestSnapPoint(mounting, position) {
        if (mounting.findNearestSnapPoint) {
            return mounting.findNearestSnapPoint(position);
        }
        
        const snapPoints = mounting.getSurfacePoints();
        if (!snapPoints || snapPoints.length === 0) {
            return null;
        }
        
        let nearest = null;
        let minDist = Infinity;
        
        for (const snap of snapPoints) {
            const dist = this.distance3D(position, snap);
            if (dist < minDist) {
                minDist = dist;
                nearest = snap;
            }
        }
        
        return nearest;
    }
    
    // Calculate 3D distance between two points
    distance3D(p1, p2) {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dz = p1.z - p2.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    
    // Validate if component can be added (must have mounting)
    canAddComponent(position, componentType = null) {
        if (!this.hasMountingSurface()) {
            return {
                valid: false,
                reason: 'No mounting surface available. Please add a mounting surface first.'
            };
        }
        
        const nearestMount = this.findNearestMounting(position);
        if (!nearestMount) {
            return {
                valid: false,
                reason: 'No suitable mounting surface found at this position.'
            };
        }
        
        // Enforce mounting-type specific surface rules
        const mountType = nearestMount.mounting.type;
        const snap = nearestMount.snapPoint || {};

        // Plate: only top/floor (normal.y === 1)
        if (mountType === 'plate') {
            if (!snap.normal || snap.normal.y !== 1) {
                return { valid: false, reason: 'Components can only be mounted on the top surface of a plate.' };
            }
        }

        // Box: allow bottom (floor) and walls (snap.surface defined)
        if (mountType === 'box') {
            if (!snap.surface && snap.normal && snap.normal.y !== 1) {
                return { valid: false, reason: 'Cannot mount on this area of the box.' };
            }
        }

        // Shelf: allow wall and shelf surfaces
        if (mountType === 'shelf') {
            if (!snap.surface || (snap.surface !== 'wall' && snap.surface !== 'shelf')) {
                return { valid: false, reason: 'Shelf mountings accept components on the wall and shelf surfaces only.' };
            }
        }

        // DIN rail: restrict to PLC modules / terminal blocks and require alignment
        if (mountType === 'din-rail') {
            const allowed = ['power-supply', 'cpu', 'digital-input', 'digital-output', 'terminal-block'];
            if (componentType && allowed.indexOf(componentType) === -1) {
                return { valid: false, reason: 'This type of component must be mounted on a DIN rail (PLC modules only).' };
            }
        }

        // Check if snap distance is reasonable (within 200 units)
        if (nearestMount.distance > 200) {
            return {
                valid: false,
                reason: 'Position too far from mounting surface. Move closer to snap.'
            };
        }
        
        return {
            valid: true,
            mounting: nearestMount.mounting,
            snapPoint: nearestMount.snapPoint
        };
    }
    
    // Check if component would collide with mounting surface or other components
    checkComponentCollision(position, dimensions, excludeComponent = null) {
        const bbox = new THREE.Box3(
            new THREE.Vector3(
                position.x - dimensions.width / 2,
                position.y - dimensions.height / 2,
                position.z - dimensions.depth / 2
            ),
            new THREE.Vector3(
                position.x + dimensions.width / 2,
                position.y + dimensions.height / 2,
                position.z + dimensions.depth / 2
            )
        );
        
        // Check collision with mounting surfaces
        for (const mounting of this.mountingSurfaces) {
            const mountBBox = this.getMountingBoundingBox(mounting);
            
            if (mounting.type === 'box') {
                // For BOX: component must be INSIDE the box, not intersecting walls
                const dims = mounting.dimensions;
                const pos = mounting.position;
                const wallThickness = dims.wallThickness || 2;
                
                // Define interior bounds (inside the walls)
                const interiorMin = new THREE.Vector3(
                    pos.x - dims.width / 2 + wallThickness,
                    pos.y - dims.height / 2 + wallThickness,
                    pos.z - dims.length / 2 + wallThickness
                );
                const interiorMax = new THREE.Vector3(
                    pos.x + dims.width / 2 - wallThickness,
                    pos.y + dims.height / 2,  // Open top
                    pos.z + dims.length / 2 - wallThickness
                );
                const interiorBox = new THREE.Box3(interiorMin, interiorMax);
                
                // Check if component is FULLY inside the interior
                if (!interiorBox.containsBox(bbox)) {
                    // Component is outside or intersecting walls
                    if (bbox.intersectsBox(mountBBox)) {
                        return {
                            collides: true,
                            reason: 'Component would collide with box walls. Components must be fully inside the box.'
                        };
                    }
                }
            } else if (mounting.type === 'plate') {
                // For PLATE: component must be ON TOP (not inside)
                if (bbox.intersectsBox(mountBBox)) {
                    const tolerance = 5; // mm
                    const isOnTop = Math.abs(bbox.min.y - mountBBox.max.y) < tolerance;
                    
                    if (!isOnTop) {
                        return {
                            collides: true,
                            reason: 'Component would collide with mounting plate. Components must be on top of the surface.'
                        };
                    }
                }
            } else {
                // For other mounting types (shelf, din-rail): basic intersection check
                if (bbox.intersectsBox(mountBBox)) {
                    return {
                        collides: true,
                        reason: 'Component would collide with mounting surface.'
                    };
                }
            }
        }
        
        // Check collision with other components
        const allComponents = [...this.plcComponents, ...this.fieldDevices];
        for (const comp of allComponents) {
            if (comp === excludeComponent || !comp.mesh || !comp.dimensions) continue;
            
            const compBBox = new THREE.Box3(
                new THREE.Vector3(
                    comp.position.x - comp.dimensions.width / 2,
                    comp.position.y - comp.dimensions.height / 2,
                    comp.position.z - comp.dimensions.depth / 2
                ),
                new THREE.Vector3(
                    comp.position.x + comp.dimensions.width / 2,
                    comp.position.y + comp.dimensions.height / 2,
                    comp.position.z + comp.dimensions.depth / 2
                )
            );
            
            if (bbox.intersectsBox(compBBox)) {
                return {
                    collides: true,
                    reason: `Component would collide with ${comp.name || comp.type}.`
                };
            }
        }
        
        return { collides: false };
    }
    
    // Snap component to mounting surface
    snapToMounting(component, mountingSurface, position) {
        if (mountingSurface instanceof DINRail) {
            // Special handling for DIN rail
            mountingSurface.snapModule(component, position);
        } else {
            // General snap to surface
            const snapPoint = mountingSurface.findNearestSnapPoint(position);
            if (snapPoint) {
                component.position.x = snapPoint.x;
                component.position.y = snapPoint.y + component.dimensions.height / 2;
                component.position.z = snapPoint.z;
                
                mountingSurface.attachComponent(component, snapPoint);
            }
        }
        
        // Update mesh position
        const mesh = this.scene.children.find(
            child => child.userData.component === component
        );
        if (mesh) {
            mesh.position.set(
                component.position.x,
                component.position.y,
                component.position.z
            );
        }
    }
    
    // Apply magnetic snapping to component being dragged
    applyMagneticSnap(component) {
        // Don't snap mounting surfaces themselves
        if (component.snapPoints) return;
        
        if (!component.mesh || !component.dimensions) return;
        
        const currentPos = {
            x: component.mesh.position.x,
            y: component.mesh.position.y,
            z: component.mesh.position.z
        };
        
        // Find nearest mounting surface
        const nearestMount = this.findNearestMounting(currentPos);
        if (!nearestMount || nearestMount.distance > this.snapDistance) {
            return; // Too far for magnetic snap
        }
        
        const snapPoint = nearestMount.snapPoint;
        const mounting = nearestMount.mounting;
        
        // Calculate snapped Y position based on mounting type
        let snappedY = snapPoint.y + component.dimensions.height / 2;
        
        // For box mounting, check if we're snapping to a wall surface
        if (mounting.type === 'box' && snapPoint.surface) {
            if (snapPoint.surface === 'bottom') {
                // Snap to floor
                snappedY = snapPoint.y + component.dimensions.height / 2;
            } else {
                // Snapping to wall - use wall's Y coordinate
                snappedY = snapPoint.y;
            }
        }
        
        // Apply magnetic snap with threshold
        const snapThreshold = this.snapDistance / 2;
        
        let snapped = false;
        
        if (Math.abs(currentPos.x - snapPoint.x) < snapThreshold) {
            component.mesh.position.x = snapPoint.x;
            component.position.x = snapPoint.x;
            snapped = true;
        }
        
        if (Math.abs(currentPos.y - snappedY) < snapThreshold) {
            component.mesh.position.y = snappedY;
            component.position.y = snappedY;
            snapped = true;
        }
        
        if (Math.abs(currentPos.z - snapPoint.z) < snapThreshold) {
            component.mesh.position.z = snapPoint.z;
            component.position.z = snapPoint.z;
            snapped = true;
        }
        
        // Visual feedback when snapped
        if (snapped && !component._snapFeedbackShown) {
            component._snapFeedbackShown = true;
            console.log(`🧲 Snapped to ${mounting.type} surface`);
            
            // Clear feedback flag after a moment
            setTimeout(() => {
                component._snapFeedbackShown = false;
            }, 500);
        }
        
        // Update property editor to show snapped position
        if (snapped && window.propertyEditor && window.propertyEditor.selectedComponent === component) {
            window.propertyEditor.updatePanel(component);
        }
    }
    
    // Toggle magnetic snapping on/off
    toggleMagneticSnap(enabled = null) {
        if (enabled === null) {
            this.magneticSnapEnabled = !this.magneticSnapEnabled;
        } else {
            this.magneticSnapEnabled = enabled;
        }
        console.log(`Magnetic snapping: ${this.magneticSnapEnabled ? 'ON' : 'OFF'}`);
        return this.magneticSnapEnabled;
    }
    
    // Animation loop
    animate() {
        this.animationId = requestAnimationFrame(this.animate.bind(this));
        
        if (this.controls) {
            this.controls.update();
        }
        
        this.renderer.render(this.scene, this.camera);
    }
    
    // Handle window resize
    onWindowResize() {
        const container = document.getElementById(this.containerId);
        if (!container) return;
        
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
    }
    
    // ====================
    // Component Management
    // ====================
    
    /**
     * Get component by ID
     * @param {string} componentId - Component ID
     * @returns {Object|null} Component or null
     */
    getComponentById(componentId) {
        // Search in PLC components
        let component = this.plcComponents.find(c => c.id === componentId);
        if (component) return component;
        
        // Search in field devices
        component = this.fieldDevices.find(c => c.id === componentId);
        if (component) return component;
        
        return null;
    }
    
    /**
     * Get all components (PLC + field devices)
     * @returns {Array} All components
     */
    getAllComponents() {
        return [...this.plcComponents, ...this.fieldDevices];
    }
    
    /**
     * Get all field devices
     * @returns {Array} Field devices
     */
    getFieldDevices() {
        return this.fieldDevices;
    }
    
    /**
     * Remove component from scene
     * @param {Object|string} component - Component or ID
     * @returns {boolean} Success
     */
    removeComponent(component) {
        const componentId = component.id || component;
        
        // Find in PLC components
        let index = this.plcComponents.findIndex(c => c.id === componentId);
        if (index !== -1) {
            const comp = this.plcComponents[index];
            if (comp.mesh) {
                this.scene.remove(comp.mesh);
            }
            this.plcComponents.splice(index, 1);
            return true;
        }
        
        // Find in field devices
        index = this.fieldDevices.findIndex(c => c.id === componentId);
        if (index !== -1) {
            const comp = this.fieldDevices[index];
            if (comp.mesh) {
                this.scene.remove(comp.mesh);
            }
            this.fieldDevices.splice(index, 1);
            
            // Unregister from assignment manager
            if (typeof assignmentManager !== 'undefined') {
                assignmentManager.unassign(comp);
            }
            
            return true;
        }
        
        return false;
    }
    
    // Alias for backwards compatibility
    removeFieldDevice(device) {
        return this.removeComponent(device);
    }
    
    // ====================
    // Legacy Mouse Handlers
    // ====================
    
    // Mouse interaction handlers
    onMouseDown(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        
        if (intersects.length > 0) {
            const object = intersects[0].object;
            if (object.userData.component || object.userData.mounting) {
                this.selectedObject = object;
                this.isDragging = true;
                if (this.controls) this.controls.enabled = false;
            }
        }
    }
    
    onMouseMove(event) {
        if (!this.isDragging || !this.selectedObject) return;
        
        // Update drag position (simplified)
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Implement drag logic here
    }
    
    onMouseUp(event) {
        this.isDragging = false;
        this.selectedObject = null;
        if (this.controls) this.controls.enabled = true;
    }
    
    // Clear scene
    clear() {
        while (this.scene.children.length > 0) {
            this.scene.remove(this.scene.children[0]);
        }
        
        this.mountingSurfaces = [];
        this.plcComponents = [];
        this.wires = [];
        
        // Re-add helpers
        const gridHelper = new THREE.GridHelper(1000, 50, 0x444444, 0x222222);
        this.scene.add(gridHelper);
        const axesHelper = new THREE.AxesHelper(200);
        this.scene.add(axesHelper);
    }
    
    // Dispose scene
    dispose() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        window.removeEventListener('resize', this.onWindowResize.bind(this));
    }
}

// Export scene class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ModelScene };
}
