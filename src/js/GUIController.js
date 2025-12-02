import * as dat from 'dat.gui';

/**
 * GUIController - Manages dat.GUI controls for brain visualization
 * Provides sliders, buttons, and toggles for interactive brain structure manipulation
 */

export class GUIController {
  constructor(brainStructures) {
    this.gui = new dat.GUI();
    this.brainStructures = brainStructures;
    this.settings = {
      globalOpacity: 1.0,
      wireframe: false,
      showGrid: true,
      backgroundColor: '#1a1a1a',
      resetCamera: () => this.resetCamera(),
      screenshotView: () => this.takeScreenshot()
    };
    
    this.structureSettings = {};
  }

  initializeControls(structures, scene, camera) {
    this.brainStructures = structures;
    this.scene = scene;
    this.camera = camera;
    
    // Global Controls Folder
    this.createGlobalControls();
    
    // Cortical Surface Controls
    this.createCorticalControls();
    
    // Subcortical Structure Controls
    this.createSubcorticalControls();
    
    // View Controls
    this.createViewControls();
  }

  createGlobalControls() {
    const globalFolder = this.gui.addFolder('Global Controls');
    
    // Global opacity slider
    globalFolder.add(this.settings, 'globalOpacity', 0, 1, 0.01)
      .name('Global Opacity')
      .onChange((value) => {
        Object.values(this.brainStructures).forEach(structure => {
          if (structure.material) {
            structure.material.opacity = value;
            structure.material.transparent = value < 1.0;
          }
        });
      });

    // Wireframe toggle
    globalFolder.add(this.settings, 'wireframe')
      .name('Wireframe Mode')
      .onChange((value) => {
        Object.values(this.brainStructures).forEach(structure => {
          if (structure.material) {
            structure.material.wireframe = value;
          }
        });
      });
  }

  createCorticalControls() {
    const corticalFolder = this.gui.addFolder('Cortical Surfaces');
    
    // Get all cortical structures (hemispheres or parcellations)
    const corticalStructures = Object.entries(this.brainStructures).filter(
      ([name, _]) => name.toLowerCase().includes('hemisphere') || 
                     name.startsWith('lh_') || 
                     name.startsWith('rh_')
    );

    corticalStructures.forEach(([name, structure]) => {
      const settings = {
        visible: true,
        opacity: 1.0,
        color: structure.material ? structure.material.color.getHex() : 0xffffff
      };
      
      this.structureSettings[name] = settings;
      
      const structureFolder = corticalFolder.addFolder(name);
      
      // Visibility toggle
      structureFolder.add(settings, 'visible')
        .name('Show/Hide')
        .onChange((value) => {
          structure.visible = value;
        });
      
      // Opacity slider
      structureFolder.add(settings, 'opacity', 0, 1, 0.01)
        .name('Opacity')
        .onChange((value) => {
          if (structure.material) {
            structure.material.opacity = value;
            structure.material.transparent = value < 1.0;
          }
        });
      
      // Color picker
      structureFolder.addColor(settings, 'color')
        .name('Color')
        .onChange((value) => {
          if (structure.material) {
            structure.material.color.setHex(value);
          }
        });
    });
  }

  createSubcorticalControls() {
    const subcorticalFolder = this.gui.addFolder('Subcortical Structures');
    
    // Common subcortical structure names
    const subcorticalNames = [
      'Thalamus', 'Hippocampus', 'Amygdala', 'Caudate', 
      'Putamen', 'Pallidum', 'Brainstem', 'Cerebellum'
    ];

    subcorticalNames.forEach(structureName => {
      const matchingStructures = Object.entries(this.brainStructures).filter(
        ([name, _]) => name.toLowerCase().includes(structureName.toLowerCase())
      );

      if (matchingStructures.length > 0) {
        const groupFolder = subcorticalFolder.addFolder(structureName);
        
        // Group visibility toggle
        const groupSettings = {
          showAll: true,
          groupOpacity: 1.0
        };

        groupFolder.add(groupSettings, 'showAll')
          .name('Show All')
          .onChange((value) => {
            matchingStructures.forEach(([_, structure]) => {
              structure.visible = value;
            });
          });

        groupFolder.add(groupSettings, 'groupOpacity', 0, 1, 0.01)
          .name('Group Opacity')
          .onChange((value) => {
            matchingStructures.forEach(([_, structure]) => {
              if (structure.material) {
                structure.material.opacity = value;
                structure.material.transparent = value < 1.0;
              }
            });
          });

        // Individual structure controls
        matchingStructures.forEach(([name, structure]) => {
          const settings = {
            visible: true,
            color: structure.material ? structure.material.color.getHex() : 0xffffff
          };
          
          this.structureSettings[name] = settings;

          groupFolder.add(settings, 'visible')
            .name(name.replace(structureName, '').trim() || name)
            .onChange((value) => {
              structure.visible = value;
            });
        });
      }
    });
  }

  createViewControls() {
    const viewFolder = this.gui.addFolder('View Controls');
    
    // Background color
    viewFolder.addColor(this.settings, 'backgroundColor')
      .name('Background Color')
      .onChange((value) => {
        if (this.scene) {
          this.scene.background.setStyle(value);
        }
      });

    // Grid toggle
    viewFolder.add(this.settings, 'showGrid')
      .name('Show Grid')
      .onChange((value) => {
        if (this.scene) {
          const grid = this.scene.getObjectByName('gridHelper');
          if (grid) {
            grid.visible = value;
          }
        }
      });

    // Reset camera button
    viewFolder.add(this.settings, 'resetCamera')
      .name('Reset Camera');

    // Screenshot button
    viewFolder.add(this.settings, 'screenshotView')
      .name('Take Screenshot');

    viewFolder.open();
  }

  resetCamera() {
    if (this.camera) {
      this.camera.position.set(0, 0, 150);
      this.camera.lookAt(0, 0, 0);
    }
  }

  takeScreenshot() {
    const canvas = document.getElementById('three-canvas');
    if (canvas) {
      const dataURL = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `brain-viewer-${Date.now()}.png`;
      link.href = dataURL;
      link.click();
    }
  }

  // Preset views
  createPresetViews() {
    const presetFolder = this.gui.addFolder('Preset Views');
    
    const presets = {
      'Lateral View': () => this.setLateralView(),
      'Medial View': () => this.setMedialView(),
      'Superior View': () => this.setSuperiorView(),
      'Anterior View': () => this.setAnteriorView()
    };

    Object.entries(presets).forEach(([name, callback]) => {
      presetFolder.add({ action: callback }, 'action').name(name);
    });
  }

  setLateralView() {
    if (this.camera) {
      this.camera.position.set(150, 0, 0);
      this.camera.lookAt(0, 0, 0);
    }
  }

  setMedialView() {
    if (this.camera) {
      this.camera.position.set(-150, 0, 0);
      this.camera.lookAt(0, 0, 0);
    }
  }

  setSuperiorView() {
    if (this.camera) {
      this.camera.position.set(0, 150, 0);
      this.camera.lookAt(0, 0, 0);
    }
  }

  setAnteriorView() {
    if (this.camera) {
      this.camera.position.set(0, 0, 150);
      this.camera.lookAt(0, 0, 0);
    }
  }

  destroy() {
    this.gui.destroy();
  }
}
