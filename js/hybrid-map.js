// by Tom Swisher
/* global d3, console, graphApril6JSON */
/* jshint -W069, unused:false */
'use strict';

window.debugMode = false;
var mapRatio = 1.7;
var animateDuration = 500;
var animateEase = 'cubic-out';
var hoverHeight = 0;
var hoverText1 = '', hoverText2 = '';
var rxValue = 15;
var gradeArray = ['A','B','C','D','F'];
var visibleGrades = {'A':true,'B':true,'C':true,'D':true,'F':true};
var gradeScale = function(letter) {
    switch (letter) {
        case 'A': return 4;
        case 'B': return 3;
        case 'C': return 2;
        case 'D': return 1;
        case 'F': return 0;
        default: return NaN;
    }
};
var mapInstance;
var mapWidth = 0, mapHeight = 0;
var currentVisualizationWidth = 0;
var currentVisualizationHeight = 0;
var mapFontSize, infoboxFontSize;
var sizeOfDOM = 0;
var stateHovered = 'National';
var isMobile;

// Visual Styles
var vs = {};
vs.popupDX = 2;
vs.popupDY = 2;
vs.gradeMargin = 2.5;
vs.gradeRounded = false;
vs.categoryRounded = false;
vs.categoryGradeWidth = 30;
vs.categoryMarginX = 4;
vs.categoryMarginY = 2;
//
vs.c_salmon = '#ff5232';
vs.c_peagreen = '#6eaa5e';
vs.c_lightgainsboro = '#eeeeee';
vs.gradeColorArray = [];
// arxiv
// red   179  27  27  
// gray  104    100 91  
// lgray 192 192 192 
// blue  0  0   238 

// http://www.colourlovers.com/palette/593047/Bauhaus
// gold   244    229 0   
// orange 241   145 1   
// blue   38 113 178 
// green  38 113 178 
// red    227    35  34  
// purple 109   56  137 
// black  34 34  34  

// BH Paint
// black  34 34  34  
// blue  28 44  160 
// gold  251    204 12  
// red   240    6   55  
// white 239    230 221 


/*BH1*/ vs.gradeColorArray = ['rgb(50,50,50)','rgb(28,44,160)','rgb(240,6,55)','rgb(251,204,12)','rgb(239,230,221)'];
// /*BH2*/ vs.gradeColorArray = ['rgb(240,243,247)','rgb(191,162,26)','rgb(20,65,132)','rgb(153,40,26)','rgb(34,34,34)'];
// vs.gradeColorArray = ['rgb(40,40,40)','rgb(80,80,80)','rgb(120,120,120)','rgb(160,160,160)','rgb(180,180,180)']; // grayscale
// vs.gradeColorArray = ['#c7e9b4','#7fcdbb','#41b6c4','#2c7fb8','#253494']; // blue - torquise
// vs.gradeColorArray = ['#253494','#2c7fb8','#41b6c4','#7fcdbb','#c7e9b4']; // turqouise - blue
// vs.gradeColorArray = ['#bd0026','#f03b20','#fd8d3c','#fecc5c','#ffffb2']; // tan - red
// vs.gradeColorArray = ['#ffffcc','#c2e699','#78c679','#31a354','#006837']; // green - tan
// vs.gradeColorArray = ['#dc143c', '#f39237', '#feea1b', '#b5d400', '#529c00']; // green - yellow - red
// vs.gradeColorArray = ['darkgreen', 'lightgreen', 'yellow', 'orange', 'red'];
// vs.gradeColorArray = [vs.c_salmon, 'gold', 'lightyellow', 'lightgreen', vs.c_peagreen];
// vs.gradeColorArray = ['#b22222', 'lightgray', 'lightgray', 'lightgray', '#3cb371']; // green - gray - red
// vs.gradeColorArray = ['#d7191c', '#fdae61', '#ffffbf', '#a6d96a', '#1a9641']; // colorbrewer
// vs.gradeColorArray = ['crimson', '#fdae61', '#ffffbf', '#a6d96a', '#1a9641'];
// vs.gradeColorArray = ['#FF1800', '#FFDD6B', '#FFF696', '#9CCC49', '#00911A'];
//
vs.activeColor = '#D02626';
vs.inactiveColor = 'white';
vs.yesColor = '#D02626';
vs.noColor = 'BDBBBB';
vs.categoryTextColor = 'black';
vs.categoryTextColorHigh = 'whitesmoke';
//
var colorScale = d3.scaleQuantize()
    .domain([0, 5])
    .range(vs.gradeColorArray);

