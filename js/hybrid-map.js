// by Tom Swisher

/* global d3, console, graphApril6JSON */
/* jshint -W069, unused:false */
'use strict';

window.debugMode = false;
var minMapWidth = 300;
var mapRatio = 1.7;
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
var mapObj;
var mapFontSize, infoboxFontSize;
var sizeOfDOM = 0;
var stateSelected = 'National';
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

vs.stateSelectedOpacity = 0.3;
vs.stateNotClickedOpacity = 0.2;
vs.hoverMargin = 5;

window.onload = InitializePage;
window.onresize = ResizePage;

// Selectors
var body = d3.select('body');
var filtersContainer = body.select('#filters-container');
var filtersSVG = body.select('#filters-svg');
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
    mapFontSize = parseFloat(mainSVG.style('font-size'));
    hoverHeight = mapFontSize+2*vs.hoverMargin;
    hoverRect
        .attr('height', hoverHeight)
        .attr('y', -1*hoverHeight-5)
        .style('filter', 'url(#drop-shadow)');
    hoverText
        .attr('x', 0)
        .attr('y', -0.5*hoverHeight-5);
    var csvDataURL = 'data/4_6_reduced_privatization_report_card.csv';
    // var csvDataURL = 'data/data-08-04-2017.csv';
    mapObj = new MapClass();
    mapObj.jsonData(window.usStatesJSON);
    mapObj.csvData(csvDataURL, function() {
        ResizePage();
        requestAnimationFrame(function() {
            body.style('opacity', 1);
        });
    });
}


function ToggleGrades(bool) {
    visibleGrades['A'] = visibleGrades['B'] = visibleGrades['C'] =
        visibleGrades['D'] = visibleGrades['F'] = bool;
}


