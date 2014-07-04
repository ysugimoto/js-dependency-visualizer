/**
 * Dependency balloon renderer with d3.js
 *
 * @author Yoshiaki Sugimoto <sugimoto@wnotes.net>
 * @param {Window} global
 */
(function(global) {

    // default options
    var defaultOptions = {
        defaultLinkDistance:        20,
        defaultLinkStrength:        0.1,
        defaultCircleRadius:        30,
        showTexrNearCircles:        true,
        defaultMaxTextsLength:      100,
        RegexColorGroupingMatchers: [],
        chargeMultiplier:           300
    };

    // browser host object shortcut
    var win    = window,
        doc    = document,
        html   = doc.documentElement,
        body   = doc.body,
        width  = win.innerWidth  || html.clientWidth  || body.clientWidth,
        height = win.innerHeight || html.clientHeight || body.clientHeight;

    // utility mixin
    function mixin(base, over) {
        for ( var key in over ) {
            if ( over.hasOwnProperty(key) ) {
                base[key] = over[key];
            }
        }

        return base;
    }

    /**
     * D3Render main class
     *
     * @class D3Renderer
     * @constructor
     * @param {Array} view : d3.select() returns
     * @param {Object} graphData : DependencyParser::parse() returns
     * @param {Object} options
     */
    function D3Renderer(view, graphData, options) {

        /**
         * View stack
         *
         * @property view
         * @param Array
         */
        this.view = view;

        /**
         * graph Data
         *
         * @property graph
         * @param Object
         */
        this.graph = graphData;

        /**
         * (Default merged) option
         *
         * @property option
         * @type Object
         */
        this.option = mixin(defaultOptions, options || {});

        /**
         * Canvas container
         *
         * @property container
         * @type d3-element-array
         */
        this.container = null;

        /**
         * SVG container
         *
         * @property svg
         * @type d3-element-array
         */
        this.svg = null;

        /**
         * force reloader
         *
         * @property force
         * @type d3-element-array
         */
        this.force = null;

        /**
         * link elements
         *
         * @property link
         * @type d3-element-array
         */
        this.link = null;

        /**
         * Node elements
         *
         * @property node
         * @type d3-element-array
         */
        this.node = null;

        /**
         * test elements
         *
         * @property text
         * @type d3-element-array
         */
        this.text = null;

        /**
         * d3 color object
         *
         * @property color
         * @type Object
         */
        this.color = d3.scale.category10();

        /**
         * selected index
         *
         * @property selectedIdx
         * @type Number
         * @default -1
         */
        this.selectedIdx = -1;

        /**
         * selected type
         *
         * @property selectedType
         * @type String
         * @default "normal"
         */
        this.selectedType = 'normal';

        /**
         * selected object
         *
         * @property selectedObject
         * @type Object
         */
        this.selectedObject = {};


        // Scope trick
        this.radius   = this.radius();
        this.linkLine = this.linkLine();
    }

    /**
     * Configure : set option
     *
     * @method configure
     * @param {String} key
     * @param {Mixed} value
     */
    D3Renderer.prototype.configure = function(key, value) {
        this.option[key] = value;
    };

    /**
     * Calculate raduis
     * -- this method will first call and override with locked scope "this".
     *
     * @method raduis
     * @oparam {Object} data
     * @return Number
     */
    D3Renderer.prototype.radius = function() {
        // lock scope this
        var that = this;

        return function(data) {
            return that.option.defaultCircleRadius + that.option.defaultCircleRadius * data.source / 10;
        };
    };

    /**
     * Transform string
     *
     * @method transform
     * @param {Object} data
     * @return {String}
     */
    D3Renderer.prototype.transform = function(data) {
        return 'translate(' + data.x + ',' + data.y + ')';
    };

    /**
     * Render graph
     *
     * @method render
     * @return {Void}
     */
    D3Renderer.prototype.render = function() {
        this.container = this.view
                           .append('svg')
                           .attr('width',  width)
                           .attr('height', height);

        // set canvas
        this.zoomLogic();

        // create method
        this.force = this.forceLayout();
        this.svg   = this.createMarker();
        this.link  = this.createLink();
        this.node  = this.createNode();
        this.text  = this.createText();

        // observer methods
        this.observeForceUpdate();
        this.observeWindowResize();

        // input parts event
        this.listen(d3.selectAll('input'), 'change', this.handleInputChange);
        this.listen(d3.select('#search_input'), 'input', this.handleSearchInput);

    };

    /**
     * Zoom logic element create
     *
     * @method zoomLogic
     * @private
     */
    D3Renderer.prototype.zoomLogic = function() {
        var that = this;

        this.container
            .append("rect")
            .attr("width", width)
            .attr("height", height)
            .style("fill", "none")
            .style("pointer-events", "all")
            .call(d3.behavior.zoom().on("zoom", function redraw() {
                that.svg.attr(
                  "transform",
                  "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")"
                );
            }));
    };

    /**
     * Create Force layout object
     *
     * @method forceLayout
     * @return {Object} force
     */
    D3Renderer.prototype.forceLayout = function() {
        var that = this,
            force;

        force = d3.layout.force()
                    .charge(function(d) {
                        return d.filtered ? 0 : -d.weight * that.option.chargeMultiplier;
                    })
                    .linkDistance(function(l) {
                        return l.source.filtered || l.target.filtered  ? 500 : that.radius(l.source) + that.radius(l.target) + that.option.defaultLinkDistance;
                    })
                    .size([width, height])
                    .nodes(d3.values(this.graph.nodes))
                    .links(this.graph.links)
                    .linkStrength(function(l) {
                        return l.source.filtered || l.target.filtered ? 0 : that.option.defaultLinkStrength;
                    })
                    .start();

        return force;
    };

    /**
     * Create markers
     *
     * @method createMarker
     * @return {Object} svg
     */
    D3Renderer.prototype.createMarker = function() {
        var svg = this.container.append('g');

        svg.append("defs")
            .selectAll("marker")
            .data(["default", "dependency", "dependants"])
            .enter()
                .append("marker")
                .attr("id", function(d) {
                    return d;
                })
                .attr("viewBox", "0 -5 10 10")
                .attr("refX", 10)
                .attr("refY", 0)
                .attr("markerWidth", 10)
                .attr("markerHeight", 10)
                .attr("orient", "auto")
                .attr("class", "marker")
            .append("path")
                .attr("d", "M0,-5L10,0L0,5");

        return svg;
    };

    /**
     * Create Lins lines
     *
     * @method createLink
     * @return {Object} link
     */
    D3Renderer.prototype.createLink = function() {
        var link;

        link = this.svg.append("g").selectAll("path")
            .data(this.graph.links)
            .enter()
            .append("path")
                .attr("class", "link")
                .attr("marker-end", "url(#default)")
                .style("stroke-width", function() {
                    return Math.sqrt(1);
                });

        return link;
    };

    /**
     * Create Node Object
     *
     * @method createNode
     * @return {Object} node
     */
    D3Renderer.prototype.createNode = function() {
        var that = this,
            node;

        node = this.svg.append("g").selectAll("circle.node")
                .data(this.graph.nodes)
                .enter()
                .append("circle")
                    .attr("r", this.radius)
                    .style("fill", function(d) {
                        return that.color(d.group);
                    })
                    .attr("class", "node")
                    .attr("source", function(d) {
                        return d.source;
                    })
                    .attr("dest", function(d) {
                        return d.dest;
                    })
                    .call(this.force.drag)
                    .on("click", function(d) {
                        that.selectNodeHelper(d);
                    })
                    .on("contextmenu", function(d) {
                        that.selectRecursivelyNodeHelper(d);
                    });

        return node;
    };

    /**
     * Create Node text
     *
     * @method createText
     * @return {Object} text
     */
    D3Renderer.prototype.createText = function() {
        var text,
            option = this.option;

        text = this.svg.append("g").selectAll("text")
                .data(this.force.nodes())
                .enter().append("text")
                .attr("visibility", "visible")
                .text(function(d) {
                    return d.name.substring(0, option.defaultMaxTextsLength);
                });

        return text;
    };

    /**
     * Calclate link line path helper
     * -- this method will first call and override with locked scope "this".
     *
     * @method linkLine
     * @return {Object} String
     */
    D3Renderer.prototype.linkLine = function() {
        var that = this;

        return function(d) {
            var dx = d.target.x - d.source.x,
                dy = d.target.y - d.source.y,
                dr = Math.sqrt(dx * dx + dy * dy),

                rSource = that.radius(d.sourceNode) / dr,
                rDest   = that.radius(d.targetNode) / dr,

                startX  = d.source.x + dx * rSource,
                startY  = d.source.y + dy * rSource,
                endX    = d.target.x - dx * rDest,
                endY    = d.target.y - dy * rDest;

            return 'M' + startX + ',' + startY + 'L' + endX + ',' + endY;
        };
    };

    /**
     * Observe force layout object click, and update
     *
     * @method observeForceUpdate
     */
    D3Renderer.prototype.observeForceUpdate = function() {
        var that = this;

        this.force.on("tick", function() {
            that.svg.selectAll(".node").attr("r", that.radius);
            that.link.attr("d", function(d) {
                return that.linkLine(d);
            });
            that.node.attr("transform", that.transform );
            if ( that.option.showTexrNearCircles ) {
              that.text.attr("transform", that.transform);
            }
        });
    };

    /**
     * Observe resized window
     *
     * @method observeWindowResize
     */
    D3Renderer.prototype.observeWindowResize = function() {
        var that = this;

        win.addEventListener('resize', function() {
            width =  win.innerWidth  || html.clientWidth  || body.clientWidth;
            height = win.innerHeight || html.clientHeight || body.clientHeight;

            that.container.attr('width', width).attr('height', height);
            that.force.size([width, height]).start();
        });
    };

    /**
     * Node selection helper
     *
     * @method selectNodeHelper
     * @param {Object} d
     */
    D3Renderer.prototype.selectNodeHelper = function(d) {
        if ( d3.event.defaultPrevented ) {
            return;
        }

        var svg   = this.svg,
            force = this.force,
            nodeNeighbors;

        // Deselect if needed
        if ( d.idx == this.selectedIdx && this.selectedType == "normal") {
            this.deSelectNodeHelper(d);
            return;
        }

        // Update selected object
        delete this.selectedObject.fixed;
        this.selectedIdx           = d.idx;
        this.selectedObject        = d;
        this.selectedObject.fixed  = true;
        this.selectedType          = "normal";

        // Figure out the neighboring node id's with brute strength because the graph is small
        nodeNeighbors = this.grapth.links.filter(function(link) {
            return link.source.index === d.index || link.target.index === d.index;
        })
        .map(function(link) {
            return link.source.index === d.index ? link.target.index : link.source.index;
        });

        // Fade out all circles
        svg.selectAll('circle')
            .classed('filtered', true)
            .each(function(node){
              node.filtered   = true;
              node.neighbours = false;
            }).transition();

        svg.selectAll('text')
            .classed('filtered', true)
            .transition();

        svg.selectAll('.link')
            .transition()
            .attr("marker-end", "");

        // Higlight all circle and texts
        svg.selectAll('circle, text')
          .filter(function(node) {
              return nodeNeighbors.indexOf(node.index) > -1 || node.index == d.index;
          })
          .classed('filtered', false)
          .each(function(node) {
             node.filtered   = false;
             node.neighbours = true;
          })
          .transition();

        // Higlight links
        svg.selectAll('.link')
          .filter(function(link) {
            return link.source.index === d.index || link.target.index == d.index;
          })
          .classed('filtered', false)
          .attr("marker-end", function(l) {
              return l.source.index === d.index ? "url(#dependency)" : "url(#dependants)";
          })
          .transition();

        force.start();
    };

    /**
     * Recursive node selection helper
     *
     * @method selectRecursiveNodeHelper
     * @param {Object} d
     */
    D3Renderer.prototype.selectRecursiveNodeHelper = function(d) {
        if ( d3.event.defaultPrevented ) {
            return;
        }

        var that       = this,
            svg        = this.svg,
            force      = this.force,
            neighbours = {},
            nextSize   = 1,
            step       = 0,
            currentSize,
            nodeNeighbors;

        // Don't show context menu :)
        d3.event.preventDefault();

        // Deselect if needed
        if ( d.idx == this.selectedIdx && this.selectedType == "recursive") {
            this.deSelectNodeHelper(d);
            return;
        }

        // Update selected object
        delete this.selectedobject.fixed;
        this.selectedIdx          = d.idx;
        this.selectedObject       = d;
        this.selectedObject.fixed = true;
        this.selectedType         = "recursive";

        // Figure out the neighboring node id's with brute strength because the graph is small
        nodeNeighbors = this.graph.links.filter(function(link) {
            return link.source.index === d.index;
        })
        .map(function(link) {
            var idx = ( link.source.index === d.index ) ? link.target.index : link.source.index;

            if ( link.source.index === d.index ) {
              console.log("Step 0. Adding ", that.graph.nodes[idx].name);
              neighbours[idx] = 1;
            }
            return idx;
        });

        // Next part - neighbours of neigbours
        currentSize = Object.keys(neighbours).length;
        while ( nextSize !== currentSize ) {
            console.log("Current size " + currentSize + " Next size is " + nextSize);
            currentSize = nextSize;
            this.graph.links.filter(function(link) {
              return !!neighbours[link.source.index];
            })
            .map(function(link) {
                var idx = link.target.index;

                console.log("Step " + step + ". Adding ", that.graph.nodes[idx].name + " From " + that.graph.nodes[link.source.index].name);

                neighbours[idx] = 1;
                return idx;
             });
             nextSize = Object.keys(neighbours).length;
             step     = step + 1;
        }

        neighbours[d.index] = 1;
        nodeNeighbors = Object.keys(neighbours).map(function(neibour) {
            return parseInt(neibour, 10);
        });

        // Fade out all circles
        svg.selectAll('circle')
            .classed('filtered', true)
            .each(function(node){
              node.filtered   = true;
              node.neighbours = false;
            }).transition();

        svg.selectAll('text')
            .classed('filtered', true)
            .transition();

        svg.selectAll('.link')
            .transition()
            .attr("marker-end", "");

        // Higlight all circle and texts
        svg.selectAll('circle, text')
            .filter(function(node) {
                return nodeNeighbors.indexOf(node.index) > -1 || node.index == d.index;
            })
            .classed('filtered', false)
            .each(function(node) {
               node.filtered   = false;
               node.neighbours = true;
            })
            .transition();

        // Higlight links
        svg.selectAll('.link')
            .filter(function(link) {
              return nodeNeighbors.indexOf(link.source.index) > -1;
            })
            .classed('filtered', false)
            .attr("marker-end", function(l) {
                return l.source.index === d.index ? "url(#dependency)" : "url(#dependants)";
            })
            .transition();

        force.start();
    };

    /**
     * Remove selection node
     *
     * @method deSelectNodeHelper
     * @param {Object} d
     */
    D3Renderer.prototype.deSelectNodeHelper = function(d) {
        delete d.fixed;

        this.selectedIdx    = -1;
        this.selectedObject = {};

        this.svg.selectAll('circle, path, text')
            .classed('filtered', false)
            .each(function(node) {
                node.filtered = false;
             })
            .transition();

        this.svg.selectAll('.link')
            .attr("marker-end", "url(#default)")
            .classed('filtered', false)
            .transition();

        this.force.start();
    };

    /**
     * Input data changed event handler
     *
     * @method handleInputChange
     * @param {Object} element
     */
    D3Renderer.prototype.handleInputChange = function(element) {
        var that = this;

        switch ( element.name ) {
            case 'circle_size':
                this.option.defaultCircleRadius = parseInt(element.value, 10);
                this.force.linkDistance(function(l) {
                    return that.radius(l.source) + that.radius(l.target) + that.option.defaultLinkDistance;
                });
                this.force.start();
                break;

            case 'charge_multiplier':
                this.option.chargeMultiplier = parseInt(element.value, 10);
                this.force.start();
                break;

            case 'link_strength':
                this.option.defaultLinkStrength = parseInt(element.value, 10) / 10;
                this.force.linkStrength(this.option.defaultLinkStrength);
                this.force.start();
                break;

            case 'show_texts_near_circles':
                this.text.attr('visibility', element.checked ? 'visible' : 'hidden');
                this.option.showTexrNearCircles = element.checked;
                this.force.start();
                break;
        }
    };

    /**
     * Search filter element changed event handler
     *
     * @method handleSearchInput
     * @param {Object} element
     */
    D3Renderer.prototype.handleSearchInput = function(element) {
        var regex;

        // Filter all items
        console.log("Input changed to" + element.value);
        this.deSelectNodeHelper(this.selectedObject);

        if ( element.value === '' ) {
            return;
        }

        regex = new RegExp(element.value, "i");
        this.svg.selectAll('circle, text')
            .classed('filtered', function(node) {
                var filtered = regex.test(node.name);

                node.filtered   = filtered;
                node.neighbours = !filtered;

                return filtered;
            })
            .transition();

        this.svg.selectAll('.link')
            .classed('filtered', function(l) {
                 return ! ( regex.test(l.sourceNode.name) && regex.test(l.targetNode.name));
            })
            .attr("marker-end", function (l) {
               return ( ! ( regex.test(l.sourceNode.name) && regex.test(l.targetNode.name) ) ) ? '' : 'url(#default)';
            })
            .transition();

        this.force.start();
    };

    /**
     * Set event handler for DOM
     *
     * @method listen
     * @param {d3-element-array} element
     * @param {String} type
     * @param {Function} callback
     */
    D3Renderer.prototype.listen = function(element, type, callback) {
        var that = this;

        element.on(type, function() {
            callback.call(that, this);
        });
    };

    // export for global(window)
    global.D3Renderer = D3Renderer;

})(this);
