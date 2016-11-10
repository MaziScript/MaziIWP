mazi.regexs = {
    //preInit部分中用到的rule
    preInit_title : /##[ ]*[\[【]([^\]】]+)[\]】]\n/,
    preInit_addition : /#[:：]/,
    preInit_authorWD : /&[:：]/,
    
    //scan部分中用到的rule
    scan_event : /\{[^}]+\}/g,
    scan_member : /[\[【][^\]】]+[\]】]/g,
    scan_item : /|[^|]+|/g,
    
    //补记处理时用到的rule
    addition_ignore : /\n[;；][^\n]*/g,
    addition_event : /\n\{([^{}]+)[:：]([^{}]+)\}/g,

    addition_member_base : /\n[\[【]([^\]:：】]+)[:：]([^\]】]+)[\]】]/g,
    addition_member_col : /\n([^\{\}\[\]【】\n]+)[:：]([^\{\}\[\]【】\n]+)/
};

/*
   地点：{}
   人物：【】
   物品：||
*/

//语言的基本结构
function _bookData(){
    //标题
    this.title = "";
    //正文，上来就是
    this.contents = "";
    //补记（设定），以#：开头
    this.addition = "";
    //作者的话，以&：开头
    this.authorWD = "";
    
    //统计系统
    //事件
    this.event = [];
    //人物
    this.member = [];
}

//正则表达式(rule)
function _handleRule(){
    //preInit部分中用到的rule
    this.preInit = {};
    this.preInit.title = /##[ ]*[\[【]([^\]】]+)[\]】]\n/;
    this.preInit.addition = /#[:：]/;
    this.preInit.authorWD = /&[:：]/;
    
    //scan部分中用到的rule
    this.scan = {};
    this.scan.event = /\{[^}]+\}/g;
    this.scan.member = /[\[【][^\]】]+[\]】]/g;
    this.scan.item = /|[^|]+|/g;
    
    //补记处理时用到的rule
    this.addition = {};
    this.addition.ignore = /\n[;；][^\n]*/g;
    this.addition.event = /\n\{([^{}]+)[:：]([^{}]+)\}/g;
    this.addition.member = {};
    this.addition.member.base = /\n[\[【]([^\]:：】]+)[:：]([^\]】]+)[\]】]/g;
    this.addition.member.col = /\n([^\{\}\[\]【】\n]+)[:：]([^\{\}\[\]【】\n]+)/;
}

var maziScript = function(text, options){
    //最终传回
    var bookData = new _bookData();
    
    //正则表达式(rule)
    var handleRule = new _handleRule();
    
    //preHandle: 预处理函数，负责分离正文，补记和作者的话
    this.preHandle = function(){
        var add_p = text.search(handleRule.preInit.addition);
        var aut_p = text.search(handleRule.preInit.authorWD);
        
        if(add_p < 0 && add_p < 0){
            bookData.contents = text;
        }
        else if(add_p < 0){
            bookData.contents = text.substring(0, aut_p - 1);
            bookData.authorWD = text.substring(aut_p, text.length);
        }
        else if(aut_p < 0){
            bookData.contents = text.substring(0, add_p - 1);
            bookData.addition = text.substring(add_p, text.length);
        }
        else{
            if(add_p < aut_p){
                bookData.contents = text.substring(0, add_p - 1);
                bookData.addition = text.substring(add_p, aut_p - 1);
                bookData.authorWD = text.substring(aut_p, text.length);
            }
            else{
                bookData.contents = text.substring(0, aut_p - 1);
                bookData.addition = text.substring(aut_p, add_p - 1);
                bookData.authorWD = text.substring(add_p, text.length);
            }
        }
        
        if(bookData.authorWD != "") bookData.authorWD = bookData.authorWD.substr(2);
        if(bookData.addition != "") bookData.addition = bookData.addition.substr(2);
        
        if(handleRule.preInit.title.test(bookData.contents)){
            bookData.contents = bookData.contents.toString().replace(handleRule.preInit.title, function(tot, tit){
                bookData.title = tit;
                return "";
            });
            //bookData.contents = bookData.contents.substr(1);
        }
    }
    
    //handle: 处理函数，负责正文标记内容的数据内容简单处理
    this.handle = function(){
        var i = 0;
        
        //对原文进行处理
        //删除event的符号标记
        bookData.contents = bookData.contents.toString().replace(handleRule.scan.event, function(match){
            bookData.event[i] = {name:null, content:null};
            bookData.event[i].name = match.substring(1, match.length - 1);
            i++;
            return bookData.event[i-1].name;
        });
        
        i = 0;
        
        //删除member的符号标记
        bookData.contents = bookData.contents.toString().replace(handleRule.scan.member, function(match){
            bookData.member[i] = {name:null};
            bookData.member[i].name = match.substring(1, match.length - 1);
            i++;
            return bookData.member[i-1].name;
        });
    }
    
    this.postHandle = function(){
        if(bookData.addition != ""){
            //删除多余的空行
            bookData.addition = bookData.addition.toString().replace(/\n\n/g, "\n");
            
            //删除制表符，空格等
            bookData.addition = bookData.addition.toString().replace(/[\t ]/g, "");
            
            //删除以[;；]开头的注释性语句
            bookData.addition = bookData.addition.toString().replace(handleRule.addition.ignore, "");

            //将地点类助记记录入数组中
            bookData.addition = bookData.addition.toString().replace(handleRule.addition.event, function(tot,str1,str2){
                for(var i in bookData.event){
                    if(bookData.event[i].name.toString() == str1){
                        bookData.event[i].content = str2;
                    }
                }
                return "";
            });

            bookData.addition = bookData.addition.toString().replace(handleRule.addition.member.base, function(tot, user, content){
                for(var i in bookData.member){
                    if(bookData.member[i].name == user){
                        var json = "{\"name\":\"" + user + "\"";
                        
                        while(handleRule.addition.member.col.test(content)){
                            json += ",";
                            content = content.toString().replace(handleRule.addition.member.col, function(tot, str1, str2){
                                //JSON转义
                                str1 = str1.replace(/(['\"\\])/g, "\\$1");
                                str2 = str2.replace(/(['\"\\])/g, "\\$1");
                                
                                json += "\"" + str1 + "\":\"" + str2 + "\"";
                                return "";
                            });
                        }
                        
                        json += "}";

                        bookData.member[i] = JSON.parse(json);
                    }
                }
                return "";
            });
        }
    }
    
    //identify: 测试函数，用来输出bookData的json值
    this.identify = function(){
        var finalContent = JSON.stringify(bookData);
        
        document.write(finalContent);
    };
    
    this.preHandle();
    this.handle();
    this.postHandle();
    //this.identify();
    
    return JSON.stringify(bookData);
}