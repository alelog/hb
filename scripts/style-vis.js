function StyleVisualization(beerStyles, parent) {
    let styles = beerStyles.reduce(function (acc, bs) {
        // Styles w/o stats or with exceptions in stats are high-level
        // descriptions; full details appear in subsequent entries
        if ('stats' in bs && !('exceptions' in bs.stats)) {
            // If name has ': ', take what follows
            let stats = {name: bs.name.split(/:\s+/).pop()};
            for (s in bs.stats) {  // Save stats: og, fg, ibu, srm, abv
                // Convert strings to numbers; arithmetic on strings works,
                // but comparisons don't, e.g.: "9.5" > "14.0"
                stats[s] = {low: +bs.stats[s].low, high: +bs.stats[s].high};
            }
            acc.push(stats);
        }
        return acc;
    }, []);

    function svgDims(margins, chartHeight) {
        const MIN_WIDTH = 300;
        const W2H_RATIO = 1.6;

        let width = Math.max(parent.clientWidth, MIN_WIDTH);
        let chartWidth = width - margins.left - margins.right;
        if (chartHeight === undefined) {
            // If unspecified, scale relative to width
            chartHeight = chartWidth / W2H_RATIO;
        }
        let height = chartHeight + margins.top + margins.bottom;

        return {svgWidth: width, svgHeight: height,
                chartWidth: chartWidth, chartHeight: chartHeight};
    }

    this.singleRange = function (stat) {
        let margin = {left: 150, right: 50, top: 40, bottom: 40};
        let sd = svgDims(margin, styles.length * 20);

        // Remove old name-stat SVG, when resizing or updating a filter
        d3.select(parent).selectAll('svg.name-' + stat).remove();
        let svg = d3.select(parent).append('svg')
            .attr('class', 'name-' + stat)  // Mark as name-stat SVG
            .attr('width', sd.svgWidth)
            .attr('height', sd.svgHeight);

        let maxStat = d3.max(styles, function (d) { return d[stat].high; });
        let x = d3.scaleLinear()
            .domain([0, maxStat])
            .range([0, sd.chartWidth]);
        let y = d3.scaleBand()
            .domain(styles.map(function (d) { return d.name; }))
            // Don't invert, so style order is followed top to bottom
            .range([0, sd.chartHeight])
            .paddingInner(0.1);
        let xAxis = d3.axisBottom(x);
        let yAxis = d3.axisLeft(y).tickSizeOuter(0);
        let rainbow = d3.scaleSequential(d3.interpolateRainbow).domain([0, styles.length]);

        let chartGroup = svg.append('g')
            .attr('transform', 'translate('+margin.left+','+margin.top+')');

        chartGroup.selectAll('rect')
          .data(styles)
          .enter().append('rect')  // Can filter after this to drop rectangles
            .attr('width', function (d) { return x(d[stat].high) - x(d[stat].low); })
            .attr('height', y.bandwidth())
            .attr('fill', function (d, i) { return rainbow(i); })
            .attr('x', function (d) { return x(d[stat].low); })
            .attr('y', function (d) { return y(d.name); } );
        chartGroup.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0,'+sd.chartHeight+')')
            .call(xAxis);  // TODO: consider rotating
        chartGroup.append('g').attr('class', 'y axis').call(yAxis);
    }
}