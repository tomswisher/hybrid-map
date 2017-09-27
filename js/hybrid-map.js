// Written by Tom Swisher
// tomswisherlabs@gmail.com


/* global d3, console */
/* jshint -W069, unused:false */
'use strict';


// Window Functions
window.onload = InitializePage;
window.onresize = ResizePage;


// Detected Settings
var isMobile = false;
if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) { isMobile = true; }
if (isMobile) { console.log('isMobile'); }


// Global Variables
var animating = false;
var debugMode = false;
var minMapWidth = 300;
var mapWidthHeightRatio = 1.8;
var mapScale = 1.2;
var animateDuration = 500;
var animateEase = 'cubic-out';
var hoverHeight = 0;
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
var sizeOfDom = 0;
var usedJSHeapSize = 0;
var stateSelected = 'National';
var mapObj, graphObj;


// Selectors
var body = d3.select('body');
var filtersContainer = body.select('#filters-container');
var filtersSVG = body.select('#filters-svg');
var filtersDefs = body.select('#filters-defs');
var statesSelect = body.select('#states-select');
var infoboxContainer = body.select('#infobox-container');
var visualizationContainer = body.select('#visualization-container');
var mainContainer = body.select('#main-container');
var mainSVG = body.select('#main-svg');
var mainBG = body.select('#main-bg');
var statesG = body.select('#states-g');
var verticesG = body.select('#vertices-g');
var edgesG = body.select('#edges-g');
var hoverG = body.select('#hover-g');
var hoverRect = body.select('#hover-rect');
var hoverText = body.select('#hover-text');


// Visual Styles
var vs = {};
vs.popupDX = 2;
vs.popupDY = 2;
vs.gradeMargin = 2.5;
vs.hoverMargin = 5;
vs.activeColor = '#D02626';
vs.inactiveColor = 'white';
vs.yesColor = '#D02626';
vs.noColor = 'BDBBBB';
vs.c_salmon = '#ff5232';
vs.c_peagreen = '#6eaa5e';
vs.c_lightgainsboro = '#eeeeee';
// arxiv
// red   179  27  27  
// gray  104    100 91  
// lgray 192 192 192 
// blue  0  0   238 
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
vs.gradeColorScale = d3.scaleQuantize()
    .domain([0, 5])
    .range(vs.gradeColorArray);
filtersDefs
    .append('filter')
        .attr('id', 'drop-shadow')
        .attr('height', '130%') // height=130% so that the shadow is not clipped
        .attr('width', '120%')
        .each(function() {
            // SourceAlpha refers to opacity of graphic that this drop-shadow filter will be applied to
            // convolve that with a Gaussian with standard deviation 3 and store result in blur
            d3.select(this)
                .append('feGaussianBlur')
                    .attr('in', 'SourceAlpha')
                    .attr('stdDeviation', 3)
                    .attr('result', 'blur');
            // Translate the output of the Gaussian blur to the right and downwards
            // Store result in offsetBlur
            d3.select(this)
                .append('feOffset')
                    .attr('in', 'blur')
                    .attr('dx', 3)
                    .attr('dy', 3)
                    .attr('result', 'offsetBlur');
            // Overlay original SourceGraphic over translated blurred opacity by using
            // feMerge drop-shadow. Order of specifying inputs is important!
            d3.select(this)
                .append('feMerge')
                    .each(function() {
                        d3.select(this)
                            .append('feMergeNode')
                                .attr('in', 'offsetBlur');
                        d3.select(this)
                            .append('feMergeNode')
                                .attr('in', 'SourceGraphic');
                    });
        });


// ---------------------------------------------------------------------------------------------- //


function TestMemory() {
    var sizeOfDomOld = sizeOfDom;
    sizeOfDom = d3.selectAll('*').size();
    if (sizeOfDom !== sizeOfDomOld) {
        console.log(String(sizeOfDom)+'\tsizeOfDom changed by '+String(sizeOfDom-sizeOfDomOld));
    }
    // if (!window.performance) { return; }
    // var usedJSHeapSizeOld = usedJSHeapSize;
    // usedJSHeapSize = performance.memory.usedJSHeapSize;
    // if (usedJSHeapSize !== usedJSHeapSizeOld) {
    //     console.log(String(usedJSHeapSize)+'\tusedJSHeapSize changed by '+String(usedJSHeapSize-usedJSHeapSizeOld));
    // }
}


