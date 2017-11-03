// Tom Swisher
// tomswisherlabs@gmail.com
// https://github.com/tomswisher

/* globals d3, console, nodes */
/* jshint -W069, unused:false */

'use strict';

// -------------------------------------------------------------------------------------------------
// Event Listeners

window.onload = function() {
    d3.queue()
        .defer(d3.json, 'data/us-states-features.json')
        .defer(d3.json, 'data/nodes-edges-04-06-2017.json')
        .awaitAll(InitializePage);
};
window.onresize = function() {
    requestAnimationFrame(ResizePage);
};

// -------------------------------------------------------------------------------------------------
// Detected Settings

var isMobile = false;
if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    if (logs0) console.log('isMobile', isMobile = true);
}

// -------------------------------------------------------------------------------------------------
// Global Variables

var logs0 = true;
var logs1 = false;
var debugLayoutEnabled = false;
var mapObj = null;
var graphObj = null;
var sizeOfDOM = 0;
var stateSelected = '';
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

// -------------------------------------------------------------------------------------------------
// Global Selectors

var body = d3.select('body');
var box0 = d3.select('#box0');
var box1 = d3.select('#box1');
var mainSVG = body.select('#main-svg');
var mainBGRect = body.select('#main-bg-rect');
var statesG = body.select('#states-g');
var verticesG = body.select('#vertices-g');
var edgesG = body.select('#edges-g');
var hoverG = body.select('#hover-g');
var hoverRect = body.select('#hover-rect');
var hoverText = body.select('#hover-text');
var filtersSVG = body.select('#filters-svg');
var statesSelect = body.select('#states-select');
var infoSVG = body.select('#info-svg');
var infoImage = body.select('#info-image');
var defs = filtersSVG.append('defs');

// -------------------------------------------------------------------------------------------------
// Visual Styles

var vs = {};
vs.box0Width = null;
vs.box0WidthMin = 400;
vs.box1Width = null;
vs.box1WidthMin = 150;
vs.box1Height = null;
vs.box1HeightMin = 250;
vs.mapWidthHeightRatio = 1.7;
vs.mapProjectionScale = 1.3;
vs.statesSelectWidth = 100;
vs.filtersHeight = 40;
vs.stateSelectedOpacity = 0.3;
vs.stateNotClickedOpacity = 0.2;
vs.hoverMargin = 5;
vs.gradeMargin = 2.5;
vs.gradeRounded = false;
// /*BH1*/ vs.gradeColorArray = ['rgb(50,50,50)','rgb(28,44,160)','rgb(240,6,55)','rgb(251,204,12)','rgb(239,230,221)'];
// /*BH2*/ vs.gradeColorArray = ['rgb(240,243,247)','rgb(191,162,26)','rgb(20,65,132)','rgb(153,40,26)','rgb(34,34,34)'];
/*red*/ vs.gradeColorArray = ['#de2d26','#fb6a4a','#fc9272','#fcbba1','#fee5d9'];
vs.colorScale = d3.scaleQuantize()
    .domain([0, 5])
    .range(vs.gradeColorArray);

defs.append('filter')
    .attr('id', 'drop-shadow')
    .attr('height', '130%') // so the shadow is not clipped
    .attr('width', '120%')
    .each(function() {
        d3.select(this).append('feGaussianBlur')
            .attr('in', 'SourceAlpha') // opacity of source node
            .attr('stdDeviation', 2) // convolve with Gaussian
            .attr('result', 'blur');
        d3.select(this).append('feOffset')
            .attr('in', 'blur')
            .attr('dx', 2)
            .attr('dy', 2)
            .attr('result', 'offsetBlur');
        d3.select(this).append('feMerge')
            .each(function() {
                d3.select(this).append('feMergeNode')
                    .attr('in', 'offsetBlur');
                d3.select(this).append('feMergeNode')
                    .attr('in', 'SourceGraphic'); // source node is on top
            });
    });

