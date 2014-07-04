/**
 * Dependency GraphData parser
 *
 * @class DependencyParser
 * @constructor
 * @author Yoshiaki Sugimoto <sugimoto@wnotes.net>
 * @param {Object} dependencies
 */
function DependencyParser(dependencies) {
    /**
     * dependencies
     *
     * @property dependencies
     * @type Object
     */
    this.dependencies = dependencies;

    /**
     * Depend Node relation data
     *
     * @property nodes
     * @type Array
     */
    this.nodes = [];

    /**
     * Depend Link relation data
     *
     * @property links
     * @type Array
     */
    this.links = [];

    /**
     * NodeSet stack
     *
     * @property nodeSet
     * @type Object
     */
    this.nodeSet = {};

    /**
     * Module prefixes
     *
     * @property prefixes
     * @type Object
     */
    this.prefixes = {};

    /**
     * Node index
     *
     * @property nodeIndex
     * @type Number
     */
    this.nodeIndex = 0;
}

/**
 * Parse and analytic dependency
 *
 * @method parse
 * @param {Array} regecColormatchers
 * @return {Object}
 */
DependencyParser.prototype.parse = function(regexColormatchers) {
    var that      = this,
        idx       = 0,
        groupRegexIdentifiers,
        node,
        key,
        i,
        size;

    // analysis dependency links
    this.dependencies.links.forEach(function(link) {
        that.parseNodeSet(link);
    });

    groupRegexIdentifiers = this.getGroupRegexIdentifiers(regexColormatchers);
    size                  = groupRegexIdentifiers.length;

    for ( key in this.nodeSet ) {
        if ( ! this.nodeSet.hasOwnProperty(key) ) {
            continue;
        }

        node        = this.nodeSet[key];
        node.group  = 0;
        node.weight = node.source;

        for ( i = 0; i < size; ++i ) {
            if ( (new RegExp(groupRegexIdentifiers[i])).test(key) ) {
                node.group = i + 1;
                break;
            }
        }

        this.nodes.push(node);
        console.log("Pushing node : idx=" + idx + ", name=" + key + ", groupId=" + node.group + ", source=" + node.source + ", dest=" + node.dest + ", weight=" + node.weight);
        idx++;
    }

    return {
        nodes: this.nodes,
        links: this.links
    };
};

/**
 * Parse node set
 *
 * @method parseNodeSet
 * @param {Object} link
 * @return {Void}
 */
DependencyParser.prototype.parseNodeSet = function(link) {
    var source,
        dest;

    // find source
    source = this.nodeSet[link.source];
    if ( ! source ) {
        this.nodeSet[link.source] = source = {
            idx:    this.nodeIndex++,
            name:   link.source,
            source: 1,
            dest:   0
        };
    }
    source.source++;

    // find dest
    dest = this.nodeSet[link.dest];
    if ( ! dest ) {
        this.nodeSet[link.dest] = dest = {
            idx:    this.nodeIndex++,
            name:   link.dest,
            source: 0,
            dest:   1
        };
    }
    dest.dest++;

    this.updatePrefix(link.source);
    this.updatePrefix(link.dest);

    this.links.push({
        source: source.idx,
        target: dest.idx,

        sourceNode: source,
        targetNode: dest
    });

    console.log('Pushing link : source="' + source.idx + '", target="' + dest.idx);
};

/**
 * Get group regex ideintifiers
 *
 * @method getGroupRegexIdentifiers
 * @param {Array} matchers
 * @return {Array}
 */
DependencyParser.prototype.getGroupRegexIdentifiers = function(matchers) {
    var prefix = [],
        key,
        sorted;

    for ( key in this.prefixes ) {
        if ( this.prefixes.hasOwnProperty(key) ) {
            prefix.push({
                key:   key,
                value: this.prefixes[key]
            });
        }
    }

    sorted = prefix.slice(0).sort(function(a, b) {
        return b.value - a.value;
    });

    if ( ! matchers ) {
        matchers = [];
        sorted.forEach(function(v) {
            matchers.push('^' + v.key + '.*');
        });
    }

    return matchers;
};

/**
 * Add stack prefix string
 *
 * @method updatePrefix
 * @param {String} name
 * @return {Void}
 */
DependencyParser.prototype.updatePrefix = function(name) {
    var prefix = name.slice(0, 2);

    if ( ! (prefix in this.prefixes) ) {
        this.prefixes[prefix] = 1;
    } else {
        this.prefixes[prefix]++;
    }
};

// node or browser
if ( typeof process !== 'undefined' ) {
    module.exports = DependencyParser;
} else {
    this.DependencyParser = DependencyParser;
}
