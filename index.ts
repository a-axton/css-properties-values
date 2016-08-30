
/*
    token => {
        value:string // border-width, length, color (resolvable to only literals)
    }

    literal => {
        name:string // inherit, block etc
    }
*/

class Version{
    constructor(public name:string, public specNames:Array<string>){
    }
}

class CssProperty{
    constructor(public name:string, public version:Version, public values:Array<string>){
    }
}

class IndexProperty{
    constructor(public name:string, public version:Version, public href:string){
    }

    public static createFromElement($el:cheerio.Cheerio):Array<IndexProperty>{
        let el = $el.get(0)
        let name = el.children[0].type === "text" ? el.childNodes[0].nodeValue : el.childNodes[0].childNodes[0].nodeValue
        name = name.replace(/\s/g, "");
        let $links = $el.find("a[href*='#propdef-']")
        return $links.toArray().map<IndexProperty>((link):IndexProperty => {
            var href = link.attribs["href"]
            var version = IndexProperty.getVersionFromHref(href)
            return new IndexProperty(name, version, href)
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
            .getIndexProperties().then((props) => {
                var cssProperties = props
                    .filter(Runner.belongsTo.bind(null, [Versions.css2, Versions.css3]))
                    .map((indexProperty) => {
                        return Runner.getValues(indexProperty).then((values)=>{
                            return new CssProperty(indexProperty.name, indexProperty.version, values)
                        })
                    })
                return Promise.all(cssProperties).then((props:any)=>{
                    props.forEach((p) => console.log(p.name, "belongs to", p.version.name, ", values: ", p.values.join(', ')))
                })
            }).catch(console.log.bind(console))
    }

    public static getIndexProperties():Promise<Array<IndexProperty>>{
        return new Promise<Array<IndexProperty>>((res, rej) => {
            got("https://drafts.csswg.org/indexes/#properties").then((response) => {
                var $doc = cheerio.load(response.body)
                var $props = $doc("#properties + div > ul.index > li")
                var indexProperties:Array<IndexProperty> = []
                $props.each((_, prop)=>{
                    let props = IndexProperty.createFromElement($doc(prop))
                    indexProperties.push(...props)
                })
                //console.log(indexProperties.slice(0, 10))
                res(indexProperties)
            }).catch(rej)
        })
    }

    public static getValues(property:IndexProperty):Promise<Array<string>>{
        return new Promise<Array<string>>((res, rej) => {
            got(property.href).then((response) => {
                var $doc = cheerio.load(response.body)
                var $anchorDefs = $doc(`a[name="${property.name}-prop"]`)
                var $idDefs = $doc(`#propdef-${property.name}`)
                var $defTable:cheerio.Cheerio;

                if($anchorDefs.length > 0){
                    $defTable = $anchorDefs.parent().siblings(".def.propdef")
                }else if($idDefs.length > 0){
                    $defTable = $idDefs.parents(".def.propdef")
                }
                
                var values = $defTable.find("tr:nth-child(2)>td:last-child").text().split('|');
                values = values.map((s) => { return s.replace(/\s/g, "") });
                res(values);
            }).catch(rej)
        })
    }

    public static belongsTo(versions:Array<Version>, property:IndexProperty):boolean{
        return versions.map((v) => v.name).indexOf(property.version.name) > -1
    }
}

Runner.main();