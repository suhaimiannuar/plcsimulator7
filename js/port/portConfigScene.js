// Port Config Viewer - Scene Management
// Handles Three.js scene setup, rendering, and animation

class PortConfigScene {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.testCube = null;
    }

    init() {
        console.log('Initializing Port Config Scene...');
        console.log('Container:', this.container);
        console.log('Container size:', this.container.clientWidth, 'x', this.container.clientHeight);
        
        // Setup Three.js scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x263238);
        
        // Get container dimensions (fallback if not ready)
        const width = this.container.clientWidth || 800;
        const height = this.container.clientHeight || 600;
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(
            45,
            width / height,
            0.1,
            10000
        );
        this.camera.position.set(300, 300, 300);
        this.camera.lookAt(0, 0, 0);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);
        
        console.log('Renderer size set to:', width, 'x', height);
        
        // Setup lighting
        this.setupLighting();
        
        // Setup grid and helpers
        this.setupHelpers();
        
        // Controls
        this.setupControls();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        console.log('Port Config Scene initialized successfully');
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0x404040, 2);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(100, 200, 100);
        this.scene.add(directionalLight);
        
        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight2.position.set(-100, -200, -100);
        this.scene.add(directionalLight2);
    }

    setupHelpers() {
        // Grid
        const gridHelper = new THREE.GridHelper(500, 20, 0x444444, 0x222222);
        this.scene.add(gridHelper);
        
        // Add axes helper for orientation
        const axesHelper = new THREE.AxesHelper(100);
        this.scene.add(axesHelper);
        
        // Add a test cube to verify rendering is working
        const testGeometry = new THREE.BoxGeometry(50, 50, 50);
        const testMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000, wireframe: true });
        this.testCube = new THREE.Mesh(testGeometry, testMaterial);
        this.testCube.position.set(0, 25, 0);
        this.scene.add(this.testCube);
        
        console.log('Test cube added at origin');
    }

    setupControls() {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        
        // Enable panning
        this.controls.enablePan = true;
        this.controls.panSpeed = 1.0;
        this.controls.screenSpacePanning = true; // Pan in screen space (more intuitive)
        
        // Mouse button assignments:
        // LEFT = rotate, MIDDLE = zoom, RIGHT = pan
        this.controls.mouseButtons = {
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN
        };
        
        // Track dragging state
        this.controls.addEventListener('start', () => {
            this.controls.isDragging = false;
        });
        
        this.controls.addEventListener('change', () => {
            this.controls.isDragging = true;
        });
        
        this.controls.addEventListener('end', () => {
            setTimeout(() => {
                this.controls.isDragging = false;
            }, 100); // Small delay to avoid click after drag
        });
    }

    removeTestCube() {
        if (this.testCube) {
            this.scene.remove(this.testCube);
            this.testCube = null;
        }
    }

    centerCameraOnModel(model) {
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        
        console.log('Model bounds:', {
            center: center,
            size: size,
            maxDim: maxDim
        });
        
        const fov = this.camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        cameraZ *= 2.0; // Increased multiplier for better view
        
        this.camera.position.set(center.x + cameraZ, center.y + cameraZ, center.z + cameraZ);
        this.controls.target.copy(center);
        this.controls.update();
        
        console.log('Camera positioned at:', this.camera.position);
        console.log('Camera looking at:', center);
    }

    onWindowResize() {
        if (!this.container) return;
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        if (this.controls) this.controls.update();
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    addToScene(object) {
        this.scene.add(object);
    }

    removeFromScene(object) {
        this.scene.remove(object);
    }

    getScene() {
        return this.scene;
    }

    getCamera() {
        return this.camera;
    }

    getRenderer() {
        return this.renderer;
    }

    getControls() {
        return this.controls;
    }

    // Set camera to view perpendicular to a surface normal
    viewNormalToSurface(surfaceNormal, targetPoint, distance = 200) {
        const normal = surfaceNormal.clone().normalize();
        
        // Position camera along the normal direction
        const cameraPosition = targetPoint.clone().add(normal.multiplyScalar(distance));
        
        this.camera.position.copy(cameraPosition);
        this.controls.target.copy(targetPoint);
        this.controls.update();
        
        console.log('Camera set to view normal to surface');
        console.log('Camera position:', this.camera.position);
        console.log('Looking at:', targetPoint);
    }

    // Set camera to standard cubic views
    setCubicView(view, model = null) {
        let center = new THREE.Vector3(0, 0, 0);
        let distance = 300;
        
        // If model is provided, center on it
        if (model) {
            const box = new THREE.Box3().setFromObject(model);
            center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            distance = maxDim * 2;
        }
        
        let position = new THREE.Vector3();
        
        switch(view) {
            case 'front':
                position.set(center.x, center.y, center.z + distance);
                break;
            case 'back':
                position.set(center.x, center.y, center.z - distance);
                break;
            case 'left':
                position.set(center.x - distance, center.y, center.z);
                break;
            case 'right':
                position.set(center.x + distance, center.y, center.z);
                break;
            case 'top':
                position.set(center.x, center.y + distance, center.z);
                break;
            case 'bottom':
                position.set(center.x, center.y - distance, center.z);
                break;
            case 'iso': // Isometric view
            default:
                position.set(center.x + distance, center.y + distance, center.z + distance);
                break;
        }
        
        this.camera.position.copy(position);
        this.controls.target.copy(center);
        this.controls.update();
        
        console.log(`Camera set to ${view} view`);
    }
}
