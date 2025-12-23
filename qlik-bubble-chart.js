// qlik-bubble-chart-fixed.js
define([
    'qlik',
    'jquery',
    './d3.v7',
    './qlik-bubble-properties',
    'css!./qlik-bubble-style.css'
], function (qlik, $, d3, properties) {
    'use strict';

    // ============================================================================
    // CONSTANTS - All magic numbers and defaults in one place
    // ============================================================================
    var CONSTANTS = {
        TIMING: {
            RESIZE_DEBOUNCE: 300,
            ANIMATION_FAST: 200,
            ANIMATION_MEDIUM: 500,
            ANIMATION_SLOW: 750
        },
        FONT_SCALE: {
            LABEL: 0.4,
            VALUE: 0.3,
            VALUE_SIZE: 0.8,
            GROUP: 0.1,
            TRUNCATION: 4
        },
        TOOLTIP: {
            Z_INDEX: 10000,
            PADDING: '10px',
            BORDER_RADIUS: '5px',
            FONT_SIZE: '14px'
        },
        DEFAULTS: {
            MAX_BUBBLES: 50,
            PACKING_DENSITY: 3,
            MIN_BUBBLE_SIZE: 20,
            MAX_BUBBLE_SIZE: 120,
            BUBBLE_OPACITY: 0.7,
            STROKE_WIDTH: 2,
            BORDER_OPACITY: 1,
            HOVER_OPACITY: 1,
            SHADOW_BLUR: 10,
            SHADOW_OFFSET_X: 3,
            SHADOW_OFFSET_Y: 3,
            LABEL_SIZE: 12,
            MIN_SIZE_FOR_LABEL: 20,
            MIN_SIZE_FOR_VALUE: 30,
            GROUP_LABEL_SIZE: 16,
            GROUP_LABEL_OPACITY: 1,
            MIN_GROUP_SIZE_FOR_LABEL: 50,
            GROUP_IMAGE_SIZE: 24,
            GROUP_BUBBLE_OPACITY: 0.1,
            GROUP_BORDER_OPACITY: 0.3
        },
        COLORS: {
            BACKGROUND: '#FFFFFF',
            BORDER: '#CCCCCC',
            LABEL: '#333333',
            VALUE: '#666666',
            LEGEND_TEXT: '#333333',
            SINGLE: '#1f77b4',
            FALLBACK: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf']
        },
        PALETTES: {
            Q10: ['#767DF2', '#BF2B17', '#F25C06', '#65AA88', '#039289', '#1A778B', '#FA8907', '#F7BB02', '#D5BD4B', '#17becf'],
            category10: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'],
            category20: ['#1f77b4', '#aec7e8', '#ff7f0e', '#ffbb78', '#2ca02c', '#98df8a', '#d62728', '#ff9896', '#9467bd', '#c5b0d5', '#8c564b', '#c49c94', '#e377c2', '#f7b6d2', '#7f7f7f', '#c7c7c7', '#bcbd22', '#dbdb8d', '#17becf', '#9edae5'],
            set1: ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#ffff33', '#a65628', '#f781bf', '#999999'],
            set2: ['#66c2a5', '#fc8d62', '#8da0cb', '#e78ac3', '#a6d854', '#ffd92f', '#e5c494', '#b3b3b3'],
            set3: ['#8dd3c7', '#ffffb3', '#bebada', '#fb8072', '#80b1d3', '#fdb462', '#b3de69', '#fccde5', '#d9d9d9', '#bc80bd', '#ccebc5', '#ffed6f'],
            dark2: ['#1b9e77', '#d95f02', '#7570b3', '#e7298a', '#66a61e', '#e6ab02', '#a6761d', '#666666'],
            paired: ['#a6cee3', '#1f78b4', '#b2df8a', '#33a02c', '#fb9a99', '#e31a1c', '#fdbf6f', '#ff7f00', '#cab2d6', '#6a3d9a', '#ffff99', '#b15928'],
            pastel1: ['#fbb4ae', '#b3cde3', '#ccebc5', '#decbe4', '#fed9a6', '#ffffcc', '#e5d8bd', '#fddaec', '#f2f2f2'],
            pastel2: ['#b3e2cd', '#fdcdac', '#cbd5e8', '#f4cae4', '#e6f5c9', '#fff2ae', '#f1e2cc', '#cccccc']
        }
    };

    // ============================================================================
    // HELPER FUNCTIONS
    // ============================================================================

    // Get color from color picker object
    function getColor(colorObj, defaultColor) {
        if (colorObj && colorObj.color) {
            return colorObj.color;
        }
        return defaultColor;
    }

    // Convert ARGB number to hex
    function argbToHex(argb) {
        if (argb < 0) {
            argb = argb >>> 0;
        }
        var r = (argb >> 16) & 0xFF;
        var g = (argb >> 8) & 0xFF;
        var b = argb & 0xFF;
        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    // Extract color from various formats
    function extractColorValue(colorEntry) {
        if (!colorEntry) return null;
        if (typeof colorEntry === 'string') return colorEntry;
        if (colorEntry.color) return colorEntry.color;
        if (colorEntry.qColor) return extractColorValue(colorEntry.qColor);
        if (typeof colorEntry === 'number') return argbToHex(colorEntry);
        if (colorEntry.qNum !== undefined && !isNaN(colorEntry.qNum)) return argbToHex(colorEntry.qNum);
        return null;
    }

    // Set color state on extension instance (eliminates duplication)
    function setColorState(self, colors, changeHash, isFetching) {
        self._fetchingColors = isFetching || false;
        self._colorsFetched = !isFetching;
        self._masterItemColors = colors || {};
        if (changeHash !== undefined) {
            self._colorChangeHash = changeHash;
        }
    }

    // Format large numbers with K/M/B/T suffixes
    function formatLargeNumber(val, decimals) {
        decimals = decimals !== undefined ? decimals : 1;
        if (val >= 1e12) return (val / 1e12).toFixed(decimals) + 'T';
        if (val >= 1e9) return (val / 1e9).toFixed(decimals) + 'B';
        if (val >= 1e6) return (val / 1e6).toFixed(decimals) + 'M';
        if (val >= 1e3) return (val / 1e3).toFixed(decimals) + 'K';
        return d3.format(',')(val);
    }

    // ============================================================================
    // EXTENSION DEFINITION
    // ============================================================================
    return {
        initialProperties: {
            qHyperCubeDef: {
                qDimensions: [],
                qMeasures: [],
                qInitialDataFetch: [{
                    qWidth: 10,
                    qHeight: 1000
                }],
                qInterColumnSortOrder: [],
                qSuppressZero: false,
                qSuppressMissing: true
            },
            showTitles: true,
            title: "Enhanced Bubble Chart"
        },
        definition: properties,
        support: {
            snapshot: true,
            export: true,
            exportData: true
        },
        
        paint: function ($element, layout) {
            var self = this;
            
            // Check if we're already fetching colors to prevent loops
            if (self._fetchingColors) {
                return qlik.Promise.resolve();
            }
            
            // Clear element
            $element.empty();
            
            // Get dimensions
            var width = $element.width();
            var height = $element.height();
            
            // Check for data
            if (!layout.qHyperCube || !layout.qHyperCube.qDataPages || !layout.qHyperCube.qDataPages[0]) {
                $element.html('<div style="text-align: center; padding: 20px;">Loading data...</div>');
                return qlik.Promise.resolve();
            }
            
            var matrix = layout.qHyperCube.qDataPages[0].qMatrix;
            if (!matrix || matrix.length === 0) {
                $element.html('<div style="text-align: center; padding: 20px;">No data available</div>');
                return qlik.Promise.resolve();
            }
            
            // Extract settings with proper defaults
            var settings = layout.settings || {};

            // Initialize local selection tracker (persists across paint calls)
            if (!self._localSelections) {
                self._localSelections = new Set();
            }

            // Debug mode setting
            var debugMode = settings.enableDebug === true;

            // Debug logging function - only logs when debug mode is enabled
            function debugLog() {
                if (debugMode) {
                    console.log.apply(console, ['[BubbleChart]'].concat(Array.prototype.slice.call(arguments)));
                }
            }

            // Get all settings (using helper functions and CONSTANTS from top level)
            var backgroundColor = getColor(settings.backgroundColor, CONSTANTS.COLORS.BACKGROUND);
            var borderColor = getColor(settings.borderColor, CONSTANTS.COLORS.BORDER);
            var labelColor = getColor(settings.labelColor, CONSTANTS.COLORS.LABEL);
            var valueColor = getColor(settings.valueColor, CONSTANTS.COLORS.VALUE);
            var legendTextColor = getColor(settings.legendTextColor, CONSTANTS.COLORS.LEGEND_TEXT);
            var singleColor = getColor(settings.singleColor, CONSTANTS.COLORS.SINGLE);

            var maxBubbles = settings.maxBubbles || CONSTANTS.DEFAULTS.MAX_BUBBLES;
            debugLog('maxBubbles setting:', maxBubbles, '(from settings:', settings.maxBubbles, ')');
            var packingDensity = settings.packingDensity !== undefined ? settings.packingDensity : CONSTANTS.DEFAULTS.PACKING_DENSITY;
            var minBubbleSize = settings.minBubbleSize || CONSTANTS.DEFAULTS.MIN_BUBBLE_SIZE;
            var maxBubbleSize = settings.maxBubbleSize || CONSTANTS.DEFAULTS.MAX_BUBBLE_SIZE;

            var bubbleOpacity = settings.bubbleOpacity !== undefined ? settings.bubbleOpacity : CONSTANTS.DEFAULTS.BUBBLE_OPACITY;
            var strokeWidth = settings.strokeWidth !== undefined ? settings.strokeWidth : CONSTANTS.DEFAULTS.STROKE_WIDTH;
            var borderOpacity = settings.borderOpacity !== undefined ? settings.borderOpacity : CONSTANTS.DEFAULTS.BORDER_OPACITY;

            var enableHoverEffect = settings.enableHoverEffect !== false;
            var hoverOpacity = settings.hoverOpacity !== undefined ? settings.hoverOpacity : CONSTANTS.DEFAULTS.HOVER_OPACITY;
            var enableShadow = settings.enableShadow || false;
            var shadowBlur = settings.shadowBlur || CONSTANTS.DEFAULTS.SHADOW_BLUR;
            var shadowOffsetX = settings.shadowOffsetX || CONSTANTS.DEFAULTS.SHADOW_OFFSET_X;
            var shadowOffsetY = settings.shadowOffsetY || CONSTANTS.DEFAULTS.SHADOW_OFFSET_Y;
            
            var colorMode = settings.colorMode || 'auto';
            var colorPalette = settings.colorPalette || 'Q10';
            var customColors = {};
            if (settings.customColors) {
                try {
                    customColors = JSON.parse(settings.customColors);
                } catch (e) {
                    customColors = {};
                }
            }
            
            var showLabels = settings.showLabels !== false;
            var labelSize = settings.labelSize || CONSTANTS.DEFAULTS.LABEL_SIZE;
            var labelFontFamily = settings.labelFontFamily || 'sans-serif';
            var labelFontWeight = settings.labelFontWeight || 'bold';
            var labelFontStyle = settings.labelFontStyle || 'normal';
            var minSizeForLabel = settings.minSizeForLabel || CONSTANTS.DEFAULTS.MIN_SIZE_FOR_LABEL;

            var showValues = settings.showValues !== false;
            var valueFontFamily = settings.valueFontFamily || 'sans-serif';
            var valueFontWeight = settings.valueFontWeight || 'normal';
            var valueFontStyle = settings.valueFontStyle || 'normal';
            var minSizeForValue = settings.minSizeForValue || CONSTANTS.DEFAULTS.MIN_SIZE_FOR_VALUE;

            var showGroupLabels = settings.showGroupLabels !== false;
            var groupLabelFontFamily = settings.groupLabelFontFamily || 'sans-serif';
            var groupLabelFontWeight = settings.groupLabelFontWeight || 'normal';
            var groupLabelFontStyle = settings.groupLabelFontStyle || 'normal';

            var showLegend = settings.showLegend || false;
            var legendPosition = settings.legendPosition || 'right';

            var showTooltip = settings.showTooltip !== false;
            var enableZoom = settings.enableZoom !== false;
            var showGroupBubbles = settings.showGroupBubbles !== false;
            var groupBubbleOpacity = settings.groupBubbleOpacity !== undefined ? settings.groupBubbleOpacity : CONSTANTS.DEFAULTS.GROUP_BUBBLE_OPACITY;
            var groupBorderOpacity = settings.groupBorderOpacity !== undefined ? settings.groupBorderOpacity : CONSTANTS.DEFAULTS.GROUP_BORDER_OPACITY;
            var showGroupValues = settings.showGroupValues !== false;
            var groupLabelSize = settings.groupLabelSize || CONSTANTS.DEFAULTS.GROUP_LABEL_SIZE;
            var groupLabelOpacity = settings.groupLabelOpacity !== undefined ? settings.groupLabelOpacity : CONSTANTS.DEFAULTS.GROUP_LABEL_OPACITY;
            var groupLabelOutline = settings.groupLabelOutline !== false;
            var minGroupSizeForLabel = settings.minGroupSizeForLabel || CONSTANTS.DEFAULTS.MIN_GROUP_SIZE_FOR_LABEL;
            var showGroupImages = settings.showGroupImages || false;
            var groupImageSize = settings.groupImageSize || CONSTANTS.DEFAULTS.GROUP_IMAGE_SIZE;
            var groupImageMapping = {};
            if (settings.groupImageMapping) {
                try {
                    groupImageMapping = JSON.parse(settings.groupImageMapping);
                } catch (e) {
                    groupImageMapping = {};
                }
            }
            
            // Get dimensions and measures count
            var dimensionCount = layout.qHyperCube.qDimensionInfo.length;
            var measureCount = layout.qHyperCube.qMeasureInfo.length;
            
            // Build hierarchical data structure
            var hierarchyData = {
                name: "root",
                children: []
            };
            
            var groupMap = {};
            var masterItemColors = {};

            // Get unique dimension values for color matching
            function getDimensionValues() {
                var values = [];
                var seen = {};
                matrix.forEach(function(row) {
                    if (row[1] && row[1].qText && !seen[row[1].qText]) {
                        values.push(row[1].qText);
                        seen[row[1].qText] = true;
                    }
                });
                return values;
            }

            // Fetch master dimension colors if defined
            var dimInfo = dimensionCount > 1 ? layout.qHyperCube.qDimensionInfo[1] : null;

            debugLog(' Color mode:', colorMode);
            debugLog(' Dimension info:', dimInfo);
            debugLog(' Has qColorMapRef:', !!(dimInfo && dimInfo.qColorMapRef));
            debugLog(' Has qLibraryId (master item):', !!(dimInfo && dimInfo.qLibraryId));
            debugLog(' Colors already fetched:', self._colorsFetched);
            debugLog(' Last color change hash:', self._colorChangeHash);
            debugLog(' Cached colors count:', self._masterItemColors ? Object.keys(self._masterItemColors).length : 0);

            // Check if we already have valid cached colors - if so, use them directly for rendering
            var hasCachedColors = self._colorsFetched && self._masterItemColors && Object.keys(self._masterItemColors).length > 0;
            if (colorMode === 'master' && hasCachedColors) {
                debugLog(' Using cached master colors for rendering');
                masterItemColors = self._masterItemColors;

                // Background check for color changes (non-blocking)
                if (dimInfo && dimInfo.qLibraryId && !self._checkingColors) {
                    self._checkingColors = true;
                    var app = qlik.currApp();
                    var enigmaApp = app.model.enigmaModel;

                    enigmaApp.getDimension(dimInfo.qLibraryId).then(function(masterDim) {
                        return masterDim.getLayout();
                    }).then(function(masterDimLayout) {
                        self._checkingColors = false;
                        if (masterDimLayout.qDim && masterDimLayout.qDim.coloring) {
                            var currentChangeHash = masterDimLayout.qDim.coloring.changeHash;
                            debugLog(' Background check - Current hash:', currentChangeHash, 'Stored hash:', self._colorChangeHash);

                            // If changeHash changed, invalidate cache and repaint
                            if (currentChangeHash && currentChangeHash !== self._colorChangeHash) {
                                debugLog(' Colors changed! Invalidating cache and repainting...');
                                self._colorsFetched = false;
                                self._masterItemColors = {};
                                self._colorChangeHash = null;
                                self.paint($element, layout);
                            }
                        }
                    }).catch(function() {
                        self._checkingColors = false;
                    });
                }
                // Continue to rendering with cached colors
            }

            // Check if we need to fetch colors (for master color mode or if qColorMapRef exists)
            var needsColorFetch = (colorMode === 'master' || (dimInfo && dimInfo.qColorMapRef)) && !self._colorsFetched;

            // Only fetch if we don't have cached colors yet (first time load)
            var needsMasterItemFetch = colorMode === 'master' && dimInfo && dimInfo.qLibraryId && !self._fetchingColors && !hasCachedColors;

            // Try to fetch colors from master dimension definition if we have qLibraryId but no qColorMapRef
            if (needsMasterItemFetch && !dimInfo.qColorMapRef) {
                self._fetchingColors = true;
                var app = qlik.currApp();
                debugLog(' Fetching master dimension:', dimInfo.qLibraryId);

                // Use enigma model to get the dimension
                var enigmaApp = app.model.enigmaModel;

                // Store masterDim reference in outer scope
                var masterDimRef = null;

                enigmaApp.getDimension(dimInfo.qLibraryId).then(function(masterDim) {
                    debugLog(' Got master dimension object');
                    masterDimRef = masterDim; // Store reference for later use
                    return masterDim.getLayout();
                }).then(function(masterDimLayout) {
                    debugLog(' Master dimension layout:', JSON.stringify(masterDimLayout, null, 2));

                    var dimensionValues = getDimensionValues();

                    // Check if there's a colorMapRef - we need to fetch the ColorMap separately
                    var colorMapRef = null;
                    var currentChangeHash = null;
                    if (masterDimLayout.qDim && masterDimLayout.qDim.coloring) {
                        colorMapRef = masterDimLayout.qDim.coloring.colorMapRef;
                        currentChangeHash = masterDimLayout.qDim.coloring.changeHash;
                        debugLog(' Found colorMapRef in dimension:', colorMapRef);
                        debugLog(' Current changeHash:', currentChangeHash);
                        debugLog(' Stored changeHash:', self._colorChangeHash);
                    }

                    // If changeHash hasn't changed and we have cached colors, use them
                    if (currentChangeHash && currentChangeHash === self._colorChangeHash && self._masterItemColors && Object.keys(self._masterItemColors).length > 0) {
                        debugLog(' Colors unchanged (same changeHash), using cached colors');
                        self._fetchingColors = false;
                        self._masterItemColors = self._masterItemColors; // Keep cached
                        // Trigger repaint with cached colors (not a full refetch)
                        return self.paint($element, layout);
                    }

                    if (colorMapRef) {
                        // Try multiple approaches to get the colors

                        // First, try to get colors from dimension's getProperties which may have valueColors
                        return masterDimRef.getProperties().then(function(dimProps) {
                            debugLog(' Dimension properties:', JSON.stringify(dimProps, null, 2));

                            // Check if valueColors exist in properties
                            if (dimProps && dimProps.qDim && dimProps.qDim.coloring && dimProps.qDim.coloring.valueColors) {
                                debugLog(' Found valueColors in dimension properties!');
                                var valueColors = dimProps.qDim.coloring.valueColors;
                                valueColors.forEach(function(vc) {
                                    if (vc.value && vc.baseColor) {
                                        var colorValue = extractColorValue(vc.baseColor);
                                        if (colorValue) {
                                            masterItemColors[vc.value] = colorValue;
                                            debugLog(' Mapped color for "' + vc.value + '":', colorValue);
                                        }
                                    }
                                });
                            }

                            // If we found colors from properties, use them
                            if (Object.keys(masterItemColors).length > 0) {
                                debugLog(' Colors from dimension properties:', masterItemColors);
                                setColorState(self, masterItemColors, currentChangeHash);
                                return self.paint($element, layout);
                            }

                            // Otherwise try ColorMapModel approach
                            var colorMapObjectId = 'ColorMapModel_' + colorMapRef;
                            debugLog(' Trying ColorMapModel with ID:', colorMapObjectId);

                            return enigmaApp.getObject(colorMapObjectId).then(function(colorMapObj) {
                                debugLog(' Got ColorMapModel object');
                                return colorMapObj.getLayout();
                            }).then(function(colorMapLayout) {
                                debugLog(' ColorMapModel layout:', JSON.stringify(colorMapLayout, null, 2));
                                extractColorsFromColorMap(colorMapLayout, dimensionValues);
                                debugLog(' Colors from ColorMapModel:', masterItemColors);

                                setColorState(self, masterItemColors, currentChangeHash);
                                debugLog(' Stored new changeHash:', currentChangeHash);
                                return self.paint($element, layout);
                            }).catch(function(colorMapErr) {
                                console.warn('[BubbleChart] ColorMapModel fetch failed:', colorMapErr.message || colorMapErr);
                                // Continue without colors from ColorMapModel
                                extractMasterDimColors(masterDimLayout, dimensionValues);
                                debugLog(' Fallback colors from layout:', masterItemColors);

                                setColorState(self, masterItemColors, currentChangeHash);
                                return self.paint($element, layout);
                            });
                        });
                    } else {
                        // Try to extract directly from dimension layout
                        extractMasterDimColors(masterDimLayout, dimensionValues);

                        debugLog(' Colors from master dimension:', masterItemColors);

                        setColorState(self, masterItemColors, currentChangeHash);

                        // Repaint with colors
                        self.paint($element, layout);
                    }

                }).catch(function(err) {
                    console.error('[BubbleChart] Error fetching master dimension via enigma:', err);

                    // Fallback: try alternative method using getObject
                    debugLog(' Trying fallback method...');

                    app.getObject(dimInfo.qLibraryId).then(function(obj) {
                        debugLog(' Got object via getObject');
                        return obj.getLayout ? obj.getLayout() : obj;
                    }).then(function(objLayout) {
                        debugLog(' Object layout:', JSON.stringify(objLayout, null, 2));

                        var dimensionValues = getDimensionValues();
                        extractMasterDimColors(objLayout, dimensionValues);

                        debugLog(' Colors from fallback:', masterItemColors);

                        setColorState(self, masterItemColors);
                        self.paint($element, layout);

                    }).catch(function(err2) {
                        console.error('[BubbleChart] Fallback also failed:', err2);
                        // Continue without master colors
                        setColorState(self, {});
                        self.paint($element, layout);
                    });
                });

                $element.html('<div style="display: flex; align-items: center; justify-content: center; height: 100%; min-height: 200px;"><div style="text-align: center;"><div style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 10px;"></div><style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style><span style="color: #666;">Loading...</span></div></div>');
                return qlik.Promise.resolve();
            }

            // Helper function to extract colors from ColorMap object
            function extractColorsFromColorMap(colorMapLayout, dimensionValues) {
                debugLog(' Extracting colors from ColorMap');

                // Check for colorMap.colors structure (Qlik Sense Cloud format)
                if (colorMapLayout.colorMap && colorMapLayout.colorMap.colors) {
                    debugLog(' Found colorMap.colors');
                    var colors = colorMapLayout.colorMap.colors;

                    // colorMap.colors is an ARRAY of objects with {value, baseColor} structure
                    if (Array.isArray(colors)) {
                        debugLog(' colorMap.colors is an array with', colors.length, 'entries');
                        colors.forEach(function(entry) {
                            if (entry && entry.value) {
                                var colorValue = null;
                                // Extract color from baseColor object
                                if (entry.baseColor && entry.baseColor.color) {
                                    colorValue = entry.baseColor.color;
                                } else if (entry.color) {
                                    colorValue = entry.color;
                                } else {
                                    colorValue = extractColorValue(entry);
                                }

                                if (colorValue) {
                                    masterItemColors[entry.value] = colorValue;
                                    debugLog(' Mapped color for "' + entry.value + '":', colorValue);
                                }
                            }
                        });
                    } else {
                        // Fallback for object structure
                        Object.keys(colors).forEach(function(key) {
                            var colorEntry = colors[key];
                            var colorValue = extractColorValue(colorEntry);
                            if (colorValue) {
                                masterItemColors[key] = colorValue;
                                debugLog(' Mapped color for key "' + key + '":', colorValue);
                            }
                        });
                    }
                }

                // Check for qColorMap structure
                if (colorMapLayout.qColorMap && colorMapLayout.qColorMap.colors) {
                    debugLog(' Found qColorMap.colors');
                    Object.keys(colorMapLayout.qColorMap.colors).forEach(function(key) {
                        var colorValue = extractColorValue(colorMapLayout.qColorMap.colors[key]);
                        if (colorValue && !masterItemColors[key]) {
                            masterItemColors[key] = colorValue;
                        }
                    });
                }

                // Check for colors array directly
                if (colorMapLayout.colors) {
                    debugLog(' Found root colors');
                    if (Array.isArray(colorMapLayout.colors)) {
                        colorMapLayout.colors.forEach(function(entry, index) {
                            var colorValue = extractColorValue(entry);
                            if (colorValue && dimensionValues[index]) {
                                masterItemColors[dimensionValues[index]] = colorValue;
                            }
                        });
                    } else {
                        Object.keys(colorMapLayout.colors).forEach(function(key) {
                            var colorValue = extractColorValue(colorMapLayout.colors[key]);
                            if (colorValue) {
                                masterItemColors[key] = colorValue;
                            }
                        });
                    }
                }

                // Check for valueColors structure
                if (colorMapLayout.valueColors) {
                    debugLog(' Found valueColors');
                    colorMapLayout.valueColors.forEach(function(vc) {
                        if (vc.value !== undefined) {
                            var colorValue = extractColorValue(vc.baseColor || vc.color || vc);
                            if (colorValue) {
                                masterItemColors[vc.value] = colorValue;
                            }
                        }
                    });
                }
            }

            // Helper function to extract colors from master dimension layout
            function extractMasterDimColors(masterDimLayout, dimensionValues) {
                // Check qDim.coloring.colorMap
                if (masterDimLayout.qDim && masterDimLayout.qDim.coloring) {
                    var coloring = masterDimLayout.qDim.coloring;
                    debugLog(' Found qDim.coloring:', coloring);

                    if (coloring.colorMap && coloring.colorMap.colors) {
                        Object.keys(coloring.colorMap.colors).forEach(function(key) {
                            var colorValue = extractColorValue(coloring.colorMap.colors[key]);
                            if (colorValue) {
                                masterItemColors[key] = colorValue;
                                var numKey = parseInt(key, 10);
                                if (!isNaN(numKey) && dimensionValues[numKey]) {
                                    masterItemColors[dimensionValues[numKey]] = colorValue;
                                }
                            }
                        });
                    }

                    if (coloring.valueColors) {
                        coloring.valueColors.forEach(function(vc, index) {
                            if (vc.value && vc.color) {
                                masterItemColors[vc.value] = extractColorValue(vc.color);
                            } else if (vc.baseColor && dimensionValues[index]) {
                                masterItemColors[dimensionValues[index]] = extractColorValue(vc.baseColor);
                            }
                        });
                    }
                }

                // Check qDimension.coloring
                if (masterDimLayout.qDimension && masterDimLayout.qDimension.coloring) {
                    var coloring2 = masterDimLayout.qDimension.coloring;
                    debugLog(' Found qDimension.coloring:', coloring2);

                    if (coloring2.colorMap && coloring2.colorMap.colors) {
                        Object.keys(coloring2.colorMap.colors).forEach(function(key) {
                            var colorValue = extractColorValue(coloring2.colorMap.colors[key]);
                            if (colorValue && !masterItemColors[key]) {
                                masterItemColors[key] = colorValue;
                            }
                        });
                    }
                }

                // Check coloring directly on root
                if (masterDimLayout.coloring) {
                    debugLog(' Found root coloring:', masterDimLayout.coloring);
                    var coloring3 = masterDimLayout.coloring;

                    if (coloring3.colorMap && coloring3.colorMap.colors) {
                        Object.keys(coloring3.colorMap.colors).forEach(function(key) {
                            var colorValue = extractColorValue(coloring3.colorMap.colors[key]);
                            if (colorValue && !masterItemColors[key]) {
                                masterItemColors[key] = colorValue;
                            }
                        });
                    }
                }

                // Check qInfo for colorMap reference
                if (masterDimLayout.qInfo && masterDimLayout.qInfo.qType === 'dimension') {
                    debugLog(' This is a dimension object');
                }
            }

            if (needsColorFetch && dimInfo && dimInfo.qColorMapRef) {
                self._fetchingColors = true;

                var app = qlik.currApp();
                debugLog(' Fetching ColorMapModel:', dimInfo.qColorMapRef);

                // Fetch the ColorMapModel
                app.getObject(dimInfo.qColorMapRef).then(function(colorMapModel) {
                    debugLog(' Got ColorMapModel');
                    return colorMapModel.getLayout();
                }).then(function(colorMapLayout) {
                    debugLog(' ColorMapModel layout:', JSON.stringify(colorMapLayout, null, 2));

                    var dimensionValues = getDimensionValues();
                    debugLog(' Dimension values:', dimensionValues);

                    // Try multiple extraction strategies

                    // Strategy 1: colorMap.colors
                    if (colorMapLayout.colorMap && colorMapLayout.colorMap.colors) {
                        debugLog(' Found colorMap.colors');
                        var colors = colorMapLayout.colorMap.colors;
                        Object.keys(colors).forEach(function(key) {
                            var colorValue = extractColorValue(colors[key]);
                            if (colorValue) {
                                masterItemColors[key] = colorValue;
                                // Try to match numeric keys to dimension values
                                var numKey = parseInt(key, 10);
                                if (!isNaN(numKey) && dimensionValues[numKey]) {
                                    masterItemColors[dimensionValues[numKey]] = colorValue;
                                }
                            }
                        });
                    }

                    // Strategy 2: qColorMap
                    if (colorMapLayout.qColorMap && colorMapLayout.qColorMap.colors) {
                        debugLog(' Found qColorMap');
                        Object.keys(colorMapLayout.qColorMap.colors).forEach(function(key) {
                            var colorValue = extractColorValue(colorMapLayout.qColorMap.colors[key]);
                            if (colorValue && !masterItemColors[key]) {
                                masterItemColors[key] = colorValue;
                            }
                        });
                    }

                    // Strategy 3: colors on root
                    if (colorMapLayout.colors) {
                        debugLog(' Found root colors');
                        if (Array.isArray(colorMapLayout.colors)) {
                            colorMapLayout.colors.forEach(function(entry, index) {
                                var colorValue = extractColorValue(entry);
                                if (colorValue && dimensionValues[index]) {
                                    masterItemColors[dimensionValues[index]] = colorValue;
                                }
                            });
                        } else {
                            Object.keys(colorMapLayout.colors).forEach(function(key) {
                                var colorValue = extractColorValue(colorMapLayout.colors[key]);
                                if (colorValue) {
                                    masterItemColors[key] = colorValue;
                                }
                            });
                        }
                    }

                    // Strategy 4: qItems
                    if (colorMapLayout.qItems) {
                        debugLog(' Found qItems');
                        colorMapLayout.qItems.forEach(function(item) {
                            if (item.qText && item.qColor) {
                                masterItemColors[item.qText] = extractColorValue(item.qColor);
                            }
                        });
                    }

                    debugLog(' Extracted colors from ColorMapModel:', masterItemColors);

                    // Also extract colors from data rows as additional source
                    matrix.forEach(function(row) {
                        if (dimensionCount > 1 && row[1]) {
                            var groupName = row[1].qText;
                            if (!groupName || masterItemColors[groupName]) return;

                            // Check qAttrExps
                            if (row[1].qAttrExps && row[1].qAttrExps.qValues) {
                                for (var i = 0; i < row[1].qAttrExps.qValues.length; i++) {
                                    var attr = row[1].qAttrExps.qValues[i];
                                    if (attr) {
                                        var colorValue = null;
                                        if (attr.qText && attr.qText.charAt(0) === '#') {
                                            colorValue = attr.qText;
                                        } else if (attr.qText) {
                                            colorValue = attr.qText;
                                        } else if (attr.qNum !== undefined && !isNaN(attr.qNum)) {
                                            colorValue = argbToHex(attr.qNum);
                                        }
                                        if (colorValue) {
                                            masterItemColors[groupName] = colorValue;
                                            debugLog(' Found color from qAttrExps for ' + groupName + ':', colorValue);
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    });

                    debugLog(' Final merged colors:', masterItemColors);

                    setColorState(self, masterItemColors);

                    // Repaint with colors
                    self.paint($element, layout);

                }).catch(function(err) {
                    console.error("[BubbleChart] Error fetching ColorMapModel:", err);

                    // Try to extract colors from data rows as fallback
                    matrix.forEach(function(row) {
                        if (dimensionCount > 1 && row[1]) {
                            var groupName = row[1].qText;
                            if (!groupName || masterItemColors[groupName]) return;

                            if (row[1].qAttrExps && row[1].qAttrExps.qValues) {
                                for (var i = 0; i < row[1].qAttrExps.qValues.length; i++) {
                                    var attr = row[1].qAttrExps.qValues[i];
                                    if (attr) {
                                        var colorValue = null;
                                        if (attr.qText && attr.qText.charAt(0) === '#') {
                                            colorValue = attr.qText;
                                        } else if (attr.qNum !== undefined && !isNaN(attr.qNum)) {
                                            colorValue = argbToHex(attr.qNum);
                                        }
                                        if (colorValue) {
                                            masterItemColors[groupName] = colorValue;
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    });

                    setColorState(self, masterItemColors);

                    // Repaint
                    self.paint($element, layout);
                });

                // Show loading spinner while fetching
                $element.html('<div style="display: flex; align-items: center; justify-content: center; height: 100%; min-height: 200px;"><div style="text-align: center;"><div style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 10px;"></div><style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style><span style="color: #666;">Loading...</span></div></div>');
                return qlik.Promise.resolve();
            }

            // If master mode but no qColorMapRef, extract from data rows
            if (colorMode === 'master' && !self._colorsFetched) {
                debugLog(' Master mode without qColorMapRef, extracting from data rows');

                matrix.forEach(function(row) {
                    if (dimensionCount > 1 && row[1]) {
                        var groupName = row[1].qText;
                        if (!groupName || masterItemColors[groupName]) return;

                        // Check qAttrExps
                        if (row[1].qAttrExps && row[1].qAttrExps.qValues) {
                            for (var i = 0; i < row[1].qAttrExps.qValues.length; i++) {
                                var attr = row[1].qAttrExps.qValues[i];
                                if (attr) {
                                    var colorValue = null;
                                    if (attr.qText && attr.qText.charAt(0) === '#') {
                                        colorValue = attr.qText;
                                    } else if (attr.qText) {
                                        colorValue = attr.qText;
                                    } else if (attr.qNum !== undefined && !isNaN(attr.qNum)) {
                                        colorValue = argbToHex(attr.qNum);
                                    }
                                    if (colorValue) {
                                        masterItemColors[groupName] = colorValue;
                                        debugLog(' Found color from qAttrExps for ' + groupName + ':', colorValue);
                                        break;
                                    }
                                }
                            }
                        }

                        // Check qAttrDims
                        if (!masterItemColors[groupName] && row[1].qAttrDims && row[1].qAttrDims.qValues) {
                            for (var j = 0; j < row[1].qAttrDims.qValues.length; j++) {
                                var dimAttr = row[1].qAttrDims.qValues[j];
                                if (dimAttr && dimAttr.qText) {
                                    masterItemColors[groupName] = dimAttr.qText;
                                    debugLog(' Found color from qAttrDims for ' + groupName + ':', dimAttr.qText);
                                    break;
                                }
                            }
                        }
                    }
                });

                debugLog(' Colors from data rows:', masterItemColors);
                setColorState(self, masterItemColors);
            }

            // Use cached colors if available
            if (self._masterItemColors && Object.keys(self._masterItemColors).length > 0) {
                masterItemColors = self._masterItemColors;
                debugLog(' Using cached colors:', masterItemColors);
            }
            
            // Process data and build hierarchy - limit to maxBubbles
            var processedRows = 0;
            var allValues = [];
            
            // First pass - collect all values for proper scaling
            matrix.forEach(function(row) {
                if (measureCount > 0 && row[dimensionCount] && row[dimensionCount].qNum !== undefined && !isNaN(row[dimensionCount].qNum) && row[dimensionCount].qNum > 0) {
                    allValues.push(row[dimensionCount].qNum);
                }
            });
            
            // Create size scale with all values for proper scaling
            var sizeScale = d3.scaleSqrt()
                .domain([d3.min(allValues) || 0, d3.max(allValues) || 1])
                .range([minBubbleSize, maxBubbleSize]);
            
            // Second pass - process data with limit
            matrix.forEach(function(row) {
                if (processedRows >= maxBubbles) return;
                
                if (measureCount > 0 && row[dimensionCount] && row[dimensionCount].qNum !== undefined && !isNaN(row[dimensionCount].qNum) && row[dimensionCount].qNum > 0) {
                    var itemName = row[0].qText || "Unknown";
                    var groupName = dimensionCount > 1 ? (row[1].qText || "Other") : "Default";
                    var value = row[dimensionCount].qNum;
                    var formattedValue = row[dimensionCount].qText || value.toString();
                    var elem = row[0].qElemNumber;
                    
                    // Extract color from row data
                    var itemColor = null;
                    
                    // Check for color in attribute expressions
                    if (dimensionCount > 1 && row[1]) {
                        if (row[1].qAttrExps && row[1].qAttrExps.qValues && row[1].qAttrExps.qValues.length > 0) {
                            for (var attrIndex = 0; attrIndex < row[1].qAttrExps.qValues.length; attrIndex++) {
                                var colorAttr = row[1].qAttrExps.qValues[attrIndex];
                                if (colorAttr && colorAttr.qText) {
                                    itemColor = colorAttr.qText;
                                    masterItemColors[groupName] = itemColor;
                                    break;
                                }
                            }
                        }
                    }
                    
                    // Find or create group
                    if (!groupMap[groupName]) {
                        groupMap[groupName] = {
                            name: groupName,
                            children: [],
                            color: itemColor || null,
                            totalValue: 0, // Track total value for group
                            formattedValues: [] // Track formatted values for proper display
                        };
                        hierarchyData.children.push(groupMap[groupName]);
                    }
                    
                    // Update group color if found
                    if (itemColor && !groupMap[groupName].color) {
                        groupMap[groupName].color = itemColor;
                    }
                    
                    // Add to group total and collect formatted values
                    groupMap[groupName].totalValue += value;
                    groupMap[groupName].formattedValues.push(formattedValue);
                    
                    // Get selection state: S=Selected, O=Optional, X=Excluded, A=Alternative, L=Locked
                    var selectionState = row[0].qState || 'O';
                    var isSelected = selectionState === 'S' || selectionState === 'L';
                    var isExcluded = selectionState === 'X';

                    debugLog(' Item:', itemName, 'State:', selectionState, 'Selected:', isSelected);

                    // Add item to group
                    groupMap[groupName].children.push({
                        name: itemName,
                        value: value,
                        formattedValue: formattedValue,
                        elem: elem,
                        group: groupName,
                        color: itemColor,
                        scaledSize: sizeScale(value), // Pre-calculate scaled size
                        qState: selectionState,
                        isSelected: isSelected,
                        isExcluded: isExcluded
                    });
                    
                    processedRows++;
                }
            });
            
            debugLog(' Processed', processedRows, 'bubbles (max:', maxBubbles, ', total rows in data:', matrix.length, ')');

            // After processing all data, format group totals
            Object.keys(groupMap).forEach(function(groupName) {
                var group = groupMap[groupName];
                // Try to use the measure's format by formatting the total
                if (measureCount > 0 && layout.qHyperCube.qMeasureInfo[0]) {
                    var measureFormat = layout.qHyperCube.qMeasureInfo[0].qNumFormat || {};
                    // Simple formatting based on the first item's format pattern
                    if (group.formattedValues.length > 0) {
                        // Extract format pattern from formatted values
                        var firstFormatted = group.formattedValues[0];
                        var hasCommas = firstFormatted.includes(',');
                        var decimals = (firstFormatted.split('.')[1] || '').length;
                        
                        if (group.totalValue >= 1e12) {
                            group.formattedTotalValue = (group.totalValue / 1e12).toFixed(decimals || 1) + 'T';
                        } else if (group.totalValue >= 1e9) {
                            group.formattedTotalValue = (group.totalValue / 1e9).toFixed(decimals || 1) + 'B';
                        } else if (group.totalValue >= 1e6) {
                            group.formattedTotalValue = (group.totalValue / 1e6).toFixed(decimals || 1) + 'M';
                        } else if (group.totalValue >= 1e3) {
                            group.formattedTotalValue = (group.totalValue / 1e3).toFixed(decimals || 1) + 'K';
                        } else {
                            group.formattedTotalValue = hasCommas ? 
                                d3.format(",")(group.totalValue.toFixed(decimals)) : 
                                group.totalValue.toFixed(decimals);
                        }
                    }
                }
            });
            
            if (hierarchyData.children.length === 0) {
                $element.html('<div style="text-align: center; padding: 20px;">No valid data to display</div>');
                return qlik.Promise.resolve();
            }
            
            // Set up color scale based on color mode
            var colorScale;
            var groups = Object.keys(groupMap);

            debugLog(' Setting up color scale');
            debugLog(' Color mode:', colorMode);
            debugLog(' Master item colors available:', masterItemColors);
            debugLog(' Groups:', groups);

            if (colorMode === 'master') {
                debugLog(' Using master color scale');
                colorScale = function(group) {
                    if (masterItemColors[group]) {
                        debugLog(' Found master color for ' + group + ':', masterItemColors[group]);
                        return masterItemColors[group];
                    }
                    var groupObj = groupMap[group];
                    if (groupObj && groupObj.color) {
                        debugLog(' Found group color for ' + group + ':', groupObj.color);
                        return groupObj.color;
                    }
                    var index = groups.indexOf(group);
                    debugLog(' Using fallback color for ' + group + ':', CONSTANTS.COLORS.FALLBACK[index % CONSTANTS.COLORS.FALLBACK.length]);
                    return CONSTANTS.COLORS.FALLBACK[index % CONSTANTS.COLORS.FALLBACK.length];
                };
            } else if (colorMode === 'single') {
                colorScale = function() { return singleColor; };
            } else if (colorMode === 'custom') {
                colorScale = function(group) {
                    return customColors[group] || '#cccccc';
                };
            } else {
                // Auto mode with selected palette
                var selectedColors = CONSTANTS.PALETTES[colorPalette] || CONSTANTS.PALETTES.Q10;
                colorScale = function(group) {
                    var index = groups.indexOf(group);
                    return selectedColors[index % selectedColors.length];
                };
            }
            
            // Calculate margins and diameter
            var margin = {
                top: 20,
                right: showLegend && legendPosition === 'right' ? 150 : 20,
                bottom: showLegend && legendPosition === 'bottom' ? 100 : 20,
                left: showLegend && legendPosition === 'left' ? 150 : 20
            };
            
            if (showLegend && legendPosition === 'top') {
                margin.top = 100;
            }
            
            var chartWidth = width - margin.left - margin.right;
            var chartHeight = height - margin.top - margin.bottom;
            var diameter = Math.min(chartWidth, chartHeight);
            
            // Create SVG
            var svg = d3.select($element[0])
                .append('svg')
                .attr('width', width)
                .attr('height', height)
                .style('background-color', backgroundColor);
            
            // Create defs for filters
            var defs = svg.append('defs');

            // Add shadow filter if enabled
            if (enableShadow) {
                var filter = defs.append('filter')
                    .attr('id', 'bubble-shadow')
                    .attr('x', '-50%')
                    .attr('y', '-50%')
                    .attr('width', '200%')
                    .attr('height', '200%');
                
                filter.append('feGaussianBlur')
                    .attr('in', 'SourceAlpha')
                    .attr('stdDeviation', shadowBlur);
                
                filter.append('feOffset')
                    .attr('dx', shadowOffsetX)
                    .attr('dy', shadowOffsetY)
                    .attr('result', 'offsetblur');
                
                var feMerge = filter.append('feMerge');
                feMerge.append('feMergeNode')
                    .attr('in', 'offsetblur');
                feMerge.append('feMergeNode')
                    .attr('in', 'SourceGraphic');
            }
            
            // Create main group with proper centering
            var g = svg.append('g')
                .attr('transform', 'translate(' + (margin.left + chartWidth / 2) + ',' + (margin.top + chartHeight / 2) + ')');
            
            // Create pack layout
            var pack = d3.pack()
                .size([diameter, diameter])
                .padding(packingDensity);
            
            // Create hierarchy with custom sizing
            var root = d3.hierarchy(hierarchyData)
                .sum(d => d.scaledSize ? d.scaledSize : 0) // Use pre-calculated scaled size
                .sort((a, b) => b.value - a.value);
            
            // Apply pack layout
            var nodes = pack(root).descendants();
            
            // Create tooltip
            var tooltip = d3.select('body').append('div')
                .attr('class', 'bubble-tooltip')
                .style('position', 'absolute')
                .style('padding', '10px')
                .style('background', 'rgba(0,0,0,0.9)')
                .style('color', 'white')
                .style('border-radius', '5px')
                .style('pointer-events', 'none')
                .style('opacity', 0)
                .style('font-size', '14px')
                .style('z-index', CONSTANTS.TOOLTIP.Z_INDEX);
            
            // Format value function (uses helper from top level)
            var formatValue = formatLargeNumber;
            
            // Center nodes around 0,0
            nodes.forEach(function(d) {
                d.x = d.x - diameter / 2;
                d.y = d.y - diameter / 2;
            });
            
            // Draw nodes
            var node = g.selectAll('.node')
                .data(nodes)
                .enter().append('g')
                .attr('class', function(d) {
                    return 'node' + 
                        (!d.parent ? ' node--root' : 
                        d.children ? ' node--parent' : ' node--leaf');
                })
                .attr('transform', d => 'translate(' + d.x + ',' + d.y + ')');
            
            // Check if there's an active selection (mix of states)
            var hasActiveSelection = false;
            var selectedCount = 0;
            nodes.forEach(function(n) {
                if (n.data && n.data.qState && n.data.qState !== 'O') {
                    hasActiveSelection = true;
                    if (n.data.isSelected) selectedCount++;
                }
            });

            // If Qlik has confirmed selections, clear local selections (they're now in Qlik's state)
            if (hasActiveSelection) {
                self._localSelections.clear();
            }

            // Check for local pending selections
            var hasLocalSelections = self._localSelections && self._localSelections.size > 0;

            debugLog('Selection state: hasActiveSelection =', hasActiveSelection, ', selectedCount =', selectedCount, ', localSelections =', self._localSelections.size);

            // Add circles
            var circles = node.append('circle')
                .attr('r', d => d.r)
                .attr('fill', function(d) {
                    if (!d.parent) return 'none';
                    if (d.children) {
                        return showGroupBubbles ? colorScale(d.data.name) : 'none';
                    } else {
                        // Use individual color if available, otherwise use group color
                        return d.data.color || colorScale(d.data.group);
                    }
                })
                .attr('fill-opacity', function(d) {
                    if (!d.parent) return 0;
                    if (d.children) return showGroupBubbles ? groupBubbleOpacity : 0;
                    // Check local selections first (for pending clicks)
                    if (hasLocalSelections && d.data) {
                        return self._localSelections.has(d.data.name) ? 1 : 0.2;
                    }
                    // Then check Qlik's confirmed selection state
                    if (hasActiveSelection && d.data) {
                        if (d.data.isSelected) return 1;
                        return 0.2;
                    }
                    return bubbleOpacity;
                })
                .attr('stroke', function(d) {
                    if (!d.parent) return 'none';
                    if (d.children) return showGroupBubbles ? colorScale(d.data.name) : 'none';
                    return borderColor;
                })
                .attr('stroke-width', function(d) {
                    if (!d.parent) return 0;
                    if (d.children) return showGroupBubbles ? 2 : 0;
                    return strokeWidth;
                })
                .attr('stroke-opacity', function(d) {
                    if (!d.parent) return 0;
                    if (d.children) return showGroupBubbles ? groupBorderOpacity : 0;
                    // Check local selections first
                    if (hasLocalSelections && d.data) {
                        return self._localSelections.has(d.data.name) ? borderOpacity : 0.2;
                    }
                    // Then check Qlik's confirmed selection state
                    if (hasActiveSelection && d.data && !d.data.isSelected) return 0.2;
                    return borderOpacity;
                })
                .style('cursor', function(d) {
                    return d.children ? 'default' : 'pointer';
                })
                .style('pointer-events', function(d) {
                    return d.children ? 'none' : 'all';
                })
                .style('filter', function(d) {
                    // Apply shadow if enabled
                    if (enableShadow && !d.children) {
                        return 'url(#bubble-shadow)';
                    }
                    return 'none';
                })
                .on('click', function(event, d) {
                    if (d.children) return; // Ignore group bubbles
                    event.stopPropagation();

                    // Toggle this item in local selection tracker
                    var itemKey = d.data.name;
                    if (self._localSelections.has(itemKey)) {
                        self._localSelections.delete(itemKey);
                    } else {
                        self._localSelections.add(itemKey);
                    }

                    var hasLocalSelections = self._localSelections.size > 0;

                    // Immediate visual feedback - highlight all selected items
                    circles.filter(dd => !dd.children)
                        .attr('fill-opacity', function(dd) {
                            if (!hasLocalSelections) return bubbleOpacity;
                            return self._localSelections.has(dd.data.name) ? 1 : 0.2;
                        })
                        .attr('stroke-opacity', function(dd) {
                            if (!hasLocalSelections) return borderOpacity;
                            return self._localSelections.has(dd.data.name) ? borderOpacity : 0.2;
                        });

                    // Dim all text labels except selected ones
                    node.selectAll('text')
                        .style('opacity', function() {
                            if (!hasLocalSelections) return 1;
                            var parentData = d3.select(this.parentNode).datum();
                            if (!parentData || !parentData.data) return 0.2;
                            return self._localSelections.has(parentData.data.name) ? 1 : 0.2;
                        });

                    // Make the selection in Qlik
                    if (d.data.elem !== undefined) {
                        self.selectValues(0, [d.data.elem], true); // true = toggle mode to accumulate
                    }
                })
                .on('mouseover', function(event, d) {
                    if (d.children) return;

                    // Check selection mode at event time (not at handler creation time)
                    var inSelectionMode = self._localSelections && self._localSelections.size > 0;

                    // Visual hover effect (if enabled AND not in selection mode)
                    if (enableHoverEffect && !inSelectionMode) {
                        d3.select(this)
                            .transition()
                            .duration(150)
                            .attr('transform', 'scale(1.08)')
                            .attr('stroke-width', strokeWidth + 2)
                            .attr('fill-opacity', hoverOpacity);
                    }

                    if (showTooltip) {
                        tooltip
                            .style('opacity', .9)
                            .style('left', (event.pageX + 10) + 'px')
                            .style('top', (event.pageY - 28) + 'px')
                            .html(
                                '<strong>' + d.data.name + '</strong><br/>' +
                                'Group: ' + d.data.group + '<br/>' +
                                'Value: ' + d.data.formattedValue
                            );
                    }
                })
                .on('mouseout', function(event, d) {
                    if (d.children) return;

                    // Check selection mode at event time (not at handler creation time)
                    var inSelectionMode = self._localSelections && self._localSelections.size > 0;

                    // Reset hover effect (if enabled AND not in selection mode)
                    if (enableHoverEffect && !inSelectionMode) {
                        d3.select(this)
                            .transition()
                            .duration(150)
                            .attr('transform', 'scale(1)')
                            .attr('stroke-width', strokeWidth)
                            .attr('fill-opacity', bubbleOpacity);
                    }

                    if (showTooltip) {
                        tooltip.style('opacity', 0);
                    }
                });
            
            // Add labels with responsive font sizing
            if (showLabels) {
                node.filter(d => !d.children && d.r > minSizeForLabel)
                    .append('text')
                    .attr('dy', showValues ? '-0.3em' : '0.3em')
                    .style('text-anchor', 'middle')
                    .style('fill', labelColor)
                    .style('font-size', function(d) {
                        // Dynamic font size based on bubble radius
                        var fontSize = Math.min(labelSize, d.r * CONSTANTS.FONT_SCALE.LABEL);
                        return fontSize + 'px';
                    })
                    .style('font-weight', 'bold')
                    .style('font-family', 'sans-serif')
                    .style('pointer-events', 'none')
                    .style('opacity', function(d) {
                        // Check local selections first
                        if (hasLocalSelections && d.data) {
                            return self._localSelections.has(d.data.name) ? 1 : 0.2;
                        }
                        // Then check Qlik's confirmed selection state
                        if (hasActiveSelection && d.data && !d.data.isSelected) return 0.2;
                        return 1;
                    })
                    .text(function(d) {
                        // Dynamic text truncation based on bubble size
                        var maxChars = Math.floor(d.r / CONSTANTS.FONT_SCALE.TRUNCATION);
                        if (d.data.name.length > maxChars && maxChars > 3) {
                            return d.data.name.substring(0, maxChars - 2) + '..';
                        }
                        return d.data.name;
                    });

                // Add values with responsive sizing
                if (showValues) {
                    node.filter(d => !d.children && d.r > minSizeForValue)
                        .append('text')
                        .attr('dy', '1.2em')
                        .style('text-anchor', 'middle')
                        .style('fill', valueColor)
                        .style('font-size', function(d) {
                            // Dynamic font size for values
                            var fontSize = Math.min(labelSize * CONSTANTS.FONT_SCALE.VALUE_SIZE, d.r * CONSTANTS.FONT_SCALE.VALUE);
                            return fontSize + 'px';
                        })
                        .style('font-weight', valueFontWeight)
                        .style('font-style', valueFontStyle)
                        .style('font-family', valueFontFamily)
                        .style('pointer-events', 'none')
                        .style('opacity', function(d) {
                            // Check local selections first
                            if (hasLocalSelections && d.data) {
                                return self._localSelections.has(d.data.name) ? 1 : 0.2;
                            }
                            // Then check Qlik's confirmed selection state
                            if (hasActiveSelection && d.data && !d.data.isSelected) return 0.2;
                            return 1;
                        })
                        .text(d => d.data.formattedValue); // Use Qlik's formatted value directly
                }
                
                // Add group labels OUTSIDE parent nodes
                if (showGroupBubbles && showGroupLabels) {
                    var groupLabels = node.filter(d => d.children && d.r > minGroupSizeForLabel && d.parent); // Exclude root
                    
                    // Create a container for labels positioned below the circle
                    var labelContainers = groupLabels.append('g')
                        .attr('class', 'group-label-container');
                    
                    // Add images if enabled (now at the top since labels are at bottom)
                    if (showGroupImages) {
                        labelContainers.each(function(d) {
                            var imageUrl = groupImageMapping[d.data.name];
                            if (imageUrl) {
                                var container = d3.select(this);
                                var yOffset = -d.r - groupImageSize - 5; // Above the circle
                                
                                // Add a white background circle for the flag
                                container.append('circle')
                                    .attr('cx', 0)
                                    .attr('cy', yOffset + groupImageSize/2)
                                    .attr('r', groupImageSize/2 + 2)
                                    .attr('fill', 'white')
                                    .attr('stroke', colorScale(d.data.name))
                                    .attr('stroke-width', 1)
                                    .style('opacity', groupLabelOpacity);
                                
                                // Add the image
                                container.append('image')
                                    .attr('xlink:href', imageUrl)
                                    .attr('x', -groupImageSize/2)
                                    .attr('y', yOffset)
                                    .attr('width', groupImageSize)
                                    .attr('height', groupImageSize)
                                    .style('opacity', groupLabelOpacity)
                                    .on('error', function() {
                                        // Remove image and background if it fails to load
                                        d3.select(this).remove();
                                        container.select('circle').remove();
                                    });
                            }
                        });
                    }
                    
                    // Add group name at the bottom of the circle
                    labelContainers.append('text')
                        .attr('y', function(d) {
                            // Position closer to the bottom of the circle
                            return d.r + 10; // Much closer - just 10 pixels below the circle edge
                        })
                        .style('text-anchor', 'middle')
                        .style('fill', d => colorScale(d.data.name))
                        .style('font-size', function(d) {
                            // Keep font size reasonable but scale slightly with circle size
                            var fontSize = Math.min(groupLabelSize, Math.max(CONSTANTS.DEFAULTS.LABEL_SIZE, d.r * CONSTANTS.FONT_SCALE.GROUP));
                            return fontSize + 'px';
                        })
                        .style('font-weight', groupLabelFontWeight)
                        .style('font-style', groupLabelFontStyle)
                        .style('font-family', groupLabelFontFamily)
                        .style('pointer-events', 'none')
                        .style('opacity', groupLabelOpacity) // Use configured opacity
                        .text(function(d) {
                            return d.data.name;
                        });
                    
                    // Removed the group total value section completely
                }
            }
            
            // Add legend if enabled
            if (showLegend && groups.length > 0) {
                var legendX, legendY;
                
                switch (legendPosition) {
                    case 'top':
                        legendX = width / 2 - 50;
                        legendY = 20;
                        break;
                    case 'bottom':
                        legendX = width / 2 - 50;
                        legendY = height - margin.bottom + 20;
                        break;
                    case 'left':
                        legendX = 20;
                        legendY = height / 2 - (groups.length * 10);
                        break;
                    case 'right':
                    default:
                        legendX = width - margin.right + 20;
                        legendY = height / 2 - (groups.length * 10);
                        break;
                }
                
                var legend = svg.append('g')
                    .attr('class', 'legend')
                    .attr('transform', 'translate(' + legendX + ',' + legendY + ')');
                
                var legendItems = legend.selectAll('.legend-item')
                    .data(groups)
                    .enter().append('g')
                    .attr('class', 'legend-item')
                    .attr('transform', (d, i) => {
                        if (legendPosition === 'top' || legendPosition === 'bottom') {
                            return 'translate(' + (i % 5) * 100 + ',' + Math.floor(i / 5) * 20 + ')';
                        } else {
                            return 'translate(0,' + i * 20 + ')';
                        }
                    });
                
                legendItems.append('circle')
                    .attr('r', 6)
                    .attr('fill', d => colorScale(d))
                    .attr('fill-opacity', bubbleOpacity);
                
                legendItems.append('text')
                    .attr('x', 15)
                    .attr('y', 4)
                    .style('font-size', '12px')
                    .style('fill', legendTextColor)
                    .style('font-family', 'sans-serif')
                    .text(d => d);
            }
            
            // Zoom is disabled - was causing usability issues
            // Users can still click bubbles to select them
            
            // Handle resize
            var resizeTimer;
            $(window).on('resize.bubble' + layout.qInfo.qId, function() {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(function() {
                    self.paint($element, layout);
                }, CONSTANTS.TIMING.RESIZE_DEBOUNCE);
            });
            
            // Cleanup
            $element.on('$destroy', function() {
                tooltip.remove();
                $(window).off('resize.bubble' + layout.qInfo.qId);
            });
            
            return qlik.Promise.resolve();
        }
    };
});