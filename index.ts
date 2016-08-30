
/*
    version:{
        name:string // e.g. css22, css-inilne-3, css-align-3
        subversions:[version*]
    }

    property => {
        name:string,
        css-version:css3, // ignore 2.1 (mostly a subset of 2.2)
        values: [literal*,token*,valdef*]
    }

    token => {
        value:string // border-width, length, color (resolvable to only literals)
    }

    literal => {
        name:string // inherit, block etc
    }

    rawProperty => {
        name:string
        links:[string+]
    }

    rawValues => {
        literals:[string+]
        links:[string+]
    }
*/

class Version{
    constructor(public name:string, public specNames:Array<string>){
    }

    //public toString():string {
    //    return `{ name!: ${this.name}, specNames: ${this.specNames.join(', ')}}`
    //}
}

class IndexProperty{
    constructor(public name:string, public version:Version){
    }

    public static createFromElement($el:cheerio.Cheerio):Array<IndexProperty>{
        let el = $el.get(0)
        let name = el.children[0].type === "text" ? el.childNodes[0].nodeValue : el.childNodes[0].childNodes[0].nodeValue
        name = name.replace(/\s/g, "");
        let $links = $el.find("a[href*='#propdef-']")
        return $links.toArray().map<IndexProperty>((link):IndexProperty => {
            var version = IndexProperty.getVersionFromHref(link.attribs["href"])
            return new IndexProperty(name, version)
        })
    }

    public static getVersionFromHref(href:string):Version{
        href = href.toLowerCase();
        for(let v of Versions.all()){
            for(let spec of v.specNames){
                if(href.indexOf(spec.toLowerCase()) > -1){
                    return v
                }
            }
        }
        console.log("unknown ref:" + href)
        return new Version("unknown", [href])
    }
}

import * as cheerio from "cheerio"
import * as got from "got"

class Versions {
    public static css2 = new Version("css22", ["css22"])
    public static css3 = new Version("css3", ["css-inline-3"])

    public static all():Array<Version>{
        return [
            Versions.css2,
            Versions.css3
        ]
    }
}

class Runner {

    public static main(){
        Runner
            .getProperties()
            .filter(Runner.belongsTo.bind(null, [Versions.css2, Versions.css3]))
            .forEach((p) => console.log(p.name, "belongs to", p.version.name))
    }

    public static getProperties():Array<IndexProperty>{
        got("https://drafts.csswg.org/indexes/#properties").then((response) => {
            var $doc = cheerio.load(response.body)
            var $props = $doc("#properties + div > ul.index > li")
            var indexProperties:Array<IndexProperty> = []
            $props.each((_, prop)=>{
                let props = IndexProperty.createFromElement($doc(prop))
                indexProperties.push(...props)
            })
            console.log(indexProperties)
        }).catch((err)=>{
            console.log(err)
        })

        return [
            new IndexProperty("display", Versions.css2),
            new IndexProperty("alignment", Versions.css3)
        ]
    }

    public static belongsTo(versions:Array<Version>, property:IndexProperty):boolean{
        return versions.map((v) => v.name).indexOf(property.version.name) > -1
    }
}

Runner.main();