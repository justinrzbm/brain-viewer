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

