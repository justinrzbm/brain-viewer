import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';

/**
 * BrainLoader - Handles loading and processing of brain mesh data
 * Supports OBJ and PLY formats from FreeSurfer preprocessing
 */

export class BrainLoader {
  constructor(scene) {
    this.scene = scene;
    this.objLoader = new OBJLoader();
    this.plyLoader = new PLYLoader();
    this.loadingManager = new THREE.LoadingManager();
    
    this.setupLoadingManager();
  }

  setupLoadingManager() {
    this.loadingManager.onStart = (url, itemsLoaded, itemsTotal) => {
      console.log(`Started loading: ${url}`);
    };

    this.loadingManager.onLoad = () => {
      console.log('All brain structures loaded successfully');
    };

    this.loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
      const progress = (itemsLoaded / itemsTotal * 100).toFixed(2);
      console.log(`Loading progress: ${progress}% (${itemsLoaded}/${itemsTotal})`);
    };

    this.loadingManager.onError = (url) => {
      console.error(`Error loading: ${url}`);
    };
  }

  /**
   * Center and rotate a group of structures
   * @param {Object} structures - Dictionary of structures to center
   */
  centerStructureGroup(structures) {
    if (Object.keys(structures).length === 0) return;

    // First, rotate the structures to standard orientation
    Object.values(structures).forEach(structure => {
      structure.rotation.x = -Math.PI / 2;
    });

    // Calculate bounding box of this structure group
    const box = new THREE.Box3();
    Object.values(structures).forEach(structure => {
      box.expandByObject(structure);
    });

    // Get the center of this structure group
    const center = box.getCenter(new THREE.Vector3());

    // Offset all structures to center at origin
    Object.values(structures).forEach(structure => {
      structure.position.x -= center.x;
      structure.position.y -= center.y;
      structure.position.z -= center.z;
    });

    console.log(`Centered structure group at origin (offset: ${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)})`);
  }

  /**
   * Load whole cortical hemisphere surfaces (without parcellation)
   * @param {Object} brainStructures - Reference to store loaded structures
   */
  async loadCorticalSurfaces(brainStructures) {
    const surfaceConfigs = [
      { name: 'Left Hemisphere', path: 'assets/models/lh_pial.obj', color: 0xffa07a },
      { name: 'Right Hemisphere', path: 'assets/models/rh_pial.obj', color: 0x87ceeb }
    ];

    const loadPromises = surfaceConfigs.map(config => 
      this.loadMesh(config.path, config.name, config.color, brainStructures)
    );

    try {
      await Promise.all(loadPromises);
      this.centerStructureGroup(brainStructures);
      console.log('Cortical surfaces loaded');
    } catch (error) {
      console.error('Error loading cortical surfaces:', error);
      throw error;
    }
  }

  /**
   * Load all FreeSurfer subcortical segmentations
   * @param {Object} brainStructures - Reference to store loaded structures
   */
  async loadSubcorticalSegmentation(brainStructures) {
    console.log('Loading subcortical segmentations...');
    
    const subcorticalStructures = [
      { name: 'Left-Lateral-Ventricle', color: 0x781286 },
      { name: 'Left-Inf-Lat-Vent', color: 0x7c0b4a },
      { name: 'Left-Cerebellum-White-Matter', color: 0xdcdcdc },
      { name: 'Left-Cerebellum-Cortex', color: 0xe69422 },
      { name: 'Left-Thalamus', color: 0x00760e },
      { name: 'Left-Caudate', color: 0x7ab8f2 },
      { name: 'Left-Putamen', color: 0xec0db0 },
      { name: 'Left-Pallidum', color: 0x0c30ff },
      { name: '3rd-Ventricle', color: 0xf4faff },
      { name: '4th-Ventricle', color: 0x2e43ff },
      { name: 'Brain-Stem', color: 0x98d6e1 },
      { name: 'Left-Hippocampus', color: 0xf0e66f },
      { name: 'Left-Amygdala', color: 0x67e567 },
      { name: 'CSF', color: 0x3c14dc },
      { name: 'Left-Accumbens-area', color: 0xffafaf },
      { name: 'Left-VentralDC', color: 0xa58c7b },
      { name: 'Left-vessel', color: 0xff0000 },
      { name: 'Left-choroid-plexus', color: 0x78c8f0 },
      { name: 'Right-Lateral-Ventricle', color: 0x781286 },
      { name: 'Right-Inf-Lat-Vent', color: 0x7c0b4a },
      { name: 'Right-Cerebellum-White-Matter', color: 0xdcdcdc },
      { name: 'Right-Cerebellum-Cortex', color: 0xe69422 },
      { name: 'Right-Thalamus', color: 0x00760e },
      { name: 'Right-Caudate', color: 0x7ab8f2 },
      { name: 'Right-Putamen', color: 0xec0db0 },
      { name: 'Right-Pallidum', color: 0x0c30ff },
      { name: 'Right-Hippocampus', color: 0xf0e66f },
      { name: 'Right-Amygdala', color: 0x67e567 },
      { name: 'Right-Accumbens-area', color: 0xffafaf },
      { name: 'Right-VentralDC', color: 0xa58c7b },
      { name: 'Right-vessel', color: 0xff0000 },
      { name: 'Right-choroid-plexus', color: 0x78c8f0 },
      { name: 'Optic-Chiasm', color: 0x7d64a0 },
      { name: 'CC_Posterior', color: 0xff0000 },
      { name: 'CC_Mid_Posterior', color: 0xff6900 },
      { name: 'CC_Central', color: 0xffdc00 },
      { name: 'CC_Mid_Anterior', color: 0x00ff00 },
      { name: 'CC_Anterior', color: 0x0000ff }
      // { name: 'WM-hypointensities', color: 0xc8c896 },
    ];
    // TODO: Right and Left VentralDC missing (or erroneously in render?)

    const loadPromises = subcorticalStructures.map(structure => 
      this.loadMesh(
        `assets/models/subcortical/${structure.name}.obj`,
        structure.name,
        structure.color,
        brainStructures
      )
    );

    try {
      await Promise.all(loadPromises);
      this.centerStructureGroup(brainStructures);
      console.log('Subcortical segmentations loaded');
    } catch (error) {
      console.warn('Some subcortical structures could not be loaded:', error);
    }
  }

  /**
   * Load a single mesh file (OBJ or PLY)
   * @param {string} path - Path to the mesh file
   * @param {string} name - Display name for the structure
   * @param {number} color - Hex color for the mesh
   * @param {Object} brainStructures - Reference to store loaded structure
   */
  async loadMesh(path, name, color, brainStructures) {
    return new Promise((resolve, reject) => {
      const fileExtension = path.split('.').pop().toLowerCase();
      
      // Determine loader based on file extension
      const loader = fileExtension === 'ply' ? this.plyLoader : this.objLoader;
      
      loader.load(
        path,
        (loadedObject) => {
          let mesh;
          
          if (fileExtension === 'ply') {
            // PLY loader returns geometry directly
            const geometry = loadedObject;
            const material = this.createMaterial(color);
            mesh = new THREE.Mesh(geometry, material);
          } else {
            // OBJ loader returns a group/object
            mesh = loadedObject;
            
            // Apply material to all children
            mesh.traverse((child) => {
              if (child.isMesh) {
                child.material = this.createMaterial(color);
                child.castShadow = true;
                child.receiveShadow = true;
                child.userData.name = name;
              }
            });
          }
          
          // Set metadata
          mesh.name = name;
          mesh.userData.name = name;
          mesh.userData.originalColor = color;
          
          // Don't center - keep FreeSurfer's original coordinates
          // All FreeSurfer meshes are in the same coordinate space (RAS)
          // this.centerMesh(mesh);
          
          // Add to scene and store reference
          this.scene.add(mesh);
          brainStructures[name] = mesh;
          
          console.log(`Loaded: ${name}`);
          resolve(mesh);
        },
        (progress) => {
          // if (progress.lengthComputable) {
          //   const percentComplete = (progress.loaded / progress.total * 100).toFixed(2);
          //   console.log(`${name}: ${percentComplete}%`);
          // }
        },
        (error) => {
          console.error(`Failed to load ${name} from ${path}:`, error);
          reject(error);
        }
      );
    });
  }

  /**
   * Create a material for brain structures
   * @param {number} color - Hex color value
   * @returns {THREE.Material}
   */
  createMaterial(color) {
    return new THREE.MeshPhongMaterial({
      color: color,
      shininess: 30,
      specular: 0x222222,
      flatShading: false,
      side: THREE.DoubleSide,
      transparent: false,
      opacity: 1.0,
      emissive: 0x000000,
      emissiveIntensity: 0
    });
  }

  /**
   * Load individual parcellated regions from FreeSurfer annotation
   * @param {Object} brainStructures - Reference to store loaded structures
   */
  async loadCorticalParcellations(brainStructures) {
    console.log(`Loading desikan-killiany atlas...`);
    
    // Atlas configurations with FreeSurfer Desikan-Killiany colors
    const desikanKillianyRegions = [
      { region: 'bankssts', color: 0x196428, hemisphere: 'lh' },
      { region: 'caudalanteriorcingulate', color: 0x7d64a0, hemisphere: 'lh' },
      { region: 'caudalmiddlefrontal', color: 0x641900, hemisphere: 'lh' },
      { region: 'cuneus', color: 0xdc1464, hemisphere: 'lh' },
      { region: 'entorhinal', color: 0xdc140a, hemisphere: 'lh' },
      { region: 'fusiform', color: 0xb4dc8c, hemisphere: 'lh' },
      { region: 'inferiorparietal', color: 0xdc3cdc, hemisphere: 'lh' },
      { region: 'inferiortemporal', color: 0xb42878, hemisphere: 'lh' },
      { region: 'isthmuscingulate', color: 0x8c148c, hemisphere: 'lh' },
      { region: 'lateraloccipital', color: 0x141e8c, hemisphere: 'lh' },
      { region: 'lateralorbitofrontal', color: 0x234b32, hemisphere: 'lh' },
      { region: 'lingual', color: 0xe18c8c, hemisphere: 'lh' },
      { region: 'medialorbitofrontal', color: 0xc8234b, hemisphere: 'lh' },
      { region: 'middletemporal', color: 0xa06432, hemisphere: 'lh' },
      { region: 'parahippocampal', color: 0x14dc3c, hemisphere: 'lh' },
      { region: 'paracentral', color: 0x3cdc3c, hemisphere: 'lh' },
      { region: 'parsopercularis', color: 0xdcb48c, hemisphere: 'lh' },
      { region: 'parsorbitalis', color: 0xb4641e, hemisphere: 'lh' },
      { region: 'parstriangularis', color: 0xdc9b48, hemisphere: 'lh' },
      { region: 'pericalcarine', color: 0x3c14dc, hemisphere: 'lh' },
      { region: 'postcentral', color: 0xdc1414, hemisphere: 'lh' },
      { region: 'posteriorcingulate', color: 0xdcb4dc, hemisphere: 'lh' },
      { region: 'precentral', color: 0x3c14dc, hemisphere: 'lh' },
      { region: 'precuneus', color: 0xa08cb4, hemisphere: 'lh' },
      { region: 'rostralanteriorcingulate', color: 0x50148c, hemisphere: 'lh' },
      { region: 'rostralmiddlefrontal', color: 0x4b327d, hemisphere: 'lh' },
      { region: 'superiorfrontal', color: 0xdc3214, hemisphere: 'lh' },
      { region: 'superiorparietal', color: 0x14b4dc, hemisphere: 'lh' },
      { region: 'superiortemporal', color: 0x8ca07d, hemisphere: 'lh' },
      { region: 'supramarginal', color: 0x50e18c, hemisphere: 'lh' },
      { region: 'frontalpole', color: 0x640064, hemisphere: 'lh' },
      { region: 'temporalpole', color: 0x464646, hemisphere: 'lh' },
      { region: 'transversetemporal', color: 0x9696c8, hemisphere: 'lh' },
      { region: 'insula', color: 0xffc020, hemisphere: 'lh' }
    ];

    // Duplicate for right hemisphere
    const allRegions = [
      ...desikanKillianyRegions,
      ...desikanKillianyRegions.map(r => ({ ...r, hemisphere: 'rh' }))
    ];

    console.log('Loading cortical parcellated regions...');
    
    const loadPromises = allRegions.map(config => 
      this.loadMesh(
        `assets/models/parcellations/${config.hemisphere}/${config.region}.obj`,
        `${config.hemisphere}_${config.region}`,
        config.color,
        brainStructures
      )
    );

    try {
      await Promise.all(loadPromises);
      // this.centerStructureGroup(brainStructures);
      console.log('Cortical atlas loaded');
    } catch (error) {
      console.warn(`Atlas ${atlasName} not found or incomplete:`, error);
      throw error;
    }
  }
}
