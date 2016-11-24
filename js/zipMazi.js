/* What's needed: 
 * 1.JQuery
 * 2.jszip.js
 * 3.jszip-utils.js
*/

var maziUtils = function(){
    var splitZipFilename = function(absName){
        return absName.split("/");
    }
}

function getFile(zipName, fileName, asyncType, splitId) {
     return JSZip.loadAsync(zipName)
        .then(function (zip) {
            for (var id in zip.files) {
                if(zip.files[id].dir != true) {
                    if (zip.files[id].name.split("/")[splitId] == fileName) {
                        //Test
                        console.warn(zip.files[id].name);

                        return zip.file(zip.files[id].name).async(asyncType)
                        .then(function success(content) {
                            return content;
                        }, function error(e) {
                            return "{\"type\" : \"error\", \"message\" : \"" + e.message + "\"}";
                        });
                    }
                }
            }
        });
}

var getMaziInfoJson = function(zipName){
    return getFile(zipName, "mazi_info.json", "string", 1);
}