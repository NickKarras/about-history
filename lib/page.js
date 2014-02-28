/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
'use strict';

const { PageMod } = require('sdk/page-mod');
const { data } = require('sdk/self');
const { getFavicon } = require("sdk/places/favicon");
const tabs = require('sdk/tabs');

const about = require('pathfinder/scheme/about');

const database = require('./metadata/database');
const { history, remove } = require('./history');
const { hasBookmark } = require('./bookmarks');
const moment = require('./utils/moment');

const historyDataUrl = data.url('history.html');
const aboutHistory = 'about:history';

// create about:history url handler
about.add({
  what: 'history',
  url: historyDataUrl,
  content: data.load('history.html')
});

// setup a page-mod to pipe information for about:history
PageMod({
  include: aboutHistory,
  contentScriptFile: data.url("history-pagemod.js"),
  attachTo: ["existing", "top"],
  contentScriptWhen: "start",
  onAttach: worker => {
    let resetHistory = reset.bind(null, worker);

    // send the working date
    worker.port.on("history:date", date => {
      var start = moment(date).startOf('day'),
          end = moment(date).endOf('day');
      history({ from: start, to : end }).then(resetHistory);
    });

    worker.port.on("history:events:click", url => tabs.open(url));

    worker.port.on("history:events:delete", url => {
      // remove actual history
      remove(url);
    });

    worker.port.on("history:events:query", query => {
      history({ query: query }).then(resetHistory);
    });
  }
});

function reset(worker, results) {
  worker.port.emit("history:reset", results);
  results.forEach(({ url }) => {
    getFavicon(url).then(icon_url => {
      worker.port.emit("url:icon", {
        url: url,
        icon_url: icon_url
      });
    });

    database.get(url).then(metas => {
      if (metas) {
        worker.port.emit("url:meta", metas);
      }
    });

    hasBookmark(url).then(bookmarked => {
      if (bookmarked) {
        worker.port.emit('url:bookmark', { url: url });
      }
    });
  });
}
