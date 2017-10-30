// Tom Swisher
// tomswisherlabs@gmail.com
// https://github.com/tomswisher

/* globals d3, console */
/* jshint -W069, unused:false */

'use strict';

// -------------------------------------------------------------------------------------------------
// Event Listeners

window.onload = function () {
    d3.queue().defer(d3.json, 'data/us-states-features.json').defer(d3.json, 'data/nodes-edges-04-06-2017.json').awaitAll(InitializePage);
};
window.onresize = ResizePage;

// -------------------------------------------------------------------------------------------------
// Detected Settings

var isMobile = false;
if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    console.log('isMobile', isMobile = true);
}

// -------------------------------------------------------------------------------------------------
// Global Variables

var debugLayoutEnabled = false;
var mapWidthHeightRatio = 1.7;
var mapProjectionScale = 1.2;
var totalWidthMin = 400;
var statesSelectWidth = 100;
var infoSVGWidth = 0;
var infoSVGHeight = 0;
var mapObj = null;
var sizeOfDOM = 0;
var stateSelected = 'National';
var gradeArray = ['A', 'B', 'C', 'D', 'F'];
var visibleGrades = { 'A': true, 'B': true, 'C': true, 'D': true, 'F': true };
var gradeScale = function gradeScale(letter) {
    switch (letter) {
        case 'A':
            return 4;
        case 'B':
            return 3;
        case 'C':
            return 2;
        case 'D':
            return 1;
        case 'F':
            return 0;
        default:
            return NaN;
    }
};

// -------------------------------------------------------------------------------------------------
// Global Selectors

var body = d3.select('body');
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
var defs = filtersSVG.append('defs');

// -------------------------------------------------------------------------------------------------
// Visual Styles

var vs = {};
vs.filtersHeight = 40;
vs.stateSelectedOpacity = 0.3;
vs.stateNotClickedOpacity = 0.2;
vs.hoverMargin = 5;
vs.gradeMargin = 2.5;
vs.gradeRounded = false;
// /*BH1*/ vs.gradeColorArray = ['rgb(50,50,50)','rgb(28,44,160)','rgb(240,6,55)','rgb(251,204,12)','rgb(239,230,221)'];
// /*BH2*/ vs.gradeColorArray = ['rgb(240,243,247)','rgb(191,162,26)','rgb(20,65,132)','rgb(153,40,26)','rgb(34,34,34)'];
/*red*/vs.gradeColorArray = ['#de2d26', '#fb6a4a', '#fc9272', '#fcbba1', '#fee5d9'];
vs.colorScale = d3.scaleQuantize().domain([0, 5]).range(vs.gradeColorArray);

defs.append('filter').attr('id', 'drop-shadow').attr('height', '130%') // so the shadow is not clipped
.attr('width', '120%').each(function () {
    d3.select(this).append('feGaussianBlur').attr('in', 'SourceAlpha') // opacity of source node
    .attr('stdDeviation', 2) // convolve with Gaussian
    .attr('result', 'blur');
    d3.select(this).append('feOffset').attr('in', 'blur').attr('dx', 2).attr('dy', 2).attr('result', 'offsetBlur');
    d3.select(this).append('feMerge').each(function () {
        d3.select(this).append('feMergeNode').attr('in', 'offsetBlur');
        d3.select(this).append('feMergeNode').attr('in', 'SourceGraphic'); // source node is on top
    });
});

// -------------------------------------------------------------------------------------------------
// Functions

