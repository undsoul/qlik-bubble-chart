# Qlik Bubble Chart Extension

<img width="1724" height="1394" alt="image" src="https://github.com/user-attachments/assets/48305e1a-32ae-4ffc-901e-a04f844ee5e2" />

A interactive hierarchical bubble chart visualization for Qlik Sense, built with D3.js v7.

![Version](https://img.shields.io/badge/version-12.0.0-blue.svg)
![Qlik Sense](https://img.shields.io/badge/Qlik%20Sense-Compatible-green.svg)
![D3.js](https://img.shields.io/badge/D3.js-v7-orange.svg)

## Features

- **Hierarchical Bubble Layout**: Visualize data with nested circles using D3.js pack layout
- **Master Item Color Support**: Automatically fetches and applies colors from Qlik master dimensions
- **Multi-Selection with Instant Feedback**: Click multiple bubbles to select them with immediate visual highlighting
- **Smart Hover Effects**: Scale and highlight on hover, automatically disabled during selection mode
- **Highly Customizable**: 50+ settings for colors, fonts, sizes, opacity, and more
- **Performance Optimized**: Configurable maximum bubbles, smart color caching
- **Responsive**: Adapts to container size with dynamic font scaling

## Screenshots

*Add screenshots here*

## Installation

### Qlik Sense Desktop
1. Download or clone this repository
2. Copy the `qlik-bubble-chart` folder to:
   ```
   C:\Users\[Username]\Documents\Qlik\Sense\Extensions\
   ```
3. Refresh your Qlik Sense app

### Qlik Sense Cloud / Server
1. Zip only the extension files (do NOT include the `samples` folder):
   - `qlik-bubble-chart.js`
   - `qlik-bubble-properties.js`
   - `qlik-bubble-style.css`
   - `qlik-bubble-chart.qext`
   - `d3.v7.js`
2. Upload via the Management Console or Developer Hub
3. The extension will be available in your visualization library

## Sample App

A sample Qlik Sense app is included in the `samples/` folder:
- **Bubbles.qvf** - Demo app showing the extension in action

Import this app into Qlik Sense Desktop to see the extension working with sample data.

## Data Requirements

The extension requires:
- **2 Dimensions**:
  - Dimension 1: Item/Entity name (e.g., Company, Product)
  - Dimension 2: Group/Category (e.g., Country, Sector) - supports master dimension colors
- **1 Measure**: Numeric value for bubble sizing (e.g., Revenue, Market Cap)

## Configuration Options

### Chart Settings
| Setting | Description | Default |
|---------|-------------|---------|
| Maximum Number of Bubbles | Limit data points for performance | 50 |
| Bubble Spacing | Padding between bubbles (pixels) | 3 |
| Min/Max Bubble Size | Size range in pixels | 20-120 |

### Color Modes
| Mode | Description |
|------|-------------|
| **Auto** | Uses selected color palette |
| **Master** | Fetches colors from master dimension values |
| **Single** | All bubbles same color |
| **Custom** | JSON-defined color mapping |

### Available Palettes
- Q10 (Qlik default)
- Category10, Category20
- Set1, Set2, Set3
- Dark2, Paired
- Pastel1, Pastel2

### Appearance Options
- Bubble opacity, border width, border color
- Shadow effects with customizable blur and offset
- Hover effects (scale, highlight) - auto-disabled during selection
- Group circle visibility and opacity

### Labels & Text
- Show/hide bubble labels and values
- Font family, size, weight, style
- Dynamic font sizing based on bubble radius
- Group label customization

### Legend
- Position: Right, Left, Top, Bottom
- Custom text color
- Show/hide toggle

### Tooltip
- Enable/disable hover tooltips
- Shows: Name, Group, Value

### Developer Options
- Debug mode toggle for console logging

## Selection Behavior

The extension provides intuitive multi-selection:

1. **Click a bubble** - Instantly highlights it (full opacity), dims all others (20% opacity)
2. **Click more bubbles** - Accumulates selections, all selected bubbles stay highlighted
3. **Click a selected bubble** - Deselects it (toggle behavior)
4. **Hover effects** - Automatically disabled during selection mode to preserve visual clarity
5. **Confirm selection** - Use Qlik's confirmation bar to confirm or cancel

## Master Item Colors

To use colors from a Qlik master dimension:

1. Create a master dimension with assigned value colors in Qlik
2. Add it as Dimension 2 in the chart
3. Set **Color Mode** to "Master"
4. Colors will be fetched automatically and cached for performance
5. Changes to master item colors are detected and updated automatically

## API / Technical Details

### Module Structure
```
qlik-bubble-chart/
├── qlik-bubble-chart.js      # Main extension logic
├── qlik-bubble-chart.qext    # Extension manifest
├── qlik-bubble-properties.js # Property panel definition
├── qlik-bubble-style.css     # Styles
├── d3.v7.js                  # D3.js library
├── README.md                 # This file
└── samples/
    └── Bubbles.qvf           # Sample app (not for upload)
```

### Dependencies
- Qlik Sense (Desktop, Server, or Cloud)
- D3.js v7 (bundled)
- jQuery (provided by Qlik)

### Key Functions
- `paint()`: Main rendering function called by Qlik
- `debugLog()`: Conditional logging (enable in Developer Options)
- `setColorState()`: Helper for managing color fetch state
- Color fetching via Enigma API for master dimension support

## Troubleshooting

### White/Blank Chart
- Check browser console for errors (enable Debug Mode)
- Verify data has valid numeric measure values
- Ensure 2 dimensions and 1 measure are configured

### Colors Not Showing
- Verify Color Mode is set to "Master"
- Check that master dimension has colors assigned to values
- Enable Debug Mode to see color fetching logs

### Performance Issues
- Reduce "Maximum Number of Bubbles" setting
- Disable shadow effects
- Reduce hover effects

### Selection Issues
- Selections require confirmation via Qlik's selection bar
- Visual feedback is instant, but data filters after confirmation

## Version History

### v12.0.0
- Multi-selection with instant visual feedback
- Smart hover effects (auto-disabled during selection mode)
- Improved selection UX with toggle behavior
- Code refactoring with centralized CONSTANTS
- Helper functions to eliminate code duplication
- Better event handling for hover and click

### v11.0.0
- Added master item color support with automatic change detection
- Added debug mode toggle
- Performance improvements with color caching
- Fixed white page issue on color re-fetch
- 50+ customization options

## Author

**MuchachoAI**

## License

MIT License - See LICENSE file for details

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Support

For issues and feature requests, please use the GitHub Issues tab.
