# Example Brain Data

This directory should contain your brain mesh files in OBJ or PLY format.

## Required Files for Basic Visualization

### Cortical Surfaces
- `lh_pial.obj` - Left hemisphere pial surface
- `rh_pial.obj` - Right hemisphere pial surface

### Subcortical Structures (Optional)
- `Left-Thalamus.obj`
- `Right-Thalamus.obj`
- `Left-Hippocampus.obj`
- `Right-Hippocampus.obj`
- `Brain-Stem.obj`

## Generating These Files

Use the preprocessing script to convert FreeSurfer data:

```bash
cd preprocessing
python freesurfer_to_obj.py /path/to/freesurfer/subject ../src/assets/models
```

## Example Data

If you don't have FreeSurfer data, you can download example brain meshes from:
- [FreeSurfer Sample Data](https://surfer.nmr.mgh.harvard.edu/fswiki/DownloadAndInstall)
- [BrainVoyager Brain Meshes](https://www.brainvoyager.com/)
- [NeuroVault](https://neurovault.org/)

## File Format

All mesh files should be in Wavefront OBJ format:
- Vertices: `v x y z`
- Faces: `f v1 v2 v3`
- 1-indexed face vertex references

Example:
```
v 0.0 0.0 0.0
v 1.0 0.0 0.0
v 0.0 1.0 0.0
f 1 2 3
```
