function makeJSONfromCSV(csvURL) {
    var nodesHash = {};
    var nodesArray = [];
    var linksArray = [];
    d3.csv(csvURL, function(error, csvData) {
        console.log('data', csvData);
        csvData.forEach(function(link) {
            if (!nodesHash[link.source_name]) {
                nodesHash[link.source_name] = true;
                nodesArray.push({
                    id: link.source_name,
                    state: link.source_state,
                });
            }
            if (!nodesHash[link.target_name]) {
                nodesHash[link.target_name] = true;
                nodesArray.push({
                    id: link.target_name,
                    state: link.target_state,
                });
            }
            link.source = link.source_name;
            link.target = link.target_name;
            link.report = parseInt(link.report);
            link.dollars = parseFloat(link.dollars);
            link.year = parseInt(link.year);
            delete(link.source_name);
            delete(link.target_name);
            delete(link.source_state);
            delete(link.target_state);
            linksArray.push(link);
        });
        console.log(nodesArray);
        console.log(linksArray);
    });
}