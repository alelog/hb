/*
   Json vs XML?  Jonathan Greene (https://github.com/gthmb) has both versions
     url = 'https://cdn.jsdelivr.net/gh/gthmb/bjcp-2015-json/json/styleguide-2015.min.json';
     $.getJSON(url, function(json) {...});
   There are more XML versions available, so use this, in case of issues.

   Phil Murray's XML version seems more official; but Jonathan Greene's version
   uses more convenient tags (e.g., beer introduction, specialty IPAs).

   Non-raw, non-minified version on GH is more readable:
   https://github.com/gthmb/bjcp-2015-json/blob/master/json/styleguide-2015.json
   https://github.com/gthmb/bjcp-2015-json/blob/master/json/styleguide-2015.xml

   but a CDN XML version is more usable in browsers, e.g.:
   https://cdn.jsdelivr.net/gh/gthmb/bjcp-2015-json/xml/styleguide-2015.xml
   https://gitcdn.xyz/repo/meanphil/bjcp-guidelines-2015/master/styleguide.xml

   Content-Type is set correctly by CDN, which helps with browser display and
   minimizes issues loading content into pages, so use the above, rather than:
   https://raw.githubusercontent.com/meanphil/bjcp-guidelines-2015/master/styleguide.xml

   CDNs and githubusercontent send CORS header "access-control-allow-origin: *"
   which is respected by Chrome & Safari on my MBP.  However, while debugging,
   I saw that in Chrome, jqXHR's getResponseHeader & getAllResponseHeaders were
   mishandling headers for most of the URLs (it worked fine under Safari).
*/

const DEBUG = ['localhost', '127.0.0.1', ''].indexOf(location.hostname) >= 0;
const XML_URL = 'https://cdn.jsdelivr.net/gh/gthmb/bjcp-2015-json/xml/styleguide-2015.xml';
const BJCP_BASE_URL = 'http://www.bjcp.org/style/2015/';

/* Convert style (its name) to ID; e.g.:
   "Specialty IPA: Rye IPA" --> "specialty-ipa-rye-ipa" */
function styleId(style) {
    let res = style.name.toLowerCase()
        .replace(/[^a-z0-9- ]+/g, '')  // Keep alphanumerics, dashes, spaces
        .replace(/ /g, '-');  // Replace spaces with dashes
    return res;
}

/* Ex: http://www.bjcp.org/style/2015/21/21B/specialty-ipa-rye-ipa/ */
function styleURL(style) {
    let subCatId = style._id.split('-', 1)[0];  // Drop '-' and the rest
    let catId = subCatId.match(/\d+/)[0];
    if (subCatId == catId) {
        if (DEBUG) console.error("Category ID == subcategory ID: " + catId);
        // Workaround for https://github.com/seth-k/BJCP-styles-XML/issues/7
        subCatId += 'A';  // Hardcode handling for Historical Beer
    }

    return BJCP_BASE_URL + catId + '/' + subCatId + '/' + styleId(style) + '/';
}

/* Ex: "Color", "pale-color" --> "Pale" */
function tagText(category, tag) {
    let tagWords = tag.split('-');
    if (['Strength', 'Color', 'Style Family', 'Era'].indexOf(category) >= 0)
        tagWords.pop();  // Skip the last word (strength, color, family, style)
    tagWords = tagWords.map(function(word) {
        return word == 'ipa' ? word.toUpperCase()
            : word.charAt(0).toUpperCase() + word.slice(1);
    });
    return tagWords.join(' ');
}

/* Create a filter group using beer tag descriptions */
function makeFilterGroup(beerTagDescs) {
    let $fgrp = $('#filter-group');
    for (let i = 0; i < beerTagDescs.length; i++) {
        let tagCat = beerTagDescs[i].Category;
        let $dcont = $('<div>').addClass('dropdown-content');
        let $ddown = $('<div>')
            .addClass('dropdown')
            .append($('<button>')
                    .prop('type', 'button')
                    .addClass('filter')
                    .text(tagCat))
            .append($dcont)
            .appendTo($fgrp);

        for (let j = 0; j < beerTagDescs[i].Tags.length; j++) {
            let tagVal = beerTagDescs[i].Tags[j].Tag;
            $dcont.append($('<button>')
                          .prop('type', 'button')
                          .addClass('filter-value')
                          .val(tagVal)
                          .text(tagText(tagCat, tagVal)));
        }
    }

    // Register on-click listener for filter selections
    $("#filter-group .dropdown-content button").click(updateFilter);
}

