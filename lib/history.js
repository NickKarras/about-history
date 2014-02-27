'use strict';

const { URL } = require('sdk/url');
const { defer } = require('sdk/core/promise');
const { search } = require('sdk/places/history');
const { merge } = require("sdk/util/object");
const moment = require('./utils/moment');
const DATE = moment().startOf('day');

function normalize(historyObj) {
  var u = URL(historyObj.url);
  historyObj["host"] = u.host;
  historyObj["scheme"] = u.scheme;
  historyObj["icon"] = "";
  return historyObj;
}

function history(options) {
  options = validateOptions(options);
  let deferred = defer();

  search([options], {
    count: 50,
    sort: "dateAdded",
    descending: true
  }).on("end", results => {
    results = results.map(result => normalize(result)).
                      // filter out NULL history items because redirectsMode isn't working
                      filter(item => item.title !== null);

    deferred.resolve(results);
  });

  return deferred.promise;
}
exports.history = history;

function validateOptions(options) {
  // query, url, from, to
  options = merge({ redirectsMode : 2 }, options);

  if (typeof options.query === "undefined" && typeof options.domain === "undefined") {
    options = merge({
      from: DATE.valueOf()
    }, options);
  }

  return options;
}
