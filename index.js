#!/usr/bin/env node

var fs = require('fs')
  , mkdirp = require('mkdirp')
  , path = require('path')
  , phonegap = require('phonegap')
  , program = require('commander')
  , remove = require('remove')
  , replace = require('replace')
  , request = require('request')
  , string = require('string');

program
  .version('0.0.1')
  .option('-C, --chdir <path>', 'change the working directory', String, '')
  .parse(process.argv);

cwd = path.resolve(__dirname, program.chdir);

if (!fs.existsSync(path.join(cwd, 'server.js'))) {
  return console.error('this is not a derby project');
}

program
  .command('init [dir]')
  .description('Initializes phonegap directory within an existing derby project.')
  .action(function (dir, options) {
    dir = path.join(cwd, dir || 'phonegap');
    var name = require(path.join(cwd, 'package.json')).name || '';
    var id = 'com.phonegap.' + string(name).dasherize(name).chompLeft('-');

    phonegap.create({id: id, name: name, path: dir}, function () {
      remove.removeSync(path.join(dir, 'www/css'));
      remove.removeSync(path.join(dir, 'www/img'));
      remove.removeSync(path.join(dir, 'www/index.html'));
      remove.removeSync(path.join(dir, 'www/js'));
      fs.mkdirSync(path.join(dir, 'www/derby'));
      mkdirp.sync(path.join(cwd, 'public/shared'));
      fs.symlinkSync(path.join(cwd, 'public/shared'), path.join(dir, 'www/shared'), 'dir');
    });
  });

program
  .command('build [dir]')
  .description('Builds phonegap application from a running derby server.')
  .option('-d, --domain <domain>', 'specify the domain [localhost]', String, 'localhost')
  .option('-p, --port <port>', 'specify the port [3000]', Number, 3000)
  .action(function (dir, options) {
    dir = path.join(cwd, dir || 'phonegap', 'www');
    var url = 'http://' + options.domain + ':' + options.port + '/';
    var file = path.join(dir, 'index.html');
    var appPath = 'derby/lib-app-index.js';
    var appFile = path.join(dir, appPath);

    request(url).pipe(fs.createWriteStream(file)).on('finish', function () {
      replace({paths: [file], regex: '/derby/', replacement: 'derby/'});
      fs.appendFile(file, '<script src="phonegap.js"></script>');
    });

    request(url + appPath).pipe(fs.createWriteStream(appFile)).on('finish', function () {
      replace({paths: [appFile], regex: '//www', replacement: 'http://www'})
      replace({paths: [appFile], regex: "'/channel'", replacement: "'" + url + "channel'"});
    });
  });

program.parse(process.argv);