function DebugApp() {
    body.selectAll('*').style('outline', '1px solid green');
    var verticalGuid = mainSVG.selectAll('rect.vertical-guide')
        .data([null]);
    verticalGuid = verticalGuid
        .enter().append('rect')
            .classed('vertical-guide', true)
            .merge(verticalGuid);
    verticalGuid
        .attr('x', mapObj.width()/2-1)
        .attr('y', 0)
        .attr('width', 2)
        .attr('height', mapObj.height())
        .style('fill', 'darkorange');
}


function InitializePage() {
    console.log('InitializePage');
    //
    mapObj = (new MapClass())
        .jsonData(window.usStatesJSON);
    //
    graphObj = (new GraphClass())
        .vertices(window.graphApril6JSON.nodes)
        .edges(window.graphApril6JSON.links)
        .UpdateGraph('InitializePage');
    //
    var csvDataURL = 'data/4_6_reduced_privatization_report_card.csv';
    // var csvDataURL = 'data/data-08-04-2017.csv';
    d3.csv(csvDataURL, function(error, csvData) {
        if (error) { return console.error(error); }
        mapObj.csvData(csvData);
        ResizePage();
        requestAnimationFrame(function() {
            body.style('opacity', 1);
        });
    });
}


function ResizePage() {
    animating = true;
    requestAnimationFrame(function() {
        animating = true;
        var source = 'ResizePage';
        var width = Math.max(minMapWidth, window.innerWidth || minMapWidth);
        var height = width/mapWidthHeightRatio;
        //
        stateSelected = 'National';
        hoverText.text('');
        mapObj
            .width(width)
            .height(height)
            .scale(width*mapScale)
            .UpdateMap(source);
        UpdateFilters(source);
        UpdateInfobox(source);
        UpdateHover(source);
        //
        graphObj
            .width(width)
            .height(height)
            .UpdateGraph(source);
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
        requestAnimationFrame(function() {
            animating = false;
        });
    });
}


function ToggleGrades(bool) {
    visibleGrades['A'] = visibleGrades['B'] = visibleGrades['C'] =
        visibleGrades['D'] = visibleGrades['F'] = bool;
}