vs.stateHoveredOpacity = 0.3;
vs.stateNotClickedOpacity = 0.2;
vs.hoverShowCategoryName = false;
vs.hoverMargin = 5;

window.onload = InitializePage;
window.onresize = ResizePage;

// Selectors
var body = d3.select('body');
var filtersContainer = body.select('#filters-container');
var filtersSVG = body.select('#filters-svg');
var statesDropdown = body.select('#states-dropdown');
var infoboxContainer = body.select('#infobox-container');
var visualizationContainer = body.select('#visualization-container');
var mainContainer = body.select('#main-container');
var mainSVG = body.select('#main-svg');
var mainBG = body.select('#main-bg');
var statesG = body.select('#states-g');
var nodesG = body.select('#nodes-g');
var linksG = body.select('#links-g');
var hoverG = body.select('#hover-g');
var defs = filtersSVG.append('defs');

// height=130% so that the shadow is not clipped
var dropShadowFilter = defs.append('filter')
    .attr('id', 'drop-shadow')
    .attr('height', '130%')
    .attr('width', '120%');
// SourceAlpha refers to opacity of graphic that this dropShadowFilter will be applied to
// convolve that with a Gaussian with standard deviation 3 and store result in blur
dropShadowFilter.append('feGaussianBlur')
    .attr('in', 'SourceAlpha')
    .attr('stdDeviation', 2)
    .attr('result', 'blur');
// translate output of Gaussian blur to the right and downwards with 2px
// store result in offsetBlur
dropShadowFilter.append('feOffset')
    .attr('in', 'blur')
    .attr('dx', 3)
    .attr('dy', 3)
    .attr('result', 'offsetBlur');
// overlay original SourceGraphic over translated blurred opacity by using
// feMerge dropShadowFilter. Order of specifying inputs is important!
var feMerge = dropShadowFilter.append('feMerge');
feMerge.append('feMergeNode')
    .attr('in', 'offsetBlur');
feMerge.append('feMergeNode')
    .attr('in', 'SourceGraphic');


function InitializePage() {
    // ResetGraph();
    // requestAnimationFrame(function() {
    //     body.style('opacity', 1);
    // });
    var csvDataURL = 'data/4_6_reduced_privatization_report_card.csv';
    // var csvDataURL = 'data/data-08-04-2017.csv';
    mapInstance = new MapObject();
    mapInstance.jsonData(window.usStatesJSON);
    mapInstance.csvData(csvDataURL, function() {
        ResizePage();
        // ResetGraph();
        requestAnimationFrame(function() {
            body.style('opacity', 1);
        });
    });
}


function ToggleGrades(bool) {
    visibleGrades['A'] = visibleGrades['B'] = visibleGrades['C'] =
        visibleGrades['D'] = visibleGrades['F'] = bool;
}


