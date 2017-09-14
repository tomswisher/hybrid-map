/* globals d3, console */
/* exported getCSV */

'use strict';

var svg = d3.select('#graph-container');
var width = 500;
var height = 500;

var simulation = d3.forceSimulation()
    .force('link', d3.forceLink().distance(20).strength(0.5))
    .force('charge', d3.forceManyBody())
    .force('center', d3.forceCenter(width / 2, height / 2));

var nodes, links, nodeById;
var dollarsScale = d3.scaleLinear()
    .range([0.5, 10]);
var dollarsGivenScale = d3.scaleLinear()
    .range([3, 20]);
var dollarsReceivedScale = d3.scaleLinear()
    .range([1, 10]);

var layoutScaleX = d3.scaleLinear()
    .range([0, +svg.attr('width')]);
var layoutScaleY = d3.scaleLinear()
    .range([0, +svg.attr('height')]);
// miserables();

hybridMap();

// function getCSV() {
//     var nodesHash = {};
//     var nodesArray = [];
//     var linksArray = [];
//     d3.csv('data/cleaned-data-08-04-2017.csv', function(error, csvData) {
//         console.log('data', csvData);
//         csvData.forEach(function(link) {
//             if (!nodesHash[link.source_name]) {
//                 nodesHash[link.source_name] = true;
//                 nodesArray.push({
//                     id: link.source_name,
//                     state: link.source_state,
//                 });
//             }
//             if (!nodesHash[link.target_name]) {
//                 nodesHash[link.target_name] = true;
//                 nodesArray.push({
//                     id: link.target_name,
//                     state: link.target_state,
//                 });
//             }
//             link.source = link.source_name;
//             link.target = link.target_name;
//             link.report = parseInt(link.report);
//             link.dollars = parseFloat(link.dollars);
//             link.year = parseInt(link.year);
//             delete(link.source_name);
//             delete(link.target_name);
//             delete(link.source_state);
//             delete(link.target_state);
//             linksArray.push(link);
//         });
//         console.log(nodesArray);
//         console.log(linksArray);
//     });
// }

function hybridMap() {
    d3.json('data/json-data-4-6.json', function(error, graph) {
        if (error) throw error;

        nodes = graph.nodes;
        links = graph.links;
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

        layoutScaleX.domain([0, (nodes.length-1)/2]);
        layoutScaleY.domain([0, (nodes.length-1)/2]);

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

        var linkElements = svg.selectAll('.link')
            .data(links)
            .enter().append('line')
            // .enter().append('path')
            .style('stroke', 'black')
            .style('stroke-width', function(d) { return dollarsScale(d.dollars); })
            .attr('class', function(d) { return 'link-path report' + d.report; });

        var nodeElements = svg.selectAll('.node')
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
            // nodes.forEach(function(d, i) {
            //     d.x = 100 * i;
            //     d.y = 100 * (i % (nodes.length-1)/5);
            //     d.x = layoutScaleX(i % (nodes.length-1));
            //     d.y = layoutScaleY(i % (nodes.length-1)/5);
            // });

            linkElements
                .attr('x1', function(d) { return d.source.x; })
                .attr('y1', function(d) { return d.source.y; })
                .attr('x2', function(d) { return d.target.x; })
                .attr('y2', function(d) { return d.target.y; });

            nodeElements
                .attr('cx', function(d) { return d.x; })
                .attr('cy', function(d) { return d.y; });
        }
    });
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