function InitializePage(error, results) {
    body.classed('loading', false);
    var usStatesFeaturesJSON = results[0];
    var nodesEdgesJSON = results[1];
    vs.hoverHeight = parseFloat(mainSVG.style('font-size')) + 2 * vs.hoverMargin;
    hoverRect.attr('height', vs.hoverHeight).attr('y', -1 * vs.hoverHeight - vs.hoverMargin).style('filter', 'url(#drop-shadow)');
    hoverText.attr('x', 0).attr('y', -0.5 * vs.hoverHeight - vs.hoverMargin);
    mainBGRect.on('mouseover', function () {
        var source = 'mainBGRect mouseover';
        stateSelected = 'National';
        hoverText.text('');
        mapObj.UpdateMap(source);
        UpdateStatesDropdown(source);
        UpdateHover('mouse');
    }).attr('x', 0).attr('y', 0);
    filtersSVG.attr('width', 0).attr('height', 0);
    statesSelect.style('width', statesSelectWidth + 'px');
    mapObj = new MapClass();
    mapObj.mapFeatures(usStatesFeaturesJSON.features);
    mapObj.vertices(nodesEdgesJSON.nodes);
    mapObj.edges(nodesEdgesJSON.links);
    ResizePage();
}

function MapClass() {
    var _verticeById = null;
    var _projection = d3.geoAlbersUsa();
    var _path = d3.geoPath();
    var _width = 0;
    this.width = function (_) {
        return arguments.length ? (_width = _, this) : _width;
    };
    var _height = 0;
    this.height = function (_) {
        return arguments.length ? (_height = _, this) : _height;
    };
    var _mapFeatures = null;
    this.mapFeatures = function (_) {
        return arguments.length ? (_mapFeatures = _, this) : _mapFeatures;
    };
    var _centroidByState = {};
    this.centroidByState = function (_) {
        return arguments.length ? (_centroidByState = _, this) : _centroidByState;
    };
    var _$GivenByState = {};
    this.$GivenByState = function (_) {
        return arguments.length ? (_$GivenByState = _, this) : _$GivenByState;
    };
    var _$ReceivedByState = {};
    this.$ReceivedByState = function (_) {
        return arguments.length ? (_$ReceivedByState = _, this) : _$ReceivedByState;
    };
    var _$GivenByStateScale = d3.scaleLinear().range([0, 5]);
    this.$GivenByStateScale = function (_) {
        return arguments.length ? (_$GivenByStateScale = _, this) : _$GivenByStateScale;
    };
    var _$ReceivedByStateScale = d3.scaleLinear().range([0, 5]);
    this.$ReceivedByStateScale = function (_) {
        return arguments.length ? (_$ReceivedByStateScale = _, this) : _$ReceivedByStateScale;
    };
    var _$EdgeScale = d3.scaleLinear().range([0.5, 10]);
    this.$EdgeScale = function (_) {
        return arguments.length ? (_$EdgeScale = _, this) : _$EdgeScale;
    };
    var _$GivenByVerticeScale = d3.scaleLinear().range([3, 20]);
    this.$GivenByVerticeScale = function (_) {
        return arguments.length ? (_$GivenByVerticeScale = _, this) : _$GivenByVerticeScale;
    };
    var _$ReceivedByVerticeScale = d3.scaleLinear().range([1, 10]);
    this.$ReceivedByVerticeScale = function (_) {
        return arguments.length ? (_$ReceivedByVerticeScale = _, this) : _$ReceivedByVerticeScale;
    };
    var _vertices = null;
    this.vertices = function (vertices) {
        if (!arguments.length) {
            return _vertices;
        }
        _vertices = vertices;
        _vertices.forEach(function (vertice) {
            vertice.$Given = 0;
            vertice.$Received = 0;
            _$GivenByState[vertice.state] = 0;
            _$ReceivedByState[vertice.state] = 0;
        });
        _verticeById = d3.map(_vertices, function (d) {
            return d.id;
        });
        return this;
    };
    var _edges = null;
    this.edges = function (edges) {
        if (!arguments.length) {
            return _edges;
        }
        _edges = edges;
        _edges.forEach(function (edge) {
            edge.source = _verticeById.get(edge.source);
            edge.target = _verticeById.get(edge.target);
            edge.source.$Given += edge.dollars;
            edge.target.$Received += edge.dollars;
            _$GivenByState[edge.source.state] += edge.dollars;
            _$ReceivedByState[edge.target.state] += edge.dollars;
        });
        return this;
    };
    this.UpdateMap = function (source) {
        var $GivenByStatesArray = Object.keys(_$GivenByState).map(function (d) {
            return _$GivenByState[d];
        });
        _$GivenByStateScale.domain([d3.min($GivenByStatesArray), d3.max($GivenByStatesArray)]);
        var $ReceivedByStatesArray = Object.keys(_$ReceivedByState).map(function (d) {
            return _$ReceivedByState[d];
        });
        _$ReceivedByStateScale.domain([d3.min($ReceivedByStatesArray), d3.max($ReceivedByStatesArray)]);
        _$GivenByVerticeScale.domain([d3.min(_vertices, function (vertice) {
            return vertice.$Given;
        }), d3.max(_vertices, function (vertice) {
            return vertice.$Given;
        })]);
        _$ReceivedByVerticeScale.domain([d3.min(_vertices, function (vertice) {
            return vertice.$Received;
        }), d3.max(_vertices, function (vertice) {
            return vertice.$Received;
        })]);
        _$EdgeScale.domain([d3.min(_edges, function (edge) {
            return edge.dollars;
        }), d3.max(_edges, function (edge) {
            return edge.dollars;
        })]);
        //
        _projection.scale(_width * mapProjectionScale).translate([_width / 2, _height / 2]);
        _path.projection(_projection);
        //
        var statePaths = statesG.selectAll('path.state-path').data(_mapFeatures, function (d) {
            return d.properties.name;
        });
        statePaths = statePaths.enter().append('path').classed('state-path', true).each(function (d) {
            d.$Given = parseInt(_$GivenByState[d.properties.ansi]);
            d.$Received = parseInt(_$ReceivedByState[d.properties.ansi]);
        }).on('mouseover', function (d) {
            // if (isMobile === true) { return; }
            stateSelected = d.properties.name;
            var source = 'statePaths mouseover ' + stateSelected;
            hoverText.text(d.properties.name + ': ' + d.$Given + ' ' + d.$Received);
            mapObj.UpdateMap(source);
            UpdateStatesDropdown(source);
            UpdateHover('mouse');
        }).on('mousemove', function (d) {
            UpdateHover('mouse');
        }).attr('d', _path).merge(statePaths);
        statePaths.each(function (d) {
            _centroidByState[d.properties.name] = _path.centroid(d);
            _centroidByState[d.properties.ansi] = _path.centroid(d);
        }).classed('inactive', function (d) {
            return isNaN(d.$Given) && isNaN(d.$Received);
        }).attr('d', _path).style('opacity', function (d) {
            if (stateSelected === d.properties.name) {
                return vs.stateSelectedOpacity;
            }
            return 1;
        }).style('fill', function (d) {
            return vs.colorScale(d.$Given);
        });
        //
        var verticeCircles = verticesG.selectAll('circle.vertice-circle').data(_vertices);
        verticeCircles = verticeCircles.enter().append('circle').classed('vertice-circle', true).on('mouseover', function (d) {
            // console.log('mouseover', d);
        }).merge(verticeCircles);
        verticeCircles.each(function (d) {
            d.x = _centroidByState[d.state][0];
            d.y = _centroidByState[d.state][1];
        }).attr('cx', function (d) {
            return d.x;
        }).attr('cy', function (d) {
            return d.y;
        }).attr('r', function (d) {
            return _$GivenByVerticeScale(d.$Given);
        });
        //
        var edgeLines = edgesG.selectAll('line.edge-line').data(_edges);
        edgeLines = edgeLines.enter().append('line').classed('edge-line', true).on('mouseover', function (d) {
            // console.log('mouseover', d);
        }).merge(edgeLines);
        edgeLines.attr('x1', function (d) {
            return d.source.x;
        }).attr('y1', function (d) {
            return d.source.y;
        }).attr('x2', function (d) {
            return d.target.x;
        }).attr('y2', function (d) {
            return d.target.y;
        });
        //
        if (debugLayoutEnabled === true) {
            DebugMap();
        }
        console.log('UpdateMap       ' + source.padEnd(35) + GetJSHeapSize() + GetDOMSize());
    };
}