function UpdateFilters() {
    // console.log('UpdateFilters');
    // var filtersWidth = Math.max(0, parseFloat(filtersContainer.style('width')));
    // var filtersHeight = Math.max(0, parseFloat(filtersContainer.style('height')));
    var filtersWidth = window.innerWidth || 400;
    var filtersHeight = 40;
    filtersSVG
        .attr('width', filtersWidth)
        .attr('height', filtersHeight+3)
        // .transition().duration(animateDuration).ease(animateEase)
        .style('opacity', function() {
            return mapInstance.category() !== 'Overall Grade' ? 0 : 1;
        });
    var gradeDataArray = gradeArray.slice();
    // var gradeRectSize = (1/2)*(1/gradeDataArray.length)*filtersWidth;
    var gradeRectSize = filtersHeight - 2*vs.gradeMargin;
    //
    var gradeGs = filtersSVG.selectAll('g.grade-g').data(gradeDataArray);
    gradeGs = gradeGs
        .enter().append('g')
            .attr('class', 'grade-g')
            .merge(gradeGs);
    gradeGs
        .attr('transform', function(d,i) {
            var tx = (1/2)*filtersWidth + (1/2-1/2*gradeDataArray.length+i)*filtersHeight;
            var ty = (1/2)*filtersHeight + 1;
            return 'translate('+tx+','+ty+')';
        })
        .on('mouseover', function(d) {
            ToggleGrades(false);
            visibleGrades[d] = true;
            UpdateFilters();
            mapInstance.UpdateMap();
        })
        .on('mouseout', function() {
            ToggleGrades(true);
            UpdateFilters();
            mapInstance.UpdateMap();
        })
        .each(function(grade) {
            var gradeBG = d3.select(this).selectAll('rect.grade-bg').data([grade]);
            gradeBG = gradeBG
                .enter().append('rect')
                    .attr('class', 'grade-bg')
                    .attr('rx', vs.gradeBGRounded ? rxValue : 0)
                    .style('fill', vs.inactiveColor)
                    .merge(gradeBG);
            gradeBG
                .attr('x', (-1/2)*filtersHeight)
                .attr('y', (-1/2)*filtersHeight)
                .attr('width', filtersHeight)
                .attr('height', filtersHeight-2);
            //
            var gradeRect = d3.select(this).selectAll('rect.grade-rect').data([grade]);
            gradeRect = gradeRect
                .enter().append('rect')
                    .attr('class', 'grade-rect')
                    .attr('rx', vs.gradeRounded ? rxValue : 0)
                    .style('fill', function(d) {
                        return colorScale(gradeScale(d));
                    })
                    .merge(gradeRect);
            gradeRect
                .attr('x', function(d) {
                    return visibleGrades[d] === true ? (-1/2)*gradeRectSize - vs.popupDX : (-1/2)*gradeRectSize;
                })
                .attr('y', function(d) {
                    return visibleGrades[d] === true ? (-1/2)*gradeRectSize - vs.popupDY : (-1/2)*gradeRectSize;
                })
                .attr('width', gradeRectSize)
                .attr('height', gradeRectSize)
                .style('filter', function(d) {
                    return visibleGrades[d] === true ? 'url(#drop-shadow)' : null;
                })
                // .transition().duration(animateDuration).ease(animateEase)
                .style('fill', function(d) {
                    return visibleGrades[d] === true ? colorScale(gradeScale(d)) : vs.inactiveColor;
                });
            //
            var gradeLabel = d3.select(this).selectAll('text.grade-label').data([grade]);
            gradeLabel = gradeLabel
                .enter().append('text')
                    .attr('class', 'grade-label button-text')
                    .text(function(d) { return d; })
                    .merge(gradeLabel);
            gradeLabel
                .attr('x', function(d) {
                    return visibleGrades[d] === true ? -1*vs.popupDX : 0;
                })
                .attr('y', function(d) {
                    return visibleGrades[d] === true ? -1*vs.popupDY : 0;
                });
        });
}


