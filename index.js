'use strict';

var derby = require('derby');
var fs = require('fs');
var path = require('path');
var replace = require('replacestream');
var request = require('superagent');
var through = require('through2');
var tracksPathQuery = path.join(require.resolve('tracks-path-query'), '../..');

exports.middleware = function (options) {
  if (!options) options = {};
  if (!options.env) options.env = 'PHONEGAP';
  if (!options.reqHeader) options.reqHeader = 'X-PHONEGAP';

  return function(req, res, next) {
    var enabled = options.enabled;
    var model = req.getModel();
    if (!model) return next();
    if (enabled == null) enabled = process.env[options.env] || req.get(options.reqHeader);
    model.set('$phonegap.baseUrl', enabled ? '' : '/');
    model.set('$phonegap.enabled', !!enabled);
    next();
  };
};

exports.writeHtml = function (dir, url, callback) {
  var output = fs.createWriteStream(
    path.join(dir, 'index.html')
  );

  request
    .get(url)
    .set('X-PHONEGAP', true)
    .pipe(replace('<script async src="/derby', '<script async src="derby'))
    .pipe(output)
    .on('error', callback)
    .on('finish', callback);
};

exports.writeScripts = function (app, store, dir, options, cb) {
  store.on('bundle', function (bundle) {
    // make tracks (routing) compatible with the file:// protocol
    bundle.require(tracksPathQuery, {expose: 'tracks'});

    bundle.transform(function (file) {
      return through(function (buf, enc, next) {
        var code = buf.toString('utf8');
        code = code.replace('"/derby/', '"derby/');
        code = code.replace('App.prototype._autoRefresh = function() {', 'App.prototype._autoRefresh = function() {return;');
        this.push(code);
        next();
      });
    });
  });

  app.bundle(store, options, function (err, source, map) {
    if (err) return cb(err);
    dir = path.join(dir, 'derby');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    var filename = app.name + '-' + app.scriptHash;
    var base = path.join(dir, filename);
    app.scriptUrl = '/derby/' + filename + '.js';

    // Write current map and bundle files
    if (!(options && options.disableScriptMap)) {
      // Make source map url relative rather than absolute
      // because phonegap prepends absolute urls with "file://.../" junk.
      app.scriptMapUrl = filename + '.map.json';
      source += '\n//# sourceMappingURL=' + app.scriptMapUrl;
      app.scriptMapFilename = base + '.map.json';
      fs.writeFileSync(app.scriptMapFilename, map, 'utf8');
    }
    app.scriptFilename = base + '.js';
    fs.writeFileSync(app.scriptFilename, source, 'utf8');

    // Delete app bundles with same name in development so files don't
    // accumulate. Don't do this automatically in production, since there could
    // be race conditions with multiple processes intentionally running
    // different versions of the app in parallel out of the same directory,
    // such as during a rolling restart.
    if (false && !derby.util.isProduction) {
      var filenames = fs.readdirSync(dir);
      for (var i = 0; i < filenames.length; i++) {
        var item = filenames[i].split(/[-.]/);
        if (item[0] === app.name && item[1] !== app.scriptHash) {
          var oldFilename = path.join(dir, filenames[i]);
          fs.unlinkSync(oldFilename);
        }
      }
    }
    cb();
  });
};
