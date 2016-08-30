"use strict";
var Version = (function () {
    function Version(name, specNames) {
        this.name = name;
        this.specNames = specNames;
    }
    return Version;
}());
var IndexProperty = (function () {
    function IndexProperty(name, version) {
        this.name = name;
        this.version = version;
    }
    IndexProperty.createFromElement = function ($el) {
        var el = $el.get(0);
        var name = el.children[0].type === "text" ? el.childNodes[0].nodeValue : el.childNodes[0].childNodes[0].nodeValue;
        name = name.replace(/\s/g, "");
        var $links = $el.find("a[href*='#propdef-']");
        return $links.toArray().map(function (link) {
            var version = IndexProperty.getVersionFromHref(link.attribs["href"]);
            return new IndexProperty(name, version);
        });
    };
    IndexProperty.getVersionFromHref = function (href) {
        href = href.toLowerCase();
        for (var _i = 0, _a = Versions.all(); _i < _a.length; _i++) {
            var v = _a[_i];
            for (var _b = 0, _c = v.specNames; _b < _c.length; _b++) {
                var spec = _c[_b];
                if (href.indexOf(spec.toLowerCase()) > -1) {
                    return v;
                }
            }
        }
        console.log("unknown ref:" + href);
        return new Version("unknown", [href]);
    };
    return IndexProperty;
}());
var cheerio = require("cheerio");
var got = require("got");
var Versions = (function () {
    function Versions() {
    }
    Versions.all = function () {
        return [
            Versions.css2,
            Versions.css3
        ];
    };
    Versions.css2 = new Version("css22", ["css22"]);
    Versions.css3 = new Version("css3", ["css-inline-3"]);
    return Versions;
}());
var Runner = (function () {
    function Runner() {
    }
    Runner.main = function () {
        Runner
            .getProperties()
            .filter(Runner.belongsTo.bind(null, [Versions.css2, Versions.css3]))
            .forEach(function (p) { return console.log(p.name, "belongs to", p.version.name); });
    };
    Runner.getProperties = function () {
        got("https://drafts.csswg.org/indexes/#properties").then(function (response) {
            var $doc = cheerio.load(response.body);
            var $props = $doc("#properties + div > ul.index > li");
            var indexProperties = [];
            $props.each(function (_, prop) {
                var props = IndexProperty.createFromElement($doc(prop));
                indexProperties.push.apply(indexProperties, props);
            });
            console.log(indexProperties);
        }).catch(function (err) {
            console.log(err);
        });
        return [
            new IndexProperty("display", Versions.css2),
            new IndexProperty("alignment", Versions.css3)
        ];
    };
    Runner.belongsTo = function (versions, property) {
        return versions.map(function (v) { return v.name; }).indexOf(property.version.name) > -1;
    };
    return Runner;
}());
Runner.main();
//# sourceMappingURL=index.js.map