function UpdateInfobox(source) {
    // console.log('UpdateInfobox', source);
    if (!mapInstance.categoryNames() || !mapInstance.csvData()) { return; }
    var stateDataRow;
    if (stateHovered === 'National') {
        stateDataRow = {};
    } else {
        stateDataRow = mapInstance.csvData().filter(function(row) {
            return row.State === stateHovered;
        })[0];
    }
    var categoryRowsData = mapInstance.categoryNames().slice();
    statesDropdown
        .attr('class', 'button-object')
        // .style('background', 'url("img/orange-triangle-flipped.png") 90% no-repeat '+vs.inactiveColor)
        .on('change', function() {
            if (this.value === 'National') {
                stateHovered = 'National';
                hoverG.selectAll('text.hover-text').text('');   
                hoverG.selectAll('rect.hover-rect').attr('width', 0);
            } else {
                stateHovered = this.value;
                var d = mainSVG.selectAll('.state-path')
                    .filter(function(d) { return d.properties.name === stateHovered; })
                    .datum();
                hoverText1 = stateHovered+': '+d.properties[mapInstance.category()];
                UpdateHover();
            }
            UpdateInfobox('statesDropdown change');
            mapInstance.UpdateMap();
        });
    var statesDropdownOptionsData = mapInstance.csvData().slice();
    statesDropdownOptionsData = statesDropdownOptionsData.map(function(row) {
        return row.State;
    });
    statesDropdownOptionsData.unshift('National');
    //
    var statesDropdownOptions = statesDropdown.selectAll('option.states-dropdown-option').data(statesDropdownOptionsData);
    statesDropdownOptions = statesDropdownOptions
        .enter().append('option')
            .classed('states-dropdown-option', true)
            .text(function(d) { return d; })
            .merge(statesDropdownOptions);
    statesDropdown.node().value = stateHovered;
}


function ResizePage() {
    requestAnimationFrame(function() {
        var width = window.innerWidth || 500;
        var height = width/mapRatio;
        mapInstance
            .width(width)
            .height(height)
            .scale(width*1.2);
        UpdateFilters();
        UpdateInfobox('CheckSize');
        // ResetGraph();
        /*
        1   320     568     P iPhone 5
        2   375     627     P iPhone 6
        3   414     736     P iPhone 6+
        4   667     375     
        5   736     414
        6   768     1024    P iPad
        7   1024    768
        @mapHeight1: 205px;
        @mapHeight2: 240px;
        @mapHeight3: 270px;
        @mapHeight4: 315px;
        @mapHeight5: 315px;
        @mapHeight6: 315px;
        @mapHeight7: 440px;
        */
        // var newVisualizationWidth = Math.max(0, parseFloat(visualizationContainer.style('width'))); 
        // var newVisualizationHeight = Math.max(0, parseFloat(visualizationContainer.style('height'))); 
        // var width = Math.max(0, parseFloat(mainContainer.style('width'))); 
        // var mapHeight = Math.max(0, parseFloat(mainContainer.style('height'))); 
        // if (newVisualizationWidth !== currentVisualizationWidth || newVisualizationHeight !== currentVisualizationHeight) {
        //     // console.log(newVisualizationWidth, newVisualizationHeight);
        //     currentVisualizationWidth = newVisualizationWidth;
        //     currentVisualizationHeight = newVisualizationHeight;
        //     mapInstance
        //         .width(width)
        //         .height(mapHeight)
        //         .scale(width*1.3);
        //     UpdateFilters();
        //     UpdateInfobox('CheckSize');
        // }
    });
}


