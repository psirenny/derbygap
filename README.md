derbygap
========

A simple tool to create a [PhoneGap](http://phonegap.com) app with [Derby](http://derbyjs.com).

Installation
------------

    $ npm install derbygap --save

Client Usage
------------

Creating a derbygap app is similar to creating a standard derby app.

In addition to creating the app's script bundle, you must also create
the app's html by calling `derbygap.writeHtml`:

This example assumes you have initialized a phonegap app (named phonegap)
in the root of your project.  

In your app init:

    var derbyApp = require('…');
    var expressApp = require('…');
    var store = require('…');
    var derby = require('derby');
    var derbygap = require('derbygap');
    var path = require('path');

    derby.run(function () {
      var dir = path.join(__dirname, 'phonegap/www');
      var localUrl = 'http://localhost:3000/phonegap';
      var opts = {serverUrl: 'http://foo.bar.com'};
      expressApp.listen(3000);

      // will write your app bundle to "phonegap/www/derby/….js"
      derbygap.writeScripts(derbyApp, store, dir, opts, function () {
        // will write your app html to "phonegap/www/index.html"
        derbygap.writeHtml(dir, localUrl);
      });
    });

Derbygap generates your app html by making a request to the running app.

Ensure that the route handling the url derbygap requests does NOT have redirects and does NOT render differently based on session information. Any redirect logic on the route should be run client side only.

In your view:

    <Head:>
      {{if $phonegap.enabled}}
      <script src="cordova.js"></script>
      {{/}}
      <base href="{{$phonegap.baseUrl}}">
      <script src="some/other/file.js"></script>  

Server Usage
------------

You may optionally include the derbygap middleware in your express app
to add `$phonegap` data to your model.

    var derbygap = require('derbygap');

    expressApp
      ...
      .use(store.modelMiddleware())
      .use(derbygap.middleware())
      ...

Middleware
----------

Adds the following model data:

`$phonegap.baseUrl` - Blank if phonegap is enabled and `"/"` otherwise.

`$phonegap.enabled` - `True` if phonegap is enabled.

Options:

**enabled** - Manually enable/disable the middleware.

**env** - Environment variable that will enable the middleware. Defaults to `PHONEGAP`.

**reqHeader** - Request header that will enable the middleware. Defaults to `X-PHONEGAP`.

Notes
-----

* Make sure the url you generate the html from does not contain server side specific logic, redirects, or change html/data based upon session information.

* Linked files should use relative rather than absolute urls. You can use `$phonegap.baseUrl` in your views as a url prefix for linking to files.
