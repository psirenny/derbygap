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

  var dir = path.resolve(options.cwd, options.chdir || '');

  if (!options.name) {
    options.name = require(path.join(dir, 'package.json')).name;
  }

  if (!options.id) {
    options.id = 'com.phonegap.' + string(options.name).dasherize().chompLeft('-');
  }

  dir = path.join(dir, options.dir);

  phonegap.create({id: options.id, name: options.name, path: dir}, function () {
    remove.removeSync(path.join(dir, 'www/css'));
    remove.removeSync(path.join(dir, 'www/img'));
    remove.removeSync(path.join(dir, 'www/index.html'));
    remove.removeSync(path.join(dir, 'www/js'));
    fs.mkdirSync(path.join(dir, 'www/derby'));

    // create a shared static folder between the web app and the phonegap app
    mkdirp.sync(path.join(options.cwd, 'public/shared'));
    fs.symlinkSync(path.join(options.cwd, 'public/shared'), path.join(dir, 'www/shared'), 'dir');

    // add "http://www.google.com" to the domain whitelist because
    // it is used by browserchannel to determine if the client is connected
    replace({
      paths: [path.join(dir, 'www/config.xml')],
      regex: '<access',
      replacement: '<access origin="http://www.google.com" />\n\t<access origin="http://' + options.domain + ':' + options.port + '" role="server" />\n\t<access'
    });
  });
};