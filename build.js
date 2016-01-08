'use strict';

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
