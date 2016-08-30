'use strict';


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

main(){
    props = getProperties().filter(belongsTo(css22, css3))
    resolvedProps = props.map(createProperty)
}

getProperties(){
    var url = https://drafts.csswg.org/indexes/#properties
    return parse(url).find('li').map(createRawProperty)
}

createProperty(rawProp){
    return new Property(rawProp.name, rawProp.links.map(createValues))
}

createValues(link){
    return getLiterals(link)
}

*/

const fs = require('fs');
const cheerio = require('cheerio');
const got = require('got');
const each = require('async-each');

const parentUrl = 'http://www.w3schools.com/cssref/';
const childUrl = (url) => `${parentUrl}${url}`;
const results = [];

const getPropValues = (url) => {
  return new Promise((resolve, reject) => {
    got(childUrl(url))
      .then(response => {
        let $child = cheerio.load(response.body);
        let $rows = $child('.w3-table-all tr');
        let results = [];

        $rows.each((i, row) => {
          if (i > 0) {
            let $cols = $child(row).find('td');
            let value = $cols.eq(0).text();
            results.push(value);
          }
        });
        resolve(results);
      })
      .catch(reject);
  });
};

const saveResults = () => {
  fs.writeFile('css-properties-values.json', JSON.stringify(results));
}

got(parentUrl)
  .then(response => {
    let $parent = cheerio.load(response.body);
    let $rows = $parent('.w3-table-all tr');

    each($rows.toArray(), (row, next) => {
      let $cols = $parent(row).find('td');
      let property = $cols.eq(0).text();
      let childUrl = $parent(row).find('a').attr('href');

      // no prop, skip
      if (!property.length) {
        next();
      } else {
        if (childUrl) {
          // get values of property
          getPropValues(childUrl)
            .then((values) => {
              results.push({
                property,
                values
              });
              next();
            })
            .catch((err) => console.log(err));
        } else {
          // no values, push anyways
          results.push({
            property,
            values: null
          });
          next();
        }
      }
    }, saveResults);
  })
  .catch(error => {
    console.log(error.response.body);
  });
