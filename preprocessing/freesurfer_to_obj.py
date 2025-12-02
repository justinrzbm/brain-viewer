#!/usr/bin/env python3
"""
FreeSurfer to OBJ Converter
Converts FreeSurfer brain data (surfaces and segmentations) to OBJ format
for use in the Three.js Brain Viewer application.

Requirements:
    - nibabel
    - numpy
    - trimesh (optional, for mesh optimization)

Usage:
    python freesurfer_to_obj.py <freesurfer_subject_dir> <output_dir>

Example:
    python freesurfer_to_obj.py /path/to/freesurfer/subjects/bert ./models
"""

import os
import sys
import argparse
import numpy as np
from pathlib import Path

try:
    import nibabel as nib
    from nibabel.freesurfer import read_geometry, read_annot
except ImportError:
    print("Error: nibabel is required. Install with: pip install nibabel")
    sys.exit(1)


class FreeSurferConverter:
    """Convert FreeSurfer data to OBJ format for Three.js visualization"""
    
    def __init__(self, subject_dir, output_dir):
        self.subject_dir = Path(subject_dir)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # FreeSurfer standard directories
        self.surf_dir = self.subject_dir / 'surf'
        self.mri_dir = self.subject_dir / 'mri'
        self.label_dir = self.subject_dir / 'label'
    
    def _get_surface_file(self, surface_file):
        try:
            surface_file.exists()
        except (OSError, FileNotFoundError) as e:
            print(f"Error processing {surface_file}: {e}, using pial.T1")
            surface_file = self.surf_dir / surface_file.name.replace('.pial', '.pial.T1')
        if surface_file.exists():
            return surface_file
        else:
            raise FileNotFoundError(f"{surface_file} not found")

        
    def convert_surface_to_obj(self, surface_file, output_file, flip_faces=False):
        """
        Convert FreeSurfer surface file to OBJ format
        
        Args:
            surface_file: Path to FreeSurfer surface file (e.g., lh.pial)
            output_file: Output OBJ file path
            flip_faces: Whether to flip face normals
        """
        print(f"Converting {surface_file} to {output_file}...")
        
        try:
            # Read FreeSurfer surface geometry
            vertices, faces = read_geometry(surface_file)
            
            # FreeSurfer uses 0-indexed faces, OBJ uses 1-indexed
            faces = faces + 1
            
            # Optionally flip faces for correct normals
            if flip_faces:
                faces = faces[:, [0, 2, 1]]
            
            # Write OBJ file
            with open(output_file, 'w') as f:
                f.write("# OBJ file generated from FreeSurfer surface\n")
                f.write(f"# Source: {surface_file}\n\n")
                
                # Write vertices
                for v in vertices:
                    f.write(f"v {v[0]:.6f} {v[1]:.6f} {v[2]:.6f}\n")
                
                # Write faces
                for face in faces:
                    f.write(f"f {face[0]} {face[1]} {face[2]}\n")
            
            print(f"Successfully created {output_file}")
            print(f"  Vertices: {len(vertices)}, Faces: {len(faces)}")
            
        except Exception as e:
            print(f"Error converting {surface_file}: {e}")
            raise
    
    def convert_cortical_surfaces(self):
        """Convert left and right hemisphere pial surfaces"""
        surfaces = [
            ('lh.pial', 'lh_pial.obj'),
            ('rh.pial', 'rh_pial.obj'),
            ('lh.white', 'lh_white.obj'),
            ('rh.white', 'rh_white.obj'),
            ('lh.inflated', 'lh_inflated.obj'),
            ('rh.inflated', 'rh_inflated.obj')
        ]
        
        for surf_name, obj_name in surfaces:
            surf_file = self.surf_dir / surf_name
            try:
                surf_file = self._get_surface_file(surf_file)
                output_file = self.output_dir / obj_name
                self.convert_surface_to_obj(surf_file, output_file)
            except FileNotFoundError:
                print(f"Warning: {surf_file} not found, skipping...")
    
    def convert_parcellated_regions(self, hemisphere='lh', annot_name='aparc'):
        """
        Convert individual parcellated regions to separate OBJ files
        
        Args:
            hemisphere: 'lh' or 'rh'
            annot_name: annotation name (e.g., 'aparc', 'aparc.a2009s')
        """
        print(f"\nConverting {hemisphere} parcellated regions ({annot_name})...")
        
        # Read surface geometry
        surf_file = self.surf_dir / f'{hemisphere}.pial'
        surf_file = self._get_surface_file(surf_file)
        
        vertices, faces = read_geometry(surf_file)
        
        # Read annotation
        annot_file = self.label_dir / f'{hemisphere}.{annot_name}.annot'
        if not annot_file.exists():
            print(f"Warning: {annot_file} not found, skipping parcellation...")
            return
        
        labels, ctab, names = read_annot(annot_file)
        
        # Create output directory for parcellations
        parc_dir = self.output_dir / 'parcellations' / hemisphere
        parc_dir.mkdir(parents=True, exist_ok=True)
        
        # Convert each region to a separate OBJ file
        for idx, region_name in enumerate(names):
            region_name_str = region_name.decode('utf-8') if isinstance(region_name, bytes) else region_name
            
            # Skip unknown/corpus callosum regions
            if region_name_str.lower() in ['unknown', 'corpuscallosum']:
                continue
            
            # Get vertices belonging to this region
            region_mask = (labels == idx)
            region_vertex_indices = np.where(region_mask)[0]
            
            if len(region_vertex_indices) == 0:
                continue
            
            # Extract faces that belong to this region
            face_mask = np.isin(faces, region_vertex_indices).all(axis=1)
            region_faces = faces[face_mask]
            
            if len(region_faces) == 0:
                continue
            
            # Create vertex mapping
            vertex_mapping = {old_idx: new_idx for new_idx, old_idx in enumerate(region_vertex_indices)}
            region_vertices = vertices[region_vertex_indices]
            
            # Remap faces to new vertex indices
            remapped_faces = np.array([[vertex_mapping[f] for f in face] for face in region_faces])
            
            # Write OBJ file
            output_file = parc_dir / f'{region_name_str}.obj'
            with open(output_file, 'w') as f:
                f.write(f"# Region: {region_name_str}\n")
                f.write(f"# Hemisphere: {hemisphere}\n\n")
                
                # Write vertices
                for v in region_vertices:
                    f.write(f"v {v[0]:.6f} {v[1]:.6f} {v[2]:.6f}\n")
                
                # Write faces (1-indexed for OBJ)
                for face in remapped_faces:
                    f.write(f"f {face[0]+1} {face[1]+1} {face[2]+1}\n")
            
            print(f"  Created {region_name_str}.obj ({len(region_vertices)} vertices, {len(remapped_faces)} faces)")
    
    def convert_subcortical_segmentation(self):
        """
        Convert subcortical segmentations from aseg.mgz to individual OBJ meshes
        Requires FreeSurfer's mri_tessellate or similar tool
        """
        raise NotImplementedError
        print("\nConverting subcortical segmentations...")
        
        aseg_file = self.mri_dir / 'aseg.mgz'
        if not aseg_file.exists():
            print(f"Warning: {aseg_file} not found, skipping subcortical structures...")
            return
        
        # FreeSurfer subcortical structure labels
        subcortical_structures = {
            10: 'Left-Thalamus',
            11: 'Left-Caudate',
            12: 'Left-Putamen',
            13: 'Left-Pallidum',
            17: 'Left-Hippocampus',
            18: 'Left-Amygdala',
            26: 'Left-Accumbens',
            49: 'Right-Thalamus',
            50: 'Right-Caudate',
            51: 'Right-Putamen',
            52: 'Right-Pallidum',
            53: 'Right-Hippocampus',
            54: 'Right-Amygdala',
            58: 'Right-Accumbens',
            16: 'Brain-Stem'
        }
        
        # Load segmentation volume
        aseg_img = nib.load(aseg_file)
        aseg_data = aseg_img.get_fdata()
        
        print("Note: For optimal results, use FreeSurfer's mri_tessellate:")
        for label_id, structure_name in subcortical_structures.items():
            output_file = self.output_dir / f'{structure_name}.obj'
            print(f"  mri_tessellate {aseg_file} {label_id} {output_file}")
        
        # # Alternative: Use marching cubes (requires scikit-image)
        # try:
        #     from skimage import measure
            
        #     subcort_dir = self.output_dir / 'subcortical'
        #     subcort_dir.mkdir(parents=True, exist_ok=True)
            
        #     for label_id, structure_name in subcortical_structures.items():
        #         print(f"Processing {structure_name}...")
                
        #         # Create binary mask for this structure
        #         mask = (aseg_data == label_id)
                
        #         if not mask.any():
        #             print(f"  Warning: No voxels found for {structure_name}")
        #             continue
                
        #         # Apply marching cubes
        #         verts, faces, normals, values = measure.marching_cubes(mask, level=0.5)
                
        #         # Apply affine transformation to get RAS coordinates
        #         affine = aseg_img.affine
        #         verts_ras = nib.affines.apply_affine(affine, verts)
                
        #         # Write OBJ file
        #         output_file = subcort_dir / f'{structure_name}.obj'
        #         with open(output_file, 'w') as f:
        #             f.write(f"# {structure_name}\n\n")
                    
        #             for v in verts_ras:
        #                 f.write(f"v {v[0]:.6f} {v[1]:.6f} {v[2]:.6f}\n")
                    
        #             for face in faces:
        #                 f.write(f"f {face[0]+1} {face[1]+1} {face[2]+1}\n")
                
        #         print(f"  Created {structure_name}.obj ({len(verts_ras)} vertices, {len(faces)} faces)")
                
        # except ImportError:
        #     print("Note: Install scikit-image for automatic subcortical mesh generation:")
        #     print("  pip install scikit-image")
    
    def convert_all(self):
        """Convert all available FreeSurfer data to OBJ format"""
        print(f"Converting FreeSurfer data from: {self.subject_dir}")
        print(f"Output directory: {self.output_dir}\n")
        
        # Convert cortical surfaces
        self.convert_cortical_surfaces()
        
        # Convert parcellated regions for both hemispheres
        for hemisphere in ['lh', 'rh']:
            self.convert_parcellated_regions(hemisphere, 'aparc')
        
        # Convert subcortical structures
        self.convert_subcortical_segmentation()
        
        print("\nConversion complete!")
        print(f"OBJ files saved to: {self.output_dir}")


def main():
    parser = argparse.ArgumentParser(
        description='Convert FreeSurfer brain data to OBJ format for Three.js visualization'
    )
    parser.add_argument(
        '--subject_dir',
        help='Path to FreeSurfer subject directory (e.g., $SUBJECTS_DIR/bert)'
    )
    parser.add_argument(
        '--output_dir',
        help='Output directory for OBJ files'
    )
    parser.add_argument(
        '--surfaces-only',
        action='store_true',
        help='Convert only cortical surfaces (skip parcellations and subcortical)'
    )
    parser.add_argument(
        '--parcellations-only',
        action='store_true',
        help='Convert only parcellated regions'
    )
    
    args = parser.parse_args()
    
    # Validate input directory
    subject_dir = Path(args.subject_dir)
    if not subject_dir.exists():
        print(f"Error: Subject directory not found: {subject_dir}")
        sys.exit(1)
    
    # Create converter and run
    converter = FreeSurferConverter(args.subject_dir, args.output_dir)
    
    if args.surfaces_only:
        converter.convert_cortical_surfaces()
    elif args.parcellations_only:
        for hemi in ['lh', 'rh']:
            converter.convert_parcellated_regions(hemi)
    else:
        converter.convert_all()


if __name__ == '__main__':
    main()