function MapObject() {
    var _width = 0;
    var _height = 0;
    var _scale = 1000;
    var _category = 'Overall Grade';
    var _csvData = null;
    var _jsonData = null;
    var _categoryNames = null;
    var _path = null;

    this.csvData = function(csvDataURL, callback) {
        if (!arguments.length) { return _csvData; }
        var that = this;
        d3.csv(csvDataURL, function(csvData) {
            // console.log('d3.csv');
            // console.log(csvData);
            _csvData = csvData;
            // Get all category names
            _categoryNames = [];
            for (var name in _csvData[0]) {
                // if (name !== 'State' && name !== 'Overall Grade') {
                if (name !== 'State') {
                // if (name !== 'State') {
                    _categoryNames.push(name);
                }
            }
            return callback.call(that);
        });
    };

    this.categoryNames = function(categoryNames) {
        if (!arguments.length) { return _categoryNames; }
        _categoryNames = categoryNames;
        this.UpdateMap('categoryNames');
        return this;
    }

    this.category = function(category) {
        if (!arguments.length) { return _category; }
        _category = category;
        this.UpdateMap('category');
        return this;
    };

    this.width = function(width) {
        if (!arguments.length) { return _width; }
        _width = width;
        this.UpdateMap('width');
        return this;
    };
    
    this.height = function(height) {
        if (!arguments.length) { return _height; }
        _height = height;
        this.UpdateMap('height');
        return this;
    };

    this.scale = function(scale) {
        if (!arguments.length) { return _scale; }
        _scale = scale;
        this.UpdateMap('scale');
        return this;
    };

    this.path = function(path) {
        if (!arguments.length) { return _path; }
        _path = path;
        this.UpdateMap('path');
        return this;
    };

    this.jsonData = function(jsonData) {
        if (!arguments.length) { return _jsonData; }
        _jsonData = jsonData;
        this.UpdateMap('jsonData');
        return this;
    };

    this.UpdateMap = function(source) {
        console.log('UpdateMap', source);
        if (!_csvData) {
            return;
        } else if (!_jsonData) {
            return;
        }
        // console.log('UpdateMap');
        var that = this;

        isMobile = false;
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
            isMobile = true;
            console.log('Using a mobile device');
        }
        var i, j, csvDataState, csvDataValue, jsonDataState;
        for (i = 0; i < _csvData.length; i++) {
            csvDataState = _csvData[i].State;
            csvDataValue = _csvData[i][_category];
            for (j = 0; j < _jsonData.features.length; j++) {
                jsonDataState = _jsonData.features[j].properties.name;
                if (csvDataState == jsonDataState) {
                    _jsonData.features[j].properties[_category] = csvDataValue;
                    break;
                }
            }   
        }
        var projection = d3.geoAlbersUsa()
           .translate([_width/2, _height/2])
           .scale([_scale]);
        _path = d3.geoPath()
           .projection(projection);
        //
        mainSVG
            .on('mousemove', function() { UpdateHover(); })
            .attr('width', _width)
            .attr('height', _height);
        //
        mainBG
            .attr('width', _width)
            .attr('height', _height)
            .attr('x', 0)
            .attr('y', 0)
            .on('mouseover', function() {
                // if (isMobile === true) { return; }
                stateHovered = 'National';
                mainSVG.selectAll('.state-path').style('opacity', 1);
                hoverText1 = '';
                hoverText2 = '';
                UpdateHover();
                UpdateInfobox('mainBG mouseover');
            })
            .style('fill', visualizationContainer.style('background-color'));
        //
        var stateGs = statesG.selectAll('g.state-g').data(_jsonData.features, function(d) { return d.properties.name; });
        stateGs = stateGs
            .enter().append('g')
                .classed('state-g', true)
                .merge(stateGs);
        //
        var statePaths = stateGs.selectAll('.state-path').data(function(d) { return [d]; }, function(d) { return d.properties.name; });
        statePaths = statePaths
            .enter().append('path')
                .classed('state-path', true)
                .classed('button-object', true)
                // .classed('unselectable', true)
                // .attr('unselectable', 'on') // IE < 10 and Opera
                .style('fill', function(d) {
                    var grade = d.properties[_category];
                    if (grade === undefined) { return '#ccc'; }
                    if (grade === '_') { return vs.inactiveColor; }
                    if (grade === 'Yes') { return vs.yesColor; }
                    if (grade === 'No') { return vs.noColor; }
                    return colorScale(gradeScale(grade));
                })
                .attr('d', _path)
                .merge(statePaths);
        statePaths
            .on('mouseover', function(d) {
                if (isMobile === true) { return; }
                if (visibleGrades[d.properties[_category]] === false) {
                    stateHovered = 'National';
                    mainSVG.selectAll('.state-path').style('opacity', 1);
                    hoverText1 = '';
                    hoverText2 = '';
                    UpdateHover();
                    UpdateInfobox('statePaths mouseover');
                    return;
                }
                stateHovered = d.properties.name;
                mainSVG.selectAll('.state-path')
                    .style('opacity', function(d) {
                        if (stateHovered === d.properties.name) { return vs.stateHoveredOpacity; }
                        return 1;
                    });
                hoverText1 = d.properties.name+': '+d.properties[_category];
                hoverText2 = _category;
                UpdateHover();
                UpdateInfobox('statePaths mouseover');
                // console.log(projection.invert(d3.mouse(this)));
            })
            .on('mouseup', function() {
                return;
            })
            .attr('d', _path);
        // ---
        stateGs
            .attr('transform', 'scale(1)'); 
        statePaths
            .attr('transform', 'scale(1)')
            .each(function(d) {
                if (stateHovered === d.properties.name) {
                    this.parentNode.parentNode.appendChild(this.parentNode);
                    hoverG.node().parentNode.appendChild(hoverG.node());
                }
            });
        //---
        statePaths
            .style('opacity', function(d) {
                // var oldOpacity = d3.select(this).style('opacity');
                if (stateHovered === d.properties.name) { return vs.stateHoveredOpacity; }
                return 1;
            })
            // .transition().duration(animateDuration).ease(animateEase)
            .style('fill', function(d) {
                var grade = d.properties[_category];
                if (grade === false) { return vs.inactiveColor; }
                if (grade === undefined) { return '#ccc'; }
                if (grade === '_') { return vs.inactiveColor; }
                if (grade === 'Yes') { return vs.yesColor; }
                if (grade === 'No') { return vs.noColor; }
                return colorScale(gradeScale(grade));
            });
        statePaths
            .filter(function(d) { 
                var gradeLetter = d.properties[_category];
                return visibleGrades[gradeLetter] === false;
            })
            // .transition().duration(animateDuration).ease(animateEase)
            .style('fill', vs.inactiveColor);
        //
        // stateThumbs = stateGs.selectAll('.state-thumb').data(function(d) { return [d]; }, function(d) { return d.properties.name; });
        // stateThumbs.enter().append('svg:image').classed('state-thumb', true);
        // this.UpdateThumbs();
        // Update font size and dependent objects
        mapFontSize = parseFloat(mainSVG.style('font-size'));
        hoverHeight = (vs.hoverShowCategoryName === true) ? 2*mapFontSize+3*vs.hoverMargin : mapFontSize+2*vs.hoverMargin;

        hoverG.each(function() {
            d3.select(this).selectAll('rect.hover-rect').data([null])
                .enter().append('rect').classed('hover-rect', true)
                    .attr('width', 0) // dynamic
                    .attr('height', hoverHeight)
                    .attr('x', 0) // dynamic
                    .attr('y', -1*hoverHeight-5)
                    .style('filter', 'url(#drop-shadow)');
            d3.select(this).selectAll('text.hover-text.row1').data([null])
                .enter().append('text').attr('class', 'hover-text row1')
                    .attr('x', 0)
                    .attr('y', -0.5*hoverHeight-5)
                    .text(stateHovered !== 'National' ? stateHovered : null);
            if (vs.hoverShowCategoryName === true) {
                d3.select(this).selectAll('text.hover-text.row2').data([null])
                    .enter().append('text').attr('class', 'hover-text row2')
                        .attr('x', 0)
                        .attr('y', -0.25*hoverHeight-5)
                        .text(stateHovered !== 'National' ? _category: null);
            }
        });

        var oldSizeOfDom = sizeOfDOM;
        sizeOfDOM = d3.selectAll('*').size();
        if (sizeOfDOM !== oldSizeOfDom) {
            console.log('sizeOfDOM='+String(sizeOfDOM)+' changed by '+String(sizeOfDOM-oldSizeOfDom));
        }

        // DEBUG
        if (window.debugMode === true) {
            body.selectAll('*').style('outline', '1px solid green');
            var verticalGuid = mainSVG.selectAll('rect.vertical-guide').data([null]);
            verticalGuid = verticalGuid
                .enter().append('rect')
                    .classed('vertical-guide', true)
                    .merge(verticalGuid);
            verticalGuid
                .attr('x', _width/2-1)
                .attr('y', 0)
                .attr('width', 2)
                .attr('height', _height)
                .style('fill', 'darkorange');
        }
    };

    // this.UpdateThumbs = function() {
    //  var thumbSize = 20;
    //  body.selectAll('.state-thumb')
    //      .attr('xlink:href', function(d,i) {
    //          return i % 2 === 0 ? 'img/thumbs_up_36922.svg' : 'img/thumbs_down_36922.svg';
    //      })
    //      .attr('width', thumbSize+'px')
    //      .attr('height', thumbSize+'px')
    //      .attr('transform', function(d) {
    //          var tx = d.transformOriginX-(1/2)*thumbSize;
    //          var ty = d.transformOriginY-(1/2)*thumbSize;
    //          return 'translate('+tx+','+ty+')';
    //      });
    // }
}