function UpdateHover(source) {
    // console.log('UpdateHover', source);
    var hoverWidth = 0;
    if (hoverText.text() !== '') {
        hoverWidth = hoverText.node().getBBox().width + 2 * vs.hoverMargin;
    }
    hoverRect.attr('width', hoverWidth).attr('x', -0.5 * hoverWidth);
    hoverG.attr('transform', function () {
        var tx, ty;
        if (source === 'mouse') {
            tx = d3.mouse(mainSVG.node())[0];
            ty = d3.mouse(mainSVG.node())[1];
        } else if (mapObj && mapObj.centroidByState()[stateSelected]) {
            tx = mapObj.centroidByState()[stateSelected][0];
            ty = mapObj.centroidByState()[stateSelected][1] + 0.5 * (vs.hoverHeight + 2 * vs.hoverMargin);
        } else {
            tx = mapObj.width() / 2;
            ty = mapObj.height() / 2;
        }
        if (tx < hoverWidth / 2 + 1) {
            tx = hoverWidth / 2 + 1;
        } else if (tx > parseInt(mainSVG.style('width')) - hoverWidth / 2 - 1) {
            tx = parseInt(mainSVG.style('width')) - hoverWidth / 2 - 1;
        }
        if (ty < vs.hoverHeight + 5 + 1) {
            ty = vs.hoverHeight + 5 + 1;
        }
        return 'translate(' + tx + ',' + ty + ')';
    });
}

