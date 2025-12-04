import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BrainLoader } from './js/BrainLoader.js';
import { GUIController } from './js/GUIController.js';
import { DataLoader } from './js/DataLoader.js';

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
    this.dataLoader = null;
    this.currentColorMetric = null;
    this.mouseDownPosition = new THREE.Vector2();
    this.isDragging = false;
    this.selectedRegionName = null;

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
    this.dataLoader = new DataLoader();
    this.guiController = new GUIController(this.brainStructures, this.dataLoader);
    console.log('GUIController initialized');

    // Load brain data
    this.loadBrainData();

    //debug: show a dot at the origin
    const originDotGeometry = new THREE.SphereGeometry(1, 16, 16);
    const originDotMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const originDot = new THREE.Mesh(originDotGeometry, originDotMaterial);
    this.scene.add(originDot);
    
    // Start animation loop
    this.animate();
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a1a);
    
    // Add a grid for reference (optional)
    const gridHelper = new THREE.GridHelper(175, 20, 0x444444, 0x222222);
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
    this.controls.enablePan = false;
    this.controls.minDistance = 20;
    this.controls.maxDistance = 300;
    this.controls.maxPolarAngle = Math.PI;
  }

  setupEventListeners() {
    // Window resize
    window.addEventListener('resize', () => this.onWindowResize(), false);
    
    // Track mouse down position to detect dragging
    this.renderer.domElement.addEventListener('mousedown', (event) => {
      this.mouseDownPosition.set(event.clientX, event.clientY);
      this.isDragging = false;
    }, false);
    
    // Detect if mouse moved during drag
    this.renderer.domElement.addEventListener('mousemove', (event) => {
      if (this.mouseDownPosition.x !== 0 || this.mouseDownPosition.y !== 0) {
        const dx = event.clientX - this.mouseDownPosition.x;
        const dy = event.clientY - this.mouseDownPosition.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If moved more than 5 pixels, consider it a drag
        if (distance > 5) {
          this.isDragging = true;
        }
      }
      this.onMouseMove(event);
    }, false);
    
    // Mouse click for region selection (only if not dragging)
    this.renderer.domElement.addEventListener('mouseup', (event) => {
      if (!this.isDragging) {
        this.onMouseClick(event);
      }
      this.mouseDownPosition.set(0, 0);
      this.isDragging = false;
    }, false);
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
      
      // Store selected region name
      this.selectedRegionName = structureName;
      
      // Get feature importance value if color mapping is active
      let featureValue = null;
      if (this.currentColorMetric && this.currentColorMetric !== 'none') {
        featureValue = this.dataLoader.getFeatureImportance(structureName, this.currentColorMetric);
      }
      
      // Update info panel with region name and feature value
      this.guiController.updateSelectedRegionInfo(structureName, featureValue);
      
      // Highlight the selected structure (optional visual feedback)
      this.highlightStructure(selectedObject);
    }
    else {
      // Clicked on empty space - clear selection
      this.selectedRegionName = null;
      this.guiController.updateSelectedRegionInfo(null, null);
      this.highlightStructure(null);
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
      structure.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.emissive.setHex(0x000000);
          child.material.emissiveIntensity = 0;
        }
      });
    });
    if (!mesh) return;

    // Make selected structure glow
    mesh.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.emissive.setHex(0xffffff);
        child.material.emissiveIntensity = 0.3;           
      }
    });
  }

  centerAllStructures() {
    // First, rotate the brain to standard orientation
    // This fixes freesurfer's default orientation
    Object.values(this.brainStructures).forEach(structure => {
      structure.rotation.x = -Math.PI / 2;
    });
    // Calculate bounding box of all loaded structures
    const box = new THREE.Box3();
    Object.values(this.brainStructures).forEach(structure => {
      box.expandByObject(structure);
    });

    // Get the center of all structures combined
    const center = box.getCenter(new THREE.Vector3());
    const boxsize = box.getSize(new THREE.Vector3());
    //debug: display bounding box
    const boxHelper = new THREE.Box3Helper(box, 0xffff00);
    this.scene.add(boxHelper);
    console.log(center.y, boxsize.y/2 - 50);
    this.scene.add(new THREE.Sphere(new THREE.Vector3(0,-50,0), 2, 0xff0000));
    // Offset all structures to center the brain at origin and rotate
    Object.values(this.brainStructures).forEach(structure => {
      structure.position.x -= center.x;
      structure.position.y -= Math.min(center.y, boxsize.y/2 - 50); // Shift down by 50 at most to touch the grid
      structure.position.z -= center.z;
    });
    const newBox = new THREE.Box3();
    Object.values(this.brainStructures).forEach(structure => {
      newBox.expandByObject(structure);
    });
    this.scene.add(new THREE.Box3Helper(newBox, 0x00ff00));
    const newCenter = newBox.getCenter(new THREE.Vector3());
    console.log(`New center after centering: (${newCenter.x.toFixed(2)}, ${newCenter.y.toFixed(2)}, ${newCenter.z.toFixed(2)})`);
    console.log(`Box minimum edge: (${newBox.min.x.toFixed(2)}, ${newBox.min.y.toFixed(2)}, ${newBox.min.z.toFixed(2)})`);

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

      // Load feature importance data
      try {
        await this.dataLoader.loadFeatureImportance('/assets/region_data/classification_feature_importance_results.csv');
        console.log('Feature importance data loaded');
      } catch (error) {
        console.warn('Could not load feature importance data:', error);
      }

      // Initialize GUI controls with loaded structures
      this.guiController.initializeControls(
        this.brainStructures, 
        this.scene, 
        this.camera,
        (metric) => this.applyColorMapping(metric)
      );

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

  applyColorMapping(metric) {
    if (!metric || metric === 'none') {
      // Reset to original colors
      Object.entries(this.brainStructures).forEach(([name, structure]) => {
        const originalColor = structure.userData.originalColor || 0x888888;
        structure.traverse((child) => {
          if (child.isMesh && child.material) {
            child.material.color.setHex(originalColor);
          }
        });
      });
      this.currentColorMetric = null;
      
      // Update info panel to show no feature value
      if (this.selectedRegionName) {
        this.guiController.updateSelectedRegionInfo(this.selectedRegionName, null);
      }
      return;
    }

    this.currentColorMetric = metric;
    
    // Apply color mapping based on feature importance
    Object.entries(this.brainStructures).forEach(([name, structure]) => {
      const importance = this.dataLoader.getFeatureImportance(name, metric);
      const normalized = this.dataLoader.normalizeValue(importance, metric);
      const color = this.dataLoader.valueToColor(normalized);
      
      structure.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.color.setHex(color);
        }
      });
    });
    
    console.log(`Applied color mapping for: ${metric}`);
    
    // Update info panel if a region is selected
    if (this.selectedRegionName) {
      const featureValue = this.dataLoader.getFeatureImportance(this.selectedRegionName, metric);
      this.guiController.updateSelectedRegionInfo(this.selectedRegionName, featureValue);
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
