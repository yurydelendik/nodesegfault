/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

//
// Node tool to dump SVG output into a file.
//

var fs = require('fs');
require('./domstubs.js');
var pdfjsLib = require('pdfjs-dist');

// Loading file from file system into typed array
var pdfPath = 'coredump.pdf';
var data = new Uint8Array(fs.readFileSync(pdfPath));

// Dumps svg outputs to a folder called svgdump
function writeToFile(svgdump, pageNum) {
return new Promise(function (resolve, reject) {
  var name = getFileNameFromPath(pdfPath);
  fs.mkdir('./svgdump/', function(err) {
    if (!err || err.code === 'EEXIST') {
      fs.writeFile('./svgdump/' + name + "-" + pageNum + '.svg', svgdump,
        function(err) {
          if (err) {
            console.log('Error: ' + err);
            reject(err);
          } else {
            console.log('Page: ' + pageNum);
            resolve();
          }
        });
    }
  });
});
}

// Fix via sync's
function writeToFileSync(svgdump, pageNum) {
  var name = getFileNameFromPath(pdfPath);
  if (!fs.existsSync('./svgdump/')) {
    fs.mkdirSync('./svgdump/');
  }
  try {
    fs.writeFileSync('./svgdump/' + name + '-' + pageNum + '.svg', svgdump, 'utf-8');
    console.log('Page: ' + pageNum);
  } catch(err) {
    console.log('Error: ' + err);
  }
}

// Get filename from the path

function getFileNameFromPath(path) {
  var index = path.lastIndexOf('/');
  var extIndex = path.lastIndexOf('.');
  return path.substring(index, extIndex);
}

// Will be using promises to load document, pages and misc data instead of
// callback.
pdfjsLib.getDocument({
  data: data,
  // Try to export JPEG images directly if they don't need any further processing.
  nativeImageDecoderSupport: pdfjsLib.NativeImageDecoding.DISPLAY
}).then(function (doc) {
  var numPages = doc.numPages;
  console.log('# Document Loaded');
  console.log('Number of Pages: ' + numPages);
  console.log();

  var lastPromise = Promise.resolve(); // will be used to chain promises
  var loadPage = function (pageNum) {
    return doc.getPage(pageNum).then(function (page) {
      console.log('# Page ' + pageNum);
      var viewport = page.getViewport(1.0 /* scale */);
      console.log('Size: ' + viewport.width + 'x' + viewport.height);
      console.log();

      return page.getOperatorList().then(function (opList) {
        var svgGfx = new pdfjsLib.SVGGraphics(page.commonObjs, page.objs);
        svgGfx.embedFonts = true;
        return svgGfx.getSVG(opList, viewport).then(function (svg) {
          var svgDump = svg.toString();
//          return writeToFileSync(svgDump, pageNum);
          return writeToFile(svgDump, pageNum);
        });
      });
    })
  };

  for (var i = 1; i <= numPages; i++) {
    lastPromise = lastPromise.then(loadPage.bind(null, i));
  }
  return lastPromise;
}).then(function () {
  console.log('# End of Document');
}, function (err) {
  console.error('Error: ' + err);
});