function UpdateHover() {
    var hoverWidth, text1, text2;
    text1 = hoverG.selectAll('text.hover-text.row1').text(hoverText1);
    if (!text1.node() || hoverText1 === '') {
        hoverWidth = 0;
    } else if (vs.hoverShowCategoryName === true) {
        text2 = hoverG.selectAll('text.hover-text.row2').text(hoverText2);
        hoverWidth = Math.max(text1.node().getBBox().width, text2.node().getBBox().width)+2*vs.hoverMargin;
    } else {
        hoverWidth = text1.node().getBBox().width+2*vs.hoverMargin;
    }
    hoverG.selectAll('rect.hover-rect')
        .attr('width', hoverWidth)
        .attr('x', -0.5*hoverWidth);
    hoverG
        .attr('transform', function() {
            var mouseX = d3.mouse(mainSVG.node())[0] || mapInstance.width()/2;
            var mouseY = d3.mouse(mainSVG.node())[1] || mapInstance.height()/2;
            if (mouseX < hoverWidth/2 + 1) {
                mouseX = hoverWidth/2 + 1;
            } else if (mouseX > parseInt(mainSVG.style('width')) - hoverWidth/2 - 1) {
                mouseX = parseInt(mainSVG.style('width')) - hoverWidth/2 - 1;
            }
            if (mouseY < hoverHeight + 5 + 1) {
                mouseY = hoverHeight + 5 + 1;
            }
            return 'translate('+mouseX+','+mouseY+')';
        });
}