// -------------------------------------------------------------------------------------------------
// Functions

function InitializePage(error, results) {
    var usStatesFeaturesJSON = results[0];
    var nodesEdgesJSON = results[1];
    mapObj = new MapClass();
    mapObj.mapFeatures(usStatesFeaturesJSON.features);
    mapObj.vertices(nodesEdgesJSON.nodes);
    mapObj.edges(nodesEdgesJSON.links);
    //
    vs.hoverHeight = parseFloat(mainSVG.style('font-size'))+2*vs.hoverMargin;
    hoverRect
        .attr('height', vs.hoverHeight)
        .attr('y', -1*vs.hoverHeight-vs.hoverMargin)
        .style('filter', 'url(#drop-shadow)');
    hoverText
        .attr('x', 0)
        .attr('y', -0.5*vs.hoverHeight-vs.hoverMargin);
    mainBGRect
        .on('mouseover', function() {
            var source = 'mainBGRect mouseover';
            stateSelected = '';
            hoverText.text('');
            mapObj.UpdateMap(source);
            UpdateStatesDropdown(source);
            UpdateHover('mouse');
        })
        .attr('x', 0)
        .attr('y', 0);
    filtersSVG
        .attr('width', 0)
        .attr('height', 0);
    statesSelect
        .style('width', vs.statesSelectWidth+'px');
    //
    ResizePage();
    setTimeout(function() {
        graphObj = new GraphClass();
        body.classed('loading', false);
    }, 0);
}

