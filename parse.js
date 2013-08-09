var fs = require('fs')
  , path = require('path')
  , trumpet = require('trumpet');

module.exports = function (dir) {
  var tr = trumpet();

  tr.selectAll('script[src^=/derby/lib-app-index]', function (el) {
    // remove leading "/" from src
    el.setAttribute('src', 'derby/lib-app-index.js');

    // include phonegap.js
    el.createWriteStream().end('</script><script src="phonegap.js">');
  });

  tr.pipe(fs.createWriteStream(path.join(dir, 'www/index.html')));
  return tr;
};