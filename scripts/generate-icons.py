#!/usr/bin/env python3
"""
Generate properly formatted Android adaptive icons with correct safe zones.
This script takes the main icon and creates versions with proper padding.
"""

from PIL import Image
import os

def create_adaptive_icon(source_path, output_path, size=1080, padding_ratio=0.25):
    """
    Create an adaptive icon with proper safe zone padding.
    
    Args:
        source_path: Path to source icon image
        output_path: Path to save the adaptive icon
        size: Output size (default 1080x1080)
        padding_ratio: Padding ratio (0.25 = 25% padding on each side)
    """
    try:
        # Open the source image
        img = Image.open(source_path)
        
        # Convert to RGBA if needed
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        # Create a new image with transparent background
        adaptive_icon = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        
        # Calculate the safe zone (inner area where content should be)
        safe_zone_size = int(size * (1 - 2 * padding_ratio))
        
        # Resize the source image to fit in the safe zone
        img_resized = img.resize((safe_zone_size, safe_zone_size), Image.Resampling.LANCZOS)
        
        # Calculate position to center the image
        offset = int(size * padding_ratio)
        
        # Paste the resized image onto the adaptive icon
        adaptive_icon.paste(img_resized, (offset, offset), img_resized)
        
        # Save the result
        adaptive_icon.save(output_path, 'PNG')
        print(f"✓ Created: {output_path}")
        print(f"  Size: {size}x{size}")
        print(f"  Safe zone: {safe_zone_size}x{safe_zone_size}")
        print(f"  Padding: {int(size * padding_ratio)}px on each side")
        
    except Exception as e:
        print(f"✗ Error creating adaptive icon: {e}")

def create_monochrome_icon(source_path, output_path, size=1080):
    """
    Create a monochrome version of the icon (white on transparent).
    """
    try:
        img = Image.open(source_path)
        
        # Convert to RGBA
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        # Create monochrome version (white)
        data = img.getdata()
        new_data = []
        
        for item in data:
            # If pixel has any opacity, make it white
            if item[3] > 0:  # If alpha > 0
                new_data.append((255, 255, 255, item[3]))
            else:
                new_data.append((0, 0, 0, 0))
        
        img.putdata(new_data)
        
        # Resize to target size
        img = img.resize((size, size), Image.Resampling.LANCZOS)
        
        img.save(output_path, 'PNG')
        print(f"✓ Created monochrome: {output_path}")
        
    except Exception as e:
        print(f"✗ Error creating monochrome icon: {e}")

def main():
    """Generate all icon variants."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    assets_dir = os.path.join(base_dir, 'assets', 'images')
    
    source_icon = os.path.join(assets_dir, 'icon.png')
    
    if not os.path.exists(source_icon):
        print(f"✗ Source icon not found: {source_icon}")
        return
    
    print("Generating Android adaptive icons...")
    print("=" * 50)
    
    # Create adaptive icon foreground with proper padding
    foreground_path = os.path.join(assets_dir, 'android-icon-foreground.png')
    create_adaptive_icon(source_icon, foreground_path, size=1080, padding_ratio=0.25)
    
    print()
    
    # Create monochrome version
    monochrome_path = os.path.join(assets_dir, 'android-icon-monochrome.png')
    create_monochrome_icon(source_icon, monochrome_path, size=1080)
    
    print()
    print("=" * 50)
    print("✓ Icon generation complete!")
    print()
    print("Next steps:")
    print("1. Rebuild the app: eas build --platform android")
    print("2. Test on Android device")
    print("3. Check app drawer - icon should display correctly")

if __name__ == '__main__':
    main()
