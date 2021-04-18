"use strict";

function StyleVisualization(beerStyles, parent) {
    let styles = beerStyles.reduce(function (acc, bs) {
        // Styles w/o stats or with exceptions in stats are high-level
        // descriptions; full details appear in subsequent entries
        if ('stats' in bs && !('exceptions' in bs.stats)) {
            // If name has ': ', take what follows; also save the link
            let stats = {name: bs.name.split(/:\s+/).pop(), link: bs.link};
            for (let s in bs.stats) {  // Save stats: og, fg, ibu, srm, abv
                // Convert strings to numbers; arithmetic on strings works,
                // but comparisons don't, e.g.: "9.5" > "14.0"
                stats[s] = {low: +bs.stats[s].low, high: +bs.stats[s].high};
            }
            acc.push(stats);
        }
        return acc;
    }, []);
    let srmColors = ['#FFFFFF',  // Pure white for 0 (not used)
        '#FFE699', '#FFD878', '#FFCA5A', '#FFBF42', '#FBB123',
        '#F8A600', '#F39C00', '#EA8F00', '#E58500', '#DE7C00',
        '#D77200', '#CF6900', '#CB6200', '#C35900', '#BB5100',
        '#B54C00', '#B04500', '#A63E00', '#A13700', '#9B3200',
        '#952D00', '#8E2900', '#882300', '#821E00', '#7B1A00',
        '#771900', '#701400', '#6A0E00', '#660D00', '#5E0B00',
        '#5A0A02', '#560A05', '#520907', '#4C0505', '#470606',
        '#440607', '#3F0708', '#3B0607', '#3A070B', '#36080A'];

    let tooltip = d3.select('body').selectAll('div.tooltip');
    if (tooltip.empty()) {  // Keep a single copy
        tooltip = d3.select('body').append('div')
            .classed('tooltip', true)
            .style('position', 'absolute')
            .style('opacity', 0)
            .style('pointer-events', 'none');
    }

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

    function gradientName(d) {
        // Not all SRM values are integers!
        return 'gradient-' +  // Name gradient by SRM low-high range
            srmColors[Math.floor(d.srm.low)].slice(1) + '-' +
            srmColors[Math.ceil(d.srm.high)].slice(1);
    }

    function defineGradients(svg) {
        // Create a linear gradient for each style's SRM low-high range
        var srmGradients = svg.append('defs').selectAll('linearGradient')
          .data(styles)
          .enter().append('linearGradient')
            .attr('id', function (d) { return gradientName(d); })
            .attr('x1', '0%')  // Change from bottom left to top right
            .attr('y1', '100%')
            .attr('x2', '100%')
            .attr('y2', '0%');

        // SRM low color code at the start of gradient
        srmGradients.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', function (d) {
                return srmColors[Math.floor(d.srm.low)];
            });

        // SRM high color code at the end of gradient
        srmGradients.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', function (d) {
                return srmColors[Math.ceil(d.srm.high)];
            });
    }

    this.singleRange = function (stat) {
        let margin = {left: 150, right: 50, top: 40, bottom: 40};
        let sd = svgDims(margin, styles.length * 20);

        // Remove old name-stat SVG, when resizing or updating a filter
        d3.select(parent).selectAll('svg.name-' + stat).remove();
        let svg = d3.select(parent).append('svg')
            .classed('name-' + stat, true)  // Mark as name-stat SVG
            .attr('width', sd.svgWidth)
            .attr('height', sd.svgHeight);
        svg.append('text')  // Add a title centered over x axis
            .classed('title', true)
            .style('text-anchor', 'middle')
            .attr('x', margin.left + sd.chartWidth / 2)
            .attr('y', margin.top / 2)
            .style('font-weight', 'bold')
            .style('fill', 'currentColor')
            .text(stat.toUpperCase() + ' Ranges of Selected Styles');
        defineGradients(svg);  // Define gradients for each SRM low-high range

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

        let chartGroup = svg.append('g')
            .attr('transform', 'translate('+margin.left+','+margin.top+')');

        chartGroup.selectAll('rect')
          .data(styles)
          .enter()
          .append('a')  // Link rectangles to BJCP style descriptions
            .attr('href', function (d) { return d.link.href; })
            .attr('target', '_blank')  // Open in new tabs
          .append('rect')  // Can filter after this to drop rectangles
            .attr('width', function (d) { return x(d[stat].high) - x(d[stat].low); })
            .attr('height', y.bandwidth())
            .attr('fill', function (d) {
                // Use predefined gradient for this style
                return 'url(#' + gradientName(d) + ')';
            })
            .attr('x', function (d) { return x(d[stat].low); })
            .attr('y', function (d) { return y(d.name); } )
            .on('mouseover', function (e, d) {
                d3.select(this).attr('opacity', .5);
                let svgBox = svg.node().getBoundingClientRect();
                tooltip.text(d.name)
                    .style('opacity', 1)
                    // e.page[X/Y] give the coordinates of mouseover, but I
                    // want more precise placement relative to rectangle
                    .style('left', (window.pageXOffset + svgBox.left + margin.left + x(d[stat].low)) + 'px')
                    .style('top', (window.pageYOffset + svgBox.top + margin.top + y(d.name)) + 'px');
            })
            .on('mouseout', function (e, d) {
                d3.select(this).attr('opacity', 1);
                tooltip.style('opacity', 0);
            });
        chartGroup.append('g')
            .classed('x axis', true)
            .attr('transform', 'translate(0,'+sd.chartHeight+')')
            .call(xAxis);  // TODO: consider rotating
        chartGroup.append('g').classed('y axis', true).call(yAxis);
    }

    this.doubleRange = function (xStat, yStat) {
        let margin = {left: 50, right: 50, top: 40, bottom: 40};
        let sd = svgDims(margin);

        // Remove old yStat-xStat SVG, when resizing or updating a filter
        d3.select(parent).selectAll('svg.' + yStat + '-' + xStat).remove();
        let svg = d3.select(parent).append('svg')
            .classed(yStat + '-' + xStat, true)  // Mark as yStat-xStat SVG
            .attr('width', sd.svgWidth)
            .attr('height', sd.svgHeight);
        svg.append('text')  // Add a title centered over x axis
            .classed('title', true)
            .style('text-anchor', 'middle')
            .attr('x', margin.left + sd.chartWidth / 2)
            .attr('y', margin.top / 2)
            .style('font-weight', 'bold')
            .style('fill', 'currentColor')
            .text(xStat.toUpperCase() + ' (x) & ' + yStat.toUpperCase() +
                ' (y) Ranges of Selected Styles');
        defineGradients(svg);  // Define gradients for each SRM low-high range

        let maxXStat = d3.max(styles, function (d) { return d[xStat].high; });
        let maxYStat = d3.max(styles, function (d) { return d[yStat].high; });
        let x = d3.scaleLinear()
            .domain([0, maxXStat])
            .range([0, sd.chartWidth]);
        let y = d3.scaleLinear()
            .domain([0, maxYStat])
            .range([sd.chartHeight, 0]);
        let xAxis = d3.axisBottom(x).tickSizeOuter(0);
        let yAxis = d3.axisLeft(y).tickSizeOuter(0);

        let chartGroup = svg.append('g')
            .attr('transform', 'translate('+margin.left+','+margin.top+')');

        chartGroup.selectAll('rect')
          .data(styles)
          .enter()
          .append('a')  // Link rectangles to BJCP style descriptions
            .attr('href', function (d) { return d.link.href; })
            .attr('target', '_blank')  // Open in new tabs
          .append('rect')  // Can filter after this to drop rectangles
            .attr('width', function (d) { return x(d[xStat].high) - x(d[xStat].low); })
            .attr('height', function (d) { return y(d[yStat].low) - y(d[yStat].high); })
            .attr('fill', function (d) {
                // Use predefined gradient for this style
                return 'url(#' + gradientName(d) + ')';
            })
            .attr('stroke', 'black')    // Draw a border around the boxes,
            .attr('stroke-width', '2')  // so they don't blend together
            .attr('x', function (d) { return x(d[xStat].low); })
            .attr('y', function (d) { return y(d[yStat].high); })
            .on('mouseover', function (e, d) {
                d3.select(this.parentNode).raise();  // Raise <a> (and this)
                d3.select(this).attr('fill', 'white');
                let svgBox = svg.node().getBoundingClientRect();
                tooltip.text(d.name)
                    .style('opacity', 1)
                    // e.page[X/Y] give the coordinates of mouseover, but I
                    // want more precise placement relative to rectangle
                    .style('left', (window.pageXOffset + svgBox.left + margin.left + x(d[xStat].low) + 3) + 'px')
                    .style('top', (window.pageYOffset + svgBox.top + margin.top + y(d[yStat].high)) + 'px');
            })
            .on('mouseout', function (e, d) {
                d3.select(this.parentNode).lower();  // Lower <a> (and this)
                d3.select(this).attr('fill', 'url(#' + gradientName(d) + ')');
                tooltip.style('opacity', 0);
            });
        chartGroup.append('g')
            .classed('x axis', true)
            .attr('transform', 'translate(0,'+sd.chartHeight+')')
            .call(xAxis);  // TODO: consider rotating
        chartGroup.append('g').classed('y axis', true).call(yAxis);
    }
}