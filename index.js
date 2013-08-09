#!/usr/bin/env node

var derby = require('derby')
  , fs = require('fs')
  , mkdirp = require('mkdirp')
  , parse = require('./parse')
  , path = require('path')
  , phonegap = require('phonegap')
  , program = require('commander')
  , remove = require('remove')
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
    dir = path.join(cwd, dir || 'phonegap');
    var url = 'http://' + options.domain + ':' + options.port + '/';
    var appPath = 'derby/lib-app-index.js';
    request(url).pipe(parse(dir));
    request(url + appPath).pipe(fs.createWriteStream(path.join(dir, 'www', appPath)));
  });

program.parse(process.argv);