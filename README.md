# Brain Viewer

An interactive 3D brain visualization tool built with Three.js for exploring FreeSurfer neuroimaging data in the browser.

![Brain Viewer](https://img.shields.io/badge/Three.js-Interactive-blue) ![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Interactive 3D Visualization**: Rotate, zoom, and pan around brain structures using mouse controls
- **FreeSurfer Data Support**: Load and visualize cortical surfaces and subcortical segmentations
- **Dynamic GUI Controls**: Toggle visibility, adjust opacity, and change colors of individual brain regions
- **Region Selection**: Click on brain structures to identify and highlight anatomical regions
- **Parcellation Support**: View individual cortical parcellations from Desikan-Killiany atlas
- **Subcortical Structures**: Visualize thalamus, hippocampus, amygdala, and other deep brain regions
- **Multiple View Presets**: Quick access to lateral, medial, superior, and anterior views
- **Screenshot Capability**: Export high-quality images of your visualizations

## Architecture

### Software Stack

| Component | Technology | Purpose |
|-----------|-----------|----------|
| **3D Rendering** | Three.js | WebGL-based 3D graphics rendering |
| **GUI Controls** | dat.GUI | Interactive sliders, buttons, and toggles |
| **Camera Controls** | OrbitControls | Mouse-driven camera rotation and zoom |
| **Data Format** | OBJ/PLY | Mesh files converted from FreeSurfer |
| **Build Tool** | Vite | Fast development server and bundling |

### Key Components

1. **BrainViewer** (`main.js`): Main application class managing scene, camera, and rendering
2. **BrainLoader** (`BrainLoader.js`): Handles loading and processing of brain mesh data
3. **GUIController** (`GUIController.js`): Manages interactive controls for visualization
4. **Preprocessing** (`freesurfer_to_obj.py`): Converts FreeSurfer data to web-compatible formats

## Installation

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Python 3.8+ (for preprocessing FreeSurfer data)

### Setup

1. **Clone the repository**:
```bash
git clone https://github.com/yourusername/brain-viewer.git
cd brain-viewer
```

2. **Install JavaScript dependencies**:
```bash
npm install
```

3. **Install Python dependencies** (for preprocessing):
```bash
cd preprocessing
pip install -r requirements.txt
```

## Usage

### Quick Start (Development Mode)

```bash
npm run dev
```

This will start the Vite development server and open the application in your browser at `http://localhost:3000`.

### Building for Production

```bash
npm run build
npm run preview
```

The built application will be in the `dist/` directory.

## Preparing Brain Data

### From FreeSurfer Output

If you have FreeSurfer `recon-all` output, use the preprocessing script to convert data to OBJ format:

```bash
cd preprocessing
python freesurfer_to_obj.py /path/to/freesurfer/subjects/bert ../src/assets/models
```

This will:
- Convert cortical surfaces (pial, white matter, inflated)
- Extract individual parcellated regions from annotations
- Generate subcortical structure meshes (thalamus, hippocampus, etc.)

### Command-line Options

```bash
# Convert only cortical surfaces
python freesurfer_to_obj.py /path/to/subject ./output --surfaces-only

# Convert only parcellations
python freesurfer_to_obj.py /path/to/subject ./output --parcellations-only

# Convert everything
python freesurfer_to_obj.py /path/to/subject ./output
```

### FreeSurfer Prerequisites

The preprocessing script requires:
- Completed FreeSurfer `recon-all` processing
- Access to the subject directory containing:
  - `surf/` - Surface files (lh.pial, rh.pial, etc.)
  - `mri/` - Volume files (aseg.mgz)
  - `label/` - Annotation files (lh.aparc.annot, rh.aparc.annot)

### Alternative: Using FreeSurfer's mri_tessellate

For higher quality subcortical meshes, use FreeSurfer's built-in tool:

```bash
# Example: Extract left thalamus
mri_tessellate /path/to/mri/aseg.mgz 10 lh_thalamus.obj
```

Subcortical structure labels:
- 10: Left Thalamus
- 11: Left Caudate
- 12: Left Putamen
- 13: Left Pallidum
- 17: Left Hippocampus
- 18: Left Amygdala
- 49-54: Right hemisphere equivalents
- 16: Brain Stem

## Project Structure

```
brain-viewer/
├── src/
│   ├── index.html           # Main HTML entry point
│   ├── main.js              # Application initialization
│   ├── styles.css           # Global styles
│   ├── js/
│   │   ├── BrainLoader.js   # Mesh loading utilities
│   │   └── GUIController.js # GUI control management
│   └── assets/
│       └── models/          # Brain mesh files (OBJ/PLY)
│           ├── lh_pial.obj
│           ├── rh_pial.obj
│           ├── parcellations/
│           └── subcortical/
├── preprocessing/
│   ├── freesurfer_to_obj.py # FreeSurfer conversion script
│   └── requirements.txt     # Python dependencies
├── package.json             # Node.js dependencies
├── vite.config.js           # Vite configuration
└── README.md
```

## GUI Controls

### Global Controls
- **Global Opacity**: Adjust transparency of all structures
- **Wireframe Mode**: Toggle wireframe rendering
- **Background Color**: Change scene background color

### Cortical Surfaces
- Individual hemisphere visibility
- Per-hemisphere opacity control
- Color customization

### Subcortical Structures
- Group visibility (all thalami, all hippocampi, etc.)
- Group opacity control
- Individual structure toggles

### View Controls
- **Show Grid**: Toggle reference grid
- **Reset Camera**: Return to default view
- **Take Screenshot**: Export current view as PNG

## Interaction Controls

| Action | Control |
|--------|---------|
| **Rotate** | Left mouse drag |
| **Zoom** | Mouse wheel |
| **Pan** | Right mouse drag (or Ctrl + left drag) |
| **Select Region** | Left click on structure |

## Technical Details

### Rendering Pipeline

1. **Scene Setup**: Initialize Three.js scene with lighting and camera
2. **Mesh Loading**: Asynchronously load OBJ/PLY files from assets
3. **Material Creation**: Apply materials with appropriate colors and properties
4. **Raycasting**: Enable interactive selection via mouse clicks
5. **Animation Loop**: Continuous rendering with OrbitControls updates

### Data Flow

```
FreeSurfer Output → Python Preprocessing → OBJ Files → 
Three.js Loaders → Mesh Objects → Scene Rendering
```

### Performance Considerations

- **Mesh Optimization**: Use decimation for large cortical surfaces
- **Level of Detail**: Load simplified meshes for better performance
- **Lazy Loading**: Load structures on-demand rather than all at once
- **Material Sharing**: Reuse materials where possible

## Customization

### Adding New Brain Structures

1. Place OBJ/PLY file in `src/assets/models/`
2. Add configuration to `main.js`:

```javascript
await this.brainLoader.loadSubcorticalStructures([
  { 
    name: 'Custom Structure', 
    path: 'assets/models/custom.obj', 
    color: 0xff00ff 
  }
], this.brainStructures);
```

### Customizing Colors

Edit the color values in the loader configuration:

```javascript
{ name: 'Left Thalamus', path: 'path/to/mesh.obj', color: 0xff6b6b }
```

Colors are in hexadecimal format (e.g., `0xff6b6b` = red).

### Adding Custom Atlases

To add support for additional parcellation schemes (e.g., Destrieux):

1. Generate OBJ files for each region using the preprocessing script
2. Update the atlas configuration in `BrainLoader.js`
3. Add color mappings for the new atlas

## Troubleshooting

### No Brain Data Visible

**Problem**: Loading screen doesn't disappear, no meshes visible

**Solutions**:
- Verify OBJ files are in `src/assets/models/`
- Check browser console for loading errors
- Ensure file paths match those in `main.js`

### Performance Issues

**Problem**: Slow rendering, choppy interactions

**Solutions**:
- Reduce mesh complexity using decimation
- Enable frustum culling for large datasets
- Use lower polygon count models
- Close other browser tabs

### Preprocessing Errors

**Problem**: Python script fails to convert FreeSurfer data

**Solutions**:
- Verify FreeSurfer subject directory structure
- Check Python dependencies are installed
- Ensure FreeSurfer processing completed successfully
- Try converting individual components with flags

## Browser Compatibility

- Chrome 90+ ✅
- Firefox 88+ ✅
- Safari 14+ ✅
- Edge 90+ ✅

WebGL 2.0 support required.

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Citation

If you use this tool in your research, please cite:

```
@software{brain_viewer,
  title = {Brain Viewer: Interactive 3D Neuroimaging Visualization},
  author = {Your Name},
  year = {2025},
  url = {https://github.com/yourusername/brain-viewer}
}
```

## License

MIT License - see LICENSE file for details

## Acknowledgments

- **Three.js** - 3D graphics library
- **FreeSurfer** - Neuroimaging analysis suite
- **dat.GUI** - Lightweight GUI library
- **Vite** - Next generation frontend tooling

## Resources

- [Three.js Documentation](https://threejs.org/docs/)
- [FreeSurfer Wiki](https://surfer.nmr.mgh.harvard.edu/)
- [WebGL Fundamentals](https://webglfundamentals.org/)
- [Neuroimaging File Formats](https://nipy.org/nibabel/)

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

**Happy Brain Visualizing! 🧠✨**
