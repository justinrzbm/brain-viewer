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
   * Load cortical surface meshes (hemispheres with parcellations)
   * @param {Array} surfaceConfigs - Array of {name, path, color} objects
   * @param {Object} brainStructures - Reference to store loaded structures
   */
  async loadCorticalSurfaces(surfaceConfigs, brainStructures) {
    const loadPromises = surfaceConfigs.map(config => 
      this.loadMesh(config.path, config.name, config.color, brainStructures)
    );

    try {
      await Promise.all(loadPromises);
      console.log('Cortical surfaces loaded');
    } catch (error) {
      console.error('Error loading cortical surfaces:', error);
      throw error;
    }
  }

  /**
   * Load subcortical structure meshes (thalamus, hippocampus, etc.)
   * @param {Array} structureConfigs - Array of {name, path, color} objects
   * @param {Object} brainStructures - Reference to store loaded structures
   */
  async loadSubcorticalStructures(structureConfigs, brainStructures) {
    const loadPromises = structureConfigs.map(config => 
      this.loadMesh(config.path, config.name, config.color, brainStructures)
    );

    try {
      await Promise.all(loadPromises);
      console.log('Subcortical structures loaded');
    } catch (error) {
      console.error('Error loading subcortical structures:', error);
      throw error;
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
   * Center a mesh at the origin
   * @param {THREE.Object3D} mesh
   */
  centerMesh(mesh) {
    const box = new THREE.Box3().setFromObject(mesh);
    const center = box.getCenter(new THREE.Vector3());
    
    mesh.position.x -= center.x;
    mesh.position.y -= center.y;
    mesh.position.z -= center.z;
  }

  /**
   * Load individual parcellated regions from FreeSurfer annotation
   * This requires pre-processing to split the annotation into separate OBJ files
   * @param {Array} parcellationConfigs - Array of region configurations
   * @param {Object} brainStructures - Reference to store loaded structures
   */
  async loadParcellatedRegions(parcellationConfigs, brainStructures) {
    console.log('Loading parcellated regions...');
    
    const loadPromises = parcellationConfigs.map(config => 
      this.loadMesh(
        `assets/models/parcellations/${config.hemisphere}/${config.region}.obj`,
        `${config.hemisphere}_${config.region}`,
        config.color,
        brainStructures
      )
    );

    try {
      await Promise.all(loadPromises);
      console.log('Parcellated regions loaded');
    } catch (error) {
      console.error('Error loading parcellated regions:', error);
      throw error;
    }
  }

  /**
   * Load a brain atlas (e.g., Desikan-Killiany parcellation)
   * @param {string} atlasName - Name of the atlas
   * @param {Object} brainStructures - Reference to store loaded structures
   */
  async loadAtlas(atlasName, brainStructures) {
    console.log(`Loading ${atlasName} atlas...`);
    
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

    try {
      await this.loadParcellatedRegions(allRegions, brainStructures);
    } catch (error) {
      console.warn(`Atlas ${atlasName} not found or incomplete. Using default brain surfaces.`);
    }
  }
}