function UpdateFilters(source) {
    console.log('UpdateFilters '+source);
    var filtersWidth = mapObj.width();
    var filtersHeight = 40;
    filtersSVG
        .attr('width', filtersWidth)
        .attr('height', filtersHeight+3)
        // .transition().duration(animateDuration).ease(animateEase)
        .style('opacity', function() {
            return mapObj.category() !== 'Overall Grade' ? 0 : 1;
        });
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
            var source = 'gradeGs      mouseover '+d;
            ToggleGrades(false);
            visibleGrades[d] = true;
            mapObj.UpdateMap(source);
            UpdateFilters(source);
        })
        .on('mouseout', function(d) {
            var source = 'gradeGs      mouseout  '+d;
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
    console.log('UpdateInfobox '+source);
    if (!mapObj.categoryNames() || !mapObj.csvData()) { return; }
    var stateDataRow;
    if (stateSelected === 'National') {
        stateDataRow = {};
    } else {
        stateDataRow = mapObj.csvData().filter(function(row) {
            return row.State === stateSelected;
        })[0];
    }
    var categoryRowsData = mapObj.categoryNames().slice();
    statesSelect
        .attr('class', 'button-object')
        .on('change', function() {
            var source = 'statesSelect change '+this.value;
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


function ResizePage() {
    requestAnimationFrame(function() {
        var width = Math.max(minMapWidth, window.innerWidth || minMapWidth);
        var height = width/mapRatio;
        mapObj
            .width(width)
            .height(height)
            .scale(width*1.2)
            .UpdateMap('ResizePage');
        UpdateFilters();
        UpdateInfobox('CheckSize');
        UpdateHover('resize');
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
    });
}


function MapClass() {
    var _width = 0;
    var _height = 0;
    var _scale = 1000;
    var _category = 'Overall Grade';
    var _csvData = null;
    var _jsonData = null;
    var _categoryNames = null;
    var _path = null;

    this.categoryNames = function(categoryNames) {
        if (!arguments.length) { return _categoryNames; }
        _categoryNames = categoryNames;
        return this;
    };

    this.category = function(category) {
        if (!arguments.length) { return _category; }
        _category = category;
        return this;
    };

    this.width = function(width) {
        if (!arguments.length) { return _width; }
        _width = width;
        return this;
    };
    
    this.height = function(height) {
        if (!arguments.length) { return _height; }
        _height = height;
        return this;
    };

    this.scale = function(scale) {
        if (!arguments.length) { return _scale; }
        _scale = scale;
        return this;
    };

    this.path = function(path) {
        if (!arguments.length) { return _path; }
        _path = path;
        return this;
    };

    this.jsonData = function(jsonData) {
        if (!arguments.length) { return _jsonData; }
        _jsonData = jsonData;
        return this;
    };

    this.csvData = function(csvDataURL, callback) {
        if (!arguments.length) { return _csvData; }
        var that = this;
        d3.csv(csvDataURL, function(csvData) {
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

    this.UpdateMap = function(source) {
        console.log('UpdateMap    ', source);
        if (!_csvData) {
            return;
        } else if (!_jsonData) {
            return;
        }
        var that = this;
        isMobile = false;
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) { isMobile = true; }
        if (isMobile) { console.log('isMobile'); }
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
                var source = 'mainBG     mouseover';
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
                var source = 'statePaths mouseover '+stateSelected;
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
                return colorScale(gradeScale(grade));
            })
            .merge(statePaths);
        statePaths
            // .transition().duration(animateDuration).ease(animateEase)
            .attr('d', _path)
            .style('opacity', function(d) {
                if (stateSelected === d.properties.name) { return vs.stateSelectedOpacity; }
                return 1;
            })
            .style('fill', function(d) {
                var grade = d.properties[_category];
                if (grade === false) { return vs.inactiveColor; }
                if (grade === undefined) { return '#ccc'; }
                if (grade === '_') { return vs.inactiveColor; }
                if (grade === 'Yes') { return vs.yesColor; }
                if (grade === 'No') { return vs.noColor; }
                if (visibleGrades[grade] === false) { return vs.inactiveColor; }
                return colorScale(gradeScale(grade));
            });
        //
        var vertexCircles = verticesG.selectAll('circle.vertex-circle')
            .data(_jsonData.features, function(d) { return d.properties.name; });
        vertexCircles = vertexCircles.enter().append('circle')
            .classed('vertex-circle', true)
            .on('mouseover', function(d) {
                // console.log('mouseover', d);
            })
            .merge(vertexCircles);
        vertexCircles
            // .transition().duration(animateDuration).ease(animateEase)
            .attr('cx', function(d) {
                return _path.centroid(d)[0];
            })
            .attr('cy', function(d) {
                return _path.centroid(d)[1];
            })
            .attr('r', 10)
            .style('opacity', function(d) {
                return 1;
            })
            .style('fill', function(d) {
                return 'lightgreen';
            });
        //
        var oldSizeOfDom = sizeOfDOM;
        sizeOfDOM = d3.selectAll('*').size();
        if (sizeOfDOM !== oldSizeOfDom) {
            console.log('sizeOfDOM='+String(sizeOfDOM)+' changed by '+String(sizeOfDOM-oldSizeOfDom));
        }
        // DEBUG
        if (window.debugMode === true) {
            body.selectAll('*').style('outline', '1px solid green');
            var verticalGuid = mainSVG.selectAll('rect.vertical-guide')
                .data([null]);
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
    var _width = Math.max(minMapWidth, window.innerWidth || minMapWidth);
    var _height = _width/mapRatio;
    this._simulation = d3.forceSimulation()
        .force('edge', d3.forceLink().distance(20).strength(0.5))
        .force('charge', d3.forceManyBody())
        .force('center', d3.forceCenter(_width/2, _height/2));
    return this;
}


function ResetGraph() {
    var vertices, edges, vertexById;
    var dollarsScale = d3.scaleLinear()
        .range([0.5, 10]);
    var dollarsGivenScale = d3.scaleLinear()
        .range([3, 20]);
    var dollarsReceivedScale = d3.scaleLinear()
        .range([1, 10]);

    hybridMap();

    function hybridMap() {
        vertices = graphApril6JSON.nodes;
        edges = graphApril6JSON.links;
        vertexById = d3.map(vertices, function(d) { return d.id; });
        vertices.forEach(function(vertex) {
            vertex.dollarsGiven = 0;
            vertex.dollarsReceived = 0;
        });

        edges.forEach(function(edge) {
            edge.source = vertexById.get(edge.source);
            edge.target = vertexById.get(edge.target);
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
            d3.min(vertices, function(vertex) { return vertex.dollarsGiven; }),
            d3.max(vertices, function(vertex) { return vertex.dollarsGiven; })
        ]);
        dollarsReceivedScale.domain([
            d3.min(vertices, function(vertex) { return vertex.dollarsReceived; }),
            d3.max(vertices, function(vertex) { return vertex.dollarsReceived; })
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
        //     vertex.attr('transform', positionNode);
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