function DebugMap() {
    body.selectAll('*').style('outline', '1px solid green');
    var verticalGuid = mainSVG.selectAll('rect.vertical-guide').data([null]);
    verticalGuid = verticalGuid.enter().append('rect').classed('vertical-guide', true).merge(verticalGuid);
    verticalGuid.attr('x', mapObj.width() / 2 - 1).attr('y', 0).attr('width', 2).attr('height', mapObj.height()).style('fill', 'darkorange');
}

function ToggleGrades(bool) {
    visibleGrades['A'] = visibleGrades['B'] = visibleGrades['C'] = visibleGrades['D'] = visibleGrades['F'] = bool;
}

function UpdateFilters(source) {
    console.log('UpdateFilters   ' + source);
    var filtersWidth = mapObj.width();
    filtersSVG.attr('width', filtersWidth).attr('height', vs.filtersHeight + 3);
    var gradeDataArray = gradeArray.slice();
    var rectSize = vs.filtersHeight - 2 * vs.gradeMargin;
    //
    var gradeGs = filtersSVG.selectAll('g.grade-g').data(gradeDataArray);
    gradeGs = gradeGs.enter().append('g').attr('class', 'grade-g').merge(gradeGs);
    gradeGs.attr('transform', function (d, i) {
        var tx = 1 / 2 * filtersWidth + (1 / 2 - 1 / 2 * gradeDataArray.length + i) * vs.filtersHeight;
        var ty = 1 / 2 * vs.filtersHeight + 1;
        return 'translate(' + tx + ',' + ty + ')';
    }).on('mouseover', function (d) {
        var source = 'gradeGs    mouseover ' + d;
        ToggleGrades(false);
        visibleGrades[d] = true;
        mapObj.UpdateMap(source);
        UpdateFilters(source);
    }).on('mouseout', function (d) {
        var source = 'gradeGs    mouseout  ' + d;
        ToggleGrades(true);
        mapObj.UpdateMap(source);
        UpdateFilters(source);
    }).each(function (grade) {
        var gradeBG = d3.select(this).selectAll('rect.grade-bg').data([grade]);
        gradeBG = gradeBG.enter().append('rect').attr('class', 'grade-bg').merge(gradeBG);
        gradeBG.attr('x', -1 / 2 * vs.filtersHeight).attr('y', -1 / 2 * vs.filtersHeight).attr('width', vs.filtersHeight).attr('height', vs.filtersHeight - 2);
        //
        var gradeRect = d3.select(this).selectAll('rect.grade-rect').data([grade]);
        gradeRect = gradeRect.enter().append('rect').attr('class', 'grade-rect').merge(gradeRect).classed('inactive', function (d) {
            return !visibleGrades[d];
        }).attr('x', -0.5 * rectSize).attr('y', -0.5 * rectSize).attr('width', rectSize).attr('height', rectSize).style('filter', function (d) {
            return visibleGrades[d] ? 'url(#drop-shadow)' : null;
        }).style('fill', function (d) {
            return vs.colorScale(gradeScale(d));
        });
        //
        var gradeLabel = d3.select(this).selectAll('text.grade-label').data([grade]);
        gradeLabel = gradeLabel.enter().append('text').attr('class', 'grade-label button-text').text(function (d) {
            return d;
        }).merge(gradeLabel).classed('inactive', function (d) {
            return !visibleGrades[d];
        });
    });
}

