# Save-Image-as-Type

This is a Chromium extension that adds options to save images as PNG, JPG, or WebP directly from the context menu.

## Overview

This project is a stripped-down fork of the original [Save-Image-as-Type](https://github.com/image4tools/Save-Image-as-Type) extension by [Cuixiping]. The primary goal of this fork is to enhance privacy and user security by minimizing the permissions required and streamlining the functionality.

### Key Features

- Adds "Save Image as PNG," "Save Image as JPG," and "Save Image as WebP" options to the context menu for images.
- Supports direct saving of images with minimal user interaction.

### Changes Made

- **Minimal Permissions**: This fork opts to use only the `"scripting"` and `"contextMenus"` permissions. This means that the extension only has access to the current tab when the user interacts with it, ensuring a more secure experience.

- **Removal of Offscreen Functionality**: The offscreen document functionality has been removed due to piracy concerns. The previous implementation, which allowed for processing images in an offscreen context, could potentially expose users to unwanted risks. By eliminating this feature, the extension focuses solely on the core functionality of saving images with increased security.

### Permissions Management

**NOT CURRENTLY SUPPORTED, ONCE FIXED IT WILL ALLOW THE FOLLOWING**:

When you install this extension, Chromium will prompt you with the option **"Allow this extension to read and change all your data on websites that you visit."** You can set this permission to be:

- **On click**: The extension will only have access to the current tab when you actively use it.
- **On specific sites**: If you prefer, you can allow the extension access only to certain websites.

You can manage these permissions in your Chromium browser's settings, finding this extension, and clicking on the "Details" button. From there, you can adjust the site access settings according to your preferences.

## Minimum Chrome Version

This extension has been tested on **Chromium version 129.0.6668.70**. While this is the minimum version specified, lower versions of Chromium may still work. However, functionality cannot be guaranteed on versions below this threshold.

## Installation

1. **Download the ZIP file**: Go to the [Releases page](https://github.com/CorruptBandit/Save-Image-as-Type/releases) to download the latest release ZIP file or clone/download the repository as a ZIP.
2. **Enable Developer Mode**: Open Chrome and navigate to `chrome://extensions/`.
3. **Load the Extension**: 
   - **Method 1**: Drag and drop the downloaded ZIP file directly into the `chrome://extensions/` page.
   - **Method 2**: Click "Load unpacked" and select the directory where you extracted the ZIP file or where you cloned the repository.

## Usage

1. Right-click on any image on a webpage.
2. Select "Save Image as PNG" or "Save Image as JPG" from the context menu.
3. Choose the desired location and save the image.

## License

This project is licensed under the GNU General Public License. See the [LICENSE](./LICENSE) file for details.

## Acknowledgments

Thanks to [Cuixiping](https://github.com/Cuixiping) for the original work on the Save-Image-as-Type extension, which inspired this project.
