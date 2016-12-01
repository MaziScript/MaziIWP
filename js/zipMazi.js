/* What's needed: 
 * 1.JQuery
 * 2.jszip.js
 * 3.jszip-utils.js
*/

var loadZip = function (zipName) {
    return JSZip.loadAsync(zipName);
}

function getFile(zip, fileName, asyncType, splitId) {
    for (var id in zip.files) {
        if (zip.files[id].dir != true) {
            //console.log(zip.files[id].name);
            if (zip.files[id].name.split("/")[splitId] == fileName) {
                return zip.file(zip.files[id].name).async(asyncType)
                    .then(function success(content) {
                        return content;
                    }, function error(e) {
                        return "{\"type\" : \"error\", \"message\" : \"" + e.message + "\"}";
                    });
            }
        }
    }
}

var getMaziInfoJson = function (zip) {
    return getFile(zip, "mazi_info.json", "string", 1);
}

var getMaziChapterJson = function (zip, fileName) {
    return getFile(zip, fileName, "string", 2);
}

var getMaziChapterEntryList = function (maziInfo, entry) {
    if (typeof maziInfo.chapters != "undefined") {
        var chapter_num = maziInfo.chapters.chapterNum;
        var chapter_folder = maziInfo.chapters.chapterFolder;

        var arrChapter = new Array();
        for (var i = 1; i <= chapter_num; i++) {
            var chapter_id = "_" + i.toString();

            arrChapter.push(maziInfo.chapters[chapter_id][entry]);
        }

        return arrChapter;
    }
    else {
        console.log(errMazi["chapter_not_found"]);
        return new Array();
    }
}

var getMaziChapterNameList = function (maziInfo) {
    return getMaziChapterEntryList(maziInfo, "name");
}

var getMaziChapterFileNameList = function (maziInfo) {
    return getMaziChapterEntryList(maziInfo, "filename");
}