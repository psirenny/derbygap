var _ = require('lodash')
  , fs = require('fs')
  , path = require('path')
  , phonegap = require('phonegap')
  , replace = require('replace')
  , request = require('request');

module.exports = function (options) {
  options = _.defaults(options || {}, {
    cwd: process.cwd(),
    dir: 'phonegap',
    domain: 'localhost',
    port: 3000
  });

  var dir = path.resolve(options.cwd, options.chdir || '', options.dir)
    , htmlFile = path.join(dir, 'www/index.html')
    , origin = 'http://' + options.domain + ':' + options.port
    , scriptPath = 'derby/lib-app-index.js'
    , scriptFile = path.join(dir, 'www', scriptPath);

  // ensure the server is on the domain whitelist
  replace({
    paths: [path.join(dir, 'www/config.xml')],
    regex: '<access origin=".+" role="server" />',
    replacement: '<access origin="' + origin + '" role="server" />',
    silent: true
  });

  function replaceHtml(regex, replacement) {
    replace({
      paths: [htmlFile],
      regex: regex,
      replacement: replacement,
      silent: true
    });
  }

  function replaceScript(regex, replacement) {
    replace({
      paths: [scriptFile],
      regex: regex,
      replacement: replacement,
      silent: true
    });
  }

  // "http://domain:port/index.html" -> "phonegap/www/index.html"
  request({headers: {phonegap: true}, url: origin})
    .pipe(fs.createWriteStream(htmlFile))
    .on('finish', function () {
      // initialize $phonegap model
      replaceHtml('"\\$connection": {', '"$phonegap": {"ready": false}, "$connection": {');

      // ensure that the script src to "derby/lib-app-index.js" is a relative url
      replaceHtml('/derby/lib-app-index', 'derby/lib-app-index');

      // ensure that the script src to the shared folder is a relative url
      replaceHtml('/shared', 'shared');

      // do not assume the app is connected to the server
      replaceHtml('"state": "connected"', '');

      // add device ready event to model
      var code1 = 'this\\.removeAttribute\\("onload"\\)';
      var code2 = 'DERBY.app.model.set("$phonegap.ready", !!window.phonegap); this.removeAttribute("onload")';
      replaceHtml(code1, code2);

      // include phonegap script
      fs.appendFile(htmlFile, fs.readFileSync(
        path.join(__dirname, 'script.html'), 'utf8')
      );
    }
  );

  // "http://domain:port/derby/lib-app-index.js" -> "phonegap/www/derby/lib-app-index.js"
  request({headers: {phonegap: true}, url: origin + '/' + scriptPath})
    .pipe(fs.createWriteStream(scriptFile))
    .on('finish', function () {
      // specify the "http://" protocol because phonegap defaults to "file://"
      replaceScript('//www', 'http://www');

      // make the browserchannel url to the server absolute
      replaceScript("'/channel'", "'" + origin + "/channel'");

      // modify window.location values to point to the server
      replaceScript('window.location.hostname', "'" + options.domain + "'");
      replaceScript('window.location.port', "'" + options.port + "'");
      replaceScript('window.location.protocol', "'http:'");
      replaceScript('window.location.pathname', "(window.location.pathname.slice(window.location.pathname.indexOf('index.html') + 10) + '/')");
    }
  );
};