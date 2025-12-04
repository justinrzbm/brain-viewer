import * as dat from 'dat.gui';

/**
 * GUIController - Manages dat.GUI controls for brain visualization
 * Provides sliders, buttons, and toggles for interactive brain structure manipulation
 */

export class GUIController {
  constructor(brainStructures, dataLoader) {
    this.gui = new dat.GUI();
    this.brainStructures = brainStructures;
    this.dataLoader = dataLoader;
    this.settings = {
      globalOpacity: 1.0,
      wireframe: false,
      showGrid: false,
      backgroundColor: '#1a1a1a',
      resetCamera: () => this.resetCamera(),
      screenshotView: () => this.takeScreenshot(),
      colorMetric: 'none'
    };
    
    this.structureSettings = {};
    this.colorMappingCallback = null;
  }

  initializeControls(structures, scene, camera, colorMappingCallback) {
    this.brainStructures = structures;
    this.scene = scene;
    this.camera = camera;
    this.colorMappingCallback = colorMappingCallback;
    
    // View Controls (includes opacity, wireframe, presets)
    this.createViewControls();
    
    // Color Mapping Controls
    this.createColorMappingControls();
    
    // Cortical Surface Controls
    this.createCorticalControls();
    
    // Subcortical Structure Controls
    this.createSubcorticalControls();
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
        opacity: 1.0
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
          structure.traverse((child) => {
            if (child.isMesh && child.material) {
              child.material.opacity = value;
              child.material.transparent = value < 1.0;
            }
          });
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
              structure.traverse((child) => {
                if (child.isMesh && child.material) {
                  child.material.opacity = value;
                  child.material.transparent = value < 1.0;
                }
              });
            });
          });

        // Individual structure controls
        matchingStructures.forEach(([name, structure]) => {
          const settings = {
            visible: true
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
    
    // Global opacity slider
    viewFolder.add(this.settings, 'globalOpacity', 0, 1, 0.01)
      .name('Global Opacity')
      .onChange((value) => {
        Object.values(this.brainStructures).forEach(structure => {
          structure.traverse((child) => {
            if (child.isMesh && child.material) {
              child.material.opacity = value;
              child.material.transparent = value < 1.0;
            }
          });
        });
      });

    // Wireframe toggle
    viewFolder.add(this.settings, 'wireframe')
      .name('Wireframe Mode')
      .onChange((value) => {
        Object.values(this.brainStructures).forEach(structure => {
          structure.traverse((child) => {
            if (child.isMesh && child.material) {
              child.material.wireframe = value;
            }
          });
        });
      });
    
    // Background color
    viewFolder.addColor(this.settings, 'backgroundColor')
      .name('Background Color')
      .onChange((value) => {
        if (this.scene) {
          this.scene.background.setStyle(value);
        }
      });

    // View presets
    viewFolder.add({ action: () => this.setLateralView() }, 'action').name('Lateral View');
    viewFolder.add({ action: () => this.setMedialView() }, 'action').name('Medial View');
    viewFolder.add({ action: () => this.setSuperiorView() }, 'action').name('Superior View');
    viewFolder.add({ action: () => this.setAnteriorView() }, 'action').name('Anterior View');

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
      this.camera.position.set(0, 0, 200);
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
      this.camera.position.set(200, 0, 0);
      this.camera.lookAt(0, 0, 0);
    }
  }

  setMedialView() {
    if (this.camera) {
      this.camera.position.set(-200, 0, 0);
      this.camera.lookAt(0, 0, 0);
    }
  }

  setSuperiorView() {
    if (this.camera) {
      this.camera.position.set(0, 200, 0);
      this.camera.lookAt(0, 0, 0);
    }
  }

  setAnteriorView() {
    if (this.camera) {
      this.camera.position.set(0, 0, 200);
      this.camera.lookAt(0, 0, 0);
    }
  }

  createColorMappingControls() {
    const colorFolder = this.gui.addFolder('Color Mapping');
    
    // Get available metrics from data loader
    const metrics = ['none'];
    if (this.dataLoader) {
      metrics.push(...this.dataLoader.getAvailableMetrics());
    }
    
    // Create dropdown for metric selection
    colorFolder.add(this.settings, 'colorMetric', metrics)
      .name('')
      .onChange((value) => {
        if (this.colorMappingCallback) {
          this.colorMappingCallback(value);
        }
      });
    
    colorFolder.open();
  }

  updateSelectedRegionInfo(regionName, featureValue) {
    const selectedRegionDiv = document.getElementById('selected-region');
    if (!selectedRegionDiv) return;
    
    if (!regionName) {
      selectedRegionDiv.innerHTML = 'Click on a brain region to see details';
      return;
    }
    
    let html = `<strong style="color: #ffdd57;">${regionName}</strong>`;
    
    if (featureValue !== null && featureValue !== undefined && this.settings.colorMetric !== 'none') {
      html += `<br><span style="font-size: 12px; color: #4a9eff;">${this.settings.colorMetric}:</span> <span style="color: #fff;">${featureValue.toFixed(4)}</span>`;
    }
    
    selectedRegionDiv.innerHTML = html;
  }

  destroy() {
    this.gui.destroy();
  }
}
