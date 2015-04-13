/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
'use strict';

const { Ci, Cu } = require('chrome');
const { URL } = require('sdk/url');
const { defer } = require('sdk/core/promise');
const { search } = require('sdk/places/history');
const { merge } = require('sdk/util/object');
const { newURI } = require('sdk/url/utils');
const { getTLD } = require('sdk/url');
const { prefs } = require('sdk/simple-prefs');

const { PlacesUtils: {
  history: hstsrv
} } = require('resource://gre/modules/PlacesUtils.jsm');

function normalize(historyObj) {
  var u = URL(historyObj.url);
  historyObj['host'] = u.host;
  historyObj['scheme'] = u.scheme;
  historyObj['icon'] = '';
  return historyObj;
}

function remove(url) {
  hstsrv.removePage(newURI(url));
}
exports.remove = remove;

function removeDomain(url) {
  hstsrv.removePagesFromHost(getTLD(url), true);
}
exports.removeDomain = removeDomain;

function history(options) {
  options = validateOptions(options);
  let deferred = defer();

  search([options], {
    count: prefs['limit'],
    sort: 'date',
    descending: true
  }).on('end', results => {
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

  return options;
}