function UpdateFilters(source) {
    // console.log('UpdateFilters '+source);
    var filtersWidth = mapObj.width();
    var filtersHeight = 40;
    filtersSVG
        .attr('width', filtersWidth)
        .attr('height', filtersHeight+3);
    var gradeDataArray = gradeArray.slice();
    // var gradeRectSize = (1/2)*(1/gradeDataArray.length)*filtersWidth;
    var gradeRectSize = filtersHeight - 2*vs.gradeMargin;
    //
    var gradeGs = filtersSVG.selectAll('g.grade-g')
        .data(gradeDataArray);
    gradeGs = gradeGs.enter().append('g')
        .attr('class', 'grade-g')
        .merge(gradeGs);
    gradeGs
        .attr('transform', function(d,i) {
            var tx = (1/2)*filtersWidth + (1/2-1/2*gradeDataArray.length+i)*filtersHeight;
            var ty = (1/2)*filtersHeight + 1;
            return 'translate('+tx+','+ty+')';
        })
        .on('mouseover', function(d) {
            if (animating === true) { return; }
            var source = 'gradeGs     mouseover '+d;
            ToggleGrades(false);
            visibleGrades[d] = true;
            mapObj.UpdateMap(source);
            UpdateFilters(source);
        })
        .on('mouseout', function(d) {
            if (animating === true) { return; }
            var source = 'gradeGs     mouseout  '+d;
            ToggleGrades(true);
            mapObj.UpdateMap(source);
            UpdateFilters(source);
        })
        .each(function(grade) {
            var gradeBG = d3.select(this).selectAll('rect.grade-bg')
                .data([grade]);
            gradeBG = gradeBG.enter().append('rect')
                .attr('class', 'grade-bg')
                .style('fill', vs.inactiveColor)
                .merge(gradeBG);
            gradeBG
                .attr('x', (-1/2)*filtersHeight)
                .attr('y', (-1/2)*filtersHeight)
                .attr('width', filtersHeight)
                .attr('height', filtersHeight-2);
            //
            var gradeRect = d3.select(this).selectAll('rect.grade-rect')
                .data([grade]);
            gradeRect = gradeRect
                .enter().append('rect')
                    .attr('class', 'grade-rect')
                    .style('fill', function(d) {
                        return vs.gradeColorScale(gradeScale(d));
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
                    return visibleGrades[d] === true ? vs.gradeColorScale(gradeScale(d)) : vs.inactiveColor;
                });
            //
            var gradeLabel = d3.select(this).selectAll('text.grade-label')
                .data([grade]);
            gradeLabel = gradeLabel.enter().append('text')
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
    // console.log('UpdateInfobox '+source);
    if (mapObj.csvData() === null) { return; }
    var stateDataRow;
    if (stateSelected === 'National') {
        stateDataRow = {};
    } else {
        stateDataRow = mapObj.csvData().filter(function(row) {
            return row.State === stateSelected;
        })[0];
    }
    statesSelect
        .attr('class', 'button-object')
        .on('change', function() {
            var source = 'statesSelect  change '+this.value;
            stateSelected = this.value;
            if (this.value === 'National') {
                hoverText.text('');
            } else {
                var d = mainSVG.selectAll('path.state-path')
                    .filter(function(d) { return d.properties.name === stateSelected; })
                    .datum();
                hoverText.text(stateSelected+': '+d.properties[mapObj.category()]);
            }
            mapObj.UpdateMap(source);
            UpdateInfobox(source);
            UpdateHover('change');
        });
    var statesSelectOptionsData = mapObj.csvData().slice();
    statesSelectOptionsData = statesSelectOptionsData
        .map(function(row) { return row.State; })
        .filter(function(state) { return state !== 'DC'; });
    statesSelectOptionsData.unshift('National');
    //
    var statesSelectOptions = statesSelect.selectAll('option.states-select-option')
        .data(statesSelectOptionsData);
    statesSelectOptions = statesSelectOptions.enter().append('option')
        .classed('states-select-option', true)
        .text(function(d) { return d; })
        .merge(statesSelectOptions);
    statesSelect.node().value = stateSelected;
}


function UpdateHover(source) {
    // console.log('UpdateHover', source);
    var hoverWidth = 0;
    if (hoverText.text() !== '') {
        hoverWidth = hoverText.node().getBBox().width+2*vs.hoverMargin;
    }
    hoverRect
        .attr('width', hoverWidth)
        .attr('x', -0.5*hoverWidth);
    hoverG
        .attr('transform', function() {
            var mouseX, mouseY;
            if (source === 'mouse') {
                mouseX = d3.mouse(mainSVG.node())[0];
                mouseY = d3.mouse(mainSVG.node())[1];
            } else {
                mouseX = mapObj.width()/2;
                mouseY = mapObj.height()/2;
            }
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


function MapClass() {
    var _width = 0;
    var _height = 0;
    var _scale = 1;
    var _category = 'Overall Grade';
    var _csvData = null;
    var _jsonData = null;
    var _path = null;
    //
    hoverHeight = parseFloat(mainSVG.style('font-size'))+2*vs.hoverMargin;
    hoverRect
        .attr('height', hoverHeight)
        .attr('y', -1*hoverHeight-5)
        .style('filter', 'url(#drop-shadow)');
    hoverText
        .attr('x', 0)
        .attr('y', -0.5*hoverHeight-5);
    //
    this.width = function(width) {
        if (!arguments.length) { return _width; }
        _width = width;
        return this;
    };
    //
    this.height = function(height) {
        if (!arguments.length) { return _height; }
        _height = height;
        return this;
    };
    //
    this.scale = function(scale) {
        if (!arguments.length) { return _scale; }
        _scale = scale;
        return this;
    };
    //
    this.category = function(category) {
        if (!arguments.length) { return _category; }
        _category = category;
        return this;
    };
    //
    this.jsonData = function(jsonData) {
        if (!arguments.length) { return _jsonData; }
        _jsonData = jsonData;
        return this;
    };
    //
    this.csvData = function(csvData) {
        if (!arguments.length) { return _csvData; }
        _csvData = csvData;
        return this;
    };
    //
    this.path = function(path) {
        if (!arguments.length) { return _path; }
        _path = path;
        return this;
    };
    //
    this.UpdateMap = function(source) {
        console.log('UpdateMap    ', source);
        if (!_csvData) {
            return;
        } else if (!_jsonData) {
            return;
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
            .on('mousemove', function() {
                if (animating === true) { return; }
                UpdateHover('mouse');
            })
            .attr('width', _width)
            .attr('height', _height);
        //
        mainBG
            .attr('width', _width)
            .attr('height', _height)
            .attr('x', 0)
            .attr('y', 0)
            .on('mouseover', function() {
                if (animating === true) { return; }
                var source = 'mainBG      mouseover';
                // if (isMobile === true) { return; }
                stateSelected = 'National';
                hoverText.text('');
                mapObj.UpdateMap(source);
                UpdateInfobox(source);
                UpdateHover('mouse');
            })
            .style('fill', visualizationContainer.style('background-color'));
        //
        var statePaths = statesG.selectAll('path.state-path')
            .data(_jsonData.features, function(d) { return d.properties.name; });
        statePaths = statePaths.enter().append('path')
            .classed('state-path', true)
            .on('mouseover', function(d) {
                if (animating === true) { return; }
                var source = 'statePaths  mouseover '+stateSelected;
                // if (isMobile === true) { return; }
                if (visibleGrades[d.properties[_category]] === false) {
                    stateSelected = 'National';
                    hoverText.text('');
                } else {
                    stateSelected = d.properties.name;
                    hoverText.text(d.properties.name+': '+d.properties[_category]);
                }
                mapObj.UpdateMap(source);
                UpdateInfobox(source);
                UpdateHover('mouse');
            })
            .attr('d', _path)
            .style('fill', function(d) {
                var grade = d.properties[_category];
                if (grade === undefined) { return '#ccc'; }
                if (grade === '_') { return vs.inactiveColor; }
                if (grade === 'Yes') { return vs.yesColor; }
                if (grade === 'No') { return vs.noColor; }
                return vs.gradeColorScale(gradeScale(grade));
            })
            .merge(statePaths);
        statePaths
            .classed('hovered', function(d) {
                return (stateSelected === d.properties.name);
            })
            // .transition().duration(animateDuration).ease(animateEase)
            .attr('d', _path)
            .style('fill', function(d) {
                var grade = d.properties[_category];
                if (grade === false) { return vs.inactiveColor; }
                if (grade === undefined) { return '#ccc'; }
                if (grade === '_') { return vs.inactiveColor; }
                if (grade === 'Yes') { return vs.yesColor; }
                if (grade === 'No') { return vs.noColor; }
                if (visibleGrades[grade] === false) { return vs.inactiveColor; }
                return vs.gradeColorScale(gradeScale(grade));
            });
        //
        TestMemory();
        //
        if (window.debugMode === true) { DebugApp(); }
        //
        return this;
    };
}


function GraphClass() {
    var _width = 0;
    var _height = 0;
    var _vertices = null;
    var _edges = null;
    var _simulation = d3.forceSimulation()
        .force('edge', d3.forceLink().distance(20).strength(0.5))
        .force('charge', d3.forceManyBody())
        .force('center', d3.forceCenter(_width, _height));
    //
    this.width = function(width) {
        if (!arguments.length) { return _width; }
        _width = width;
        return this;
    };
    //
    this.height = function(height) {
        if (!arguments.length) { return _height; }
        _height = height;
        return this;
    };
    //
    this.vertices = function(vertices) {
        if (!arguments.length) { return _vertices; }
        _vertices = vertices;
        return this;
    };
    //
    this.edges = function(edges) {
        if (!arguments.length) { return _edges; }
        _edges = edges;
        return this;
    };
    //
    this.simulation = function(simulation) {
        if (!arguments.length) { return _simulation; }
        _simulation = simulation;
        return this;
    };
    //
    this.UpdateGraph = function(source) {
        console.log('UpdateGraph  ', source);
        if (!_vertices || !_edges) { return; }
        //
        _simulation
            .force('center', d3.forceCenter(_width, _height));
        //
        // var verticeCircles = verticesG.selectAll('circle.vertice-circle')
        //     .data(_vertices, function(d) { return d.id; });
        // verticeCircles = verticeCircles.enter().append('circle')
        //     .classed('vertice-circle', true)
        //     .on('mouseover', function(d) {
        //         if (animating === true) { return; }
        //         var source = 'verticeCircles mouseover '+d.id;
        //         console.log(source);
        //     })
        //     .merge(verticeCircles);
        // verticeCircles
        //     // .transition().duration(animateDuration).ease(animateEase)
        //     .attr('cx', function(d) {
        //         return Math.random()*_width;
        //         // return _path.centroid(d)[0];
        //     })
        //     .attr('cy', function(d) {
        //         return Math.random()*_height;
        //         // return _path.centroid(d)[1];
        //     })
        //     .attr('r', 10)
        //     .style('opacity', function(d) {
        //         return 1;
        //     })
        //     .style('fill', function(d) {
        //         return 'lightgreen';
        //     });
        // //
        // var edgeLines = edgesG.selectAll('line.edge-line')
        //     .data(_jsonData.features, function(d) { return d.properties.name; });
        // edgeLines = edgeLines.enter().append('line')
        //     .classed('edge-line', true)
        //     .on('mouseover', function(d) {
        //         // console.log('mouseover', d);
        //     })
        //     .merge(edgeLines);
        // edgeLines
        //     // .transition().duration(animateDuration).ease(animateEase)
        //     .attr('cx', function(d) {
        //         return _path.centroid(d)[0];
        //     })
        //     .attr('cy', function(d) {
        //         return _path.centroid(d)[1];
        //     })
        //     .attr('r', 10)
        //     .style('opacity', function(d) {
        //         return 1;
        //     })
        //     .style('fill', function(d) {
        //         return 'lightgreen';
        //     });
        // //
        TestMemory();
        return this;
    };
}

/*
function ResetGraph() {
    var vertices, edges, verticeById;
    var dollarsScale = d3.scaleLinear()
        .range([0.5, 10]);
    var dollarsGivenScale = d3.scaleLinear()
        .range([3, 20]);
    var dollarsReceivedScale = d3.scaleLinear()
        .range([1, 10]);

    hybridMap();

    function hybridMap() {
        vertices = window.graphApril6JSON.nodes;
        edges = window.graphApril6JSON.links;
        verticeById = d3.map(vertices, function(d) { return d.id; });
        vertices.forEach(function(vertice) {
            vertice.dollarsGiven = 0;
            vertice.dollarsReceived = 0;
        });

        edges.forEach(function(edge) {
            edge.source = verticeById.get(edge.source);
            edge.target = verticeById.get(edge.target);
            edge.source.dollarsGiven += edge.dollars;
            edge.target.dollarsReceived += edge.dollars;
        });
        //         i = {
        //           report: parseInt(edge.report),
        //           dollars: parseInt(edge.dollars),
        //           month: edge.month,
        //           year: edge.year,  
        //         }; // intermediate node
        //     vertices.push(i);
        //     edges.push({ source: edge.source, target: i }, { source: i, target: edge.target });
        //     biedges.push([edge.source, i, edge.target]);

        dollarsScale.domain([
            d3.min(edges, function(edge) { return edge.dollars; }),
            d3.max(edges, function(edge) { return edge.dollars; })
        ]);
        dollarsGivenScale.domain([
            d3.min(vertices, function(vertice) { return vertice.dollarsGiven; }),
            d3.max(vertices, function(vertice) { return vertice.dollarsGiven; })
        ]);
        dollarsReceivedScale.domain([
            d3.min(vertices, function(vertice) { return vertice.dollarsReceived; }),
            d3.max(vertices, function(vertice) { return vertice.dollarsReceived; })
        ]);

        var edgeElements = edgesG.selectAll('line.link')
            .data(edges)
            .enter().append('line')
            // .enter().append('path')
            .style('stroke', 'black')
            .style('stroke-width', function(d) { return dollarsScale(d.dollars); })
            .attr('class', function(d) { return 'edge-path report' + d.report; });

        var nodeElements = verticesG.selectAll('circle.node')
            .data(vertices.filter(function(d) { return d.id; }))
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
            .nodes(vertices)
            .on('tick', ticked);

        simulation.force('edge')
            .links(edges);

        // function ticked() {
        //     edgeElements.attr('d', positionLink);
        //     vertice.attr('transform', positionNode);
        // }

        function ticked() {
            edgeElements
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
*/