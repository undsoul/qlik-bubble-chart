// qlik-bubble-properties.js - Updated with Font Options and Header/Footer
define([], function() {
    'use strict';
    
    return {
        type: "items",
        component: "accordion",
        items: {
            dimensions: {
                uses: "dimensions",
                min: 2,
                max: 2,
                items: {
                    dimensionInfo: {
                        component: "text",
                        label: "Configuration Guide",
                        style: "hint",
                        content: "Dimension 1: Company/Item Name | Dimension 2: Group/Category (use master item with colors)"
                    }
                }
            },
            measures: {
                uses: "measures",
                min: 1,
                max: 1,
                items: {
                    measureInfo: {
                        component: "text",
                        label: "Measure Guide",
                        style: "hint",
                        content: "Measure: Value for bubble size (e.g., Market Cap, Revenue, Sales)"
                    }
                }
            },
            sorting: {
                uses: "sorting"
            },
            appearance: {
                uses: "settings"
            },
            // alternateStates: {
            //     label: "Alternate states",
            //     type: "items",
            //     items: {
            //         state: {
            //             ref: "qStateName",
            //             type: "string",
            //             component: "dropdown",
            //             label: "State",
            //             options: function() {
            //                 return [{
            //                     value: "",
            //                     label: "Inherited"
            //                 }, {
            //                     value: "$",
            //                     label: "Default state"
            //                 }].concat(
            //                     qlik.currApp().layout.qStateNames.map(function(state) {
            //                         return {
            //                             value: state,
            //                             label: state
            //                         };
            //                     })
            //                 );
            //             },
            //             defaultValue: ""
            //         }
            //     }
            // },
            chartSettings: {
                type: "items",
                label: "Chart Settings",
                items: {
                    hierarchySection: {
                        type: "items",
                        label: "Hierarchy Settings",
                        items: {
                            showGroupBubbles: {
                                type: "boolean",
                                label: "Show Group Circles",
                                ref: "settings.showGroupBubbles",
                                defaultValue: true
                            },
                            groupBubbleOpacity: {
                                type: "number",
                                component: "slider",
                                label: "Group Circle Fill Opacity",
                                ref: "settings.groupBubbleOpacity",
                                min: 0,
                                max: 1,
                                step: 0.05,
                                defaultValue: 0.1,
                                show: function(data) {
                                    return data.settings && data.settings.showGroupBubbles;
                                }
                            },
                            groupBorderOpacity: {
                                type: "number",
                                component: "slider",
                                label: "Group Circle Border Opacity",
                                ref: "settings.groupBorderOpacity",
                                min: 0,
                                max: 1,
                                step: 0.05,
                                defaultValue: 0.3,
                                show: function(data) {
                                    return data.settings && data.settings.showGroupBubbles;
                                }
                            },
                            enableZoom: {
                                type: "boolean",
                                label: "Enable Zoom on Click",
                                ref: "settings.enableZoom",
                                defaultValue: true
                            }
                        }
                    },
                    performanceSection: {
                        type: "items",
                        label: "Performance & Layout",
                        items: {
                            maxBubbles: {
                                type: "integer",
                                label: "Maximum Number of Bubbles",
                                ref: "settings.maxBubbles",
                                defaultValue: 50,
                                min: 10,
                                max: 500,
                                expression: "optional"
                            },
                            packingDensity: {
                                type: "number",
                                component: "slider",
                                label: "Bubble Spacing (pixels)",
                                ref: "settings.packingDensity",
                                min: 0,
                                max: 20,
                                step: 1,
                                defaultValue: 3
                            }
                        }
                    },
                    sizeSection: {
                        type: "items",
                        label: "Bubble Sizing",
                        items: {
                            minBubbleSize: {
                                type: "integer",
                                label: "Minimum Bubble Size (pixels)",
                                ref: "settings.minBubbleSize",
                                defaultValue: 20,
                                expression: "optional"
                            },
                            maxBubbleSize: {
                                type: "integer",
                                label: "Maximum Bubble Size (pixels)",
                                ref: "settings.maxBubbleSize",
                                defaultValue: 120,
                                expression: "optional"
                            }
                        }
                    }
                }
            },
            bubbleAppearance: {
                type: "items",
                label: "Bubble Appearance",
                items: {
                    styleSection: {
                        type: "items",
                        label: "Bubble Style",
                        items: {
                            bubbleOpacity: {
                                type: "number",
                                component: "slider",
                                label: "Bubble Fill Opacity",
                                ref: "settings.bubbleOpacity",
                                min: 0.1,
                                max: 1,
                                step: 0.05,
                                defaultValue: 0.7
                            },
                            strokeWidth: {
                                type: "number",
                                component: "slider",
                                label: "Border Width",
                                ref: "settings.strokeWidth",
                                defaultValue: 2,
                                min: 0,
                                max: 10,
                                step: 0.5
                            },
                            borderColor: {
                                label: "Border Color",
                                component: "color-picker",
                                ref: "settings.borderColor",
                                type: "object",
                                defaultValue: {
                                    index: -1,
                                    color: "#CCCCCC"
                                }
                            },
                            borderOpacity: {
                                type: "number",
                                component: "slider",
                                label: "Border Opacity",
                                ref: "settings.borderOpacity",
                                min: 0,
                                max: 1,
                                step: 0.1,
                                defaultValue: 1
                            },
                            enableHoverEffect: {
                                type: "boolean",
                                label: "Enable Hover Effects",
                                ref: "settings.enableHoverEffect",
                                defaultValue: true
                            },
                            hoverOpacity: {
                                type: "number",
                                component: "slider",
                                label: "Hover Opacity",
                                ref: "settings.hoverOpacity",
                                min: 0.1,
                                max: 1,
                                step: 0.05,
                                defaultValue: 1,
                                show: function(data) {
                                    return data.settings && data.settings.enableHoverEffect;
                                }
                            }
                        }
                    },
                    shadowSection: {
                        type: "items",
                        label: "Shadow Effects",
                        items: {
                            enableShadow: {
                                type: "boolean",
                                label: "Enable Bubble Shadow",
                                ref: "settings.enableShadow",
                                defaultValue: false
                            },
                            shadowBlur: {
                                type: "integer",
                                label: "Shadow Blur",
                                ref: "settings.shadowBlur",
                                defaultValue: 10,
                                min: 0,
                                max: 50,
                                show: function(data) {
                                    return data.settings && data.settings.enableShadow;
                                }
                            },
                            shadowOffsetX: {
                                type: "integer",
                                label: "Shadow Offset X",
                                ref: "settings.shadowOffsetX",
                                defaultValue: 3,
                                min: -20,
                                max: 20,
                                show: function(data) {
                                    return data.settings && data.settings.enableShadow;
                                }
                            },
                            shadowOffsetY: {
                                type: "integer",
                                label: "Shadow Offset Y",
                                ref: "settings.shadowOffsetY",
                                defaultValue: 3,
                                min: -20,
                                max: 20,
                                show: function(data) {
                                    return data.settings && data.settings.enableShadow;
                                }
                            }
                        }
                    }
                }
            },
            colors: {
                type: "items",
                label: "Colors",
                items: {
                    backgroundSection: {
                        type: "items",
                        label: "Background",
                        items: {
                            backgroundColor: {
                                label: "Background Color",
                                component: "color-picker",
                                ref: "settings.backgroundColor",
                                type: "object",
                                defaultValue: {
                                    index: -1,
                                    color: "#FFFFFF"
                                }
                            }
                        }
                    },
                    colorSchemeSection: {
                        type: "items",
                        label: "Color Scheme",
                        items: {
                            colorMode: {
                                type: "string",
                                component: "dropdown",
                                label: "Color Mode",
                                ref: "settings.colorMode",
                                options: [
                                    { value: "auto", label: "Automatic (D3 Scheme)" },
                                    { value: "master", label: "Master Item Colors (if available)" },
                                    { value: "single", label: "Single Color" },
                                    { value: "custom", label: "Custom Group Colors" }
                                ],
                                defaultValue: "auto"
                            },
                            masterColorInfo: {
                                component: "text",
                                label: "Master Item Colors",
                                style: "hint",
                                content: "To use master colors: Add a background color expression to your dimension OR use a master dimension with assigned value colors.",
                                show: function(data) {
                                    return data.settings && data.settings.colorMode === "master";
                                }
                            },
                            singleColor: {
                                label: "Single Color",
                                component: "color-picker",
                                ref: "settings.singleColor",
                                type: "object",
                                defaultValue: {
                                    index: -1,
                                    color: "#1f77b4"
                                },
                                show: function(data) {
                                    return data.settings && data.settings.colorMode === "single";
                                }
                            },
                            colorPalette: {
                                type: "string",
                                component: "dropdown",
                                label: "Color Palette",
                                ref: "settings.colorPalette",
                                options: [
                                    { value: "Q10", label: "Q 10" },
                                    { value: "category10", label: "Category 10" },
                                    { value: "category20", label: "Category 20" },
                                    { value: "set1", label: "Set 1" },
                                    { value: "set2", label: "Set 2" },
                                    { value: "set3", label: "Set 3" },
                                    { value: "dark2", label: "Dark 2" },
                                    { value: "paired", label: "Paired" },
                                    { value: "pastel1", label: "Pastel 1" },
                                    { value: "pastel2", label: "Pastel 2" }
                                ],
                                defaultValue: "Q10",
                                show: function(data) {
                                    return data.settings && data.settings.colorMode === "auto";
                                }
                            },
                            palettePreview: {
                                component: "text",
                                label: "Color Palette Preview",
                                style: "hint",
                                content: function(data) {
                                    var palette = data.settings && data.settings.colorPalette || "Q10";
                                    var colors = {
                                        "Q10": ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"],
                                        "category10": ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"],
                                        "set1": ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3", "#ff7f00", "#ffff33", "#a65628", "#f781bf", "#999999"],
                                        "set2": ["#66c2a5", "#fc8d62", "#8da0cb", "#e78ac3", "#a6d854", "#ffd92f", "#e5c494", "#b3b3b3"],
                                        "set3": ["#8dd3c7", "#ffffb3", "#bebada", "#fb8072", "#80b1d3", "#fdb462", "#b3de69", "#fccde5", "#d9d9d9", "#bc80bd", "#ccebc5", "#ffed6f"],
                                        "dark2": ["#1b9e77", "#d95f02", "#7570b3", "#e7298a", "#66a61e", "#e6ab02", "#a6761d", "#666666"],
                                        "paired": ["#a6cee3", "#1f78b4", "#b2df8a", "#33a02c", "#fb9a99", "#e31a1c", "#fdbf6f", "#ff7f00", "#cab2d6", "#6a3d9a", "#ffff99", "#b15928"],
                                        "pastel1": ["#fbb4ae", "#b3cde3", "#ccebc5", "#decbe4", "#fed9a6", "#ffffcc", "#e5d8bd", "#fddaec", "#f2f2f2"],
                                        "pastel2": ["#b3e2cd", "#fdcdac", "#cbd5e8", "#f4cae4", "#e6f5c9", "#fff2ae", "#f1e2cc", "#cccccc"]
                                    };
                                    var selectedColors = colors[palette] || colors["Q10"];
                                    return "Colors: " + selectedColors.slice(0, 5).join(", ") + "...";
                                },
                                show: function(data) {
                                    return data.settings && data.settings.colorMode === "auto";
                                }
                            },
                            customColors: {
                                type: "string",
                                label: "Custom Colors (JSON)",
                                ref: "settings.customColors",
                                expression: "optional",
                                defaultValue: '{"USA": "#ff7f0e", "China": "#d62728", "Germany": "#1f77b4"}',
                                show: function(data) {
                                    return data.settings && data.settings.colorMode === "custom";
                                }
                            },
                            customColorHelp: {
                                component: "text",
                                label: "Custom Color Format",
                                style: "hint",
                                content: 'Example: {"GroupName1": "#ff0000", "GroupName2": "#00ff00", "GroupName3": "#0000ff"}',
                                show: function(data) {
                                    return data.settings && data.settings.colorMode === "custom";
                                }
                            }
                        }
                    }
                }
            },
            labelsAndText: {
                type: "items",
                label: "Labels & Text",
                items: {
                    labelSection: {
                        type: "items",
                        label: "Bubble Labels",
                        items: {
                            showLabels: {
                                type: "boolean",
                                label: "Show Bubble Labels",
                                ref: "settings.showLabels",
                                defaultValue: true
                            },
                            labelColor: {
                                label: "Label Color",
                                component: "color-picker",
                                ref: "settings.labelColor",
                                type: "object",
                                defaultValue: {
                                    index: -1,
                                    color: "#333333"
                                },
                                show: function(data) {
                                    return data.settings && data.settings.showLabels;
                                }
                            },
                            labelSize: {
                                type: "integer",
                                label: "Base Label Font Size",
                                ref: "settings.labelSize",
                                defaultValue: 12,
                                expression: "optional",
                                show: function(data) {
                                    return data.settings && data.settings.showLabels;
                                }
                            },
                            labelFontFamily: {
                                type: "string",
                                component: "dropdown",
                                label: "Label Font Family",
                                ref: "settings.labelFontFamily",
                                options: [
                                    { value: "Arial", label: "Arial" },
                                    { value: "Helvetica", label: "Helvetica" },
                                    { value: "Times New Roman", label: "Times New Roman" },
                                    { value: "Georgia", label: "Georgia" },
                                    { value: "Verdana", label: "Verdana" },
                                    { value: "Tahoma", label: "Tahoma" },
                                    { value: "Trebuchet MS", label: "Trebuchet MS" },
                                    { value: "Courier New", label: "Courier New" },
                                    { value: "sans-serif", label: "Sans Serif (Default)" },
                                    { value: "serif", label: "Serif" },
                                    { value: "monospace", label: "Monospace" }
                                ],
                                defaultValue: "sans-serif",
                                show: function(data) {
                                    return data.settings && data.settings.showLabels;
                                }
                            },
                            labelFontWeight: {
                                type: "string",
                                component: "dropdown",
                                label: "Label Font Weight",
                                ref: "settings.labelFontWeight",
                                options: [
                                    { value: "normal", label: "Normal" },
                                    { value: "bold", label: "Bold" },
                                    { value: "lighter", label: "Lighter" },
                                    { value: "100", label: "100 - Thin" },
                                    { value: "300", label: "300 - Light" },
                                    { value: "400", label: "400 - Regular" },
                                    { value: "500", label: "500 - Medium" },
                                    { value: "700", label: "700 - Bold" },
                                    { value: "900", label: "900 - Black" }
                                ],
                                defaultValue: "bold",
                                show: function(data) {
                                    return data.settings && data.settings.showLabels;
                                }
                            },
                            labelFontStyle: {
                                type: "string",
                                component: "dropdown",
                                label: "Label Font Style",
                                ref: "settings.labelFontStyle",
                                options: [
                                    { value: "normal", label: "Normal" },
                                    { value: "italic", label: "Italic" }
                                ],
                                defaultValue: "normal",
                                show: function(data) {
                                    return data.settings && data.settings.showLabels;
                                }
                            },
                            minSizeForLabel: {
                                type: "integer",
                                label: "Min Bubble Size for Label",
                                ref: "settings.minSizeForLabel",
                                defaultValue: 20,
                                expression: "optional",
                                show: function(data) {
                                    return data.settings && data.settings.showLabels;
                                }
                            }
                        }
                    },
                    valueSection: {
                        type: "items",
                        label: "Value Display",
                        items: {
                            showValues: {
                                type: "boolean",
                                label: "Show Values in Bubbles",
                                ref: "settings.showValues",
                                defaultValue: true
                            },
                            valueColor: {
                                label: "Value Color",
                                component: "color-picker",
                                ref: "settings.valueColor",
                                type: "object",
                                defaultValue: {
                                    index: -1,
                                    color: "#666666"
                                },
                                show: function(data) {
                                    return data.settings && data.settings.showValues;
                                }
                            },
                            valueFontFamily: {
                                type: "string",
                                component: "dropdown",
                                label: "Value Font Family",
                                ref: "settings.valueFontFamily",
                                options: [
                                    { value: "Arial", label: "Arial" },
                                    { value: "Helvetica", label: "Helvetica" },
                                    { value: "Times New Roman", label: "Times New Roman" },
                                    { value: "Georgia", label: "Georgia" },
                                    { value: "Verdana", label: "Verdana" },
                                    { value: "Tahoma", label: "Tahoma" },
                                    { value: "Trebuchet MS", label: "Trebuchet MS" },
                                    { value: "Courier New", label: "Courier New" },
                                    { value: "sans-serif", label: "Sans Serif (Default)" },
                                    { value: "serif", label: "Serif" },
                                    { value: "monospace", label: "Monospace" }
                                ],
                                defaultValue: "sans-serif",
                                show: function(data) {
                                    return data.settings && data.settings.showValues;
                                }
                            },
                            valueFontWeight: {
                                type: "string",
                                component: "dropdown",
                                label: "Value Font Weight",
                                ref: "settings.valueFontWeight",
                                options: [
                                    { value: "normal", label: "Normal" },
                                    { value: "bold", label: "Bold" },
                                    { value: "lighter", label: "Lighter" },
                                    { value: "100", label: "100 - Thin" },
                                    { value: "300", label: "300 - Light" },
                                    { value: "400", label: "400 - Regular" },
                                    { value: "500", label: "500 - Medium" },
                                    { value: "700", label: "700 - Bold" },
                                    { value: "900", label: "900 - Black" }
                                ],
                                defaultValue: "normal",
                                show: function(data) {
                                    return data.settings && data.settings.showValues;
                                }
                            },
                            valueFontStyle: {
                                type: "string",
                                component: "dropdown",
                                label: "Value Font Style",
                                ref: "settings.valueFontStyle",
                                options: [
                                    { value: "normal", label: "Normal" },
                                    { value: "italic", label: "Italic" }
                                ],
                                defaultValue: "normal",
                                show: function(data) {
                                    return data.settings && data.settings.showValues;
                                }
                            },
                            minSizeForValue: {
                                type: "integer",
                                label: "Min Bubble Size for Value",
                                ref: "settings.minSizeForValue",
                                defaultValue: 30,
                                expression: "optional",
                                show: function(data) {
                                    return data.settings && data.settings.showValues;
                                }
                            }
                        }
                    },
                    groupLabelSection: {
                        type: "items",
                        label: "Group Labels",
                        items: {
                            showGroupLabels: {
                                type: "boolean",
                                label: "Show Group Labels",
                                ref: "settings.showGroupLabels",
                                defaultValue: true
                            },
                            groupLabelSize: {
                                type: "integer",
                                label: "Group Label Font Size",
                                ref: "settings.groupLabelSize",
                                defaultValue: 16,
                                expression: "optional",
                                show: function(data) {
                                    return data.settings && data.settings.showGroupLabels;
                                }
                            },
                            groupLabelFontFamily: {
                                type: "string",
                                component: "dropdown",
                                label: "Group Label Font Family",
                                ref: "settings.groupLabelFontFamily",
                                options: [
                                    { value: "Arial", label: "Arial" },
                                    { value: "Helvetica", label: "Helvetica" },
                                    { value: "Times New Roman", label: "Times New Roman" },
                                    { value: "Georgia", label: "Georgia" },
                                    { value: "Verdana", label: "Verdana" },
                                    { value: "Tahoma", label: "Tahoma" },
                                    { value: "Trebuchet MS", label: "Trebuchet MS" },
                                    { value: "Courier New", label: "Courier New" },
                                    { value: "sans-serif", label: "Sans Serif (Default)" },
                                    { value: "serif", label: "Serif" },
                                    { value: "monospace", label: "Monospace" }
                                ],
                                defaultValue: "sans-serif",
                                show: function(data) {
                                    return data.settings && data.settings.showGroupLabels;
                                }
                            },
                            groupLabelFontWeight: {
                                type: "string",
                                component: "dropdown",
                                label: "Group Label Font Weight",
                                ref: "settings.groupLabelFontWeight",
                                options: [
                                    { value: "normal", label: "Normal" },
                                    { value: "bold", label: "Bold" },
                                    { value: "lighter", label: "Lighter" },
                                    { value: "100", label: "100 - Thin" },
                                    { value: "300", label: "300 - Light" },
                                    { value: "400", label: "400 - Regular" },
                                    { value: "500", label: "500 - Medium" },
                                    { value: "700", label: "700 - Bold" },
                                    { value: "900", label: "900 - Black" }
                                ],
                                defaultValue: "normal",
                                show: function(data) {
                                    return data.settings && data.settings.showGroupLabels;
                                }
                            },
                            groupLabelFontStyle: {
                                type: "string",
                                component: "dropdown",
                                label: "Group Label Font Style",
                                ref: "settings.groupLabelFontStyle",
                                options: [
                                    { value: "normal", label: "Normal" },
                                    { value: "italic", label: "Italic" }
                                ],
                                defaultValue: "normal",
                                show: function(data) {
                                    return data.settings && data.settings.showGroupLabels;
                                }
                            },
                            groupLabelOpacity: {
                                type: "number",
                                component: "slider",
                                label: "Group Label Opacity",
                                ref: "settings.groupLabelOpacity",
                                min: 0.1,
                                max: 1,
                                step: 0.05,
                                defaultValue: 1,
                                show: function(data) {
                                    return data.settings && data.settings.showGroupLabels;
                                }
                            },
                            groupLabelOutline: {
                                type: "boolean",
                                label: "Use Strong White Outline",
                                ref: "settings.groupLabelOutline",
                                defaultValue: false,
                                show: function(data) {
                                    return data.settings && data.settings.showGroupLabels;
                                }
                            },
                            minGroupSizeForLabel: {
                                type: "integer",
                                label: "Min Group Size for Label",
                                ref: "settings.minGroupSizeForLabel",
                                defaultValue: 50,
                                expression: "optional",
                                show: function(data) {
                                    return data.settings && data.settings.showGroupLabels;
                                }
                            },
                            showGroupImages: {
                                type: "boolean",
                                label: "Show Group Images/Flags",
                                ref: "settings.showGroupImages",
                                defaultValue: false
                            },
                            groupImageSize: {
                                type: "integer",
                                label: "Image Size (pixels)",
                                ref: "settings.groupImageSize",
                                defaultValue: 24,
                                expression: "optional",
                                show: function(data) {
                                    return data.settings && data.settings.showGroupImages;
                                }
                            },
                            groupImageMapping: {
                                type: "string",
                                label: "Image URL Mapping (JSON)",
                                ref: "settings.groupImageMapping",
                                expression: "optional",
                                defaultValue: '{"USA": "https://flagcdn.com/24x18/us.png", "China": "https://flagcdn.com/24x18/cn.png"}',
                                show: function(data) {
                                    return data.settings && data.settings.showGroupImages;
                                }
                            },
                            imageHelp: {
                                component: "text",
                                label: "Image URL Format",
                                style: "hint",
                                content: 'Example: {"GroupName": "https://example.com/image.png"}. For country flags, use: https://flagcdn.com/24x18/[code].png',
                                show: function(data) {
                                    return data.settings && data.settings.showGroupImages;
                                }
                            }
                        }
                    }
                }
            },
            legend: {
                type: "items",
                label: "Legend",
                items: {
                    showLegend: {
                        type: "boolean",
                        label: "Show Legend",
                        ref: "settings.showLegend",
                        defaultValue: false
                    },
                    legendPosition: {
                        type: "string",
                        component: "dropdown",
                        label: "Legend Position",
                        ref: "settings.legendPosition",
                        options: [
                            { value: "right", label: "Right" },
                            { value: "left", label: "Left" },
                            { value: "top", label: "Top" },
                            { value: "bottom", label: "Bottom" }
                        ],
                        defaultValue: "right",
                        show: function(data) {
                            return data.settings && data.settings.showLegend;
                        }
                    },
                    legendTextColor: {
                        label: "Legend Text Color",
                        component: "color-picker",
                        ref: "settings.legendTextColor",
                        type: "object",
                        defaultValue: {
                            index: -1,
                            color: "#333333"
                        },
                        show: function(data) {
                            return data.settings && data.settings.showLegend;
                        }
                    }
                }
            },
            tooltip: {
                type: "items",
                label: "Tooltip",
                items: {
                    showTooltip: {
                        type: "boolean",
                        label: "Show Tooltip on Hover",
                        ref: "settings.showTooltip",
                        defaultValue: true
                    }
                }
            },
            developerOptions: {
                type: "items",
                label: "Developer Options",
                items: {
                    enableDebug: {
                        type: "boolean",
                        component: "switch",
                        label: "Enable Debug Mode",
                        ref: "settings.enableDebug",
                        defaultValue: false,
                        options: [{
                            value: true,
                            label: "On"
                        }, {
                            value: false,
                            label: "Off"
                        }]
                    }
                }
            },
            addons: {
                uses: "addons",
                items: {
                    dataHandling: {
                        uses: "dataHandling"
                    }
                }
            }
        }
    };
});