function UpdateStatesDropdown(source) {
    // console.log('UpdateStatesDropdown '+source);
    var statesSelectOptionsData = Object.keys(mapObj.$GivenByState());
    statesSelectOptionsData.unshift('National');
    statesSelect.attr('class', 'button-object').on('change', function () {
        var source = 'statesSelect change ' + this.value;
        stateSelected = this.value;
        if (stateSelected === 'National') {
            hoverText.text('');
        } else {
            var d = mainSVG.selectAll('path.state-path').filter(function (d) {
                return d.properties.name === stateSelected;
            }).datum();
            hoverText.text(stateSelected + ': ' + d.$Given + ' ' + d.$Received);
        }
        mapObj.UpdateMap(source);
        UpdateStatesDropdown(source);
        UpdateHover('event');
    }).selectAll('option.states-select-option').data(statesSelectOptionsData).enter().append('option').classed('states-select-option', true).text(function (d) {
        return d;
    });
    statesSelect.node().value = stateSelected;
}

function UpdateInfoSVG() {
    //    
}

function ResizePage() {
    requestAnimationFrame(function () {
        var totalWidth = Math.max(totalWidthMin, body.node().clientWidth);
        var totalHeight = totalWidth / mapWidthHeightRatio;
        mainSVG.attr('width', totalWidth - infoSVGWidth).attr('height', totalHeight);
        mainBGRect.attr('width', totalWidth - infoSVGWidth).attr('height', totalHeight);
        mapObj.width(totalWidth - infoSVGWidth).height(totalHeight).UpdateMap('ResizePage');
        statesSelect.style('margin-left', (totalWidth - infoSVGWidth - statesSelectWidth) / 2 + 'px').style('margin-right', (totalWidth - infoSVGWidth - statesSelectWidth) / 2 + 'px');
        infoSVG.attr('width', infoSVGWidth).attr('height', infoSVGHeight);
        UpdateFilters('ResizePage');
        UpdateStatesDropdown('CheckSize');
        UpdateHover('event');
    });
}

