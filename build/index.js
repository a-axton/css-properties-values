/*
    token => {
        value:string // border-width, length, color (resolvable to only literals)
    }

    literal => {
        name:string // inherit, block etc
    }
*/
"use strict";
class Version {
    constructor(name, specNames) {
        this.name = name;
        this.specNames = specNames;
    }
}
class CssProperty {
    constructor(name, version, values) {
        this.name = name;
        this.version = version;
        this.values = values;
    }
}
class IndexProperty {
    constructor(name, version, href) {
        this.name = name;
        this.version = version;
        this.href = href;
    }
    static createFromElement($el) {
        let el = $el.get(0);
        let name = el.children[0].type === "text" ? el.childNodes[0].nodeValue : el.childNodes[0].childNodes[0].nodeValue;
        name = name.replace(/\s/g, "");
        let $links = $el.find("a[href*='#propdef-']");
        return $links.toArray().map((link) => {
            var href = link.attribs["href"];
            var version = IndexProperty.getVersionFromHref(href);
            return new IndexProperty(name, version, href);
        });
    }
    static getVersionFromHref(href) {
        href = href.toLowerCase();
        for (let v of Versions.all()) {
            for (let spec of v.specNames) {
                if (href.indexOf(spec.toLowerCase()) > -1) {
                    return v;
                }
            }
        }
        return new Version("unknown", [href]);
    }
}
class SpecValue {
    static createFromElement($el) {
        var items = $el.get(0).childNodes
            .filter(($child) => {
            return ($child.attribs && $child.attribs["data-link-type"]) ? $child.attribs["data-link-type"].toLowerCase() !== "grammar" : true;
        })
            .filter(($child) => {
            var skip = ["[", "]", "|", "[[", "]]", "||", "]|", "[|", ""];
            return $child.type === "text" ? skip.indexOf($child.nodeValue.replace(/\s/g, "")) === -1 : true;
        });
        // TODO parse the value string, treat it either as: 
        // literal: no parenthesis, just words. use text as value 
        // token: anchor present, store link. use text as value
        var values = [];
        items.forEach((item) => {
            var literals = SpecValue.extractLiterals(item);
            values.push(...literals);
            var tokens = SpecValue.extractTokens(item);
            values.push(...tokens);
        });
        return values;
    }
    static extractLiterals(el) {
        if (el.type === "text") {
            return el.nodeValue.split(/[|\[?\]]/).map((s) => s.trim()).filter(String);
        }
        return [];
    }
    static extractTokens(el) {
        if (el.type === "tag" && el.name === "a") {
            var html = cheerioStatic.html(el);
            var $a = cheerio.load(html);
            return [html];
        }
        return [];
    }
}
const cheerio = require("cheerio");
const got = require("got");
const cheerioStatic = require("cheerio/lib/static");
class Versions {
    static all() {
        return [
            Versions.css2,
            Versions.css3
        ];
    }
}
Versions.css2 = new Version("css22", ["css22"]);
Versions.css3 = new Version("css3", ["css-inline-3", "css-counter-styles-3"]);
class Runner {
    static main() {
        Runner
            .getIndexProperties().then((props) => {
            var cssProperties = props
                .filter(Runner.belongsTo.bind(null, [Versions.css2, Versions.css3]))
                .map((indexProperty) => {
                return Runner.getValues(indexProperty).then((values) => {
                    return new CssProperty(indexProperty.name, indexProperty.version, values);
                });
            });
            return Promise.all(cssProperties).then((props) => {
                console.log(JSON.stringify(props, null, 2));
            });
        }).catch(console.log.bind(console));
    }
    static getIndexProperties() {
        return new Promise((res, rej) => {
            got("https://drafts.csswg.org/indexes/#properties").then((response) => {
                var $doc = cheerio.load(response.body);
                var $props = $doc("#properties + div > ul.index > li");
                var indexProperties = [];
                $props.each((_, prop) => {
                    let props = IndexProperty.createFromElement($doc(prop));
                    indexProperties.push(...props);
                });
                //console.log(indexProperties.slice(0, 10))
                res(indexProperties);
            }).catch(rej);
        });
    }
    static getValues(property) {
        return new Promise((res, rej) => {
            got(property.href).then((response) => {
                var $doc = cheerio.load(response.body);
                var $anchorDefs = $doc(`a[name="${property.name}-prop"]`);
                var $idDefs = $doc(`#propdef-${property.name}`);
                var $defTable;
                if ($anchorDefs.length > 0) {
                    $defTable = $anchorDefs.parent().siblings(".def.propdef");
                }
                else if ($idDefs.length > 0) {
                    $defTable = $idDefs.parents(".def.propdef");
                }
                var valueCells = $defTable.find("tr:nth-child(2)>td:last-child");
                var values = [];
                valueCells.each((_, cell) => {
                    values.push(...SpecValue.createFromElement($doc(cell)));
                });
                res(values);
            }).catch(rej);
        });
    }
    static belongsTo(versions, property) {
        return versions.map((v) => v.name).indexOf(property.version.name) > -1;
    }
}
Runner.main();
//# sourceMappingURL=index.js.map