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
    , url = 'http://' + options.domain + ':' + options.port
    , file = path.join(dir, 'www/index.html')
    , appPath = 'derby/lib-app-index.js'
    , appFile = path.join(dir, 'www', appPath);

  // ensure the server is on the domain whitelist
  // so that the browserchannel connection isn't rejected
  replace({
    paths: [path.join(dir, 'www/config.xml')],
    regex: '<access origin=".+" role="server" />',
    replacement: '<access origin="' + url + '" role="server" />'
  });

  // "http://domain:port/index.html" -> "phonegap/www/index.html"
  request({headers: {phonegap: true}, url: url})
    .pipe(fs.createWriteStream(file))
    .on('finish', function () {
      // ensure script src to "derby/lib-app-index.js" is a relative url
      replace({paths: [file], regex: '/derby', replacement: 'derby'});
      // ensure script src to shared folder is a relative url
      replace({paths: [file], regex: '/shared', replacement: 'shared'});
      // do not assume the app is connected
      replace({paths: [file], regex: '"state": "connected"', replacement: ''});
      // include "phonegap.js" script at end of file
      fs.appendFile(file, '<script src="phonegap.js"></script>');
    }
  );

  // "http://domain:port/derby/lib-app-index.js" -> "phonegap/www/derby/lib-app-index.js"
  request({headers: {phonegap: true}, url: url + '/' + appPath})
    .pipe(fs.createWriteStream(appFile))
    .on('finish', function () {
      // specify the "http://" protocol because phonegap defaults to "file://"
      replace({paths: [appFile], regex: '//www', replacement: 'http://www'});
      // specify absolute url to server's browserchannel since it is not running on the device
      replace({paths: [appFile], regex: "'/channel'", replacement: "'" + url + "/channel'"});
      // modify window.location values to point to the server
      replace({paths: [appFile], regex: 'window.location.hostname', replacement: "'" + options.domain + "'"});
      replace({paths: [appFile], regex: 'window.location.port', replacement: "'" + options.port + "'"});
      replace({paths: [appFile], regex: 'window.location.protocol', replacement: "'http:'"});
      replace({paths: [appFile], regex: 'window.location.pathname', replacement: "(window.location.pathname.slice(window.location.pathname.indexOf('index.html') + 10) + '/')"});
    }
  );
};