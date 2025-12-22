// qlik-bubble-chart-fixed.js
define([
    'qlik',
    'jquery',
    './d3.v7',
    './qlik-bubble-properties',
    'css!./qlik-bubble-style.css'
], function (qlik, $, d3, properties) {
    'use strict';

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

            // Debug mode setting
            var debugMode = settings.enableDebug === true;

            // Debug logging function - only logs when debug mode is enabled
            function debugLog() {
                if (debugMode) {
                    console.log.apply(console, ['[BubbleChart]'].concat(Array.prototype.slice.call(arguments)));
                }
            }

            // Helper function to get color from color picker object
            function getColor(colorObj, defaultColor) {
                if (colorObj && colorObj.color) {
                    return colorObj.color;
                }
                return defaultColor;
            }
            
            // Get all settings
            var backgroundColor = getColor(settings.backgroundColor, '#FFFFFF');
            var borderColor = getColor(settings.borderColor, '#CCCCCC');
            var labelColor = getColor(settings.labelColor, '#333333');
            var valueColor = getColor(settings.valueColor, '#666666');
            var legendTextColor = getColor(settings.legendTextColor, '#333333');
            var singleColor = getColor(settings.singleColor, '#1f77b4');
            
            var maxBubbles = settings.maxBubbles || 50;
            debugLog('maxBubbles setting:', maxBubbles, '(from settings:', settings.maxBubbles, ')');
            var packingDensity = settings.packingDensity !== undefined ? settings.packingDensity : 3;
            var minBubbleSize = settings.minBubbleSize || 20;
            var maxBubbleSize = settings.maxBubbleSize || 120;
            
            var bubbleOpacity = settings.bubbleOpacity !== undefined ? settings.bubbleOpacity : 0.7;
            var strokeWidth = settings.strokeWidth !== undefined ? settings.strokeWidth : 2;
            var borderOpacity = settings.borderOpacity !== undefined ? settings.borderOpacity : 1;
            
            var enableHoverEffect = settings.enableHoverEffect !== false;
            var hoverOpacity = settings.hoverOpacity !== undefined ? settings.hoverOpacity : 1;
            var enableShadow = settings.enableShadow || false;
            var shadowBlur = settings.shadowBlur || 10;
            var shadowOffsetX = settings.shadowOffsetX || 3;
            var shadowOffsetY = settings.shadowOffsetY || 3;
            
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
            var labelSize = settings.labelSize || 12;
            var labelFontFamily = settings.labelFontFamily || 'sans-serif';
            var labelFontWeight = settings.labelFontWeight || 'bold';
            var labelFontStyle = settings.labelFontStyle || 'normal';
            var minSizeForLabel = settings.minSizeForLabel || 20;
            
            var showValues = settings.showValues !== false;
            var valueFontFamily = settings.valueFontFamily || 'sans-serif';
            var valueFontWeight = settings.valueFontWeight || 'normal';
            var valueFontStyle = settings.valueFontStyle || 'normal';
            var minSizeForValue = settings.minSizeForValue || 30;
            
            var showGroupLabels = settings.showGroupLabels !== false;
            var groupLabelFontFamily = settings.groupLabelFontFamily || 'sans-serif';
            var groupLabelFontWeight = settings.groupLabelFontWeight || 'normal';
            var groupLabelFontStyle = settings.groupLabelFontStyle || 'normal';
            
            var showLegend = settings.showLegend || false;
            var legendPosition = settings.legendPosition || 'right';
            
            var showTooltip = settings.showTooltip !== false;
            var enableZoom = settings.enableZoom !== false;
            var showGroupBubbles = settings.showGroupBubbles !== false;
            var groupBubbleOpacity = settings.groupBubbleOpacity !== undefined ? settings.groupBubbleOpacity : 0.1;
            var groupBorderOpacity = settings.groupBorderOpacity !== undefined ? settings.groupBorderOpacity : 0.3;
            var showGroupValues = settings.showGroupValues !== false;
            var groupLabelSize = settings.groupLabelSize || 16;
            var groupLabelOpacity = settings.groupLabelOpacity !== undefined ? settings.groupLabelOpacity : 1;
            var groupLabelOutline = settings.groupLabelOutline !== false;
            var minGroupSizeForLabel = settings.minGroupSizeForLabel || 50;
            var showGroupImages = settings.showGroupImages || false;
            var groupImageSize = settings.groupImageSize || 24;
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
            
            // Helper function to convert ARGB number to hex
            function argbToHex(argb) {
                if (argb < 0) {
                    argb = argb >>> 0;
                }
                var r = (argb >> 16) & 0xFF;
                var g = (argb >> 8) & 0xFF;
                var b = argb & 0xFF;
                return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
            }

            // Helper function to extract color from various formats
            function extractColorValue(colorEntry) {
                if (!colorEntry) return null;
                if (typeof colorEntry === 'string') return colorEntry;
                if (colorEntry.color) return colorEntry.color;
                if (colorEntry.qColor) return extractColorValue(colorEntry.qColor);
                if (typeof colorEntry === 'number') return argbToHex(colorEntry);
                if (colorEntry.qNum !== undefined && !isNaN(colorEntry.qNum)) return argbToHex(colorEntry.qNum);
                return null;
            }

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
                                self._colorsFetched = true;
                                self._fetchingColors = false;
                                self._masterItemColors = masterItemColors;
                                self._colorChangeHash = currentChangeHash; // Store hash to detect future changes
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

                                self._colorsFetched = true;
                                self._fetchingColors = false;
                                self._masterItemColors = masterItemColors;
                                self._colorChangeHash = currentChangeHash; // Store hash to detect future changes
                                debugLog(' Stored new changeHash:', currentChangeHash);
                                return self.paint($element, layout);
                            }).catch(function(colorMapErr) {
                                console.warn('[BubbleChart] ColorMapModel fetch failed:', colorMapErr.message || colorMapErr);
                                // Continue without colors from ColorMapModel
                                extractMasterDimColors(masterDimLayout, dimensionValues);
                                debugLog(' Fallback colors from layout:', masterItemColors);

                                self._colorsFetched = true;
                                self._fetchingColors = false;
                                self._masterItemColors = masterItemColors;
                                self._colorChangeHash = currentChangeHash; // Store hash to detect future changes
                                return self.paint($element, layout);
                            });
                        });
                    } else {
                        // Try to extract directly from dimension layout
                        extractMasterDimColors(masterDimLayout, dimensionValues);

                        debugLog(' Colors from master dimension:', masterItemColors);

                        self._colorsFetched = true;
                        self._fetchingColors = false;
                        self._masterItemColors = masterItemColors;
                        self._colorChangeHash = currentChangeHash; // Store hash to detect future changes

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

                        self._colorsFetched = true;
                        self._fetchingColors = false;
                        self._masterItemColors = masterItemColors;
                        self.paint($element, layout);

                    }).catch(function(err2) {
                        console.error('[BubbleChart] Fallback also failed:', err2);
                        // Continue without master colors
                        self._fetchingColors = false;
                        self._colorsFetched = true;
                        self._masterItemColors = {};
                        self.paint($element, layout);
                    });
                });

                $element.html('<div style="text-align: center; padding: 20px;">Loading colors from master dimension...</div>');
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

                    self._colorsFetched = true;
                    self._fetchingColors = false;
                    self._masterItemColors = masterItemColors;

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

                    self._fetchingColors = false;
                    self._colorsFetched = true;
                    self._masterItemColors = masterItemColors;

                    // Repaint
                    self.paint($element, layout);
                });

                // Show loading message while fetching
                $element.html('<div style="text-align: center; padding: 20px;">Loading colors...</div>');
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
                self._colorsFetched = true;
                self._masterItemColors = masterItemColors;
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
                    
                    // Add item to group
                    groupMap[groupName].children.push({
                        name: itemName,
                        value: value,
                        formattedValue: formattedValue,
                        elem: elem,
                        group: groupName,
                        color: itemColor,
                        scaledSize: sizeScale(value) // Pre-calculate scaled size
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
                    var defaultColors = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"];
                    debugLog(' Using fallback color for ' + group + ':', defaultColors[index % defaultColors.length]);
                    return defaultColors[index % defaultColors.length];
                };
            } else if (colorMode === 'single') {
                colorScale = function() { return singleColor; };
            } else if (colorMode === 'custom') {
                colorScale = function(group) {
                    return customColors[group] || '#cccccc';
                };
            } else {
                // Auto mode with selected palette
                var colorPalettes = {
                    'Q10': ["#767DF2", "#BF2B17", "#F25C06", "#65AA88", "#039289", "#1A778B", "#FA8907", "#F7BB02", "#D5BD4B", "#17becf"],
                    'category10': ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"],
                    'category20': ["#1f77b4", "#aec7e8", "#ff7f0e", "#ffbb78", "#2ca02c", "#98df8a", "#d62728", "#ff9896", "#9467bd", "#c5b0d5", "#8c564b", "#c49c94", "#e377c2", "#f7b6d2", "#7f7f7f", "#c7c7c7", "#bcbd22", "#dbdb8d", "#17becf", "#9edae5"],
                    'set1': ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3", "#ff7f00", "#ffff33", "#a65628", "#f781bf", "#999999"],
                    'set2': ["#66c2a5", "#fc8d62", "#8da0cb", "#e78ac3", "#a6d854", "#ffd92f", "#e5c494", "#b3b3b3"],
                    'set3': ["#8dd3c7", "#ffffb3", "#bebada", "#fb8072", "#80b1d3", "#fdb462", "#b3de69", "#fccde5", "#d9d9d9", "#bc80bd", "#ccebc5", "#ffed6f"],
                    'dark2': ["#1b9e77", "#d95f02", "#7570b3", "#e7298a", "#66a61e", "#e6ab02", "#a6761d", "#666666"],
                    'paired': ["#a6cee3", "#1f78b4", "#b2df8a", "#33a02c", "#fb9a99", "#e31a1c", "#fdbf6f", "#ff7f00", "#cab2d6", "#6a3d9a", "#ffff99", "#b15928"],
                    'pastel1': ["#fbb4ae", "#b3cde3", "#ccebc5", "#decbe4", "#fed9a6", "#ffffcc", "#e5d8bd", "#fddaec", "#f2f2f2"],
                    'pastel2': ["#b3e2cd", "#fdcdac", "#cbd5e8", "#f4cae4", "#e6f5c9", "#fff2ae", "#f1e2cc", "#cccccc"]
                };
                
                var selectedColors = colorPalettes[colorPalette] || colorPalettes['Q10'];
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
            
            // Add shadow filter if enabled
            if (enableShadow) {
                var defs = svg.append('defs');
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
                .style('z-index', 10000);
            
            // Format value function
            function formatValue(val) {
                if (val >= 1e12) return (val / 1e12).toFixed(1) + 'T';
                if (val >= 1e9) return (val / 1e9).toFixed(1) + 'B';
                if (val >= 1e6) return (val / 1e6).toFixed(1) + 'M';
                if (val >= 1e3) return (val / 1e3).toFixed(1) + 'K';
                return d3.format(",")(val);
            }
            
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
                    return borderOpacity;
                })
                .style('cursor', function(d) {
                    return d.children ? 'default' : 'pointer';
                });
            
            // Apply shadow if enabled
            if (enableShadow) {
                circles.style('filter', 'url(#bubble-shadow)');
            }
            
            // Add interactions for leaf nodes (items)
            node.filter(d => !d.children)
                .on('click', function(event, d) {
                    event.stopPropagation();
                    if (d.data.elem !== undefined) {
                        self.selectValues(0, [d.data.elem], true);
                    }
                })
                .on('mouseover', function(event, d) {
                    if (showTooltip) {
                        tooltip.transition()
                            .duration(200)
                            .style('opacity', .9);
                        
                        tooltip.html(
                            '<strong>' + d.data.name + '</strong><br/>' +
                            'Group: ' + d.data.group + '<br/>' +
                            'Value: ' + d.data.formattedValue // Use formatted value
                        )
                        .style('left', (event.pageX + 10) + 'px')
                        .style('top', (event.pageY - 28) + 'px');
                    }
                    
                    if (enableHoverEffect) {
                        d3.select(this).select('circle')
                            .transition()
                            .duration(200)
                            .attr('fill-opacity', hoverOpacity)
                            .attr('stroke-width', strokeWidth + 2);
                    }
                })
                .on('mouseout', function(event, d) {
                    if (showTooltip) {
                        tooltip.transition()
                            .duration(500)
                            .style('opacity', 0);
                    }
                    
                    if (enableHoverEffect) {
                        d3.select(this).select('circle')
                            .transition()
                            .duration(200)
                            .attr('fill-opacity', bubbleOpacity)
                            .attr('stroke-width', strokeWidth);
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
                        var fontSize = Math.min(labelSize, d.r * 0.4);
                        return fontSize + 'px';
                    })
                    .style('font-weight', 'bold')
                    .style('font-family', 'sans-serif')
                    .style('pointer-events', 'none')
                    .text(function(d) {
                        // Dynamic text truncation based on bubble size
                        var maxChars = Math.floor(d.r / 4);
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
                            var fontSize = Math.min(labelSize * 0.8, d.r * 0.3);
                            return fontSize + 'px';
                        })
                        .style('font-weight', valueFontWeight)
                        .style('font-style', valueFontStyle)
                        .style('font-family', valueFontFamily)
                        .style('pointer-events', 'none')
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
                            var fontSize = Math.min(groupLabelSize, Math.max(12, d.r * 0.1));
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
            
            // Add zoom behavior if enabled (fixed to work with new centering)
            if (enableZoom) {
                var view;
                
                function zoomTo(v) {
                    var k = diameter / v[2];
                    
                    view = v;
                    
                    node.transition()
                        .duration(750)
                        .attr('transform', function(d) {
                            return 'translate(' + ((d.x - v[0]) * k) + ',' + ((d.y - v[1]) * k) + ')';
                        });
                    
                    circles.transition()
                        .duration(750)
                        .attr('r', function(d) {
                            return d.r * k;
                        });
                    
                    // Update text sizes on zoom
                    node.selectAll('text')
                        .transition()
                        .duration(750)
                        .style('font-size', function(d) {
                            var baseSize = parseFloat(d3.select(this).style('font-size'));
                            return (baseSize * k) + 'px';
                        })
                        .attr('y', function() {
                            // Scale Y position for group labels
                            var currentY = parseFloat(d3.select(this).attr('y')) || 0;
                            return currentY * k;
                        });
                }
                
                function zoom(event, d) {
                    var focus = [d.x, d.y, d.r * 2];
                    
                    d3.transition()
                        .duration(750)
                        .tween('zoom', function() {
                            var i = d3.interpolateZoom(view, focus);
                            return function(t) { zoomTo(i(t)); };
                        });
                    
                    event.stopPropagation();
                }
                
                function reset(event) {
                    zoom(event, root);
                }
                
                node.on('click', function(event, d) {
                    if (!d.children && d.data.elem !== undefined) {
                        self.selectValues(0, [d.data.elem], true);
                    } else if (d.parent && d !== root) {
                        zoom(event, d);
                    }
                });
                
                svg.style('cursor', 'pointer')
                    .on('click', reset);
                
                zoomTo([root.x, root.y, root.r * 2]);
            }
            
            // Handle resize
            var resizeTimer;
            $(window).on('resize.bubble' + layout.qInfo.qId, function() {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(function() {
                    self.paint($element, layout);
                }, 300);
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