function MapClass() {
    var _verticeById = null;
    var _projection = d3.geoAlbersUsa();
    var _path = d3.geoPath();
    var _width = 0;
    this.width = function(_) {
        return arguments.length ? (_width = _, this) : _width;
    };
    var _height = 0;
    this.height = function(_) {
        return arguments.length ? (_height = _, this) : _height;
    };
    var _mapFeatures = null;
    this.mapFeatures = function(_) {
        return arguments.length ? (_mapFeatures = _, this) : _mapFeatures;
    };
    var _centroidByState = {};
    this.centroidByState = function(_) {
        return arguments.length ? (_centroidByState = _, this) : _centroidByState;
    };
    var _$GivenByState = {};
    this.$GivenByState = function(_) {
        return arguments.length ? (_$GivenByState = _, this) : _$GivenByState;
    };
    var _$ReceivedByState = {};
    this.$ReceivedByState = function(_) {
        return arguments.length ? (_$ReceivedByState = _, this) : _$ReceivedByState;
    };
    var _$GivenByStateScale = d3.scaleLinear().range([0, 5]);
    this.$GivenByStateScale = function(_) {
        return arguments.length ? (_$GivenByStateScale = _, this) : _$GivenByStateScale;
    };
    var _$ReceivedByStateScale = d3.scaleLinear().range([0, 5]);
    this.$ReceivedByStateScale = function(_) {
        return arguments.length ? (_$ReceivedByStateScale = _, this) : _$ReceivedByStateScale;
    };
    var _$EdgeScale = d3.scaleLinear().range([0.5, 10]);
    this.$EdgeScale = function(_) {
        return arguments.length ? (_$EdgeScale = _, this) : _$EdgeScale;
    };
    var _$GivenByVerticeScale = d3.scaleLinear().range([3, 20]);
    this.$GivenByVerticeScale = function(_) {
        return arguments.length ? (_$GivenByVerticeScale = _, this) : _$GivenByVerticeScale;
    };
    var _$ReceivedByVerticeScale = d3.scaleLinear().range([1, 10]);
    this.$ReceivedByVerticeScale = function(_) {
        return arguments.length ? (_$ReceivedByVerticeScale = _, this) : _$ReceivedByVerticeScale;
    };
    var _vertices = null;
    this.vertices = function(vertices) {
        if (!arguments.length) { return _vertices; }
        _vertices = vertices;
        _vertices.forEach(function(vertice) {
            vertice.$Given = 0;
            vertice.$Received = 0;
            _$GivenByState[vertice.state] = 0;
            _$ReceivedByState[vertice.state] = 0;
        });
        _verticeById = d3.map(_vertices, function(d) { return d.id; });
        return this;
    };
    var _edges = null;
    this.edges = function(edges) {
        if (!arguments.length) { return _edges; }
        _edges = edges;
        _edges.forEach(function(edge) {
            edge.source = _verticeById.get(edge.source);
            edge.target = _verticeById.get(edge.target);
            edge.source.$Given += edge.dollars;
            edge.target.$Received += edge.dollars;
            _$GivenByState[edge.source.state] += edge.dollars;
            _$ReceivedByState[edge.target.state] += edge.dollars;
        });
        return this;
    };
    this.UpdateMap = function(source) {
        var $GivenByStatesArray = Object.keys(_$GivenByState)
            .map(function(d) { return _$GivenByState[d]; });
        _$GivenByStateScale.domain([
            d3.max($GivenByStatesArray),
            d3.min($GivenByStatesArray)
        ]);
        var $ReceivedByStatesArray = Object.keys(_$ReceivedByState)
            .map(function(d) { return _$ReceivedByState[d]; });
        _$ReceivedByStateScale.domain([
            d3.min($ReceivedByStatesArray),
            d3.max($ReceivedByStatesArray)
        ]);
        _$GivenByVerticeScale.domain([
            d3.min(_vertices, function(vertice) { return vertice.$Given; }),
            d3.max(_vertices, function(vertice) { return vertice.$Given; })
        ]);
        _$ReceivedByVerticeScale.domain([
            d3.min(_vertices, function(vertice) { return vertice.$Received; }),
            d3.max(_vertices, function(vertice) { return vertice.$Received; })
        ]);
        _$EdgeScale.domain([
            d3.min(_edges, function(edge) { return edge.dollars; }),
            d3.max(_edges, function(edge) { return edge.dollars; })
        ]);
        //
        _projection
            .scale(_width*vs.mapProjectionScale)
            .translate([_width/2, _height/2]);
        _path
            .projection(_projection);
        //
        var statePaths = statesG.selectAll('path.state-path')
            .data(_mapFeatures, function(d) { return d.properties.ansi; });
        statePaths = statePaths.enter().append('path')
            .classed('state-path', true)
            .each(function(d) {
                d.$Given = parseInt(_$GivenByState[d.properties.ansi]);
                d.$Received = parseInt(_$ReceivedByState[d.properties.ansi]);
            })
            .on('mouseover', function(d) {
                // if (isMobile === true) { return; }
                stateSelected = d.properties.ansi;
                var source = 'statePaths mouseover '+stateSelected;
                hoverText.text(d.properties.ansi+': '+d.$Given+' '+d.$Received);
                mapObj.UpdateMap(source);
                UpdateStatesDropdown(source);
                UpdateHover('mouse');
            })
            .on('mousemove', function(d) {
                UpdateHover('mouse');
            })
            .attr('d', _path)
            .merge(statePaths);
        statePaths
            .each(function(d) {
                _centroidByState[d.properties.ansi] = _path.centroid(d);
            })
            .classed('inactive', function(d) {
                return isNaN(d.$Given) && isNaN(d.$Received);
            })
            .attr('d', _path)
            .style('opacity', function(d) {
                if (stateSelected === d.properties.ansi) { return vs.stateSelectedOpacity; }
                return 1;
            })
            .style('fill', function(d) {
                return vs.colorScale(_$GivenByStateScale(d.$Given));
            });
        //
        var verticeCircles = verticesG.selectAll('circle.vertice-circle')
            .data(_vertices);
        verticeCircles = verticeCircles.enter().append('circle')
            .classed('vertice-circle', true)
            .on('mouseover', function(d) {
                if (logs0) console.log('mouseover', d);
            })
        //     .merge(verticeCircles);
        // verticeCircles
            .each(function(d) {
                d.x = _centroidByState[d.state][0];
                d.y = _centroidByState[d.state][1];
            })
            .attr('cx', function(d) {
                return d.x;
            })
            .attr('cy', function(d) {
                return d.y;
            })
            .attr('r', function(d) {
                return _$GivenByVerticeScale(d.$Given);
            })
            .style('fill', function(d) {
                return vs.colorScale(_$GivenByStateScale(_$GivenByState[d.state]));
            });
        //
        var edgeLines = edgesG.selectAll('line.edge-line')
            .data(_edges);
        edgeLines = edgeLines.enter().append('line')
            .classed('edge-line', true)
            .on('mouseover', function(d) {
                if (logs1) console.log('mouseover', d);
            })
        //     .merge(edgeLines);
        // edgeLines
            .attr('x1', function(d) {
                return d.source.x;
            })
            .attr('y1', function(d) {
                return d.source.y;
            })
            .attr('x2', function(d) {
                return d.target.x;
            })
            .attr('y2', function(d) {
                return d.target.y;
            })
            .style('opacity', function(d) {
                var opacity = 1 - (1/5)*_$GivenByStateScale(d.source.$Given);
                console.log(opacity);
                return opacity;
            });
        //
        if (debugLayoutEnabled === true) { DebugMap(); }
        if (logs0) console.log('UpdateMap       '+(source.padEnd(35))+GetJSHeapSize()+GetDOMSize());
    };
}

