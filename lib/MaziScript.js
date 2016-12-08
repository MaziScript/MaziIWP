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
        //信息
        origin : "",                   //原始文本
        handle : "",                   //处理的文本，随时会改变

        //辅助数据
        titleData : {
            start : -1,                //标题在origin中的开始位置（未执行rep操作）
            end : -1,                  //标题在handle中的结束位置（未执行rep操作）

            ctStart : -1,              //标题内容在handle中的开始位置
            ctEnd : -1                 //标题内容在handle中的结束位置
        },

        //MaziScript分部分
        title : "",                    //章节的标题，通过title(rep)识别
        horizontalPart : [],           //未经过分析的分隔线分开的部分
        content : {                    //正文部分
            text : [],                 //真正的文章内容 计算字数
            append : []                //不计入字数的作者赠送字数/感言
        },
        appendix : [],                 //附录部分，即原补记部分
        command : [],                  //从正文/附录等中获得的语句信息

        //MaziScript辅助信息存放
        flag : [],                     //被{}标记的内容

        //最终的内容
        final : ""
    };

    //创建chapterData的空拷贝 以便清空时使用
    var emptyChapterData = $.extend(true, {}, chapterData);

    var defaultOptions = {
        titlePrefix : true,
        replaceBracket : true,

        //段首空格规范
        paragraphProfix : true,
        paragraphProfixNum : 2
    };

    /**
     * titleStart参数 遗留产物 统一数据调用
     */
    Object.defineProperty(chapterData, "titleStart", {
        /**
         * titleStart get()
         * 
         * @param {void}
         * @returns {Number} 和titleData.start相同
         */
        get : function(){
            return this.titleData.start;
        },

        /**
         * titleStart set()
         * 
         * @param {Number} value 需要改成的数值
         * @returns {null}
         */
        set : function(value){
            if(typeof value == "number" && value != -1){
                this.titleData.start = value;
            }
        }
    });

    /**
     * titleEnd参数 遗留产物 统一数据调用
     */
    Object.defineProperty(chapterData, "titleEnd", {
        /**
         * titleEnd get()
         * 
         * @param {void}
         * @returns {Number} 和titleData.end相同
         */
        get : function(){
            return this.titleData.end;
        },

         /**
         * titleEnd set()
         * 
         * @param {Number} value 需要改成的数值
         * @returns {null}
         */
        set : function(value){
            if(typeof value == "number" && value != -1){
                this.titleData.end = value;
            }
        }
    });

    //正则表达式列表
    var regex = {
        title : /[\[【][^\]】]+[\]】]/g,                          //以[]括起的内容为标题
        flag : /\{[^\{\}]+\}/g,                                  //以{}括起的内容未标记
        language : /=[》>][^\n]+\n/g,                            //以=>开头的一行视为语句

        horizontal : /[#]+###[^####]*/g,                         //大于等于四个#(####)的独立一行视作分隔线
        contentAppend : /[-]+---[^----]*/,
        escape : /[\\\'\*\_\{\}\[\]\(\)\#\+-\.!]/g               //Markdown中需要转义的字符
    };

    //为增强结构（可视化）进行的结构修正
    var structure = {
        titlePrefix : "##",
        paragraphPrefix : "　",

        contentFlag : "正文",
        appendixFlag : "附录"
    };

    //工具箱
    var utils = {
        /**
         * 去除字符串开头的指定字符
         * 
         * @param {String} str 需要处理的字符串
         * @param {String} chars 需要移除的字符组成的字符串
         * @returns {String} 处理后的字符串
         */
        removeBeginningChars : function(str, chars){
            (function(){
                //注：str.length属性是会随时改变的 不是第一次记录的值
                var len = str.length;
                for(var i = 0 ; i <= len ; i++){
                    //console.log(str.length);
                    var flag = false;

                    for(var j = 0 ; j <= chars.length ; j++){
                        if(str[0] == chars[j]){
                            str = str.substring(1);
                            flag = true;
                            break;
                        }
                    }

                    if(!flag) break;
                }
            })();
            return str;
        },

        /**
         * 去除字符串末尾的指定字符
         * 
         * @param {String} str 需要处理的字符串
         * @param {String} chars 需要移除的字符组成的字符串
         * @returns {String} 处理后的字符串
         */
        removeEndingChars : function(str, chars){
            (function(){
                var len = str.length;
                for(var i = 0 ; i <= len ; i++){
                    var flag = false;

                    for(var j = 0 ; j <= chars.length ; j++){
                        if(str[str.length - 1] == chars[j]){
                            str = str.substring(0, str.length - 1);
                            flag = true;
                            break;
                        }
                    }

                    if(!flag) break;
                }
            })();
            return str;
        },

        /**
         * 获得字符串移除了的字符数量
         * 
         * 
         */
        removedLength : function(origin, final){
            if(typeof origin == typeof final == "string"){
                return origin.length - final.length;
            }
            else{
                return -1;
            }
        },

        removeCrlf : function(str){
            return this.removeEndingChars(this.removeBeginningChars(str, "\n"), "\n");
        }
    }

    /**
     * 获得章节的标题 保存并进行转义处理
     * 
     * @param {Boolean} replaceBracket 是否在显示时将章节的方括号删除
     * @returns {void}
     */
    var title = function(replaceBracket){
        var rep = typeof replaceBracket === "boolean" ? replaceBracket : true;

        chapterData.handle = chapterData.handle.replace(regex.title, function(match, pos, originalText){
            if(chapterData.title.length != 0) return match;

            chapterData.title = match.substring(1, match.length - 1);

            //完成位置的对应
            chapterData.titleData.start = pos
            chapterData.titleData.end = pos + match.length;
            
            //测试，可以直接通过substring函数获得其内容
            //console.log(chapterData.origin.substring(chapterData.titleStart, chapterData.titleEnd));
            //注：titleStart和titleEnd是旧版本内容 现内容全部更正至chapterData.titleData.start/end

            if(rep) {
                chapterData.titleData.ctStart = chapterData.titleData.start + 1;
                chapterData.titleData.ctEnd = chapterData.titleData.end - 1;

                chapterData.final = (defaultOptions.titlePrefix ? structure.titlePrefix : "") + chapterData.title;
                return "";
            }
            else{
                chapterData.titleData.ctStart = chapterData.titleData.start;
                chapterData.titleData.ctEnd = chapterData.titleData.end;
                
                chapterData.final = (defaultOptions.titlePrefix ? structure.titlePrefix : "") + match;
                return "";
            }
        });
        utils.removeCrlf(chapterData.handle);
    }

    /**
     * 根据由#构成的分隔线区分MaziScript中的部分
     * 
     * @param {void}
     * @returns {void}
     */
    var horizontal = function(){
        chapterData.handle = chapterData.handle.replace(regex.horizontal, function(match, pos, originalText){
            chapterData.horizontalPart.push(utils.removeEndingChars(utils.removeBeginningChars(match, "#\n"), "\n"));
            
            return "";
            //return utils.removeBeginningChars(match, "#");
        });
        utils.removeCrlf(chapterData.handle);
    }

    /**
     * 根据每个部分的开头确定部分的处理办法
     * 
     * @param {void}
     * @returns {void}
     */
    var definePart = function(){
        (function(){
            for(var i in chapterData.horizontalPart){
                var text = utils.removeCrlf(chapterData.horizontalPart[i]);
                var flagType = -1;
                
                text = text.replace(regex.flag, function(match, pos, originalText){
                    var flagContent = match.substring(1, match.length - 1);
                    var type = -1;

                    switch(flagContent){
                        case structure.contentFlag:
                            flagType = type = 1;
                            break;
                        case structure.appendixFlag:
                            flagType = type = 2;
                            break;
                        default:
                            chapterData.flag.push(flagContent);
                            type = -1;
                            break;
                    }

                    return type == 1 || type == 2 ? "" : flagContent;
                });

                text = text.replace(regex.language, function(match, pos, originalText){
                    chapterData.command.push(match.substring(2));
                    return "";
                });

                if(flagType == 1){
                    (function(){
                        //
                        //区分是否存在作者留言
                        var append = text.match(regex.contentAppend).length !== 0;

                        if(!append){
                            chapterData.content.push(text);
                        }
                        else{
                            text = text.replace(regex.contentAppend, function(match, pos, originalText){
                                chapterData.content.append.push(utils.removeBeginningChars(match, "-\n"));
                                return "";
                            });
                            chapterData.content.text.push(text);
                        }
                    })();
                }
                else{
                    chapterData.appendix.push(text);
                }

                //Debug
                console.log(text);
            }
        })();
    }

    /**
     * Markdown转义 整个过程的最后一步
     * 
     * @param {void}
     * @returns {void}
     */
    var escape = function(){
        //TODO: 增加字符的转义，避免转义字符的使用
        (function(){
            for(var i in chapterData.content.text){
                chapterData.final += "\n" + chapterData.content.text[i].replace(regex.escape, "\\$&");
            }

            for(i in chapterData.content.append){
                chapterData.final += "\n" + chapterData.content.append[i].replace(regex.escape, "\\$&");
            }
        })();
        //chapterData.final += chapterData.handle.replace(regex.escape, "\\$&");
        //chapterData.handle = chapterData.handle.replace(regex.escape, "\\$&");
    }

    return {
        /**
         * 进行MaziScript文本解释
         * 
         * @param {String} text 输入的文本
         * @returns {String} 处理后的Markdown文本
         */
        parse : function(text){
            this.clear();

            if(typeof text == "undefined"){
                chapterData.origin = chapterData.handle = "";
            }
            else{
                chapterData.origin = chapterData.handle = text;
            }

            //根据options确定是否移除括号
            title(defaultOptions.replaceBracket);
            horizontal();

            definePart();

            console.log(chapterData);

            //进行转义处理
            escape();

            if(chapterData.final != undefined){
                return chapterData.final;
            }
            else{
                return "";
            }
        },

        /**
         * 清空已经使用了的chapterData
         * 
         * @param {void}
         * @returns {void}
         */
        clear : function(){
            chapterData = $.extend(true, {}, emptyChapterData);
        },

        /**
         * 输出调试信息
         * 
         * @param {void}
         * @returns {void}
         */
        debug : function(){
            console.log(chapterData);
            console.log(emptyChapterData);
        }
    };

}();