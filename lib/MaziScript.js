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
 * @updateTime 2016-12-09
 */

var MaziScript = function(options){
    "use strict";

    var chapterData = {
        //信息
        origin : "",                   //原始文本
        handle : "",                   //处理的文本，随时会改变

        //MaziScript分部分
        title : "",                    //章节的标题，通过title(rep)识别
        horizontalPart : [],           //未经过分析的分隔线分开的部分
        content : {                    //正文部分
            text : [],                 //真正的文章内容 计算字数
            append : []                //不计入字数的作者赠送字数/感言
        },
        appendix : [],                 //附录部分，即原补记部分
        command : [],                  //从正文/附录等中获得的命令
        commandBlock : [],             //正文/附录中语句块的命令
        commandPart : [],              //语句板块

        //MaziScript辅助信息存放
        flag : [],                     //被{}标记的内容
        dataJson : [],                 //保存人物/地点等数据的对象

        //最终的内容
        final : ""
    };

    //创建chapterData的空拷贝 以便清空时使用
    var emptyChapterData = $.extend(true, {}, chapterData);

    var defaults = {
        titlePrefix : true,          //标题前置格式
        replaceBracket : true,       //标题自动去除括号

        //段首空格规范
        paragraphPrefix : true,      //段首留出空格
        paragraphPrefixNum : 2,      //段首字符的个数
        appendPrefix : true,         //留言部分是否需要增加段首空格
        appendBreakLine : false,     //留言部分显示时是否增加一条分隔线

        //关于附录部分的内容
        appendixShow : false,         //是否显示附录部分的内容
        appendixBreakLine : false     //附录部分显示时是否显示分隔线
    };

    //正则表达式列表
    var regex = {
        title : /[\[【][^\]】]+[\]】]/g,                          //以[]括起的内容为标题
        flag : /\{[^\{\}]+\}/g,                                  //以{}括起的内容未标记
        language : /\n=[》>][^\n]+\n/g,                          //以=>开头的一行视为语句
        //语句块的判断
        languageBlock : /\n=[》>][^\n]+\n(?:  [^\n:：]+[:：][^\n]+\n)+/g,
        blockSplit : /([^\:：]+)[:：]([^\:：]+)/,                 //语句快中的分割识别

        horizontal : /\n[#]+###\n/g,                             //大于等于四个#(####)的独立一行视作分隔线
        contentAppend : /\n[-]+---\n/,                           //作者留言的标志

        paraPrefix : /[^\n]+\n/g,                                //段落开头缩进的匹配
        escape : /[\\\'\*\_\{\}\[\]\(\)\#\+-\.!]/g               //Markdown中需要转义的字符
    };

    //为增强结构（可视化）进行的结构修正
    var structure = {
        titlePrefix : "##",            //标题格式补正的Markdown前缀
        paragraphPrefix : "　",        //正文段首补正的前缀

        contentFlag : "正文",          //正文部分的标记
        appendixFlag : "附录",         //附录部分的标记
        languageFlag : "语句"          //语句部分的标记
    };

    var settings = $.extend(defaults, options || {});

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
         * @param origin 原本的字符串长度
         * @param final 现在的字符串长度
         * @returns 原来与现在字符串长度差的绝对值
         */
        removedLength : function(origin, final){
            if(typeof origin == typeof final == "string"){
                return Math.abs(origin.length - final.length);
            }
            else{
                return -1;
            }
        },

        /**
         *  去除字符串开头结尾的字符
         * 
         * @param {String} str 需要处理的字符串
         * @param {String} chars 需要移除的字符组成的字符串
         * @return {String} 处理后的字符串
         */
        removeBeginEnds : function(str, chars){
            return this.removeEndingChars(this.removeBeginningChars(str, chars), chars);
        },

        /**
         * 删除字符串首尾的换行符(\n)
         * 
         * @param str 需要处理的字符串
         * @returns 处理后的字符串
         */
        removeCrlf : function(str){
            return this.removeBeginEnds(str, "\n");
        }
    }

    //工具箱的数据处理部分
    utils.data = {
        /**
         * 字数统计
         * 
         * @param text 是否统计正文的字数
         * @param append 是否统计作者留言的字数
         * @param title 是否统计标题的字数
         */
        wordsCount : function(text, append, title){
            //设置默认值
            text = typeof text == "undefined" ? true : text;
            append = typeof append == "undefined" ? false : text;
            title = typeof title == "undefined" ? false : text;

            return (text === true ? chapterData.content.text.length : 0)
                 + (append === true ? chapterData.content.append.length : 0)
                 + (title === true ? chapterData.title.length : 0);
        }
    }

    /**
     * 获得章节的标题 保存并进行转义处理
     * 
     * @param {Boolean} replaceBracket 是否在显示时将章节的方括号删除
     * @returns {void}
     */
    var title = function(){
        var rep = typeof settings.replaceBracket === "boolean" ? settings.replaceBracket : true;

        chapterData.handle = chapterData.handle.replace(regex.title, function(match, pos, originalText){
            if(chapterData.title.length != 0) return match;

            chapterData.title = match.substring(1, match.length - 1);

            if(rep) {
                chapterData.final = (settings.titlePrefix ? structure.titlePrefix : "") + chapterData.title;
                return "";
            }
            else{                
                chapterData.final = (settings.titlePrefix ? structure.titlePrefix : "") + match;
                return "";
            }
        });
        utils.removeCrlf(chapterData.handle);
    }

    /**
     * 根据由#构成的分隔线区分MaziScript中的部分
     * 这一步结束以后chapterData.handle废弃
     * 
     * @param {void}
     * @returns {void}
     */
    var horizontal = function(){
        var matchSharp = [], position = [];
        chapterData.handle.replace(regex.horizontal, function(match, pos, originalText){
            matchSharp.push(match.length);
            position.push(pos);
        });

        for(var i = 1 ; i <= matchSharp.length ; i++){
            if(i > matchSharp.length - 1){
                chapterData.horizontalPart.push("\n" + utils.removeCrlf(chapterData.handle.substring(matchSharp[i-1] + position[i-1])) + "\n");
                //chapterData.horizontalPart.push(chapterData.handle.substring(matchSharp[i-1] + position[i-1]));
            }
            else{
                chapterData.horizontalPart.push("\n" + utils.removeCrlf(chapterData.handle.substring(matchSharp[i] + position[i-1], position[i])) + "\n");
                //chapterData.horizontalPart.push(chapterData.handle.substring(matchSharp[i] + position[i-1], position[i]));
            }
        }
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
                var text = chapterData.horizontalPart[i];
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
                        case structure.languageFlag:
                            flagType = type = 3;
                            break;
                        default:
                            chapterData.flag.push(flagContent);
                            type = -9999;
                            break;
                    }

                    return type == 1 || type == 2 || type == 3 ? "" : flagContent;
                });

                //对语句块进行处理
                text = text.replace(regex.languageBlock, function(match, pos, originalText){
                    chapterData.commandBlock.push(utils.removeCrlf(match.substring(3)));
                    return "\n";
                })

                //对语句进行处理
                text = text.replace(regex.language, function(match, pos, originalText){
                    chapterData.command.push(utils.removeCrlf(match.substring(3)));
                    return "\n";
                }); 

                if(flagType == 1 || flagType == -1){
                    (function(){
                        //区分是否存在作者留言
                        var append = text.match(regex.contentAppend) != null;

                        if(!append){
                            chapterData.content.text.push(utils.removeCrlf(text));

                            //占位 对于数组下标
                            chapterData.content.append.push("=>undefined");
                        }
                        else{
                            var textFinal = text;
                            text = text.replace(regex.contentAppend, function(match, pos, originalText){
                                chapterData.content.append.push(utils.removeBeginningChars(originalText.substring(pos + match.length), "-\n"));
                                textFinal = text.substring(0, pos);
                                return "\n";
                            });
                            chapterData.content.text.push(utils.removeCrlf(textFinal));
                        }
                    })();
                }
                else if(flagType == 2){
                    chapterData.appendix.push(utils.removeCrlf(text));
                }
                else if(flagType == 3){
                    chapterData.commandPart.push(utils.removeCrlf(text));
                }
                else{
                    chapterData.content.text.push(utils.removeCrlf(text));
                    chapterData.content.append.push("=>undefined");
                }
            }
        })();
    }

    /**
     * 负责给正文中的段落增加段首的缩进
     * 
     * @param {void}
     * @returns {void}
     */
    var paraPrefix = function(){
        if(settings.paragraphPrefix){
            var preX = settings.paragraphPrefixNum;

            for(var i in chapterData.content.text){
                chapterData.content.text[i] += "\n";
                chapterData.content.text[i] = chapterData.content.text[i].replace(regex.paraPrefix, (function(){
                    var ans = "";
                    for(var j = 1 ; j <= preX ; j++){
                        ans += structure.paragraphPrefix;
                    }

                    return ans;
                })() + "$&");
                utils.removeCrlf(chapterData.content.text[i]);
            }
        }

        if(settings.appendPrefix){
            for(i in chapterData.content.append){
                chapterData.content.append[i] += "\n";
                chapterData.content.append[i] = chapterData.content.append[i].replace(regex.paraPrefix, (function(){
                    var ans = "";
                    for(var j = 1 ; j <= preX ; j++){
                        ans += structure.paragraphPrefix;
                    }

                    return ans;
                })() + "$&");
                utils.removeCrlf(chapterData.content.append[i]);
            }
        }
    }

    /**
     * Markdown转义 整个过程的最后一步
     * 
     * @param {void}
     * @returns {void}
     */
    var escape = function(){
        //TODO: 增加字符的转义，避免转义字符的使用
        //TODO: 组织文章显示的结构编排
        (function(){
            for(var i in chapterData.content.text){
                chapterData.final += "\n" + chapterData.content.text[i].replace(regex.escape, "\\$&");
            }

            for(i in chapterData.content.append){
                chapterData.final += "\n" + chapterData.content.append[i].replace(regex.escape, "\\$&");
            }
        })();
    }

    /**
     * MaziScript语句部分的解释器
     * 
     * @param {Array} callback 输入的数组
     * @returns {void}
     */
    var parseCommand = function(callback){
        /**
         * 例如：想要对一个人进行素材管理
         * 作者可以在标志时先标记人名，然后使用语句：
         * =>Yesterday17 xxx 真名：xxx 年龄：xx 性别：x
         * 
         * 也可以直接换行使用，须对齐：
         * =>Yesterday17
         *   真名：xxx
         *   年龄：xx
         *   性别：xx
         *   xxx
         * //此处须空一行
         * 
         * {正文内容}
         */

        //模块化
        var parseModules = [];

        /**
         * 简单处理函数 负责处理属性创建语句块
         * 
         * @param pos 目前处理的语句块的序号
         * @returns {null}
         */
        parseModules.push(function(pos){
            var commands = chapterData.commandBlock[pos].split("\n"),
                parseObj = commands.shift();

            for(var j in chapterData.dataJson){
                if(chapterData.dataJson[j].name == parseObj){
                    parseObj = chapterData.dataJson[j];
                }
            }

            if(typeof parseObj == "string"){
                chapterData.dataJson.push({"name" : parseObj});
                parseObj = chapterData.dataJson[chapterData.dataJson.length - 1];
            }
                
            for(j in commands){
                commands[j] = utils.removeBeginEnds(commands[j], " ");
                (function(){
                    var ans = commands[j].match(regex.blockSplit);
                    //eval("parseObj." + ans[1] + " = \"" + ans[2] + "\";")
                    parseObj[ans[1]] = ans[2];
                })();
            }
        });

        if(callback instanceof Array){
            for(var i = 0 ; i < callback.length ; i++){
                parseModules.push(callback[i]);
            }
        }

        for(i = 0 ; i < chapterData.commandBlock.length ; i++){
            for(var k in parseModules){
                parseModules[k](i);
            }
        }

    }

    return {
        /**
         * 进行MaziScript文本解释
         * 
         * @param {String} input 输入的内容
         * @returns {String} 处理后的Markdown文本
         */
        parse : function(input){
            this.clear();

            if(typeof input == "undefined"){
                chapterData.origin = chapterData.handle = "";
            }
            else if(typeof input == "string"){
                chapterData.origin = chapterData.handle = input;
                
                //根据settings确定是否移除括号
                title();
                //根据####分隔线分割段落
                horizontal();
                //段落作用分类
                definePart();
                //段首缩进处理
                paraPrefix();
                //进行转义处理
                escape();

                //语言特性部分
                //进行语言解释
                parseCommand();
            }
            else if(typeof input == "object"){
                $.extend(chapterData, input || {});
            }

            if(chapterData.final != undefined){
                return chapterData.final;
            }
            else{
                return "";
            }
        },

        /**
         * 获得已存储的文本数据
         * 
         * @param {void}
         * @returns chapterData.origin
         */
        getOrigin : function(){
            return chapterData.origin;
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
            console.log(JSON.stringify(chapterData, null, "\t"));
        }
    };

}();