function BostockTextWrap(text, width) {
  text.each(function() {
    var text = d3.select(this);
    var x = text.attr('x');
    var numRows = 1;
    var words = text.text().split(/\s+/).reverse(),
        word,
        line = [],
        lineNumber = 0,
        lineHeight = 1.1, // ems
        y = text.attr('y'),
        dy = text.attr('dy') === null ? 0 : parseFloat(text.attr('dy')),
        tspan = text.text(null).append('tspan').attr('x', x).attr('y', y).attr('dy', dy + 'em');
    while (word = words.pop()) { /* jshint ignore:line */
      line.push(word);
      tspan.text(line.join(' '));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(' '));
        line = [word];
        tspan = text.append('tspan').attr('x', x).attr('y', y).attr('dy', ++lineNumber * lineHeight + dy + 'em').text(word);
        numRows += 1;
      }
    }
    var fontSize = parseFloat(getComputedStyle(this)['font-size']);
    text.attr('transform', 'translate(0,'+String(-1/2*(numRows-1)*fontSize)+')');
  });
}






function GraphObject() {
    var _width = window.innerWidth || 500;
    var _height = _width/mapRatio;
    this._simulation = d3.forceSimulation()
        .force('link', d3.forceLink().distance(20).strength(0.5))
        .force('charge', d3.forceManyBody())
        .force('center', d3.forceCenter(_width/2, _height/2));
    return this;
}