function configureAutocomplete(beerSubCats) {
    $('#bsc-search').autocomplete({
        source: function(request, response) {
            let pattern = '\\b' + $.ui.autocomplete.escapeRegex(request.term);
            let matcher = new RegExp(pattern, 'i');
            response($.grep(beerSubCats, function(item) {
                // Filter by the selected year
                return matcher.test(item.name);
            }));
        },
        minLength: 0,
        select: function(event, ui) {
            // In bigger projects, it's safer to use window.location,
            // because location might be redefined.
            // Setting location and location.href has the same effect, if
            // location isn't set.  Both act as if the link is clicked, so
            // "Back" goes to current page).  location.replace(url) is like
            // HTTP redirect--it skips the current page for back navigation.
            // $(location).prop('href', url) is the jQuery way but it's not
            // an improvement over the below.

            // Open BJCP's page for this style in a new tab (& switch to it)
            // Assign to location.href to open in the current tab, instead
            let win = window.open(styleURL(ui.item), '_blank');
            win.focus();
        }
    }).autocomplete( 'instance' )._renderItem = function(ul, item) {
        let statsStr = '';
        try {
            let ist = item.stats;
            statsStr += ist.abv.low + '-' + ist.abv.high + '% ABV; ';
            statsStr += ist.ibu.low + '-' + ist.ibu.high + ' IBU; ';
            statsStr += ist.srm.low + '-' + ist.srm.high + 'L&#176; SRM';
        } catch (err) {
            if (DEBUG) console.error(err.message);
        }
        return $('<li>')
            .append('<div><b>' + item.name + '</b><br>' +
                        '<i><small>' + statsStr + '</small></i></div>')
            .appendTo(ul);
    };
}

// Tracks the current filter selections {feature: tag, ...}
let curFilters = {};

function updateFilter() {
    // Get the value for filter (in this node) and the filter
    // (in grandparent's first element child)
    let value = this.value;
    let filterBtn = this.parentNode.parentNode.firstElementChild;
    let filter = filterBtn.textContent;

    // Clear selected style in buttons of this filter's dropdown-content
    // (in case there was a selection in this filter before)
    $(this.parentNode).find(".selected").removeClass("selected");

    if (curFilters[filter] === value) {
        // Same setting for filter clicked: delete from current
        // filters and clear selected style for filter button
        delete curFilters[filter];
        $(filterBtn).removeClass("selected");
    } else {
        // New or different setting for filter: update current filters
        // and add selected style to the filter and value buttons
        curFilters[filter] = value;
        $(this).addClass("selected");
        $(filterBtn).addClass("selected");
    }

    // Recompute the array of beer styles matching the filters from scratch
    let matchingStyles = $.grep(beerSubCats, function(item) {
        // Check item's entries against every filter's selection
        if (!item.tags) return false;  // Skip styles w/o tags
        for (let filter in curFilters) {
            if (item.tags.indexOf(curFilters[filter]) < 0)
                return false;  // Any match fails: skip style
        }
        return true;
    });

    // Re-populate the results list with links to plant-detail pages
    let $frUl = $("#filter-results").empty();
    for (let i = 0; i < matchingStyles.length; i++) {
        let $a = $("<a>")
            .prop("href", styleURL(matchingStyles[i]))
            .prop('target', '_blank')  // open link in new tab
            .text(matchingStyles[i].name);
        $("<li>").append($a).appendTo($frUl);
    }

    if (matchingStyles.length) {
        // Create visualizalizations of styles' vitals
        let parent = $('div.column.main')[0];
        let styleVis = new StyleVisualization(matchingStyles, parent);
        d3.select(window).on("resize", function () { styleVis.singleRange('abv'); });
        styleVis.singleRange('abv');
        d3.select(window).on("resize", function () { styleVis.doubleRange('abv', 'ibu'); });
        styleVis.doubleRange('abv', 'ibu');
    }
}

// Beer-subcategory data and tag descriptions collected from the XML file
// Use arrays throughout, to preserve the order (of styles, tags, etc.)
let beerSubCats = [];
let beerTagDescs = [];

$(function() {  // Call this from DOM's .ready()
    // Read in the BJCP XML file
    $.get(XML_URL, function(xml) {
        // Convert XML to JSON to allow grepping, etc.
        let x2js = new X2JS();  // Couldn't get XML filtering working
        let jsonObj = x2js.xml2json(xml);
        let beerStyles = jsonObj.styleguide.class[0];

        // Save the tag descriptions to produce a legend and automate
        // the generation of filters
        try {
            let bis = beerStyles.introduction.section;
            for (let i = 0; i < bis.length; i++) {
                if ('sectiontitle' in bis[i] &&
                    bis[i].sectiontitle == 'Style Tag Reference') {
                    let tt = bis[i].paragraph[1].table.tr;
                    if (DEBUG) console.log(tt);
                    let j = 1;  // Skip over the "heading"
                    while (j < tt.length) {
                        if ('th' in tt[j]) {
                            let category = tt[j].th.__text;
                            let tags = [];
                            for (j++; j < tt.length && 'td' in tt[j]; j++) {
                                tags.push({'Tag': tt[j].td[1],
                                           'Meaning': tt[j].td[2]});
                            }
                            beerTagDescs.push({'Category': category,
                                               'Tags': tags});
                            continue;
                        }
                        console.error('Unexpected tag');
                        console.error(tt[j]);
                        j++;
                    }
                    break;
                }
            }
            if (DEBUG) console.log(beerTagDescs);
        } catch (err) {
            if (DEBUG) console.error(err.message);
        }

        // Create a filter group using beer tag descriptions
        makeFilterGroup(beerTagDescs);

        // Collect all subcategories of beer together
        beerStyles.category.forEach(function(cat) {
            [].push.apply(beerSubCats, cat.subcategory);
        });
        if (DEBUG) console.log(beerSubCats);

        // Configure auto-complete for beer subcategories
        configureAutocomplete(beerSubCats);
    });
});