function GetJSHeapSize() {
    if (!window.performance) {
        return ''.padStart(6);
    }
    return ((window.performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(2) + ' Mb').padStart(13);
}

function GetDOMSize() {
    if (sizeOfDOM !== d3.selectAll('*').size()) {
        sizeOfDOM = d3.selectAll('*').size();
        return (sizeOfDOM + ' nodes').padStart(13);
    } else {
        return '';
    }
}

// function GraphObject() {
//     var _width = Math.max(totalWidthMin, window.innerWidth || totalWidthMin);
//     var _height = _width/mapWidthHeightRatio;
//     this._simulation = d3.forceSimulation()
//         .force('edge', d3.forceLink().distance(20).strength(0.5))
//         .force('charge', d3.forceManyBody())
//         .force('center', d3.forceCenter(_width/2, _height/2));
//     return this;
// }

// function ResetGraph() {
//     var vertices, edges, verticeById;
//     var $EdgeScale = d3.scaleLinear()
//         .range([0.5, 10]);
//     var $GivenByVerticeScale = d3.scaleLinear()
//         .range([3, 20]);
//     var $ReceivedByVerticeScale = d3.scaleLinear()
//         .range([1, 10]);

//     hybridMap();

//     function hybridMap() {
//         vertices = graphApril6JSON.nodes;
//         edges    = graphApril6JSON.links;

//         verticeById = d3.map(vertices, function(d) { return d.id; });

//         vertices.forEach(function(vertice) {
//             vertice.$Given = 0;
//             vertice.$Received = 0;
//         });

//         edges.forEach(function(edge) {
//             edge.source = verticeById.get(edge.source);
//             edge.target = verticeById.get(edge.target);
//             edge.source.$Given += edge.dollars;
//             edge.target.$Received += edge.dollars;
//         });

//         $EdgeScale.domain([
//             d3.min(edges, function(edge) { return edge.dollars; }),
//             d3.max(edges, function(edge) { return edge.dollars; })
//         ]);
//         $GivenByVerticeScale.domain([
//             d3.min(vertices, function(vertice) { return vertice.$Given; }),
//             d3.max(vertices, function(vertice) { return vertice.$Given; })
//         ]);
//         $ReceivedByVerticeScale.domain([
//             d3.min(vertices, function(vertice) { return vertice.$Received; }),
//             d3.max(vertices, function(vertice) { return vertice.$Received; })
//         ]);

//         var edgeElements = edgesG.selectAll('line.link')
//             .data(edges)
//             .enter().append('line')
//             // .enter().append('path')
//             .style('stroke', 'black')
//             .style('stroke-width', function(d) { return $EdgeScale(d.$); })
//             .attr('class', function(d) { return 'edge-path report' + d.report; });

//         var nodeElements = verticesG.selectAll('circle.node')
//             .data(vertices.filter(function(d) { return d.id; }))
//             .enter().append('circle')
//             .attr('class', function(d) { return 'node ' + d.state; })
//             .attr('r', function(d) { return $GivenByVerticeScale(d.$Given); })
//             .attr('fill', function() { return 'green'; })
//             .call(d3.drag()
//                 .on('start', dragstarted)
//                 .on('drag', dragged)
//                 .on('end', dragended));

//         nodeElements.append('title')
//             .text(function(d) { return d.id; });

//         simulation
//             .nodes(vertices)
//             .on('tick', ticked);

//         simulation.force('edge')
//             .links(edges);

//         // function ticked() {
//         //     edgeElements.attr('d', positionLink);
//         //     vertice.attr('transform', positionNode);
//         // }

//         function ticked() {
//             edgeElements
//                 .attr('x1', function(d) { return d.source.x; })
//                 .attr('y1', function(d) { return d.source.y; })
//                 .attr('x2', function(d) { return d.target.x; })
//                 .attr('y2', function(d) { return d.target.y; });

//             nodeElements
//                 .attr('cx', function(d) { return d.x; })
//                 .attr('cy', function(d) { return d.y; });
//         }
//     }

//     // function positionLink(d) {
//     //     return 'M' + d[0].x + ',' + d[0].y +
//     //         'S' + d[1].x + ',' + d[1].y +
//     //         ' ' + d[2].x + ',' + d[2].y;
//     // }

//     // function positionNode(d) {
//     //     return 'translate(' + d.x + ',' + d.y + ')';
//     // }

//     function dragstarted(d) {
//         if (!d3.event.active) simulation.alphaTarget(0.3).restart();
//         d.fx = d.x;
//         d.fy = d.y;
//     }

//     function dragged(d) {
//         d.fx = d3.event.x;
//         d.fy = d3.event.y;
//     }

//     function dragended(d) {
//         if (!d3.event.active) simulation.alphaTarget(0);
//         d.fx = null;
//         d.fy = null;
//     }
// }