function ResetGraph() {
    var nodes, links, nodeById;
    var dollarsScale = d3.scaleLinear()
        .range([0.5, 10]);
    var dollarsGivenScale = d3.scaleLinear()
        .range([3, 20]);
    var dollarsReceivedScale = d3.scaleLinear()
        .range([1, 10]);

    hybridMap();

    function hybridMap() {
        nodes = graphApril6JSON.nodes;
        links = graphApril6JSON.links;
        nodeById = d3.map(nodes, function(d) { return d.id; });
        nodes.forEach(function(node) {
            node.dollarsGiven = 0;
            node.dollarsReceived = 0;
        });

        links.forEach(function(link) {
            link.source = nodeById.get(link.source);
            link.target = nodeById.get(link.target);
            link.source.dollarsGiven += link.dollars;
            link.target.dollarsReceived += link.dollars;
        });
        //         i = {
        //           report: parseInt(link.report),
        //           dollars: parseInt(link.dollars),
        //           month: link.month,
        //           year: link.year,  
        //         }; // intermediate node
        //     nodes.push(i);
        //     links.push({ source: link.source, target: i }, { source: i, target: link.target });
        //     bilinks.push([link.source, i, link.target]);

        dollarsScale.domain([
            d3.min(links, function(link) { return link.dollars; }),
            d3.max(links, function(link) { return link.dollars; })
        ]);
        dollarsGivenScale.domain([
            d3.min(nodes, function(node) { return node.dollarsGiven; }),
            d3.max(nodes, function(node) { return node.dollarsGiven; })
        ]);
        dollarsReceivedScale.domain([
            d3.min(nodes, function(node) { return node.dollarsReceived; }),
            d3.max(nodes, function(node) { return node.dollarsReceived; })
        ]);

        var linkElements = linksG.selectAll('.link')
            .data(links)
            .enter().append('line')
            // .enter().append('path')
            .style('stroke', 'black')
            .style('stroke-width', function(d) { return dollarsScale(d.dollars); })
            .attr('class', function(d) { return 'link-path report' + d.report; });

        var nodeElements = nodesG.selectAll('.node')
            .data(nodes.filter(function(d) { return d.id; }))
            .enter().append('circle')
            .attr('class', function(d) { return 'node ' + d.state; })
            .attr('r', function(d) { return dollarsGivenScale(d.dollarsGiven); })
            .attr('fill', function() { return 'green'; })
            .call(d3.drag()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended));

        nodeElements.append('title')
            .text(function(d) { return d.id; });

        simulation
            .nodes(nodes)
            .on('tick', ticked);

        simulation.force('link')
            .links(links);

        // function ticked() {
        //     linkElements.attr('d', positionLink);
        //     node.attr('transform', positionNode);
        // }

        function ticked() {
            linkElements
                .attr('x1', function(d) { return d.source.x; })
                .attr('y1', function(d) { return d.source.y; })
                .attr('x2', function(d) { return d.target.x; })
                .attr('y2', function(d) { return d.target.y; });

            nodeElements
                .attr('cx', function(d) { return d.x; })
                .attr('cy', function(d) { return d.y; });
        }
    }

    // function positionLink(d) {
    //     return 'M' + d[0].x + ',' + d[0].y +
    //         'S' + d[1].x + ',' + d[1].y +
    //         ' ' + d[2].x + ',' + d[2].y;
    // }

    // function positionNode(d) {
    //     return 'translate(' + d.x + ',' + d.y + ')';
    // }

    function dragstarted(d) {
        if (!d3.event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    function dragended(d) {
        if (!d3.event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
}