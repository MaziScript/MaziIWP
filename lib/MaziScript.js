/**
 * MaziScript
 * 
 * @file MaziScript.js
 * @version 0.0.1
 * @description MaziScript的核心部分，负责Markdown的核心匹配和转义
 * 
 * @license MIT License
 * @author Yesterday17
 * {@link http://www.yesterday17.cn}
 * 
 * @updateTime 2016-12-08
 */

var MaziScript = function(){
    "use strict";

    var chapterData = {
        //辅助信息
        origin : "",                   //原始文本
        handle : "",                   //处理的文本，随时会改变

        //MaziScript分部分
        content : "",                  //正文部分
        appendix : "",                 //附录部分，即原补记部分

        //章节的要素
        title : ""                     //章节的标题，通过title(rep)识别
    }

    var regex = {
        title : /[\[【][^\]】]+[\]】]/g,

        horizontal : /###[#]+/g,

        escape : /[\\\'\*\_\{\}\[\]\(\)\#\+-\.!]/g
    };

    /**
     * 获得章节的标题 保存并进行转义处理
     * 
     * @param replaceBracket 是否在显示时将章节的方括号删除
     * @returns {void}
     */
    var title = function(replaceBracket){
        var rep = typeof replaceBracket === "boolean" ? replaceBracket : true;

        chapterData.handle = chapterData.handle.replace(regex.title, function(match, pos, originalText){
            chapterData.title = match.substring(1, match.length - 1);

            if(rep) {
                return chapterData.title;
            }
            else{
                return match;
            }
        });
    }

    /**
     * 根据由#构成的分隔线区分MaziScript中的部分
     */
    var horizontal = function(){
        //
    }

    /**
     * Markdown转义 整个过程的最后一步
     * 
     * @param {void}
     * @returns {void}
     */
    var escape = function(){
        //TODO: 增加字符的转义，避免转义字符的使用
        chapterData.handle =  chapterData.handle.replace(regex.escape, "\\$&");

        //Debug Use.
        //return text.match(regex.escape);
    }

    return {
        parse : function(text){
            chapterData.origin = chapterData.handle = text;

            title(true);

            escape();
            //console.log(mazi);    
        },

        debug : function(){
            console.log(chapterData);
        }
    };

}();