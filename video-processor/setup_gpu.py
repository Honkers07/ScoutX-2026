"""
Setup script for video-processor GPU/CUDA support.

Run this script to install PyTorch with CUDA support:
    python setup_gpu.py

This will:
1. Check your CUDA version
2. Install the correct PyTorch version for your CUDA
3. Verify GPU is detected
"""

import subprocess
import sys
import os

def get_cuda_version():
    """Get installed CUDA version from nvidia-smi."""
    try:
        result = subprocess.run(['nvidia-smi'], capture_output=True, text=True)
        for line in result.stdout.split('\n'):
            if 'CUDA Version:' in line:
                return line.split('CUDA Version:')[1].strip()
    except Exception as e:
        print(f"Could not detect CUDA version: {e}")
    return None

def install_pytorch(cuda_version):
    """Install PyTorch with CUDA support."""
    print(f"\nDetected CUDA version: {cuda_version}")
    
    # Determine PyTorch index URL based on CUDA version
    if cuda_version and cuda_version.startswith('13'):
        index_url = "https://download.pytorch.org/whl/cu121"
        print(f"Using CUDA 12.x wheels")
    elif cuda_version and cuda_version.startswith('12'):
        index_url = "https://download.pytorch.org/whl/cu121"
        print(f"Using CUDA 12.x wheels")
    elif cuda_version and cuda_version.startswith('11'):
        index_url = "https://download.pytorch.org/whl/cu117"
        print(f"Using CUDA 11.x wheels")
    else:
        # Default to CPU version if CUDA version not detected
        index_url = "https://download.pytorch.org/whl/cpu"
        print("Could not detect CUDA version - installing CPU version")
    
    print(f"\nInstalling PyTorch with CUDA support...")
    print(f"Command: pip install torch torchvision --index-url {index_url}")
    
    try:
        subprocess.check_call([
            sys.executable, '-m', 'pip', 'install', 
            'torch', 'torchvision',
            '--index-url', index_url
        ])
        print("PyTorch installed successfully!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error installing PyTorch: {e}")
        return False

def verify_cuda():
    """Verify CUDA is working."""
    print("\nVerifying CUDA installation...")
    try:
        import torch
        print(f"PyTorch version: {torch.__version__}")
        print(f"CUDA available: {torch.cuda.is_available()}")
        
        if torch.cuda.is_available():
            print(f"CUDA version: {torch.version.cuda}")
            print(f"GPU count: {torch.cuda.device_count()}")
            print(f"GPU name: {torch.cuda.get_device_name(0)}")
            print("\n[OK] GPU is ready for use!")
            return True
        else:
            print("\n[WARNING] CUDA not available. Reasons could be:")
            print("  - PyTorch not installed with CUDA support")
            print("  - NVIDIA driver not installed")
            print("  - GPU not compatible with CUDA")
            return False
    except ImportError:
        print("PyTorch not installed")
        return False
    except Exception as e:
        print(f"Error verifying CUDA: {e}")
        return False

def main():
    print("=" * 60)
    print("Video-Processor GPU Setup")
    print("=" * 60)
    
    # Get CUDA version
    cuda_version = get_cuda_version()
    
    # Install PyTorch
    if not install_pytorch(cuda_version):
        print("\nFailed to install PyTorch. Please try manually:")
        print("  pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121")
        sys.exit(1)
    
    # Verify installation
    if verify_cuda():
        print("\n" + "=" * 60)
        print("Setup complete! GPU is ready for video processing.")
        print("=" * 60)
    else:
        print("\n" + "=" * 60)
        print("Warning: CUDA not working. Video processing will use CPU.")
        print("=" * 60)

if __name__ == "__main__":
    main()
