/* What's needed: 
 * 1.JQuery
 * 2.jszip.js
 * 3.jszip-utils.js
*/

function getFile(zipName, fileName, asyncType) {
    JSZip.loadAsync(zipName)
        .then(function (zip) {
            zip.forEach(function (relativePath, zipEntry) {
                try {
                    if (zipEntry.name == fileName) {
                        zip.file(zipEntry.name).async(asyncType)
                            .then(function success(content) {
                                //Add success code here.
                                return content;
                            }, function error(e) {
                                //Add error code here.
                                return "{\"type\" : \"error\", \"message\" : \"" + e.message + "\"}";
                            });
                    }
                }
                catch (e) {
                    return "{\"type\" : \"error\", \"message\" : \"" + e.message + "\"}";
                }
            });
        }, function (e) {
            return "{\"type\" : \"error\", \"message\" : \"" + e.message + "\"}";
        });
}