function UpdateHover(source) {
    if (logs1) console.log('UpdateHover', source);
    var hoverWidth = 0;
    if (hoverText.text() !== '') {
        hoverWidth = hoverText.node().getBBox().width+2*vs.hoverMargin;
    }
    hoverRect
        .attr('width', hoverWidth)
        .attr('x', -0.5*hoverWidth);
    hoverG
        .attr('transform', function() {
            var tx, ty;
            if (source === 'mouse') {
                tx = d3.mouse(mainSVG.node())[0];
                ty = d3.mouse(mainSVG.node())[1];
            } else if (mapObj && mapObj.centroidByState()[stateSelected]) {
                tx = mapObj.centroidByState()[stateSelected][0];
                ty = mapObj.centroidByState()[stateSelected][1]+0.5*(vs.hoverHeight+2*vs.hoverMargin);
            } else {
                tx = mapObj.width()/2;
                ty = mapObj.height()/2;
            }
            if (tx < hoverWidth/2 + 1) {
                tx = hoverWidth/2 + 1;
            } else if (tx > parseInt(mainSVG.style('width')) - hoverWidth/2 - 1) {
                tx = parseInt(mainSVG.style('width')) - hoverWidth/2 - 1;
            }
            if (ty < vs.hoverHeight + 5 + 1) {
                ty = vs.hoverHeight + 5 + 1;
            }
            return 'translate('+tx+','+ty+')';
        });
}

