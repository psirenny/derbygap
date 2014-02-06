#!/usr/bin/env node

var _ = require('lodash')
  , config = require('./package.json')
  , derbygap = require('./lib')
  , program = require('commander');

program
  .version(config.version)
  .option('-C, --chdir <path>', 'change the working directory', String, '');

program
  .command('init [dir]')
  .description('initialize a phonegap directory within an existing derby project')
  .option('-n, --name <name>', 'specify the name of the phonegap app')
  .option('-i, --id <id>', 'specify the id of the phonegap app')
  .action(function (dir, options) {
    derbygap.init(_.merge({dir: dir}, program, options));
  });

program
  .command('build [dir]')
  .description('build a phonegap application from a running derby server')
  .option('-d, --domain <domain>', 'specify the domain [localhost]', String, 'localhost')
  .option('-p, --port <port>', 'specify the port [3000]', Number, 3000)
  .action(function (dir, options) {
    derbygap.build(_.merge({dir: dir}, program, options));
  });

program.parse(process.argv);