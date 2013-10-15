#!/usr/bin/env node

var _ = require('lodash')
  , fs = require('fs')
  , mkdirp = require('mkdirp')
  , path = require('path')
  , phonegap = require('phonegap')
  , program = require('commander')
  , remove = require('remove')
  , replace = require('replace')
  , request = require('request')
  , string = require('string');

exports.build = function (options) {
  options = _.defaults(options || {}, {
    cwd: process.cwd(),
    dir: 'phonegap',
    domain: 'localhost',
    port: 3000
  });

  var dir = path.resolve(options.cwd, options.chdir || '', options.dir)
    , url = 'http://' + options.domain + ':' + options.port + '/'
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
      // include "phonegap.js" script at end of file
      fs.appendFile(file, '<script src="phonegap.js"></script>');
    }
  );

  // "http://domain:port/derby/lib-app-index.js" -> "phonegap/www/derby/lib-app-index.js"
  request({headers: {phonegap: true}, url: url + appPath})
    .pipe(fs.createWriteStream(appFile))
    .on('finish', function () {
      // specify the "http://" protocol because phonegap defaults to "file://"
      replace({paths: [appFile], regex: '//www', replacement: 'http://www'});
      // specify absolute url to server's browserchannel since it is not running on the device
      replace({paths: [appFile], regex: "'/channel'", replacement: "'" + url + "channel'"});
    }
  );
};

exports.init = function (options) {
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

program
  .version('0.0.1')
  .option('-C, --chdir <path>', 'change the working directory', String, '');

program
  .command('init [dir]')
  .description('Initializes phonegap directory within an existing derby project.')
  .option('-n, --name <name>', 'specify the name of the phonegap app')
  .option('-i, --id <id>', 'specify the id of the phonegap app')
  .action(function (dir, options) {
    exports.init(_.merge({dir: dir}, program, options));
  });

program
  .command('build [dir]')
  .description('Builds phonegap application from a running derby server.')
  .option('-d, --domain <domain>', 'specify the domain [localhost]', String, 'localhost')
  .option('-p, --port <port>', 'specify the port [3000]', Number, 3000)
  .action(function (dir, options) {
    exports.build(_.merge({dir: dir}, program, options));
  });

program.parse(process.argv);