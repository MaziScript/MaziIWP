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

function getFile(zipName, fileName, asyncType) {
    var ans;

    JSZip.loadAsync(zipName)
        .then(function (zip) {
            var arr = zip.files;
            console.log(arr);
            for (var zipEntry in arr) {
                if(zipEntry.dir != true) {
                    console.log(zipEntry);
                    if (zipEntry.name.split("/")[1] == fileName) {
                        zip.file(zipEntry.name).async(asyncType)
                        .then(function success(content) {
                            //Add success code here.
                            ans = content;
                        }, function error(e) {
                            //Add error code here.
                            ans = "{\"type\" : \"error\", \"message\" : \"" + e.message + "\"}";
                        });
                    }
                    else{
                        ans = "{\"type\" : \"error\", \"message\" : \"" + "e.message" + "\"}";
                    }
                }
            };
        }, function (e) {
            ans = "{\"type\" : \"error\", \"message\" : \"" + e.message + "\"}";
        })
        .done();
        return ans;
}