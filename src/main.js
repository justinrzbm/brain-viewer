import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BrainLoader } from './js/BrainLoader.js';
import { GUIController } from './js/GUIController.js';

/**
 * Brain Viewer - Main Application
 */

class BrainViewer {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.brainLoader = null;
    this.guiController = null;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.brainStructures = {};

    this.loadParcellations = true; // Set to true to load parcellated regions, else load whole hemispheres
    
    this.init();
  }

  init() {
    this.setupScene();
    this.setupCamera();
    this.setupRenderer();
    this.setupLights();
    this.setupControls();
    this.setupEventListeners();
    
    // Initialize loaders and GUI
    this.brainLoader = new BrainLoader(this.scene);
    console.log('BrainLoader initialized');
    this.guiController = new GUIController(this.brainStructures);
    console.log('GUIController initialized');

    // Load brain data
    this.loadBrainData();
    
    // Start animation loop
    this.animate();
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a1a);
    
    // Add a grid for reference (optional)
    const gridHelper = new THREE.GridHelper(200, 20, 0x444444, 0x222222);
    gridHelper.position.y = -50;
    this.scene.add(gridHelper);
  }

  setupCamera() {
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 150);
    this.camera.lookAt(0, 0, 0);
  }

  setupRenderer() {
    const canvas = document.getElementById('three-canvas');
    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  setupLights() {
    // Ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    // Directional light for depth perception
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);

    // Point lights for better visualization
    const pointLight1 = new THREE.PointLight(0x4a9eff, 0.5);
    pointLight1.position.set(-50, 50, 50);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff9a4a, 0.3);
    pointLight2.position.set(50, -50, -50);
    this.scene.add(pointLight2);

    // Hemisphere light for natural looking illumination
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
    this.scene.add(hemisphereLight);
  }

  setupControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = false;
    this.controls.minDistance = 50;
    this.controls.maxDistance = 500;
    this.controls.maxPolarAngle = Math.PI;
  }

  setupEventListeners() {
    // Window resize
    window.addEventListener('resize', () => this.onWindowResize(), false);
    
    // Mouse click for region selection
    this.renderer.domElement.addEventListener('click', (event) => this.onMouseClick(event), false);
    
    // Mouse move for hover effects
    this.renderer.domElement.addEventListener('mousemove', (event) => this.onMouseMove(event), false);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  onMouseClick(event) {
    // Calculate mouse position in normalized device coordinates (-1 to +1)
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update the raycaster
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Get all brain structure meshes
    const meshes = Object.values(this.brainStructures).filter(obj => obj.visible);
    
    // Check for intersections
    const intersects = this.raycaster.intersectObjects(meshes, true);

    if (intersects.length > 0) {
      const selectedObject = intersects[0].object;
      const structureName = selectedObject.userData.name || 'Unknown Region';
      
      // Update info panel
      document.getElementById('selected-region').textContent = 
        `Selected: ${structureName}`;
      
      // Highlight the selected structure (optional visual feedback)
      this.highlightStructure(selectedObject);
    }
  }

  onMouseMove(event) {
    // Optional: Add hover effects here
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  highlightStructure(mesh) {
    // Reset all structures to default emissive
    Object.values(this.brainStructures).forEach(structure => {
      if (structure.material) {
        structure.material.emissive.setHex(0x000000);
      }
    });

    // Highlight selected structure
    if (mesh.material) {
      mesh.material.emissive.setHex(0x333333);
    }
  }

  centerAllStructures() {
    // Calculate bounding box of all loaded structures
    const box = new THREE.Box3();
    Object.values(this.brainStructures).forEach(structure => {
      box.expandByObject(structure);
    });

    // Get the center of all structures combined
    const center = box.getCenter(new THREE.Vector3());
    
    // Offset all structures to center the brain at origin
    Object.values(this.brainStructures).forEach(structure => {
      structure.position.x -= center.x;
      structure.position.y -= center.y;
      structure.position.z -= center.z;
    });

    console.log(`Centered brain at origin (offset: ${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)})`);
  }

  async loadBrainData() {
    const loadingScreen = document.getElementById('loading-screen');
    
    try {
      console.log('Loading brain data...');
      
      if (this.loadParcellations) {
        // Load parcellated regions (Desikan-Killiany atlas)
        console.log('Loading parcellated regions...');
        await this.brainLoader.loadAtlas('desikan-killiany', this.brainStructures);
      } else {
        // Load whole cortical surfaces
        await this.brainLoader.loadCorticalSurfaces([
          { name: 'Left Hemisphere', path: 'assets/models/lh_pial.obj', color: 0xffa07a },
          { name: 'Right Hemisphere', path: 'assets/models/rh_pial.obj', color: 0x87ceeb }
        ], this.brainStructures);
      }

      // Try to load subcortical structures (optional - won't fail if missing)
      // try {
      //   await this.brainLoader.loadSubcorticalStructures([
      //     { name: 'Left Thalamus', path: 'assets/models/Left-Thalamus.obj', color: 0xff6b6b },
      //     { name: 'Right Thalamus', path: 'assets/models/Right-Thalamus.obj', color: 0xff6b6b },
      //     { name: 'Left Hippocampus', path: 'assets/models/Left-Hippocampus.obj', color: 0x4ecdc4 },
      //     { name: 'Right Hippocampus', path: 'assets/models/Right-Hippocampus.obj', color: 0x4ecdc4 },
      //     { name: 'Brainstem', path: 'assets/models/Brain-Stem.obj', color: 0x95e1d3 }
      //   ], this.brainStructures);
      //   console.log('Subcortical structures loaded');
      // } catch (subcorticalError) {
      //   console.warn('Subcortical structures not available:', subcorticalError.message);
      // }

      // Center all brain structures as a group
      this.centerAllStructures();

      // Initialize GUI controls with loaded structures
      this.guiController.initializeControls(this.brainStructures, this.scene, this.camera);

      // Hide loading screen
      loadingScreen.classList.add('hidden');
      console.log('Brain viewer ready!');
      
    } catch (error) {
      console.error('Error loading brain data:', error);
      loadingScreen.innerHTML = `
        <div style="color: #ff6b6b;">
          <h2>Error Loading Brain Data</h2>
          <p>Please ensure brain model files are in the assets/models directory</p>
          <p style="font-size: 12px; margin-top: 20px;">${error.message}</p>
        </div>
      `;
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    // Update controls
    this.controls.update();

    // Render the scene
    this.renderer.render(this.scene, this.camera);
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new BrainViewer();
});
