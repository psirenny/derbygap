var _ = require('lodash')
  , fs = require('fs')
  , mkdirp = require('mkdirp')
  , path = require('path')
  , phonegap = require('phonegap')
  , remove = require('remove')
  , replace = require('replace')
  , string = require('string');

module.exports = function (options) {
  options = _.defaults(options || {}, {
    cwd: process.cwd(),
    dir: 'phonegap'
  });

  options.path = path.resolve(options.cwd, options.chdir || '');

  if (!options.name) {
    options.name = require(path.join(options.path, 'package.json')).name;
  }

  if (!options.id) {
    options.id = 'com.phonegap.' + string(options.name).dasherize().chompLeft('-');
  }

  options.path = path.join(options.path, options.dir);

  phonegap.create(options, function () {
    remove.removeSync(path.join(options.path, 'www/css'));
    remove.removeSync(path.join(options.path, 'www/img'));
    remove.removeSync(path.join(options.path, 'www/index.html'));
    remove.removeSync(path.join(options.path, 'www/js'));
    fs.mkdirSync(path.join(options.path, 'www/derby'));

    // create a shared static folder between the web app and the phonegap app
    mkdirp.sync(path.join(options.cwd, 'public/shared'));
    fs.symlinkSync(path.join(options.cwd, 'public/shared'), path.join(options.path, 'www/shared'), 'dir');

    // add "http://www.google.com" to the domain whitelist because
    // it is used by browserchannel to determine if the client is connected
    replace({
      paths: [path.join(options.path, 'www/config.xml')],
      regex: '<access',
      replacement: '<access origin="http://www.google.com" />\n\t<access origin="http://' + options.domain + ':' + options.port + '" role="server" />\n\t<access'
    });
  });
};