function DebugMap() {
    body.selectAll('*').style('outline', '1px solid green');
    var verticalGuid = mainSVG.selectAll('rect.vertical-guide').data([null]);
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

function ToggleGrades(bool) {
    visibleGrades['A'] = visibleGrades['B'] = visibleGrades['C'] =
        visibleGrades['D'] = visibleGrades['F'] = bool;
}

function UpdateFilters(source) {
    if (logs1) console.log('UpdateFilters   '+source);
    var filtersWidth = mapObj.width();
    filtersSVG
        .attr('width', filtersWidth)
        .attr('height', vs.filtersHeight+3);
    var rectSize = vs.filtersHeight - 2*vs.gradeMargin;
    //
    var gradeArray = ['A','B','C','D','F'];
    var gradeGs = filtersSVG.selectAll('g.grade-g')
        .data(gradeArray);
    gradeGs = gradeGs.enter().append('g')
        .attr('class', 'grade-g')
        .merge(gradeGs);
    gradeGs
        .attr('transform', function(d,i) {
            var tx = (1/2)*filtersWidth + (1/2-1/2*gradeArray.length+i)*vs.filtersHeight;
            var ty = (1/2)*vs.filtersHeight + 1;
            return 'translate('+tx+','+ty+')';
        })
        .on('mouseover', function(d) {
            var source = 'gradeGs    mouseover '+d;
            ToggleGrades(false);
            visibleGrades[d] = true;
            mapObj.UpdateMap(source);
            UpdateFilters(source);
        })
        .on('mouseout', function(d) {
            var source = 'gradeGs    mouseout  '+d;
            ToggleGrades(true);
            mapObj.UpdateMap(source);
            UpdateFilters(source);
        })
        .each(function(grade) {
            var gradeBG = d3.select(this).selectAll('rect.grade-bg')
                .data([grade]);
            gradeBG = gradeBG.enter().append('rect')
                .attr('class', 'grade-bg')
                .merge(gradeBG);
            gradeBG
                .attr('x', (-1/2)*vs.filtersHeight)
                .attr('y', (-1/2)*vs.filtersHeight)
                .attr('width', vs.filtersHeight)
                .attr('height', vs.filtersHeight-2);
            //
            var gradeRect = d3.select(this).selectAll('rect.grade-rect')
                .data([grade]);
            gradeRect = gradeRect
                .enter().append('rect')
                    .attr('class', 'grade-rect')
                .merge(gradeRect)
                    .classed('inactive', function(d) {
                        return !visibleGrades[d];
                    })
                    .attr('x', -0.5*rectSize)
                    .attr('y', -0.5*rectSize)
                    .attr('width', rectSize)
                    .attr('height', rectSize)
                    .style('filter', function(d) {
                        return visibleGrades[d] ? 'url(#drop-shadow)' : null;
                    })
                    .style('fill', function(d) {
                        return vs.colorScale(gradeScale(d));
                    });
            //
            var gradeLabel = d3.select(this).selectAll('text.grade-label')
                .data([grade]);
            gradeLabel = gradeLabel
                .enter().append('text')
                    .attr('class', 'grade-label button-text')
                    .text(function(d) { return d; })
                .merge(gradeLabel)
                    .classed('inactive', function(d) {
                        return !visibleGrades[d];
                    });
        });
}

function UpdateStatesDropdown(source) {
    if (logs1) console.log('UpdateStatesDropdown '+source);
    var statesSelectOptionsData = Object.keys(mapObj.$GivenByState());
    statesSelectOptionsData.unshift('');
    statesSelect
        .attr('class', 'button-object')
        .on('change', function() {
            var source = 'statesSelect change '+this.value;
            stateSelected = this.value;
            if (stateSelected === '') {
                hoverText.text('');
            } else {
                var d = mainSVG.selectAll('path.state-path')
                    .filter(function(d) { return d.properties.ansi === stateSelected; })
                    .datum();
                hoverText.text(stateSelected+': '+d.$Given+' '+d.$Received);
            }
            mapObj.UpdateMap(source);
            UpdateStatesDropdown(source);
            UpdateHover(source);
        })
        .selectAll('option.states-select-option')
            .data(statesSelectOptionsData)
            .enter().append('option')
                .classed('states-select-option', true)
                .text(function(d) { return d; });
    statesSelect.node().value = stateSelected;
}

function UpdateInfoSVG(source) {
    if (logs1) console.log('UpdateInfoSVG   '+(source.padEnd(35)));
}

function ResizePage() {
    var source = 'ResizePage';
    var clientWidth = body.node().clientWidth;
    if (vs.box0WidthMin < clientWidth-vs.box1WidthMin) {
        vs.box0Width = clientWidth-vs.box1WidthMin;
        vs.box1Width = vs.box1WidthMin;
        vs.box1Height = vs.box1HeightMin;
    } else {
        vs.box0Width = vs.box0WidthMin;
        vs.box1Width = vs.box0WidthMin;
        vs.box1Height = vs.box1HeightMin;
    }
    box0
        .style('width', vs.box0Width+'px');
    box1
        .style('width', vs.box1Width+'px');
    mainSVG
        .attr('width', vs.box0Width)
        .attr('height', vs.box0Width/vs.mapWidthHeightRatio);
    mainBGRect
        .attr('width', vs.box0Width)
        .attr('height', vs.box0Width/vs.mapWidthHeightRatio);
    mapObj
        .width(vs.box0Width)
        .height(vs.box0Width/vs.mapWidthHeightRatio)
        .UpdateMap('ResizePage');
    if (graphObj !== null) {
        graphObj.UpdateGraph();
    }
    statesSelect
        .style('margin-left', (vs.box0Width - vs.statesSelectWidth)/2+'px')
        .style('margin-right', (vs.box0Width - vs.statesSelectWidth)/2+'px');
    infoSVG
        .attr('width', vs.box1Width)
        .attr('height', vs.box1Height);
    infoImage
        .attr('width', vs.box1Width)
        .attr('height', vs.box1Height);
    UpdateFilters(source);
    UpdateStatesDropdown(source);
    UpdateHover('event');
    UpdateInfoSVG(source);
}

function GetJSHeapSize() {
    if (!window.performance) { return ''.padStart(6); }
    return ((window.performance.memory.usedJSHeapSize/(1024*1024)).toFixed(2)+' Mb').padStart(13);
}

function GetDOMSize() {
    if (sizeOfDOM !== d3.selectAll('*').size()) {
        sizeOfDOM = d3.selectAll('*').size();
        return (sizeOfDOM+' nodes').padStart(13);
    } else {
        return '';
    }
}

function isolate(force, filter) {
    var initialize = force.initialize;
    force.initialize = function() {
        initialize.call(force, mapObj.vertices().filter(filter));
    };
    return force;
}

function GraphClass() {
    var that = this;
    // https://bl.ocks.org/mbostock/1095795
    // Modifying a Force Layout
    // https://bl.ocks.org/mbostock/b1f0ee970299756bc12d60aedf53c13b
    // Isolating Forces
    this.ticked = function() {
        verticesG.selectAll('circle.vertice-circle')
            .attr('cx', function(d) {
                return d.x;
            })
            .attr('cy', function(d) {
                return d.y;
            });
        edgesG.selectAll('line.edge-line')
            .attr('x1', function(d) {
                return mapObj.centroidByState()[d.source.state][0];
                // return d.source.x;
            })
            .attr('y1', function(d) {
                return mapObj.centroidByState()[d.source.state][1];
                // return d.source.y;
            })
            .attr('x2', function(d) {
                return mapObj.centroidByState()[d.target.state][0];
                // return d.target.x;
            })
            .attr('y2', function(d) {
                return mapObj.centroidByState()[d.target.state][1];
                // return d.target.y;
            });
    };
    //
    this.simulation = d3.forceSimulation(mapObj.vertices())
        .force('charge', d3.forceManyBody().strength(-0.3))
        .on('tick', this.ticked);
    Object.keys(mapObj.$GivenByState()).forEach(function(state) {
        var cX = mapObj.centroidByState()[state][0];
        var cY = mapObj.centroidByState()[state][1];
        that.simulation
            .force(state, isolate(d3.forceCenter(cX, cY), function(d) {
                return d.state === state;
            }));
    });
    //
    this.UpdateGraph = function() {
        console.log('UpdateGraph');
        Object.keys(mapObj.$GivenByState()).forEach(function(state) {
            var cX = mapObj.centroidByState()[state][0];
            var cY = mapObj.centroidByState()[state][1];
            that.simulation
                .force(state)
                    .x(cX)
                    .y(cY);
        });
        that.simulation
            // .alpha(0.1)
            .restart();
    };
}