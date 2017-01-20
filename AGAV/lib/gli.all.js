// Domain Public by Eric Wendelin http://eriwen.com/ (2008)
//                  Luke Smith http://lucassmith.name/ (2008)
//                  Loic Dachary <loic@dachary.org> (2008)
//                  Johan Euphrosine <proppy@aminche.com> (2008)
//                  Øyvind Sean Kinsey http://kinsey.no/blog (2010)
//
// Information and discussions
// http://jspoker.pokersource.info/skin/test-printstacktrace.html
// http://eriwen.com/javascript/js-stack-trace/
// http://eriwen.com/javascript/stacktrace-update/
// http://pastie.org/253058
//
// guessFunctionNameFromLines comes from firebug
//
// Software License Agreement (BSD License)
//
// Copyright (c) 2007, Parakey Inc.
// All rights reserved.
//
// Redistribution and use of this software in source and binary forms, with or without modification,
// are permitted provided that the following conditions are met:
//
// * Redistributions of source code must retain the above
//   copyright notice, this list of conditions and the
//   following disclaimer.
//
// * Redistributions in binary form must reproduce the above
//   copyright notice, this list of conditions and the
//   following disclaimer in the documentation and/or other
//   materials provided with the distribution.
//
// * Neither the name of Parakey Inc. nor the names of its
//   contributors may be used to endorse or promote products
//   derived from this software without specific prior
//   written permission of Parakey Inc.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR
// IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
// FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
// CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
// DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER
// IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT
// OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

/**
* Main function giving a function stack trace with a forced or passed in Error 
*
* @cfg {Error} e The error to create a stacktrace from (optional)
* @cfg {Boolean} guess If we should try to resolve the names of anonymous functions
* @return {Array} of Strings with functions, lines, files, and arguments where possible 
*/
function printStackTrace(options) {
    var ex = (options && options.e) ? options.e : null;
    var guess = options ? !!options.guess : true;

    var p = printStackTrace.cachedImpl || new printStackTrace.implementation();
    printStackTrace.cachedImpl = p;
    var result = p.run(ex);
    return (guess) ? p.guessFunctions(result) : result;
}

printStackTrace.implementation = function () { };

printStackTrace.implementation.prototype = {
    
    // CHANGE: cache all regular expressions
    regex: {
        chromeReplaces: [
            [/^[^\n]*\n/, ''],
            [/^[^\n]*\n/, ''],
            [/^[^\(]+?[\n$]/gm, ''],
            [/^\s+at\s+/gm, ''],
            [/^Object.<anonymous>\s*\(/gm, '{anonymous}()@']
        ],
        firefoxReplaces: [
            [/^[^\n]*\n/, ''],
            [/(?:\n@:0)?\s+$/m, ''],
            [/^\(/gm, '{anonymous}(']
        ],
        fnRE: /function\s*([\w\-$]+)?\s*\(/i,
        reStack: /\{anonymous\}\(.*\)@(\w+:\/\/([\-\w\.]+)+(:\d+)?[^:]+):(\d+):?(\d+)?/,
        reFunctionArgNames: /function ([^(]*)\(([^)]*)\)/,
        reGuessFunction: /['"]?([0-9A-Za-z_]+)['"]?\s*[:=]\s*(function|eval|new Function)/
    },

    run: function (ex) {
        // Use either the stored mode, or resolve it
        var mode = this._mode || this.mode();
        if (mode === 'other') {
            return this.other(arguments.callee);
        } else {
            ex = ex ||
                (function () {
                    try {
                        var _err = __undef__ << 1;
                    } catch (e) {
                        return e;
                    }
                })();
            return this[mode](ex);
        }
    },

    /**
    * @return {String} mode of operation for the environment in question.
    */
    mode: function () {
        try {
            var _err = __undef__ << 1;
        } catch (e) {
            if (e['arguments']) {
                return (this._mode = 'chrome');
            } else if (window.opera && e.stacktrace) {
                return (this._mode = 'opera10');
            } else if (e.stack) {
                return (this._mode = 'firefox');
            } else if (window.opera && !('stacktrace' in e)) { //Opera 9-
                return (this._mode = 'opera');
            }
        }
        return (this._mode = 'other');
    },

    /**
    * Given a context, function name, and callback function, overwrite it so that it calls
    * printStackTrace() first with a callback and then runs the rest of the body.
    * 
    * @param {Object} context of execution (e.g. window)
    * @param {String} functionName to instrument
    * @param {Function} function to call with a stack trace on invocation
    */
    instrumentFunction: function (context, functionName, callback) {
        context = context || window;
        context['_old' + functionName] = context[functionName];
        context[functionName] = function () {
            callback.call(this, printStackTrace());
            return context['_old' + functionName].apply(this, arguments);
        };
        context[functionName]._instrumented = true;
    },

    /**
    * Given a context and function name of a function that has been
    * instrumented, revert the function to it's original (non-instrumented)
    * state.
    *
    * @param {Object} context of execution (e.g. window)
    * @param {String} functionName to de-instrument
    */
    deinstrumentFunction: function (context, functionName) {
        if (context[functionName].constructor === Function &&
                context[functionName]._instrumented &&
                context['_old' + functionName].constructor === Function) {
            context[functionName] = context['_old' + functionName];
        }
    },

    /**
    * Given an Error object, return a formatted Array based on Chrome's stack string.
    * 
    * @param e - Error object to inspect
    * @return Array<String> of function calls, files and line numbers
    */
    chrome: function (e) {
        // CHANGE: use replacement list
        var chromeReplaces = this.regex.chromeReplaces;
        var x = e.stack;
        for (var n = 0; n < chromeReplaces.length; n++) {
            x = x.replace(chromeReplaces[n][0], chromeReplaces[n][1]);
        }
        return x.split('\n');
        //return e.stack.replace(/^[^\n]*\n/, '').replace(/^[^\n]*\n/, '').replace(/^[^\(]+?[\n$]/gm, '').replace(/^\s+at\s+/gm, '').replace(/^Object.<anonymous>\s*\(/gm, '{anonymous}()@').split('\n');
    },

    /**
    * Given an Error object, return a formatted Array based on Firefox's stack string.
    * 
    * @param e - Error object to inspect
    * @return Array<String> of function calls, files and line numbers
    */
    firefox: function (e) {
        // CHANGE: use replacement list
        var firefoxReplaces = this.regex.firefoxReplaces;
        var x = e.stack;
        for (var n = 0; n < firefoxReplaces.length; n++) {
            x = x.replace(firefoxReplaces[n][0], firefoxReplaces[n][1]);
        }
        return x.split('\n');
        //return e.stack.replace(/^[^\n]*\n/, '').replace(/(?:\n@:0)?\s+$/m, '').replace(/^\(/gm, '{anonymous}(').split('\n');
    },

    /**
    * Given an Error object, return a formatted Array based on Opera 10's stacktrace string.
    * 
    * @param e - Error object to inspect
    * @return Array<String> of function calls, files and line numbers
    */
    opera10: function (e) {
        var stack = e.stacktrace;
        var lines = stack.split('\n'), ANON = '{anonymous}',
            lineRE = /.*line (\d+), column (\d+) in ((<anonymous function\:?\s*(\S+))|([^\(]+)\([^\)]*\))(?: in )?(.*)\s*$/i, i, j, len;
        for (i = 2, j = 0, len = lines.length; i < len - 2; i++) {
            if (lineRE.test(lines[i])) {
                var location = RegExp.$6 + ':' + RegExp.$1 + ':' + RegExp.$2;
                var fnName = RegExp.$3;
                fnName = fnName.replace(/<anonymous function\s?(\S+)?>/g, ANON);
                lines[j++] = fnName + '@' + location;
            }
        }

        lines.splice(j, lines.length - j);
        return lines;
    },

    // Opera 7.x-9.x only!
    opera: function (e) {
        var lines = e.message.split('\n'), ANON = '{anonymous}',
            lineRE = /Line\s+(\d+).*script\s+(http\S+)(?:.*in\s+function\s+(\S+))?/i,
            i, j, len;

        for (i = 4, j = 0, len = lines.length; i < len; i += 2) {
            //TODO: RegExp.exec() would probably be cleaner here
            if (lineRE.test(lines[i])) {
                lines[j++] = (RegExp.$3 ? RegExp.$3 + '()@' + RegExp.$2 + RegExp.$1 : ANON + '()@' + RegExp.$2 + ':' + RegExp.$1) + ' -- ' + lines[i + 1].replace(/^\s+/, '');
            }
        }

        lines.splice(j, lines.length - j);
        return lines;
    },

    // Safari, IE, and others
    other: function (curr) {
        var ANON = '{anonymous}', fnRE = this.regex.fnRE,
            stack = [], j = 0, fn, args;

        var maxStackSize = 10;
        while (curr && stack.length < maxStackSize) {
            fn = fnRE.test(curr.toString()) ? RegExp.$1 || ANON : ANON;
            args = Array.prototype.slice.call(curr['arguments']);
            stack[j++] = fn + '(' + this.stringifyArguments(args) + ')';
            curr = curr.caller;
        }
        return stack;
    },

    /**
    * Given arguments array as a String, subsituting type names for non-string types.
    *
    * @param {Arguments} object
    * @return {Array} of Strings with stringified arguments
    */
    stringifyArguments: function (args) {
        for (var i = 0; i < args.length; ++i) {
            var arg = args[i];
            if (arg === undefined) {
                args[i] = 'undefined';
            } else if (arg === null) {
                args[i] = 'null';
            } else if (arg.constructor) {
                if (arg.constructor === Array) {
                    if (arg.length < 3) {
                        args[i] = '[' + this.stringifyArguments(arg) + ']';
                    } else {
                        args[i] = '[' + this.stringifyArguments(Array.prototype.slice.call(arg, 0, 1)) + '...' + this.stringifyArguments(Array.prototype.slice.call(arg, -1)) + ']';
                    }
                } else if (arg.constructor === Object) {
                    args[i] = '#object';
                } else if (arg.constructor === Function) {
                    args[i] = '#function';
                } else if (arg.constructor === String) {
                    args[i] = '"' + arg + '"';
                }
            }
        }
        return args.join(',');
    },

    sourceCache: {},

    /**
    * @return the text from a given URL.
    */
    ajax: function (url) {
        var req = this.createXMLHTTPObject();
        if (!req) {
            return;
        }
        req.open('GET', url, false);
        req.setRequestHeader('User-Agent', 'XMLHTTP/1.0');
        req.send('');
        return req.responseText;
    },

    /**
    * Try XHR methods in order and store XHR factory.
    *
    * @return <Function> XHR function or equivalent
    */
    createXMLHTTPObject: function () {
        var xmlhttp, XMLHttpFactories = [
            function () {
                return new XMLHttpRequest();
            }, function () {
                return new ActiveXObject('Msxml2.XMLHTTP');
            }, function () {
                return new ActiveXObject('Msxml3.XMLHTTP');
            }, function () {
                return new ActiveXObject('Microsoft.XMLHTTP');
            }
        ];
        for (var i = 0; i < XMLHttpFactories.length; i++) {
            try {
                xmlhttp = XMLHttpFactories[i]();
                // Use memoization to cache the factory
                this.createXMLHTTPObject = XMLHttpFactories[i];
                return xmlhttp;
            } catch (e) { }
        }
    },

    /**
    * Given a URL, check if it is in the same domain (so we can get the source
    * via Ajax).
    *
    * @param url <String> source url
    * @return False if we need a cross-domain request
    */
    isSameDomain: function (url) {
        return url.indexOf(location.hostname) !== -1;
    },

    /**
    * Get source code from given URL if in the same domain.
    *
    * @param url <String> JS source URL
    * @return <String> Source code
    */
    getSource: function (url) {
        if (!(url in this.sourceCache)) {
            this.sourceCache[url] = this.ajax(url).split('\n');
        }
        return this.sourceCache[url];
    },

    guessFunctions: function (stack) {
        for (var i = 0; i < stack.length; ++i) {
            var reStack = this.regex.reStack;
            var frame = stack[i], m = reStack.exec(frame);
            if (m) {
                var file = m[1], lineno = m[4]; //m[7] is character position in Chrome
                if (file && this.isSameDomain(file) && lineno) {
                    var functionName = this.guessFunctionName(file, lineno);
                    stack[i] = frame.replace('{anonymous}', functionName);
                }
            }
        }
        return stack;
    },

    guessFunctionName: function (url, lineNo) {
        try {
            return this.guessFunctionNameFromLines(lineNo, this.getSource(url));
        } catch (e) {
            return 'getSource failed with url: ' + url + ', exception: ' + e.toString();
        }
    },

    guessFunctionNameFromLines: function (lineNo, source) {
        var reFunctionArgNames = this.regex.reFunctionArgNames;
        var reGuessFunction = this.regex.reGuessFunction;
        // Walk backwards from the first line in the function until we find the line which
        // matches the pattern above, which is the function definition
        var line = "", maxLines = 10;
        for (var i = 0; i < maxLines; ++i) {
            line = source[lineNo - i] + line;
            if (line !== undefined) {
                var m = reGuessFunction.exec(line);
                if (m && m[1]) {
                    return m[1];
                } else {
                    m = reFunctionArgNames.exec(line);
                    if (m && m[1]) {
                        return m[1];
                    }
                }
            }
        }
        return '(?)';
    }
};/**
 * SyntaxHighlighter
 * http://alexgorbatchev.com/SyntaxHighlighter
 *
 * SyntaxHighlighter is donationware. If you are using it, please donate.
 * http://alexgorbatchev.com/SyntaxHighlighter/donate.html
 *
 * @version
 * 3.0.83 (Tue, 04 Feb 2014 22:06:22 GMT)
 *
 * @copyright
 * Copyright (C) 2004-2013 Alex Gorbatchev.
 *
 * @license
 * Dual licensed under the MIT and GPL licenses.
 */
/*!
 * XRegExp v2.0.0
 * (c) 2007-2012 Steven Levithan <http://xregexp.com/>
 * MIT License
 */

/**
 * XRegExp provides augmented, extensible JavaScript regular expressions. You get new syntax,
 * flags, and methods beyond what browsers support natively. XRegExp is also a regex utility belt
 * with tools to make your client-side grepping simpler and more powerful, while freeing you from
 * worrying about pesky cross-browser inconsistencies and the dubious `lastIndex` property. See
 * XRegExp's documentation (http://xregexp.com/) for more details.
 * @module xregexp
 * @requires N/A
 */
var XRegExp;

// Avoid running twice; that would reset tokens and could break references to native globals
XRegExp = XRegExp || (function (undef) {
    "use strict";

/*--------------------------------------
 *  Private variables
 *------------------------------------*/

    var self,
        addToken,
        add,

// Optional features; can be installed and uninstalled
        features = {
            natives: false,
            extensibility: false
        },

// Store native methods to use and restore ("native" is an ES3 reserved keyword)
        nativ = {
            exec: RegExp.prototype.exec,
            test: RegExp.prototype.test,
            match: String.prototype.match,
            replace: String.prototype.replace,
            split: String.prototype.split
        },

// Storage for fixed/extended native methods
        fixed = {},

// Storage for cached regexes
        cache = {},

// Storage for addon tokens
        tokens = [],

// Token scopes
        defaultScope = "default",
        classScope = "class",

// Regexes that match native regex syntax
        nativeTokens = {
            // Any native multicharacter token in default scope (includes octals, excludes character classes)
            "default": /^(?:\\(?:0(?:[0-3][0-7]{0,2}|[4-7][0-7]?)?|[1-9]\d*|x[\dA-Fa-f]{2}|u[\dA-Fa-f]{4}|c[A-Za-z]|[\s\S])|\(\?[:=!]|[?*+]\?|{\d+(?:,\d*)?}\??)/,
            // Any native multicharacter token in character class scope (includes octals)
            "class": /^(?:\\(?:[0-3][0-7]{0,2}|[4-7][0-7]?|x[\dA-Fa-f]{2}|u[\dA-Fa-f]{4}|c[A-Za-z]|[\s\S]))/
        },

// Any backreference in replacement strings
        replacementToken = /\$(?:{([\w$]+)}|(\d\d?|[\s\S]))/g,

// Any character with a later instance in the string
        duplicateFlags = /([\s\S])(?=[\s\S]*\1)/g,

// Any greedy/lazy quantifier
        quantifier = /^(?:[?*+]|{\d+(?:,\d*)?})\??/,

// Check for correct `exec` handling of nonparticipating capturing groups
        compliantExecNpcg = nativ.exec.call(/()??/, "")[1] === undef,

// Check for flag y support (Firefox 3+)
        hasNativeY = RegExp.prototype.sticky !== undef,

// Used to kill infinite recursion during XRegExp construction
        isInsideConstructor = false,

// Storage for known flags, including addon flags
        registeredFlags = "gim" + (hasNativeY ? "y" : "");

/*--------------------------------------
 *  Private helper functions
 *------------------------------------*/

/**
 * Attaches XRegExp.prototype properties and named capture supporting data to a regex object.
 * @private
 * @param {RegExp} regex Regex to augment.
 * @param {Array} captureNames Array with capture names, or null.
 * @param {Boolean} [isNative] Whether the regex was created by `RegExp` rather than `XRegExp`.
 * @returns {RegExp} Augmented regex.
 */
    function augment(regex, captureNames, isNative) {
        var p;
        // Can't auto-inherit these since the XRegExp constructor returns a nonprimitive value
        for (p in self.prototype) {
            if (self.prototype.hasOwnProperty(p)) {
                regex[p] = self.prototype[p];
            }
        }
        regex.xregexp = {captureNames: captureNames, isNative: !!isNative};
        return regex;
    }

/**
 * Returns native `RegExp` flags used by a regex object.
 * @private
 * @param {RegExp} regex Regex to check.
 * @returns {String} Native flags in use.
 */
    function getNativeFlags(regex) {
        //return nativ.exec.call(/\/([a-z]*)$/i, String(regex))[1];
        return (regex.global     ? "g" : "") +
               (regex.ignoreCase ? "i" : "") +
               (regex.multiline  ? "m" : "") +
               (regex.extended   ? "x" : "") + // Proposed for ES6, included in AS3
               (regex.sticky     ? "y" : ""); // Proposed for ES6, included in Firefox 3+
    }

/**
 * Copies a regex object while preserving special properties for named capture and augmenting with
 * `XRegExp.prototype` methods. The copy has a fresh `lastIndex` property (set to zero). Allows
 * adding and removing flags while copying the regex.
 * @private
 * @param {RegExp} regex Regex to copy.
 * @param {String} [addFlags] Flags to be added while copying the regex.
 * @param {String} [removeFlags] Flags to be removed while copying the regex.
 * @returns {RegExp} Copy of the provided regex, possibly with modified flags.
 */
    function copy(regex, addFlags, removeFlags) {
        if (!self.isRegExp(regex)) {
            throw new TypeError("type RegExp expected");
        }
        var flags = nativ.replace.call(getNativeFlags(regex) + (addFlags || ""), duplicateFlags, "");
        if (removeFlags) {
            // Would need to escape `removeFlags` if this was public
            flags = nativ.replace.call(flags, new RegExp("[" + removeFlags + "]+", "g"), "");
        }
        if (regex.xregexp && !regex.xregexp.isNative) {
            // Compiling the current (rather than precompilation) source preserves the effects of nonnative source flags
            regex = augment(self(regex.source, flags),
                            regex.xregexp.captureNames ? regex.xregexp.captureNames.slice(0) : null);
        } else {
            // Augment with `XRegExp.prototype` methods, but use native `RegExp` (avoid searching for special tokens)
            regex = augment(new RegExp(regex.source, flags), null, true);
        }
        return regex;
    }

/*
 * Returns the last index at which a given value can be found in an array, or `-1` if it's not
 * present. The array is searched backwards.
 * @private
 * @param {Array} array Array to search.
 * @param {*} value Value to locate in the array.
 * @returns {Number} Last zero-based index at which the item is found, or -1.
 */
    function lastIndexOf(array, value) {
        var i = array.length;
        if (Array.prototype.lastIndexOf) {
            return array.lastIndexOf(value); // Use the native method if available
        }
        while (i--) {
            if (array[i] === value) {
                return i;
            }
        }
        return -1;
    }

/**
 * Determines whether an object is of the specified type.
 * @private
 * @param {*} value Object to check.
 * @param {String} type Type to check for, in lowercase.
 * @returns {Boolean} Whether the object matches the type.
 */
    function isType(value, type) {
        return Object.prototype.toString.call(value).toLowerCase() === "[object " + type + "]";
    }

/**
 * Prepares an options object from the given value.
 * @private
 * @param {String|Object} value Value to convert to an options object.
 * @returns {Object} Options object.
 */
    function prepareOptions(value) {
        value = value || {};
        if (value === "all" || value.all) {
            value = {natives: true, extensibility: true};
        } else if (isType(value, "string")) {
            value = self.forEach(value, /[^\s,]+/, function (m) {
                this[m] = true;
            }, {});
        }
        return value;
    }

/**
 * Runs built-in/custom tokens in reverse insertion order, until a match is found.
 * @private
 * @param {String} pattern Original pattern from which an XRegExp object is being built.
 * @param {Number} pos Position to search for tokens within `pattern`.
 * @param {Number} scope Current regex scope.
 * @param {Object} context Context object assigned to token handler functions.
 * @returns {Object} Object with properties `output` (the substitution string returned by the
 *   successful token handler) and `match` (the token's match array), or null.
 */
    function runTokens(pattern, pos, scope, context) {
        var i = tokens.length,
            result = null,
            match,
            t;
        // Protect against constructing XRegExps within token handler and trigger functions
        isInsideConstructor = true;
        // Must reset `isInsideConstructor`, even if a `trigger` or `handler` throws
        try {
            while (i--) { // Run in reverse order
                t = tokens[i];
                if ((t.scope === "all" || t.scope === scope) && (!t.trigger || t.trigger.call(context))) {
                    t.pattern.lastIndex = pos;
                    match = fixed.exec.call(t.pattern, pattern); // Fixed `exec` here allows use of named backreferences, etc.
                    if (match && match.index === pos) {
                        result = {
                            output: t.handler.call(context, match, scope),
                            match: match
                        };
                        break;
                    }
                }
            }
        } catch (err) {
            throw err;
        } finally {
            isInsideConstructor = false;
        }
        return result;
    }

/**
 * Enables or disables XRegExp syntax and flag extensibility.
 * @private
 * @param {Boolean} on `true` to enable; `false` to disable.
 */
    function setExtensibility(on) {
        self.addToken = addToken[on ? "on" : "off"];
        features.extensibility = on;
    }

/**
 * Enables or disables native method overrides.
 * @private
 * @param {Boolean} on `true` to enable; `false` to disable.
 */
    function setNatives(on) {
        RegExp.prototype.exec = (on ? fixed : nativ).exec;
        RegExp.prototype.test = (on ? fixed : nativ).test;
        String.prototype.match = (on ? fixed : nativ).match;
        String.prototype.replace = (on ? fixed : nativ).replace;
        String.prototype.split = (on ? fixed : nativ).split;
        features.natives = on;
    }

/*--------------------------------------
 *  Constructor
 *------------------------------------*/

/**
 * Creates an extended regular expression object for matching text with a pattern. Differs from a
 * native regular expression in that additional syntax and flags are supported. The returned object
 * is in fact a native `RegExp` and works with all native methods.
 * @class XRegExp
 * @constructor
 * @param {String|RegExp} pattern Regex pattern string, or an existing `RegExp` object to copy.
 * @param {String} [flags] Any combination of flags:
 *   <li>`g` - global
 *   <li>`i` - ignore case
 *   <li>`m` - multiline anchors
 *   <li>`n` - explicit capture
 *   <li>`s` - dot matches all (aka singleline)
 *   <li>`x` - free-spacing and line comments (aka extended)
 *   <li>`y` - sticky (Firefox 3+ only)
 *   Flags cannot be provided when constructing one `RegExp` from another.
 * @returns {RegExp} Extended regular expression object.
 * @example
 *
 * // With named capture and flag x
 * date = XRegExp('(?<year>  [0-9]{4}) -?  # year  \n\
 *                 (?<month> [0-9]{2}) -?  # month \n\
 *                 (?<day>   [0-9]{2})     # day   ', 'x');
 *
 * // Passing a regex object to copy it. The copy maintains special properties for named capture,
 * // is augmented with `XRegExp.prototype` methods, and has a fresh `lastIndex` property (set to
 * // zero). Native regexes are not recompiled using XRegExp syntax.
 * XRegExp(/regex/);
 */
    self = function (pattern, flags) {
        if (self.isRegExp(pattern)) {
            if (flags !== undef) {
                throw new TypeError("can't supply flags when constructing one RegExp from another");
            }
            return copy(pattern);
        }
        // Tokens become part of the regex construction process, so protect against infinite recursion
        // when an XRegExp is constructed within a token handler function
        if (isInsideConstructor) {
            throw new Error("can't call the XRegExp constructor within token definition functions");
        }

        var output = [],
            scope = defaultScope,
            tokenContext = {
                hasNamedCapture: false,
                captureNames: [],
                hasFlag: function (flag) {
                    return flags.indexOf(flag) > -1;
                }
            },
            pos = 0,
            tokenResult,
            match,
            chr;
        pattern = pattern === undef ? "" : String(pattern);
        flags = flags === undef ? "" : String(flags);

        if (nativ.match.call(flags, duplicateFlags)) { // Don't use test/exec because they would update lastIndex
            throw new SyntaxError("invalid duplicate regular expression flag");
        }
        // Strip/apply leading mode modifier with any combination of flags except g or y: (?imnsx)
        pattern = nativ.replace.call(pattern, /^\(\?([\w$]+)\)/, function ($0, $1) {
            if (nativ.test.call(/[gy]/, $1)) {
                throw new SyntaxError("can't use flag g or y in mode modifier");
            }
            flags = nativ.replace.call(flags + $1, duplicateFlags, "");
            return "";
        });
        self.forEach(flags, /[\s\S]/, function (m) {
            if (registeredFlags.indexOf(m[0]) < 0) {
                throw new SyntaxError("invalid regular expression flag " + m[0]);
            }
        });

        while (pos < pattern.length) {
            // Check for custom tokens at the current position
            tokenResult = runTokens(pattern, pos, scope, tokenContext);
            if (tokenResult) {
                output.push(tokenResult.output);
                pos += (tokenResult.match[0].length || 1);
            } else {
                // Check for native tokens (except character classes) at the current position
                match = nativ.exec.call(nativeTokens[scope], pattern.slice(pos));
                if (match) {
                    output.push(match[0]);
                    pos += match[0].length;
                } else {
                    chr = pattern.charAt(pos);
                    if (chr === "[") {
                        scope = classScope;
                    } else if (chr === "]") {
                        scope = defaultScope;
                    }
                    // Advance position by one character
                    output.push(chr);
                    ++pos;
                }
            }
        }

        return augment(new RegExp(output.join(""), nativ.replace.call(flags, /[^gimy]+/g, "")),
                       tokenContext.hasNamedCapture ? tokenContext.captureNames : null);
    };

/*--------------------------------------
 *  Public methods/properties
 *------------------------------------*/

// Installed and uninstalled states for `XRegExp.addToken`
    addToken = {
        on: function (regex, handler, options) {
            options = options || {};
            if (regex) {
                tokens.push({
                    pattern: copy(regex, "g" + (hasNativeY ? "y" : "")),
                    handler: handler,
                    scope: options.scope || defaultScope,
                    trigger: options.trigger || null
                });
            }
            // Providing `customFlags` with null `regex` and `handler` allows adding flags that do
            // nothing, but don't throw an error
            if (options.customFlags) {
                registeredFlags = nativ.replace.call(registeredFlags + options.customFlags, duplicateFlags, "");
            }
        },
        off: function () {
            throw new Error("extensibility must be installed before using addToken");
        }
    };

/**
 * Extends or changes XRegExp syntax and allows custom flags. This is used internally and can be
 * used to create XRegExp addons. `XRegExp.install('extensibility')` must be run before calling
 * this function, or an error is thrown. If more than one token can match the same string, the last
 * added wins.
 * @memberOf XRegExp
 * @param {RegExp} regex Regex object that matches the new token.
 * @param {Function} handler Function that returns a new pattern string (using native regex syntax)
 *   to replace the matched token within all future XRegExp regexes. Has access to persistent
 *   properties of the regex being built, through `this`. Invoked with two arguments:
 *   <li>The match array, with named backreference properties.
 *   <li>The regex scope where the match was found.
 * @param {Object} [options] Options object with optional properties:
 *   <li>`scope` {String} Scopes where the token applies: 'default', 'class', or 'all'.
 *   <li>`trigger` {Function} Function that returns `true` when the token should be applied; e.g.,
 *     if a flag is set. If `false` is returned, the matched string can be matched by other tokens.
 *     Has access to persistent properties of the regex being built, through `this` (including
 *     function `this.hasFlag`).
 *   <li>`customFlags` {String} Nonnative flags used by the token's handler or trigger functions.
 *     Prevents XRegExp from throwing an invalid flag error when the specified flags are used.
 * @example
 *
 * // Basic usage: Adds \a for ALERT character
 * XRegExp.addToken(
 *   /\\a/,
 *   function () {return '\\x07';},
 *   {scope: 'all'}
 * );
 * XRegExp('\\a[\\a-\\n]+').test('\x07\n\x07'); // -> true
 */
    self.addToken = addToken.off;

/**
 * Caches and returns the result of calling `XRegExp(pattern, flags)`. On any subsequent call with
 * the same pattern and flag combination, the cached copy is returned.
 * @memberOf XRegExp
 * @param {String} pattern Regex pattern string.
 * @param {String} [flags] Any combination of XRegExp flags.
 * @returns {RegExp} Cached XRegExp object.
 * @example
 *
 * while (match = XRegExp.cache('.', 'gs').exec(str)) {
 *   // The regex is compiled once only
 * }
 */
    self.cache = function (pattern, flags) {
        var key = pattern + "/" + (flags || "");
        return cache[key] || (cache[key] = self(pattern, flags));
    };

/**
 * Escapes any regular expression metacharacters, for use when matching literal strings. The result
 * can safely be used at any point within a regex that uses any flags.
 * @memberOf XRegExp
 * @param {String} str String to escape.
 * @returns {String} String with regex metacharacters escaped.
 * @example
 *
 * XRegExp.escape('Escaped? <.>');
 * // -> 'Escaped\?\ <\.>'
 */
    self.escape = function (str) {
        return nativ.replace.call(str, /[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    };

/**
 * Executes a regex search in a specified string. Returns a match array or `null`. If the provided
 * regex uses named capture, named backreference properties are included on the match array.
 * Optional `pos` and `sticky` arguments specify the search start position, and whether the match
 * must start at the specified position only. The `lastIndex` property of the provided regex is not
 * used, but is updated for compatibility. Also fixes browser bugs compared to the native
 * `RegExp.prototype.exec` and can be used reliably cross-browser.
 * @memberOf XRegExp
 * @param {String} str String to search.
 * @param {RegExp} regex Regex to search with.
 * @param {Number} [pos=0] Zero-based index at which to start the search.
 * @param {Boolean|String} [sticky=false] Whether the match must start at the specified position
 *   only. The string `'sticky'` is accepted as an alternative to `true`.
 * @returns {Array} Match array with named backreference properties, or null.
 * @example
 *
 * // Basic use, with named backreference
 * var match = XRegExp.exec('U+2620', XRegExp('U\\+(?<hex>[0-9A-F]{4})'));
 * match.hex; // -> '2620'
 *
 * // With pos and sticky, in a loop
 * var pos = 2, result = [], match;
 * while (match = XRegExp.exec('<1><2><3><4>5<6>', /<(\d)>/, pos, 'sticky')) {
 *   result.push(match[1]);
 *   pos = match.index + match[0].length;
 * }
 * // result -> ['2', '3', '4']
 */
    self.exec = function (str, regex, pos, sticky) {
        var r2 = copy(regex, "g" + (sticky && hasNativeY ? "y" : ""), (sticky === false ? "y" : "")),
            match;
        r2.lastIndex = pos = pos || 0;
        match = fixed.exec.call(r2, str); // Fixed `exec` required for `lastIndex` fix, etc.
        if (sticky && match && match.index !== pos) {
            match = null;
        }
        if (regex.global) {
            regex.lastIndex = match ? r2.lastIndex : 0;
        }
        return match;
    };

/**
 * Executes a provided function once per regex match.
 * @memberOf XRegExp
 * @param {String} str String to search.
 * @param {RegExp} regex Regex to search with.
 * @param {Function} callback Function to execute for each match. Invoked with four arguments:
 *   <li>The match array, with named backreference properties.
 *   <li>The zero-based match index.
 *   <li>The string being traversed.
 *   <li>The regex object being used to traverse the string.
 * @param {*} [context] Object to use as `this` when executing `callback`.
 * @returns {*} Provided `context` object.
 * @example
 *
 * // Extracts every other digit from a string
 * XRegExp.forEach('1a2345', /\d/, function (match, i) {
 *   if (i % 2) this.push(+match[0]);
 * }, []);
 * // -> [2, 4]
 */
    self.forEach = function (str, regex, callback, context) {
        var pos = 0,
            i = -1,
            match;
        while ((match = self.exec(str, regex, pos))) {
            callback.call(context, match, ++i, str, regex);
            pos = match.index + (match[0].length || 1);
        }
        return context;
    };

/**
 * Copies a regex object and adds flag `g`. The copy maintains special properties for named
 * capture, is augmented with `XRegExp.prototype` methods, and has a fresh `lastIndex` property
 * (set to zero). Native regexes are not recompiled using XRegExp syntax.
 * @memberOf XRegExp
 * @param {RegExp} regex Regex to globalize.
 * @returns {RegExp} Copy of the provided regex with flag `g` added.
 * @example
 *
 * var globalCopy = XRegExp.globalize(/regex/);
 * globalCopy.global; // -> true
 */
    self.globalize = function (regex) {
        return copy(regex, "g");
    };

/**
 * Installs optional features according to the specified options.
 * @memberOf XRegExp
 * @param {Object|String} options Options object or string.
 * @example
 *
 * // With an options object
 * XRegExp.install({
 *   // Overrides native regex methods with fixed/extended versions that support named
 *   // backreferences and fix numerous cross-browser bugs
 *   natives: true,
 *
 *   // Enables extensibility of XRegExp syntax and flags
 *   extensibility: true
 * });
 *
 * // With an options string
 * XRegExp.install('natives extensibility');
 *
 * // Using a shortcut to install all optional features
 * XRegExp.install('all');
 */
    self.install = function (options) {
        options = prepareOptions(options);
        if (!features.natives && options.natives) {
            setNatives(true);
        }
        if (!features.extensibility && options.extensibility) {
            setExtensibility(true);
        }
    };

/**
 * Checks whether an individual optional feature is installed.
 * @memberOf XRegExp
 * @param {String} feature Name of the feature to check. One of:
 *   <li>`natives`
 *   <li>`extensibility`
 * @returns {Boolean} Whether the feature is installed.
 * @example
 *
 * XRegExp.isInstalled('natives');
 */
    self.isInstalled = function (feature) {
        return !!(features[feature]);
    };

/**
 * Returns `true` if an object is a regex; `false` if it isn't. This works correctly for regexes
 * created in another frame, when `instanceof` and `constructor` checks would fail.
 * @memberOf XRegExp
 * @param {*} value Object to check.
 * @returns {Boolean} Whether the object is a `RegExp` object.
 * @example
 *
 * XRegExp.isRegExp('string'); // -> false
 * XRegExp.isRegExp(/regex/i); // -> true
 * XRegExp.isRegExp(RegExp('^', 'm')); // -> true
 * XRegExp.isRegExp(XRegExp('(?s).')); // -> true
 */
    self.isRegExp = function (value) {
        return isType(value, "regexp");
    };

/**
 * Retrieves the matches from searching a string using a chain of regexes that successively search
 * within previous matches. The provided `chain` array can contain regexes and objects with `regex`
 * and `backref` properties. When a backreference is specified, the named or numbered backreference
 * is passed forward to the next regex or returned.
 * @memberOf XRegExp
 * @param {String} str String to search.
 * @param {Array} chain Regexes that each search for matches within preceding results.
 * @returns {Array} Matches by the last regex in the chain, or an empty array.
 * @example
 *
 * // Basic usage; matches numbers within <b> tags
 * XRegExp.matchChain('1 <b>2</b> 3 <b>4 a 56</b>', [
 *   XRegExp('(?is)<b>.*?</b>'),
 *   /\d+/
 * ]);
 * // -> ['2', '4', '56']
 *
 * // Passing forward and returning specific backreferences
 * html = '<a href="http://xregexp.com/api/">XRegExp</a>\
 *         <a href="http://www.google.com/">Google</a>';
 * XRegExp.matchChain(html, [
 *   {regex: /<a href="([^"]+)">/i, backref: 1},
 *   {regex: XRegExp('(?i)^https?://(?<domain>[^/?#]+)'), backref: 'domain'}
 * ]);
 * // -> ['xregexp.com', 'www.google.com']
 */
    self.matchChain = function (str, chain) {
        return (function recurseChain(values, level) {
            var item = chain[level].regex ? chain[level] : {regex: chain[level]},
                matches = [],
                addMatch = function (match) {
                    matches.push(item.backref ? (match[item.backref] || "") : match[0]);
                },
                i;
            for (i = 0; i < values.length; ++i) {
                self.forEach(values[i], item.regex, addMatch);
            }
            return ((level === chain.length - 1) || !matches.length) ?
                    matches :
                    recurseChain(matches, level + 1);
        }([str], 0));
    };

/**
 * Returns a new string with one or all matches of a pattern replaced. The pattern can be a string
 * or regex, and the replacement can be a string or a function to be called for each match. To
 * perform a global search and replace, use the optional `scope` argument or include flag `g` if
 * using a regex. Replacement strings can use `${n}` for named and numbered backreferences.
 * Replacement functions can use named backreferences via `arguments[0].name`. Also fixes browser
 * bugs compared to the native `String.prototype.replace` and can be used reliably cross-browser.
 * @memberOf XRegExp
 * @param {String} str String to search.
 * @param {RegExp|String} search Search pattern to be replaced.
 * @param {String|Function} replacement Replacement string or a function invoked to create it.
 *   Replacement strings can include special replacement syntax:
 *     <li>$$ - Inserts a literal '$'.
 *     <li>$&, $0 - Inserts the matched substring.
 *     <li>$` - Inserts the string that precedes the matched substring (left context).
 *     <li>$' - Inserts the string that follows the matched substring (right context).
 *     <li>$n, $nn - Where n/nn are digits referencing an existent capturing group, inserts
 *       backreference n/nn.
 *     <li>${n} - Where n is a name or any number of digits that reference an existent capturing
 *       group, inserts backreference n.
 *   Replacement functions are invoked with three or more arguments:
 *     <li>The matched substring (corresponds to $& above). Named backreferences are accessible as
 *       properties of this first argument.
 *     <li>0..n arguments, one for each backreference (corresponding to $1, $2, etc. above).
 *     <li>The zero-based index of the match within the total search string.
 *     <li>The total string being searched.
 * @param {String} [scope='one'] Use 'one' to replace the first match only, or 'all'. If not
 *   explicitly specified and using a regex with flag `g`, `scope` is 'all'.
 * @returns {String} New string with one or all matches replaced.
 * @example
 *
 * // Regex search, using named backreferences in replacement string
 * var name = XRegExp('(?<first>\\w+) (?<last>\\w+)');
 * XRegExp.replace('John Smith', name, '${last}, ${first}');
 * // -> 'Smith, John'
 *
 * // Regex search, using named backreferences in replacement function
 * XRegExp.replace('John Smith', name, function (match) {
 *   return match.last + ', ' + match.first;
 * });
 * // -> 'Smith, John'
 *
 * // Global string search/replacement
 * XRegExp.replace('RegExp builds RegExps', 'RegExp', 'XRegExp', 'all');
 * // -> 'XRegExp builds XRegExps'
 */
    self.replace = function (str, search, replacement, scope) {
        var isRegex = self.isRegExp(search),
            search2 = search,
            result;
        if (isRegex) {
            if (scope === undef && search.global) {
                scope = "all"; // Follow flag g when `scope` isn't explicit
            }
            // Note that since a copy is used, `search`'s `lastIndex` isn't updated *during* replacement iterations
            search2 = copy(search, scope === "all" ? "g" : "", scope === "all" ? "" : "g");
        } else if (scope === "all") {
            search2 = new RegExp(self.escape(String(search)), "g");
        }
        result = fixed.replace.call(String(str), search2, replacement); // Fixed `replace` required for named backreferences, etc.
        if (isRegex && search.global) {
            search.lastIndex = 0; // Fixes IE, Safari bug (last tested IE 9, Safari 5.1)
        }
        return result;
    };

/**
 * Splits a string into an array of strings using a regex or string separator. Matches of the
 * separator are not included in the result array. However, if `separator` is a regex that contains
 * capturing groups, backreferences are spliced into the result each time `separator` is matched.
 * Fixes browser bugs compared to the native `String.prototype.split` and can be used reliably
 * cross-browser.
 * @memberOf XRegExp
 * @param {String} str String to split.
 * @param {RegExp|String} separator Regex or string to use for separating the string.
 * @param {Number} [limit] Maximum number of items to include in the result array.
 * @returns {Array} Array of substrings.
 * @example
 *
 * // Basic use
 * XRegExp.split('a b c', ' ');
 * // -> ['a', 'b', 'c']
 *
 * // With limit
 * XRegExp.split('a b c', ' ', 2);
 * // -> ['a', 'b']
 *
 * // Backreferences in result array
 * XRegExp.split('..word1..', /([a-z]+)(\d+)/i);
 * // -> ['..', 'word', '1', '..']
 */
    self.split = function (str, separator, limit) {
        return fixed.split.call(str, separator, limit);
    };

/**
 * Executes a regex search in a specified string. Returns `true` or `false`. Optional `pos` and
 * `sticky` arguments specify the search start position, and whether the match must start at the
 * specified position only. The `lastIndex` property of the provided regex is not used, but is
 * updated for compatibility. Also fixes browser bugs compared to the native
 * `RegExp.prototype.test` and can be used reliably cross-browser.
 * @memberOf XRegExp
 * @param {String} str String to search.
 * @param {RegExp} regex Regex to search with.
 * @param {Number} [pos=0] Zero-based index at which to start the search.
 * @param {Boolean|String} [sticky=false] Whether the match must start at the specified position
 *   only. The string `'sticky'` is accepted as an alternative to `true`.
 * @returns {Boolean} Whether the regex matched the provided value.
 * @example
 *
 * // Basic use
 * XRegExp.test('abc', /c/); // -> true
 *
 * // With pos and sticky
 * XRegExp.test('abc', /c/, 0, 'sticky'); // -> false
 */
    self.test = function (str, regex, pos, sticky) {
        // Do this the easy way :-)
        return !!self.exec(str, regex, pos, sticky);
    };

/**
 * Uninstalls optional features according to the specified options.
 * @memberOf XRegExp
 * @param {Object|String} options Options object or string.
 * @example
 *
 * // With an options object
 * XRegExp.uninstall({
 *   // Restores native regex methods
 *   natives: true,
 *
 *   // Disables additional syntax and flag extensions
 *   extensibility: true
 * });
 *
 * // With an options string
 * XRegExp.uninstall('natives extensibility');
 *
 * // Using a shortcut to uninstall all optional features
 * XRegExp.uninstall('all');
 */
    self.uninstall = function (options) {
        options = prepareOptions(options);
        if (features.natives && options.natives) {
            setNatives(false);
        }
        if (features.extensibility && options.extensibility) {
            setExtensibility(false);
        }
    };

/**
 * Returns an XRegExp object that is the union of the given patterns. Patterns can be provided as
 * regex objects or strings. Metacharacters are escaped in patterns provided as strings.
 * Backreferences in provided regex objects are automatically renumbered to work correctly. Native
 * flags used by provided regexes are ignored in favor of the `flags` argument.
 * @memberOf XRegExp
 * @param {Array} patterns Regexes and strings to combine.
 * @param {String} [flags] Any combination of XRegExp flags.
 * @returns {RegExp} Union of the provided regexes and strings.
 * @example
 *
 * XRegExp.union(['a+b*c', /(dogs)\1/, /(cats)\1/], 'i');
 * // -> /a\+b\*c|(dogs)\1|(cats)\2/i
 *
 * XRegExp.union([XRegExp('(?<pet>dogs)\\k<pet>'), XRegExp('(?<pet>cats)\\k<pet>')]);
 * // -> XRegExp('(?<pet>dogs)\\k<pet>|(?<pet>cats)\\k<pet>')
 */
    self.union = function (patterns, flags) {
        var parts = /(\()(?!\?)|\\([1-9]\d*)|\\[\s\S]|\[(?:[^\\\]]|\\[\s\S])*]/g,
            numCaptures = 0,
            numPriorCaptures,
            captureNames,
            rewrite = function (match, paren, backref) {
                var name = captureNames[numCaptures - numPriorCaptures];
                if (paren) { // Capturing group
                    ++numCaptures;
                    if (name) { // If the current capture has a name
                        return "(?<" + name + ">";
                    }
                } else if (backref) { // Backreference
                    return "\\" + (+backref + numPriorCaptures);
                }
                return match;
            },
            output = [],
            pattern,
            i;
        if (!(isType(patterns, "array") && patterns.length)) {
            throw new TypeError("patterns must be a nonempty array");
        }
        for (i = 0; i < patterns.length; ++i) {
            pattern = patterns[i];
            if (self.isRegExp(pattern)) {
                numPriorCaptures = numCaptures;
                captureNames = (pattern.xregexp && pattern.xregexp.captureNames) || [];
                // Rewrite backreferences. Passing to XRegExp dies on octals and ensures patterns
                // are independently valid; helps keep this simple. Named captures are put back
                output.push(self(pattern.source).source.replace(parts, rewrite));
            } else {
                output.push(self.escape(pattern));
            }
        }
        return self(output.join("|"), flags);
    };

/**
 * The XRegExp version number.
 * @static
 * @memberOf XRegExp
 * @type String
 */
    self.version = "2.0.0";

/*--------------------------------------
 *  Fixed/extended native methods
 *------------------------------------*/

/**
 * Adds named capture support (with backreferences returned as `result.name`), and fixes browser
 * bugs in the native `RegExp.prototype.exec`. Calling `XRegExp.install('natives')` uses this to
 * override the native method. Use via `XRegExp.exec` without overriding natives.
 * @private
 * @param {String} str String to search.
 * @returns {Array} Match array with named backreference properties, or null.
 */
    fixed.exec = function (str) {
        var match, name, r2, origLastIndex, i;
        if (!this.global) {
            origLastIndex = this.lastIndex;
        }
        match = nativ.exec.apply(this, arguments);
        if (match) {
            // Fix browsers whose `exec` methods don't consistently return `undefined` for
            // nonparticipating capturing groups
            if (!compliantExecNpcg && match.length > 1 && lastIndexOf(match, "") > -1) {
                r2 = new RegExp(this.source, nativ.replace.call(getNativeFlags(this), "g", ""));
                // Using `str.slice(match.index)` rather than `match[0]` in case lookahead allowed
                // matching due to characters outside the match
                nativ.replace.call(String(str).slice(match.index), r2, function () {
                    var i;
                    for (i = 1; i < arguments.length - 2; ++i) {
                        if (arguments[i] === undef) {
                            match[i] = undef;
                        }
                    }
                });
            }
            // Attach named capture properties
            if (this.xregexp && this.xregexp.captureNames) {
                for (i = 1; i < match.length; ++i) {
                    name = this.xregexp.captureNames[i - 1];
                    if (name) {
                        match[name] = match[i];
                    }
                }
            }
            // Fix browsers that increment `lastIndex` after zero-length matches
            if (this.global && !match[0].length && (this.lastIndex > match.index)) {
                this.lastIndex = match.index;
            }
        }
        if (!this.global) {
            this.lastIndex = origLastIndex; // Fixes IE, Opera bug (last tested IE 9, Opera 11.6)
        }
        return match;
    };

/**
 * Fixes browser bugs in the native `RegExp.prototype.test`. Calling `XRegExp.install('natives')`
 * uses this to override the native method.
 * @private
 * @param {String} str String to search.
 * @returns {Boolean} Whether the regex matched the provided value.
 */
    fixed.test = function (str) {
        // Do this the easy way :-)
        return !!fixed.exec.call(this, str);
    };

/**
 * Adds named capture support (with backreferences returned as `result.name`), and fixes browser
 * bugs in the native `String.prototype.match`. Calling `XRegExp.install('natives')` uses this to
 * override the native method.
 * @private
 * @param {RegExp} regex Regex to search with.
 * @returns {Array} If `regex` uses flag g, an array of match strings or null. Without flag g, the
 *   result of calling `regex.exec(this)`.
 */
    fixed.match = function (regex) {
        if (!self.isRegExp(regex)) {
            regex = new RegExp(regex); // Use native `RegExp`
        } else if (regex.global) {
            var result = nativ.match.apply(this, arguments);
            regex.lastIndex = 0; // Fixes IE bug
            return result;
        }
        return fixed.exec.call(regex, this);
    };

/**
 * Adds support for `${n}` tokens for named and numbered backreferences in replacement text, and
 * provides named backreferences to replacement functions as `arguments[0].name`. Also fixes
 * browser bugs in replacement text syntax when performing a replacement using a nonregex search
 * value, and the value of a replacement regex's `lastIndex` property during replacement iterations
 * and upon completion. Note that this doesn't support SpiderMonkey's proprietary third (`flags`)
 * argument. Calling `XRegExp.install('natives')` uses this to override the native method. Use via
 * `XRegExp.replace` without overriding natives.
 * @private
 * @param {RegExp|String} search Search pattern to be replaced.
 * @param {String|Function} replacement Replacement string or a function invoked to create it.
 * @returns {String} New string with one or all matches replaced.
 */
    fixed.replace = function (search, replacement) {
        var isRegex = self.isRegExp(search), captureNames, result, str, origLastIndex;
        if (isRegex) {
            if (search.xregexp) {
                captureNames = search.xregexp.captureNames;
            }
            if (!search.global) {
                origLastIndex = search.lastIndex;
            }
        } else {
            search += "";
        }
        if (isType(replacement, "function")) {
            result = nativ.replace.call(String(this), search, function () {
                var args = arguments, i;
                if (captureNames) {
                    // Change the `arguments[0]` string primitive to a `String` object that can store properties
                    args[0] = new String(args[0]);
                    // Store named backreferences on the first argument
                    for (i = 0; i < captureNames.length; ++i) {
                        if (captureNames[i]) {
                            args[0][captureNames[i]] = args[i + 1];
                        }
                    }
                }
                // Update `lastIndex` before calling `replacement`.
                // Fixes IE, Chrome, Firefox, Safari bug (last tested IE 9, Chrome 17, Firefox 11, Safari 5.1)
                if (isRegex && search.global) {
                    search.lastIndex = args[args.length - 2] + args[0].length;
                }
                return replacement.apply(null, args);
            });
        } else {
            str = String(this); // Ensure `args[args.length - 1]` will be a string when given nonstring `this`
            result = nativ.replace.call(str, search, function () {
                var args = arguments; // Keep this function's `arguments` available through closure
                return nativ.replace.call(String(replacement), replacementToken, function ($0, $1, $2) {
                    var n;
                    // Named or numbered backreference with curly brackets
                    if ($1) {
                        /* XRegExp behavior for `${n}`:
                         * 1. Backreference to numbered capture, where `n` is 1+ digits. `0`, `00`, etc. is the entire match.
                         * 2. Backreference to named capture `n`, if it exists and is not a number overridden by numbered capture.
                         * 3. Otherwise, it's an error.
                         */
                        n = +$1; // Type-convert; drop leading zeros
                        if (n <= args.length - 3) {
                            return args[n] || "";
                        }
                        n = captureNames ? lastIndexOf(captureNames, $1) : -1;
                        if (n < 0) {
                            throw new SyntaxError("backreference to undefined group " + $0);
                        }
                        return args[n + 1] || "";
                    }
                    // Else, special variable or numbered backreference (without curly brackets)
                    if ($2 === "$") return "$";
                    if ($2 === "&" || +$2 === 0) return args[0]; // $&, $0 (not followed by 1-9), $00
                    if ($2 === "`") return args[args.length - 1].slice(0, args[args.length - 2]);
                    if ($2 === "'") return args[args.length - 1].slice(args[args.length - 2] + args[0].length);
                    // Else, numbered backreference (without curly brackets)
                    $2 = +$2; // Type-convert; drop leading zero
                    /* XRegExp behavior:
                     * - Backreferences without curly brackets end after 1 or 2 digits. Use `${..}` for more digits.
                     * - `$1` is an error if there are no capturing groups.
                     * - `$10` is an error if there are less than 10 capturing groups. Use `${1}0` instead.
                     * - `$01` is equivalent to `$1` if a capturing group exists, otherwise it's an error.
                     * - `$0` (not followed by 1-9), `$00`, and `$&` are the entire match.
                     * Native behavior, for comparison:
                     * - Backreferences end after 1 or 2 digits. Cannot use backreference to capturing group 100+.
                     * - `$1` is a literal `$1` if there are no capturing groups.
                     * - `$10` is `$1` followed by a literal `0` if there are less than 10 capturing groups.
                     * - `$01` is equivalent to `$1` if a capturing group exists, otherwise it's a literal `$01`.
                     * - `$0` is a literal `$0`. `$&` is the entire match.
                     */
                    if (!isNaN($2)) {
                        if ($2 > args.length - 3) {
                            throw new SyntaxError("backreference to undefined group " + $0);
                        }
                        return args[$2] || "";
                    }
                    throw new SyntaxError("invalid token " + $0);
                });
            });
        }
        if (isRegex) {
            if (search.global) {
                search.lastIndex = 0; // Fixes IE, Safari bug (last tested IE 9, Safari 5.1)
            } else {
                search.lastIndex = origLastIndex; // Fixes IE, Opera bug (last tested IE 9, Opera 11.6)
            }
        }
        return result;
    };

/**
 * Fixes browser bugs in the native `String.prototype.split`. Calling `XRegExp.install('natives')`
 * uses this to override the native method. Use via `XRegExp.split` without overriding natives.
 * @private
 * @param {RegExp|String} separator Regex or string to use for separating the string.
 * @param {Number} [limit] Maximum number of items to include in the result array.
 * @returns {Array} Array of substrings.
 */
    fixed.split = function (separator, limit) {
        if (!self.isRegExp(separator)) {
            return nativ.split.apply(this, arguments); // use faster native method
        }
        var str = String(this),
            origLastIndex = separator.lastIndex,
            output = [],
            lastLastIndex = 0,
            lastLength;
        /* Values for `limit`, per the spec:
         * If undefined: pow(2,32) - 1
         * If 0, Infinity, or NaN: 0
         * If positive number: limit = floor(limit); if (limit >= pow(2,32)) limit -= pow(2,32);
         * If negative number: pow(2,32) - floor(abs(limit))
         * If other: Type-convert, then use the above rules
         */
        limit = (limit === undef ? -1 : limit) >>> 0;
        self.forEach(str, separator, function (match) {
            if ((match.index + match[0].length) > lastLastIndex) { // != `if (match[0].length)`
                output.push(str.slice(lastLastIndex, match.index));
                if (match.length > 1 && match.index < str.length) {
                    Array.prototype.push.apply(output, match.slice(1));
                }
                lastLength = match[0].length;
                lastLastIndex = match.index + lastLength;
            }
        });
        if (lastLastIndex === str.length) {
            if (!nativ.test.call(separator, "") || lastLength) {
                output.push("");
            }
        } else {
            output.push(str.slice(lastLastIndex));
        }
        separator.lastIndex = origLastIndex;
        return output.length > limit ? output.slice(0, limit) : output;
    };

/*--------------------------------------
 *  Built-in tokens
 *------------------------------------*/

// Shortcut
    add = addToken.on;

/* Letter identity escapes that natively match literal characters: \p, \P, etc.
 * Should be SyntaxErrors but are allowed in web reality. XRegExp makes them errors for cross-
 * browser consistency and to reserve their syntax, but lets them be superseded by XRegExp addons.
 */
    add(/\\([ABCE-RTUVXYZaeg-mopqyz]|c(?![A-Za-z])|u(?![\dA-Fa-f]{4})|x(?![\dA-Fa-f]{2}))/,
        function (match, scope) {
            // \B is allowed in default scope only
            if (match[1] === "B" && scope === defaultScope) {
                return match[0];
            }
            throw new SyntaxError("invalid escape " + match[0]);
        },
        {scope: "all"});

/* Empty character class: [] or [^]
 * Fixes a critical cross-browser syntax inconsistency. Unless this is standardized (per the spec),
 * regex syntax can't be accurately parsed because character class endings can't be determined.
 */
    add(/\[(\^?)]/,
        function (match) {
            // For cross-browser compatibility with ES3, convert [] to \b\B and [^] to [\s\S].
            // (?!) should work like \b\B, but is unreliable in Firefox
            return match[1] ? "[\\s\\S]" : "\\b\\B";
        });

/* Comment pattern: (?# )
 * Inline comments are an alternative to the line comments allowed in free-spacing mode (flag x).
 */
    add(/(?:\(\?#[^)]*\))+/,
        function (match) {
            // Keep tokens separated unless the following token is a quantifier
            return nativ.test.call(quantifier, match.input.slice(match.index + match[0].length)) ? "" : "(?:)";
        });

/* Named backreference: \k<name>
 * Backreference names can use the characters A-Z, a-z, 0-9, _, and $ only.
 */
    add(/\\k<([\w$]+)>/,
        function (match) {
            var index = isNaN(match[1]) ? (lastIndexOf(this.captureNames, match[1]) + 1) : +match[1],
                endIndex = match.index + match[0].length;
            if (!index || index > this.captureNames.length) {
                throw new SyntaxError("backreference to undefined group " + match[0]);
            }
            // Keep backreferences separate from subsequent literal numbers
            return "\\" + index + (
                endIndex === match.input.length || isNaN(match.input.charAt(endIndex)) ? "" : "(?:)"
            );
        });

/* Whitespace and line comments, in free-spacing mode (aka extended mode, flag x) only.
 */
    add(/(?:\s+|#.*)+/,
        function (match) {
            // Keep tokens separated unless the following token is a quantifier
            return nativ.test.call(quantifier, match.input.slice(match.index + match[0].length)) ? "" : "(?:)";
        },
        {
            trigger: function () {
                return this.hasFlag("x");
            },
            customFlags: "x"
        });

/* Dot, in dotall mode (aka singleline mode, flag s) only.
 */
    add(/\./,
        function () {
            return "[\\s\\S]";
        },
        {
            trigger: function () {
                return this.hasFlag("s");
            },
            customFlags: "s"
        });

/* Named capturing group; match the opening delimiter only: (?<name>
 * Capture names can use the characters A-Z, a-z, 0-9, _, and $ only. Names can't be integers.
 * Supports Python-style (?P<name> as an alternate syntax to avoid issues in recent Opera (which
 * natively supports the Python-style syntax). Otherwise, XRegExp might treat numbered
 * backreferences to Python-style named capture as octals.
 */
    add(/\(\?P?<([\w$]+)>/,
        function (match) {
            if (!isNaN(match[1])) {
                // Avoid incorrect lookups, since named backreferences are added to match arrays
                throw new SyntaxError("can't use integer as capture name " + match[0]);
            }
            this.captureNames.push(match[1]);
            this.hasNamedCapture = true;
            return "(";
        });

/* Numbered backreference or octal, plus any following digits: \0, \11, etc.
 * Octals except \0 not followed by 0-9 and backreferences to unopened capture groups throw an
 * error. Other matches are returned unaltered. IE <= 8 doesn't support backreferences greater than
 * \99 in regex syntax.
 */
    add(/\\(\d+)/,
        function (match, scope) {
            if (!(scope === defaultScope && /^[1-9]/.test(match[1]) && +match[1] <= this.captureNames.length) &&
                    match[1] !== "0") {
                throw new SyntaxError("can't use octal escape or backreference to undefined group " + match[0]);
            }
            return match[0];
        },
        {scope: "all"});

/* Capturing group; match the opening parenthesis only.
 * Required for support of named capturing groups. Also adds explicit capture mode (flag n).
 */
    add(/\((?!\?)/,
        function () {
            if (this.hasFlag("n")) {
                return "(?:";
            }
            this.captureNames.push(null);
            return "(";
        },
        {customFlags: "n"});

/*--------------------------------------
 *  Expose XRegExp
 *------------------------------------*/

// For CommonJS enviroments
    if (typeof exports !== "undefined") {
        exports.XRegExp = self;
    }

    return self;

}());

//
// Begin anonymous function. This is used to contain local scope variables without polutting global scope.
//
if (typeof(SyntaxHighlighter) == 'undefined') var SyntaxHighlighter = function() {

// CommonJS
if (typeof(require) != 'undefined' && typeof(XRegExp) == 'undefined')
{
	XRegExp = require('xregexp').XRegExp;
}

// Shortcut object which will be assigned to the SyntaxHighlighter variable.
// This is a shorthand for local reference in order to avoid long namespace
// references to SyntaxHighlighter.whatever...
var sh = {
	defaults : {
		/** Additional CSS class names to be added to highlighter elements. */
		'class-name' : '',

		/** First line number. */
		'first-line' : 1,

		/**
		 * Pads line numbers. Possible values are:
		 *
		 *   false - don't pad line numbers.
		 *   true  - automaticaly pad numbers with minimum required number of leading zeroes.
		 *   [int] - length up to which pad line numbers.
		 */
		'pad-line-numbers' : false,

		/** Lines to highlight. */
		'highlight' : null,

		/** Title to be displayed above the code block. */
		'title' : null,

		/** Enables or disables smart tabs. */
		'smart-tabs' : true,

		/** Gets or sets tab size. */
		'tab-size' : 4,

		/** Enables or disables gutter. */
		'gutter' : true,

		/** Enables or disables toolbar. */
		'toolbar' : true,

		/** Enables quick code copy and paste from double click. */
		'quick-code' : true,

		/** Forces code view to be collapsed. */
		'collapse' : false,

		/** Enables or disables automatic links. */
		'auto-links' : true,

		/** Gets or sets light mode. Equavalent to turning off gutter and toolbar. */
		'light' : false,

		'unindent' : true,

		'html-script' : false
	},

	config : {
		space : '&nbsp;',

		/** Enables use of <SCRIPT type="syntaxhighlighter" /> tags. */
		useScriptTags : true,

		/** Blogger mode flag. */
		bloggerMode : false,

		stripBrs : false,

		/** Name of the tag that SyntaxHighlighter will automatically look for. */
		tagName : 'pre',

		strings : {
			expandSource : 'expand source',
			help : '?',
			alert: 'SyntaxHighlighter\n\n',
			noBrush : 'Can\'t find brush for: ',
			brushNotHtmlScript : 'Brush wasn\'t configured for html-script option: ',

			// this is populated by the build script
			aboutDialog : '<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.0 Transitional//EN\" \"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd\"><html xmlns=\"http://www.w3.org/1999/xhtml\"><head><meta http-equiv=\"Content-Type\" content=\"text/html; charset=utf-8\" /><title>About SyntaxHighlighter</title></head><body style=\"font-family:Geneva,Arial,Helvetica,sans-serif;background-color:#fff;color:#000;font-size:1em;text-align:center;\"><div style=\"text-align:center;margin-top:1.5em;\"><div style=\"font-size:xx-large;\">SyntaxHighlighter</div><div style=\"font-size:.75em;margin-bottom:3em;\"><div>version 3.0.83 (Tue, 04 Feb 2014 22:06:22 GMT)</div><div><a href=\"http://alexgorbatchev.com/SyntaxHighlighter\" target=\"_blank\" style=\"color:#005896\">http://alexgorbatchev.com/SyntaxHighlighter</a></div><div>JavaScript code syntax highlighter.</div><div>Copyright 2004-2013 Alex Gorbatchev.</div></div><div>If you like this script, please <a href=\"https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=2930402\" style=\"color:#005896\">donate</a> to <br/>keep development active!</div></div></body></html>'
		}
	},

	/** Internal 'global' variables. */
	vars : {
		discoveredBrushes : null,
		highlighters : {}
	},

	/** This object is populated by user included external brush files. */
	brushes : {},

	/** Common regular expressions. */
	regexLib : {
		multiLineCComments			: XRegExp('/\\*.*?\\*/', 'gs'),
		singleLineCComments			: /\/\/.*$/gm,
		singleLinePerlComments		: /#.*$/gm,
		doubleQuotedString			: /"([^\\"\n]|\\.)*"/g,
		singleQuotedString			: /'([^\\'\n]|\\.)*'/g,
		multiLineDoubleQuotedString	: XRegExp('"([^\\\\"]|\\\\.)*"', 'gs'),
		multiLineSingleQuotedString	: XRegExp("'([^\\\\']|\\\\.)*'", 'gs'),
		xmlComments					: XRegExp('(&lt;|<)!--.*?--(&gt;|>)', 'gs'),
		url							: /\w+:\/\/[\w-.\/?%&=:@;#]*/g,
		phpScriptTags 				: { left: /(&lt;|<)\?(?:=|php)?/g, right: /\?(&gt;|>)/g, 'eof' : true },
		aspScriptTags				: { left: /(&lt;|<)%=?/g, right: /%(&gt;|>)/g },
		scriptScriptTags			: { left: /(&lt;|<)\s*script.*?(&gt;|>)/gi, right: /(&lt;|<)\/\s*script\s*(&gt;|>)/gi }
	},

	toolbar: {
		/**
		 * Generates HTML markup for the toolbar.
		 * @param {Highlighter} highlighter Highlighter instance.
		 * @return {String} Returns HTML markup.
		 */
		getHtml: function(highlighter)
		{
			var html = '<div class="toolbar">',
				items = sh.toolbar.items,
				list = items.list
				;

			function defaultGetHtml(highlighter, name)
			{
				return sh.toolbar.getButtonHtml(highlighter, name, sh.config.strings[name]);
			}

			for (var i = 0, l = list.length; i < l; i++)
			{
				html += (items[list[i]].getHtml || defaultGetHtml)(highlighter, list[i]);
			}

			html += '</div>';

			return html;
		},

		/**
		 * Generates HTML markup for a regular button in the toolbar.
		 * @param {Highlighter} highlighter Highlighter instance.
		 * @param {String} commandName		Command name that would be executed.
		 * @param {String} label			Label text to display.
		 * @return {String}					Returns HTML markup.
		 */
		getButtonHtml: function(highlighter, commandName, label)
		{
			return '<span><a href="#" class="toolbar_item'
				+ ' command_' + commandName
				+ ' ' + commandName
				+ '">' + label + '</a></span>'
				;
		},

		/**
		 * Event handler for a toolbar anchor.
		 */
		handler: function(e)
		{
			var target = e.target,
				className = target.className || ''
				;

			function getValue(name)
			{
				var r = new RegExp(name + '_(\\w+)'),
					match = r.exec(className)
					;

				return match ? match[1] : null;
			}

			var highlighter = getHighlighterById(findParentElement(target, '.syntaxhighlighter').id),
				commandName = getValue('command')
				;

			// execute the toolbar command
			if (highlighter && commandName)
				sh.toolbar.items[commandName].execute(highlighter);

			// disable default A click behaviour
			e.preventDefault();
		},

		/** Collection of toolbar items. */
		items : {
			// Ordered lis of items in the toolbar. Can't expect `for (var n in items)` to be consistent.
			list: ['expandSource', 'help'],

			expandSource: {
				getHtml: function(highlighter)
				{
					if (highlighter.getParam('collapse') != true)
						return '';

					var title = highlighter.getParam('title');
					return sh.toolbar.getButtonHtml(highlighter, 'expandSource', title ? title : sh.config.strings.expandSource);
				},

				execute: function(highlighter)
				{
					var div = getHighlighterDivById(highlighter.id);
					removeClass(div, 'collapsed');
				}
			},

			/** Command to display the about dialog window. */
			help: {
				execute: function(highlighter)
				{
					var wnd = popup('', '_blank', 500, 250, 'scrollbars=0'),
						doc = wnd.document
						;

					doc.write(sh.config.strings.aboutDialog);
					doc.close();
					wnd.focus();
				}
			}
		}
	},

	/**
	 * Finds all elements on the page which should be processes by SyntaxHighlighter.
	 *
	 * @param {Object} globalParams		Optional parameters which override element's
	 * 									parameters. Only used if element is specified.
	 *
	 * @param {Object} element	Optional element to highlight. If none is
	 * 							provided, all elements in the current document
	 * 							are returned which qualify.
	 *
	 * @return {Array}	Returns list of <code>{ target: DOMElement, params: Object }</code> objects.
	 */
	findElements: function(globalParams, element)
	{
		var elements = element ? [element] : toArray(document.getElementsByTagName(sh.config.tagName)),
			conf = sh.config,
			result = []
			;

		// support for <SCRIPT TYPE="syntaxhighlighter" /> feature
		if (conf.useScriptTags)
			elements = elements.concat(getSyntaxHighlighterScriptTags());

		if (elements.length === 0)
			return result;

		for (var i = 0, l = elements.length; i < l; i++)
		{
			var item = {
				target: elements[i],
				// local params take precedence over globals
				params: merge(globalParams, parseParams(elements[i].className))
			};

			if (item.params['brush'] == null)
				continue;

			result.push(item);
		}

		return result;
	},

	/**
	 * Shorthand to highlight all elements on the page that are marked as
	 * SyntaxHighlighter source code.
	 *
	 * @param {Object} globalParams		Optional parameters which override element's
	 * 									parameters. Only used if element is specified.
	 *
	 * @param {Object} element	Optional element to highlight. If none is
	 * 							provided, all elements in the current document
	 * 							are highlighted.
	 */
	highlight: function(globalParams, element)
	{
		var elements = this.findElements(globalParams, element),
			propertyName = 'innerHTML',
			highlighter = null,
			conf = sh.config
			;

		if (elements.length === 0)
			return;

		for (var i = 0, l = elements.length; i < l; i++)
		{
			var element = elements[i],
				target = element.target,
				params = element.params,
				brushName = params.brush,
				code
				;

			if (brushName == null)
				continue;

			// Instantiate a brush
			if (params['html-script'] == 'true' || sh.defaults['html-script'] == true)
			{
				highlighter = new sh.HtmlScript(brushName);
				brushName = 'htmlscript';
			}
			else
			{
				var brush = findBrush(brushName);

				if (brush)
					highlighter = new brush();
				else
					continue;
			}

			code = target[propertyName];

			// remove CDATA from <SCRIPT/> tags if it's present
			if (conf.useScriptTags)
				code = stripCData(code);

			// Inject title if the attribute is present
			if ((target.title || '') != '')
				params.title = target.title;

			params['brush'] = brushName;
			highlighter.init(params);
			element = highlighter.getDiv(code);

			// carry over ID
			if ((target.id || '') != '')
				element.id = target.id;

			target.parentNode.replaceChild(element, target);
		}
	},

	/**
	 * Main entry point for the SyntaxHighlighter.
	 * @param {Object} params Optional params to apply to all highlighted elements.
	 */
	all: function(params)
	{
		attachEvent(
			window,
			'load',
			function() { sh.highlight(params); }
		);
	}
}; // end of sh

/**
 * Checks if target DOM elements has specified CSS class.
 * @param {DOMElement} target Target DOM element to check.
 * @param {String} className Name of the CSS class to check for.
 * @return {Boolean} Returns true if class name is present, false otherwise.
 */
function hasClass(target, className)
{
	return target.className.indexOf(className) != -1;
};

/**
 * Adds CSS class name to the target DOM element.
 * @param {DOMElement} target Target DOM element.
 * @param {String} className New CSS class to add.
 */
function addClass(target, className)
{
	if (!hasClass(target, className))
		target.className += ' ' + className;
};

/**
 * Removes CSS class name from the target DOM element.
 * @param {DOMElement} target Target DOM element.
 * @param {String} className CSS class to remove.
 */
function removeClass(target, className)
{
	target.className = target.className.replace(className, '');
};

/**
 * Converts the source to array object. Mostly used for function arguments and
 * lists returned by getElementsByTagName() which aren't Array objects.
 * @param {List} source Source list.
 * @return {Array} Returns array.
 */
function toArray(source)
{
	var result = [];

	for (var i = 0, l = source.length; i < l; i++)
		result.push(source[i]);

	return result;
};

/**
 * Splits block of text into lines.
 * @param {String} block Block of text.
 * @return {Array} Returns array of lines.
 */
function splitLines(block)
{
	return block.split(/\r?\n/);
}

/**
 * Generates HTML ID for the highlighter.
 * @param {String} highlighterId Highlighter ID.
 * @return {String} Returns HTML ID.
 */
function getHighlighterId(id)
{
	var prefix = 'highlighter_';
	return id.indexOf(prefix) == 0 ? id : prefix + id;
};

/**
 * Finds Highlighter instance by ID.
 * @param {String} highlighterId Highlighter ID.
 * @return {Highlighter} Returns instance of the highlighter.
 */
function getHighlighterById(id)
{
	return sh.vars.highlighters[getHighlighterId(id)];
};

/**
 * Finds highlighter's DIV container.
 * @param {String} highlighterId Highlighter ID.
 * @return {Element} Returns highlighter's DIV element.
 */
function getHighlighterDivById(id)
{
	return document.getElementById(getHighlighterId(id));
};

/**
 * Stores highlighter so that getHighlighterById() can do its thing. Each
 * highlighter must call this method to preserve itself.
 * @param {Highilghter} highlighter Highlighter instance.
 */
function storeHighlighter(highlighter)
{
	sh.vars.highlighters[getHighlighterId(highlighter.id)] = highlighter;
};

/**
 * Looks for a child or parent node which has specified classname.
 * Equivalent to jQuery's $(container).find(".className")
 * @param {Element} target Target element.
 * @param {String} search Class name or node name to look for.
 * @param {Boolean} reverse If set to true, will go up the node tree instead of down.
 * @return {Element} Returns found child or parent element on null.
 */
function findElement(target, search, reverse /* optional */)
{
	if (target == null)
		return null;

	var nodes			= reverse != true ? target.childNodes : [ target.parentNode ],
		propertyToFind	= { '#' : 'id', '.' : 'className' }[search.substr(0, 1)] || 'nodeName',
		expectedValue,
		found
		;

	expectedValue = propertyToFind != 'nodeName'
		? search.substr(1)
		: search.toUpperCase()
		;

	// main return of the found node
	if ((target[propertyToFind] || '').indexOf(expectedValue) != -1)
		return target;

	for (var i = 0, l = nodes.length; nodes && i < l && found == null; i++)
		found = findElement(nodes[i], search, reverse);

	return found;
};

/**
 * Looks for a parent node which has specified classname.
 * This is an alias to <code>findElement(container, className, true)</code>.
 * @param {Element} target Target element.
 * @param {String} className Class name to look for.
 * @return {Element} Returns found parent element on null.
 */
function findParentElement(target, className)
{
	return findElement(target, className, true);
};

/**
 * Finds an index of element in the array.
 * @ignore
 * @param {Object} searchElement
 * @param {Number} fromIndex
 * @return {Number} Returns index of element if found; -1 otherwise.
 */
function indexOf(array, searchElement, fromIndex)
{
	fromIndex = Math.max(fromIndex || 0, 0);

	for (var i = fromIndex, l = array.length; i < l; i++)
		if(array[i] == searchElement)
			return i;

	return -1;
};

/**
 * Generates a unique element ID.
 */
function guid(prefix)
{
	return (prefix || '') + Math.round(Math.random() * 1000000).toString();
};

/**
 * Merges two objects. Values from obj2 override values in obj1.
 * Function is NOT recursive and works only for one dimensional objects.
 * @param {Object} obj1 First object.
 * @param {Object} obj2 Second object.
 * @return {Object} Returns combination of both objects.
 */
function merge(obj1, obj2)
{
	var result = {}, name;

	for (name in obj1)
		result[name] = obj1[name];

	for (name in obj2)
		result[name] = obj2[name];

	return result;
};

/**
 * Attempts to convert string to boolean.
 * @param {String} value Input string.
 * @return {Boolean} Returns true if input was "true", false if input was "false" and value otherwise.
 */
function toBoolean(value)
{
	var result = { "true" : true, "false" : false }[value];
	return result == null ? value : result;
};

/**
 * Opens up a centered popup window.
 * @param {String} url		URL to open in the window.
 * @param {String} name		Popup name.
 * @param {int} width		Popup width.
 * @param {int} height		Popup height.
 * @param {String} options	window.open() options.
 * @return {Window}			Returns window instance.
 */
function popup(url, name, width, height, options)
{
	var x = (screen.width - width) / 2,
		y = (screen.height - height) / 2
		;

	options +=	', left=' + x +
				', top=' + y +
				', width=' + width +
				', height=' + height
		;
	options = options.replace(/^,/, '');

	var win = window.open(url, name, options);
	win.focus();
	return win;
};

/**
 * Adds event handler to the target object.
 * @param {Object} obj		Target object.
 * @param {String} type		Name of the event.
 * @param {Function} func	Handling function.
 */
function attachEvent(obj, type, func, scope)
{
	function handler(e)
	{
		e = e || window.event;

		if (!e.target)
		{
			e.target = e.srcElement;
			e.preventDefault = function()
			{
				this.returnValue = false;
			};
		}

		func.call(scope || window, e);
	};

	if (obj.attachEvent)
	{
		obj.attachEvent('on' + type, handler);
	}
	else
	{
		obj.addEventListener(type, handler, false);
	}
};

/**
 * Displays an alert.
 * @param {String} str String to display.
 */
function alert(str)
{
	window.alert(sh.config.strings.alert + str);
};

/**
 * Finds a brush by its alias.
 *
 * @param {String} alias		Brush alias.
 * @param {Boolean} showAlert	Suppresses the alert if false.
 * @return {Brush}				Returns bursh constructor if found, null otherwise.
 */
function findBrush(alias, showAlert)
{
	var brushes = sh.vars.discoveredBrushes,
		result = null
		;

	if (brushes == null)
	{
		brushes = {};

		// Find all brushes
		for (var brush in sh.brushes)
		{
			var info = sh.brushes[brush],
				aliases = info.aliases
				;

			if (aliases == null)
				continue;

			// keep the brush name
			info.brushName = brush.toLowerCase();

			for (var i = 0, l = aliases.length; i < l; i++)
				brushes[aliases[i]] = brush;
		}

		sh.vars.discoveredBrushes = brushes;
	}

	result = sh.brushes[brushes[alias]];

	if (result == null && showAlert)
		alert(sh.config.strings.noBrush + alias);

	return result;
};

/**
 * Executes a callback on each line and replaces each line with result from the callback.
 * @param {Object} str			Input string.
 * @param {Object} callback		Callback function taking one string argument and returning a string.
 */
function eachLine(str, callback)
{
	var lines = splitLines(str);

	for (var i = 0, l = lines.length; i < l; i++)
		lines[i] = callback(lines[i], i);

	// include \r to enable copy-paste on windows (ie8) without getting everything on one line
	return lines.join('\r\n');
};

/**
 * This is a special trim which only removes first and last empty lines
 * and doesn't affect valid leading space on the first line.
 *
 * @param {String} str   Input string
 * @return {String}      Returns string without empty first and last lines.
 */
function trimFirstAndLastLines(str)
{
	return str.replace(/^[ ]*[\n]+|[\n]*[ ]*$/g, '');
};

/**
 * Parses key/value pairs into hash object.
 *
 * Understands the following formats:
 * - name: word;
 * - name: [word, word];
 * - name: "string";
 * - name: 'string';
 *
 * For example:
 *   name1: value; name2: [value, value]; name3: 'value'
 *
 * @param {String} str    Input string.
 * @return {Object}       Returns deserialized object.
 */
function parseParams(str)
{
	var match,
		result = {},
		arrayRegex = XRegExp("^\\[(?<values>(.*?))\\]$"),
		pos = 0,
		regex = XRegExp(
			"(?<name>[\\w-]+)" +
			"\\s*:\\s*" +
			"(?<value>" +
				"[\\w%#-]+|" +		// word
				"\\[.*?\\]|" +		// [] array
				'".*?"|' +			// "" string
				"'.*?'" +			// '' string
			")\\s*;?",
			"g"
		)
		;

	while ((match = XRegExp.exec(str, regex, pos)) != null)
	{
		var value = match.value
			.replace(/^['"]|['"]$/g, '') // strip quotes from end of strings
			;

		// try to parse array value
		if (value != null && arrayRegex.test(value))
		{
			var m = XRegExp.exec(value, arrayRegex);
			value = m.values.length > 0 ? m.values.split(/\s*,\s*/) : [];
		}

		result[match.name] = value;
		pos = match.index + match[0].length;
	}

	return result;
};

/**
 * Wraps each line of the string into <code/> tag with given style applied to it.
 *
 * @param {String} str   Input string.
 * @param {String} css   Style name to apply to the string.
 * @return {String}      Returns input string with each line surrounded by <span/> tag.
 */
function wrapLinesWithCode(str, css)
{
	if (str == null || str.length == 0 || str == '\n')
		return str;

	str = str.replace(/</g, '&lt;');

	// Replace two or more sequential spaces with &nbsp; leaving last space untouched.
	str = str.replace(/ {2,}/g, function(m)
	{
		var spaces = '';

		for (var i = 0, l = m.length; i < l - 1; i++)
			spaces += sh.config.space;

		return spaces + ' ';
	});

	// Split each line and apply <span class="...">...</span> to them so that
	// leading spaces aren't included.
	if (css != null)
		str = eachLine(str, function(line)
		{
			if (line.length == 0)
				return '';

			var spaces = '';

			line = line.replace(/^(&nbsp;| )+/, function(s)
			{
				spaces = s;
				return '';
			});

			if (line.length == 0)
				return spaces;

			return spaces + '<code class="' + css + '">' + line + '</code>';
		});

	return str;
};

/**
 * Pads number with zeros until it's length is the same as given length.
 *
 * @param {Number} number	Number to pad.
 * @param {Number} length	Max string length with.
 * @return {String}			Returns a string padded with proper amount of '0'.
 */
function padNumber(number, length)
{
	var result = number.toString();

	while (result.length < length)
		result = '0' + result;

	return result;
};

/**
 * Replaces tabs with spaces.
 *
 * @param {String} code		Source code.
 * @param {Number} tabSize	Size of the tab.
 * @return {String}			Returns code with all tabs replaces by spaces.
 */
function processTabs(code, tabSize)
{
	var tab = '';

	for (var i = 0; i < tabSize; i++)
		tab += ' ';

	return code.replace(/\t/g, tab);
};

/**
 * Replaces tabs with smart spaces.
 *
 * @param {String} code    Code to fix the tabs in.
 * @param {Number} tabSize Number of spaces in a column.
 * @return {String}        Returns code with all tabs replaces with roper amount of spaces.
 */
function processSmartTabs(code, tabSize)
{
	var lines = splitLines(code),
		tab = '\t',
		spaces = ''
		;

	// Create a string with 1000 spaces to copy spaces from...
	// It's assumed that there would be no indentation longer than that.
	for (var i = 0; i < 50; i++)
		spaces += '                    '; // 20 spaces * 50

	// This function inserts specified amount of spaces in the string
	// where a tab is while removing that given tab.
	function insertSpaces(line, pos, count)
	{
		return line.substr(0, pos)
			+ spaces.substr(0, count)
			+ line.substr(pos + 1, line.length) // pos + 1 will get rid of the tab
			;
	};

	// Go through all the lines and do the 'smart tabs' magic.
	code = eachLine(code, function(line)
	{
		if (line.indexOf(tab) == -1)
			return line;

		var pos = 0;

		while ((pos = line.indexOf(tab)) != -1)
		{
			// This is pretty much all there is to the 'smart tabs' logic.
			// Based on the position within the line and size of a tab,
			// calculate the amount of spaces we need to insert.
			var spaces = tabSize - pos % tabSize;
			line = insertSpaces(line, pos, spaces);
		}

		return line;
	});

	return code;
};

/**
 * Performs various string fixes based on configuration.
 */
function fixInputString(str)
{
	var br = /<br\s*\/?>|&lt;br\s*\/?&gt;/gi;

	if (sh.config.bloggerMode == true)
		str = str.replace(br, '\n');

	if (sh.config.stripBrs == true)
		str = str.replace(br, '');

	return str;
};

/**
 * Removes all white space at the begining and end of a string.
 *
 * @param {String} str   String to trim.
 * @return {String}      Returns string without leading and following white space characters.
 */
function trim(str)
{
	return str.replace(/^\s+|\s+$/g, '');
};

/**
 * Unindents a block of text by the lowest common indent amount.
 * @param {String} str   Text to unindent.
 * @return {String}      Returns unindented text block.
 */
function unindent(str)
{
	var lines = splitLines(fixInputString(str)),
		indents = new Array(),
		regex = /^\s*/,
		min = 1000
		;

	// go through every line and check for common number of indents
	for (var i = 0, l = lines.length; i < l && min > 0; i++)
	{
		var line = lines[i];

		if (trim(line).length == 0)
			continue;

		var matches = regex.exec(line);

		// In the event that just one line doesn't have leading white space
		// we can't unindent anything, so bail completely.
		if (matches == null)
			return str;

		min = Math.min(matches[0].length, min);
	}

	// trim minimum common number of white space from the begining of every line
	if (min > 0)
		for (var i = 0, l = lines.length; i < l; i++)
			lines[i] = lines[i].substr(min);

	return lines.join('\n');
};

/**
 * Callback method for Array.sort() which sorts matches by
 * index position and then by length.
 *
 * @param {Match} m1	Left object.
 * @param {Match} m2    Right object.
 * @return {Number}     Returns -1, 0 or -1 as a comparison result.
 */
function matchesSortCallback(m1, m2)
{
	// sort matches by index first
	if(m1.index < m2.index)
		return -1;
	else if(m1.index > m2.index)
		return 1;
	else
	{
		// if index is the same, sort by length
		if(m1.length < m2.length)
			return -1;
		else if(m1.length > m2.length)
			return 1;
	}

	return 0;
};

/**
 * Executes given regular expression on provided code and returns all
 * matches that are found.
 *
 * @param {String} code    Code to execute regular expression on.
 * @param {Object} regex   Regular expression item info from <code>regexList</code> collection.
 * @return {Array}         Returns a list of Match objects.
 */
function getMatches(code, regexInfo)
{
	function defaultAdd(match, regexInfo)
	{
		return match[0];
	};

	var index = 0,
		match = null,
		matches = [],
		func = regexInfo.func ? regexInfo.func : defaultAdd
		pos = 0
		;

	while((match = XRegExp.exec(code, regexInfo.regex, pos)) != null)
	{
		var resultMatch = func(match, regexInfo);

		if (typeof(resultMatch) == 'string')
			resultMatch = [new sh.Match(resultMatch, match.index, regexInfo.css)];

		matches = matches.concat(resultMatch);
		pos = match.index + match[0].length;
	}

	return matches;
};

/**
 * Turns all URLs in the code into <a/> tags.
 * @param {String} code Input code.
 * @return {String} Returns code with </a> tags.
 */
function processUrls(code)
{
	var gt = /(.*)((&gt;|&lt;).*)/;

	return code.replace(sh.regexLib.url, function(m)
	{
		var suffix = '',
			match = null
			;

		// We include &lt; and &gt; in the URL for the common cases like <http://google.com>
		// The problem is that they get transformed into &lt;http://google.com&gt;
		// Where as &gt; easily looks like part of the URL string.

		if (match = gt.exec(m))
		{
			m = match[1];
			suffix = match[2];
		}

		return '<a href="' + m + '">' + m + '</a>' + suffix;
	});
};

/**
 * Finds all <SCRIPT TYPE="syntaxhighlighter" /> elementss.
 * @return {Array} Returns array of all found SyntaxHighlighter tags.
 */
function getSyntaxHighlighterScriptTags()
{
	var tags = document.getElementsByTagName('script'),
		result = []
		;

	for (var i = 0, l = tags.length; i < l; i++)
		if (tags[i].type == 'syntaxhighlighter')
			result.push(tags[i]);

	return result;
};

/**
 * Strips <![CDATA[]]> from <SCRIPT /> content because it should be used
 * there in most cases for XHTML compliance.
 * @param {String} original	Input code.
 * @return {String} Returns code without leading <![CDATA[]]> tags.
 */
function stripCData(original)
{
	var left = '<![CDATA[',
		right = ']]>',
		// for some reason IE inserts some leading blanks here
		copy = trim(original),
		changed = false,
		leftLength = left.length,
		rightLength = right.length
		;

	if (copy.indexOf(left) == 0)
	{
		copy = copy.substring(leftLength);
		changed = true;
	}

	var copyLength = copy.length;

	if (copy.indexOf(right) == copyLength - rightLength)
	{
		copy = copy.substring(0, copyLength - rightLength);
		changed = true;
	}

	return changed ? copy : original;
};


/**
 * Quick code mouse double click handler.
 */
function quickCodeHandler(e)
{
	var target = e.target,
		highlighterDiv = findParentElement(target, '.syntaxhighlighter'),
		container = findParentElement(target, '.container'),
		textarea = document.createElement('textarea'),
		highlighter
		;

	if (!container || !highlighterDiv || findElement(container, 'textarea'))
		return;

	highlighter = getHighlighterById(highlighterDiv.id);

	// add source class name
	addClass(highlighterDiv, 'source');

	// Have to go over each line and grab it's text, can't just do it on the
	// container because Firefox loses all \n where as Webkit doesn't.
	var lines = container.childNodes,
		code = []
		;

	for (var i = 0, l = lines.length; i < l; i++)
		code.push(lines[i].innerText || lines[i].textContent);

	// using \r instead of \r or \r\n makes this work equally well on IE, FF and Webkit
	code = code.join('\r');

    // For Webkit browsers, replace nbsp with a breaking space
    code = code.replace(/\u00a0/g, " ");

	// inject <textarea/> tag
	textarea.appendChild(document.createTextNode(code));
	container.appendChild(textarea);

	// preselect all text
	textarea.focus();
	textarea.select();

	// set up handler for lost focus
	attachEvent(textarea, 'blur', function(e)
	{
		textarea.parentNode.removeChild(textarea);
		removeClass(highlighterDiv, 'source');
	});
};

/**
 * Match object.
 */
sh.Match = function(value, index, css)
{
	this.value = value;
	this.index = index;
	this.length = value.length;
	this.css = css;
	this.brushName = null;
};

sh.Match.prototype.toString = function()
{
	return this.value;
};

/**
 * Simulates HTML code with a scripting language embedded.
 *
 * @param {String} scriptBrushName Brush name of the scripting language.
 */
sh.HtmlScript = function(scriptBrushName)
{
	var brushClass = findBrush(scriptBrushName),
		scriptBrush,
		xmlBrush = new sh.brushes.Xml(),
		bracketsRegex = null,
		ref = this,
		methodsToExpose = 'getDiv getHtml init'.split(' ')
		;

	if (brushClass == null)
		return;

	scriptBrush = new brushClass();

	for(var i = 0, l = methodsToExpose.length; i < l; i++)
		// make a closure so we don't lose the name after i changes
		(function() {
			var name = methodsToExpose[i];

			ref[name] = function()
			{
				return xmlBrush[name].apply(xmlBrush, arguments);
			};
		})();

	if (scriptBrush.htmlScript == null)
	{
		alert(sh.config.strings.brushNotHtmlScript + scriptBrushName);
		return;
	}

	xmlBrush.regexList.push(
		{ regex: scriptBrush.htmlScript.code, func: process }
	);

	function offsetMatches(matches, offset)
	{
		for (var j = 0, l = matches.length; j < l; j++)
			matches[j].index += offset;
	}

	function process(match, info)
	{
		var code = match.code,
			matches = [],
			regexList = scriptBrush.regexList,
			offset = match.index + match.left.length,
			htmlScript = scriptBrush.htmlScript,
			result
			;

		// add all matches from the code
		for (var i = 0, l = regexList.length; i < l; i++)
		{
			result = getMatches(code, regexList[i]);
			offsetMatches(result, offset);
			matches = matches.concat(result);
		}

		// add left script bracket
		if (htmlScript.left != null && match.left != null)
		{
			result = getMatches(match.left, htmlScript.left);
			offsetMatches(result, match.index);
			matches = matches.concat(result);
		}

		// add right script bracket
		if (htmlScript.right != null && match.right != null)
		{
			result = getMatches(match.right, htmlScript.right);
			offsetMatches(result, match.index + match[0].lastIndexOf(match.right));
			matches = matches.concat(result);
		}

		for (var j = 0, l = matches.length; j < l; j++)
			matches[j].brushName = brushClass.brushName;

		return matches;
	}
};

/**
 * Main Highlither class.
 * @constructor
 */
sh.Highlighter = function()
{
	// not putting any code in here because of the prototype inheritance
};

sh.Highlighter.prototype = {
	/**
	 * Returns value of the parameter passed to the highlighter.
	 * @param {String} name				Name of the parameter.
	 * @param {Object} defaultValue		Default value.
	 * @return {Object}					Returns found value or default value otherwise.
	 */
	getParam: function(name, defaultValue)
	{
		var result = this.params[name];
		return toBoolean(result == null ? defaultValue : result);
	},

	/**
	 * Shortcut to document.createElement().
	 * @param {String} name		Name of the element to create (DIV, A, etc).
	 * @return {HTMLElement}	Returns new HTML element.
	 */
	create: function(name)
	{
		return document.createElement(name);
	},

	/**
	 * Applies all regular expression to the code and stores all found
	 * matches in the `this.matches` array.
	 * @param {Array} regexList		List of regular expressions.
	 * @param {String} code			Source code.
	 * @return {Array}				Returns list of matches.
	 */
	findMatches: function(regexList, code)
	{
		var result = [];

		if (regexList != null)
			for (var i = 0, l = regexList.length; i < l; i++)
				// BUG: length returns len+1 for array if methods added to prototype chain (oising@gmail.com)
				if (typeof (regexList[i]) == "object")
					result = result.concat(getMatches(code, regexList[i]));

		// sort and remove nested the matches
		return this.removeNestedMatches(result.sort(matchesSortCallback));
	},

	/**
	 * Checks to see if any of the matches are inside of other matches.
	 * This process would get rid of highligted strings inside comments,
	 * keywords inside strings and so on.
	 */
	removeNestedMatches: function(matches)
	{
		// Optimized by Jose Prado (http://joseprado.com)
		for (var i = 0, l = matches.length; i < l; i++)
		{
			if (matches[i] === null)
				continue;

			var itemI = matches[i],
				itemIEndPos = itemI.index + itemI.length
				;

			for (var j = i + 1, l = matches.length; j < l && matches[i] !== null; j++)
			{
				var itemJ = matches[j];

				if (itemJ === null)
					continue;
				else if (itemJ.index > itemIEndPos)
					break;
				else if (itemJ.index == itemI.index && itemJ.length > itemI.length)
					matches[i] = null;
				else if (itemJ.index >= itemI.index && itemJ.index < itemIEndPos)
					matches[j] = null;
			}
		}

		return matches;
	},

	/**
	 * Creates an array containing integer line numbers starting from the 'first-line' param.
	 * @return {Array} Returns array of integers.
	 */
	figureOutLineNumbers: function(code)
	{
		var lines = [],
			firstLine = parseInt(this.getParam('first-line'))
			;

		eachLine(code, function(line, index)
		{
			lines.push(index + firstLine);
		});

		return lines;
	},

	/**
	 * Determines if specified line number is in the highlighted list.
	 */
	isLineHighlighted: function(lineNumber)
	{
		var list = this.getParam('highlight', []);

		if (typeof(list) != 'object' && list.push == null)
			list = [ list ];

		return indexOf(list, lineNumber.toString()) != -1;
	},

	/**
	 * Generates HTML markup for a single line of code while determining alternating line style.
	 * @param {Integer} lineNumber	Line number.
	 * @param {String} code Line	HTML markup.
	 * @return {String}				Returns HTML markup.
	 */
	getLineHtml: function(lineIndex, lineNumber, code)
	{
		var classes = [
			'line',
			'number' + lineNumber,
			'index' + lineIndex,
			'alt' + (lineNumber % 2 == 0 ? 1 : 2).toString()
		];

		if (this.isLineHighlighted(lineNumber))
		 	classes.push('highlighted');

		if (lineNumber == 0)
			classes.push('break');

		return '<div class="' + classes.join(' ') + '">' + code + '</div>';
	},

	/**
	 * Generates HTML markup for line number column.
	 * @param {String} code			Complete code HTML markup.
	 * @param {Array} lineNumbers	Calculated line numbers.
	 * @return {String}				Returns HTML markup.
	 */
	getLineNumbersHtml: function(code, lineNumbers)
	{
		var html = '',
			count = splitLines(code).length,
			firstLine = parseInt(this.getParam('first-line')),
			pad = this.getParam('pad-line-numbers')
			;

		if (pad == true)
			pad = (firstLine + count - 1).toString().length;
		else if (isNaN(pad) == true)
			pad = 0;

		for (var i = 0; i < count; i++)
		{
			var lineNumber = lineNumbers ? lineNumbers[i] : firstLine + i,
				code = lineNumber == 0 ? sh.config.space : padNumber(lineNumber, pad)
				;

			html += this.getLineHtml(i, lineNumber, code);
		}

		return html;
	},

	/**
	 * Splits block of text into individual DIV lines.
	 * @param {String} code			Code to highlight.
	 * @param {Array} lineNumbers	Calculated line numbers.
	 * @return {String}				Returns highlighted code in HTML form.
	 */
	getCodeLinesHtml: function(html, lineNumbers)
	{
		html = trim(html);

		var lines = splitLines(html),
			padLength = this.getParam('pad-line-numbers'),
			firstLine = parseInt(this.getParam('first-line')),
			html = '',
			brushName = this.getParam('brush')
			;

		for (var i = 0, l = lines.length; i < l; i++)
		{
			var line = lines[i],
				indent = /^(&nbsp;|\s)+/.exec(line),
				spaces = null,
				lineNumber = lineNumbers ? lineNumbers[i] : firstLine + i;
				;

			if (indent != null)
			{
				spaces = indent[0].toString();
				line = line.substr(spaces.length);
				spaces = spaces.replace(' ', sh.config.space);
			}

			line = trim(line);

			if (line.length == 0)
				line = sh.config.space;

			html += this.getLineHtml(
				i,
				lineNumber,
				(spaces != null ? '<code class="' + brushName + ' spaces">' + spaces + '</code>' : '') + line
			);
		}

		return html;
	},

	/**
	 * Returns HTML for the table title or empty string if title is null.
	 */
	getTitleHtml: function(title)
	{
		return title ? '<caption>' + title + '</caption>' : '';
	},

	/**
	 * Finds all matches in the source code.
	 * @param {String} code		Source code to process matches in.
	 * @param {Array} matches	Discovered regex matches.
	 * @return {String} Returns formatted HTML with processed mathes.
	 */
	getMatchesHtml: function(code, matches)
	{
		var pos = 0,
			result = '',
			brushName = this.getParam('brush', '')
			;

		function getBrushNameCss(match)
		{
			var result = match ? (match.brushName || brushName) : brushName;
			return result ? result + ' ' : '';
		};

		// Finally, go through the final list of matches and pull the all
		// together adding everything in between that isn't a match.
		for (var i = 0, l = matches.length; i < l; i++)
		{
			var match = matches[i],
				matchBrushName
				;

			if (match === null || match.length === 0)
				continue;

			matchBrushName = getBrushNameCss(match);

			result += wrapLinesWithCode(code.substr(pos, match.index - pos), matchBrushName + 'plain')
					+ wrapLinesWithCode(match.value, matchBrushName + match.css)
					;

			pos = match.index + match.length + (match.offset || 0);
		}

		// don't forget to add whatever's remaining in the string
		result += wrapLinesWithCode(code.substr(pos), getBrushNameCss() + 'plain');

		return result;
	},

	/**
	 * Generates HTML markup for the whole syntax highlighter.
	 * @param {String} code Source code.
	 * @return {String} Returns HTML markup.
	 */
	getHtml: function(code)
	{
		var html = '',
			classes = [ 'syntaxhighlighter' ],
			tabSize,
			matches,
			lineNumbers
			;

		// process light mode
		if (this.getParam('light') == true)
			this.params.toolbar = this.params.gutter = false;

		className = 'syntaxhighlighter';

		if (this.getParam('collapse') == true)
			classes.push('collapsed');

		if ((gutter = this.getParam('gutter')) == false)
			classes.push('nogutter');

		// add custom user style name
		classes.push(this.getParam('class-name'));

		// add brush alias to the class name for custom CSS
		classes.push(this.getParam('brush'));

		code = trimFirstAndLastLines(code)
			.replace(/\r/g, ' ') // IE lets these buggers through
			;

		tabSize = this.getParam('tab-size');

		// replace tabs with spaces
		code = this.getParam('smart-tabs') == true
			? processSmartTabs(code, tabSize)
			: processTabs(code, tabSize)
			;

		// unindent code by the common indentation
		if (this.getParam('unindent'))
			code = unindent(code);

		if (gutter)
			lineNumbers = this.figureOutLineNumbers(code);

		// find matches in the code using brushes regex list
		matches = this.findMatches(this.regexList, code);
		// processes found matches into the html
		html = this.getMatchesHtml(code, matches);
		// finally, split all lines so that they wrap well
		html = this.getCodeLinesHtml(html, lineNumbers);

		// finally, process the links
		if (this.getParam('auto-links'))
			html = processUrls(html);

		if (typeof(navigator) != 'undefined' && navigator.userAgent && navigator.userAgent.match(/MSIE/))
			classes.push('ie');

		html =
			'<div id="' + getHighlighterId(this.id) + '" class="' + classes.join(' ') + '">'
				+ (this.getParam('toolbar') ? sh.toolbar.getHtml(this) : '')
				+ '<table border="0" cellpadding="0" cellspacing="0">'
					+ this.getTitleHtml(this.getParam('title'))
					+ '<tbody>'
						+ '<tr>'
							+ (gutter ? '<td class="gutter">' + this.getLineNumbersHtml(code) + '</td>' : '')
							+ '<td class="code">'
								+ '<div class="container">'
									+ html
								+ '</div>'
							+ '</td>'
						+ '</tr>'
					+ '</tbody>'
				+ '</table>'
			+ '</div>'
			;

		return html;
	},

	/**
	 * Highlights the code and returns complete HTML.
	 * @param {String} code     Code to highlight.
	 * @return {Element}        Returns container DIV element with all markup.
	 */
	getDiv: function(code)
	{
		if (code === null)
			code = '';

		this.code = code;

		var div = this.create('div');

		// create main HTML
		div.innerHTML = this.getHtml(code);

		// set up click handlers
		if (this.getParam('toolbar'))
			attachEvent(findElement(div, '.toolbar'), 'click', sh.toolbar.handler);

		if (this.getParam('quick-code'))
			attachEvent(findElement(div, '.code'), 'dblclick', quickCodeHandler);

		return div;
	},

	/**
	 * Initializes the highlighter/brush.
	 *
	 * Constructor isn't used for initialization so that nothing executes during necessary
	 * `new SyntaxHighlighter.Highlighter()` call when setting up brush inheritence.
	 *
	 * @param {Hash} params Highlighter parameters.
	 */
	init: function(params)
	{
		this.id = guid();

		// register this instance in the highlighters list
		storeHighlighter(this);

		// local params take precedence over defaults
		this.params = merge(sh.defaults, params || {})

		// process light mode
		if (this.getParam('light') == true)
			this.params.toolbar = this.params.gutter = false;
	},

	/**
	 * Converts space separated list of keywords into a regular expression string.
	 * @param {String} str    Space separated keywords.
	 * @return {String}       Returns regular expression string.
	 */
	getKeywords: function(str)
	{
		str = str
			.replace(/^\s+|\s+$/g, '')
			.replace(/\s+/g, '|')
			;

		return '\\b(?:' + str + ')\\b';
	},

	/**
	 * Makes a brush compatible with the `html-script` functionality.
	 * @param {Object} regexGroup Object containing `left` and `right` regular expressions.
	 */
	forHtmlScript: function(regexGroup)
	{
		var regex = { 'end' : regexGroup.right.source };

		if(regexGroup.eof)
			regex.end = "(?:(?:" + regex.end + ")|$)";

		this.htmlScript = {
			left : { regex: regexGroup.left, css: 'script' },
			right : { regex: regexGroup.right, css: 'script' },
			code : XRegExp(
				"(?<left>" + regexGroup.left.source + ")" +
				"(?<code>.*?)" +
				"(?<right>" + regex.end + ")",
				"sgi"
				)
		};
	}
}; // end of Highlighter

return sh;
}(); // end of anonymous function

// CommonJS
typeof(exports) != 'undefined' ? exports.SyntaxHighlighter = SyntaxHighlighter : null;
/**
 * SyntaxHighlighter
 * http://alexgorbatchev.com/SyntaxHighlighter
 *
 * SyntaxHighlighter is donationware. If you are using it, please donate.
 * http://alexgorbatchev.com/SyntaxHighlighter/donate.html
 *
 * @version
 * 3.0.83 (July 02 2010)
 * 
 * @copyright
 * Copyright (C) 2004-2010 Alex Gorbatchev.
 *
 * @license
 * Dual licensed under the MIT and GPL licenses.
 */
;(function()
{
	// CommonJS
	if (typeof(SyntaxHighlighter) == 'undefined' && typeof(require) != 'undefined') {
		SyntaxHighlighter = require('shCore').SyntaxHighlighter;
	}

	function Brush()
	{
		// Copyright 2006 Shin, YoungJin
	
		var datatypes =	'void float int bool vec2 vec3 vec4 bvec2 bvec3 bvec4 ivec2 ivec3 ivec4 mat2 mat3 mat4 sampler2D samplerCube ';

		var keywords =	'precision highp mediump lowp ' +
                        'in out inout ' +
                        'attribute const break continue do else for if discard return uniform varying struct void while ' +
                        'gl_Position gl_PointSize ' +
                        'gl_FragCoord gl_FrontFacing gl_FragColor gl_FragData gl_PointCoord ' +
                        'gl_DepthRange ' +
                        'gl_MaxVertexAttribs gl_MaxVertexUniformVectors gl_MaxVaryingVectors gl_MaxVertexTextureImageUnits gl_MaxCombinedTextureImageUnits gl_MaxTextureImageUnits gl_MaxFragmentUniformVectors gl_MaxDrawBuffers ';
					
		var functions =	'radians degrees sin cos tan asin acos atan ' +
                        'pow exp log exp2 log2 sqrt inversesqrt ' +
                        'abs sign floor ceil fract mod min max clamp mix step smoothstep ' +
                        'length distance dot cross normalize faceforward reflect refract ' +
                        'matrixCompMult ' +
                        'lessThan lessThanEqual greaterThan greaterThanEqual equal notEqual any all not ' +
                        'texture2D texture2DProj texture2DLod texture2DProjLod textureCube textureCubeLod ';

		this.regexList = [
			{ regex: SyntaxHighlighter.regexLib.singleLineCComments,	css: 'comments' },			// one line comments
			{ regex: SyntaxHighlighter.regexLib.multiLineCComments,		css: 'comments' },			// multiline comments
			{ regex: SyntaxHighlighter.regexLib.doubleQuotedString,		css: 'string' },			// strings
			{ regex: SyntaxHighlighter.regexLib.singleQuotedString,		css: 'string' },			// strings
			{ regex: /^ *#.*/gm,										css: 'preprocessor' },
			{ regex: new RegExp(this.getKeywords(datatypes), 'gm'),		css: 'color1 bold' },
			{ regex: new RegExp(this.getKeywords(functions), 'gm'),		css: 'functions bold' },
			{ regex: new RegExp(this.getKeywords(keywords), 'gm'),		css: 'keyword bold' }
			];
	};

	Brush.prototype	= new SyntaxHighlighter.Highlighter();
	Brush.aliases	= ['glsl', 'vs', 'fs'];

	SyntaxHighlighter.brushes.GLSL = Brush;

	// CommonJS
	typeof(exports) != 'undefined' ? exports.Brush = Brush : null;
})();
// Hack to always define a console
if (!window["console"]) {
    window.console = { log: function () { } };
}


function glinamespace(name) {
    var parts = name.split(".");
    var current = window;
    for (var n = 0; n < parts.length; n++) {
        var part = parts[n];
        current[part] = current[part] || {};
        current = current[part];
    }
    return current;
}

function glisubclass(parent, child, args) {
    parent.apply(child, args);

    // TODO: this sucks - do it right

    for (var propertyName in parent.prototype) {
        if (propertyName == "constructor") {
            continue;
        }
        if (!child.__proto__[propertyName]) {
            child.__proto__[propertyName] = parent.prototype[propertyName];
        }
    }

    for (var propertyName in parent) {
        child[propertyName] = parent[propertyName];
    }
};

function glitypename(value) {
    function stripConstructor(value) {
        if (value) {
            return value.replace("Constructor", "");
        } else {
            return value;
        }
    };
    if (value) {
        var mangled = value.constructor.toString();
        if (mangled) {
            var matches = mangled.match(/function (.+)\(/);
            if (matches) {
                // ...function Foo()...
                if (matches[1] == "Object") {
                    // Hrm that's likely not right...
                    // constructor may be fubar
                    mangled = value.toString();
                } else {
                    return stripConstructor(matches[1]);
                }
            }

            // [object Foo]
            matches = mangled.match(/\[object (.+)\]/);
            if (matches) {
                return stripConstructor(matches[1]);
            }
        }
    }
    return null;
};

function scrollIntoViewIfNeeded(el) {
    if (el.scrollIntoViewIfNeeded) {
        el.scrollIntoViewIfNeeded();
    } else if (el.offsetParent) {
        // TODO: determine if el is in the current view of the parent
        var scrollTop = el.offsetParent.scrollTop;
        var scrollBottom = el.offsetParent.scrollTop + el.offsetParent.clientHeight;
        var elTop = el.offsetTop;
        var elBottom = el.offsetTop + el.offsetHeight;
        if ((elTop < scrollTop) || (elTop > scrollBottom)) {
            el.scrollIntoView();
        }
    }
};

(function () {
    var util = glinamespace("gli.util");

    util.getWebGLContext = function (canvas, baseAttrs, attrs) {
        var finalAttrs = {
            preserveDrawingBuffer: true
        };

        // baseAttrs are all required and attrs are ORed in
        if (baseAttrs) {
            for (var k in baseAttrs) {
                finalAttrs[k] = baseAttrs[k];
            }
        }
        if (attrs) {
            for (var k in attrs) {
                if (finalAttrs[k] === undefined) {
                    finalAttrs[k] = attrs[k];
                } else {
                    finalAttrs[k] |= attrs[k];
                }
            }
        }

        var contextName = "experimental-webgl";
        var gl = null;
        try {
            if (canvas.getContextRaw) {
                gl = canvas.getContextRaw(contextName, finalAttrs);
            } else {
                gl = canvas.getContext(contextName, finalAttrs);
            }
        } catch (e) {
            // ?
            alert("Unable to get WebGL context: " + e);
        }

        if (gl) {
            gli.enableAllExtensions(gl);
            gli.hacks.installAll(gl);
        }

        return gl;
    };

    // Adjust TypedArray types to have consistent toString methods
    var typedArrayToString = function () {
        var s = "";
        var maxIndex = Math.min(64, this.length);
        for (var n = 0; n < maxIndex; n++) {
            s += this[n];
            if (n < this.length - 1) {
                s += ",";
            }
        }
        if (maxIndex < this.length) {
            s += ",... (" + (this.length) + " total)";
        }
        return s;
    };
    Int8Array.prototype.toString = typedArrayToString;
    Uint8Array.prototype.toString = typedArrayToString;
    Int16Array.prototype.toString = typedArrayToString;
    Uint16Array.prototype.toString = typedArrayToString;
    Int32Array.prototype.toString = typedArrayToString;
    Uint32Array.prototype.toString = typedArrayToString;
    Float32Array.prototype.toString = typedArrayToString;

    util.typedArrayToString = function (array) {
        if (array) {
            return typedArrayToString.apply(array);
        } else {
            return "(null)";
        }
    };

    util.isTypedArray = function (value) {
        if (value) {
            var typename = glitypename(value);
            switch (typename) {
                case "Int8Array":
                case "Uint8Array":
                case "Int16Array":
                case "Uint16Array":
                case "Int32Array":
                case "Uint32Array":
                case "Float32Array":
                    return true;
            }
            return false;
        } else {
            return false;
        }
    };

    util.arrayCompare = function (a, b) {
        if (a && b && a.length == b.length) {
            for (var n = 0; n < a.length; n++) {
                if (a[n] !== b[n]) {
                    return false;
                }
            }
            return true;
        } else {
            return false;
        }
    };

    util.isWebGLResource = function (value) {
        if (value) {
            var typename = glitypename(value);
            switch (typename) {
                case "WebGLBuffer":
                case "WebGLFramebuffer":
                case "WebGLProgram":
                case "WebGLRenderbuffer":
                case "WebGLShader":
                case "WebGLTexture":
                    return true;
            }
            return false;
        } else {
            return false;
        }
    }

    function prepareDocumentElement(el) {
        // FF requires all content be in a document before it'll accept it for playback
        if (window.navigator.product == "Gecko") {
            var frag = document.createDocumentFragment();
            frag.appendChild(el);
        }
    };

    util.clone = function (arg) {
        if (arg) {
            if ((arg.constructor == Number) || (arg.constructor == String)) {
                // Fast path for immutables
                return arg;
            } else if (arg.constructor == Array) {
                return arg.slice(); // ghetto clone
            } else if (arg instanceof ArrayBuffer) {
                // There may be a better way to do this, but I don't know it
                var target = new ArrayBuffer(arg.byteLength);
                var sourceView = new DataView(arg, 0, arg.byteLength);
                var targetView = new DataView(target, 0, arg.byteLength);
                for (var n = 0; n < arg.byteLength; n++) {
                    targetView.setUint8(n, sourceView.getUint8(n));
                }
                return target;
            } else if (util.isTypedArray(arg)) {
                //} else if (arg instanceof ArrayBufferView) {
                // HACK: at least Chromium doesn't have ArrayBufferView as a known type (for some reason)
                var target = null;
                if (arg instanceof Int8Array) {
                    target = new Int8Array(arg);
                } else if (arg instanceof Uint8Array) {
                    target = new Uint8Array(arg);
                } else if (arg instanceof Int16Array) {
                    target = new Int16Array(arg);
                } else if (arg instanceof Uint16Array) {
                    target = new Uint16Array(arg);
                } else if (arg instanceof Int32Array) {
                    target = new Int32Array(arg);
                } else if (arg instanceof Uint32Array) {
                    target = new Uint32Array(arg);
                } else if (arg instanceof Float32Array) {
                    target = new Float32Array(arg);
                } else {
                    target = arg;
                }
                return target;
            } else if (glitypename(arg) == "ImageData") {
                var dummyCanvas = document.createElement("canvas");
                var dummyContext = dummyCanvas.getContext("2d");
                var target = dummyContext.createImageData(arg);
                for (var n = 0; n < arg.data.length; n++) {
                    target.data[n] = arg.data[n];
                }
                return target;
            } else if (arg instanceof HTMLCanvasElement) {
                // TODO: better way of doing this?
                var target = arg.cloneNode(true);
                var ctx = target.getContext("2d");
                ctx.drawImage(arg, 0, 0);
                prepareDocumentElement(target);
                return target;
            } else if (arg instanceof HTMLImageElement) {
                // TODO: clone image data (src?)
                var target = arg.cloneNode(true);
                target.width = arg.width;
                target.height = arg.height;
                prepareDocumentElement(target);
                return target;
            } else if (arg instanceof HTMLVideoElement) {
                // TODO: clone video data (is this even possible? we want the exact frame at the time of upload - maybe preserve seek time?)
                var target = arg.cloneNode(true);
                prepareDocumentElement(target);
                return target;
            } else {
                return arg;
            }
        } else {
            return arg;
        }
    };

})();
(function () {
    var hacks = glinamespace("gli.hacks");

    hacks.installAll = function (gl) {
        if (gl.__hasHacksInstalled) {
            return;
        }
        gl.__hasHacksInstalled = true;
    };

})();
(function () {
    var gli = glinamespace("gli");

    function installFrameTerminatorExtension(gl) {
        var ext = {};

        ext.frameEvent = new gli.EventSource("frameEvent");

        ext.frameTerminator = function () {
            ext.frameEvent.fire();
        };

        return {
            name: "GLI_frame_terminator",
            object: ext
        };
    };

    gli.installExtensions = function (gl) {
        var extensionStrings = [];
        var extensionObjects = {};

        // Setup extensions
        var frameTerminatorExt = installFrameTerminatorExtension(gl);
        extensionStrings.push(frameTerminatorExt.name);
        extensionObjects[frameTerminatorExt.name] = frameTerminatorExt.object;

        // Patch in new extensions
        var original_getSupportedExtensions = gl.getSupportedExtensions;
        gl.getSupportedExtensions = function () {
            var supportedExtensions = original_getSupportedExtensions.apply(gl);
            for (var n = 0; n < extensionStrings.length; n++) {
                supportedExtensions.push(extensionStrings[n]);
            }
            return supportedExtensions;
        };
        var original_getExtension = gl.getExtension;
        gl.getExtension = function (name) {
            var ext = extensionObjects[name];
            if (ext) {
                return ext;
            } else {
                return original_getExtension.apply(gl, arguments);
            }
        };
    };

    gli.enableAllExtensions = function (gl) {
        if (!gl.getSupportedExtensions) {
            return;
        }

        gl.getSupportedExtensions().forEach(function (ext) {
          if (ext.substr(0, 3) !== "MOZ") gl.getExtension(ext);
        });
    };

})();
(function () {
    var gli = glinamespace("gli");

    var EventSource = function (name) {
        this.name = name;
        this.listeners = [];
    };

    EventSource.prototype.addListener = function (target, callback) {
        this.listeners.push({
            target: target,
            callback: callback
        });
    };

    EventSource.prototype.removeListener = function (target, callback) {
        for (var n = 0; n < this.listeners.length; n++) {
            var listener = this.listeners[n];
            if (listener.target === target) {
                if (callback) {
                    if (listener.callback === callback) {
                        this.listeners.splice(n, 1);
                        break;
                    }
                } else {
                    this.listeners.splice(n, 1);
                }
            }
        }
    };

    EventSource.prototype.fire = function () {
        for (var n = 0; n < this.listeners.length; n++) {
            var listener = this.listeners[n];
            //try {
                listener.callback.apply(listener.target, arguments);
            //} catch (e) {
            //    console.log("exception thrown in target of event " + this.name + ": " + e);
            //}
        }
    };

    EventSource.prototype.fireDeferred = function () {
        var self = this;
        var args = arguments;
        (gli.host.setTimeout || window.setTimeout)(function () {
            self.fire.apply(self, args);
        }, 0);
    };

    gli.EventSource = EventSource;

})();
(function () {
    var gli = glinamespace("gli");
    var info = glinamespace("gli.info");

    var UIType = {
        ENUM: 0, // a specific enum
        ARRAY: 1, // array of values (tightly packed)
        BOOL: 2,
        LONG: 3,
        ULONG: 4,
        COLORMASK: 5, // 4 bools
        OBJECT: 6, // some WebGL object (texture/program/etc)
        WH: 7, // width x height (array with 2 values)
        RECT: 8, // x, y, w, h (array with 4 values)
        STRING: 9, // some arbitrary string
        COLOR: 10, // 4 floats
        FLOAT: 11,
        BITMASK: 12, // 32bit boolean mask
        RANGE: 13, // 2 floats
        MATRIX: 14 // 2x2, 3x3, or 4x4 matrix
    };

    var UIInfo = function (type, values) {
        this.type = type;
        this.values = values;
    };

    var FunctionType = {
        GENERIC: 0,
        DRAW: 1
    };

    var FunctionInfo = function (staticgl, name, returnType, args, type) {
        this.name = name;
        this.returnType = returnType;
        this.args = args;
        this.type = type;
    };
    FunctionInfo.prototype.getArgs = function (call) {
        return this.args;
    };

    var FunctionParam = function (staticgl, name, ui) {
        this.name = name;
        this.ui = ui;
    };

    function setupFunctionInfos(gl) {
        if (info.functions) {
            return;
        }

        var texParamNames = ["TEXTURE_MAG_FILTER", "TEXTURE_MIN_FILTER", "TEXTURE_WRAP_S", "TEXTURE_WRAP_T", "TEXTURE_MAX_ANISOTROPY_EXT"];

        var functionInfos = [
            new FunctionInfo(gl, "activeTexture", null, [
                new FunctionParam(gl, "texture", new UIInfo(UIType.ENUM, ["TEXTURE0", "TEXTURE1", "TEXTURE2", "TEXTURE3", "TEXTURE4", "TEXTURE5", "TEXTURE6", "TEXTURE7", "TEXTURE8", "TEXTURE9", "TEXTURE10", "TEXTURE11", "TEXTURE12", "TEXTURE13", "TEXTURE14", "TEXTURE15", "TEXTURE16", "TEXTURE17", "TEXTURE18", "TEXTURE19", "TEXTURE20", "TEXTURE21", "TEXTURE22", "TEXTURE23", "TEXTURE24", "TEXTURE25", "TEXTURE26", "TEXTURE27", "TEXTURE28", "TEXTURE29", "TEXTURE30", "TEXTURE31"]))
            ]),
            new FunctionInfo(gl, "attachShader", null, [
                new FunctionParam(gl, "program", new UIInfo(UIType.OBJECT)),
                new FunctionParam(gl, "shader", new UIInfo(UIType.OBJECT))
            ]),
            new FunctionInfo(gl, "bindAttribLocation", null, [
                new FunctionParam(gl, "program", new UIInfo(UIType.OBJECT)),
                new FunctionParam(gl, "index", new UIInfo(UIType.LONG)),
                new FunctionParam(gl, "name", new UIInfo(UIType.STRING))
            ]),
            new FunctionInfo(gl, "bindBuffer", null, [
                new FunctionParam(gl, "target", new UIInfo(UIType.ENUM, ["ARRAY_BUFFER", "ELEMENT_ARRAY_BUFFER"])),
                new FunctionParam(gl, "buffer", new UIInfo(UIType.OBJECT))
            ]),
            new FunctionInfo(gl, "bindFramebuffer", null, [
                new FunctionParam(gl, "target", new UIInfo(UIType.ENUM, ["FRAMEBUFFER"])),
                new FunctionParam(gl, "framebuffer", new UIInfo(UIType.OBJECT))
            ]),
            new FunctionInfo(gl, "bindRenderbuffer", null, [
                new FunctionParam(gl, "target", new UIInfo(UIType.ENUM, ["RENDERBUFFER"])),
                new FunctionParam(gl, "renderbuffer", new UIInfo(UIType.OBJECT))
            ]),
            new FunctionInfo(gl, "bindTexture", null, [
                new FunctionParam(gl, "target", new UIInfo(UIType.ENUM, ["TEXTURE_2D", "TEXTURE_CUBE_MAP"])),
                new FunctionParam(gl, "texture", new UIInfo(UIType.OBJECT))
            ]),
            new FunctionInfo(gl, "blendColor", null, new UIInfo(UIType.COLOR)),
            new FunctionInfo(gl, "blendEquation", null, [
                new FunctionParam(gl, "mode", new UIInfo(UIType.ENUM, ["FUNC_ADD", "FUNC_SUBTRACT", "FUNC_REVERSE_SUBTRACT"]))
            ]),
            new FunctionInfo(gl, "blendEquationSeparate", null, [
                new FunctionParam(gl, "modeRGB", new UIInfo(UIType.ENUM, ["FUNC_ADD", "FUNC_SUBTRACT", "FUNC_REVERSE_SUBTRACT"])),
                new FunctionParam(gl, "modeAlpha", new UIInfo(UIType.ENUM, ["FUNC_ADD", "FUNC_SUBTRACT", "FUNC_REVERSE_SUBTRACT"]))
            ]),
            new FunctionInfo(gl, "blendFunc", null, [
                new FunctionParam(gl, "sfactor", new UIInfo(UIType.ENUM, ["ZERO", "ONE", "SRC_COLOR", "ONE_MINUS_SRC_COLOR", "DST_COLOR", "ONE_MINUS_DST_COLOR", "SRC_ALPHA", "ONE_MINUS_SRC_ALPHA", "DST_ALPHA", "ONE_MINUS_DST_ALPHA", "CONSTANT_COLOR", "ONE_MINUS_CONSTANT_COLOR", "CONSTANT_ALPHA", "ONE_MINUS_CONSTANT_ALPHA", "SRC_ALPHA_SATURATE"])),
                new FunctionParam(gl, "dfactor", new UIInfo(UIType.ENUM, ["ZERO", "ONE", "SRC_COLOR", "ONE_MINUS_SRC_COLOR", "DST_COLOR", "ONE_MINUS_DST_COLOR", "SRC_ALPHA", "ONE_MINUS_SRC_ALPHA", "DST_ALPHA", "ONE_MINUS_DST_ALPHA. GL_CONSTANT_COLOR", "ONE_MINUS_CONSTANT_COLOR", "CONSTANT_ALPHA", "ONE_MINUS_CONSTANT_ALPHA"]))
            ]),
            new FunctionInfo(gl, "blendFuncSeparate", null, [
                new FunctionParam(gl, "srcRGB", new UIInfo(UIType.ENUM, ["ZERO", "ONE", "SRC_COLOR", "ONE_MINUS_SRC_COLOR", "DST_COLOR", "ONE_MINUS_DST_COLOR", "SRC_ALPHA", "ONE_MINUS_SRC_ALPHA", "DST_ALPHA", "ONE_MINUS_DST_ALPHA", "CONSTANT_COLOR", "ONE_MINUS_CONSTANT_COLOR", "CONSTANT_ALPHA", "ONE_MINUS_CONSTANT_ALPHA", "SRC_ALPHA_SATURATE"])),
                new FunctionParam(gl, "dstRGB", new UIInfo(UIType.ENUM, ["ZERO", "ONE", "SRC_COLOR", "ONE_MINUS_SRC_COLOR", "DST_COLOR", "ONE_MINUS_DST_COLOR", "SRC_ALPHA", "ONE_MINUS_SRC_ALPHA", "DST_ALPHA", "ONE_MINUS_DST_ALPHA. GL_CONSTANT_COLOR", "ONE_MINUS_CONSTANT_COLOR", "CONSTANT_ALPHA", "ONE_MINUS_CONSTANT_ALPHA"])),
                new FunctionParam(gl, "srcAlpha", new UIInfo(UIType.ENUM, ["ZERO", "ONE", "SRC_COLOR", "ONE_MINUS_SRC_COLOR", "DST_COLOR", "ONE_MINUS_DST_COLOR", "SRC_ALPHA", "ONE_MINUS_SRC_ALPHA", "DST_ALPHA", "ONE_MINUS_DST_ALPHA", "CONSTANT_COLOR", "ONE_MINUS_CONSTANT_COLOR", "CONSTANT_ALPHA", "ONE_MINUS_CONSTANT_ALPHA", "SRC_ALPHA_SATURATE"])),
                new FunctionParam(gl, "dstAlpha", new UIInfo(UIType.ENUM, ["ZERO", "ONE", "SRC_COLOR", "ONE_MINUS_SRC_COLOR", "DST_COLOR", "ONE_MINUS_DST_COLOR", "SRC_ALPHA", "ONE_MINUS_SRC_ALPHA", "DST_ALPHA", "ONE_MINUS_DST_ALPHA. GL_CONSTANT_COLOR", "ONE_MINUS_CONSTANT_COLOR", "CONSTANT_ALPHA", "ONE_MINUS_CONSTANT_ALPHA"]))
            ]),
            new FunctionInfo(gl, "bufferData", null, [
                new FunctionParam(gl, "target", new UIInfo(UIType.ENUM, ["ARRAY_BUFFER", "ELEMENT_ARRAY_BUFFER"])),
                new FunctionParam(gl, "sizeOrData", new UIInfo(UIType.OBJECT)),
                new FunctionParam(gl, "usage", new UIInfo(UIType.ENUM, ["STREAM_DRAW", "STATIC_DRAW", "DYNAMIC_DRAW"]))
            ]),
            new FunctionInfo(gl, "bufferSubData", null, [
                new FunctionParam(gl, "target", new UIInfo(UIType.ENUM, ["ARRAY_BUFFER", "ELEMENT_ARRAY_BUFFER"])),
                new FunctionParam(gl, "offset", new UIInfo(UIType.ULONG)),
                new FunctionParam(gl, "data", new UIInfo(UIType.OBJECT))
            ]),
            new FunctionInfo(gl, "checkFramebufferStatus", null, [
                new FunctionParam(gl, "target", new UIInfo(UIType.ENUM, ["FRAMEBUFFER"]))
            ]),
            new FunctionInfo(gl, "clear", null, [
                new FunctionParam(gl, "mask", new UIInfo(UIType.BITMASK, ["COLOR_BUFFER_BIT", "DEPTH_BUFFER_BIT", "STENCIL_BUFFER_BIT"]))
            ]),
            new FunctionInfo(gl, "clearColor", null, new UIInfo(UIType.COLOR)),
            new FunctionInfo(gl, "clearDepth", null, [
                new FunctionParam(gl, "depth", new UIInfo(UIType.FLOAT))
            ]),
            new FunctionInfo(gl, "clearStencil", null, [
                new FunctionParam(gl, "s", new UIInfo(UIType.LONG))
            ]),
            new FunctionInfo(gl, "colorMask", null, new UIInfo(UIType.COLORMASK)),
            new FunctionInfo(gl, "compileShader", null, [
                new FunctionParam(gl, "shader", new UIInfo(UIType.OBJECT))
            ]),
            new FunctionInfo(gl, "copyTexImage2D", null, [
                new FunctionParam(gl, "target", new UIInfo(UIType.ENUM, ["TEXTURE_2D", "TEXTURE_CUBE_MAP_POSITIVE_X", "TEXTURE_CUBE_MAP_NEGATIVE_X", "TEXTURE_CUBE_MAP_POSITIVE_Y", "TEXTURE_CUBE_MAP_NEGATIVE_Y", "TEXTURE_CUBE_MAP_POSITIVE_Z", "TEXTURE_CUBE_MAP_NEGATIVE_Z"])),
                new FunctionParam(gl, "level", new UIInfo(UIType.LONG)),
                new FunctionParam(gl, "internalformat", new UIInfo(UIType.ENUM, ["ALPHA", "LUMINANCE", "LUMINANCE_ALPHA", "RGB", "RGBA"])),
                new FunctionParam(gl, "x", new UIInfo(UIType.LONG)),
                new FunctionParam(gl, "y", new UIInfo(UIType.LONG)),
                new FunctionParam(gl, "width", new UIInfo(UIType.LONG)),
                new FunctionParam(gl, "height", new UIInfo(UIType.LONG)),
                new FunctionParam(gl, "border", new UIInfo(UIType.LONG))
            ]),
            new FunctionInfo(gl, "copyTexSubImage2D", null, [
                new FunctionParam(gl, "target", new UIInfo(UIType.ENUM, ["TEXTURE_2D", "TEXTURE_CUBE_MAP_POSITIVE_X", "TEXTURE_CUBE_MAP_NEGATIVE_X", "TEXTURE_CUBE_MAP_POSITIVE_Y", "TEXTURE_CUBE_MAP_NEGATIVE_Y", "TEXTURE_CUBE_MAP_POSITIVE_Z", "TEXTURE_CUBE_MAP_NEGATIVE_Z"])),
                new FunctionParam(gl, "level", new UIInfo(UIType.LONG)),
                new FunctionParam(gl, "xoffset", new UIInfo(UIType.LONG)),
                new FunctionParam(gl, "yoffset", new UIInfo(UIType.LONG)),
                new FunctionParam(gl, "x", new UIInfo(UIType.LONG)),
                new FunctionParam(gl, "y", new UIInfo(UIType.LONG)),
                new FunctionParam(gl, "width", new UIInfo(UIType.LONG)),
                new FunctionParam(gl, "height", new UIInfo(UIType.LONG))
            ]),
            new FunctionInfo(gl, "createBuffer", null, [
            ]),
            new FunctionInfo(gl, "createFramebuffer", null, [
            ]),
            new FunctionInfo(gl, "createProgram", null, [
            ]),
            new FunctionInfo(gl, "createRenderbuffer", null, [
            ]),
            new FunctionInfo(gl, "createShader", null, [
                new FunctionParam(gl, "type", new UIInfo(UIType.ENUM, ["VERTEX_SHADER", "FRAGMENT_SHADER"]))
            ]),
            new FunctionInfo(gl, "createTexture", null, [
            ]),
            new FunctionInfo(gl, "cullFace", null, [
                new FunctionParam(gl, "mode", new UIInfo(UIType.ENUM, ["FRONT", "BACK", "FRONT_AND_BACK"]))
            ]),
            new FunctionInfo(gl, "deleteBuffer", null, [
                new FunctionParam(gl, "buffer", new UIInfo(UIType.OBJECT))
            ]),
            new FunctionInfo(gl, "deleteFramebuffer", null, [
                new FunctionParam(gl, "framebuffer", new UIInfo(UIType.OBJECT))
            ]),
            new FunctionInfo(gl, "deleteProgram", null, [
                new FunctionParam(gl, "program", new UIInfo(UIType.OBJECT))
            ]),
            new FunctionInfo(gl, "deleteRenderbuffer", null, [
                new FunctionParam(gl, "renderbuffer", new UIInfo(UIType.OBJECT))
            ]),
            new FunctionInfo(gl, "deleteShader", null, [
                new FunctionParam(gl, "shader", new UIInfo(UIType.OBJECT))
            ]),
            new FunctionInfo(gl, "deleteTexture", null, [
                new FunctionParam(gl, "texture", new UIInfo(UIType.OBJECT))
            ]),
            new FunctionInfo(gl, "depthFunc", null, [
                new FunctionParam(gl, "func", new UIInfo(UIType.ENUM, ["NEVER", "LESS", "LEQUAL", "GREATER", "GEQUAL", "EQUAL", "NOTEQUAL", "ALWAYS"]))
            ]),
            new FunctionInfo(gl, "depthMask", null, [
                new FunctionParam(gl, "flag", new UIInfo(UIType.BOOL))
            ]),
            new FunctionInfo(gl, "depthRange", null, [
                new FunctionParam(gl, "zNear", new UIInfo(UIType.FLOAT)),
                new FunctionParam(gl, "zFar", new UIInfo(UIType.FLOAT))
            ]),
            new FunctionInfo(gl, "detachShader", null, [
                new FunctionParam(gl, "program", new UIInfo(UIType.OBJECT)),
                new FunctionParam(gl, "shader", new UIInfo(UIType.OBJECT))
            ]),
            new FunctionInfo(gl, "disable", null, [
                new FunctionParam(gl, "cap", new UIInfo(UIType.ENUM, ["BLEND", "CULL_FACE", "DEPTH_TEST", "DITHER", "POLYGON_OFFSET_FILL", "SAMPLE_ALPHA_TO_COVERAGE", "SAMPLE_COVERAGE", "SCISSOR_TEST", "STENCIL_TEST"]))
            ]),
            new FunctionInfo(gl, "disableVertexAttribArray", null, [
                new FunctionParam(gl, "index", new UIInfo(UIType.LONG))
            ]),
            new FunctionInfo(gl, "drawArrays", null, [
                new FunctionParam(gl, "mode", new UIInfo(UIType.ENUM, ["POINTS", "LINE_STRIP", "LINE_LOOP", "LINES", "TRIANGLES", "TRIANGLE_STRIP", "TRIANGLE_FAN"])),
                new FunctionParam(gl, "first", new UIInfo(UIType.LONG)),
                new FunctionParam(gl, "count", new UIInfo(UIType.LONG))
            ], FunctionType.DRAW),
            new FunctionInfo(gl, "drawElements", null, [
                new FunctionParam(gl, "mode", new UIInfo(UIType.ENUM, ["POINTS", "LINE_STRIP", "LINE_LOOP", "LINES", "TRIANGLES", "TRIANGLE_STRIP", "TRIANGLE_FAN"])),
                new FunctionParam(gl, "count", new UIInfo(UIType.LONG)),
                new FunctionParam(gl, "type", new UIInfo(UIType.ENUM, ["UNSIGNED_BYTE", "UNSIGNED_SHORT", "UNSIGNED_INT"])),
                new FunctionParam(gl, "offset", new UIInfo(UIType.LONG))
            ], FunctionType.DRAW),
            new FunctionInfo(gl, "enable", null, [
                new FunctionParam(gl, "cap", new UIInfo(UIType.ENUM, ["BLEND", "CULL_FACE", "DEPTH_TEST", "DITHER", "POLYGON_OFFSET_FILL", "SAMPLE_ALPHA_TO_COVERAGE", "SAMPLE_COVERAGE", "SCISSOR_TEST", "STENCIL_TEST"]))
            ]),
            new FunctionInfo(gl, "enableVertexAttribArray", null, [
                new FunctionParam(gl, "index", new UIInfo(UIType.LONG))
            ]),
            new FunctionInfo(gl, "finish", null, [
            ]),
            new FunctionInfo(gl, "flush", null, [
            ]),
            new FunctionInfo(gl, "framebufferRenderbuffer", null, [
                new FunctionParam(gl, "target", new UIInfo(UIType.ENUM, ["FRAMEBUFFER"])),
                new FunctionParam(gl, "attachment", new UIInfo(UIType.ENUM, ["COLOR_ATTACHMENT0", "DEPTH_ATTACHMENT", "STENCIL_ATTACHMENT"])),
                new FunctionParam(gl, "renderbuffertarget", new UIInfo(UIType.ENUM, ["RENDERBUFFER"])),
                new FunctionParam(gl, "renderbuffer", new UIInfo(UIType.OBJECT))
            ]),
            new FunctionInfo(gl, "framebufferTexture2D", null, [
                new FunctionParam(gl, "target", new UIInfo(UIType.ENUM, ["FRAMEBUFFER", "DEPTH_ATTACHMENT"])),
                new FunctionParam(gl, "attachment", new UIInfo(UIType.ENUM, ["COLOR_ATTACHMENT0", "DEPTH_ATTACHMENT", "STENCIL_ATTACHMENT"])),
                new FunctionParam(gl, "textarget", new UIInfo(UIType.ENUM, ["TEXTURE_2D", "TEXTURE_CUBE_MAP_POSITIVE_X", "TEXTURE_CUBE_MAP_NEGATIVE_X", "TEXTURE_CUBE_MAP_POSITIVE_Y", "TEXTURE_CUBE_MAP_NEGATIVE_Y", "TEXTURE_CUBE_MAP_POSITIVE_Z", "TEXTURE_CUBE_MAP_NEGATIVE_Z"])),
                new FunctionParam(gl, "texture", new UIInfo(UIType.OBJECT)),
                new FunctionParam(gl, "level", new UIInfo(UIType.LONG))
            ]),
            new FunctionInfo(gl, "frontFace", null, [
                new FunctionParam(gl, "mode", new UIInfo(UIType.ENUM, ["CW", "CCW"]))
            ]),
            new FunctionInfo(gl, "generateMipmap", null, [
                new FunctionParam(gl, "target", new UIInfo(UIType.ENUM, ["TEXTURE_2D", "TEXTURE_CUBE_MAP"]))
            ]),
            new FunctionInfo(gl, "getActiveAttrib", null, [
                new FunctionParam(gl, "program", new UIInfo(UIType.OBJECT)),
                new FunctionParam(gl, "index", new UIInfo(UIType.LONG))
            ]),
            new FunctionInfo(gl, "getActiveUniform", null, [
                new FunctionParam(gl, "program", new UIInfo(UIType.OBJECT)),
                new FunctionParam(gl, "index", new UIInfo(UIType.LONG))
            ]),
            new FunctionInfo(gl, "getAttachedShaders", null, [
                new FunctionParam(gl, "program", new UIInfo(UIType.OBJECT))
            ]),
            new FunctionInfo(gl, "getAttribLocation", null, [
                new FunctionParam(gl, "program", new UIInfo(UIType.OBJECT)),
                new FunctionParam(gl, "name", new UIInfo(UIType.STRING))
            ]),
            new FunctionInfo(gl, "getParameter", null, [
                new FunctionParam(gl, "pname", new UIInfo(UIType.ENUM, ["ACTIVE_TEXTURE", "ALIASED_LINE_WIDTH_RANGE", "ALIASED_POINT_SIZE_RANGE", "ALPHA_BITS", "ARRAY_BUFFER_BINDING", "BLEND", "BLEND_COLOR", "BLEND_DST_ALPHA", "BLEND_DST_RGB", "BLEND_EQUATION_ALPHA", "BLEND_EQUATION_RGB", "BLEND_SRC_ALPHA", "BLEND_SRC_RGB", "BLUE_BITS", "COLOR_CLEAR_VALUE", "COLOR_WRITEMASK", "COMPRESSED_TEXTURE_FORMATS", "CULL_FACE", "CULL_FACE_MODE", "CURRENT_PROGRAM", "DEPTH_BITS", "DEPTH_CLEAR_VALUE", "DEPTH_FUNC", "DEPTH_RANGE", "DEPTH_TEST", "DEPTH_WRITEMASK", "DITHER", "ELEMENT_ARRAY_BUFFER_BINDING", "FRAGMENT_SHADER_DERIVATIVE_HINT_OES", "FRAMEBUFFER_BINDING", "FRONT_FACE", "GENERATE_MIPMAP_HINT", "GREEN_BITS", "IMPLEMENTATION_COLOR_READ_FORMAT", "IMPLEMENTATION_COLOR_READ_TYPE", "LINE_WIDTH", "MAX_COMBINED_TEXTURE_IMAGE_UNITS", "MAX_CUBE_MAP_TEXTURE_SIZE", "MAX_FRAGMENT_UNIFORM_VECTORS", "MAX_RENDERBUFFER_SIZE", "MAX_TEXTURE_IMAGE_UNITS", "MAX_TEXTURE_SIZE", "MAX_VARYING_VECTORS", "MAX_VERTEX_ATTRIBS", "MAX_VERTEX_TEXTURE_IMAGE_UNITS", "MAX_VERTEX_UNIFORM_VECTORS", "MAX_VIEWPORT_DIMS", "NUM_COMPRESSED_TEXTURE_FORMATS", "PACK_ALIGNMENT", "POLYGON_OFFSET_FACTOR", "POLYGON_OFFSET_FILL", "POLYGON_OFFSET_UNITS", "RED_BITS", "RENDERBUFFER_BINDING", "RENDERER", "SAMPLE_BUFFERS", "SAMPLE_COVERAGE_INVERT", "SAMPLE_COVERAGE_VALUE", "SAMPLES", "SCISSOR_BOX", "SCISSOR_TEST", "SHADING_LANGUAGE_VERSION", "STENCIL_BACK_FAIL", "STENCIL_BACK_FUNC", "STENCIL_BACK_PASS_DEPTH_FAIL", "STENCIL_BACK_PASS_DEPTH_PASS", "STENCIL_BACK_REF", "STENCIL_BACK_VALUE_MASK", "STENCIL_BACK_WRITEMASK", "STENCIL_BITS", "STENCIL_CLEAR_VALUE", "STENCIL_FAIL", "STENCIL_FUNC", "STENCIL_PASS_DEPTH_FAIL", "STENCIL_PASS_DEPTH_PASS", "STENCIL_REF", "STENCIL_TEST", "STENCIL_VALUE_MASK", "STENCIL_WRITEMASK", "SUBPIXEL_BITS", "TEXTURE_BINDING_2D", "TEXTURE_BINDING_CUBE_MAP", "UNPACK_ALIGNMENT", "UNPACK_COLORSPACE_CONVERSION_WEBGL", "UNPACK_FLIP_Y_WEBGL", "UNPACK_PREMULTIPLY_ALPHA_WEBGL", "VENDOR", "VERSION", "VIEWPORT", "MAX_TEXTURE_MAX_ANISOTROPY_EXT"]))
            ]),
            new FunctionInfo(gl, "getBufferParameter", null, [
                new FunctionParam(gl, "target", new UIInfo(UIType.ENUM, ["ARRAY_BUFFER", "ELEMENT_ARRAY_BUFFER"])),
                new FunctionParam(gl, "pname", new UIInfo(UIType.ENUM, ["BUFFER_SIZE", "BUFFER_USAGE"]))
            ]),
            new FunctionInfo(gl, "getError", null, [
            ]),
            new FunctionInfo(gl, "getSupportedExtensions", null, [
            ]),
            new FunctionInfo(gl, "getExtension", null, [
                new FunctionParam(gl, "name", new UIInfo(UIType.STRING))
            ]),
            new FunctionInfo(gl, "getFramebufferAttachmentParameter", null, [
                new FunctionParam(gl, "target", new UIInfo(UIType.ENUM, ["FRAMEBUFFER"])),
                new FunctionParam(gl, "attachment", new UIInfo(UIType.ENUM, ["COLOR_ATTACHMENT0", "DEPTH_ATTACHMENT", "STENCIL_ATTACHMENT"])),
                new FunctionParam(gl, "pname", new UIInfo(UIType.ENUM, ["FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE", "FRAMEBUFFER_ATTACHMENT_OBJECT_NAME", "FRAMEBUFFER_ATTACHMENT_TEXTURE_LEVEL", "FRAMEBUFFER_ATTACHMENT_TEXTURE_CUBE_MAP_FACE"]))
            ]),
            new FunctionInfo(gl, "getProgramParameter", null, [
                new FunctionParam(gl, "program", new UIInfo(UIType.OBJECT)),
                new FunctionParam(gl, "pname", new UIInfo(UIType.ENUM, ["DELETE_STATUS", "LINK_STATUS", "VALIDATE_STATUS", "INFO_LOG_LENGTH", "ATTACHED_SHADERS", "ACTIVE_ATTRIBUTES", "ACTIVE_ATTRIBUTE_MAX_LENGTH", "ACTIVE_UNIFORMS", "ACTIVE_UNIFORM_MAX_LENGTH"]))
            ]),
            new FunctionInfo(gl, "getProgramInfoLog", null, [
                new FunctionParam(gl, "program", new UIInfo(UIType.OBJECT))
            ]),
            new FunctionInfo(gl, "getRenderbufferParameter", null, [
                new FunctionParam(gl, "target", new UIInfo(UIType.ENUM, ["RENDERBUFFER"])),
                new FunctionParam(gl, "pname", new UIInfo(UIType.ENUM, ["RENDERBUFFER_WIDTH", "RENDERBUFFER_HEIGHT", "RENDERBUFFER_INTERNAL_FORMAT", "RENDERBUFFER_RED_SIZE", "RENDERBUFFER_GREEN_SIZE", "RENDERBUFFER_BLUE_SIZE", "RENDERBUFFER_ALPHA_SIZE", "RENDERBUFFER_DEPTH_SIZE", "RENDERBUFFER_STENCIL_SIZE"]))
            ]),
            new FunctionInfo(gl, "getShaderParameter", null, [
                new FunctionParam(gl, "shader", new UIInfo(UIType.OBJECT)),
                new FunctionParam(gl, "pname", new UIInfo(UIType.ENUM, ["SHADER_TYPE", "DELETE_STATUS", "COMPILE_STATUS", "INFO_LOG_LENGTH", "SHADER_SOURCE_LENGTH"]))
            ]),
            new FunctionInfo(gl, "getShaderInfoLog", null, [
                new FunctionParam(gl, "shader", new UIInfo(UIType.OBJECT))
            ]),
            new FunctionInfo(gl, "getShaderSource", null, [
                new FunctionParam(gl, "shader", new UIInfo(UIType.OBJECT))
            ]),
            new FunctionInfo(gl, "getTexParameter", null, [
                new FunctionParam(gl, "target", new UIInfo(UIType.ENUM, ["TEXTURE_2D", "TEXTURE_CUBE_MAP"])),
                new FunctionParam(gl, "pname", new UIInfo(UIType.ENUM, ["TEXTURE_MAG_FILTER", "TEXTURE_MIN_FILTER", "TEXTURE_WRAP_S", "TEXTURE_WRAP_T", "TEXTURE_MAX_ANISOTROPY_EXT"]))
            ]),
            new FunctionInfo(gl, "getUniform", null, [
                new FunctionParam(gl, "program", new UIInfo(UIType.OBJECT)),
                new FunctionParam(gl, "location", new UIInfo(UIType.OBJECT)) // TODO: find a way to treat this as an integer? browsers don't like this...
            ]),
            new FunctionInfo(gl, "getUniformLocation", null, [
                new FunctionParam(gl, "program", new UIInfo(UIType.OBJECT)),
                new FunctionParam(gl, "name", new UIInfo(UIType.STRING))
            ]),
            new FunctionInfo(gl, "getVertexAttrib", null, [
                new FunctionParam(gl, "index", new UIInfo(UIType.LONG)),
                new FunctionParam(gl, "pname", new UIInfo(UIType.ENUM, ["VERTEX_ATTRIB_ARRAY_BUFFER_BINDING", "VERTEX_ATTRIB_ARRAY_ENABLED", "VERTEX_ATTRIB_ARRAY_SIZE", "VERTEX_ATTRIB_ARRAY_STRIDE", "VERTEX_ATTRIB_ARRAY_TYPE", "VERTEX_ATTRIB_ARRAY_NORMALIZED", "CURRENT_VERTEX_ATTRIB"]))
            ]),
            new FunctionInfo(gl, "getVertexAttribOffset", null, [
                new FunctionParam(gl, "index", new UIInfo(UIType.LONG)),
                new FunctionParam(gl, "pname", new UIInfo(UIType.ENUM, ["VERTEX_ATTRIB_ARRAY_POINTER"]))
            ]),
            new FunctionInfo(gl, "hint", null, [
                new FunctionParam(gl, "target", new UIInfo(UIType.ENUM, ["GENERATE_MIPMAP_HINT", "FRAGMENT_SHADER_DERIVATIVE_HINT_OES"])),
                new FunctionParam(gl, "mode", new UIInfo(UIType.ENUM, ["FASTEST", "NICEST", "DONT_CARE"]))
            ]),
            new FunctionInfo(gl, "isBuffer", null, [
                new FunctionParam(gl, "buffer", new UIInfo(UIType.OBJECT))
            ]),
            new FunctionInfo(gl, "isEnabled", null, [
                new FunctionParam(gl, "cap", new UIInfo(UIType.ENUM, ["BLEND", "CULL_FACE", "DEPTH_TEST", "DITHER", "POLYGON_OFFSET_FILL", "SAMPLE_ALPHA_TO_COVERAGE", "SAMPLE_COVERAGE", "SCISSOR_TEST", "STENCIL_TEST"]))
            ]),
            new FunctionInfo(gl, "isFramebuffer", null, [
                new FunctionParam(gl, "framebuffer", new UIInfo(UIType.OBJECT))
            ]),
            new FunctionInfo(gl, "isProgram", null, [
                new FunctionParam(gl, "program", new UIInfo(UIType.OBJECT))
            ]),
            new FunctionInfo(gl, "isRenderbuffer", null, [
                new FunctionParam(gl, "renderbuffer", new UIInfo(UIType.OBJECT))
            ]),
            new FunctionInfo(gl, "isShader", null, [
                new FunctionParam(gl, "shader", new UIInfo(UIType.OBJECT))
            ]),
            new FunctionInfo(gl, "isTexture", null, [
                new FunctionParam(gl, "texture", new UIInfo(UIType.OBJECT))
            ]),
            new FunctionInfo(gl, "lineWidth", null, [
                new FunctionParam(gl, "width", new UIInfo(UIType.FLOAT))
            ]),
            new FunctionInfo(gl, "linkProgram", null, [
                new FunctionParam(gl, "program", new UIInfo(UIType.OBJECT))
            ]),
            new FunctionInfo(gl, "pixelStorei", null, [
                new FunctionParam(gl, "pname", new UIInfo(UIType.ENUM, ["PACK_ALIGNMENT", "UNPACK_ALIGNMENT", "UNPACK_COLORSPACE_CONVERSION_WEBGL", "UNPACK_FLIP_Y_WEBGL", "UNPACK_PREMULTIPLY_ALPHA_WEBGL"])),
                new FunctionParam(gl, "param", new UIInfo(UIType.LONG))
            ]),
            new FunctionInfo(gl, "polygonOffset", null, [
                new FunctionParam(gl, "factor", new UIInfo(UIType.FLOAT)),
                new FunctionParam(gl, "units", new UIInfo(UIType.FLOAT))
            ]),
            new FunctionInfo(gl, "readPixels", null, [
                new FunctionParam(gl, "x", new UIInfo(UIType.LONG)),
                new FunctionParam(gl, "y", new UIInfo(UIType.LONG)),
                new FunctionParam(gl, "width", new UIInfo(UIType.LONG)),
                new FunctionParam(gl, "height", new UIInfo(UIType.LONG)),
                new FunctionParam(gl, "format", new UIInfo(UIType.ENUM, ["ALPHA", "RGB", "RGBA"])),
                new FunctionParam(gl, "type", new UIInfo(UIType.ENUM, ["UNSIGNED_BYTE", "UNSIGNED_SHORT_5_6_5", "UNSIGNED_SHORT_4_4_4_4", "UNSIGNED_SHORT_5_5_5_1"])),
                new FunctionParam(gl, "pixels", new UIInfo(UIType.OBJECT))
            ]),
            new FunctionInfo(gl, "renderbufferStorage", null, [
                new FunctionParam(gl, "target", new UIInfo(UIType.ENUM, ["RENDERBUFFER"])),
                new FunctionParam(gl, "internalformat", new UIInfo(UIType.ENUM, ["RGBA4", "RGB565", "RGB5_A1", "DEPTH_COMPONENT16", "STENCIL_INDEX8"])),
                new FunctionParam(gl, "width", new UIInfo(UIType.LONG)),
                new FunctionParam(gl, "height", new UIInfo(UIType.LONG))
            ]),
            new FunctionInfo(gl, "sampleCoverage", null, [
                new FunctionParam(gl, "value", new UIInfo(UIType.FLOAT)),
                new FunctionParam(gl, "invert", new UIInfo(UIType.BOOL))
            ]),
            new FunctionInfo(gl, "scissor", null, [
                new FunctionParam(gl, "x", new UIInfo(UIType.LONG)),
                new FunctionParam(gl, "y", new UIInfo(UIType.LONG)),
                new FunctionParam(gl, "width", new UIInfo(UIType.LONG)),
                new FunctionParam(gl, "height", new UIInfo(UIType.LONG))
            ]),
            new FunctionInfo(gl, "shaderSource", null, [
                new FunctionParam(gl, "shader", new UIInfo(UIType.OBJECT)),
                new FunctionParam(gl, "source", new UIInfo(UIType.STRING))
            ]),
            new FunctionInfo(gl, "stencilFunc", null, [
                new FunctionParam(gl, "func", new UIInfo(UIType.ENUM, ["NEVER", "LESS", "LEQUAL", "GREATER", "GEQUAL", "EQUAL", "NOTEQUAL", "ALWAYS"])),
                new FunctionParam(gl, "ref", new UIInfo(UIType.LONG)),
                new FunctionParam(gl, "mask", new UIInfo(UIType.BITMASK))
            ]),
            new FunctionInfo(gl, "stencilFuncSeparate", null, [
                new FunctionParam(gl, "face", new UIInfo(UIType.ENUM, ["FRONT", "BACK", "FRONT_AND_BACK"])),
                new FunctionParam(gl, "func", new UIInfo(UIType.ENUM, ["NEVER", "LESS", "LEQUAL", "GREATER", "GEQUAL", "EQUAL", "NOTEQUAL", "ALWAYS"])),
                new FunctionParam(gl, "ref", new UIInfo(UIType.LONG)),
                new FunctionParam(gl, "mask", new UIInfo(UIType.BITMASK))
            ]),
            new FunctionInfo(gl, "stencilMask", null, [
                new FunctionParam(gl, "mask", new UIInfo(UIType.BITMASK))
            ]),
            new FunctionInfo(gl, "stencilMaskSeparate", null, [
                new FunctionParam(gl, "face", new UIInfo(UIType.ENUM, ["FRONT", "BACK", "FRONT_AND_BACK"])),
                new FunctionParam(gl, "mask", new UIInfo(UIType.BITMASK))
            ]),
            new FunctionInfo(gl, "stencilOp", null, [
                new FunctionParam(gl, "fail", new UIInfo(UIType.ENUM, ["KEEP", "ZERO", "REPLACE", "INCR", "INCR_WRAP", "DECR", "DECR_WRAP", "INVERT"])),
                new FunctionParam(gl, "zfail", new UIInfo(UIType.ENUM, ["KEEP", "ZERO", "REPLACE", "INCR", "INCR_WRAP", "DECR", "DECR_WRAP", "INVERT"])),
                new FunctionParam(gl, "zpass", new UIInfo(UIType.ENUM, ["KEEP", "ZERO", "REPLACE", "INCR", "INCR_WRAP", "DECR", "DECR_WRAP", "INVERT"]))
            ]),
            new FunctionInfo(gl, "stencilOpSeparate", null, [
                new FunctionParam(gl, "face", new UIInfo(UIType.ENUM, ["FRONT", "BACK", "FRONT_AND_BACK"])),
                new FunctionParam(gl, "fail", new UIInfo(UIType.ENUM, ["KEEP", "ZERO", "REPLACE", "INCR", "INCR_WRAP", "DECR", "DECR_WRAP", "INVERT"])),
                new FunctionParam(gl, "zfail", new UIInfo(UIType.ENUM, ["KEEP", "ZERO", "REPLACE", "INCR", "INCR_WRAP", "DECR", "DECR_WRAP", "INVERT"])),
                new FunctionParam(gl, "zpass", new UIInfo(UIType.ENUM, ["KEEP", "ZERO", "REPLACE", "INCR", "INCR_WRAP", "DECR", "DECR_WRAP", "INVERT"]))
            ]),
            new FunctionInfo(gl, "texImage2D", null, null), // handled specially below
            new FunctionInfo(gl, "texParameterf", null, [
                new FunctionParam(gl, "target", new UIInfo(UIType.ENUM, ["TEXTURE_2D", "TEXTURE_CUBE_MAP"])),
                new FunctionParam(gl, "pname", new UIInfo(UIType.ENUM, texParamNames)),
                new FunctionParam(gl, "param", new UIInfo(UIType.FLOAT))
            ]),
            new FunctionInfo(gl, "texParameteri", null, [
                new FunctionParam(gl, "target", new UIInfo(UIType.ENUM, ["TEXTURE_2D", "TEXTURE_CUBE_MAP"])),
                new FunctionParam(gl, "pname", new UIInfo(UIType.ENUM, texParamNames)),
                new FunctionParam(gl, "param", new UIInfo(UIType.ENUM, ["NEAREST", "LINEAR", "NEAREST_MIPMAP_NEAREST", "LINEAR_MIPMAP_NEAREST", "NEAREST_MIPMAP_LINEAR", "LINEAR_MIPMAP_LINEAR", "CLAMP_TO_EDGE", "MIRRORED_REPEAT", "REPEAT"]))
            ]),
            new FunctionInfo(gl, "texSubImage2D", null, null), // handled specially below
            new FunctionInfo(gl, "compressedTexImage2D", null, null), // handled specially below
            new FunctionInfo(gl, "compressedTexSubImage2D", null, null), // handled specially below
            new FunctionInfo(gl, "uniform1f", null, [
                new FunctionParam(gl, "location", new UIInfo(UIType.OBJECT)),
                new FunctionParam(gl, "x", new UIInfo(UIType.FLOAT))
            ]),
            new FunctionInfo(gl, "uniform1fv", null, [
                new FunctionParam(gl, "location", new UIInfo(UIType.OBJECT)),
                new FunctionParam(gl, "v", new UIInfo(UIType.ARRAY))
            ]),
            new FunctionInfo(gl, "uniform1i", null, [
                new FunctionParam(gl, "location", new UIInfo(UIType.OBJECT)),
                new FunctionParam(gl, "x", new UIInfo(UIType.LONG))
            ]),
            new FunctionInfo(gl, "uniform1iv", null, [
                new FunctionParam(gl, "location", new UIInfo(UIType.OBJECT)),
                new FunctionParam(gl, "v", new UIInfo(UIType.ARRAY))
            ]),
            new FunctionInfo(gl, "uniform2f", null, [
                new FunctionParam(gl, "location", new UIInfo(UIType.OBJECT)),
                new FunctionParam(gl, "x", new UIInfo(UIType.FLOAT)),
                new FunctionParam(gl, "y", new UIInfo(UIType.FLOAT))
            ]),
            new FunctionInfo(gl, "uniform2fv", null, [
                new FunctionParam(gl, "location", new UIInfo(UIType.OBJECT)),
                new FunctionParam(gl, "v", new UIInfo(UIType.ARRAY))
            ]),
            new FunctionInfo(gl, "uniform2i", null, [
                new FunctionParam(gl, "location", new UIInfo(UIType.OBJECT)),
                new FunctionParam(gl, "x", new UIInfo(UIType.LONG)),
                new FunctionParam(gl, "y", new UIInfo(UIType.LONG))
            ]),
            new FunctionInfo(gl, "uniform2iv", null, [
                new FunctionParam(gl, "location", new UIInfo(UIType.OBJECT)),
                new FunctionParam(gl, "v", new UIInfo(UIType.ARRAY))
            ]),
            new FunctionInfo(gl, "uniform3f", null, [
                new FunctionParam(gl, "location", new UIInfo(UIType.OBJECT)),
                new FunctionParam(gl, "x", new UIInfo(UIType.FLOAT)),
                new FunctionParam(gl, "y", new UIInfo(UIType.FLOAT)),
                new FunctionParam(gl, "z", new UIInfo(UIType.FLOAT))
            ]),
            new FunctionInfo(gl, "uniform3fv", null, [
                new FunctionParam(gl, "location", new UIInfo(UIType.OBJECT)),
                new FunctionParam(gl, "v", new UIInfo(UIType.ARRAY))
            ]),
            new FunctionInfo(gl, "uniform3i", null, [
                new FunctionParam(gl, "location", new UIInfo(UIType.OBJECT)),
                new FunctionParam(gl, "x", new UIInfo(UIType.LONG)),
                new FunctionParam(gl, "y", new UIInfo(UIType.LONG)),
                new FunctionParam(gl, "z", new UIInfo(UIType.LONG))
            ]),
            new FunctionInfo(gl, "uniform3iv", null, [
                new FunctionParam(gl, "location", new UIInfo(UIType.OBJECT)),
                new FunctionParam(gl, "v", new UIInfo(UIType.ARRAY))
            ]),
            new FunctionInfo(gl, "uniform4f", null, [
                new FunctionParam(gl, "location", new UIInfo(UIType.OBJECT)),
                new FunctionParam(gl, "x", new UIInfo(UIType.FLOAT)),
                new FunctionParam(gl, "y", new UIInfo(UIType.FLOAT)),
                new FunctionParam(gl, "z", new UIInfo(UIType.FLOAT)),
                new FunctionParam(gl, "w", new UIInfo(UIType.FLOAT))
            ]),
            new FunctionInfo(gl, "uniform4fv", null, [
                new FunctionParam(gl, "location", new UIInfo(UIType.OBJECT)),
                new FunctionParam(gl, "v", new UIInfo(UIType.ARRAY))
            ]),
            new FunctionInfo(gl, "uniform4i", null, [
                new FunctionParam(gl, "location", new UIInfo(UIType.OBJECT)),
                new FunctionParam(gl, "x", new UIInfo(UIType.LONG)),
                new FunctionParam(gl, "y", new UIInfo(UIType.LONG)),
                new FunctionParam(gl, "z", new UIInfo(UIType.LONG)),
                new FunctionParam(gl, "w", new UIInfo(UIType.LONG))
            ]),
            new FunctionInfo(gl, "uniform4iv", null, [
                new FunctionParam(gl, "location", new UIInfo(UIType.OBJECT)),
                new FunctionParam(gl, "v", new UIInfo(UIType.ARRAY))
            ]),
            new FunctionInfo(gl, "uniformMatrix2fv", null, [
                new FunctionParam(gl, "location", new UIInfo(UIType.OBJECT)),
                new FunctionParam(gl, "transpose", new UIInfo(UIType.BOOL)),
                new FunctionParam(gl, "value", new UIInfo(UIType.MATRIX))
            ]),
            new FunctionInfo(gl, "uniformMatrix3fv", null, [
                new FunctionParam(gl, "location", new UIInfo(UIType.OBJECT)),
                new FunctionParam(gl, "transpose", new UIInfo(UIType.BOOL)),
                new FunctionParam(gl, "value", new UIInfo(UIType.MATRIX))
            ]),
            new FunctionInfo(gl, "uniformMatrix4fv", null, [
                new FunctionParam(gl, "location", new UIInfo(UIType.OBJECT)),
                new FunctionParam(gl, "transpose", new UIInfo(UIType.BOOL)),
                new FunctionParam(gl, "value", new UIInfo(UIType.MATRIX))
            ]),
            new FunctionInfo(gl, "useProgram", null, [
                new FunctionParam(gl, "program", new UIInfo(UIType.OBJECT))
            ]),
            new FunctionInfo(gl, "validateProgram", null, [
                new FunctionParam(gl, "program", new UIInfo(UIType.OBJECT))
            ]),
            new FunctionInfo(gl, "vertexAttrib1f", null, [
                new FunctionParam(gl, "indx", new UIInfo(UIType.LONG)),
                new FunctionParam(gl, "x", new UIInfo(UIType.FLOAT))
            ]),
            new FunctionInfo(gl, "vertexAttrib1fv", null, [
                new FunctionParam(gl, "indx", new UIInfo(UIType.LONG)),
                new FunctionParam(gl, "values", new UIInfo(UIType.ARRAY))
            ]),
            new FunctionInfo(gl, "vertexAttrib2f", null, [
                new FunctionParam(gl, "indx", new UIInfo(UIType.LONG)),
                new FunctionParam(gl, "x", new UIInfo(UIType.FLOAT)),
                new FunctionParam(gl, "y", new UIInfo(UIType.FLOAT))
            ]),
            new FunctionInfo(gl, "vertexAttrib2fv", null, [
                new FunctionParam(gl, "indx", new UIInfo(UIType.LONG)),
                new FunctionParam(gl, "values", new UIInfo(UIType.ARRAY))
            ]),
            new FunctionInfo(gl, "vertexAttrib3f", null, [
                new FunctionParam(gl, "indx", new UIInfo(UIType.LONG)),
                new FunctionParam(gl, "x", new UIInfo(UIType.FLOAT)),
                new FunctionParam(gl, "y", new UIInfo(UIType.FLOAT)),
                new FunctionParam(gl, "z", new UIInfo(UIType.FLOAT))
            ]),
            new FunctionInfo(gl, "vertexAttrib3fv", null, [
                new FunctionParam(gl, "indx", new UIInfo(UIType.LONG)),
                new FunctionParam(gl, "values", new UIInfo(UIType.ARRAY))
            ]),
            new FunctionInfo(gl, "vertexAttrib4f", null, [
                new FunctionParam(gl, "indx", new UIInfo(UIType.LONG)),
                new FunctionParam(gl, "x", new UIInfo(UIType.FLOAT)),
                new FunctionParam(gl, "y", new UIInfo(UIType.FLOAT)),
                new FunctionParam(gl, "z", new UIInfo(UIType.FLOAT)),
                new FunctionParam(gl, "w", new UIInfo(UIType.FLOAT))
            ]),
            new FunctionInfo(gl, "vertexAttrib4fv", null, [
                new FunctionParam(gl, "indx", new UIInfo(UIType.LONG)),
                new FunctionParam(gl, "values", new UIInfo(UIType.ARRAY))
            ]),
            new FunctionInfo(gl, "vertexAttribPointer", null, [
                new FunctionParam(gl, "indx", new UIInfo(UIType.LONG)),
                new FunctionParam(gl, "size", new UIInfo(UIType.LONG)),
                new FunctionParam(gl, "type", new UIInfo(UIType.ENUM, ["BYTE", "UNSIGNED_BYTE", "SHORT", "UNSIGNED_SHORT", "FIXED", "FLOAT"])),
                new FunctionParam(gl, "normalized", new UIInfo(UIType.BOOL)),
                new FunctionParam(gl, "stride", new UIInfo(UIType.LONG)),
                new FunctionParam(gl, "offset", new UIInfo(UIType.LONG))
            ]),
            new FunctionInfo(gl, "viewport", null, [
                new FunctionParam(gl, "x", new UIInfo(UIType.LONG)),
                new FunctionParam(gl, "y", new UIInfo(UIType.LONG)),
                new FunctionParam(gl, "width", new UIInfo(UIType.LONG)),
                new FunctionParam(gl, "height", new UIInfo(UIType.LONG))
            ])
        ];

        // Build lookup
        for (var n = 0; n < functionInfos.length; n++) {
            functionInfos[functionInfos[n].name] = functionInfos[n];
        }

        var textureTypes = new UIInfo(UIType.ENUM, ["UNSIGNED_BYTE", "UNSIGNED_SHORT_5_6_5", "UNSIGNED_SHORT_4_4_4_4", "UNSIGNED_SHORT_5_5_5_1", "FLOAT", "HALF_FLOAT_OES", "UNSIGNED_SHORT", "UNSIGNED_INT"]);
        functionInfos["texImage2D"].getArgs = function (call) {
            var args = [];
            args.push(new FunctionParam(gl, "target", new UIInfo(UIType.ENUM, ["TEXTURE_2D", "TEXTURE_CUBE_MAP_POSITIVE_X", "TEXTURE_CUBE_MAP_NEGATIVE_X", "TEXTURE_CUBE_MAP_POSITIVE_Y", "TEXTURE_CUBE_MAP_NEGATIVE_Y", "TEXTURE_CUBE_MAP_POSITIVE_Z", "TEXTURE_CUBE_MAP_NEGATIVE_Z"])));
            args.push(new FunctionParam(gl, "level", new UIInfo(UIType.LONG)));
            args.push(new FunctionParam(gl, "internalformat", new UIInfo(UIType.ENUM, ["ALPHA", "LUMINANCE", "LUMINANCE_ALPHA", "RGB", "RGBA", "DEPTH_COMPONENT"])));
            if (call.args.length == 9) {
                args.push(new FunctionParam(gl, "width", new UIInfo(UIType.LONG)));
                args.push(new FunctionParam(gl, "height", new UIInfo(UIType.LONG)));
                args.push(new FunctionParam(gl, "border", new UIInfo(UIType.LONG)));
                args.push(new FunctionParam(gl, "format", new UIInfo(UIType.ENUM, ["ALPHA", "LUMINANCE", "LUMINANCE_ALPHA", "RGB", "RGBA", "DEPTH_COMPONENT"])));
                args.push(new FunctionParam(gl, "type", textureTypes));
                args.push(new FunctionParam(gl, "pixels", new UIInfo(UIType.ARRAY)));
            } else {
                args.push(new FunctionParam(gl, "format", new UIInfo(UIType.ENUM, ["ALPHA", "LUMINANCE", "LUMINANCE_ALPHA", "RGB", "RGBA", "DEPTH_COMPONENT"])));
                args.push(new FunctionParam(gl, "type", textureTypes));
                args.push(new FunctionParam(gl, "value", new UIInfo(UIType.OBJECT)));
            }
            return args;
        };
        functionInfos["texSubImage2D"].getArgs = function (call) {
            var args = [];
            args.push(new FunctionParam(gl, "target", new UIInfo(UIType.ENUM, ["TEXTURE_2D", "TEXTURE_CUBE_MAP_POSITIVE_X", "TEXTURE_CUBE_MAP_NEGATIVE_X", "TEXTURE_CUBE_MAP_POSITIVE_Y", "TEXTURE_CUBE_MAP_NEGATIVE_Y", "TEXTURE_CUBE_MAP_POSITIVE_Z", "TEXTURE_CUBE_MAP_NEGATIVE_Z"])));
            args.push(new FunctionParam(gl, "level", new UIInfo(UIType.LONG)));
            args.push(new FunctionParam(gl, "xoffset", new UIInfo(UIType.LONG)));
            args.push(new FunctionParam(gl, "yoffset", new UIInfo(UIType.LONG)));
            if (call.args.length == 9) {
                args.push(new FunctionParam(gl, "width", new UIInfo(UIType.LONG)));
                args.push(new FunctionParam(gl, "height", new UIInfo(UIType.LONG)));
                args.push(new FunctionParam(gl, "format", new UIInfo(UIType.ENUM, ["ALPHA", "LUMINANCE", "LUMINANCE_ALPHA", "RGB", "RGBA"])));
                args.push(new FunctionParam(gl, "type", textureTypes));
                args.push(new FunctionParam(gl, "pixels", new UIInfo(UIType.ARRAY)));
            } else {
                args.push(new FunctionParam(gl, "format", new UIInfo(UIType.ENUM, ["ALPHA", "LUMINANCE", "LUMINANCE_ALPHA", "RGB", "RGBA"])));
                args.push(new FunctionParam(gl, "type", textureTypes));
                args.push(new FunctionParam(gl, "value", new UIInfo(UIType.OBJECT)));
            }
            return args;
        };
        functionInfos["compressedTexImage2D"].getArgs = function (call) {
            var args = [];
            args.push(new FunctionParam(gl, "target", new UIInfo(UIType.ENUM, ["TEXTURE_2D", "TEXTURE_CUBE_MAP_POSITIVE_X", "TEXTURE_CUBE_MAP_NEGATIVE_X", "TEXTURE_CUBE_MAP_POSITIVE_Y", "TEXTURE_CUBE_MAP_NEGATIVE_Y", "TEXTURE_CUBE_MAP_POSITIVE_Z", "TEXTURE_CUBE_MAP_NEGATIVE_Z"])));
            args.push(new FunctionParam(gl, "level", new UIInfo(UIType.LONG)));
            args.push(new FunctionParam(gl, "internalformat", new UIInfo(UIType.LONG)));
            args.push(new FunctionParam(gl, "width", new UIInfo(UIType.LONG)));
            args.push(new FunctionParam(gl, "height", new UIInfo(UIType.LONG)));
            args.push(new FunctionParam(gl, "border", new UIInfo(UIType.LONG)));
            args.push(new FunctionParam(gl, "data", new UIInfo(UIType.ARRAY)));
            return args;
        };
        functionInfos["compressedTexSubImage2D"].getArgs = function (call) {
            var args = [];
            args.push(new FunctionParam(gl, "target", new UIInfo(UIType.ENUM, ["TEXTURE_2D", "TEXTURE_CUBE_MAP_POSITIVE_X", "TEXTURE_CUBE_MAP_NEGATIVE_X", "TEXTURE_CUBE_MAP_POSITIVE_Y", "TEXTURE_CUBE_MAP_NEGATIVE_Y", "TEXTURE_CUBE_MAP_POSITIVE_Z", "TEXTURE_CUBE_MAP_NEGATIVE_Z"])));
            args.push(new FunctionParam(gl, "level", new UIInfo(UIType.LONG)));
            args.push(new FunctionParam(gl, "xoffset", new UIInfo(UIType.LONG)));
            args.push(new FunctionParam(gl, "yoffset", new UIInfo(UIType.LONG)));
            args.push(new FunctionParam(gl, "width", new UIInfo(UIType.LONG)));
            args.push(new FunctionParam(gl, "height", new UIInfo(UIType.LONG)));
            args.push(new FunctionParam(gl, "format", new UIInfo(UIType.LONG)));
            args.push(new FunctionParam(gl, "data", new UIInfo(UIType.ARRAY)));
            return args;
        };

        info.functions = functionInfos;
    };

    var StateParameter = function (staticgl, name, readOnly, ui) {
        this.value = staticgl[name];
        this.name = name;
        this.readOnly = readOnly;
        this.ui = ui;

        this.getter = function (gl) {
            try {
                return gl.getParameter(gl[this.name]);
            } catch (e) {
                console.log("unable to get state parameter " + this.name);
                return null;
            }
        };
    };

    function setupStateParameters(gl) {
        if (info.stateParameters) {
            return;
        }

        var maxTextureUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);

        var hintValues = ["FASTEST", "NICEST", "DONT_CARE"];
        var stateParameters = [
            new StateParameter(gl, "ACTIVE_TEXTURE", false, new UIInfo(UIType.ENUM, ["TEXTURE0", "TEXTURE1", "TEXTURE2", "TEXTURE3", "TEXTURE4", "TEXTURE5", "TEXTURE6", "TEXTURE7", "TEXTURE8", "TEXTURE9", "TEXTURE10", "TEXTURE11", "TEXTURE12", "TEXTURE13", "TEXTURE14", "TEXTURE15", "TEXTURE16", "TEXTURE17", "TEXTURE18", "TEXTURE19", "TEXTURE20", "TEXTURE21", "TEXTURE22", "TEXTURE23", "TEXTURE24", "TEXTURE25", "TEXTURE26", "TEXTURE27", "TEXTURE28", "TEXTURE29", "TEXTURE30", "TEXTURE31"])),
            new StateParameter(gl, "ALIASED_LINE_WIDTH_RANGE", true, new UIInfo(UIType.RANGE)),
            new StateParameter(gl, "ALIASED_POINT_SIZE_RANGE", true, new UIInfo(UIType.RANGE)),
            new StateParameter(gl, "ALPHA_BITS", true, new UIInfo(UIType.LONG)),
            new StateParameter(gl, "ARRAY_BUFFER_BINDING", false, new UIInfo(UIType.OBJECT)),
            new StateParameter(gl, "BLEND", false, new UIInfo(UIType.BOOL)),
            new StateParameter(gl, "BLEND_COLOR", false, new UIInfo(UIType.COLOR)),
            new StateParameter(gl, "BLEND_DST_ALPHA", false, new UIInfo(UIType.ENUM, ["ZERO", "ONE", "SRC_COLOR", "ONE_MINUS_SRC_COLOR", "DST_COLOR", "ONE_MINUS_DST_COLOR", "SRC_ALPHA", "ONE_MINUS_SRC_ALPHA", "DST_ALPHA", "ONE_MINUS_DST_ALPHA. GL_CONSTANT_COLOR", "ONE_MINUS_CONSTANT_COLOR", "CONSTANT_ALPHA", "ONE_MINUS_CONSTANT_ALPHA"])),
            new StateParameter(gl, "BLEND_DST_RGB", false, new UIInfo(UIType.ENUM, ["ZERO", "ONE", "SRC_COLOR", "ONE_MINUS_SRC_COLOR", "DST_COLOR", "ONE_MINUS_DST_COLOR", "SRC_ALPHA", "ONE_MINUS_SRC_ALPHA", "DST_ALPHA", "ONE_MINUS_DST_ALPHA. GL_CONSTANT_COLOR", "ONE_MINUS_CONSTANT_COLOR", "CONSTANT_ALPHA", "ONE_MINUS_CONSTANT_ALPHA"])),
            new StateParameter(gl, "BLEND_EQUATION_ALPHA", false, new UIInfo(UIType.ENUM, ["FUNC_ADD", "FUNC_SUBTRACT", "FUNC_REVERSE_SUBTRACT"])),
            new StateParameter(gl, "BLEND_EQUATION_RGB", false, new UIInfo(UIType.ENUM, ["FUNC_ADD", "FUNC_SUBTRACT", "FUNC_REVERSE_SUBTRACT"])),
            new StateParameter(gl, "BLEND_SRC_ALPHA", false, new UIInfo(UIType.ENUM, ["ZERO", "ONE", "SRC_COLOR", "ONE_MINUS_SRC_COLOR", "DST_COLOR", "ONE_MINUS_DST_COLOR", "SRC_ALPHA", "ONE_MINUS_SRC_ALPHA", "DST_ALPHA", "ONE_MINUS_DST_ALPHA", "CONSTANT_COLOR", "ONE_MINUS_CONSTANT_COLOR", "CONSTANT_ALPHA", "ONE_MINUS_CONSTANT_ALPHA", "SRC_ALPHA_SATURATE"])),
            new StateParameter(gl, "BLEND_SRC_RGB", false, new UIInfo(UIType.ENUM, ["ZERO", "ONE", "SRC_COLOR", "ONE_MINUS_SRC_COLOR", "DST_COLOR", "ONE_MINUS_DST_COLOR", "SRC_ALPHA", "ONE_MINUS_SRC_ALPHA", "DST_ALPHA", "ONE_MINUS_DST_ALPHA", "CONSTANT_COLOR", "ONE_MINUS_CONSTANT_COLOR", "CONSTANT_ALPHA", "ONE_MINUS_CONSTANT_ALPHA", "SRC_ALPHA_SATURATE"])),
            new StateParameter(gl, "BLUE_BITS", true, new UIInfo(UIType.LONG)),
            new StateParameter(gl, "COLOR_CLEAR_VALUE", false, new UIInfo(UIType.COLOR)),
            new StateParameter(gl, "COLOR_WRITEMASK", false, new UIInfo(UIType.COLORMASK)),
            new StateParameter(gl, "CULL_FACE", false, new UIInfo(UIType.BOOL)),
            new StateParameter(gl, "CULL_FACE_MODE", false, new UIInfo(UIType.ENUM, ["FRONT", "BACK", "FRONT_AND_BACK"])),
            new StateParameter(gl, "CURRENT_PROGRAM", false, new UIInfo(UIType.OBJECT)),
            new StateParameter(gl, "DEPTH_BITS", true, new UIInfo(UIType.LONG)),
            new StateParameter(gl, "DEPTH_CLEAR_VALUE", false, new UIInfo(UIType.FLOAT)),
            new StateParameter(gl, "DEPTH_FUNC", false, new UIInfo(UIType.ENUM, ["NEVER", "LESS", "EQUAL", "LEQUAL", "GREATER", "NOTEQUAL", "GEQUAL", "ALWAYS"])),
            new StateParameter(gl, "DEPTH_RANGE", false, new UIInfo(UIType.RANGE)),
            new StateParameter(gl, "DEPTH_TEST", false, new UIInfo(UIType.BOOL)),
            new StateParameter(gl, "DEPTH_WRITEMASK", false, new UIInfo(UIType.BOOL)),
            new StateParameter(gl, "DITHER", true, new UIInfo(UIType.BOOL)),
            new StateParameter(gl, "ELEMENT_ARRAY_BUFFER_BINDING", false, new UIInfo(UIType.OBJECT)),
            new StateParameter(gl, "FRAGMENT_SHADER_DERIVATIVE_HINT_OES", false, new UIInfo(UIType.ENUM, hintValues)),
            new StateParameter(gl, "FRAMEBUFFER_BINDING", false, new UIInfo(UIType.OBJECT)),
            new StateParameter(gl, "FRONT_FACE", false, new UIInfo(UIType.ENUM, ["CW", "CCW"])),
            new StateParameter(gl, "GENERATE_MIPMAP_HINT", false, new UIInfo(UIType.ENUM, hintValues)),
            new StateParameter(gl, "GREEN_BITS", true, new UIInfo(UIType.LONG)),
            new StateParameter(gl, "LINE_WIDTH", false, new UIInfo(UIType.FLOAT)),
            new StateParameter(gl, "MAX_COMBINED_TEXTURE_IMAGE_UNITS", true, new UIInfo(UIType.LONG)),
            new StateParameter(gl, "MAX_CUBE_MAP_TEXTURE_SIZE", true, new UIInfo(UIType.LONG)),
            new StateParameter(gl, "MAX_FRAGMENT_UNIFORM_VECTORS", true, new UIInfo(UIType.LONG)),
            new StateParameter(gl, "MAX_RENDERBUFFER_SIZE", true, new UIInfo(UIType.LONG)),
            new StateParameter(gl, "MAX_TEXTURE_IMAGE_UNITS", true, new UIInfo(UIType.LONG)),
            new StateParameter(gl, "MAX_TEXTURE_MAX_ANISOTROPY_EXT", true, new UIInfo(UIType.LONG)),
            new StateParameter(gl, "MAX_TEXTURE_SIZE", true, new UIInfo(UIType.LONG)),
            new StateParameter(gl, "MAX_VARYING_VECTORS", true, new UIInfo(UIType.LONG)),
            new StateParameter(gl, "MAX_VERTEX_ATTRIBS", true, new UIInfo(UIType.LONG)),
            new StateParameter(gl, "MAX_VERTEX_TEXTURE_IMAGE_UNITS", true, new UIInfo(UIType.LONG)),
            new StateParameter(gl, "MAX_VERTEX_UNIFORM_VECTORS", true, new UIInfo(UIType.LONG)),
            new StateParameter(gl, "MAX_VIEWPORT_DIMS", true, new UIInfo(UIType.WH)),
            new StateParameter(gl, "PACK_ALIGNMENT", false, new UIInfo(UIType.LONG)),
            new StateParameter(gl, "POLYGON_OFFSET_FACTOR", false, new UIInfo(UIType.FLOAT)),
            new StateParameter(gl, "POLYGON_OFFSET_FILL", false, new UIInfo(UIType.BOOL)),
            new StateParameter(gl, "POLYGON_OFFSET_UNITS", false, new UIInfo(UIType.FLOAT)),
            new StateParameter(gl, "RED_BITS", true, new UIInfo(UIType.LONG)),
            new StateParameter(gl, "RENDERBUFFER_BINDING", false, new UIInfo(UIType.OBJECT)),
            new StateParameter(gl, "RENDERER", true, new UIInfo(UIType.STRING)),
            new StateParameter(gl, "SAMPLE_BUFFERS", true, new UIInfo(UIType.LONG)),
            new StateParameter(gl, "SAMPLE_COVERAGE_INVERT", false, new UIInfo(UIType.BOOL)),
            new StateParameter(gl, "SAMPLE_COVERAGE_VALUE", false, new UIInfo(UIType.FLOAT)),
            new StateParameter(gl, "SAMPLES", true, new UIInfo(UIType.LONG)),
            new StateParameter(gl, "SCISSOR_BOX", false, new UIInfo(UIType.RECT)),
            new StateParameter(gl, "SCISSOR_TEST", false, new UIInfo(UIType.BOOL)),
            new StateParameter(gl, "SHADING_LANGUAGE_VERSION", true, new UIInfo(UIType.STRING)),
            new StateParameter(gl, "STENCIL_BACK_FAIL", false, new UIInfo(UIType.ENUM, ["KEEP", "ZERO", "REPLACE", "INCR", "INCR_WRAP", "DECR", "DECR_WRAP", "INVERT"])),
            new StateParameter(gl, "STENCIL_BACK_FUNC", false, new UIInfo(UIType.ENUM, ["NEVER", "LESS", "LEQUAL", "GREATER", "GEQUAL", "EQUAL", "NOTEQUAL", "ALWAYS"])),
            new StateParameter(gl, "STENCIL_BACK_PASS_DEPTH_FAIL", false, new UIInfo(UIType.ENUM, ["KEEP", "ZERO", "REPLACE", "INCR", "INCR_WRAP", "DECR", "DECR_WRAP", "INVERT"])),
            new StateParameter(gl, "STENCIL_BACK_PASS_DEPTH_PASS", false, new UIInfo(UIType.ENUM, ["KEEP", "ZERO", "REPLACE", "INCR", "INCR_WRAP", "DECR", "DECR_WRAP", "INVERT"])),
            new StateParameter(gl, "STENCIL_BACK_REF", false, new UIInfo(UIType.LONG)),
            new StateParameter(gl, "STENCIL_BACK_VALUE_MASK", false, new UIInfo(UIType.BITMASK)),
            new StateParameter(gl, "STENCIL_BACK_WRITEMASK", false, new UIInfo(UIType.BITMASK)),
            new StateParameter(gl, "STENCIL_BITS", true, new UIInfo(UIType.LONG)),
            new StateParameter(gl, "STENCIL_CLEAR_VALUE", false, new UIInfo(UIType.LONG)),
            new StateParameter(gl, "STENCIL_FAIL", false, new UIInfo(UIType.ENUM, ["KEEP", "ZERO", "REPLACE", "INCR", "INCR_WRAP", "DECR", "DECR_WRAP", "INVERT"])),
            new StateParameter(gl, "STENCIL_FUNC", false, new UIInfo(UIType.ENUM, ["NEVER", "LESS", "LEQUAL", "GREATER", "GEQUAL", "EQUAL", "NOTEQUAL", "ALWAYS"])),
            new StateParameter(gl, "STENCIL_PASS_DEPTH_FAIL", false, new UIInfo(UIType.ENUM, ["KEEP", "ZERO", "REPLACE", "INCR", "INCR_WRAP", "DECR", "DECR_WRAP", "INVERT"])),
            new StateParameter(gl, "STENCIL_PASS_DEPTH_PASS", false, new UIInfo(UIType.ENUM, ["KEEP", "ZERO", "REPLACE", "INCR", "INCR_WRAP", "DECR", "DECR_WRAP", "INVERT"])),
            new StateParameter(gl, "STENCIL_REF", false, new UIInfo(UIType.LONG)),
            new StateParameter(gl, "STENCIL_TEST", false, new UIInfo(UIType.BOOL)),
            new StateParameter(gl, "STENCIL_VALUE_MASK", false, new UIInfo(UIType.BITMASK)),
            new StateParameter(gl, "STENCIL_WRITEMASK", false, new UIInfo(UIType.BITMASK)),
            new StateParameter(gl, "SUBPIXEL_BITS", true, new UIInfo(UIType.LONG)),
            new StateParameter(gl, "UNPACK_ALIGNMENT", false, new UIInfo(UIType.LONG)),
            new StateParameter(gl, "UNPACK_COLORSPACE_CONVERSION_WEBGL", false, new UIInfo(UIType.ENUM, ["NONE", "BROWSER_DEFAULT_WEBGL"])),
            new StateParameter(gl, "UNPACK_FLIP_Y_WEBGL", false, new UIInfo(UIType.BOOL)),
            new StateParameter(gl, "UNPACK_PREMULTIPLY_ALPHA_WEBGL", false, new UIInfo(UIType.BOOL)),
            new StateParameter(gl, "VENDOR", true, new UIInfo(UIType.STRING)),
            new StateParameter(gl, "VERSION", true, new UIInfo(UIType.STRING)),
            new StateParameter(gl, "VIEWPORT", false, new UIInfo(UIType.RECT))
        ];

        for (var n = 0; n < maxTextureUnits; n++) {
            var param = new StateParameter(gl, "TEXTURE_BINDING_2D_" + n, false, new UIInfo(UIType.OBJECT));
            param.getter = (function (n) {
                return function (gl) {
                    var existingBinding = gl.getParameter(gl.ACTIVE_TEXTURE);
                    gl.activeTexture(gl.TEXTURE0 + n);
                    var result = gl.getParameter(gl.TEXTURE_BINDING_2D);
                    gl.activeTexture(existingBinding);
                    return result;
                };
            })(n);
            stateParameters.push(param);
        }
        for (var n = 0; n < maxTextureUnits; n++) {
            var param = new StateParameter(gl, "TEXTURE_BINDING_CUBE_MAP_" + n, false, new UIInfo(UIType.OBJECT));
            param.getter = (function (n) {
                return function (gl) {
                    var existingBinding = gl.getParameter(gl.ACTIVE_TEXTURE);
                    gl.activeTexture(gl.TEXTURE0 + n);
                    var result = gl.getParameter(gl.TEXTURE_BINDING_CUBE_MAP);
                    gl.activeTexture(existingBinding);
                    return result;
                };
            })(n);
            stateParameters.push(param);
        }

        // Build lookup
        for (var n = 0; n < stateParameters.length; n++) {
            stateParameters[stateParameters[n].name] = stateParameters[n];
        }

        info.stateParameters = stateParameters;
    };

    function setupEnumMap(gl) {
        if (info.enumMap) {
            return;
        }

        var enumMap = {};
        for (var n in gl) {
            if (typeof gl[n] == 'number') {
                enumMap[gl[n]] = n;
            }
        }

        info.enumMap = enumMap;
    };

    gli.UIType = UIType;
    gli.FunctionType = FunctionType;
    //info.functions - deferred
    //info.stateParameters - deferred
    //info.enumMap - deferred

    info.enumToString = function (n) {
        var string = info.enumMap[n];
        if (string !== undefined) {
            return string;
        }
        return "0x" + n.toString(16);
    };

    info.initialize = function (gl) {
        setupFunctionInfos(gl);
        setupStateParameters(gl);
        setupEnumMap(gl);
    };
})();
(function () {
    var controls = glinamespace("gli.controls");

    var SplitterBar = function (parentElement, direction, minValue, maxValue, customStyle, changeCallback) {
        var self = this;
        var doc = parentElement.ownerDocument;

        var el = this.el = doc.createElement("div");
        parentElement.appendChild(el);

        el.className = customStyle || ("splitter-" + direction);

        var lastValue = 0;

        function mouseMove(e) {
            var newValue;

            if (direction == "horizontal") {
                var dy = e.screenY - lastValue;
                lastValue = e.screenY;

                var height = parseInt(parentElement.style.height);
                height -= dy;
                height = Math.max(minValue, height);
                height = Math.min(window.innerHeight - maxValue, height);
                parentElement.style.height = height + "px";
                newValue = height;
            } else {
                var dx = e.screenX - lastValue;
                lastValue = e.screenX;

                var width = parseInt(parentElement.style.width);
                width -= dx;
                width = Math.max(minValue, width);
                width = Math.min(window.innerWidth - maxValue, width);
                parentElement.style.width = width + "px";
                newValue = width;
            }

            if (changeCallback) {
                changeCallback(newValue);
            }

            e.preventDefault();
            e.stopPropagation();
        };

        function mouseUp(e) {
            endResize();
            e.preventDefault();
            e.stopPropagation();
        };

        function beginResize() {
            doc.addEventListener("mousemove", mouseMove, true);
            doc.addEventListener("mouseup", mouseUp, true);
            if (direction == "horizontal") {
                doc.body.style.cursor = "n-resize";
            } else {
                doc.body.style.cursor = "e-resize";
            }
        };

        function endResize() {
            doc.removeEventListener("mousemove", mouseMove, true);
            doc.removeEventListener("mouseup", mouseUp, true);
            doc.body.style.cursor = "";
        };

        el.onmousedown = function (e) {
            beginResize();
            if (direction == "horizontal") {
                lastValue = e.screenY;
            } else {
                lastValue = e.screenX;
            }
            e.preventDefault();
            e.stopPropagation();
        };

        // TODO: save splitter value somewhere across sessions?
    };

    controls.SplitterBar = SplitterBar;
})();
(function () {
    var gli = glinamespace("gli");

    var Settings = function () {
        this.global = {
            captureOn: [],
            showHud: false,
            popupHud: false,
            enableTimeline: true
        };

        this.session = {
            showRedundantCalls: true,
            showDepthDiscarded: true,
            enableTimeline: false,
            hudVisible: false,
            hudHeight: 275,
            hudPopupWidth: 1200,
            hudPopupHeight: 500,
            traceSplitter: 400,
            textureSplitter: 240,
            counterToggles: {}
        };

        this.load();
    };

    Settings.prototype.setGlobals = function (globals) {
        for (var n in globals) {
            this.global[n] = globals[n];
        }
    };

    Settings.prototype.load = function () {
        var sessionString = localStorage["__gli"];
        if (sessionString) {
            var sessionObj = JSON.parse(sessionString);
            for (var n in sessionObj) {
                this.session[n] = sessionObj[n];
            }
        }
    };
    Settings.prototype.save = function () {
        localStorage["__gli"] = JSON.stringify(this.session);
    };

    gli.settings = new Settings();
})();
(function () {
    var host = glinamespace("gli.host");
    var dynamicContextProperties = {
        drawingBufferWidth: true,
        drawingBufferHeight: true,
    };

    function errorBreak() {
        throw "WebGL error!";
    };

    function startCapturing(context) {
        context.ignoreErrors();
        context.captureFrame = true;
        //context.notifier.postMessage("capturing frame " + context.frameNumber + "...");
    };

    function stopCapturing(context) {
        context.notifier.postMessage("captured frame " + (context.frameNumber - 1));
        context.captureFrame = false;
        context.ignoreErrors();

        var frame = context.currentFrame;

        context.markFrame(null); // mark end

        // Fire off callback (if present)
        if (context.captureCallback) {
            context.captureCallback(context, frame);
        }
    };

    function frameEnded(context) {
        if (context.inFrame) {
            context.inFrame = false;
            context.statistics.endFrame();
            context.frameCompleted.fire();
            context.ignoreErrors();
        }
    };

    function frameSeparator(context) {
        context.frameNumber++;

        // Start or stop capturing
        if (context.captureFrame) {
            if (context.captureFrameEnd == context.frameNumber) {
                stopCapturing(context);
            }
        } else {
            if (context.captureFrameStart == context.frameNumber) {
                startCapturing(context);
            }
        }

        if (context.captureFrame) {
            context.markFrame(context.frameNumber);
        }

        context.statistics.beginFrame();

        // Even though we are watching most timing methods, we can't be too safe
        original_setTimeout(function () {
            host.frameTerminator.fire();
        }, 0);
    };

    function wrapFunction(context, functionName) {
        var originalFunction = context.rawgl[functionName];
        var statistics = context.statistics;
        var callsPerFrame = statistics.callsPerFrame;
        return function () {
            var gl = context.rawgl;

            var stack = null;
            function generateStack() {
                // Generate stack trace
                var stackResult = printStackTrace();
                // ignore garbage
                stackResult = stackResult.slice(4);
                // Fix up our type
                stackResult[0] = stackResult[0].replace("[object Object].", "gl.");
                return stackResult;
            };

            if (context.inFrame == false) {
                // First call of a new frame!
                context.inFrame = true;
                frameSeparator(context);
            }

            // PRE:
            var call = null;
            if (context.captureFrame) {
                // NOTE: for timing purposes this should be the last thing before the actual call is made
                stack = stack || (context.options.resourceStacks ? generateStack() : null);
                call = context.currentFrame.allocateCall(functionName, arguments);
            }

            callsPerFrame.value++;

            if (context.captureFrame) {
                // Ignore all errors before this call is made
                gl.ignoreErrors();
            }

            // Call real function
            var result = originalFunction.apply(context.rawgl, arguments);

            // Get error state after real call - if we don't do this here, tracing/capture calls could mess things up
            var error = context.NO_ERROR;
            if (!context.options.ignoreErrors || context.captureFrame) {
                error = gl.getError();
            }

            // POST:
            if (context.captureFrame) {
                if (error != context.NO_ERROR) {
                    stack = stack || generateStack();
                }
                call.complete(result, error, stack);
            }

            if (error != context.NO_ERROR) {
                context.errorMap[error] = true;

                if (context.options.breakOnError) {
                    // TODO: backtrace?
                    errorBreak();
                }
            }

            // If this is the frame separator then handle it
            if (context.options.frameSeparators.indexOf(functionName) >= 0) {
                frameEnded(context);
            }

            return result;
        };
    };

    function wrapProperty(context, propertyName) {
        Object.defineProperty(context, propertyName, {
            configurable: false,
            enumerable: true,
            get: function() {
                return context.rawgl[propertyName];
            }
        });
    };

    var CaptureContext = function (canvas, rawgl, options) {
        var defaultOptions = {
            ignoreErrors: true,
            breakOnError: false,
            resourceStacks: false,
            callStacks: false,
            frameSeparators: gli.settings.global.captureOn
        };
        options = options || defaultOptions;
        for (var n in defaultOptions) {
            if (options[n] === undefined) {
                options[n] = defaultOptions[n];
            }
        }

        this.options = options;
        this.canvas = canvas;
        this.rawgl = rawgl;
        this.isWrapped = true;

        this.notifier = new host.Notifier();

        this.rawgl.canvas = canvas;
        gli.info.initialize(this.rawgl);

        this.attributes = rawgl.getContextAttributes ? rawgl.getContextAttributes() : {};

        this.statistics = new host.Statistics();

        this.frameNumber = 0;
        this.inFrame = false;

        // Function to call when capture completes
        this.captureCallback = null;
        // Frame range to capture (inclusive) - if inside a capture window, captureFrame == true
        this.captureFrameStart = null;
        this.captureFrameEnd = null;
        this.captureFrame = false;
        this.currentFrame = null;

        this.errorMap = {};

        this.enabledExtensions = [];

        this.frameCompleted = new gli.EventSource("frameCompleted");
        this.frameCompleted.addListener(this, function() {
            frameSeparator(this);
        });

        // NOTE: this should happen ASAP so that we make sure to wrap the faked function, not the real-REAL one
        gli.hacks.installAll(rawgl);

        // NOTE: this should also happen really early, but after hacks
        gli.installExtensions(rawgl);

        // Listen for inferred frame termination and extension termination
        function frameEndedWrapper() {
            frameEnded(this);
        };
        host.frameTerminator.addListener(this, frameEndedWrapper);
        var ext = rawgl.getExtension("GLI_frame_terminator");
        ext.frameEvent.addListener(this, frameEndedWrapper);

        // Clone all properties in context and wrap all functions
        for (var propertyName in rawgl) {
            if (typeof rawgl[propertyName] == 'function') {
                // Functions
                this[propertyName] = wrapFunction(this, propertyName, rawgl[propertyName]);
            } else if (propertyName in dynamicContextProperties) {
                // Enums/constants/etc
                wrapProperty(this, propertyName);
            } else {
                this[propertyName] = rawgl[propertyName];
            }
        }

        // Rewrite getError so that it uses our version instead
        this.getError = function () {
            for (var error in this.errorMap) {
                if (this.errorMap[error]) {
                    this.errorMap[error] = false;
                    return error;
                }
            }
            return this.NO_ERROR;
        };

        // Unlogged pass-through of getContextAttributes and isContextLost
        this.isContextLost = function() {
            return rawgl.isContextLost();
        };
        this.getContextAttributes = function() {
            return rawgl.getContextAttributes();
        };

        // Capture all extension requests
        // We only support a few right now, so filter
        // New extensions that add tokens will needs to have support added in
        // the proper places, such as Info.js for enum values and the resource
        // system for new resources
        var validExts = [
            'GLI_frame_terminator',
            'OES_texture_float',
            'OES_texture_half_float',
            'OES_texture_float_linear',
            'OES_texture_half_float_linear',
            'OES_standard_derivatives',
            'OES_element_index_uint',
            'EXT_texture_filter_anisotropic',
            'EXT_shader_texture_lod',
            'OES_depth_texture',
            'WEBGL_depth_texture',
            'WEBGL_compressed_texture_s3tc',
        ];
        for (var n = 0, l = validExts.length; n < l; n++) {
            validExts.push('MOZ_' + validExts[n]);
            validExts.push('WEBKIT_' + validExts[n]);
        }
        function containsInsensitive(list, name) {
            name = name.toLowerCase();
            for (var n = 0, len = list.length; n < len; ++n) {
                if (list[n].toLowerCase() === name) return true;
            }
            return false;
        };
        var original_getSupportedExtensions = this.getSupportedExtensions;
        this.getSupportedExtensions = function() {
            var exts = original_getSupportedExtensions.call(this);
            var usableExts = [];
            for (var n = 0; n < exts.length; n++) {
                if (containsInsensitive(validExts, exts[n])) {
                    usableExts.push(exts[n]);
                }
            }
            return usableExts;
        };
        var original_getExtension = this.getExtension;
        this.getExtension = function (name) {
            if (!containsInsensitive(validExts, name)) {
                return null;
            }
            var result = original_getExtension.apply(this, arguments);
            if (result) {
                // Nasty, but I never wrote this to support new constants properly
                switch (name.toLowerCase()) {
                    case 'oes_texture_half_float':
                        this['HALF_FLOAT_OES'] = 0x8D61;
                        break;
                    case 'oes_standard_derivatives':
                        this['FRAGMENT_SHADER_DERIVATIVE_HINT_OES'] = 0x8B8B;
                        break;
                    case 'ext_texture_filter_anisotropic':
                    case 'moz_ext_texture_filter_anisotropic':
                    case 'webkit_ext_texture_filter_anisotropic':
                        this['TEXTURE_MAX_ANISOTROPY_EXT'] = 0x84FE;
                        this['MAX_TEXTURE_MAX_ANISOTROPY_EXT'] = 0x84FF;
                        break;
                    case 'webgl_compressed_texture_s3tc':
                    case 'moz_webgl_compressed_texture_s3tc':
                    case 'webkit_webgl_compressed_texture_s3tc':
                        this['COMPRESSED_RGB_S3TC_DXT1_EXT'] = 0x83F0;
                        this['COMPRESSED_RGBA_S3TC_DXT1_EXT'] = 0x83F1;
                        this['COMPRESSED_RGBA_S3TC_DXT3_EXT'] = 0x83F2;
                        this['COMPRESSED_RGBA_S3TC_DXT5_EXT'] = 0x83F3;
                        break;
                }

                this.enabledExtensions.push(name);
            }
            return result;
        };

        // Add a few helper methods
        this.ignoreErrors = rawgl.ignoreErrors = function () {
            while (this.getError() != this.NO_ERROR);
        };

        // Add debug methods
        this.mark = function () {
            if (context.captureFrame) {
                context.currentFrame.mark(arguments);
            }
        };

        // TODO: before or after we wrap? if we do it here (after), then timings won't be affected by our captures
        this.resources = new gli.host.ResourceCache(this);
    };

    CaptureContext.prototype.markFrame = function (frameNumber) {
        if (this.currentFrame) {
            // Close the previous frame
            this.currentFrame.end(this.rawgl);
            this.currentFrame = null;
        }

        if (frameNumber == null) {
            // Abort if not a real frame
            return;
        }

        var frame = new gli.host.Frame(this.canvas, this.rawgl, frameNumber, this.resources);
        this.currentFrame = frame;
    };

    CaptureContext.prototype.requestCapture = function (callback) {
        this.captureCallback = callback;
        this.captureFrameStart = this.frameNumber + 1;
        this.captureFrameEnd = this.captureFrameStart + 1;
        this.captureFrame = false;
    };

    host.CaptureContext = CaptureContext;

    host.frameTerminator = new gli.EventSource("frameTerminator");

    // This replaces setTimeout/setInterval with versions that, after the user code is called, try to end the frame
    // This should be a reliable way to bracket frame captures, unless the user is doing something crazy (like
    // rendering in mouse event handlers)
    var timerHijacking = {
        value: 0, // 0 = normal, N = ms between frames, Infinity = stopped
        activeIntervals: [],
        activeTimeouts: []
    };

    function hijackedDelay(delay) {
        var maxDelay = Math.max(isNaN(delay) ? 0 : delay, timerHijacking.value);
        if (!isFinite(maxDelay)) {
            maxDelay = 999999999;
        }
        return maxDelay;
    }

    host.setFrameControl = function (value) {
        timerHijacking.value = value;

        // Reset all intervals
        var intervals = timerHijacking.activeIntervals;
        for (var n = 0; n < intervals.length; n++) {
            var interval = intervals[n];
            original_clearInterval(interval.currentId);
            var maxDelay = hijackedDelay(interval.delay);
            interval.currentId = original_setInterval(interval.wrappedCode, maxDelay);
        }

        // Reset all timeouts
        var timeouts = timerHijacking.activeTimeouts;
        for (var n = 0; n < timeouts.length; n++) {
            var timeout = timeouts[n];
            original_clearTimeout(timeout.originalId);
            var maxDelay = hijackedDelay(timeout.delay);
            timeout.currentId = original_setTimeout(timeout.wrappedCode, maxDelay);
        }
    };

    function wrapCode(code, args) {
        args = args ? Array.prototype.slice.call(args, 2) : [];
        return function () {
            if (code) {
                if (glitypename(code) == "String") {
                    original_setInterval(code, 0);
                    original_setInterval(host.frameTerminator.fire
                                             .bind(host.frameTerminator), 0);
                } else {
                    try {
                        code.apply(window, args);
                    } finally {
                        host.frameTerminator.fire();
                    }
                }
            }
        };
    };

    var original_setInterval = window.setInterval;
    window.setInterval = function (code, delay) {
        var maxDelay = hijackedDelay(delay);
        var wrappedCode = wrapCode(code, arguments);
        var intervalId = original_setInterval.apply(window, [wrappedCode, maxDelay]);
        timerHijacking.activeIntervals.push({
            originalId: intervalId,
            currentId: intervalId,
            code: code,
            wrappedCode: wrappedCode,
            delay: delay
        });
        return intervalId;
    };
    var original_clearInterval = window.clearInterval;
    window.clearInterval = function (intervalId) {
        for (var n = 0; n < timerHijacking.activeIntervals.length; n++) {
            if (timerHijacking.activeIntervals[n].originalId == intervalId) {
                var interval = timerHijacking.activeIntervals[n];
                timerHijacking.activeIntervals.splice(n, 1);
                return original_clearInterval.apply(window, [interval.currentId]);
            }
        }
        return original_clearInterval.apply(window, arguments);
    };
    var original_setTimeout = window.setTimeout;
    window.setTimeout = function (code, delay) {
        var maxDelay = hijackedDelay(delay);
        var wrappedCode = wrapCode(code, arguments);
        var cleanupCode = function () {
            // Need to remove from the active timeout list
            window.clearTimeout(timeoutId); // why is this here?
            wrappedCode();
        };
        var timeoutId = original_setTimeout.apply(window, [cleanupCode, maxDelay]);
        timerHijacking.activeTimeouts.push({
            originalId: timeoutId,
            currentId: timeoutId,
            code: code,
            wrappedCode: wrappedCode,
            delay: delay
        });
        return timeoutId;
    };
    var original_clearTimeout = window.clearTimeout;
    window.clearTimeout = function (timeoutId) {
        for (var n = 0; n < timerHijacking.activeTimeouts.length; n++) {
            if (timerHijacking.activeTimeouts[n].originalId == timeoutId) {
                var timeout = timerHijacking.activeTimeouts[n];
                timerHijacking.activeTimeouts.splice(n, 1);
                return original_clearTimeout.apply(window, [timeout.currentId]);
            }
        }
        return original_clearTimeout.apply(window, arguments);
    };

    // Some apps, like q3bsp, use the postMessage hack - because of that, we listen in and try to use it too
    // Note that there is a race condition here such that we may fire in BEFORE the app message, but oh well
    window.addEventListener("message", function () {
        host.frameTerminator.fire();
    }, false);

    // Support for requestAnimationFrame-like APIs
    var requestAnimationFrameNames = [
        "requestAnimationFrame",
        "webkitRequestAnimationFrame",
        "mozRequestAnimationFrame",
        "operaRequestAnimationFrame",
        "msAnimationFrame"
    ];
    for (var n = 0, len = requestAnimationFrameNames.length; n < len; ++n) {
        var name = requestAnimationFrameNames[n];
        if (window[name]) {
            (function(name) {
                var originalFn = window[name];
                var lastFrameTime = (new Date());
                window[name] = function(callback, element) {
                    var time = (new Date());
                    var delta = (time - lastFrameTime);
                    if (delta > timerHijacking.value) {
                        lastFrameTime = time;
                        var wrappedCallback = function() {
                            try {
                                callback.apply(window, arguments);
                            } finally {
                                host.frameTerminator.fire();
                            }
                        };
                        return originalFn.call(window, wrappedCallback, element);
                    } else {
                        window.setTimeout(function() {
                            callback(Date.now());
                        }, delta);
                        return null;
                    }
                };
            })(name);
        }
    }

    // Everything in the inspector should use these instead of the global values
    host.setInterval = function () {
        return original_setInterval.apply(window, arguments);
    };
    host.clearInterval = function () {
        return original_clearInterval.apply(window, arguments);
    };
    host.setTimeout = function () {
        return original_setTimeout.apply(window, arguments);
    };
    host.clearTimeout = function () {
        return original_clearTimeout.apply(window, arguments);
    };

    // options: {
    //     ignoreErrors: bool - ignore errors on calls (can drastically speed things up)
    //     breakOnError: bool - break on gl error
    //     resourceStacks: bool - collect resource creation/deletion callstacks
    //     callStacks: bool - collect callstacks for each call
    //     frameSeparators: ['finish'] / etc
    // }
    host.inspectContext = function (canvas, rawgl, options) {
        // Ignore if we have already wrapped the context
        if (rawgl.isWrapped) {
            // NOTE: if options differ we may want to unwrap and re-wrap
            return rawgl;
        }

        var wrapped = new CaptureContext(canvas, rawgl, options);

        return wrapped;
    };

})();
(function () {
    var host = glinamespace("gli.host");

    var stateParameters = null;
    function setupStateParameters(gl) {
        stateParameters = [
            { name: "ACTIVE_TEXTURE" },
            { name: "ALIASED_LINE_WIDTH_RANGE" },
            { name: "ALIASED_POINT_SIZE_RANGE" },
            { name: "ALPHA_BITS" },
            { name: "ARRAY_BUFFER_BINDING" },
            { name: "BLEND" },
            { name: "BLEND_COLOR" },
            { name: "BLEND_DST_ALPHA" },
            { name: "BLEND_DST_RGB" },
            { name: "BLEND_EQUATION_ALPHA" },
            { name: "BLEND_EQUATION_RGB" },
            { name: "BLEND_SRC_ALPHA" },
            { name: "BLEND_SRC_RGB" },
            { name: "BLUE_BITS" },
            { name: "COLOR_CLEAR_VALUE" },
            { name: "COLOR_WRITEMASK" },
            { name: "CULL_FACE" },
            { name: "CULL_FACE_MODE" },
            { name: "CURRENT_PROGRAM" },
            { name: "DEPTH_BITS" },
            { name: "DEPTH_CLEAR_VALUE" },
            { name: "DEPTH_FUNC" },
            { name: "DEPTH_RANGE" },
            { name: "DEPTH_TEST" },
            { name: "DEPTH_WRITEMASK" },
            { name: "DITHER" },
            { name: "ELEMENT_ARRAY_BUFFER_BINDING" },
            { name: "FRAMEBUFFER_BINDING" },
            { name: "FRONT_FACE" },
            { name: "GENERATE_MIPMAP_HINT" },
            { name: "GREEN_BITS" },
            { name: "LINE_WIDTH" },
            { name: "MAX_COMBINED_TEXTURE_IMAGE_UNITS" },
            { name: "MAX_CUBE_MAP_TEXTURE_SIZE" },
            { name: "MAX_FRAGMENT_UNIFORM_VECTORS" },
            { name: "MAX_RENDERBUFFER_SIZE" },
            { name: "MAX_TEXTURE_IMAGE_UNITS" },
            { name: "MAX_TEXTURE_SIZE" },
            { name: "MAX_VARYING_VECTORS" },
            { name: "MAX_VERTEX_ATTRIBS" },
            { name: "MAX_VERTEX_TEXTURE_IMAGE_UNITS" },
            { name: "MAX_VERTEX_UNIFORM_VECTORS" },
            { name: "MAX_VIEWPORT_DIMS" },
            { name: "PACK_ALIGNMENT" },
            { name: "POLYGON_OFFSET_FACTOR" },
            { name: "POLYGON_OFFSET_FILL" },
            { name: "POLYGON_OFFSET_UNITS" },
            { name: "RED_BITS" },
            { name: "RENDERBUFFER_BINDING" },
            { name: "RENDERER" },
            { name: "SAMPLE_BUFFERS" },
            { name: "SAMPLE_COVERAGE_INVERT" },
            { name: "SAMPLE_COVERAGE_VALUE" },
            { name: "SAMPLES" },
            { name: "SCISSOR_BOX" },
            { name: "SCISSOR_TEST" },
            { name: "SHADING_LANGUAGE_VERSION" },
            { name: "STENCIL_BACK_FAIL" },
            { name: "STENCIL_BACK_FUNC" },
            { name: "STENCIL_BACK_PASS_DEPTH_FAIL" },
            { name: "STENCIL_BACK_PASS_DEPTH_PASS" },
            { name: "STENCIL_BACK_REF" },
            { name: "STENCIL_BACK_VALUE_MASK" },
            { name: "STENCIL_BACK_WRITEMASK" },
            { name: "STENCIL_BITS" },
            { name: "STENCIL_CLEAR_VALUE" },
            { name: "STENCIL_FAIL" },
            { name: "STENCIL_FUNC" },
            { name: "STENCIL_PASS_DEPTH_FAIL" },
            { name: "STENCIL_PASS_DEPTH_PASS" },
            { name: "STENCIL_REF" },
            { name: "STENCIL_TEST" },
            { name: "STENCIL_VALUE_MASK" },
            { name: "STENCIL_WRITEMASK" },
            { name: "SUBPIXEL_BITS" },
            { name: "UNPACK_ALIGNMENT" },
            { name: "UNPACK_COLORSPACE_CONVERSION_WEBGL" },
            { name: "UNPACK_FLIP_Y_WEBGL" },
            { name: "UNPACK_PREMULTIPLY_ALPHA_WEBGL" },
            { name: "VENDOR" },
            { name: "VERSION" },
            { name: "VIEWPORT" }
        ];

        var maxTextureUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
        for (var n = 0; n < maxTextureUnits; n++) {
            var param = { name: "TEXTURE_BINDING_2D_" + n };
            param.getter = (function (n) {
                return function (gl) {
                    var existingBinding = gl.getParameter(gl.ACTIVE_TEXTURE);
                    gl.activeTexture(gl.TEXTURE0 + n);
                    var result = gl.getParameter(gl.TEXTURE_BINDING_2D);
                    gl.activeTexture(existingBinding);
                    return result;
                };
            })(n);
            stateParameters.push(param);
        }
        for (var n = 0; n < maxTextureUnits; n++) {
            var param = { name: "TEXTURE_BINDING_CUBE_MAP_" + n };
            param.getter = (function (n) {
                return function (gl) {
                    var existingBinding = gl.getParameter(gl.ACTIVE_TEXTURE);
                    gl.activeTexture(gl.TEXTURE0 + n);
                    var result = gl.getParameter(gl.TEXTURE_BINDING_CUBE_MAP);
                    gl.activeTexture(existingBinding);
                    return result;
                };
            })(n);
            stateParameters.push(param);
        }

        // Setup values
        for (var n = 0; n < stateParameters.length; n++) {
            var param = stateParameters[n];
            param.value = gl[param.name];
        }
    };

    function defaultGetParameter(gl, name) {
        try {
            return gl.getParameter(gl[name]);
        } catch (e) {
            console.log("unable to get state parameter " + name);
            return null;
        }
    };

    var StateSnapshot = function (gl) {
        if (stateParameters == null) {
            setupStateParameters(gl);
        }

        for (var n = 0; n < stateParameters.length; n++) {
            var param = stateParameters[n];
            var value = param.getter ? param.getter(gl) : defaultGetParameter(gl, param.name);
            this[param.value ? param.value : param.name] = value;
        }

        this.attribs = [];
        var attribEnums = [gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING, gl.VERTEX_ATTRIB_ARRAY_ENABLED, gl.VERTEX_ATTRIB_ARRAY_SIZE, gl.VERTEX_ATTRIB_ARRAY_STRIDE, gl.VERTEX_ATTRIB_ARRAY_TYPE, gl.VERTEX_ATTRIB_ARRAY_NORMALIZED, gl.CURRENT_VERTEX_ATTRIB];
        var maxVertexAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
        for (var n = 0; n < maxVertexAttribs; n++) {
            var values = {};
            for (var m = 0; m < attribEnums.length; m++) {
                values[attribEnums[m]] = gl.getVertexAttrib(n, attribEnums[m]);
                // TODO: replace buffer binding with ref
            }
            values[0] = gl.getVertexAttribOffset(n, gl.VERTEX_ATTRIB_ARRAY_POINTER);
            this.attribs.push(values);
        }
    };

    StateSnapshot.prototype.clone = function () {
        var cloned = {};
        for (var k in this) {
            cloned[k] = gli.util.clone(this[k]);
        }
        return cloned;
    };

    function getTargetValue(value) {
        if (value) {
            if (value.trackedObject) {
                return value.trackedObject.mirror.target;
            } else {
                return value;
            }
        } else {
            return null;
        }
    };

    StateSnapshot.prototype.apply = function (gl) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, getTargetValue(this[gl.FRAMEBUFFER_BINDING]));
        gl.bindRenderbuffer(gl.RENDERBUFFER, getTargetValue(this[gl.RENDERBUFFER_BINDING]));

        gl.viewport(this[gl.VIEWPORT][0], this[gl.VIEWPORT][1], this[gl.VIEWPORT][2], this[gl.VIEWPORT][3]);

        var maxTextureUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
        for (var n = 0; n < maxTextureUnits; n++) {
            gl.activeTexture(gl.TEXTURE0 + n);
            if (this["TEXTURE_BINDING_2D_" + n]) {
                gl.bindTexture(gl.TEXTURE_2D, getTargetValue(this["TEXTURE_BINDING_2D_" + n]));
            } else {
                gl.bindTexture(gl.TEXTURE_CUBE_MAP, getTargetValue(this["TEXTURE_BINDING_CUBE_MAP_" + n]));
            }
        }

        gl.clearColor(this[gl.COLOR_CLEAR_VALUE][0], this[gl.COLOR_CLEAR_VALUE][1], this[gl.COLOR_CLEAR_VALUE][2], this[gl.COLOR_CLEAR_VALUE][3]);
        gl.colorMask(this[gl.COLOR_WRITEMASK][0], this[gl.COLOR_WRITEMASK][1], this[gl.COLOR_WRITEMASK][2], this[gl.COLOR_WRITEMASK][3]);

        if (this[gl.DEPTH_TEST]) {
            gl.enable(gl.DEPTH_TEST);
        } else {
            gl.disable(gl.DEPTH_TEST);
        }
        gl.clearDepth(this[gl.DEPTH_CLEAR_VALUE]);
        gl.depthFunc(this[gl.DEPTH_FUNC]);
        gl.depthRange(this[gl.DEPTH_RANGE][0], this[gl.DEPTH_RANGE][1]);
        gl.depthMask(this[gl.DEPTH_WRITEMASK]);

        if (this[gl.BLEND]) {
            gl.enable(gl.BLEND);
        } else {
            gl.disable(gl.BLEND);
        }
        gl.blendColor(this[gl.BLEND_COLOR][0], this[gl.BLEND_COLOR][1], this[gl.BLEND_COLOR][2], this[gl.BLEND_COLOR][3]);
        gl.blendEquationSeparate(this[gl.BLEND_EQUATION_RGB], this[gl.BLEND_EQUATION_ALPHA]);
        gl.blendFuncSeparate(this[gl.BLEND_SRC_RGB], this[gl.BLEND_DST_RGB], this[gl.BLEND_SRC_ALPHA], this[gl.BLEND_DST_ALPHA]);

        //gl.DITHER, // ??????????????????????????????????????????????????????????

        if (this[gl.CULL_FACE]) {
            gl.enable(gl.CULL_FACE);
        } else {
            gl.disable(gl.CULL_FACE);
        }
        gl.cullFace(this[gl.CULL_FACE_MODE]);
        gl.frontFace(this[gl.FRONT_FACE]);

        gl.lineWidth(this[gl.LINE_WIDTH]);

        if (this[gl.POLYGON_OFFSET_FILL]) {
            gl.enable(gl.POLYGON_OFFSET_FILL);
        } else {
            gl.disable(gl.POLYGON_OFFSET_FILL);
        }
        gl.polygonOffset(this[gl.POLYGON_OFFSET_FACTOR], this[gl.POLYGON_OFFSET_UNITS]);

        if (this[gl.SAMPLE_COVERAGE]) {
            gl.enable(gl.SAMPLE_COVERAGE);
        } else {
            gl.disable(gl.SAMPLE_COVERAGE);
        }
        if (this[gl.SAMPLE_ALPHA_TO_COVERAGE]) {
            gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE);
        } else {
            gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE);
        }
        gl.sampleCoverage(this[gl.SAMPLE_COVERAGE_VALUE], this[gl.SAMPLE_COVERAGE_INVERT]);

        if (this[gl.SCISSOR_TEST]) {
            gl.enable(gl.SCISSOR_TEST);
        } else {
            gl.disable(gl.SCISSOR_TEST);
        }
        gl.scissor(this[gl.SCISSOR_BOX][0], this[gl.SCISSOR_BOX][1], this[gl.SCISSOR_BOX][2], this[gl.SCISSOR_BOX][3]);

        if (this[gl.STENCIL_TEST]) {
            gl.enable(gl.STENCIL_TEST);
        } else {
            gl.disable(gl.STENCIL_TEST);
        }
        gl.clearStencil(this[gl.STENCIL_CLEAR_VALUE]);
        gl.stencilFuncSeparate(gl.FRONT, this[gl.STENCIL_FUNC], this[gl.STENCIL_REF], this[gl.STENCIL_VALUE_MASK]);
        gl.stencilFuncSeparate(gl.BACK, this[gl.STENCIL_BACK_FUNC], this[gl.STENCIL_BACK_REF], this[gl.STENCIL_BACK_VALUE_MASK]);
        gl.stencilOpSeparate(gl.FRONT, this[gl.STENCIL_FAIL], this[gl.STENCIL_PASS_DEPTH_FAIL], this[gl.STENCIL_PASS_DEPTH_PASS]);
        gl.stencilOpSeparate(gl.BACK, this[gl.STENCIL_BACK_FAIL], this[gl.STENCIL_BACK_PASS_DEPTH_FAIL], this[gl.STENCIL_BACK_PASS_DEPTH_PASS]);
        gl.stencilMaskSeparate(gl.FRONT, this[gl.STENCIL_WRITEMASK]);
        gl.stencilMaskSeparate(gl.BACK, this[gl.STENCIL_BACK_WRITEMASK]);

        gl.hint(gl.GENERATE_MIPMAP_HINT, this[gl.GENERATE_MIPMAP_HINT]);

        gl.pixelStorei(gl.PACK_ALIGNMENT, this[gl.PACK_ALIGNMENT]);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, this[gl.UNPACK_ALIGNMENT]);
        //gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, this[gl.UNPACK_COLORSPACE_CONVERSION_WEBGL]); ////////////////////// NOT YET SUPPORTED IN SOME BROWSERS
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, this[gl.UNPACK_FLIP_Y_WEBGL]);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, this[gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL]);

        var program = getTargetValue(this[gl.CURRENT_PROGRAM]);
        // HACK: if not linked, try linking
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            gl.linkProgram(program);
        }
        gl.useProgram(program);

        for (var n = 0; n < this.attribs.length; n++) {
            var values = this.attribs[n];
            if (values[gl.VERTEX_ATTRIB_ARRAY_ENABLED]) {
                gl.enableVertexAttribArray(n);
            } else {
                gl.disableVertexAttribArray(n);
            }
            if (values[gl.CURRENT_VERTEX_ATTRIB]) {
                gl.vertexAttrib4fv(n, values[gl.CURRENT_VERTEX_ATTRIB]);
            }
            var buffer = getTargetValue(values[gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING]);
            if (buffer) {
                gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
                gl.vertexAttribPointer(n, values[gl.VERTEX_ATTRIB_ARRAY_SIZE], values[gl.VERTEX_ATTRIB_ARRAY_TYPE], values[gl.VERTEX_ATTRIB_ARRAY_NORMALIZED], values[gl.VERTEX_ATTRIB_ARRAY_STRIDE], values[0]);
            }
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, getTargetValue(this[gl.ARRAY_BUFFER_BINDING]));
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, getTargetValue(this[gl.ELEMENT_ARRAY_BUFFER_BINDING]));

        gl.activeTexture(this[gl.ACTIVE_TEXTURE]);
    };

    host.StateSnapshot = StateSnapshot;
})();
(function () {
    var host = glinamespace("gli.host");

    var CallType = {
        MARK: 0,
        GL: 1
    };

    var Call = function (ordinal, type, name, sourceArgs, frame) {
        this.ordinal = ordinal;
        this.time = (new Date()).getTime();

        this.type = type;
        this.name = name;
        this.stack = null;

        this.isRedundant = false;

        // Clone arguments
        var args = [];
        for (var n = 0; n < sourceArgs.length; n++) {
            if (sourceArgs[n] && sourceArgs[n].sourceUniformName) {
                args[n] = sourceArgs[n]; // TODO: pull out uniform reference
            } else {
                args[n] = gli.util.clone(sourceArgs[n]);

                if (gli.util.isWebGLResource(args[n])) {
                    var tracked = args[n].trackedObject;
                    args[n] = tracked;

                    // TODO: mark resource access based on type
                    if (true) {
                        frame.markResourceRead(tracked);
                    }
                    if (true) {
                        frame.markResourceWrite(tracked);
                    }
                }
            }
        }
        this.args = args;

        // Set upon completion
        this.duration = 0;
        this.result = null;
        this.error = null;
    };

    Call.prototype.complete = function (result, error, stack) {
        this.duration = (new Date()).getTime() - this.time;
        this.result = result;
        this.error = error;
        this.stack = stack;
    };

    Call.prototype.transformArgs = function (gl) {
        var args = [];
        for (var n = 0; n < this.args.length; n++) {
            args[n] = this.args[n];

            if (args[n]) {
                if (args[n].mirror) {
                    // Translate from resource -> mirror target
                    args[n] = args[n].mirror.target;
                } else if (args[n].sourceUniformName) {
                    // Get valid uniform location on new context
                    args[n] = gl.getUniformLocation(args[n].sourceProgram.mirror.target, args[n].sourceUniformName);
                }
            }
        }
        return args;
    };

    Call.prototype.emit = function (gl) {
        var args = this.transformArgs(gl);

        //while (gl.getError() != gl.NO_ERROR);

        // TODO: handle result?
        try {
            gl[this.name].apply(gl, args);
        } catch (e) {
            console.log("exception during replay of " + this.name + ": " + e);
        }
        //console.log("call " + call.name);

        //var error = gl.getError();
        //if (error != gl.NO_ERROR) {
        //    console.log(error);
        //}
    };

    var Frame = function (canvas, rawgl, frameNumber, resourceCache) {
        var attrs = rawgl.getContextAttributes ? rawgl.getContextAttributes() : {};
        this.canvasInfo = {
            width: canvas.width,
            height: canvas.height,
            attributes: attrs
        };

        this.frameNumber = frameNumber;
        this.initialState = new gli.host.StateSnapshot(rawgl);
        this.screenshot = null;

        this.hasCheckedRedundancy = false;
        this.redundantCalls = 0;

        this.resourcesUsed = [];
        this.resourcesRead = [];
        this.resourcesWritten = [];

        this.calls = [];

        // Mark all bound resources as read
        for (var n in this.initialState) {
            var value = this.initialState[n];
            if (gli.util.isWebGLResource(value)) {
                this.markResourceRead(value.trackedObject);
                // TODO: differentiate between framebuffers (as write) and the reads
            }
        }
        for (var n = 0; n < this.initialState.attribs.length; n++) {
            var attrib = this.initialState.attribs[n];
            for (var m in attrib) {
                var value = attrib[m];
                if (gli.util.isWebGLResource(value)) {
                    this.markResourceRead(value.trackedObject);
                }
            }
        }

        this.resourceVersions = resourceCache.captureVersions();
        this.captureUniforms(rawgl, resourceCache.getPrograms());
    };

    Frame.prototype.captureUniforms = function (rawgl, allPrograms) {
        // Capture all program uniforms - nasty, but required to get accurate playback when not all uniforms are set each frame
        this.uniformValues = [];
        for (var n = 0; n < allPrograms.length; n++) {
            var program = allPrograms[n];
            var target = program.target;
            var values = {};

            var uniformCount = rawgl.getProgramParameter(target, rawgl.ACTIVE_UNIFORMS);
            for (var m = 0; m < uniformCount; m++) {
                var activeInfo = rawgl.getActiveUniform(target, m);
                if (activeInfo) {
                    var loc = rawgl.getUniformLocation(target, activeInfo.name);
                    var value = rawgl.getUniform(target, loc);
                    values[activeInfo.name] = {
                        size: activeInfo.size,
                        type: activeInfo.type,
                        value: value
                    };
                }
            }

            this.uniformValues.push({
                program: program,
                values: values
            });
        }
    };

    Frame.prototype.applyUniforms = function (gl) {
        var originalProgram = gl.getParameter(gl.CURRENT_PROGRAM);

        for (var n = 0; n < this.uniformValues.length; n++) {
            var program = this.uniformValues[n].program;
            var values = this.uniformValues[n].values;

            var target = program.mirror.target;
            if (!target) {
                continue;
            }

            gl.useProgram(target);

            for (var name in values) {
                var data = values[name];
                var loc = gl.getUniformLocation(target, name);

                var baseName = "uniform";
                var type;
                var size;
                switch (data.type) {
                    case gl.FLOAT:
                        type = "f";
                        size = 1;
                        break;
                    case gl.FLOAT_VEC2:
                        type = "f";
                        size = 2;
                        break;
                    case gl.FLOAT_VEC3:
                        type = "f";
                        size = 3;
                        break;
                    case gl.FLOAT_VEC4:
                        type = "f";
                        size = 4;
                        break;
                    case gl.INT:
                    case gl.BOOL:
                        type = "i";
                        size = 1;
                        break;
                    case gl.INT_VEC2:
                    case gl.BOOL_VEC2:
                        type = "i";
                        size = 2;
                        break;
                    case gl.INT_VEC3:
                    case gl.BOOL_VEC3:
                        type = "i";
                        size = 3;
                        break;
                    case gl.INT_VEC4:
                    case gl.BOOL_VEC4:
                        type = "i";
                        size = 4;
                        break;
                    case gl.FLOAT_MAT2:
                        baseName += "Matrix";
                        type = "f";
                        size = 2;
                        break;
                    case gl.FLOAT_MAT3:
                        baseName += "Matrix";
                        type = "f";
                        size = 3;
                        break;
                    case gl.FLOAT_MAT4:
                        baseName += "Matrix";
                        type = "f";
                        size = 4;
                        break;
                    case gl.SAMPLER_2D:
                    case gl.SAMPLER_CUBE:
                        type = "i";
                        size = 1;
                        break;
                }
                var funcName = baseName + size + type;
                if (data.value && data.value.length !== undefined) {
                    funcName += "v";
                }
                if (baseName.indexOf("Matrix") != -1) {
                    gl[funcName].apply(gl, [loc, false, data.value]);
                } else {
                    gl[funcName].apply(gl, [loc, data.value]);
                }
            }
        }

        gl.useProgram(originalProgram);
    };

    Frame.prototype.end = function (rawgl) {
        var canvas = rawgl.canvas;

        // Take a picture! Note, this may fail for many reasons, but seems ok right now
        this.screenshot = document.createElement("canvas");
        var frag = document.createDocumentFragment();
        frag.appendChild(this.screenshot);
        this.screenshot.width = canvas.width;
        this.screenshot.height = canvas.height;
        var ctx2d = this.screenshot.getContext("2d");
        ctx2d.clearRect(0, 0, canvas.width, canvas.height);
        ctx2d.drawImage(canvas, 0, 0);
    };

    Frame.prototype.mark = function (args) {
        var call = new Call(this.calls.length, CallType.MARK, "mark", args, this);
        this.calls.push(call);
        call.complete(undefined, undefined); // needed?
        return call;
    };

    Frame.prototype.allocateCall = function (name, args) {
        var call = new Call(this.calls.length, CallType.GL, name, args, this);
        this.calls.push(call);
        return call;
    };

    Frame.prototype.findResourceVersion = function (resource) {
        for (var n = 0; n < this.resourceVersions.length; n++) {
            if (this.resourceVersions[n].resource == resource) {
                return this.resourceVersions[n].value;
            }
        }
        return null;
    };

    Frame.prototype.findResourceUsages = function (resource) {
        // Quick check to see if we have it marked as being used
        if (this.resourcesUsed.indexOf(resource) == -1) {
            // Unused this frame
            return null;
        }

        // Search all call args
        var usages = [];
        for (var n = 0; n < this.calls.length; n++) {
            var call = this.calls[n];
            for (var m = 0; m < call.args.length; m++) {
                if (call.args[m] == resource) {
                    usages.push(call);
                }
            }
        }
        return usages;
    };

    Frame.prototype.markResourceRead = function (resource) {
        // TODO: faster check (this can affect performance)
        if (resource) {
            if (this.resourcesUsed.indexOf(resource) == -1) {
                this.resourcesUsed.push(resource);
            }
            if (this.resourcesRead.indexOf(resource) == -1) {
                this.resourcesRead.push(resource);
            }
            if (resource.getDependentResources) {
                var dependentResources = resource.getDependentResources();
                for (var n = 0; n < dependentResources.length; n++) {
                    this.markResourceRead(dependentResources[n]);
                }
            }
        }
    };

    Frame.prototype.markResourceWrite = function (resource) {
        // TODO: faster check (this can affect performance)
        if (resource) {
            if (this.resourcesUsed.indexOf(resource) == -1) {
                this.resourcesUsed.push(resource);
            }
            if (this.resourcesWritten.indexOf(resource) == -1) {
                this.resourcesWritten.push(resource);
            }
            if (resource.getDependentResources) {
                var dependentResources = resource.getDependentResources();
                for (var n = 0; n < dependentResources.length; n++) {
                    this.markResourceWrite(dependentResources[n]);
                }
            }
        }
    };

    Frame.prototype.getResourcesUsedOfType = function (typename) {
        var results = [];
        for (var n = 0; n < this.resourcesUsed.length; n++) {
            var resource = this.resourcesUsed[n];
            if (!resource.target) {
                continue;
            }
            if (typename == glitypename(resource.target)) {
                results.push(resource);
            }
        }
        return results;
    };

    Frame.prototype._lookupResourceVersion = function (resource) {
        // TODO: faster lookup
        for (var m = 0; m < this.resourceVersions.length; m++) {
            if (this.resourceVersions[m].resource.id === resource.id) {
                return this.resourceVersions[m].value;
            }
        }
        return null;
    };

    Frame.prototype.makeActive = function (gl, force, options, exclusions) {
        options = options || {};
        exclusions = exclusions || [];

        // Sort resources by creation order - this ensures that shaders are ready before programs, etc
        // Since dependencies are fairly straightforward, this *should* be ok
        // 0 - Buffer
        // 1 - Texture
        // 2 - Renderbuffer
        // 3 - Framebuffer
        // 4 - Shader
        // 5 - Program
        this.resourcesUsed.sort(function (a, b) {
            return a.creationOrder - b.creationOrder;
        });

        for (var n = 0; n < this.resourcesUsed.length; n++) {
            var resource = this.resourcesUsed[n];
            if (exclusions.indexOf(resource) != -1) {
                continue;
            }

            var version = this._lookupResourceVersion(resource);
            if (!version) {
                continue;
            }

            resource.restoreVersion(gl, version, force, options);
        }

        this.initialState.apply(gl);
        this.applyUniforms(gl);
    };

    Frame.prototype.cleanup = function (gl) {
        // Unbind everything
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        gl.useProgram(null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        var maxVertexAttrs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
        var dummyBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, dummyBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(12), gl.STATIC_DRAW);
        for (var n = 0; n < maxVertexAttrs; n++) {
            gl.vertexAttribPointer(0, 1, gl.FLOAT, false, 0, 0);
        }
        gl.deleteBuffer(dummyBuffer);
        var maxTextureUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
        for (var n = 0; n < maxTextureUnits; n++) {
            gl.activeTexture(gl.TEXTURE0 + n);
            gl.bindTexture(gl.TEXTURE_2D, null);
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
        }

        // Dispose all objects
        for (var n = 0; n < this.resourcesUsed.length; n++) {
            var resource = this.resourcesUsed[n];
            resource.disposeMirror();
        }
    };

    Frame.prototype.switchMirrors = function (setName) {
        for (var n = 0; n < this.resourcesUsed.length; n++) {
            var resource = this.resourcesUsed[n];
            resource.switchMirror(setName);
        }
    };

    Frame.prototype.resetAllMirrors = function () {
        for (var n = 0; n < this.resourcesUsed.length; n++) {
            var resource = this.resourcesUsed[n];
            resource.disposeAllMirrors();
        }
    };

    host.CallType = CallType;
    host.Call = Call;
    host.Frame = Frame;
})();
(function () {
    var host = glinamespace("gli.host");

    function requestCapture(context) {
        context.requestCapture(function (context, frame) {
            for (var n = 0, len = frame.calls.length; n < len; ++n) {
                var call = frame.calls[n];
                call.info = gli.info.functions[call.name];
            }
            if (!context.ui.tabs.trace.traceView.inspector) {
              context.ui.tabs.trace.createInspector();
            }
            context.frames.push(frame);
            if (context.ui) {
                context.ui.appendFrame(frame);
            }
        });
    };

    var InlineWindow = function (context) {
        var self = this;
        this.context = context;

        var w = this.element = document.createElement("div");
        w.className = "yui3-cssreset inline-window-host";

        // TODO: validate height better?
        var hudHeight = gli.settings.session.hudHeight;
        hudHeight = Math.max(112, Math.min(hudHeight, window.innerHeight - 42));
        w.style.height = hudHeight + "px";

        document.body.appendChild(w);

        this.splitter = new gli.controls.SplitterBar(w, "horizontal", 112, 42, null, function (newHeight) {
            context.ui.layout();
            gli.settings.session.hudHeight = newHeight;
            gli.settings.save();
        });

        if (window["gliloader"]) {
            gliloader.load(["ui_css"], function () { }, window);
        }

        context.ui = new gli.ui.Window(context, window.document, w);

        this.opened = true;
        gli.settings.session.hudVisible = true;
        gli.settings.save();
    };
    InlineWindow.prototype.focus = function () {
    };
    InlineWindow.prototype.close = function () {
        if (this.element) {
            document.body.removeChild(this.element);

            this.context.ui = null;
            this.context.window = null;

            this.element = null;
            this.context = null;
            this.splitter = null;
            this.opened = false;
            gli.settings.session.hudVisible = false;
            gli.settings.save();
        }
    };
    InlineWindow.prototype.isOpened = function () {
        return this.opened;
    };
    InlineWindow.prototype.toggle = function () {
        if (this.opened) {
            this.element.style.display = "none";
        } else {
            this.element.style.display = "";
        }
        this.opened = !this.opened;
        gli.settings.session.hudVisible = this.opened;
        gli.settings.save();

        var self = this;
        gli.host.setTimeout(function () {
            self.context.ui.layout();
        }, 0);
    };

    var PopupWindow = function (context) {
        var self = this;
        this.context = context;

        gli.settings.session.hudVisible = true;
        gli.settings.save();

        var startupWidth = gli.settings.session.hudPopupWidth ? gli.settings.session.hudPopupWidth : 1000;
        var startupHeight = gli.settings.session.hudPopupHeight ? gli.settings.session.hudPopupHeight : 500;
        var w = this.browserWindow = window.open("about:blank", "_blank", "location=no,menubar=no,scrollbars=no,status=no,toolbar=no,innerWidth=" + startupWidth + ",innerHeight=" + startupHeight);
        w.document.writeln("<html><head><title>WebGL Inspector</title></head><body class='yui3-cssreset' style='margin: 0px; padding: 0px;'></body></html>");

        window.addEventListener("beforeunload", function () {
            w.close();
        }, false);

        w.addEventListener("unload", function () {
            context.window.browserWindow.opener.focus();
            context.window = null;
        }, false);

        // Key handler to listen for state changes
        w.document.addEventListener("keydown", function (event) {
            var handled = false;
            switch (event.keyCode) {
                case 122: // F11
                    w.opener.focus();
                    handled = true;
                    break;
                case 123: // F12
                    requestCapture(context);
                    handled = true;
                    break;
            };

            if (handled) {
                event.preventDefault();
                event.stopPropagation();
            }
        }, false);

        w.addEventListener("resize", function () {
            context.ui.layout();
            gli.settings.session.hudPopupWidth = w.innerWidth;
            gli.settings.session.hudPopupHeight = w.innerHeight;
            gli.settings.save()
        }, false);

        w.gli = window.gli;

        if (window["gliloader"]) {
            gliloader.load(["ui_css"], function () { }, w);
        }

        gli.host.setTimeout(function () {
            context.ui = new w.gli.ui.Window(context, w.document);
        }, 0);
    };
    PopupWindow.prototype.focus = function () {
        this.browserWindow.focus();
    };
    PopupWindow.prototype.close = function () {
        this.browserWindow.close();
        this.browserWindow = null;
        this.context.window = null;
        gli.settings.session.hudVisible = false;
        gli.settings.save();
    };
    PopupWindow.prototype.isOpened = function () {
        return this.browserWindow && !this.browserWindow.closed;
    };

    function requestFullUI(context, hiddenByDefault) {
        if (gli.settings.global.popupHud) {
            if (context.window) {
                if (context.window.isOpened()) {
                    context.window.focus();
                } else {
                    context.window.close();
                }
            }

            if (!context.window) {
                if (!hiddenByDefault) {
                    context.window = new PopupWindow(context);
                }
            }
        } else {
            if (!context.window) {
                context.window = new InlineWindow(context);
                if (hiddenByDefault) {
                    context.window.toggle();
                }
            } else {
                context.window.toggle();
            }
        }
    };

    function injectUI(ui) {
        var context = ui.context;

        var button1 = document.createElement("div");
        button1.style.zIndex = "99999";
        button1.style.position = "absolute";
        button1.style.right = "38px";
        button1.style.top = "5px";
        button1.style.cursor = "pointer";
        button1.style.backgroundColor = "rgba(50,10,10,0.8)";
        button1.style.color = "red";
        button1.style.fontSize = "8pt";
        button1.style.fontFamily = "Monaco, 'Andale Mono', 'Monotype.com', monospace";
        button1.style.fontWeight = "bold";
        button1.style.padding = "5px";
        button1.style.border = "1px solid red";
        button1.style.webkitUserSelect = "none";
        button1.style.mozUserSelect = "none";
        button1.title = "Capture frame (F12)";
        button1.textContent = "Capture";
        document.body.appendChild(button1);

        button1.addEventListener("click", function () {
            requestCapture(context);
        });

        var button2 = document.createElement("div");
        button2.style.zIndex = "99999";
        button2.style.position = "absolute";
        button2.style.right = "5px";
        button2.style.top = "5px";
        button2.style.cursor = "pointer";
        button2.style.backgroundColor = "rgba(10,50,10,0.8)";
        button2.style.color = "rgb(0,255,0)";
        button2.style.fontSize = "8pt";
        button2.style.fontFamily = "Monaco, 'Andale Mono', 'Monotype.com', monospace";
        button2.style.fontWeight = "bold";
        button2.style.padding = "5px";
        button2.style.border = "1px solid rgb(0,255,0)";
        button2.style.webkitUserSelect = "none";
        button2.style.mozUserSelect = "none";
        button2.title = "Show full inspector (F11)";
        button2.textContent = "UI";
        document.body.appendChild(button2);

        button2.addEventListener("click", function () {
            requestFullUI(context);
        }, false);
    };

    function injectHandlers(ui) {
        var context = ui.context;

        // Key handler to listen for capture requests
        document.addEventListener("keydown", function (event) {
            var handled = false;
            switch (event.keyCode) {
                case 122: // F11
                    requestFullUI(context);
                    handled = true;
                    break;
                case 123: // F12
                    requestCapture(context);
                    handled = true;
                    break;
            };

            if (handled) {
                event.preventDefault();
                event.stopPropagation();
            }
        }, false);
    };

    var HostUI = function (context) {
        this.context = context;

        injectUI(this);
        injectHandlers(this);

        this.context.frames = [];

        var spinIntervalId;
        spinIntervalId = gli.host.setInterval(function () {
            var ready = false;
            var cssUrl = null;
            if (window["gliloader"]) {
                cssUrl = gliloader.pathRoot;
            } else {
                cssUrl = window.gliCssUrl;
            }
            ready = cssUrl && cssUrl.length;
            if (ready) {
                var hudVisible = gli.settings.session.hudVisible || gli.settings.global.showHud;
                requestFullUI(context, !hudVisible);
                gli.host.clearInterval(spinIntervalId);
            }
        }, 16);
    };

    host.requestFullUI = requestFullUI;
    host.HostUI = HostUI;
})();
(function () {
    var host = glinamespace("gli.host");

    var Notifier = function () {
        this.div = document.createElement("div");
        this.div.style.zIndex = "99999";
        this.div.style.position = "absolute";
        this.div.style.left = "5px";
        this.div.style.top = "5px";
        this.div.style.webkitTransition = "opacity .5s ease-in-out";
        this.div.style.opacity = "0";
        this.div.style.color = "yellow";
        this.div.style.fontSize = "8pt";
        this.div.style.fontFamily = "Monaco, 'Andale Mono', 'Monotype.com', monospace";
        this.div.style.backgroundColor = "rgba(0,0,0,0.8)";
        this.div.style.padding = "5px";
        this.div.style.border = "1px solid yellow";
        document.body.appendChild(this.div);

        this.hideTimeout = -1;
    };

    Notifier.prototype.postMessage = function(message) {
        console.log(message);
        this.div.style.opacity = "1";
        this.div.textContent = message;

        var self = this;
        if (this.hideTimeout >= 0) {
            gli.host.clearTimeout(this.hideTimeout);
            this.hideTimeout = -1;
        }
        this.hideTimeout = gli.host.setTimeout(function() {
            self.div.style.opacity = "0";
        }, 2000);
    };

    host.Notifier = Notifier;
})();
(function () {
    var host = glinamespace("gli.host");

    var ResourceVersion = function () {
        this.versionNumber = 0;
        this.target = null;
        this.parameters = {};
        this.calls = [];
        this.extras = {};
    };

    ResourceVersion.prototype.setParameters = function (params) {
        this.parameters = {};
        for (var n in params) {
            this.parameters[n] = params[n];
        }
    };

    ResourceVersion.prototype.setExtraParameters = function (name, params) {
        this.extras[name] = {};
        for (var n in params) {
            this.extras[name][n] = params[n];
        }
    };

    ResourceVersion.prototype.pushCall = function (name, sourceArgs) {
        var args = [];
        for (var n = 0; n < sourceArgs.length; n++) {
            args[n] = gli.util.clone(sourceArgs[n]);

            if (gli.util.isWebGLResource(args[n])) {
                var tracked = args[n].trackedObject;
                args[n] = tracked;
            }
        }
        var call = new gli.host.Call(this.calls.length, gli.host.CallType.GL, name, args);
        call.info = gli.info.functions[call.name];
        call.complete(); // needed?
        this.calls.push(call);
    };

    ResourceVersion.prototype.clone = function () {
        var clone = new ResourceVersion();
        clone.target = this.target;
        clone.setParameters(this.parameters);
        for (var n = 0; n < this.calls.length; n++) {
            clone.calls[n] = this.calls[n];
        }
        for (var n in this.extras) {
            clone.setExtraParameters(n, this.extras[n]);
        }
        return clone;
    };

    // Incrmeents with each resource allocated
    var uniqueId = 0;

    var Resource = function (gl, frameNumber, stack, target) {
        this.id = uniqueId++;
        this.status = Resource.ALIVE;

        this.defaultName = "res " + this.id;

        this.target = target;
        target.trackedObject = this;

        this.mirror = {
            gl: null,
            target: null,
            version: null
        };
        this.mirrorSets = {};
        this.mirrorSets["default"] = this.mirror;

        this.creationFrameNumber = frameNumber;
        this.creationStack = stack;
        this.deletionStack = null;

        // previousVersion is the previous version that was captured
        // currentVersion is the version as it is at the current point in time
        this.previousVersion = null;
        this.currentVersion = new ResourceVersion();
        this.versionNumber = 0;
        this.dirty = true;

        this.modified = new gli.EventSource("modified");
        this.deleted = new gli.EventSource("deleted");
    };

    Resource.ALIVE = 0;
    Resource.DEAD = 1;

    Resource.prototype.getName = function () {
        if (this.target.displayName) {
            return this.target.displayName;
        } else {
            return this.defaultName;
        }
    };

    Resource.prototype.setName = function (name, ifNeeded) {
        if (!ifNeeded && this.target.displayName && this.target.displayName !== name) {
            this.target.displayName = name;
            this.modified.fireDeferred(this);
        }
    };

    Resource.prototype.captureVersion = function () {
        this.dirty = false;
        return this.currentVersion;
    };

    Resource.prototype.markDirty = function (reset) {
        if (!this.dirty) {
            this.previousVersion = this.currentVersion;
            this.currentVersion = reset ? new ResourceVersion() : this.previousVersion.clone();
            this.versionNumber++;
            this.currentVersion.versionNumber = this.versionNumber;
            this.dirty = true;
            this.cachedPreview = null; // clear a preview if we have one
            this.modified.fireDeferred(this);
        } else {
            if (reset) {
                this.currentVersion = new ResourceVersion();
            }
            this.modified.fireDeferred(this);
        }
    };

    Resource.prototype.markDeleted = function (stack) {
        this.status = Resource.DEAD;
        this.deletionStack = stack;

        // TODO: hang on to object?
        //this.target = null;

        this.deleted.fireDeferred(this);
    };

    Resource.prototype.restoreVersion = function (gl, version, force, options) {
        if (force || (this.mirror.version != version)) {
            this.disposeMirror();

            this.mirror.gl = gl;
            this.mirror.version = version;
            this.mirror.target = this.createTarget(gl, version, options);
            this.mirror.target.trackedObject = this;
        } else {
            // Already at the current version
        }
    };

    Resource.prototype.switchMirror = function (setName) {
        setName = setName || "default";
        var oldMirror = this.mirror;
        var newMirror = this.mirrorSets[setName];
        if (oldMirror == newMirror) {
            return;
        }
        if (!newMirror) {
            newMirror = {
                gl: null,
                target: null,
                version: null
            };
            this.mirrorSets[setName] = newMirror;
        }
        this.mirror = newMirror;
    };

    Resource.prototype.disposeMirror = function () {
        if (this.mirror.target) {
            this.deleteTarget(this.mirror.gl, this.mirror.target);
            this.mirror.gl = null;
            this.mirror.target = null;
            this.mirror.version = null;
        }
    };

    Resource.prototype.disposeAllMirrors = function () {
        for (var setName in this.mirrorSets) {
            var mirror = this.mirrorSets[setName];
            if (mirror && mirror.target) {
                this.deleteTarget(mirror.gl, mirror.target);
                mirror.gl = null;
                mirror.target = null;
                mirror.version = null;
            }
        }
    };

    Resource.prototype.createTarget = function (gl, version, options) {
        console.log("unimplemented createTarget");
        return null;
    };

    Resource.prototype.deleteTarget = function (gl, target) {
        console.log("unimplemented deleteTarget");
    };

    Resource.prototype.replayCalls = function (gl, version, target, filter) {
        for (var n = 0; n < version.calls.length; n++) {
            var call = version.calls[n];

            var args = [];
            for (var m = 0; m < call.args.length; m++) {
                // TODO: unpack refs?
                args[m] = call.args[m];
                if (args[m] == this) {
                    args[m] = target;
                } else if (args[m] && args[m].mirror) {
                    args[m] = args[m].mirror.target;
                }
            }

            if (filter) {
                if (filter(call, args) == false) {
                    continue;
                }
            }

            gl[call.name].apply(gl, args);
        }
    }

    host.ResourceVersion = ResourceVersion;
    host.Resource = Resource;
})();
(function () {
    var host = glinamespace("gli.host");
    var resources = glinamespace("gli.resources");

    function setCaptures(cache, context) {
        var gl = context; //.rawgl;

        var generateStack;
        if (context.options.resourceStacks) {
            generateStack = function () {
                // Generate stack trace
                var stack = printStackTrace();
                // ignore garbage
                stack = stack.slice(4);
                // Fix up our type
                stack[0] = stack[0].replace("[object Object].", "gl.");
                return stack;
            };
        } else {
            generateStack = function () { return null; }
        }

        function captureCreateDelete(typeName) {
            var originalCreate = gl["create" + typeName];
            gl["create" + typeName] = function () {
                // Track object count
                gl.statistics[typeName.toLowerCase() + "Count"].value++;

                var result = originalCreate.apply(gl, arguments);
                var tracked = new resources[typeName](gl, context.frameNumber, generateStack(), result, arguments);
                if (tracked) {
                    cache.registerResource(tracked);
                }
                return result;
            };
            var originalDelete = gl["delete" + typeName];
            gl["delete" + typeName] = function () {
                // Track object count
                gl.statistics[typeName.toLowerCase() + "Count"].value--;

                var tracked = arguments[0] ? arguments[0].trackedObject : null;
                if (tracked) {
                    // Track total buffer and texture bytes consumed
                    if (typeName == "Buffer") {
                        gl.statistics.bufferBytes.value -= tracked.estimatedSize;
                    } else if (typeName == "Texture") {
                        gl.statistics.textureBytes.value -= tracked.estimatedSize;
                    }

                    tracked.markDeleted(generateStack());
                }
                originalDelete.apply(gl, arguments);
            };
        };

        captureCreateDelete("Buffer");
        captureCreateDelete("Framebuffer");
        captureCreateDelete("Program");
        captureCreateDelete("Renderbuffer");
        captureCreateDelete("Shader");
        captureCreateDelete("Texture");

        var glvao = gl.getExtension("OES_vertex_array_object");
        if (glvao) {
            (function() {
                var originalCreate = glvao.createVertexArrayOES;
                glvao.createVertexArrayOES = function () {
                    // Track object count
                    gl.statistics["vertexArrayObjectCount"].value++;

                    var result = originalCreate.apply(glvao, arguments);
                    var tracked = new resources.VertexArrayObjectOES(gl, context.frameNumber, generateStack(), result, arguments);
                    if (tracked) {
                        cache.registerResource(tracked);
                    }
                    return result;
                };
                var originalDelete = glvao.deleteVertexArrayOES;
                glvao.deleteVertexArrayOES = function () {
                    // Track object count
                    gl.statistics["vertexArrayObjectCount"].value--;

                    var tracked = arguments[0] ? arguments[0].trackedObject : null;
                    if (tracked) {
                        tracked.markDeleted(generateStack());
                    }
                    originalDelete.apply(glvao, arguments);
                };
            })();
        }

        resources.Buffer.setCaptures(gl);
        resources.Framebuffer.setCaptures(gl);
        resources.Program.setCaptures(gl);
        resources.Renderbuffer.setCaptures(gl);
        resources.Shader.setCaptures(gl);
        resources.Texture.setCaptures(gl);
        resources.VertexArrayObjectOES.setCaptures(gl);
    };

    var ResourceCache = function (context) {
        this.context = context;

        this.resources = [];

        this.resourceRegistered = new gli.EventSource("resourceRegistered");

        setCaptures(this, context);
    };

    ResourceCache.prototype.registerResource = function (resource) {
        this.resources.push(resource);
        this.resourceRegistered.fire(resource);
    };

    ResourceCache.prototype.captureVersions = function () {
        var allResources = [];
        for (var n = 0; n < this.resources.length; n++) {
            var resource = this.resources[n];
            allResources.push({
                resource: resource,
                value: resource.captureVersion()
            });
        }
        return allResources;
    };

    ResourceCache.prototype.getResources = function (name) {
        var selectedResources = [];
        for (var n = 0; n < this.resources.length; n++) {
            var resource = this.resources[n];
            var typename = glitypename(resource.target);
            if (typename == name) {
                selectedResources.push(resource);
            }
        }
        return selectedResources;
    };

    ResourceCache.prototype.getResourceById = function (id) {
        // TODO: fast lookup
        for (var n = 0; n < this.resources.length; n++) {
            var resource = this.resources[n];
            if (resource.id === id) {
                return resource;
            }
        }
        return null;
    };

    ResourceCache.prototype.getTextures = function () {
        return this.getResources("WebGLTexture");
    };

    ResourceCache.prototype.getBuffers = function () {
        return this.getResources("WebGLBuffer");
    };

    ResourceCache.prototype.getPrograms = function () {
        return this.getResources("WebGLProgram");
    };

    host.ResourceCache = ResourceCache;
})();
(function () {
    var host = glinamespace("gli.host");

    var Counter = function (name, description, unit, color, enabledByDefault) {
        this.name = name;
        this.description = description;
        this.unit = unit;
        this.color = color;
        this.enabled = enabledByDefault;

        this.value = 0;
        this.previousValue = 0;
        this.averageValue = 0;
    };

    var Statistics = function () {
        this.counters = [];

        this.counters.push(new Counter("frameTime", "Frame Time", "ms", "rgb(0,0,0)", true));
        this.counters.push(new Counter("drawsPerFrame", "Draws/Frame", null, "rgb(255,0,0)", true));
        this.counters.push(new Counter("primitivesPerFrame", "Primitives/Frame", null, "rgb(100,0,0)", true));
        this.counters.push(new Counter("callsPerFrame", "Calls/Frame", null, "rgb(100,0,0)", false));
        this.counters.push(new Counter("redundantCalls", "Redundant Call %", null, "rgb(0,100,0)", false));
        this.counters.push(new Counter("textureCount", "Textures", null, "rgb(0,255,0)", true));
        this.counters.push(new Counter("bufferCount", "Buffers", null, "rgb(0,100,0)", true));
        this.counters.push(new Counter("programCount", "Programs", null, "rgb(0,200,0)", true));
        this.counters.push(new Counter("framebufferCount", "Framebuffers", null, "rgb(0,0,0)", false));
        this.counters.push(new Counter("renderbufferCount", "Renderbuffers", null, "rgb(0,0,0)", false));
        this.counters.push(new Counter("shaderCount", "Shaders", null, "rgb(0,0,0)", false));
        this.counters.push(new Counter("vertexArrayObjectCount", "VAOs", null, "rgb(0,0,0)", false));
        this.counters.push(new Counter("textureBytes", "Texture Memory", "MB", "rgb(0,0,255)", true));
        this.counters.push(new Counter("bufferBytes", "Buffer Memory", "MB", "rgb(0,0,100)", true));
        this.counters.push(new Counter("textureWrites", "Texture Writes/Frame", "MB", "rgb(255,255,0)", true));
        this.counters.push(new Counter("bufferWrites", "Buffer Writes/Frame", "MB", "rgb(100,100,0)", true));
        this.counters.push(new Counter("textureReads", "Texture Reads/Frame", "MB", "rgb(0,255,255)", true));

        for (var n = 0; n < this.counters.length; n++) {
            var counter = this.counters[n];
            this[counter.name] = counter;
        }

        this.history = [];
    };

    Statistics.prototype.clear = function () {
        this.history.length = 0;
    };

    Statistics.prototype.beginFrame = function () {
        for (var n = 0; n < this.counters.length; n++) {
            var counter = this.counters[n];
            counter.previousValue = counter.value;
        }

        this.frameTime.value = 0;
        this.drawsPerFrame.value = 0;
        this.primitivesPerFrame.value = 0;
        this.callsPerFrame.value = 0;
        this.redundantCalls.value = 0;
        this.textureWrites.value = 0;
        this.bufferWrites.value = 0;
        this.textureReads.value = 0;

        this.startTime = (new Date()).getTime();
    };

    Statistics.prototype.endFrame = function () {
        this.frameTime.value = (new Date()).getTime() - this.startTime;

        // Redundant call calculation
        if (this.callsPerFrame.value > 0) {
            this.redundantCalls.value = this.redundantCalls.value / this.callsPerFrame.value * 100;
        } else {
            this.redundantCalls.value = 0;
        }

        var slice = [];
        slice[this.counters.length - 1] = 0;
        for (var n = 0; n < this.counters.length; n++) {
            var counter = this.counters[n];

            // Average things and store the values off
            // TODO: better average calculation
            if (counter.averageValue == 0) {
                counter.averageValue = counter.value;
            } else {
                counter.averageValue = (counter.value * 75 + counter.averageValue * 25) / 100;
            }

            // Store in history
            slice[n] = counter.averageValue;
        }

        //this.history.push(slice);
    };

    host.Statistics = Statistics;
})();
(function () {
    var resources = glinamespace("gli.resources");

    var Buffer = function (gl, frameNumber, stack, target) {
        glisubclass(gli.host.Resource, this, [gl, frameNumber, stack, target]);
        this.creationOrder = 0;

        this.defaultName = "Buffer " + this.id;

        this.type = gl.ARRAY_BUFFER; // ARRAY_BUFFER, ELEMENT_ARRAY_BUFFER

        this.parameters = {};
        this.parameters[gl.BUFFER_SIZE] = 0;
        this.parameters[gl.BUFFER_USAGE] = gl.STATIC_DRAW;

        this.currentVersion.type = this.type;
        this.currentVersion.structure = null;
        this.currentVersion.lastDrawState = null;
        this.currentVersion.setParameters(this.parameters);

        this.estimatedSize = 0;
    };

    Buffer.prototype.refresh = function (gl) {
        var paramEnums = [gl.BUFFER_SIZE, gl.BUFFER_USAGE];
        for (var n = 0; n < paramEnums.length; n++) {
            this.parameters[paramEnums[n]] = gl.getBufferParameter(this.type, paramEnums[n]);
        }
    };

    Buffer.getTracked = function (gl, args) {
        var bindingEnum;
        switch (args[0]) {
            default:
            case gl.ARRAY_BUFFER:
                bindingEnum = gl.ARRAY_BUFFER_BINDING;
                break;
            case gl.ELEMENT_ARRAY_BUFFER:
                bindingEnum = gl.ELEMENT_ARRAY_BUFFER_BINDING;
                break;
        }
        var glbuffer = gl.rawgl.getParameter(bindingEnum);
        if (glbuffer == null) {
            // Going to fail
            return null;
        }
        return glbuffer.trackedObject;
    };

    Buffer.setCaptures = function (gl) {
        var original_bufferData = gl.bufferData;
        gl.bufferData = function () {
            // Track buffer writes
            var totalBytes = 0;
            if (arguments[1] && arguments[1].byteLength) {
                totalBytes = arguments[1].byteLength;
            } else {
                totalBytes = arguments[1];
            }
            gl.statistics.bufferWrites.value += totalBytes;

            var tracked = Buffer.getTracked(gl, arguments);
            tracked.type = arguments[0];

            // Track total buffer bytes consumed
            gl.statistics.bufferBytes.value -= tracked.estimatedSize;
            gl.statistics.bufferBytes.value += totalBytes;
            tracked.estimatedSize = totalBytes;

            tracked.markDirty(true);
            tracked.currentVersion.target = tracked.type;
            tracked.currentVersion.structure = null;
            tracked.currentVersion.lastDrawState = null;
            tracked.currentVersion.pushCall("bufferData", arguments);
            var result = original_bufferData.apply(gl, arguments);
            tracked.refresh(gl.rawgl);
            tracked.currentVersion.setParameters(tracked.parameters);
            return result;
        };

        var original_bufferSubData = gl.bufferSubData;
        gl.bufferSubData = function () {
            // Track buffer writes
            var totalBytes = 0;
            if (arguments[2]) {
                totalBytes = arguments[2].byteLength;
            }
            gl.statistics.bufferWrites.value += totalBytes;

            var tracked = Buffer.getTracked(gl, arguments);
            tracked.type = arguments[0];
            tracked.markDirty(false);
            tracked.currentVersion.target = tracked.type;
            tracked.currentVersion.structure = null;
            tracked.currentVersion.lastDrawState = null;
            tracked.currentVersion.pushCall("bufferSubData", arguments);
            return original_bufferSubData.apply(gl, arguments);
        };

        // This is constant, so fetch once
        var maxVertexAttribs = gl.rawgl.getParameter(gl.MAX_VERTEX_ATTRIBS);

        function assignDrawStructure () {
            var rawgl = gl.rawgl;
            var mode = arguments[0];

            var drawState = {
                mode: mode,
                elementArrayBuffer: null,
                elementArrayBufferType: null,
                first: 0,
                offset: 0,
                count: 0
            };
            if (arguments.length == 3) {
                // drawArrays
                drawState.first = arguments[1];
                drawState.count = arguments[2];
            } else {
                // drawElements
                var glelementArrayBuffer = rawgl.getParameter(rawgl.ELEMENT_ARRAY_BUFFER_BINDING);
                drawState.elementArrayBuffer = glelementArrayBuffer ? glelementArrayBuffer.trackedObject : null;
                drawState.elementArrayBufferType = arguments[2];
                drawState.offset = arguments[3];
                drawState.count = arguments[1];
            }

            // TODO: cache all draw state so that we don't have to query each time
            var allDatas = {};
            var allBuffers = [];
            for (var n = 0; n < maxVertexAttribs; n++) {
                if (rawgl.getVertexAttrib(n, rawgl.VERTEX_ATTRIB_ARRAY_ENABLED)) {
                    var glbuffer = rawgl.getVertexAttrib(n, rawgl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING);
                    var buffer = glbuffer.trackedObject;
                    if (buffer.currentVersion.structure) {
                        continue;
                    }

                    var size = rawgl.getVertexAttrib(n, rawgl.VERTEX_ATTRIB_ARRAY_SIZE);
                    var stride = rawgl.getVertexAttrib(n, rawgl.VERTEX_ATTRIB_ARRAY_STRIDE);
                    var offset = rawgl.getVertexAttribOffset(n, rawgl.VERTEX_ATTRIB_ARRAY_POINTER);
                    var type = rawgl.getVertexAttrib(n, rawgl.VERTEX_ATTRIB_ARRAY_TYPE);
                    var normalized = rawgl.getVertexAttrib(n, rawgl.VERTEX_ATTRIB_ARRAY_NORMALIZED);

                    var datas = allDatas[buffer.id];
                    if (!datas) {
                        datas = allDatas[buffer.id] = [];
                        allBuffers.push(buffer);
                    }

                    datas.push({
                        size: size,
                        stride: stride,
                        offset: offset,
                        type: type,
                        normalized: normalized
                    });
                }
            }

            // TODO: build structure
            for (var n = 0; n < allBuffers.length; n++) {
                var buffer = allBuffers[n];
                var datas = allDatas[buffer.id];
                datas.sort(function (a, b) {
                    return a.offset - b.offset;
                });

                buffer.currentVersion.structure = datas;
                buffer.currentVersion.lastDrawState = drawState;
            }
        };

        function calculatePrimitiveCount(gl, mode, count) {
            switch (mode) {
                case gl.POINTS:
                    return count;
                case gl.LINE_STRIP:
                    return count - 1;
                case gl.LINE_LOOP:
                    return count;
                case gl.LINES:
                    return count / 2;
                case gl.TRIANGLE_STRIP:
                    return count - 2;
                default:
                case gl.TRIANGLES:
                    return count / 3;
            }
        };

        var origin_drawArrays = gl.drawArrays;
        gl.drawArrays = function () {
            //void drawArrays(GLenum mode, GLint first, GLsizei count);
            if (gl.captureFrame) {
                assignDrawStructure.apply(null, arguments);
            }

            // Track draw stats
            var totalPrimitives = calculatePrimitiveCount(gl, arguments[0], arguments[2]);
            gl.statistics.drawsPerFrame.value++;
            gl.statistics.primitivesPerFrame.value += totalPrimitives;

            return origin_drawArrays.apply(gl, arguments);
        };

        var origin_drawElements = gl.drawElements;
        gl.drawElements = function () {
            //void drawElements(GLenum mode, GLsizei count, GLenum type, GLsizeiptr offset);
            if (gl.captureFrame) {
                assignDrawStructure.apply(null, arguments);
            }

            // Track draw stats
            var totalPrimitives = calculatePrimitiveCount(gl, arguments[0], arguments[1]);
            gl.statistics.drawsPerFrame.value++;
            gl.statistics.primitivesPerFrame.value += totalPrimitives

            return origin_drawElements.apply(gl, arguments);
        };
    };

    Buffer.prototype.createTarget = function (gl, version, options) {
        options = options || {};

        var buffer = gl.createBuffer();
        gl.bindBuffer(version.target, buffer);

        // Filter uploads if requested
        var uploadFilter = null;
        if (options.ignoreBufferUploads) {
            uploadFilter = function uploadFilter(call, args) {
                if ((call.name == "bufferData") || (call.name == "bufferSubData")) {
                    return false;
                }
                return true;
            };
        }

        this.replayCalls(gl, version, buffer, uploadFilter);

        return buffer;
    };

    Buffer.prototype.deleteTarget = function (gl, target) {
        gl.deleteBuffer(target);
    };

    Buffer.prototype.constructVersion = function (gl, version) {
        // Find the last bufferData call to initialize the data
        var subDataCalls = [];
        var data = null;
        for (var n = version.calls.length - 1; n >= 0; n--) {
            var call = version.calls[n];
            if (call.name == "bufferData") {
                var sourceArray = call.args[1];
                if (sourceArray.constructor == Number) {
                    // Size - create an empty array
                    data = new ArrayBuffer(sourceArray);
                    break;
                } else {
                    // Has to be an ArrayBuffer or ArrayBufferView
                    data = gli.util.clone(sourceArray);
                    break;
                }
            } else if (call.name == "bufferSubData") {
                // Queue up for later
                subDataCalls.unshift(call);
            }
        }
        if (!data) {
            // No bufferData calls!
            return [];
        }

        // Apply bufferSubData calls
        for (var n = 0; n < subDataCalls.length; n++) {
            var call = subDataCalls[n];
            var offset = call.args[1];
            var sourceArray = call.args[2];

            var view;
            switch (glitypename(sourceArray)) {
                case "Int8Array":
                    view = new Int8Array(data, offset);
                    break;
                case "Uint8Array":
                    view = new Uint8Array(data, offset);
                    break;
                case "Int16Array":
                    view = new Int16Array(data, offset);
                    break;
                case "Uint16Array":
                    view = new Uint16Array(data, offset);
                    break;
                case "Int32Array":
                    view = new Int32Array(data, offset);
                    break;
                case "Uint32Array":
                    view = new Uint32Array(data, offset);
                    break;
                case "Float32Array":
                    view = new Float32Array(data, offset);
                    break;
            }
            for (var i = 0; i < sourceArray.length; i++) {
                view[i] = sourceArray[i];
            }
        }

        return data;
    };

    resources.Buffer = Buffer;

})();
(function () {
    var resources = glinamespace("gli.resources");

    var Framebuffer = function (gl, frameNumber, stack, target) {
        glisubclass(gli.host.Resource, this, [gl, frameNumber, stack, target]);
        this.creationOrder = 3;

        this.defaultName = "Framebuffer " + this.id;

        // Track the attachments a framebuffer has (watching framebufferRenderbuffer/etc calls)
        this.attachments = {};

        this.parameters = {};
        // Attachments: COLOR_ATTACHMENT0, DEPTH_ATTACHMENT, STENCIL_ATTACHMENT
        // These parameters are per-attachment
        //this.parameters[gl.FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE] = 0;
        //this.parameters[gl.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME] = 0;
        //this.parameters[gl.FRAMEBUFFER_ATTACHMENT_TEXTURE_LEVEL] = 0;
        //this.parameters[gl.FRAMEBUFFER_ATTACHMENT_TEXTURE_CUBE_MAP_FACE] = 0;

        this.currentVersion.setParameters(this.parameters);
        this.currentVersion.setExtraParameters("attachments", this.attachments);
    };

    Framebuffer.prototype.getDependentResources = function () {
        var resources = [];
        for (var n in this.attachments) {
            var attachment = this.attachments[n];
            if (resources.indexOf(attachment) == -1) {
                resources.push(attachment);
            }
        }
        return resources;
    };

    Framebuffer.prototype.refresh = function (gl) {
        // Attachments: COLOR_ATTACHMENT0, DEPTH_ATTACHMENT, STENCIL_ATTACHMENT
        //var paramEnums = [gl.FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE, gl.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME, gl.FRAMEBUFFER_ATTACHMENT_TEXTURE_LEVEL, gl.FRAMEBUFFER_ATTACHMENT_TEXTURE_CUBE_MAP_FACE];
        //for (var n = 0; n < paramEnums.length; n++) {
        //    this.parameters[paramEnums[n]] = gl.getFramebufferAttachmentParameter(gl.FRAMEBUFFER, attachment, paramEnums[n]);
        //}
    };

    Framebuffer.getTracked = function (gl, args) {
        // only FRAMEBUFFER
        var bindingEnum = gl.FRAMEBUFFER_BINDING;
        var glframebuffer = gl.getParameter(bindingEnum);
        if (glframebuffer == null) {
            // Going to fail
            return null;
        }
        return glframebuffer.trackedObject;
    };

    Framebuffer.setCaptures = function (gl) {
        var original_framebufferRenderbuffer = gl.framebufferRenderbuffer;
        gl.framebufferRenderbuffer = function () {
            var tracked = Framebuffer.getTracked(gl, arguments);
            tracked.markDirty(false);
            // TODO: remove existing calls for this attachment
            tracked.currentVersion.pushCall("framebufferRenderbuffer", arguments);

            // Save attachment
            tracked.attachments[arguments[1]] = arguments[3] ? arguments[3].trackedObject : null;
            tracked.currentVersion.setExtraParameters("attachments", tracked.attachments);

            var result = original_framebufferRenderbuffer.apply(gl, arguments);

            // HACK: query the parameters now - easier than calculating all of them
            tracked.refresh(gl);
            tracked.currentVersion.setParameters(tracked.parameters);

            return result;
        };

        var original_framebufferTexture2D = gl.framebufferTexture2D;
        gl.framebufferTexture2D = function () {
            var tracked = Framebuffer.getTracked(gl, arguments);
            tracked.markDirty(false);
            // TODO: remove existing calls for this attachment
            tracked.currentVersion.pushCall("framebufferTexture2D", arguments);

            // Save attachment
            tracked.attachments[arguments[1]] = arguments[3] ? arguments[3].trackedObject : null;
            tracked.currentVersion.setExtraParameters("attachments", tracked.attachments);

            var result = original_framebufferTexture2D.apply(gl, arguments);

            // HACK: query the parameters now - easier than calculating all of them
            tracked.refresh(gl);
            tracked.currentVersion.setParameters(tracked.parameters);

            return result;
        };
    };

    Framebuffer.prototype.createTarget = function (gl, version) {
        var framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

        this.replayCalls(gl, version, framebuffer);

        return framebuffer;
    };

    Framebuffer.prototype.deleteTarget = function (gl, target) {
        gl.deleteFramebuffer(target);
    };

    resources.Framebuffer = Framebuffer;

})();
(function () {
    var resources = glinamespace("gli.resources");

    var Program = function (gl, frameNumber, stack, target) {
        glisubclass(gli.host.Resource, this, [gl, frameNumber, stack, target]);
        this.creationOrder = 5;

        this.defaultName = "Program " + this.id;

        this.shaders = [];

        this.parameters = {};
        this.parameters[gl.DELETE_STATUS] = 0;
        this.parameters[gl.LINK_STATUS] = 0;
        this.parameters[gl.VALIDATE_STATUS] = 0;
        this.parameters[gl.ATTACHED_SHADERS] = 0;
        this.parameters[gl.ACTIVE_ATTRIBUTES] = 0;
        this.parameters[gl.ACTIVE_UNIFORMS] = 0;
        this.infoLog = null;

        this.uniformInfos = [];
        this.attribInfos = [];
        this.attribBindings = {};

        this.currentVersion.setParameters(this.parameters);
        this.currentVersion.setExtraParameters("extra", { infoLog: "" });
        this.currentVersion.setExtraParameters("uniformInfos", this.uniformInfos);
        this.currentVersion.setExtraParameters("attribInfos", this.attribInfos);
        this.currentVersion.setExtraParameters("attribBindings", this.attribBindings);
    };

    Program.prototype.getDependentResources = function () {
        return this.shaders;
    };

    Program.prototype.getShader = function (type) {
        for (var n = 0; n < this.shaders.length; n++) {
            var shader = this.shaders[n];
            if (shader.type == type) {
                return shader;
            }
        }
        return null;
    }

    Program.prototype.getVertexShader = function (gl) {
        return this.getShader(gl.VERTEX_SHADER);
    };

    Program.prototype.getFragmentShader = function (gl) {
        return this.getShader(gl.FRAGMENT_SHADER);
    };

    Program.prototype.getUniformInfos = function (gl, target) {
        var originalActiveTexture = gl.getParameter(gl.ACTIVE_TEXTURE);

        var uniformInfos = [];
        var uniformCount = gl.getProgramParameter(target, gl.ACTIVE_UNIFORMS);
        for (var n = 0; n < uniformCount; n++) {
            var activeInfo = gl.getActiveUniform(target, n);
            if (activeInfo) {
                var loc = gl.getUniformLocation(target, activeInfo.name);
                var value = gli.util.clone(gl.getUniform(target, loc));
                value = (value !== null) ? value : 0;

                var isSampler = false;
                var textureType;
                var bindingType;
                var textureValue = null;
                switch (activeInfo.type) {
                    case gl.SAMPLER_2D:
                        isSampler = true;
                        textureType = gl.TEXTURE_2D;
                        bindingType = gl.TEXTURE_BINDING_2D;
                        break;
                    case gl.SAMPLER_CUBE:
                        isSampler = true;
                        textureType = gl.TEXTURE_CUBE_MAP;
                        bindingType = gl.TEXTURE_BINDING_CUBE_MAP;
                        break;
                }
                if (isSampler) {
                    gl.activeTexture(gl.TEXTURE0 + value);
                    var texture = gl.getParameter(bindingType);
                    textureValue = texture ? texture.trackedObject : null;
                }

                uniformInfos[n] = {
                    index: n,
                    name: activeInfo.name,
                    size: activeInfo.size,
                    type: activeInfo.type,
                    value: value,
                    textureValue: textureValue
                };
            }
            if (gl.ignoreErrors) {
                gl.ignoreErrors();
            }
        }

        gl.activeTexture(originalActiveTexture);
        return uniformInfos;
    };

    Program.prototype.getAttribInfos = function (gl, target) {
        var attribInfos = [];
        var remainingAttribs = gl.getProgramParameter(target, gl.ACTIVE_ATTRIBUTES);
        var maxAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
        var attribIndex = 0;
        while (remainingAttribs > 0) {
            var activeInfo = gl.getActiveAttrib(target, attribIndex);
            if (activeInfo && activeInfo.type) {
                remainingAttribs--;
                var loc = gl.getAttribLocation(target, activeInfo.name);
                var bufferBinding = gl.getVertexAttrib(loc, gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING);
                attribInfos.push({
                    index: attribIndex,
                    loc: loc,
                    name: activeInfo.name,
                    size: activeInfo.size,
                    type: activeInfo.type,
                    state: {
                        enabled: gl.getVertexAttrib(loc, gl.VERTEX_ATTRIB_ARRAY_ENABLED),
                        buffer: bufferBinding ? bufferBinding.trackedObject : null,
                        size: gl.getVertexAttrib(loc, gl.VERTEX_ATTRIB_ARRAY_SIZE),
                        stride: gl.getVertexAttrib(loc, gl.VERTEX_ATTRIB_ARRAY_STRIDE),
                        type: gl.getVertexAttrib(loc, gl.VERTEX_ATTRIB_ARRAY_TYPE),
                        normalized: gl.getVertexAttrib(loc, gl.VERTEX_ATTRIB_ARRAY_NORMALIZED),
                        pointer: gl.getVertexAttribOffset(loc, gl.VERTEX_ATTRIB_ARRAY_POINTER),
                        value: gl.getVertexAttrib(loc, gl.CURRENT_VERTEX_ATTRIB)
                    }
                });
            }
            if (gl.ignoreErrors) {
                gl.ignoreErrors();
            }
            attribIndex++;
            if (attribIndex >= maxAttribs) {
                break;
            }
        }
        return attribInfos;
    };

    Program.prototype.refresh = function (gl) {
        var paramEnums = [gl.DELETE_STATUS, gl.LINK_STATUS, gl.VALIDATE_STATUS, gl.ATTACHED_SHADERS, gl.ACTIVE_ATTRIBUTES, gl.ACTIVE_UNIFORMS];
        for (var n = 0; n < paramEnums.length; n++) {
            this.parameters[paramEnums[n]] = gl.getProgramParameter(this.target, paramEnums[n]);
        }
        this.infoLog = gl.getProgramInfoLog(this.target);
    };

    Program.setCaptures = function (gl) {
        var original_attachShader = gl.attachShader;
        gl.attachShader = function () {
            if (arguments[0] && arguments[1]) {
                var tracked = arguments[0].trackedObject;
                var trackedShader = arguments[1].trackedObject;
                tracked.shaders.push(trackedShader);
                tracked.parameters[gl.ATTACHED_SHADERS]++;
                tracked.markDirty(false);
                tracked.currentVersion.setParameters(tracked.parameters);
                tracked.currentVersion.pushCall("attachShader", arguments);
            }
            return original_attachShader.apply(gl, arguments);
        };

        var original_detachShader = gl.detachShader;
        gl.detachShader = function () {
            if (arguments[0] && arguments[1]) {
                var tracked = arguments[0].trackedObject;
                var trackedShader = arguments[1].trackedObject;
                var index = tracked.shaders.indexOf(trackedShader);
                if (index >= 0) {
                    tracked.shaders.splice(index, 1);
                }
                tracked.parameters[gl.ATTACHED_SHADERS]--;
                tracked.markDirty(false);
                tracked.currentVersion.setParameters(tracked.parameters);
                tracked.currentVersion.pushCall("detachShader", arguments);
            }
            return original_detachShader.apply(gl, arguments);
        };

        var original_linkProgram = gl.linkProgram;
        gl.linkProgram = function () {
            var tracked = arguments[0].trackedObject;
            var result = original_linkProgram.apply(gl, arguments);

            // Refresh params
            tracked.refresh(gl.rawgl);

            // Grab uniforms
            tracked.uniformInfos = tracked.getUniformInfos(gl, tracked.target);

            // Grab attribs
            tracked.attribInfos = tracked.getAttribInfos(gl, tracked.target);

            tracked.markDirty(false);
            tracked.currentVersion.setParameters(tracked.parameters);
            tracked.currentVersion.pushCall("linkProgram", arguments);
            tracked.currentVersion.setExtraParameters("extra", { infoLog: tracked.infoLog });
            tracked.currentVersion.setExtraParameters("uniformInfos", tracked.uniformInfos);
            tracked.currentVersion.setExtraParameters("attribInfos", tracked.attribInfos);
            tracked.currentVersion.setExtraParameters("attribBindings", tracked.attribBindings);

            return result;
        };

        var original_bindAttribLocation = gl.bindAttribLocation;
        gl.bindAttribLocation = function () {
            var tracked = arguments[0].trackedObject;
            var index = arguments[1];
            var name = arguments[2];
            tracked.attribBindings[index] = name;

            tracked.markDirty(false);
            tracked.currentVersion.setParameters(tracked.parameters);
            tracked.currentVersion.pushCall("bindAttribLocation", arguments);
            tracked.currentVersion.setExtraParameters("attribBindings", tracked.attribBindings);

            return original_bindAttribLocation.apply(gl, arguments);
        };

        // Cache off uniform name so that we can retrieve it later
        var original_getUniformLocation = gl.getUniformLocation;
        gl.getUniformLocation = function () {
            var result = original_getUniformLocation.apply(gl, arguments);
            if (result) {
                var tracked = arguments[0].trackedObject;
                result.sourceProgram = tracked;
                result.sourceUniformName = arguments[1];
            }
            return result;
        };
    };

    Program.prototype.createTarget = function (gl, version, options) {
        options = options || {};

        var program = gl.createProgram();

        this.replayCalls(gl, version, program);

        return program;
    };

    Program.prototype.deleteTarget = function (gl, target) {
        gl.deleteProgram(target);
    };

    resources.Program = Program;

})();
(function () {
    var resources = glinamespace("gli.resources");

    var Renderbuffer = function (gl, frameNumber, stack, target) {
        glisubclass(gli.host.Resource, this, [gl, frameNumber, stack, target]);
        this.creationOrder = 2;

        this.defaultName = "Renderbuffer " + this.id;

        this.parameters = {};
        this.parameters[gl.RENDERBUFFER_WIDTH] = 0;
        this.parameters[gl.RENDERBUFFER_HEIGHT] = 0;
        this.parameters[gl.RENDERBUFFER_INTERNAL_FORMAT] = gl.RGBA4;
        this.parameters[gl.RENDERBUFFER_RED_SIZE] = 0;
        this.parameters[gl.RENDERBUFFER_GREEN_SIZE] = 0;
        this.parameters[gl.RENDERBUFFER_BLUE_SIZE] = 0;
        this.parameters[gl.RENDERBUFFER_ALPHA_SIZE] = 0;
        this.parameters[gl.RENDERBUFFER_DEPTH_SIZE] = 0;
        this.parameters[gl.RENDERBUFFER_STENCIL_SIZE] = 0;

        this.currentVersion.setParameters(this.parameters);
    };

    Renderbuffer.prototype.refresh = function (gl) {
        var paramEnums = [gl.RENDERBUFFER_WIDTH, gl.RENDERBUFFER_HEIGHT, gl.RENDERBUFFER_INTERNAL_FORMAT, gl.RENDERBUFFER_RED_SIZE, gl.RENDERBUFFER_GREEN_SIZE, gl.RENDERBUFFER_BLUE_SIZE, gl.RENDERBUFFER_ALPHA_SIZE, gl.RENDERBUFFER_DEPTH_SIZE, gl.RENDERBUFFER_STENCIL_SIZE];
        for (var n = 0; n < paramEnums.length; n++) {
            this.parameters[paramEnums[n]] = gl.getRenderbufferParameter(gl.RENDERBUFFER, paramEnums[n]);
        }
    };

    Renderbuffer.getTracked = function (gl, args) {
        // only RENDERBUFFER
        var bindingEnum = gl.RENDERBUFFER_BINDING;
        var glrenderbuffer = gl.getParameter(bindingEnum);
        if (glrenderbuffer == null) {
            // Going to fail
            return null;
        }
        return glrenderbuffer.trackedObject;
    };

    Renderbuffer.setCaptures = function (gl) {
        var original_renderbufferStorage = gl.renderbufferStorage;
        gl.renderbufferStorage = function () {
            var tracked = Renderbuffer.getTracked(gl, arguments);
            tracked.markDirty(true);
            tracked.currentVersion.pushCall("renderbufferStorage", arguments);

            var result = original_renderbufferStorage.apply(gl, arguments);

            // HACK: query the parameters now - easier than calculating all of them
            tracked.refresh(gl);
            tracked.currentVersion.setParameters(tracked.parameters);

            return result;
        };
    };

    Renderbuffer.prototype.createTarget = function (gl, version) {
        var renderbuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);

        this.replayCalls(gl, version, renderbuffer);

        return renderbuffer;
    };

    Renderbuffer.prototype.deleteTarget = function (gl, target) {
        gl.deleteRenderbuffer(target);
    };

    resources.Renderbuffer = Renderbuffer;

})();
(function () {
    var resources = glinamespace("gli.resources");

    var Shader = function (gl, frameNumber, stack, target, args) {
        glisubclass(gli.host.Resource, this, [gl, frameNumber, stack, target]);
        this.creationOrder = 4;

        this.defaultName = "Shader " + this.id;

        this.type = args[0]; // VERTEX_SHADER, FRAGMENT_SHADER

        this.source = null;

        this.parameters = {};
        this.parameters[gl.SHADER_TYPE] = this.type;
        this.parameters[gl.DELETE_STATUS] = 0;
        this.parameters[gl.COMPILE_STATUS] = 0;
        this.infoLog = null;

        this.currentVersion.target = this.type;
        this.currentVersion.setParameters(this.parameters);
        this.currentVersion.setExtraParameters("extra", { infoLog: "" });
    };

    Shader.prototype.refresh = function (gl) {
        var paramEnums = [gl.SHADER_TYPE, gl.DELETE_STATUS, gl.COMPILE_STATUS];
        for (var n = 0; n < paramEnums.length; n++) {
            this.parameters[paramEnums[n]] = gl.getShaderParameter(this.target, paramEnums[n]);
        }
        this.infoLog = gl.getShaderInfoLog(this.target);
    };

    Shader.setCaptures = function (gl) {
        var original_shaderSource = gl.shaderSource;
        gl.shaderSource = function () {
            var tracked = arguments[0].trackedObject;
            tracked.source = arguments[1];
            tracked.markDirty(true);
            tracked.currentVersion.target = tracked.type;
            tracked.currentVersion.setParameters(tracked.parameters);
            tracked.currentVersion.pushCall("shaderSource", arguments);
            return original_shaderSource.apply(gl, arguments);
        };

        var original_compileShader = gl.compileShader;
        gl.compileShader = function () {
            var tracked = arguments[0].trackedObject;
            tracked.markDirty(false);
            var result = original_compileShader.apply(gl, arguments);
            tracked.refresh(gl);
            tracked.currentVersion.setParameters(tracked.parameters);
            tracked.currentVersion.setExtraParameters("extra", { infoLog: tracked.infoLog });
            tracked.currentVersion.pushCall("compileShader", arguments);
            return result;
        };
    };

    Shader.prototype.createTarget = function (gl, version, options) {
        var shader = gl.createShader(version.target);

        this.replayCalls(gl, version, shader, function (call, args) {
            if (options.fragmentShaderOverride) {
                if (call.name == "shaderSource") {
                    if (version.target == gl.FRAGMENT_SHADER) {
                        args[1] = options.fragmentShaderOverride;
                    }
                }
            }
            return true;
        });

        return shader;
    };

    Shader.prototype.deleteTarget = function (gl, target) {
        gl.deleteShader(target);
    };

    resources.Shader = Shader;

})();
(function () {
    var resources = glinamespace("gli.resources");

    var Texture = function (gl, frameNumber, stack, target) {
        glisubclass(gli.host.Resource, this, [gl, frameNumber, stack, target]);
        this.creationOrder = 1;

        this.defaultName = "Texture " + this.id;

        this.type = gl.TEXTURE_2D; // TEXTURE_2D, TEXTURE_CUBE_MAP

        this.parameters = {};
        this.parameters[gl.TEXTURE_MAG_FILTER] = gl.LINEAR;
        this.parameters[gl.TEXTURE_MIN_FILTER] = gl.NEAREST_MIPMAP_LINEAR;
        this.parameters[gl.TEXTURE_WRAP_S] = gl.REPEAT;
        this.parameters[gl.TEXTURE_WRAP_T] = gl.REPEAT;

        this.currentVersion.target = this.type;
        this.currentVersion.setParameters(this.parameters);

        this.estimatedSize = 0;
    };

    Texture.prototype.guessSize = function (gl, version, face) {
        version = version || this.currentVersion;
        for (var n = version.calls.length - 1; n >= 0; n--) {
            var call = version.calls[n];
            if (call.name == "texImage2D") {
                // Ignore all but level 0
                if (call.args[1]) {
                    continue;
                }
                if (face) {
                    if (call.args[0] != face) {
                        continue;
                    }
                }
                if (call.args.length == 9) {
                    return [call.args[3], call.args[4]];
                } else {
                    var sourceObj = call.args[5];
                    if (sourceObj) {
                        return [sourceObj.width, sourceObj.height];
                    } else {
                        return null;
                    }
                }
            } else if (call.name == "compressedTexImage2D") {
                // Ignore all but level 0
                if (call.args[1]) {
                    continue;
                }
                if (face) {
                    if (call.args[0] != face) {
                        continue;
                    }
                }
                return [call.args[3], call.args[4]];
            }
        }
        return null;
    };

    Texture.prototype.refresh = function (gl) {
        var paramEnums = [gl.TEXTURE_MAG_FILTER, gl.TEXTURE_MIN_FILTER, gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T];
        for (var n = 0; n < paramEnums.length; n++) {
            this.parameters[paramEnums[n]] = gl.getTexParameter(this.type, paramEnums[n]);
        }
    };

    Texture.getTracked = function (gl, args) {
        var bindingEnum;
        switch (args[0]) {
            case gl.TEXTURE_2D:
                bindingEnum = gl.TEXTURE_BINDING_2D;
                break;
            case gl.TEXTURE_CUBE_MAP:
            case gl.TEXTURE_CUBE_MAP_POSITIVE_X:
            case gl.TEXTURE_CUBE_MAP_NEGATIVE_X:
            case gl.TEXTURE_CUBE_MAP_POSITIVE_Y:
            case gl.TEXTURE_CUBE_MAP_NEGATIVE_Y:
            case gl.TEXTURE_CUBE_MAP_POSITIVE_Z:
            case gl.TEXTURE_CUBE_MAP_NEGATIVE_Z:
                bindingEnum = gl.TEXTURE_BINDING_CUBE_MAP;
                break;
        }
        var gltexture = gl.rawgl.getParameter(bindingEnum);
        if (gltexture == null) {
            // Going to fail
            return null;
        }
        return gltexture.trackedObject;
    };

    Texture.setCaptures = function (gl) {
        // TODO: copyTexImage2D
        // TODO: copyTexSubImage2D

        var original_texParameterf = gl.texParameterf;
        gl.texParameterf = function () {
            var tracked = Texture.getTracked(gl, arguments);
            if (tracked) {
                tracked.type = arguments[0] == gl.TEXTURE_2D ?
                    gl.TEXTURE_2D : gl.TEXTURE_CUBE_MAP;
                tracked.parameters[arguments[1]] = arguments[2];
                tracked.markDirty(false);
                tracked.currentVersion.target = tracked.type;
                tracked.currentVersion.setParameters(tracked.parameters);
            }

            return original_texParameterf.apply(gl, arguments);
        };
        var original_texParameteri = gl.texParameteri;
        gl.texParameteri = function () {
            var tracked = Texture.getTracked(gl, arguments);
            if (tracked) {
                tracked.type = arguments[0] == gl.TEXTURE_2D ?
                    gl.TEXTURE_2D : gl.TEXTURE_CUBE_MAP;
                tracked.parameters[arguments[1]] = arguments[2];
                tracked.markDirty(false);
                tracked.currentVersion.target = tracked.type;
                tracked.currentVersion.setParameters(tracked.parameters);
            }

            return original_texParameteri.apply(gl, arguments);
        };

        function pushPixelStoreState(gl, version) {
            var pixelStoreEnums = [gl.PACK_ALIGNMENT, gl.UNPACK_ALIGNMENT, gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.UNPACK_FLIP_Y_WEBGL, gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL];
            for (var n = 0; n < pixelStoreEnums.length; n++) {
                var pixelStoreEnum = pixelStoreEnums[n];
                if (pixelStoreEnum === undefined) {
                    continue;
                }
                var value = gl.getParameter(pixelStoreEnums[n]);
                version.pushCall("pixelStorei", [pixelStoreEnum, value]);
            }
        };

        function calculateBpp(gl, format, type) {
            switch (type) {
                default:
                case gl.UNSIGNED_BYTE:
                    switch (format) {
                        case gl.ALPHA:
                        case gl.LUMINANCE:
                            return 1;
                        case gl.LUMINANCE_ALPHA:
                            return 2;
                        case gl.RGB:
                            return 3;
                        default:
                        case gl.RGBA:
                            return 4;
                    }
                    return 4;
                case gl.UNSIGNED_SHORT_5_6_5:
                    return 2;
                case gl.UNSIGNED_SHORT_4_4_4_4:
                    return 2;
                case gl.UNSIGNED_SHORT_5_5_5_1:
                    return 2;
                case 0x83F0: // COMPRESSED_RGB_S3TC_DXT1_EXT
                    return 3;
                case 0x83F1: // COMPRESSED_RGBA_S3TC_DXT1_EXT
                case 0x83F2: // COMPRESSED_RGBA_S3TC_DXT3_EXT
                case 0x83F3: // COMPRESSED_RGBA_S3TC_DXT5_EXT
                    return 4;
            }
        };

        var original_texImage2D = gl.texImage2D;
        gl.texImage2D = function () {
            // Track texture writes
            var totalBytes = 0;
            if (arguments.length == 9) {
                totalBytes = arguments[3] * arguments[4] * calculateBpp(gl, arguments[6], arguments[7]);
            } else {
                var sourceArg = arguments[5];
                var width = sourceArg.width;
                var height = sourceArg.height;
                totalBytes = width * height * calculateBpp(gl, arguments[3], arguments[4]);
            }
            gl.statistics.textureWrites.value += totalBytes;

            var tracked = Texture.getTracked(gl, arguments);
            if (tracked) {
                tracked.type = arguments[0] == gl.TEXTURE_2D ?
                    gl.TEXTURE_2D : gl.TEXTURE_CUBE_MAP;

                // Track total texture bytes consumed
                gl.statistics.textureBytes.value -= tracked.estimatedSize;
                gl.statistics.textureBytes.value += totalBytes;
                tracked.estimatedSize = totalBytes;

                // If a 2D texture this is always a reset, otherwise it may be a single face of the cube
                if (arguments[0] == gl.TEXTURE_2D) {
                    tracked.markDirty(true);
                    tracked.currentVersion.setParameters(tracked.parameters);
                } else {
                    // Cube face - always partial
                    tracked.markDirty(false);
                }
                tracked.currentVersion.target = tracked.type;

                pushPixelStoreState(gl.rawgl, tracked.currentVersion);
                tracked.currentVersion.pushCall("texImage2D", arguments);

                // If this is an upload from something with a URL and we haven't been named yet, auto name us
                if (arguments.length == 6) {
                    var sourceArg = arguments[5];
                    if (sourceArg && sourceArg.src) {
                        if (!tracked.target.displayName) {
                            var filename = sourceArg.src;
                            var lastSlash = filename.lastIndexOf("/");
                            if (lastSlash >= 0) {
                                filename = filename.substr(lastSlash + 1);
                            }
                            var lastDot = filename.lastIndexOf(".");
                            if (lastDot >= 0) {
                                filename = filename.substr(0, lastDot);
                            }
                            tracked.setName(filename, true);
                        }
                    }
                }
            }

            return original_texImage2D.apply(gl, arguments);
        };

        var original_texSubImage2D = gl.texSubImage2D;
        gl.texSubImage2D = function () {
            // Track texture writes
            var totalBytes = 0;
            if (arguments.length == 9) {
                totalBytes = arguments[4] * arguments[5] * calculateBpp(gl, arguments[6], arguments[7]);
            } else {
                var sourceArg = arguments[6];
                var width = sourceArg.width;
                var height = sourceArg.height;
                totalBytes = width * height * calculateBpp(gl, arguments[4], arguments[5]);
            }
            gl.statistics.textureWrites.value += totalBytes;

            var tracked = Texture.getTracked(gl, arguments);
            if (tracked) {
                tracked.type = arguments[0] == gl.TEXTURE_2D ?
                    gl.TEXTURE_2D : gl.TEXTURE_CUBE_MAP;
                tracked.markDirty(false);
                tracked.currentVersion.target = tracked.type;
                pushPixelStoreState(gl.rawgl, tracked.currentVersion);
                tracked.currentVersion.pushCall("texSubImage2D", arguments);
            }

            return original_texSubImage2D.apply(gl, arguments);
        };

        var original_compressedTexImage2D = gl.compressedTexImage2D;
        gl.compressedTexImage2D = function () {
            // Track texture writes
            var totalBytes = 0;
            switch (arguments[2]) {
                case 0x83F0: // COMPRESSED_RGB_S3TC_DXT1_EXT
                case 0x83F1: // COMPRESSED_RGBA_S3TC_DXT1_EXT
                    totalBytes = Math.floor((arguments[3] + 3) / 4) * Math.floor((arguments[4] + 3) / 4) * 8;
                    break;
                case 0x83F2: // COMPRESSED_RGBA_S3TC_DXT3_EXT
                case 0x83F3: // COMPRESSED_RGBA_S3TC_DXT5_EXT
                    totalBytes = Math.floor((arguments[3] + 3) / 4) * Math.floor((arguments[4] + 3) / 4) * 16;
                    break;
            }
            gl.statistics.textureWrites.value += totalBytes;

            var tracked = Texture.getTracked(gl, arguments);
            if (tracked) {
                tracked.type = arguments[0] == gl.TEXTURE_2D ?
                    gl.TEXTURE_2D : gl.TEXTURE_CUBE_MAP;

                // Track total texture bytes consumed
                gl.statistics.textureBytes.value -= tracked.estimatedSize;
                gl.statistics.textureBytes.value += totalBytes;
                tracked.estimatedSize = totalBytes;

                // If a 2D texture this is always a reset, otherwise it may be a single face of the cube
                // Note that we don't reset if we are adding extra levels.
                if (arguments[1] == 0 && arguments[0] == gl.TEXTURE_2D) {
                    tracked.markDirty(true);
                    tracked.currentVersion.setParameters(tracked.parameters);
                } else {
                    // Cube face - always partial
                    tracked.markDirty(false);
                }
                tracked.currentVersion.target = tracked.type;

                pushPixelStoreState(gl.rawgl, tracked.currentVersion);
                tracked.currentVersion.pushCall("compressedTexImage2D", arguments);
            }

            return original_compressedTexImage2D.apply(gl, arguments);
        };

        var original_compressedTexSubImage2D = gl.compressedTexSubImage2D;
        gl.compressedTexSubImage2D = function () {
            // Track texture writes
            var totalBytes = 0;
            switch (arguments[2]) {
                case 0x83F0: // COMPRESSED_RGB_S3TC_DXT1_EXT
                case 0x83F1: // COMPRESSED_RGBA_S3TC_DXT1_EXT
                    totalBytes = Math.floor((arguments[4] + 3) / 4) * Math.floor((arguments[5] + 3) / 4) * 8;
                    break;
                case 0x83F2: // COMPRESSED_RGBA_S3TC_DXT3_EXT
                case 0x83F3: // COMPRESSED_RGBA_S3TC_DXT5_EXT
                    totalBytes = Math.floor((arguments[4] + 3) / 4) * Math.floor((arguments[5] + 3) / 4) * 16;
                    break;
            }
            gl.statistics.textureWrites.value += totalBytes;

            var tracked = Texture.getTracked(gl, arguments);
            if (tracked) {
                tracked.type = arguments[0] == gl.TEXTURE_2D ?
                    gl.TEXTURE_2D : gl.TEXTURE_CUBE_MAP;
                tracked.markDirty(false);
                tracked.currentVersion.target = tracked.type;
                pushPixelStoreState(gl.rawgl, tracked.currentVersion);
                tracked.currentVersion.pushCall("compressedTexSubImage2D", arguments);
            }

            return original_compressedTexSubImage2D.apply(gl, arguments);
        };

        var original_generateMipmap = gl.generateMipmap;
        gl.generateMipmap = function () {
            var tracked = Texture.getTracked(gl, arguments);
            if (tracked) {
                tracked.type = arguments[0] == gl.TEXTURE_2D ?
                    gl.TEXTURE_2D : gl.TEXTURE_CUBE_MAP;
                // TODO: figure out what to do with mipmaps
                pushPixelStoreState(gl.rawgl, tracked.currentVersion);
                tracked.currentVersion.pushCall("generateMipmap", arguments);
            }

            return original_generateMipmap.apply(gl, arguments);
        };

        var original_readPixels = gl.readPixels;
        gl.readPixels = function () {
            var result = original_readPixels.apply(gl, arguments);
            if (result) {
                // Track texture reads
                // NOTE: only RGBA is supported for reads
                var totalBytes = arguments[2] * arguments[3] * 4;
                gl.statistics.textureReads.value += totalBytes;
            }
            return result;
        };
    };

    // If a face is supplied the texture created will be a 2D texture containing only the given face
    Texture.prototype.createTarget = function (gl, version, options, face) {
        options = options || {};
        var target = version.target;
        if (face) {
            target = gl.TEXTURE_2D;
        }

        var texture = gl.createTexture();
        gl.bindTexture(target, texture);

        for (var n in version.parameters) {
            gl.texParameteri(target, parseInt(n), version.parameters[n]);
        }

        this.replayCalls(gl, version, texture, function (call, args) {
            // Filter uploads if requested
            if (options.ignoreTextureUploads) {
                if ((call.name == "texImage2D") || (call.name == "texSubImage2D") ||
                    (call.name == "compressedTexImage2D") || (call.name == "compressedTexSubImage2D")) {
                    return false;
                }
            }

            // Filter non-face calls and rewrite the target if this is a face-specific call
            if ((call.name == "texImage2D") || (call.name == "texSubImage2D") ||
                (call.name == "compressedTexImage2D") || (call.name == "compressedTexSubImage2D")) {
                if (face && (args.length > 0)) {
                    if (args[0] != face) {
                        return false;
                    }
                    args[0] = gl.TEXTURE_2D;
                }
            } else if (call.name == "generateMipmap") {
                args[0] = target;
            }
            return true;
        });

        return texture;
    };

    Texture.prototype.deleteTarget = function (gl, target) {
        gl.deleteTexture(target);
    };

    resources.Texture = Texture;

})();
(function () {
    var resources = glinamespace("gli.resources");

    var VertexArrayObjectOES = function (gl, frameNumber, stack, target) {
        glisubclass(gli.host.Resource, this, [gl, frameNumber, stack, target]);
        this.creationOrder = 2;

        this.defaultName = "VAO " + this.id;

        this.parameters = {};

        this.currentVersion.setParameters(this.parameters);
    };

    VertexArrayObjectOES.prototype.refresh = function (gl) {
    };

    VertexArrayObjectOES.getTracked = function (gl, args) {
        var ext = gl.getExtension("OES_vertex_array_object");
        var glvao = gl.getParameter(ext.VERTEX_ARRAY_BINDING_OES);
        if (glvao == null) {
            // Going to fail
            return null;
        }
        return glvao.trackedObject;
    };

    VertexArrayObjectOES.setCaptures = function (gl) {
        var ext = gl.getExtension("OES_vertex_array_object");
        
        /*
        var original_renderbufferStorage = gl.renderbufferStorage;
        gl.renderbufferStorage = function () {
            var tracked = VertexArrayObjectOES.getTracked(gl, arguments);
            tracked.markDirty(true);
            tracked.currentVersion.pushCall("renderbufferStorage", arguments);

            var result = original_renderbufferStorage.apply(gl, arguments);

            // HACK: query the parameters now - easier than calculating all of them
            tracked.refresh(gl);
            tracked.currentVersion.setParameters(tracked.parameters);

            return result;
        };*/
    };

    VertexArrayObjectOES.prototype.createTarget = function (gl, version) {
        var ext = gl.getExtension("OES_vertex_array_object");
        
        var vao = ext.createVertexArrayOES();
        ext.bindVertexArrayOES(vao);

        this.replayCalls(gl, version, vao);

        return vao;
    };

    VertexArrayObjectOES.prototype.deleteTarget = function (gl, target) {
        var ext = gl.getExtension("OES_vertex_array_object");
        ext.deleteVertexArrayOES(target);
    };

    resources.VertexArrayObjectOES = VertexArrayObjectOES;

})();
(function () {
    var replay = glinamespace("gli.replay");

    var Controller = function () {
        this.output = {};

        this.currentFrame = null;
        this.callIndex = 0;
        this.stepping = false;

        this.stepCompleted = new gli.EventSource("stepCompleted");
    };

    Controller.prototype.setOutput = function (canvas) {
        this.output.canvas = canvas;

        // TODO: pull attributes from source somehow?
        var gl = this.output.gl = gli.util.getWebGLContext(canvas, null, null);
        gli.info.initialize(gl);
    };

    Controller.prototype.reset = function (force) {
        if (this.currentFrame) {
            var gl = this.output.gl;
            if (force) {
                this.currentFrame.cleanup(gl);
            }
        }

        this.currentFrame = null;
        this.callIndex = 0;
        this.stepping = false;
    };

    Controller.prototype.getCurrentState = function () {
        if (!this.output.gl) return null;
        return new gli.host.StateSnapshot(this.output.gl);
    };

    Controller.prototype.openFrame = function (frame, suppressEvents, force, useDepthShader) {
        var gl = this.output.gl;

        this.currentFrame = frame;

        if (useDepthShader) {
            frame.switchMirrors();
        } else {
            frame.switchMirrors("depth");
        }

        var depthShader = null;
        if (useDepthShader) {
            depthShader =
                "precision highp float;\n" +
                "vec4 packFloatToVec4i(const float value) {\n" +
                "   const vec4 bitSh = vec4(256.0*256.0*256.0, 256.0*256.0, 256.0, 1.0);\n" +
                "   const vec4 bitMsk = vec4(0.0, 1.0/256.0, 1.0/256.0, 1.0/256.0);\n" +
                "   vec4 res = fract(value * bitSh);\n" +
                "   res -= res.xxyz * bitMsk;\n" +
                "   return res;\n" +
                "}\n" +
                "void main() {\n" +
                "   gl_FragColor = packFloatToVec4i(gl_FragCoord.z);\n" +
                //"   gl_FragColor = vec4(gl_FragCoord.z, gl_FragCoord.z, gl_FragCoord.z, 1.0);\n" +
                "}";
        }
        frame.makeActive(gl, force, {
            fragmentShaderOverride: depthShader,
            ignoreTextureUploads: useDepthShader
        });

        this.beginStepping();
        this.callIndex = 0;
        this.endStepping(suppressEvents);
    };

    function emitMark(mark) {
        console.log("mark hit");
    };

    Controller.prototype.issueCall = function (callIndex) {
        var gl = this.output.gl;

        if (this.currentFrame == null) {
            return false;
        }
        if (this.callIndex + 1 > this.currentFrame.calls.length) {
            return false;
        }

        if (callIndex >= 0) {
            this.callIndex = callIndex;
        } else {
            callIndex = this.callIndex;
        }

        var call = this.currentFrame.calls[callIndex];

        switch (call.type) {
            case 0: // MARK
                emitMark(call);
                break;
            case 1: // GL
                call.emit(gl);
                break;
        }

        return true;
    };

    Controller.prototype.beginStepping = function () {
        this.stepping = true;
    };

    Controller.prototype.endStepping = function (suppressEvents, overrideCallIndex) {
        this.stepping = false;
        if (!suppressEvents) {
            var callIndex = overrideCallIndex || this.callIndex;
            this.stepCompleted.fire(callIndex);
        }
    };

    Controller.prototype.stepUntil = function (callIndex) {
        if (this.callIndex > callIndex) {
            var frame = this.currentFrame;
            this.reset();
            this.openFrame(frame);
        }
        var wasStepping = this.stepping;
        if (!wasStepping) {
            this.beginStepping();
        }
        while (this.callIndex <= callIndex) {
            if (this.issueCall()) {
                this.callIndex++;
            } else {
                this.endStepping();
                return false;
            }
        }
        if (!wasStepping) {
            this.endStepping();
        }
        return true;
    };

    Controller.prototype.stepForward = function () {
        return this.stepUntil(this.callIndex);
    };

    Controller.prototype.stepBackward = function () {
        if (this.callIndex <= 1) {
            return false;
        }
        return this.stepUntil(this.callIndex - 2);
    };

    Controller.prototype.stepUntilError = function () {
        //
    };

    Controller.prototype.stepUntilDraw = function () {
        this.beginStepping();
        while (this.issueCall()) {
            var call = this.currentFrame.calls[this.callIndex];
            var info = gli.info.functions[call.name];
            if (info.type == gli.FunctionType.DRAW) {
                this.callIndex++;
                break;
            } else {
                this.callIndex++;
            }
        }
        this.endStepping();
    };

    Controller.prototype.stepUntilEnd = function () {
        this.beginStepping();
        while (this.stepForward());
        this.endStepping();
    };

    Controller.prototype.runFrame = function (frame) {
        this.openFrame(frame);
        this.stepUntilEnd();
    };

    Controller.prototype.runIsolatedDraw = function (frame, targetCall) {
        this.openFrame(frame, true);

        var gl = this.output.gl;

        this.beginStepping();
        while (true) {
            var call = this.currentFrame.calls[this.callIndex];
            var shouldExec = false;

            if (call.name == "clear") {
                // Allow clear calls
                shouldExec = true;
            } else if (call == targetCall) {
                // The target call
                shouldExec = true;

                // Before executing the call, clear the color buffer
                var oldColorMask = gl.getParameter(gl.COLOR_WRITEMASK);
                var oldColorClearValue = gl.getParameter(gl.COLOR_CLEAR_VALUE);
                gl.colorMask(true, true, true, true);
                gl.clearColor(0, 0, 0, 0);
                gl.clear(gl.COLOR_BUFFER_BIT);
                gl.colorMask(oldColorMask[0], oldColorMask[1], oldColorMask[2], oldColorMask[3]);
                gl.clearColor(oldColorClearValue[0], oldColorClearValue[1], oldColorClearValue[2], oldColorClearValue[3]);
            } else {
                var info = gli.info.functions[call.name];
                if (info.type == gli.FunctionType.DRAW) {
                    // Ignore all other draws
                    shouldExec = false;
                } else {
                    shouldExec = true;
                }
            }

            if (shouldExec) {
                if (!this.issueCall()) {
                    break;
                }
            }

            this.callIndex++;
            if (call == targetCall) {
                break;
            }
        }

        var finalCallIndex = this.callIndex;

        this.openFrame(frame, true);

        this.endStepping(false, finalCallIndex);
    };
    
    function packFloatToVec4i(value) {
       //vec4 bitSh = vec4(256.0*256.0*256.0, 256.0*256.0, 256.0, 1.0);
       //vec4 bitMsk = vec4(0.0, 1.0/256.0, 1.0/256.0, 1.0/256.0);
       //vec4 res = fract(value * bitSh);
       var r = value * 256 * 256 * 256;
       var g = value * 256 * 256;
       var b = value * 256;
       var a = value;
       r = r - Math.floor(r);
       g = g - Math.floor(g);
       b = b - Math.floor(b);
       a = a - Math.floor(a);
       //res -= res.xxyz * bitMsk;
       g -= r / 256.0;
       b -= g / 256.0;
       a -= b / 256.0;
       return [r, g, b, a];
    };
    
    Controller.prototype.runDepthDraw = function (frame, targetCall) {
        this.openFrame(frame, true, undefined, true);

        var gl = this.output.gl;
        
        this.beginStepping();
        while (true) {
            var call = this.currentFrame.calls[this.callIndex];
            var shouldExec = true;
            
            var arg0;
            switch (call.name) {
            case "clear":
                arg0 = call.args[0];
                // Only allow depth clears if depth mask is set
                if (gl.getParameter(gl.DEPTH_WRITEMASK) == true) {
                    call.args[0] = call.args[0] & gl.DEPTH_BUFFER_BIT;
                    if (arg0 & gl.DEPTH_BUFFER_BIT) {
                        call.args[0] |= gl.COLOR_BUFFER_BIT;
                    }
                    var d = gl.getParameter(gl.DEPTH_CLEAR_VALUE);
                    var vd = packFloatToVec4i(d);
                    gl.clearColor(vd[0], vd[1], vd[2], vd[3]);
                } else {
                    shouldExec = false;
                }
                break;
            case "drawArrays":
            case "drawElements":
                // Only allow draws if depth mask is set
                if (gl.getParameter(gl.DEPTH_WRITEMASK) == true) {
                    // Reset state to what we need
                    gl.disable(gl.BLEND);
                    gl.colorMask(true, true, true, true);
                } else {
                    shouldExec = false;
                }
                break;
            default:
                break;
            }

            if (shouldExec) {
                if (!this.issueCall()) {
                    break;
                }
            }
            
            switch (call.name) {
            case "clear":
                call.args[0] = arg0;
                break;
            default:
                break;
            }

            this.callIndex++;
            if (call == targetCall) {
                break;
            }
        }

        var finalCallIndex = this.callIndex;

        this.openFrame(frame, true);

        this.endStepping(false, finalCallIndex);
    };

    replay.Controller = Controller;

})();
(function () {
    var replay = glinamespace("gli.replay");

    var RedundancyChecker = function () {
        function prepareCanvas(canvas) {
            var frag = document.createDocumentFragment();
            frag.appendChild(canvas);
            var gl = gli.util.getWebGLContext(canvas);
            return gl;
        };
        this.canvas = document.createElement("canvas");
        var gl = this.gl = prepareCanvas(this.canvas);

        // Cache off uniform name so that we can retrieve it later
        var original_getUniformLocation = gl.getUniformLocation;
        gl.getUniformLocation = function () {
            var result = original_getUniformLocation.apply(gl, arguments);
            if (result) {
                var tracked = arguments[0].trackedObject;
                result.sourceProgram = tracked;
                result.sourceUniformName = arguments[1];
            }
            return result;
        };
    };

    var stateCacheModifiers = {
        activeTexture: function (texture) {
            this.stateCache["ACTIVE_TEXTURE"] = texture;
        },
        bindBuffer: function (target, buffer) {
            switch (target) {
                case this.ARRAY_BUFFER:
                    this.stateCache["ARRAY_BUFFER_BINDING"] = buffer;
                    break;
                case this.ELEMENT_ARRAY_BUFFER:
                    this.stateCache["ELEMENT_ARRAY_BUFFER_BINDING"] = buffer;
                    break;
            }
        },
        bindFramebuffer: function (target, framebuffer) {
            this.stateCache["FRAMEBUFFER_BINDING"] = framebuffer;
        },
        bindRenderbuffer: function (target, renderbuffer) {
            this.stateCache["RENDERBUFFER_BINDING"] = renderbuffer;
        },
        bindTexture: function (target, texture) {
            var activeTexture = (this.stateCache["ACTIVE_TEXTURE"] - this.TEXTURE0);
            switch (target) {
                case this.TEXTURE_2D:
                    this.stateCache["TEXTURE_BINDING_2D_" + activeTexture] = texture;
                    break;
                case this.TEXTURE_CUBE_MAP:
                    this.stateCache["TEXTURE_BINDING_CUBE_MAP_" + activeTexture] = texture;
                    break;
            }
        },
        blendEquation: function (mode) {
            this.stateCache["BLEND_EQUATION_RGB"] = mode;
            this.stateCache["BLEND_EQUATION_ALPHA"] = mode;
        },
        blendEquationSeparate: function (modeRGB, modeAlpha) {
            this.stateCache["BLEND_EQUATION_RGB"] = modeRGB;
            this.stateCache["BLEND_EQUATION_ALPHA"] = modeAlpha;
        },
        blendFunc: function (sfactor, dfactor) {
            this.stateCache["BLEND_SRC_RGB"] = sfactor;
            this.stateCache["BLEND_SRC_ALPHA"] = sfactor;
            this.stateCache["BLEND_DST_RGB"] = dfactor;
            this.stateCache["BLEND_DST_ALPHA"] = dfactor;
        },
        blendFuncSeparate: function (srcRGB, dstRGB, srcAlpha, dstAlpha) {
            this.stateCache["BLEND_SRC_RGB"] = srcRGB;
            this.stateCache["BLEND_SRC_ALPHA"] = srcAlpha;
            this.stateCache["BLEND_DST_RGB"] = dstRGB;
            this.stateCache["BLEND_DST_ALPHA"] = dstAlpha;
        },
        clearColor: function (red, green, blue, alpha) {
            this.stateCache["COLOR_CLEAR_VALUE"] = [red, green, blue, alpha];
        },
        clearDepth: function (depth) {
            this.stateCache["DEPTH_CLEAR_VALUE"] = depth;
        },
        clearStencil: function (s) {
            this.stateCache["STENCIL_CLEAR_VALUE"] = s;
        },
        colorMask: function (red, green, blue, alpha) {
            this.stateCache["COLOR_WRITEMASK"] = [red, green, blue, alpha];
        },
        cullFace: function (mode) {
            this.stateCache["CULL_FACE_MODE"] = mode;
        },
        depthFunc: function (func) {
            this.stateCache["DEPTH_FUNC"] = func;
        },
        depthMask: function (flag) {
            this.stateCache["DEPTH_WRITEMASK"] = flag;
        },
        depthRange: function (zNear, zFar) {
            this.stateCache["DEPTH_RANGE"] = [zNear, zFar];
        },
        disable: function (cap) {
            switch (cap) {
                case this.BLEND:
                    this.stateCache["BLEND"] = false;
                    break;
                case this.CULL_FACE:
                    this.stateCache["CULL_FACE"] = false;
                    break;
                case this.DEPTH_TEST:
                    this.stateCache["DEPTH_TEST"] = false;
                    break;
                case this.POLYGON_OFFSET_FILL:
                    this.stateCache["POLYGON_OFFSET_FILL"] = false;
                    break;
                case this.SAMPLE_ALPHA_TO_COVERAGE:
                    this.stateCache["SAMPLE_ALPHA_TO_COVERAGE"] = false;
                    break;
                case this.SAMPLE_COVERAGE:
                    this.stateCache["SAMPLE_COVERAGE"] = false;
                    break;
                case this.SCISSOR_TEST:
                    this.stateCache["SCISSOR_TEST"] = false;
                    break;
                case this.STENCIL_TEST:
                    this.stateCache["STENCIL_TEST"] = false;
                    break;
            }
        },
        disableVertexAttribArray: function (index) {
            this.stateCache["VERTEX_ATTRIB_ARRAY_ENABLED_" + index] = false;
        },
        enable: function (cap) {
            switch (cap) {
                case this.BLEND:
                    this.stateCache["BLEND"] = true;
                    break;
                case this.CULL_FACE:
                    this.stateCache["CULL_FACE"] = true;
                    break;
                case this.DEPTH_TEST:
                    this.stateCache["DEPTH_TEST"] = true;
                    break;
                case this.POLYGON_OFFSET_FILL:
                    this.stateCache["POLYGON_OFFSET_FILL"] = true;
                    break;
                case this.SAMPLE_ALPHA_TO_COVERAGE:
                    this.stateCache["SAMPLE_ALPHA_TO_COVERAGE"] = true;
                    break;
                case this.SAMPLE_COVERAGE:
                    this.stateCache["SAMPLE_COVERAGE"] = true;
                    break;
                case this.SCISSOR_TEST:
                    this.stateCache["SCISSOR_TEST"] = true;
                    break;
                case this.STENCIL_TEST:
                    this.stateCache["STENCIL_TEST"] = true;
                    break;
            }
        },
        enableVertexAttribArray: function (index) {
            this.stateCache["VERTEX_ATTRIB_ARRAY_ENABLED_" + index] = true;
        },
        frontFace: function (mode) {
            this.stateCache["FRONT_FACE"] = mode;
        },
        hint: function (target, mode) {
            switch (target) {
                case this.GENERATE_MIPMAP_HINT:
                    this.stateCache["GENERATE_MIPMAP_HINT"] = mode;
                    break;
            }
        },
        lineWidth: function (width) {
            this.stateCache["LINE_WIDTH"] = width;
        },
        pixelStorei: function (pname, param) {
            switch (pname) {
                case this.PACK_ALIGNMENT:
                    this.stateCache["PACK_ALIGNMENT"] = param;
                    break;
                case this.UNPACK_ALIGNMENT:
                    this.stateCache["UNPACK_ALIGNMENT"] = param;
                    break;
                case this.UNPACK_COLORSPACE_CONVERSION_WEBGL:
                    this.stateCache["UNPACK_COLORSPACE_CONVERSION_WEBGL"] = param;
                    break;
                case this.UNPACK_FLIP_Y_WEBGL:
                    this.stateCache["UNPACK_FLIP_Y_WEBGL"] = param;
                    break;
                case this.UNPACK_PREMULTIPLY_ALPHA_WEBGL:
                    this.stateCache["UNPACK_PREMULTIPLY_ALPHA_WEBGL"] = param;
                    break;
            }
        },
        polygonOffset: function (factor, units) {
            this.stateCache["POLYGON_OFFSET_FACTOR"] = factor;
            this.stateCache["POLYGON_OFFSET_UNITS"] = units;
        },
        sampleCoverage: function (value, invert) {
            this.stateCache["SAMPLE_COVERAGE_VALUE"] = value;
            this.stateCache["SAMPLE_COVERAGE_INVERT"] = invert;
        },
        scissor: function (x, y, width, height) {
            this.stateCache["SCISSOR_BOX"] = [x, y, width, height];
        },
        stencilFunc: function (func, ref, mask) {
            this.stateCache["STENCIL_FUNC"] = func;
            this.stateCache["STENCIL_REF"] = ref;
            this.stateCache["STENCIL_VALUE_MASK"] = mask;
            this.stateCache["STENCIL_BACK_FUNC"] = func;
            this.stateCache["STENCIL_BACK_REF"] = ref;
            this.stateCache["STENCIL_BACK_VALUE_MASK"] = mask;
        },
        stencilFuncSeparate: function (face, func, ref, mask) {
            switch (face) {
                case this.FRONT:
                    this.stateCache["STENCIL_FUNC"] = func;
                    this.stateCache["STENCIL_REF"] = ref;
                    this.stateCache["STENCIL_VALUE_MASK"] = mask;
                    break;
                case this.BACK:
                    this.stateCache["STENCIL_BACK_FUNC"] = func;
                    this.stateCache["STENCIL_BACK_REF"] = ref;
                    this.stateCache["STENCIL_BACK_VALUE_MASK"] = mask;
                    break;
                case this.FRONT_AND_BACK:
                    this.stateCache["STENCIL_FUNC"] = func;
                    this.stateCache["STENCIL_REF"] = ref;
                    this.stateCache["STENCIL_VALUE_MASK"] = mask;
                    this.stateCache["STENCIL_BACK_FUNC"] = func;
                    this.stateCache["STENCIL_BACK_REF"] = ref;
                    this.stateCache["STENCIL_BACK_VALUE_MASK"] = mask;
                    break;
            }
        },
        stencilMask: function (mask) {
            this.stateCache["STENCIL_WRITEMASK"] = mask;
            this.stateCache["STENCIL_BACK_WRITEMASK"] = mask;
        },
        stencilMaskSeparate: function (face, mask) {
            switch (face) {
                case this.FRONT:
                    this.stateCache["STENCIL_WRITEMASK"] = mask;
                    break;
                case this.BACK:
                    this.stateCache["STENCIL_BACK_WRITEMASK"] = mask;
                    break;
                case this.FRONT_AND_BACK:
                    this.stateCache["STENCIL_WRITEMASK"] = mask;
                    this.stateCache["STENCIL_BACK_WRITEMASK"] = mask;
                    break;
            }
        },
        stencilOp: function (fail, zfail, zpass) {
            this.stateCache["STENCIL_FAIL"] = fail;
            this.stateCache["STENCIL_PASS_DEPTH_FAIL"] = zfail;
            this.stateCache["STENCIL_PASS_DEPTH_PASS"] = zpass;
            this.stateCache["STENCIL_BACK_FAIL"] = fail;
            this.stateCache["STENCIL_BACK_PASS_DEPTH_FAIL"] = zfail;
            this.stateCache["STENCIL_BACK_PASS_DEPTH_PASS"] = zpass;
        },
        stencilOpSeparate: function (face, fail, zfail, zpass) {
            switch (face) {
                case this.FRONT:
                    this.stateCache["STENCIL_FAIL"] = fail;
                    this.stateCache["STENCIL_PASS_DEPTH_FAIL"] = zfail;
                    this.stateCache["STENCIL_PASS_DEPTH_PASS"] = zpass;
                    break;
                case this.BACK:
                    this.stateCache["STENCIL_BACK_FAIL"] = fail;
                    this.stateCache["STENCIL_BACK_PASS_DEPTH_FAIL"] = zfail;
                    this.stateCache["STENCIL_BACK_PASS_DEPTH_PASS"] = zpass;
                    break;
                case this.FRONT_AND_BACK:
                    this.stateCache["STENCIL_FAIL"] = fail;
                    this.stateCache["STENCIL_PASS_DEPTH_FAIL"] = zfail;
                    this.stateCache["STENCIL_PASS_DEPTH_PASS"] = zpass;
                    this.stateCache["STENCIL_BACK_FAIL"] = fail;
                    this.stateCache["STENCIL_BACK_PASS_DEPTH_FAIL"] = zfail;
                    this.stateCache["STENCIL_BACK_PASS_DEPTH_PASS"] = zpass;
                    break;
            }
        },
        uniformN: function (location, v) {
            if (!location) {
                return;
            }
            var program = location.sourceProgram;
            if (v.slice !== undefined) {
                v = v.slice();
            } else {
                v = new Float32Array(v);
            }
            program.uniformCache[location.sourceUniformName] = v;
        },
        uniform1f: function (location, v0) {
            stateCacheModifiers.uniformN.call(this, location, [v0]);
        },
        uniform2f: function (location, v0, v1) {
            stateCacheModifiers.uniformN.call(this, location, [v0, v1]);
        },
        uniform3f: function (location, v0, v1, v2) {
            stateCacheModifiers.uniformN.call(this, location, [v0, v1, v2]);
        },
        uniform4f: function (location, v0, v1, v2, v3) {
            stateCacheModifiers.uniformN.call(this, location, [v0, v1, v2, v3]);
        },
        uniform1i: function (location, v0) {
            stateCacheModifiers.uniformN.call(this, location, [v0]);
        },
        uniform2i: function (location, v0, v1) {
            stateCacheModifiers.uniformN.call(this, location, [v0, v1]);
        },
        uniform3i: function (location, v0, v1, v2) {
            stateCacheModifiers.uniformN.call(this, location, [v0, v1, v2]);
        },
        uniform4i: function (location, v0, v1, v2, v3) {
            stateCacheModifiers.uniformN.call(this, location, [v0, v1, v2, v3]);
        },
        uniform1fv: function (location, v) {
            stateCacheModifiers.uniformN.call(this, location, v);
        },
        uniform2fv: function (location, v) {
            stateCacheModifiers.uniformN.call(this, location, v);
        },
        uniform3fv: function (location, v) {
            stateCacheModifiers.uniformN.call(this, location, v);
        },
        uniform4fv: function (location, v) {
            stateCacheModifiers.uniformN.call(this, location, v);
        },
        uniform1iv: function (location, v) {
            stateCacheModifiers.uniformN.call(this, location, v);
        },
        uniform2iv: function (location, v) {
            stateCacheModifiers.uniformN.call(this, location, v);
        },
        uniform3iv: function (location, v) {
            stateCacheModifiers.uniformN.call(this, location, v);
        },
        uniform4iv: function (location, v) {
            stateCacheModifiers.uniformN.call(this, location, v);
        },
        uniformMatrix2fv: function (location, transpose, v) {
            // TODO: transpose
            stateCacheModifiers.uniformN.call(this, location, v);
        },
        uniformMatrix3fv: function (location, transpose, v) {
            // TODO: transpose
            stateCacheModifiers.uniformN.call(this, location, v);
        },
        uniformMatrix4fv: function (location, transpose, v) {
            // TODO: transpose
            stateCacheModifiers.uniformN.call(this, location, v);
        },
        useProgram: function (program) {
            this.stateCache["CURRENT_PROGRAM"] = program;
        },
        vertexAttrib1f: function (indx, x) {
            this.stateCache["CURRENT_VERTEX_ATTRIB_" + indx] = [x, 0, 0, 1];
        },
        vertexAttrib2f: function (indx, x, y) {
            this.stateCache["CURRENT_VERTEX_ATTRIB_" + indx] = [x, y, 0, 1];
        },
        vertexAttrib3f: function (indx, x, y, z) {
            this.stateCache["CURRENT_VERTEX_ATTRIB_" + indx] = [x, y, z, 1];
        },
        vertexAttrib4f: function (indx, x, y, z, w) {
            this.stateCache["CURRENT_VERTEX_ATTRIB_" + indx] = [x, y, z, w];
        },
        vertexAttrib1fv: function (indx, v) {
            this.stateCache["CURRENT_VERTEX_ATTRIB_" + indx] = [v[0], 0, 0, 1];
        },
        vertexAttrib2fv: function (indx, v) {
            this.stateCache["CURRENT_VERTEX_ATTRIB_" + indx] = [v[0], v[1], 0, 1];
        },
        vertexAttrib3fv: function (indx, v) {
            this.stateCache["CURRENT_VERTEX_ATTRIB_" + indx] = [v[0], v[1], v[2], 1];
        },
        vertexAttrib4fv: function (indx, v) {
            this.stateCache["CURRENT_VERTEX_ATTRIB_" + indx] = [v[0], v[1], v[2], v[3]];
        },
        vertexAttribPointer: function (indx, size, type, normalized, stride, offset) {
            this.stateCache["VERTEX_ATTRIB_ARRAY_SIZE_" + indx] = size;
            this.stateCache["VERTEX_ATTRIB_ARRAY_TYPE_" + indx] = type;
            this.stateCache["VERTEX_ATTRIB_ARRAY_NORMALIZED_" + indx] = normalized;
            this.stateCache["VERTEX_ATTRIB_ARRAY_STRIDE_" + indx] = stride;
            this.stateCache["VERTEX_ATTRIB_ARRAY_POINTER_" + indx] = offset;
            this.stateCache["VERTEX_ATTRIB_ARRAY_BUFFER_BINDING_" + indx] = this.stateCache["ARRAY_BUFFER_BINDING"];
        },
        viewport: function (x, y, width, height) {
            this.stateCache["VIEWPORT"] = [x, y, width, height];
        }
    };

    var redundantChecks = {
        activeTexture: function (texture) {
            return this.stateCache["ACTIVE_TEXTURE"] == texture;
        },
        bindBuffer: function (target, buffer) {
            switch (target) {
                case this.ARRAY_BUFFER:
                    return this.stateCache["ARRAY_BUFFER_BINDING"] == buffer;
                case this.ELEMENT_ARRAY_BUFFER:
                    return this.stateCache["ELEMENT_ARRAY_BUFFER_BINDING"] == buffer;
                default:
                    return false;
            }
        },
        bindFramebuffer: function (target, framebuffer) {
            return this.stateCache["FRAMEBUFFER_BINDING"] == framebuffer;
        },
        bindRenderbuffer: function (target, renderbuffer) {
            return this.stateCache["RENDERBUFFER_BINDING"] == renderbuffer;
        },
        bindTexture: function (target, texture) {
            var activeTexture = (this.stateCache["ACTIVE_TEXTURE"] - this.TEXTURE0);
            switch (target) {
                case this.TEXTURE_2D:
                    return this.stateCache["TEXTURE_BINDING_2D_" + activeTexture] == texture;
                case this.TEXTURE_CUBE_MAP:
                    return this.stateCache["TEXTURE_BINDING_CUBE_MAP_" + activeTexture] == texture;
            }
            return false;
        },
        blendEquation: function (mode) {
            return (this.stateCache["BLEND_EQUATION_RGB"] == mode) && (this.stateCache["BLEND_EQUATION_ALPHA"] == mode);
        },
        blendEquationSeparate: function (modeRGB, modeAlpha) {
            return (this.stateCache["BLEND_EQUATION_RGB"] == modeRGB) && (this.stateCache["BLEND_EQUATION_ALPHA"] == modeAlpha);
        },
        blendFunc: function (sfactor, dfactor) {
            return (this.stateCache["BLEND_SRC_RGB"] == sfactor) && (this.stateCache["BLEND_SRC_ALPHA"] == sfactor) &&
                   (this.stateCache["BLEND_DST_RGB"] == dfactor) && (this.stateCache["BLEND_DST_ALPHA"] == dfactor);
        },
        blendFuncSeparate: function (srcRGB, dstRGB, srcAlpha, dstAlpha) {
            return (this.stateCache["BLEND_SRC_RGB"] == srcRGB) && (this.stateCache["BLEND_SRC_ALPHA"] == srcAlpha) &&
                   (this.stateCache["BLEND_DST_RGB"] == dstRGB) && (this.stateCache["BLEND_DST_ALPHA"] == dstAlpha);
        },
        clearColor: function (red, green, blue, alpha) {
            return gli.util.arrayCompare(this.stateCache["COLOR_CLEAR_VALUE"], [red, green, blue, alpha]);
        },
        clearDepth: function (depth) {
            return this.stateCache["DEPTH_CLEAR_VALUE"] == depth;
        },
        clearStencil: function (s) {
            return this.stateCache["STENCIL_CLEAR_VALUE"] == s;
        },
        colorMask: function (red, green, blue, alpha) {
            return gli.util.arrayCompare(this.stateCache["COLOR_WRITEMASK"], [red, green, blue, alpha]);
        },
        cullFace: function (mode) {
            return this.stateCache["CULL_FACE_MODE"] == mode;
        },
        depthFunc: function (func) {
            return this.stateCache["DEPTH_FUNC"] == func;
        },
        depthMask: function (flag) {
            return this.stateCache["DEPTH_WRITEMASK"] == flag;
        },
        depthRange: function (zNear, zFar) {
            return gli.util.arrayCompare(this.stateCache["DEPTH_RANGE"], [zNear, zFar]);
        },
        disable: function (cap) {
            switch (cap) {
                case this.BLEND:
                    return this.stateCache["BLEND"] == false;
                case this.CULL_FACE:
                    return this.stateCache["CULL_FACE"] == false;
                case this.DEPTH_TEST:
                    return this.stateCache["DEPTH_TEST"] == false;
                case this.POLYGON_OFFSET_FILL:
                    return this.stateCache["POLYGON_OFFSET_FILL"] == false;
                case this.SAMPLE_ALPHA_TO_COVERAGE:
                    return this.stateCache["SAMPLE_ALPHA_TO_COVERAGE"] == false;
                case this.SAMPLE_COVERAGE:
                    return this.stateCache["SAMPLE_COVERAGE"] == false;
                case this.SCISSOR_TEST:
                    return this.stateCache["SCISSOR_TEST"] == false;
                case this.STENCIL_TEST:
                    return this.stateCache["STENCIL_TEST"] == false;
                default:
                    return false;
            }
        },
        disableVertexAttribArray: function (index) {
            return this.stateCache["VERTEX_ATTRIB_ARRAY_ENABLED_" + index] == false;
        },
        enable: function (cap) {
            switch (cap) {
                case this.BLEND:
                    return this.stateCache["BLEND"] == true;
                case this.CULL_FACE:
                    return this.stateCache["CULL_FACE"] == true;
                case this.DEPTH_TEST:
                    return this.stateCache["DEPTH_TEST"] == true;
                case this.POLYGON_OFFSET_FILL:
                    return this.stateCache["POLYGON_OFFSET_FILL"] == true;
                case this.SAMPLE_ALPHA_TO_COVERAGE:
                    return this.stateCache["SAMPLE_ALPHA_TO_COVERAGE"] == true;
                case this.SAMPLE_COVERAGE:
                    return this.stateCache["SAMPLE_COVERAGE"] == true;
                case this.SCISSOR_TEST:
                    return this.stateCache["SCISSOR_TEST"] == true;
                case this.STENCIL_TEST:
                    return this.stateCache["STENCIL_TEST"] == true;
                default:
                    return false;
            }
        },
        enableVertexAttribArray: function (index) {
            return this.stateCache["VERTEX_ATTRIB_ARRAY_ENABLED_" + index] == true;
        },
        frontFace: function (mode) {
            return this.stateCache["FRONT_FACE"] == mode;
        },
        hint: function (target, mode) {
            switch (target) {
                case this.GENERATE_MIPMAP_HINT:
                    return this.stateCache["GENERATE_MIPMAP_HINT"] == mode;
                default:
                    return false;
            }
        },
        lineWidth: function (width) {
            return this.stateCache["LINE_WIDTH"] == width;
        },
        pixelStorei: function (pname, param) {
            switch (pname) {
                case this.PACK_ALIGNMENT:
                    return this.stateCache["PACK_ALIGNMENT"] == param;
                case this.UNPACK_ALIGNMENT:
                    return this.stateCache["UNPACK_ALIGNMENT"] == param;
                case this.UNPACK_COLORSPACE_CONVERSION_WEBGL:
                    return this.stateCache["UNPACK_COLORSPACE_CONVERSION_WEBGL"] == param;
                case this.UNPACK_FLIP_Y_WEBGL:
                    return this.stateCache["UNPACK_FLIP_Y_WEBGL"] == param;
                case this.UNPACK_PREMULTIPLY_ALPHA_WEBGL:
                    return this.stateCache["UNPACK_PREMULTIPLY_ALPHA_WEBGL"] == param;
                default:
                    return false;
            }
        },
        polygonOffset: function (factor, units) {
            return (this.stateCache["POLYGON_OFFSET_FACTOR"] == factor) && (this.stateCache["POLYGON_OFFSET_UNITS"] == units);
        },
        sampleCoverage: function (value, invert) {
            return (this.stateCache["SAMPLE_COVERAGE_VALUE"] == value) && (this.stateCache["SAMPLE_COVERAGE_INVERT"] == invert);
        },
        scissor: function (x, y, width, height) {
            return gli.util.arrayCompare(this.stateCache["SCISSOR_BOX"], [x, y, width, height]);
        },
        stencilFunc: function (func, ref, mask) {
            return
                (this.stateCache["STENCIL_FUNC"] == func) && (this.stateCache["STENCIL_REF"] == ref) && (this.stateCache["STENCIL_VALUE_MASK"] == mask) &&
                (this.stateCache["STENCIL_BACK_FUNC"] == func) && (this.stateCache["STENCIL_BACK_REF"] == ref) && (this.stateCache["STENCIL_BACK_VALUE_MASK"] == mask);
        },
        stencilFuncSeparate: function (face, func, ref, mask) {
            switch (face) {
                case this.FRONT:
                    return (this.stateCache["STENCIL_FUNC"] == func) && (this.stateCache["STENCIL_REF"] == ref) && (this.stateCache["STENCIL_VALUE_MASK"] == mask);
                case this.BACK:
                    return (this.stateCache["STENCIL_BACK_FUNC"] == func) && (this.stateCache["STENCIL_BACK_REF"] == ref) && (this.stateCache["STENCIL_BACK_VALUE_MASK"] == mask);
                case this.FRONT_AND_BACK:
                    return (this.stateCache["STENCIL_FUNC"] == func) && (this.stateCache["STENCIL_REF"] == ref) && (this.stateCache["STENCIL_VALUE_MASK"] == mask) &&
                           (this.stateCache["STENCIL_BACK_FUNC"] == func) && (this.stateCache["STENCIL_BACK_REF"] == ref) && (this.stateCache["STENCIL_BACK_VALUE_MASK"] == mask);
                default:
                    return false;
            }
        },
        stencilMask: function (mask) {
            return (this.stateCache["STENCIL_WRITEMASK"] == mask) && (this.stateCache["STENCIL_BACK_WRITEMASK"] == mask);
        },
        stencilMaskSeparate: function (face, mask) {
            switch (face) {
                case this.FRONT:
                    return this.stateCache["STENCIL_WRITEMASK"] == mask;
                case this.BACK:
                    return this.stateCache["STENCIL_BACK_WRITEMASK"] == mask;
                case this.FRONT_AND_BACK:
                    return (this.stateCache["STENCIL_WRITEMASK"] == mask) && (this.stateCache["STENCIL_BACK_WRITEMASK"] == mask);
                default:
                    return false;
            }
        },
        stencilOp: function (fail, zfail, zpass) {
            return (this.stateCache["STENCIL_FAIL"] == fail) && (this.stateCache["STENCIL_PASS_DEPTH_FAIL"] == zfail) && (this.stateCache["STENCIL_PASS_DEPTH_PASS"] == zpass) &&
                   (this.stateCache["STENCIL_BACK_FAIL"] == fail) && (this.stateCache["STENCIL_BACK_PASS_DEPTH_FAIL"] == zfail) && (this.stateCache["STENCIL_BACK_PASS_DEPTH_PASS"] == zpass);
        },
        stencilOpSeparate: function (face, fail, zfail, zpass) {
            switch (face) {
                case this.FRONT:
                    return (this.stateCache["STENCIL_FAIL"] == fail) && (this.stateCache["STENCIL_PASS_DEPTH_FAIL"] == zfail) && (this.stateCache["STENCIL_PASS_DEPTH_PASS"] == zpass);
                case this.BACK:
                    return (this.stateCache["STENCIL_BACK_FAIL"] == fail) && (this.stateCache["STENCIL_BACK_PASS_DEPTH_FAIL"] == zfail) && (this.stateCache["STENCIL_BACK_PASS_DEPTH_PASS"] == zpass);
                case this.FRONT_AND_BACK:
                    return (this.stateCache["STENCIL_FAIL"] == fail) && (this.stateCache["STENCIL_PASS_DEPTH_FAIL"] == zfail) && (this.stateCache["STENCIL_PASS_DEPTH_PASS"] == zpass) &&
                           (this.stateCache["STENCIL_BACK_FAIL"] == fail) && (this.stateCache["STENCIL_BACK_PASS_DEPTH_FAIL"] == zfail) && (this.stateCache["STENCIL_BACK_PASS_DEPTH_PASS"] == zpass);
                default:
                    return false;
            }
        },
        uniformN: function (location, v) {
            if (!location) {
                return true;
            }
            var program = location.sourceProgram;
            if (!program.uniformCache) return false;
            return gli.util.arrayCompare(program.uniformCache[location.sourceUniformName], v);
        },
        uniform1f: function (location, v0) {
            return redundantChecks.uniformN.call(this, location, [v0]);
        },
        uniform2f: function (location, v0, v1) {
            return redundantChecks.uniformN.call(this, location, [v0, v1]);
        },
        uniform3f: function (location, v0, v1, v2) {
            return redundantChecks.uniformN.call(this, location, [v0, v1, v2]);
        },
        uniform4f: function (location, v0, v1, v2, v3) {
            return redundantChecks.uniformN.call(this, location, [v0, v1, v2, v3]);
        },
        uniform1i: function (location, v0) {
            return redundantChecks.uniformN.call(this, location, [v0]);
        },
        uniform2i: function (location, v0, v1) {
            return redundantChecks.uniformN.call(this, location, [v0, v1]);
        },
        uniform3i: function (location, v0, v1, v2) {
            return redundantChecks.uniformN.call(this, location, [v0, v1, v2]);
        },
        uniform4i: function (location, v0, v1, v2, v3) {
            return redundantChecks.uniformN.call(this, location, [v0, v1, v2, v3]);
        },
        uniform1fv: function (location, v) {
            return redundantChecks.uniformN.call(this, location, v);
        },
        uniform2fv: function (location, v) {
            return redundantChecks.uniformN.call(this, location, v);
        },
        uniform3fv: function (location, v) {
            return redundantChecks.uniformN.call(this, location, v);
        },
        uniform4fv: function (location, v) {
            return redundantChecks.uniformN.call(this, location, v);
        },
        uniform1iv: function (location, v) {
            return redundantChecks.uniformN.call(this, location, v);
        },
        uniform2iv: function (location, v) {
            return redundantChecks.uniformN.call(this, location, v);
        },
        uniform3iv: function (location, v) {
            return redundantChecks.uniformN.call(this, location, v);
        },
        uniform4iv: function (location, v) {
            return redundantChecks.uniformN.call(this, location, v);
        },
        uniformMatrix2fv: function (location, transpose, v) {
            // TODO: transpose
            return redundantChecks.uniformN.call(this, location, v);
        },
        uniformMatrix3fv: function (location, transpose, v) {
            // TODO: transpose
            return redundantChecks.uniformN.call(this, location, v);
        },
        uniformMatrix4fv: function (location, transpose, v) {
            // TODO: transpose
            return redundantChecks.uniformN.call(this, location, v);
        },
        useProgram: function (program) {
            return this.stateCache["CURRENT_PROGRAM"] == program;
        },
        vertexAttrib1f: function (indx, x) {
            return gli.util.arrayCompare(this.stateCache["CURRENT_VERTEX_ATTRIB_" + indx], [x, 0, 0, 1]);
        },
        vertexAttrib2f: function (indx, x, y) {
            return gli.util.arrayCompare(this.stateCache["CURRENT_VERTEX_ATTRIB_" + indx], [x, y, 0, 1]);
        },
        vertexAttrib3f: function (indx, x, y, z) {
            return gli.util.arrayCompare(this.stateCache["CURRENT_VERTEX_ATTRIB_" + indx], [x, y, z, 1]);
        },
        vertexAttrib4f: function (indx, x, y, z, w) {
            return gli.util.arrayCompare(this.stateCache["CURRENT_VERTEX_ATTRIB_" + indx], [x, y, z, w]);
        },
        vertexAttrib1fv: function (indx, v) {
            return gli.util.arrayCompare(this.stateCache["CURRENT_VERTEX_ATTRIB_" + indx], [v[0], 0, 0, 1]);
        },
        vertexAttrib2fv: function (indx, v) {
            return gli.util.arrayCompare(this.stateCache["CURRENT_VERTEX_ATTRIB_" + indx], [v[0], v[1], 0, 1]);
        },
        vertexAttrib3fv: function (indx, v) {
            return gli.util.arrayCompare(this.stateCache["CURRENT_VERTEX_ATTRIB_" + indx], [v[0], v[1], v[2], 1]);
        },
        vertexAttrib4fv: function (indx, v) {
            return gli.util.arrayCompare(this.stateCache["CURRENT_VERTEX_ATTRIB_" + indx], v);
        },
        vertexAttribPointer: function (indx, size, type, normalized, stride, offset) {
            return (this.stateCache["VERTEX_ATTRIB_ARRAY_SIZE_" + indx] == size) &&
                   (this.stateCache["VERTEX_ATTRIB_ARRAY_TYPE_" + indx] == type) &&
                   (this.stateCache["VERTEX_ATTRIB_ARRAY_NORMALIZED_" + indx] == normalized) &&
                   (this.stateCache["VERTEX_ATTRIB_ARRAY_STRIDE_" + indx] == stride) &&
                   (this.stateCache["VERTEX_ATTRIB_ARRAY_POINTER_" + indx] == offset) &&
                   (this.stateCache["VERTEX_ATTRIB_ARRAY_BUFFER_BINDING_" + indx] == this.stateCache["ARRAY_BUFFER_BINDING"]);
        },
        viewport: function (x, y, width, height) {
            return gli.util.arrayCompare(this.stateCache["VIEWPORT"], [x, y, width, height]);
        }
    };

    RedundancyChecker.prototype.initializeStateCache = function (gl) {
        var stateCache = {};

        var stateParameters = ["ACTIVE_TEXTURE", "ARRAY_BUFFER_BINDING", "BLEND", "BLEND_COLOR", "BLEND_DST_ALPHA", "BLEND_DST_RGB", "BLEND_EQUATION_ALPHA", "BLEND_EQUATION_RGB", "BLEND_SRC_ALPHA", "BLEND_SRC_RGB", "COLOR_CLEAR_VALUE", "COLOR_WRITEMASK", "CULL_FACE", "CULL_FACE_MODE", "CURRENT_PROGRAM", "DEPTH_FUNC", "DEPTH_RANGE", "DEPTH_WRITEMASK", "ELEMENT_ARRAY_BUFFER_BINDING", "FRAMEBUFFER_BINDING", "FRONT_FACE", "GENERATE_MIPMAP_HINT", "LINE_WIDTH", "PACK_ALIGNMENT", "POLYGON_OFFSET_FACTOR", "POLYGON_OFFSET_FILL", "POLYGON_OFFSET_UNITS", "RENDERBUFFER_BINDING", "POLYGON_OFFSET_FACTOR", "POLYGON_OFFSET_FILL", "POLYGON_OFFSET_UNITS", "SAMPLE_COVERAGE_INVERT", "SAMPLE_COVERAGE_VALUE", "SCISSOR_BOX", "SCISSOR_TEST", "STENCIL_BACK_FAIL", "STENCIL_BACK_FUNC", "STENCIL_BACK_PASS_DEPTH_FAIL", "STENCIL_BACK_PASS_DEPTH_PASS", "STENCIL_BACK_REF", "STENCIL_BACK_VALUE_MASK", "STENCIL_BACK_WRITEMASK", "STENCIL_CLEAR_VALUE", "STENCIL_FAIL", "STENCIL_FUNC", "STENCIL_PASS_DEPTH_FAIL", "STENCIL_PASS_DEPTH_PASS", "STENCIL_REF", "STENCIL_TEST", "STENCIL_VALUE_MASK", "STENCIL_WRITEMASK", "UNPACK_ALIGNMENT", "UNPACK_COLORSPACE_CONVERSION_WEBGL", "UNPACK_FLIP_Y_WEBGL", "UNPACK_PREMULTIPLY_ALPHA_WEBGL", "VIEWPORT"];
        for (var n = 0; n < stateParameters.length; n++) {
            try {
                stateCache[stateParameters[n]] = gl.getParameter(gl[stateParameters[n]]);
            } catch (e) {
                // Ignored
            }
        }
        var maxTextureUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
        var originalActiveTexture = gl.getParameter(gl.ACTIVE_TEXTURE);
        for (var n = 0; n < maxTextureUnits; n++) {
            gl.activeTexture(gl.TEXTURE0 + n);
            stateCache["TEXTURE_BINDING_2D_" + n] = gl.getParameter(gl.TEXTURE_BINDING_2D);
            stateCache["TEXTURE_BINDING_CUBE_MAP_" + n] = gl.getParameter(gl.TEXTURE_BINDING_CUBE_MAP);
        }
        gl.activeTexture(originalActiveTexture);
        var maxVertexAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
        for (var n = 0; n < maxVertexAttribs; n++) {
            stateCache["VERTEX_ATTRIB_ARRAY_ENABLED_" + n] = gl.getVertexAttrib(n, gl.VERTEX_ATTRIB_ARRAY_ENABLED);
            stateCache["VERTEX_ATTRIB_ARRAY_BUFFER_BINDING_" + n] = gl.getVertexAttrib(n, gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING);
            stateCache["VERTEX_ATTRIB_ARRAY_SIZE_" + n] = gl.getVertexAttrib(n, gl.VERTEX_ATTRIB_ARRAY_SIZE);
            stateCache["VERTEX_ATTRIB_ARRAY_STRIDE_" + n] = gl.getVertexAttrib(n, gl.VERTEX_ATTRIB_ARRAY_STRIDE);
            stateCache["VERTEX_ATTRIB_ARRAY_TYPE_" + n] = gl.getVertexAttrib(n, gl.VERTEX_ATTRIB_ARRAY_TYPE);
            stateCache["VERTEX_ATTRIB_ARRAY_NORMALIZED_" + n] = gl.getVertexAttrib(n, gl.VERTEX_ATTRIB_ARRAY_NORMALIZED);
            stateCache["VERTEX_ATTRIB_ARRAY_POINTER_" + n] = gl.getVertexAttribOffset(n, gl.VERTEX_ATTRIB_ARRAY_POINTER);
            stateCache["CURRENT_VERTEX_ATTRIB_" + n] = gl.getVertexAttrib(n, gl.CURRENT_VERTEX_ATTRIB);
        }

        return stateCache;
    };

    RedundancyChecker.prototype.cacheUniformValues = function (gl, frame) {
        var originalProgram = gl.getParameter(gl.CURRENT_PROGRAM);

        for (var n = 0; n < frame.uniformValues.length; n++) {
            var program = frame.uniformValues[n].program;
            var values = frame.uniformValues[n].values;

            var target = program.mirror.target;
            if (!target) {
                continue;
            }

            program.uniformCache = {};

            gl.useProgram(target);

            for (var name in values) {
                var data = values[name];
                var loc = gl.getUniformLocation(target, name);

                switch (data.type) {
                    case gl.FLOAT:
                    case gl.FLOAT_VEC2:
                    case gl.FLOAT_VEC3:
                    case gl.FLOAT_VEC4:
                    case gl.INT:
                    case gl.INT_VEC2:
                    case gl.INT_VEC3:
                    case gl.INT_VEC4:
                    case gl.BOOL:
                    case gl.BOOL_VEC2:
                    case gl.BOOL_VEC3:
                    case gl.BOOL_VEC4:
                    case gl.SAMPLER_2D:
                    case gl.SAMPLER_CUBE:
                        if (data.value && data.value.length !== undefined) {
                            program.uniformCache[name] = data.value;
                        } else {
                            program.uniformCache[name] = [data.value];
                        }
                        break;
                    case gl.FLOAT_MAT2:
                    case gl.FLOAT_MAT3:
                    case gl.FLOAT_MAT4:
                        program.uniformCache[name] = data.value;
                        break;
                }
            }
        }

        gl.useProgram(originalProgram);
    };

    RedundancyChecker.prototype.run = function (frame) {
        // TODO: if we every support editing, we may want to recheck
        if (frame.hasCheckedRedundancy) {
            return;
        }
        frame.hasCheckedRedundancy = true;

        var gl = this.gl;

        frame.switchMirrors("redundancy");
        frame.makeActive(gl, false, {
            ignoreBufferUploads: true,
            ignoreTextureUploads: true
        });

        // Setup initial state cache (important to do here so we have the frame initial state)
        gl.stateCache = this.initializeStateCache(gl);

        // Cache all uniform values for checking
        this.cacheUniformValues(gl, frame);

        var redundantCalls = 0;
        var calls = frame.calls;
        for (var n = 0; n < calls.length; n++) {
            var call = calls[n];
            if (call.type !== 1) {
                continue;
            }

            var redundantCheck = redundantChecks[call.name];
            var stateCacheModifier = stateCacheModifiers[call.name];
            if (!redundantCheck && !stateCacheModifier) {
                continue;
            }

            var args = call.transformArgs(gl);

            if (redundantCheck && redundantCheck.apply(gl, args)) {
                redundantCalls++;
                call.isRedundant = true;
            }

            if (stateCacheModifier) {
                stateCacheModifier.apply(gl, args);
            }
        }

        frame.redundantCalls = redundantCalls;

        frame.cleanup(gl);
        frame.switchMirrors();
    };

    var cachedChecker = null;
    RedundancyChecker.checkFrame = function (frame) {
        if (!cachedChecker) {
            cachedChecker = new RedundancyChecker();
        }

        cachedChecker.run(frame);
    };

    replay.RedundancyChecker = RedundancyChecker;

})();
(function () {
    var ui = glinamespace("gli.ui");
    var host = glinamespace("gli.host");

    var Toolbar = function (w) {
        var self = this;
        var document = w.document;

        this.window = w;
        this.elements = {
            bar: w.root.getElementsByClassName("window-toolbar")[0]
        };
        this.buttons = {};

        function appendRightRegion(title, buttons) {
            var regionDiv = document.createElement("div");
            regionDiv.className = "toolbar-right-region";

            var titleDiv = document.createElement("div");
            titleDiv.className = "toolbar-right-region-title";
            titleDiv.textContent = title;
            regionDiv.appendChild(titleDiv);

            var activeIndex = 0;
            var previousSelection = null;

            for (var n = 0; n < buttons.length; n++) {
                var button = buttons[n];

                var buttonSpan = document.createElement("span");
                if (button.name) {
                    buttonSpan.textContent = button.name;
                }
                if (button.className) {
                    buttonSpan.className = button.className;
                }
                buttonSpan.title = button.title ? button.title : button.name;
                regionDiv.appendChild(buttonSpan);
                button.el = buttonSpan;

                (function (n, button) {
                    buttonSpan.onclick = function () {
                        if (previousSelection) {
                            previousSelection.el.className = previousSelection.el.className.replace(" toolbar-right-region-active", "");
                        }
                        previousSelection = button;
                        button.el.className += " toolbar-right-region-active";

                        button.onclick.apply(self);
                    };
                })(n, button);

                if (n < buttons.length - 1) {
                    var sep = document.createElement("div");
                    sep.className = "toolbar-right-region-sep";
                    sep.textContent = " | ";
                    regionDiv.appendChild(sep);
                }
            }

            // Select first
            buttons[0].el.onclick();

            self.elements.bar.appendChild(regionDiv);
        };
        function appendRightButtons(buttons) {
            var regionDiv = document.createElement("div");
            regionDiv.className = "toolbar-right-buttons";

            for (var n = 0; n < buttons.length; n++) {
                var button = buttons[n];

                var buttonDiv = document.createElement("div");
                if (button.name) {
                    buttonDiv.textContent = button.name;
                }
                buttonDiv.className = "toolbar-right-button";
                if (button.className) {
                    buttonDiv.className += " " + button.className;
                }
                buttonDiv.title = button.title ? button.title : button.name;
                regionDiv.appendChild(buttonDiv);
                button.el = buttonDiv;

                (function (button) {
                    buttonDiv.onclick = function () {
                        button.onclick.apply(self);
                    };
                })(button);

                if (n < buttons.length - 1) {
                    var sep = document.createElement("div");
                    sep.className = "toolbar-right-buttons-sep";
                    sep.textContent = " ";
                    regionDiv.appendChild(sep);
                }
            }

            self.elements.bar.appendChild(regionDiv);
        };

        appendRightButtons([
            /*{
                title: "Options",
                className: "toolbar-right-button-options",
                onclick: function () {
                    alert("options");
                }
            },*/
            {
                title: "Hide inspector (F11)",
                className: "toolbar-right-button-close",
                onclick: function () {
                    gli.host.requestFullUI(w.context);
                }
            }
        ]);
		/*
        appendRightRegion("Version: ", [
            {
                name: "Live",
                onclick: function () {
                    w.setActiveVersion(null);
                }
            },
            {
                name: "Current",
                onclick: function () {
                    w.setActiveVersion("current");
                }
            }
        ]);
        */
        appendRightRegion("Frame Control: ", [
            {
                name: "Normal",
                onclick: function () {
                    host.setFrameControl(0);
                }
            },
            {
                name: "Slowed",
                onclick: function () {
                    host.setFrameControl(250);
                }
            },
            {
                name: "Paused",
                onclick: function () {
                    host.setFrameControl(Infinity);
                }
            }
        ]);
    };
    Toolbar.prototype.addSelection = function (name, tip) {
        var self = this;

        var el = document.createElement("div");
        el.className = "toolbar-button toolbar-button-enabled toolbar-button-command-" + name;

        el.title = tip;
        el.textContent = tip;

        el.onclick = function () {
            self.window.selectTab(name);
        };

        this.elements.bar.appendChild(el);

        this.buttons[name] = el;
    };
    Toolbar.prototype.toggleSelection = function (name) {
        for (var n in this.buttons) {
            var el = this.buttons[n];
            el.className = el.className.replace("toolbar-button-selected", "toolbar-button-enabled");
        }
        var el = this.buttons[name];
        if (el) {
            el.className = el.className.replace("toolbar-button-disabled", "toolbar-button-selected");
            el.className = el.className.replace("toolbar-button-enabled", "toolbar-button-selected");
        }
    };

    function writeDocument(document, elementHost) {
        var root = document.createElement("div");
        root.className = "window";

        // Toolbar
        // <div class="window-toolbar">
        // ...
        var toolbar = document.createElement("div");
        toolbar.className = "window-toolbar";
        root.appendChild(toolbar);

        // Middle
        // <div class="window-middle">
        // ...
        var middle = document.createElement("div");
        middle.className = "window-middle";
        root.appendChild(middle);

        if (elementHost) {
            elementHost.appendChild(root);
        } else {
            document.body.appendChild(root);
        }

        root.elements = {
            toolbar: toolbar,
            middle: middle
        };

        return root;
    };

    // TODO: move to helper place
    function appendbr(el) {
        var br = document.createElement("br");
        el.appendChild(br);
    };
    function appendClear(el) {
        var clearDiv = document.createElement("div");
        clearDiv.style.clear = "both";
        el.appendChild(clearDiv);
    };
    function appendSeparator(el) {
        var div = document.createElement("div");
        div.className = "info-separator";
        el.appendChild(div);
        appendbr(el);
    };
    function appendParameters(gl, el, obj, parameters, parameterEnumValues) {
        var table = document.createElement("table");
        table.className = "info-parameters";

        for (var n = 0; n < parameters.length; n++) {
            var enumName = parameters[n];
            var value = obj.parameters[gl[enumName]];

            var tr = document.createElement("tr");
            tr.className = "info-parameter-row";

            var tdkey = document.createElement("td");
            tdkey.className = "info-parameter-key";
            tdkey.textContent = enumName;
            tr.appendChild(tdkey);

            var tdvalue = document.createElement("td");
            tdvalue.className = "info-parameter-value";
            if (parameterEnumValues && parameterEnumValues[n]) {
                var valueFound = false;
                for (var m = 0; m < parameterEnumValues[n].length; m++) {
                    if (value == gl[parameterEnumValues[n][m]]) {
                        tdvalue.textContent = parameterEnumValues[n][m];
                        valueFound = true;
                        break;
                    }
                }
                if (!valueFound) {
                    tdvalue.textContent = value + " (unknown)";
                }
            } else {
                tdvalue.textContent = value; // TODO: convert to something meaningful?
            }
            tr.appendChild(tdvalue);

            table.appendChild(tr);
        }

        el.appendChild(table);
    };
    function appendStateParameterRow(w, gl, table, state, param) {
        var tr = document.createElement("tr");
        tr.className = "info-parameter-row";

        var tdkey = document.createElement("td");
        tdkey.className = "info-parameter-key";
        tdkey.textContent = param.name;
        tr.appendChild(tdkey);

        var value;
        if (param.value) {
            value = state[param.value];
        } else {
            value = state[param.name];
        }

        // Grab tracked objects
        if (value && value.trackedObject) {
            value = value.trackedObject;
        }

        var tdvalue = document.createElement("td");
        tdvalue.className = "info-parameter-value";

        var text = "";
        var clickhandler = null;

        var UIType = gli.UIType;
        var ui = param.ui;
        switch (ui.type) {
            case UIType.ENUM:
                var anyMatches = false;
                for (var i = 0; i < ui.values.length; i++) {
                    var enumName = ui.values[i];
                    if (value == gl[enumName]) {
                        anyMatches = true;
                        text = enumName;
                    }
                }
                if (anyMatches == false) {
                    if (value === undefined) {
                        text = "undefined";
                    } else {
                        text = "?? 0x" + value.toString(16) + " ??";
                    }
                }
                break;
            case UIType.ARRAY:
                text = "[" + value + "]";
                break;
            case UIType.BOOL:
                text = value ? "true" : "false";
                break;
            case UIType.LONG:
                text = value;
                break;
            case UIType.ULONG:
                text = value;
                break;
            case UIType.COLORMASK:
                text = value;
                break;
            case UIType.OBJECT:
                // TODO: custom object output based on type
                text = value ? value : "null";
                if (value && value.target && gli.util.isWebGLResource(value.target)) {
                    var typename = glitypename(value.target);
                    switch (typename) {
                        case "WebGLBuffer":
                            clickhandler = function () {
                                w.showBuffer(value, true);
                            };
                            break;
                        case "WebGLFramebuffer":
                            break;
                        case "WebGLProgram":
                            clickhandler = function () {
                                w.showProgram(value, true);
                            };
                            break;
                        case "WebGLRenderbuffer":
                            break;
                        case "WebGLShader":
                            break;
                        case "WebGLTexture":
                            clickhandler = function () {
                                w.showTexture(value, true);
                            };
                            break;
                    }
                    text = "[" + value.getName() + "]";
                } else if (gli.util.isTypedArray(value)) {
                    text = "[" + value + "]";
                } else if (value) {
                    var typename = glitypename(value);
                    switch (typename) {
                        case "WebGLUniformLocation":
                            text = '"' + value.sourceUniformName + '"';
                            break;
                    }
                }
                break;
            case UIType.WH:
                text = value[0] + " x " + value[1];
                break;
            case UIType.RECT:
                if (value) {
                    text = value[0] + ", " + value[1] + " " + value[2] + " x " + value[3];
                } else {
                    text = "null";
                }
                break;
            case UIType.STRING:
                text = '"' + value + '"';
                break;
            case UIType.COLOR:
                var rgba = "rgba(" + (value[0] * 255) + ", " + (value[1] * 255) + ", " + (value[2] * 255) + ", " + value[3] + ")";
                var div = document.createElement("div");
                div.classList.add("info-parameter-color");
                div.style.backgroundColor = rgba;
                tdvalue.appendChild(div);
                text = " " + rgba;
                // TODO: color tip
                break;
            case UIType.FLOAT:
                text = value;
                break;
            case UIType.BITMASK:
                text = "0x" + value.toString(16);
                // TODO: bitmask tip
                break;
            case UIType.RANGE:
                text = value[0] + " - " + value[1];
                break;
            case UIType.MATRIX:
                switch (value.length) {
                    default: // ?
                        text = "[matrix]";
                        break;
                    case 4: // 2x2
                        text = "[matrix 2x2]";
                        break;
                    case 9: // 3x3
                        text = "[matrix 3x3]";
                        break;
                    case 16: // 4x4
                        text = "[matrix 4x4]";
                        break;
                }
                // TODO: matrix tip
                text = "[" + value + "]";
                break;
        }

        // Some td's have more than just text, assigning to textContent clears.
        tdvalue.appendChild(document.createTextNode(text));
        if (clickhandler) {
            tdvalue.className += " trace-call-clickable";
            tdvalue.onclick = function (e) {
                clickhandler();
                e.preventDefault();
                e.stopPropagation();
            };
        }

        tr.appendChild(tdvalue);

        table.appendChild(tr);
    };
    function appendContextAttributeRow(w, gl, table, state, param) {
        gli.ui.appendStateParameterRow(w, gl, table, state, {name: param, ui: { type: gli.UIType.BOOL }});
    }
    function appendMatrices(gl, el, type, size, value) {
        switch (type) {
            case gl.FLOAT_MAT2:
                for (var n = 0; n < size; n++) {
                    var offset = n * 4;
                    ui.appendMatrix(el, value, offset, 2);
                }
                break;
            case gl.FLOAT_MAT3:
                for (var n = 0; n < size; n++) {
                    var offset = n * 9;
                    ui.appendMatrix(el, value, offset, 3);
                }
                break;
            case gl.FLOAT_MAT4:
                for (var n = 0; n < size; n++) {
                    var offset = n * 16;
                    ui.appendMatrix(el, value, offset, 4);
                }
                break;
        }
    };
    function appendMatrix(el, value, offset, size) {
        var div = document.createElement("div");

        var openSpan = document.createElement("span");
        openSpan.textContent = "[";
        div.appendChild(openSpan);

        for (var i = 0; i < size; i++) {
            for (var j = 0; j < size; j++) {
                var v = value[offset + i * size + j];
                div.appendChild(document.createTextNode(ui.padFloat(v)));
                if (!((i == size - 1) && (j == size - 1))) {
                    var comma = document.createElement("span");
                    comma.textContent = ", ";
                    div.appendChild(comma);
                }
            }
            if (i < size - 1) {
                appendbr(div);
                var prefix = document.createElement("span");
                prefix.textContent = " ";
                div.appendChild(prefix);
            }
        }

        var closeSpan = document.createElement("span");
        closeSpan.textContent = " ]";
        div.appendChild(closeSpan);

        el.appendChild(div);
    };
    function appendArray(el, value) {
        var div = document.createElement("div");

        var openSpan = document.createElement("span");
        openSpan.textContent = "[";
        div.appendChild(openSpan);

        var s = "";
        var maxIndex = Math.min(64, value.length);
        var isFloat = glitypename(value).indexOf("Float") >= 0;
        for (var n = 0; n < maxIndex; n++) {
            if (isFloat) {
                s += ui.padFloat(value[n]);
            } else {
                s += " " + ui.padInt(value[n]);
            }
            if (n < value.length - 1) {
                s += ", ";
            }
        }
        if (maxIndex < value.length) {
            s += ",... (" + (value.length) + " total)";
        }
        var strSpan = document.createElement("span");
        strSpan.textContent = s;
        div.appendChild(strSpan);

        var closeSpan = document.createElement("span");
        closeSpan.textContent = " ]";
        div.appendChild(closeSpan);

        el.appendChild(div);
    };
    ui.padInt = function (v) {
        var s = String(v);
        if (s >= 0) {
            s = " " + s;
        }
        s = s.substr(0, 11);
        while (s.length < 11) {
            s = " " + s;
        }
        return s;
    };
    ui.padFloat = function (v) {
        var s = String(v);
        if (s >= 0.0) {
            s = " " + s;
        }
        if (s.indexOf(".") == -1) {
            s += ".";
        }
        s = s.substr(0, 12);
        while (s.length < 12) {
            s += "0";
        }
        return s;
    };
    ui.appendbr = appendbr;
    ui.appendClear = appendClear;
    ui.appendSeparator = appendSeparator;
    ui.appendParameters = appendParameters;
    ui.appendStateParameterRow = appendStateParameterRow;
    ui.appendContextAttributeRow = appendContextAttributeRow;
    ui.appendMatrices = appendMatrices;
    ui.appendMatrix = appendMatrix;
    ui.appendArray = appendArray;

    var Window = function (context, document, elementHost) {
        var self = this;
        this.context = context;
        this.document = document;
        this.browserWindow = window;

        this.root = writeDocument(document, elementHost);

        this.controller = new gli.replay.Controller();

        this.toolbar = new Toolbar(this);
        this.tabs = {};
        this.currentTab = null;
        this.windows = {};

        this.activeVersion = "current"; // or null for live
        this.activeFilter = null;

        var middle = this.root.elements.middle;
        function addTab(name, tip, implType) {
            var tab = new ui.Tab(self, middle, name);

            if (implType) {
                implType.apply(tab, [self]);
            }

            self.toolbar.addSelection(name, tip);

            self.tabs[name] = tab;
        };

        addTab("trace", "Trace", ui.TraceTab);
        addTab("timeline", "Timeline", ui.TimelineTab);
        addTab("state", "State", ui.StateTab);
        addTab("textures", "Textures", ui.TexturesTab);
        addTab("buffers", "Buffers", ui.BuffersTab);
        addTab("programs", "Programs", ui.ProgramsTab);
        //addTab("performance", "Performance", ui.PerformanceTab);

        this.selectTab("trace");

        window.addEventListener("beforeunload", function () {
            for (var n in self.windows) {
                var w = self.windows[n];
                if (w) {
                    w.close();
                }
            }
        }, false);

        gli.host.setTimeout(function () {
            self.selectTab("trace", true);
        }, 0);
    };

    Window.prototype.layout = function () {
        for (var n in this.tabs) {
            var tab = this.tabs[n];
            if (tab.layout) {
                tab.layout();
            }
        }
    };

    Window.prototype.selectTab = function (name, force) {
        if (name.name) {
            name = name.name;
        }
        if (this.currentTab && this.currentTab.name == name && !force) {
            return;
        }
        var tab = this.tabs[name];
        if (!tab) {
            return;
        }

        if (this.currentTab) {
            this.currentTab.loseFocus();
            this.currentTab = null;
        }

        this.currentTab = tab;
        this.currentTab.gainFocus();
        this.toolbar.toggleSelection(name);

        if (tab.layout) {
            tab.layout();
        }
        if (tab.refresh) {
            tab.refresh();
        }
    };

    Window.prototype.setActiveVersion = function (version) {
        if (this.activeVersion == version) {
            return;
        }
        this.activeVersion = version;
        if (this.currentTab.refresh) {
            this.currentTab.refresh();
        }
    };

    Window.prototype.setActiveFilter = function (filter) {
        if (this.activeFilter == filter) {
            return;
        }
        this.activeFilter = filter;
        console.log("would set active filter: " + filter);
    };

    Window.prototype.appendFrame = function (frame) {
        var tab = this.tabs["trace"];
        this.selectTab(tab);
        tab.listing.appendValue(frame);
        tab.listing.selectValue(frame);
    };

    Window.prototype.showTrace = function (frame, callOrdinal) {
        var tab = this.tabs["trace"];
        this.selectTab(tab);
        if (this.controller.currentFrame != frame) {
            tab.listing.selectValue(frame);
        }
        tab.traceView.stepUntil(callOrdinal);
    };

    Window.prototype.showResource = function (resourceTab, resource, switchToCurrent) {
        if (switchToCurrent) {
            // TODO: need to update UI to be able to do this
            //this.setActiveVersion("current");
        }
        var tab = this.tabs[resourceTab];
        this.selectTab(tab);
        tab.listing.selectValue(resource);
        this.browserWindow.focus();
    };

    Window.prototype.showTexture = function (texture, switchToCurrent) {
        this.showResource("textures", texture, switchToCurrent);
    };

    Window.prototype.showBuffer = function (buffer, switchToCurrent) {
        this.showResource("buffers", buffer, switchToCurrent);
    };

    Window.prototype.showProgram = function (program, switchToCurrent) {
        this.showResource("programs", program, switchToCurrent);
    };

    ui.Window = Window;
})();
(function () {
    var ui = glinamespace("gli.ui");

    var Tab = function (w, container, name) {
        this.name = name;
        this.hasFocus = false;

        var el = this.el = document.createElement("div");
        el.className = "window-tab-root";
        container.appendChild(el);

        this.gainedFocus = new gli.EventSource("gainedFocus");
        this.lostFocus = new gli.EventSource("lostFocus");
    };
    Tab.prototype.gainFocus = function () {
        this.hasFocus = true;
        this.el.className += " window-tab-selected";
        this.gainedFocus.fire();
    };
    Tab.prototype.loseFocus = function () {
        this.lostFocus.fire();
        this.hasFocus = false;
        this.el.className = this.el.className.replace(" window-tab-selected", "");
    };

    // Variadic.
    Tab.eleClasses = function (eleType) {
      var ele = document.createElement(eleType);
      for (var i = 1, len = arguments.length; i < len; ++i) {
        ele.classList.add(arguments[i]);
      }
      return ele;
    };

    Tab.divClass = function (klass, comment) {
        var div = Tab.eleClasses("div", klass);
        if (comment) div.appendChild(document.createComment(" "+comment+" "));
        return div;
    };

    Tab.windowLeft = function (options) {
        var left = Tab.divClass("window-left");
        left.appendChild(Tab.divClass("window-left-listing", options.listing));
        left.appendChild(Tab.divClass("window-left-toolbar", options.toolbar));
        return left;
    };

    Tab.inspector = function () {
        var canvas = Tab.eleClasses("canvas", "gli-reset", "surface-inspector-pixel");
        var statusbar = Tab.divClass("surface-inspector-statusbar");
        var inspector = Tab.divClass("window-inspector");

        canvas.width = canvas.height = 1;

        statusbar.appendChild(canvas);
        statusbar.appendChild(Tab.eleClasses("span", "surface-inspector-location"));
        inspector.appendChild(Tab.divClass("surface-inspector-toolbar", "toolbar"));
        inspector.appendChild(Tab.divClass("surface-inspector-inner", "inspector"));
        inspector.appendChild(statusbar);

        return inspector;
    };

    Tab.genericLeftRightView = function () {
        var outer = Tab.divClass("window-right-outer");
        var right = Tab.divClass("window-right");

        right.appendChild(Tab.divClass("window-right-inner", "scrolling content"));
        outer.appendChild(right);
        outer.appendChild(Tab.windowLeft({ listing: "state list", toolbar: "toolbar" }));

        return outer;
    };

    ui.Tab = Tab;
})();
(function () {
    var ui = glinamespace("gli.ui");

    var LeftListing = function (w, elementRoot, cssBase, itemGenerator) {
        var self = this;
        this.window = w;
        this.elements = {
            list: elementRoot.getElementsByClassName("window-left-listing")[0],
            toolbar: elementRoot.getElementsByClassName("window-left-toolbar")[0]
        };

        // Hide toolbar until the first button is added
        this.toolbarHeight = this.elements.toolbar.style.height;
        this.elements.toolbar.style.display = "none";
        this.elements.toolbar.style.height = "0px";
        this.elements.list.style.bottom = "0px";

        this.cssBase = cssBase;
        this.itemGenerator = itemGenerator;

        this.valueEntries = [];

        this.previousSelection = null;

        this.valueSelected = new gli.EventSource("valueSelected");
    };

    LeftListing.prototype.addButton = function(name) {
        // Show the toolbar
        this.elements.toolbar.style.display = "";
        this.elements.toolbar.style.height = this.toolbarHeight;
        this.elements.list.style.bottom = this.toolbarHeight;

        var event = new gli.EventSource("buttonClicked");

        var buttonEl = document.createElement("div");
        buttonEl.className = "mini-button";

        var leftEl = document.createElement("div");
        leftEl.className = "mini-button-left";
        buttonEl.appendChild(leftEl);

        var spanEl = document.createElement("div");
        spanEl.className = "mini-button-span";
        spanEl.textContent = name;
        buttonEl.appendChild(spanEl);

        var rightEl = document.createElement("div");
        rightEl.className = "mini-button-right";
        buttonEl.appendChild(rightEl);

        this.elements.toolbar.appendChild(buttonEl);

        buttonEl.onclick = function (e) {
            event.fire();
            e.preventDefault();
            e.stopPropagation();
        };

        return event;
    };

    LeftListing.prototype.appendValue = function (value) {
        var self = this;
        var document = this.window.document;

        // <div class="XXXX-item">
        //     ??
        // </div>

        var el = document.createElement("div");
        el.className = this.cssBase + "-item listing-item";

        this.itemGenerator(el, value);

        this.elements.list.appendChild(el);

        el.onclick = function () {
            self.selectValue(value);
        };

        this.valueEntries.push({
            value: value,
            element: el
        });
        value.uielement = el;
    };

    LeftListing.prototype.resort = function () {
        // TODO: restort
    };

    LeftListing.prototype.removeValue = function (value) {
    };

    LeftListing.prototype.selectValue = function (value) {
        if (this.previousSelection) {
            var el = this.previousSelection.element;
            el.className = el.className.replace(" " + this.cssBase + "-item-selected listing-item-selected", "");
            this.previousSelection = null;
        }

        var valueObj = null;
        for (var n = 0; n < this.valueEntries.length; n++) {
            if (this.valueEntries[n].value == value) {
                valueObj = this.valueEntries[n];
                break;
            }
        }
        this.previousSelection = valueObj;
        if (valueObj) {
            valueObj.element.className += " " + this.cssBase + "-item-selected listing-item-selected";
        }

        if (value) {
            scrollIntoViewIfNeeded(value.uielement);
        }

        this.valueSelected.fire(value);
    };

    LeftListing.prototype.getScrollState = function () {
        return {
            list: this.elements.list.scrollTop
        };
    };

    LeftListing.prototype.setScrollState = function (state) {
        if (!state) {
            return;
        }
        this.elements.list.scrollTop = state.list;
    };

    ui.LeftListing = LeftListing;
})();
(function () {
    var ui = glinamespace("gli.ui");

    // options: {
    //     splitterKey: 'traceSplitter' / etc
    //     title: 'Texture'
    //     selectionName: 'Face' / etc
    //     selectionValues: ['sel 1', 'sel 2', ...]
    //     disableSizing: true/false
    //     transparentCanvas: true/false
    // }

    var SurfaceInspector = function (view, w, elementRoot, options) {
        var self = this;
        var context = w.context;
        this.window = w;
        this.elements = {
            toolbar: elementRoot.getElementsByClassName("surface-inspector-toolbar")[0],
            statusbar: elementRoot.getElementsByClassName("surface-inspector-statusbar")[0],
            view: elementRoot.getElementsByClassName("surface-inspector-inner")[0]
        };
        this.options = options;

        var defaultWidth = 240;
        var width = gli.settings.session[options.splitterKey];
        if (width) {
            width = Math.max(240, Math.min(width, window.innerWidth - 400));
        } else {
            width = defaultWidth;
        }
        this.elements.view.style.width = width + "px";
        this.splitter = new gli.controls.SplitterBar(this.elements.view, "vertical", 240, 800, "splitter-inspector", function (newWidth) {
            view.setInspectorWidth(newWidth);
            self.layout();

            if (self.elements.statusbar) {
                self.elements.statusbar.style.width = newWidth + "px";
            }

            gli.settings.session[options.splitterKey] = newWidth;
            gli.settings.save();
        });
        view.setInspectorWidth(width);

        // Add view options
        var optionsDiv = document.createElement("div");
        optionsDiv.className = "surface-inspector-options";
        optionsDiv.style.display = "none";
        var optionsSpan = document.createElement("span");
        optionsSpan.textContent = options.selectionName + ": ";
        optionsDiv.appendChild(optionsSpan);
        var optionsList = document.createElement("select");
        optionsList.className = "";
        optionsDiv.appendChild(optionsList);
        this.setSelectionValues = function (selectionValues) {
            while (optionsList.hasChildNodes()) {
              optionsList.removeChild(optionsList.firstChild);
            }
            if (selectionValues) {
                for (var n = 0; n < selectionValues.length; n++) {
                    var selectionOption = document.createElement("option");
                    selectionOption.textContent = selectionValues[n];
                    optionsList.appendChild(selectionOption);
                }
            }
        };
        this.setSelectionValues(options.selectionValues);
        this.elements.toolbar.appendChild(optionsDiv);
        this.elements.faces = optionsDiv;
        this.optionsList = optionsList;
        optionsList.onchange = function () {
            if (self.activeOption != optionsList.selectedIndex) {
                self.activeOption = optionsList.selectedIndex;
                self.updatePreview();
            }
        };

        // Add sizing options
        var sizingDiv = document.createElement("div");
        sizingDiv.className = "surface-inspector-sizing";
        if (this.options.disableSizing) {
            sizingDiv.style.display = "none";
        }
        var nativeSize = document.createElement("span");
        nativeSize.title = "Native resolution (100%)";
        nativeSize.textContent = "100%";
        nativeSize.onclick = function () {
            self.sizingMode = "native";
            self.layout();
        };
        sizingDiv.appendChild(nativeSize);
        var sepSize = document.createElement("div");
        sepSize.className = "surface-inspector-sizing-sep";
        sepSize.textContent = " | ";
        sizingDiv.appendChild(sepSize);
        var fitSize = document.createElement("span");
        fitSize.title = "Fit to inspector window";
        fitSize.textContent = "Fit";
        fitSize.onclick = function () {
            self.sizingMode = "fit";
            self.layout();
        };
        sizingDiv.appendChild(fitSize);
        this.elements.toolbar.appendChild(sizingDiv);
        this.elements.sizingDiv = sizingDiv;

        function getLocationString(x, y) {
            var width = self.canvas.width;
            var height = self.canvas.height;
            var tx = String(Math.round(x / width * 1000) / 1000);
            var ty = String(Math.round(y / height * 1000) / 1000);
            if (tx.length == 1) {
                tx += ".000";
            }
            while (tx.length < 5) {
                tx += "0";
            }
            if (ty.length == 1) {
                ty += ".000";
            }
            while (ty.length < 5) {
                ty += "0";
            }
            return x + ", " + y + " (" + tx + ", " + ty + ")";
        };

        // Statusbar (may not be present)
        var updatePixelPreview = null;
        var pixelDisplayMode = "location";
        var statusbar = this.elements.statusbar;
        var pixelCanvas = statusbar && statusbar.getElementsByClassName("surface-inspector-pixel")[0];
        var locationSpan = statusbar && statusbar.getElementsByClassName("surface-inspector-location")[0];
        if (statusbar) {
            statusbar.style.width = width + "px";
        }
        if (statusbar && pixelCanvas && locationSpan) {
            var lastX = 0;
            var lastY = 0;
            updatePixelPreview = function (x, y) {
                pixelCanvas.style.display = "none";

                if ((x === null) || (y === null)) {
                    while (locationSpan.hasChildNodes()) {
                      locationSpan.removeChild(locationSpan.firstChild);
                    }
                    return;
                }

                lastX = x;
                lastY = y;

                var gl = gli.util.getWebGLContext(self.canvas);
                var pixel = new Uint8Array(4);
                gl.readPixels(x, self.canvas.height - y - 1, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
                var r = pixel[0];
                var g = pixel[1];
                var b = pixel[2];
                var a = pixel[3];
                var pixelStyle = "rgba(" + r + ", " + g + ", " + b + ", " + a + ")";

                // Draw preview in the pixel canvas
                pixelCanvas.style.display = "";
                var pctx = pixelCanvas.getContext("2d");
                pctx.clearRect(0, 0, 1, 1);
                pctx.fillStyle = pixelStyle;
                pctx.fillRect(0, 0, 1, 1);

                switch (pixelDisplayMode) {
                    case "location":
                        locationSpan.textContent = getLocationString(x, y);
                        break;
                    case "color":
                        locationSpan.textContent = pixelStyle;
                        break;
                }
            };
            statusbar.addEventListener("click", function () {
                if (pixelDisplayMode == "location") {
                    pixelDisplayMode = "color";
                } else {
                    pixelDisplayMode = "location";
                }
                updatePixelPreview(lastX, lastY);
            }, false);

            this.clearPixel = function () {
                updatePixelPreview(null, null);
            };
        } else {
            this.clearPixel = function () { };
        }

        // Display canvas
        var canvas = this.canvas = document.createElement("canvas");
        canvas.className = "gli-reset";
        if (options.transparentCanvas) {
            canvas.className += " surface-inspector-canvas-transparent";
        } else {
            canvas.className += " surface-inspector-canvas";
        }
        canvas.style.display = "none";
        canvas.width = 1;
        canvas.height = 1;
        this.elements.view.appendChild(canvas);

        function getPixelPosition(e) {
            var x = e.offsetX || e.layerX;
            var y = e.offsetY || e.layerY;
            switch (self.sizingMode) {
                case "fit":
                    var scale = parseFloat(self.canvas.style.width) / self.canvas.width;
                    x /= scale;
                    y /= scale;
                    break;
                case "native":
                    break;
            }
            return [Math.floor(x), Math.floor(y)];
        };

        canvas.addEventListener("click", function (e) {
            var pos = getPixelPosition(e);
            self.inspectPixel(pos[0], pos[1], getLocationString(pos[0], pos[1]));
        }, false);

        if (updatePixelPreview) {
            canvas.addEventListener("mousemove", function (e) {
                var pos = getPixelPosition(e);
                updatePixelPreview(pos[0], pos[1]);
            }, false);
        }

        this.sizingMode = "fit";
        this.resizeHACK = false;
        this.elements.view.style.overflow = "";

        this.activeOption = 0;

        gli.host.setTimeout(function () {
            self.setupPreview();
            self.layout();
        }, 0);
    };

    SurfaceInspector.prototype.inspectPixel = function (x, y, locationString) {
    };

    SurfaceInspector.prototype.setupPreview = function () {
        this.activeOption = 0;
    };

    SurfaceInspector.prototype.updatePreview = function () {
    };

    SurfaceInspector.prototype.layout = function () {
        var self = this;
        this.clearPixel();

        var size = this.querySize();
        if (!size) {
            return;
        }

        if (this.options.autoFit) {
            this.canvas.style.left = "";
            this.canvas.style.top = "";
            this.canvas.style.width = "";
            this.canvas.style.height = "";
            var parentWidth = this.elements.view.clientWidth;
            var parentHeight = this.elements.view.clientHeight;
            this.canvas.width = parentWidth;
            this.canvas.height = parentHeight;
            self.updatePreview();
        } else {
            switch (this.sizingMode) {
                case "native":
                    this.elements.view.style.overflow = "auto";
                    this.canvas.style.left = "";
                    this.canvas.style.top = "";
                    this.canvas.style.width = "";
                    this.canvas.style.height = "";
                    break;
                case "fit":
                    this.elements.view.style.overflow = "";

                    var parentWidth = this.elements.view.clientWidth;
                    var parentHeight = this.elements.view.clientHeight;
                    var parentar = parentHeight / parentWidth;
                    var ar = size[1] / size[0];

                    var width;
                    var height;
                    if (ar * parentWidth < parentHeight) {
                        width = parentWidth;
                        height = (ar * parentWidth);
                    } else {
                        height = parentHeight;
                        width = (parentHeight / ar);
                    }
                    if (width && height) {
                        this.canvas.style.width = width + "px";
                        this.canvas.style.height = height + "px";
                    }

                    this.canvas.style.left = ((parentWidth / 2) - (width / 2)) + "px";
                    this.canvas.style.top = ((parentHeight / 2) - (height / 2)) + "px";

                    // HACK: force another layout because we may have changed scrollbar status
                    if (this.resizeHACK) {
                        this.resizeHACK = false;
                    } else {
                        this.resizeHACK = true;
                        gli.host.setTimeout(function () {
                            self.layout();
                        }, 0);
                    }
                    break;
            }
        }
    };

    SurfaceInspector.prototype.reset = function () {
        this.elements.view.scrollLeft = 0;
        this.elements.view.scrollTop = 0;
    };

    ui.SurfaceInspector = SurfaceInspector;
})();
(function () {
    var ui = glinamespace("gli.ui");

    function generateFunctionDisplay(context, call, el) {
        var sig = "";

        // TODO: return type must be set in info.js
        //if (call.info.returnType) {
        if (call.result) {
            sig += "UNK ";
        } else {
            sig += "void ";
        }

        sig += call.info.name + "(";

        var argInfos = call.info.getArgs(call);
        if (argInfos.length || argInfos.length == 0) {
            for (var n = 0; n < argInfos.length; n++) {
                var argInfo = argInfos[n];
                if (n != 0) {
                    sig += ", ";
                }
                sig += argInfo.name;
            }
        } else {
            if (argInfos) {
                var UIType = gli.UIType;
                switch (argInfos.ui) {
                    case UIType.COLORMASK:
                        sig += "r, g, b, a";
                        break;
                    case UIType.COLOR:
                        sig += "r, g, b, a";
                        break;
                }
            }
        }

        sig += ")";

        var functionSpan = document.createElement("span");
        functionSpan.textContent = call.info.name;
        functionSpan.title = sig;
        el.appendChild(functionSpan);
    };

    function generateValueString(context, call, ui, value, argIndex) {
        var gl = context;
        var UIType = gli.UIType;

        var text = null;

        var argInfos = call.info.getArgs(call);

        // If no UI provided, fake one and guess
        if (!ui) {
            ui = {};
            ui.type = UIType.OBJECT;
        }
        if (value && value.trackedObject) {
            // Got passed a real gl object instead of our tracked one - fixup
            value = value.trackedObject;
        }

        switch (ui.type) {
            case UIType.ENUM:
                var anyMatches = false;
                for (var i = 0; i < ui.values.length; i++) {
                    var enumName = ui.values[i];
                    if (value == gl[enumName]) {
                        anyMatches = true;
                        text = enumName;
                    }
                }
                if (anyMatches == false) {
                    if (value === undefined) {
                        text = "undefined";
                    } else {
                        text = "?? 0x" + value.toString(16) + " ??";
                    }
                }
                break;
            case UIType.ARRAY:
                text = "[" + value + "]";
                break;
            case UIType.BOOL:
                text = value ? "true" : "false";
                break;
            case UIType.LONG:
                text = value;
                break;
            case UIType.ULONG:
                text = value;
                break;
            case UIType.COLORMASK:
                text = value;
                //outputHTML += "R<input type='checkbox' " + (readOnly ? "disabled='disabled'" : "") + " " + (value[0] ? "checked='checked'" : "") + "/>";
                //outputHTML += "G<input type='checkbox' " + (readOnly ? "disabled='disabled'" : "") + " " + (value[1] ? "checked='checked'" : "") + "/>";
                //outputHTML += "B<input type='checkbox' " + (readOnly ? "disabled='disabled'" : "") + " " + (value[2] ? "checked='checked'" : "") + "/>";
                //outputHTML += "A<input type='checkbox' " + (readOnly ? "disabled='disabled'" : "") + " " + (value[3] ? "checked='checked'" : "") + "/>";
                break;
            case UIType.OBJECT:
                // TODO: custom object output based on type
                text = value ? value : "null";
                if (value && value.target && gli.util.isWebGLResource(value.target)) {
                    var typename = glitypename(value.target);
                    text = "[" + value.getName() + "]";
                } else if (gli.util.isTypedArray(value)) {
                    text = "[" + value + "]";
                } else if (value) {
                    var typename = glitypename(value);
                    switch (typename) {
                        case "WebGLUniformLocation":
                            text = '"' + value.sourceUniformName + '"';
                            break;
                    }
                }
                break;
            case UIType.WH:
                text = value[0] + " x " + value[1];
                break;
            case UIType.RECT:
                text = value[0] + ", " + value[1] + " " + value[2] + " x " + value[3];
                break;
            case UIType.STRING:
                text = '"' + value + '"';
                break;
            case UIType.COLOR:
                text = value;
                //outputHTML += "<span style='color: rgb(" + (value[0] * 255) + "," + (value[1] * 255) + "," + (value[2] * 255) + ")'>rgba(" +
                //                "<input type='text' " + (readOnly ? "readonly='readonly'" : "") + " value='" + value[0] + "'/>, " +
                //                "<input type='text' " + (readOnly ? "readonly='readonly'" : "") + " value='" + value[1] + "'/>, " +
                //                "<input type='text' " + (readOnly ? "readonly='readonly'" : "") + " value='" + value[2] + "'/>, " +
                //                "<input type='text' " + (readOnly ? "readonly='readonly'" : "") + " value='" + value[3] + "'/>" +
                //                ")</span>";
                // TODO: color tip
                break;
            case UIType.FLOAT:
                text = value;
                break;
            case UIType.BITMASK:
                text = "0x" + value.toString(16);
                // TODO: bitmask tip
                break;
            case UIType.RANGE:
                text = value[0] + " - " + value[1];
                break;
            case UIType.MATRIX:
                switch (value.length) {
                    default: // ?
                        text = "[matrix]";
                        break;
                    case 4: // 2x2
                        text = "[matrix 2x2]";
                        break;
                    case 9: // 3x3
                        text = "[matrix 3x3]";
                        break;
                    case 16: // 4x4
                        text = "[matrix 4x4]";
                        break;
                }
                // TODO: matrix tip
                text = "[" + value + "]";
                break;
        }

        return text;
    };

    function generateValueDisplay(w, context, call, el, ui, value, argIndex) {
        var vel = document.createElement("span");

        var gl = context;
        var UIType = gli.UIType;

        var text = null;
        var tip = null;
        var clickhandler = null;

        var argInfos = call.info.getArgs(call);
        if (argInfos.length || argInfos.length == 0) {
            var argInfo = argInfos[argIndex];
            if (argInfo) {
                tip = argInfo.name;
            }
        } else {
            if (argInfos) {
                switch (argInfos.ui) {
                    case UIType.COLORMASK:
                        break;
                    case UIType.COLOR:
                        break;
                }
            }
        }

        // If no UI provided, fake one and guess
        if (!ui) {
            ui = {};
            ui.type = UIType.OBJECT;
        }
        if (value && value.trackedObject) {
            // Got passed a real gl object instead of our tracked one - fixup
            value = value.trackedObject;
        }

        // This slows down large traces - need to do all tips on demand instead
        var useEnumTips = false;

        switch (ui.type) {
            case UIType.ENUM:
                var enumTip = tip;
                enumTip += ":\r\n";
                var anyMatches = false;
                if (useEnumTips) {
                    for (var i = 0; i < ui.values.length; i++) {
                        var enumName = ui.values[i];
                        enumTip += enumName;
                        if (value == gl[enumName]) {
                            anyMatches = true;
                            text = enumName;
                            enumTip += " <---";
                        }
                        enumTip += "\r\n";
                    }
                    tip = enumTip;
                } else {
                    for (var i = 0; i < ui.values.length; i++) {
                        var enumName = ui.values[i];
                        if (value == gl[enumName]) {
                            anyMatches = true;
                            text = enumName;
                        }
                    }
                }
                if (anyMatches == false) {
                    if (value === undefined) {
                        text = "undefined";
                    } else {
                        text = "?? 0x" + value.toString(16) + " ??";
                    }
                }
                break;
            case UIType.ARRAY:
                text = "[" + value + "]";
                break;
            case UIType.BOOL:
                text = value ? "true" : "false";
                break;
            case UIType.LONG:
                text = value;
                break;
            case UIType.ULONG:
                text = value;
                break;
            case UIType.COLORMASK:
                text = value;
                //outputHTML += "R<input type='checkbox' " + (readOnly ? "disabled='disabled'" : "") + " " + (value[0] ? "checked='checked'" : "") + "/>";
                //outputHTML += "G<input type='checkbox' " + (readOnly ? "disabled='disabled'" : "") + " " + (value[1] ? "checked='checked'" : "") + "/>";
                //outputHTML += "B<input type='checkbox' " + (readOnly ? "disabled='disabled'" : "") + " " + (value[2] ? "checked='checked'" : "") + "/>";
                //outputHTML += "A<input type='checkbox' " + (readOnly ? "disabled='disabled'" : "") + " " + (value[3] ? "checked='checked'" : "") + "/>";
                break;
            case UIType.OBJECT:
                // TODO: custom object output based on type
                text = value ? value : "null";
                if (value && value.target && gli.util.isWebGLResource(value.target)) {
                    var typename = glitypename(value.target);
                    switch (typename) {
                        case "WebGLBuffer":
                            clickhandler = function () {
                                w.showBuffer(value, true);
                            };
                            break;
                        case "WebGLFramebuffer":
                            break;
                        case "WebGLProgram":
                            clickhandler = function () {
                                w.showProgram(value, true);
                            };
                            break;
                        case "WebGLRenderbuffer":
                            break;
                        case "WebGLShader":
                            break;
                        case "WebGLTexture":
                            clickhandler = function () {
                                w.showTexture(value, true);
                            };
                            break;
                    }
                    text = "[" + value.getName() + "]";
                } else if (gli.util.isTypedArray(value)) {
                    text = "[" + value + "]";
                } else if (value) {
                    var typename = glitypename(value);
                    switch (typename) {
                        case "WebGLUniformLocation":
                            text = '"' + value.sourceUniformName + '"';
                            break;
                    }
                }
                break;
            case UIType.WH:
                text = value[0] + " x " + value[1];
                break;
            case UIType.RECT:
                text = value[0] + ", " + value[1] + " " + value[2] + " x " + value[3];
                break;
            case UIType.STRING:
                text = '"' + value + '"';
                break;
            case UIType.COLOR:
                text = value;
                //                outputHTML += "<span style='color: rgb(" + (value[0] * 255) + "," + (value[1] * 255) + "," + (value[2] * 255) + ")'>rgba(" +
                //                                "<input type='text' " + (readOnly ? "readonly='readonly'" : "") + " value='" + value[0] + "'/>, " +
                //                                "<input type='text' " + (readOnly ? "readonly='readonly'" : "") + " value='" + value[1] + "'/>, " +
                //                                "<input type='text' " + (readOnly ? "readonly='readonly'" : "") + " value='" + value[2] + "'/>, " +
                //                                "<input type='text' " + (readOnly ? "readonly='readonly'" : "") + " value='" + value[3] + "'/>" +
                //                                ")</span>";
                // TODO: color tip
                break;
            case UIType.FLOAT:
                text = value;
                break;
            case UIType.BITMASK:
                // If enum values present use them (they are flags), otherwise just a hex value
                text = "";
                if (ui.values && ui.values.length) {
                    for (var i = 0; i < ui.values.length; i++) {
                        var enumName = ui.values[i];
                        if (value & gl[enumName]) {
                            if (text.length) {
                                text += " | " + enumName;
                            } else {
                                text = enumName;
                            }
                        }
                    }
                } else {
                    text = "0x" + value.toString(16);
                }
                // TODO: bitmask tip
                break;
            case UIType.RANGE:
                text = value[0] + " - " + value[1];
                break;
            case UIType.MATRIX:
                switch (value.length) {
                    default: // ?
                        text = "[matrix]";
                        break;
                    case 4: // 2x2
                        text = "[matrix 2x2]";
                        break;
                    case 9: // 3x3
                        text = "[matrix 3x3]";
                        break;
                    case 16: // 4x4
                        text = "[matrix 4x4]";
                        break;
                }
                // TODO: matrix tip
                text = "[" + value + "]";
                break;
        }

        vel.textContent = text;
        vel.title = tip;

        if (clickhandler) {
            vel.className += " trace-call-clickable";
            vel.onclick = function (e) {
                clickhandler();
                e.preventDefault();
                e.stopPropagation();
            };
        }

        el.appendChild(vel);
    };

    function populateCallString(context, call) {
        var s = call.info.name;
        s += "(";

        var argInfos = call.info.getArgs(call);
        if (argInfos.length || argInfos.length == 0) {
            for (var n = 0; n < call.args.length; n++) {
                var argInfo = (n < argInfos.length) ? argInfos[n] : null;
                var argValue = call.args[n];
                if (n != 0) {
                    s += ", ";
                }
                s += generateValueString(context, call, argInfo ? argInfo.ui : null, argValue, n);
            }
        } else {
            // Special argument formatter
            s += generateValueString(w, context, call, argInfos, call.args);
        }

        s += ")";

        // TODO: return type must be set in info.js
        //if (call.info.returnType) {
        if (call.result) {
            s += " = ";
            s += generateValueString(context, call, call.info.returnType, call.result);
            //el.appendChild(document.createTextNode(call.result)); // TODO: pretty
        }

        return s;
    };

    function populateCallLine(w, call, el) {
        var context = w.context;

        generateFunctionDisplay(context, call, el);

        el.appendChild(document.createTextNode("("));

        var argInfos = call.info.getArgs(call);
        if (argInfos.length || argInfos.length == 0) {
            for (var n = 0; n < call.args.length; n++) {
                var argInfo = (n < argInfos.length) ? argInfos[n] : null;
                var argValue = call.args[n];
                if (n != 0) {
                    el.appendChild(document.createTextNode(", "));
                }
                generateValueDisplay(w, context, call, el, argInfo ? argInfo.ui : null, argValue, n);
            }
        } else {
            // Special argument formatter
            generateValueDisplay(w, context, call, el, argInfos, call.args);
        }

        el.appendChild(document.createTextNode(")"));

        // TODO: return type must be set in info.js
        //if (call.info.returnType) {
        if (call.result) {
            el.appendChild(document.createTextNode(" = "));
            generateValueDisplay(w, context, call, el, call.info.returnType, call.result);
            //el.appendChild(document.createTextNode(call.result)); // TODO: pretty
        }
    };

    function appendHistoryLine(gl, el, call) {
        // <div class="history-call">
        //     <div class="trace-call-line">
        //         hello world
        //     </div>
        // </div>

        var callRoot = document.createElement("div");
        callRoot.className = "usage-call";

        var line = document.createElement("div");
        line.className = "trace-call-line";
        ui.populateCallLine(gl.ui, call, line);
        callRoot.appendChild(line);

        el.appendChild(callRoot);

        // TODO: click to expand stack trace?
    };

    function appendCallLine(gl, el, frame, call) {
        // <div class="usage-call">
        //     <div class="usage-call-ordinal">
        //         NNNN
        //     </div>
        //     <div class="trace-call-line">
        //         hello world
        //     </div>
        // </div>

        var callRoot = document.createElement("div");
        callRoot.className = "usage-call usage-call-clickable";

        callRoot.onclick = function (e) {
            // Jump to trace view and run until ordinal
            gl.ui.showTrace(frame, call.ordinal);
            e.preventDefault();
            e.stopPropagation();
        };

        var ordinal = document.createElement("div");
        ordinal.className = "usage-call-ordinal";
        ordinal.textContent = call.ordinal;
        callRoot.appendChild(ordinal);

        var line = document.createElement("div");
        line.className = "trace-call-line";
        ui.populateCallLine(gl.ui, call, line);
        callRoot.appendChild(line);

        el.appendChild(callRoot);
    };

    function appendObjectRef(context, el, value) {
        var w = context.ui;

        var clickhandler = null;
        var text = value ? value : "null";
        if (value && value.target && gli.util.isWebGLResource(value.target)) {
            var typename = glitypename(value.target);
            switch (typename) {
                case "WebGLBuffer":
                    clickhandler = function () {
                        w.showBuffer(value, true);
                    };
                    break;
                case "WebGLFramebuffer":
                    break;
                case "WebGLProgram":
                    clickhandler = function () {
                        w.showProgram(value, true);
                    };
                    break;
                case "WebGLRenderbuffer":
                    break;
                case "WebGLShader":
                    break;
                case "WebGLTexture":
                    clickhandler = function () {
                        w.showTexture(value, true);
                    };
                    break;
            }
            text = "[" + value.getName() + "]";
        } else if (gli.util.isTypedArray(value)) {
            text = "[" + value + "]";
        } else if (value) {
            var typename = glitypename(value);
            switch (typename) {
                case "WebGLUniformLocation":
                    text = '"' + value.sourceUniformName + '"';
                    break;
            }
        }

        var vel = document.createElement("span");
        vel.textContent = text;

        if (clickhandler) {
            vel.className += " trace-call-clickable";
            vel.onclick = function (e) {
                clickhandler();
                e.preventDefault();
                e.stopPropagation();
            };
        }

        el.appendChild(vel);
    };

    function generateUsageList(gl, el, frame, resource) {
        var titleDiv = document.createElement("div");
        titleDiv.className = "info-title-secondary";
        titleDiv.textContent = "Usage in frame " + frame.frameNumber;
        el.appendChild(titleDiv);

        var rootEl = document.createElement("div");
        rootEl.className = "resource-usage";
        el.appendChild(rootEl);

        var usages = frame.findResourceUsages(resource);
        if (usages == null) {
            var notUsed = document.createElement("div");
            notUsed.textContent = "Not used in this frame";
            rootEl.appendChild(notUsed);
        } else if (usages.length == 0) {
            var notUsed = document.createElement("div");
            notUsed.textContent = "Used but not referenced in this frame";
            rootEl.appendChild(notUsed);
        } else {
            for (var n = 0; n < usages.length; n++) {
                var call = usages[n];
                appendCallLine(gl, rootEl, frame, call);
            }
        }
    };

    ui.populateCallString = populateCallString;
    ui.populateCallLine = populateCallLine;
    ui.appendHistoryLine = appendHistoryLine;
    ui.appendCallLine = appendCallLine;
    ui.appendObjectRef = appendObjectRef;
    ui.generateUsageList = generateUsageList;

})();
(function () {
    var ui = glinamespace("gli.ui");

    var PopupWindow = function (context, name, title, defaultWidth, defaultHeight) {
        var self = this;
        this.context = context;

        var w = this.browserWindow = window.open("about:blank", "_blank", "location=no,menubar=no,scrollbars=no,status=no,toolbar=no,innerWidth=" + defaultWidth + ",innerHeight=" + defaultHeight + "");
        w.document.writeln("<html><head><title>" + title + "</title></head><body style='margin: 0px; padding: 0px;'></body></html>");
        w.focus();

        w.addEventListener("unload", function () {
            self.dispose();
            if (self.browserWindow) {
                self.browserWindow.closed = true;
                self.browserWindow = null;
            }
            context.ui.windows[name] = null;
        }, false);

        w.gli = window.gli;

        if (window["gliloader"]) {
            gliloader.load(["ui_css"], function () { }, w);
        } else {
            var targets = [w.document.body, w.document.head, w.document.documentElement];
            for (var n = 0; n < targets.length; n++) {
                var target = targets[n];
                if (target) {
                    var link = w.document.createElement("link");
                    link.rel = "stylesheet";
                    link.href = window["gliCssUrl"];
                    target.appendChild(link);
                    break;
                }
            }
        }

        this.elements = {};

        gli.host.setTimeout(function () {
            var doc = self.browserWindow.document;
            var body = doc.body;

            var toolbarDiv = self.elements.toolbarDiv = doc.createElement("div");
            toolbarDiv.className = "popup-toolbar";
            body.appendChild(toolbarDiv);

            var innerDiv = self.elements.innerDiv = doc.createElement("div");
            innerDiv.className = "popup-inner";
            body.appendChild(innerDiv);

            self.setup();
        }, 0);
    };

    PopupWindow.prototype.addToolbarToggle = function (name, tip, defaultValue, callback) {
        var self = this;
        var doc = this.browserWindow.document;
        var toolbarDiv = this.elements.toolbarDiv;

        var input = doc.createElement("input");
        input.style.width = "inherit";
        input.style.height = "inherit";

        input.type = "checkbox";
        input.title = tip;
        input.checked = defaultValue;

        input.onchange = function () {
            callback.apply(self, [input.checked]);
        };

        var span = doc.createElement("span");
        span.textContent = " " + name;

        span.onclick = function () {
            input.checked = !input.checked;
            callback.apply(self, [input.checked]);
        };

        var el = doc.createElement("div");
        el.className = "popup-toolbar-toggle";
        el.appendChild(input);
        el.appendChild(span);

        toolbarDiv.appendChild(el);

        callback.apply(this, [defaultValue]);
    };

    PopupWindow.prototype.buildPanel = function () {
        var doc = this.browserWindow.document;

        var panelOuter = doc.createElement("div");
        panelOuter.className = "popup-panel-outer";

        var panel = doc.createElement("div");
        panel.className = "popup-panel";

        panelOuter.appendChild(panel);
        this.elements.innerDiv.appendChild(panelOuter);
        return panel;
    };

    PopupWindow.prototype.setup = function () {
    };

    PopupWindow.prototype.dispose = function () {
    };

    PopupWindow.prototype.focus = function () {
        this.browserWindow.focus();
    };

    PopupWindow.prototype.close = function () {
        this.dispose();
        if (this.browserWindow) {
            this.browserWindow.close();
            this.browserWindow = null;
        }
        this.context.ui.windows[name] = null;
    };

    PopupWindow.prototype.isOpened = function () {
        return this.browserWindow && !this.browserWindow.closed;
    };

    PopupWindow.show = function (context, type, name, callback) {
        var existing = context.ui.windows[name];
        if (existing && existing.isOpened()) {
            existing.focus();
            if (callback) {
                callback(existing);
            }
        } else {
            if (existing) {
                existing.dispose();
            }
            context.ui.windows[name] = new type(context, name);
            if (callback) {
                gli.host.setTimeout(function () {
                    // May have somehow closed in the interim
                    var popup = context.ui.windows[name];
                    if (popup) {
                        callback(popup);
                    }
                }, 0);
            }
        }
    };

    ui.PopupWindow = PopupWindow;
})();
(function () {
    var ui = glinamespace("gli.ui");

    var BufferPreview = function (canvas) {
        this.document = canvas.ownerDocument;
        this.canvas = canvas;
        this.drawState = null;

        var expandLink = this.expandLink = document.createElement("span");
        expandLink.className = "surface-inspector-collapsed";
        expandLink.textContent = "Show preview";
        expandLink.style.visibility = "collapse";
        canvas.parentNode.appendChild(expandLink);

        var gl = this.gl = gli.util.getWebGLContext(canvas);

        var vsSource =
        'uniform mat4 u_projMatrix;' +
        'uniform mat4 u_modelViewMatrix;' +
        'uniform mat4 u_modelViewInvMatrix;' +
        'uniform bool u_enableLighting;' +
        'attribute vec3 a_position;' +
        'attribute vec3 a_normal;' +
        'varying vec3 v_lighting;' +
        'void main() {' +
        '    gl_Position = u_projMatrix * u_modelViewMatrix * vec4(a_position, 1.0);' +
        '    if (u_enableLighting) {' +
        '        vec3 lightDirection = vec3(0.0, 0.0, 1.0);' +
        '        vec4 normalT = u_modelViewInvMatrix * vec4(a_normal, 1.0);' +
        '        float lighting = max(dot(normalT.xyz, lightDirection), 0.0);' +
        '        v_lighting = vec3(0.2, 0.2, 0.2) + vec3(1.0, 1.0, 1.0) * lighting;' +
        '    } else {' +
        '        v_lighting = vec3(1.0, 1.0, 1.0);' +
        '    }' +
        '    gl_PointSize = 3.0;' +
        '}';
        var fsSource =
        'precision highp float;' +
        'uniform bool u_wireframe;' +
        'varying vec3 v_lighting;' +
        'void main() {' +
        '    vec4 color;' +
        '    if (u_wireframe) {' +
        '        color = vec4(1.0, 1.0, 1.0, 0.4);' +
        '    } else {' +
        '        color = vec4(1.0, 0.0, 0.0, 1.0);' +
        '    }' +
        '    gl_FragColor = vec4(color.rgb * v_lighting, color.a);' +
        '}';

        // Initialize shaders
        var vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vs, vsSource);
        gl.compileShader(vs);
        var fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs, fsSource);
        gl.compileShader(fs);
        var program = this.program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        gl.useProgram(program);
        gl.deleteShader(vs);
        gl.deleteShader(fs);

        this.program.a_position = gl.getAttribLocation(this.program, "a_position");
        this.program.a_normal = gl.getAttribLocation(this.program, "a_normal");
        this.program.u_projMatrix = gl.getUniformLocation(this.program, "u_projMatrix");
        this.program.u_modelViewMatrix = gl.getUniformLocation(this.program, "u_modelViewMatrix");
        this.program.u_modelViewInvMatrix = gl.getUniformLocation(this.program, "u_modelViewInvMatrix");
        this.program.u_enableLighting = gl.getUniformLocation(this.program, "u_enableLighting");
        this.program.u_wireframe = gl.getUniformLocation(this.program, "u_wireframe");

        // Default state
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.depthFunc(gl.LEQUAL);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        gl.disable(gl.CULL_FACE);

        this.camera = {
            defaultDistance: 5,
            distance: 5,
            rotx: 0,
            roty: 0
        };
    };

    BufferPreview.prototype.resetCamera = function () {
        this.camera.distance = this.camera.defaultDistance;
        this.camera.rotx = 0;
        this.camera.roty = 0;
        this.draw();
    };

    BufferPreview.prototype.dispose = function () {
        var gl = this.gl;

        this.setBuffer(null);

        gl.deleteProgram(this.program);
        this.program = null;

        this.gl = null;
        this.canvas = null;
    };

    BufferPreview.prototype.draw = function () {
        var gl = this.gl;

        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        if (!this.drawState) {
            return;
        }
        var ds = this.drawState;

        // Setup projection matrix
        var zn = 0.1;
        var zf = 1000.0; // TODO: normalize depth range based on buffer?
        var fovy = 45.0;
        var top = zn * Math.tan(fovy * Math.PI / 360.0);
        var bottom = -top;
        var aspectRatio = (this.canvas.width / this.canvas.height);
        var left = bottom * aspectRatio;
        var right = top * aspectRatio;
        var projMatrix = new Float32Array([
            2 * zn / (right - left), 0, 0, 0,
            0, 2 * zn / (top - bottom), 0, 0,
            (right + left) / (right - left), 0, -(zf + zn) / (zf - zn), -1,
            0, (top + bottom) / (top - bottom), -2 * zf * zn / (zf - zn), 0
        ]);
        gl.uniformMatrix4fv(this.program.u_projMatrix, false, projMatrix);

        var M = {
            m00: 0, m01: 1, m02: 2, m03: 3,
            m10: 4, m11: 5, m12: 6, m13: 7,
            m20: 8, m21: 9, m22: 10, m23: 11,
            m30: 12, m31: 13, m32: 14, m33: 15
        };
        function matrixMult(a, b) {
            var c = new Float32Array(16);
            c[M.m00] = a[M.m00] * b[M.m00] + a[M.m01] * b[M.m10] + a[M.m02] * b[M.m20] + a[M.m03] * b[M.m30];
            c[M.m01] = a[M.m00] * b[M.m01] + a[M.m01] * b[M.m11] + a[M.m02] * b[M.m21] + a[M.m03] * b[M.m31];
            c[M.m02] = a[M.m00] * b[M.m02] + a[M.m01] * b[M.m12] + a[M.m02] * b[M.m22] + a[M.m03] * b[M.m32];
            c[M.m03] = a[M.m00] * b[M.m03] + a[M.m01] * b[M.m13] + a[M.m02] * b[M.m23] + a[M.m03] * b[M.m33];
            c[M.m10] = a[M.m10] * b[M.m00] + a[M.m11] * b[M.m10] + a[M.m12] * b[M.m20] + a[M.m13] * b[M.m30];
            c[M.m11] = a[M.m10] * b[M.m01] + a[M.m11] * b[M.m11] + a[M.m12] * b[M.m21] + a[M.m13] * b[M.m31];
            c[M.m12] = a[M.m10] * b[M.m02] + a[M.m11] * b[M.m12] + a[M.m12] * b[M.m22] + a[M.m13] * b[M.m32];
            c[M.m13] = a[M.m10] * b[M.m03] + a[M.m11] * b[M.m13] + a[M.m12] * b[M.m23] + a[M.m13] * b[M.m33];
            c[M.m20] = a[M.m20] * b[M.m00] + a[M.m21] * b[M.m10] + a[M.m22] * b[M.m20] + a[M.m23] * b[M.m30];
            c[M.m21] = a[M.m20] * b[M.m01] + a[M.m21] * b[M.m11] + a[M.m22] * b[M.m21] + a[M.m23] * b[M.m31];
            c[M.m22] = a[M.m20] * b[M.m02] + a[M.m21] * b[M.m12] + a[M.m22] * b[M.m22] + a[M.m23] * b[M.m32];
            c[M.m23] = a[M.m20] * b[M.m03] + a[M.m21] * b[M.m13] + a[M.m22] * b[M.m23] + a[M.m23] * b[M.m33];
            c[M.m30] = a[M.m30] * b[M.m00] + a[M.m31] * b[M.m10] + a[M.m32] * b[M.m20] + a[M.m33] * b[M.m30];
            c[M.m31] = a[M.m30] * b[M.m01] + a[M.m31] * b[M.m11] + a[M.m32] * b[M.m21] + a[M.m33] * b[M.m31];
            c[M.m32] = a[M.m30] * b[M.m02] + a[M.m31] * b[M.m12] + a[M.m32] * b[M.m22] + a[M.m33] * b[M.m32];
            c[M.m33] = a[M.m30] * b[M.m03] + a[M.m31] * b[M.m13] + a[M.m32] * b[M.m23] + a[M.m33] * b[M.m33];
            return c;
        };
        function matrixInverse(m) {
            var inv = new Float32Array(16);
            inv[0] = m[5] * m[10] * m[15] - m[5] * m[11] * m[14] - m[9] * m[6] * m[15] + m[9] * m[7] * m[14] + m[13] * m[6] * m[11] - m[13] * m[7] * m[10];
            inv[4] = -m[4] * m[10] * m[15] + m[4] * m[11] * m[14] + m[8] * m[6] * m[15] - m[8] * m[7] * m[14] - m[12] * m[6] * m[11] + m[12] * m[7] * m[10];
            inv[8] = m[4] * m[9] * m[15] - m[4] * m[11] * m[13] - m[8] * m[5] * m[15] + m[8] * m[7] * m[13] + m[12] * m[5] * m[11] - m[12] * m[7] * m[9];
            inv[12] = -m[4] * m[9] * m[14] + m[4] * m[10] * m[13] + m[8] * m[5] * m[14] - m[8] * m[6] * m[13] - m[12] * m[5] * m[10] + m[12] * m[6] * m[9];
            inv[1] = -m[1] * m[10] * m[15] + m[1] * m[11] * m[14] + m[9] * m[2] * m[15] - m[9] * m[3] * m[14] - m[13] * m[2] * m[11] + m[13] * m[3] * m[10];
            inv[5] = m[0] * m[10] * m[15] - m[0] * m[11] * m[14] - m[8] * m[2] * m[15] + m[8] * m[3] * m[14] + m[12] * m[2] * m[11] - m[12] * m[3] * m[10];
            inv[9] = -m[0] * m[9] * m[15] + m[0] * m[11] * m[13] + m[8] * m[1] * m[15] - m[8] * m[3] * m[13] - m[12] * m[1] * m[11] + m[12] * m[3] * m[9];
            inv[13] = m[0] * m[9] * m[14] - m[0] * m[10] * m[13] - m[8] * m[1] * m[14] + m[8] * m[2] * m[13] + m[12] * m[1] * m[10] - m[12] * m[2] * m[9];
            inv[2] = m[1] * m[6] * m[15] - m[1] * m[7] * m[14] - m[5] * m[2] * m[15] + m[5] * m[3] * m[14] + m[13] * m[2] * m[7] - m[13] * m[3] * m[6];
            inv[6] = -m[0] * m[6] * m[15] + m[0] * m[7] * m[14] + m[4] * m[2] * m[15] - m[4] * m[3] * m[14] - m[12] * m[2] * m[7] + m[12] * m[3] * m[6];
            inv[10] = m[0] * m[5] * m[15] - m[0] * m[7] * m[13] - m[4] * m[1] * m[15] + m[4] * m[3] * m[13] + m[12] * m[1] * m[7] - m[12] * m[3] * m[5];
            inv[14] = -m[0] * m[5] * m[14] + m[0] * m[6] * m[13] + m[4] * m[1] * m[14] - m[4] * m[2] * m[13] - m[12] * m[1] * m[6] + m[12] * m[2] * m[5];
            inv[3] = -m[1] * m[6] * m[11] + m[1] * m[7] * m[10] + m[5] * m[2] * m[11] - m[5] * m[3] * m[10] - m[9] * m[2] * m[7] + m[9] * m[3] * m[6];
            inv[7] = m[0] * m[6] * m[11] - m[0] * m[7] * m[10] - m[4] * m[2] * m[11] + m[4] * m[3] * m[10] + m[8] * m[2] * m[7] - m[8] * m[3] * m[6];
            inv[11] = -m[0] * m[5] * m[11] + m[0] * m[7] * m[9] + m[4] * m[1] * m[11] - m[4] * m[3] * m[9] - m[8] * m[1] * m[7] + m[8] * m[3] * m[5];
            inv[15] = m[0] * m[5] * m[10] - m[0] * m[6] * m[9] - m[4] * m[1] * m[10] + m[4] * m[2] * m[9] + m[8] * m[1] * m[6] - m[8] * m[2] * m[5];
            var det = m[0] * inv[0] + m[1] * inv[4] + m[2] * inv[8] + m[3] * inv[12];
            if (det == 0.0)
                return null;
            det = 1.0 / det;
            for (var i = 0; i < 16; i++)
                inv[i] = inv[i] * det;
            return inv;
        };

        // Build the view matrix
        /*this.camera = {
        distance: 5,
        rotx: 0,
        roty: 0
        };*/
        var cx = Math.cos(-this.camera.roty);
        var sx = Math.sin(-this.camera.roty);
        var xrotMatrix = new Float32Array([
            1, 0, 0, 0,
            0, cx, -sx, 0,
            0, sx, cx, 0,
            0, 0, 0, 1
        ]);
        var cy = Math.cos(-this.camera.rotx);
        var sy = Math.sin(-this.camera.rotx);
        var yrotMatrix = new Float32Array([
            cy, 0, sy, 0,
            0, 1, 0, 0,
            -sy, 0, cy, 0,
            0, 0, 0, 1
        ]);
        var zoomMatrix = new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, -this.camera.distance * 5, 1
        ]);
        var rotationMatrix = matrixMult(yrotMatrix, xrotMatrix);
        var modelViewMatrix = matrixMult(rotationMatrix, zoomMatrix);
        gl.uniformMatrix4fv(this.program.u_modelViewMatrix, false, modelViewMatrix);

        // Inverse view matrix (for lighting)
        var modelViewInvMatrix = matrixInverse(modelViewMatrix);
        function transpose(m) {
            var rows = 4, cols = 4;
            var elements = new Array(16), ni = cols, i, nj, j;
            do {
                i = cols - ni;
                nj = rows;
                do {
                    j = rows - nj;
                    elements[i * 4 + j] = m[j * 4 + i];
                } while (--nj);
            } while (--ni);
            return elements;
        };
        modelViewInvMatrix = transpose(modelViewInvMatrix);
        gl.uniformMatrix4fv(this.program.u_modelViewInvMatrix, false, modelViewInvMatrix);

        gl.enable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);

        if (!this.triBuffer) {
            // No custom buffer, draw raw user stuff
            gl.uniform1i(this.program.u_enableLighting, 0);
            gl.uniform1i(this.program.u_wireframe, 0);
            gl.enableVertexAttribArray(this.program.a_position);
            gl.disableVertexAttribArray(this.program.a_normal);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.arrayBufferTarget);
            gl.vertexAttribPointer(this.program.a_position, ds.position.size, ds.position.type, ds.position.normalized, ds.position.stride, ds.position.offset);
            gl.vertexAttribPointer(this.program.a_normal, 3, gl.FLOAT, false, ds.position.stride, 0);
            if (this.elementArrayBufferTarget) {
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.elementArrayBufferTarget);
                gl.drawElements(ds.mode, ds.count, ds.elementArrayType, ds.offset);
            } else {
                gl.drawArrays(ds.mode, ds.first, ds.count);
            }
        } else {
            // Draw triangles
            if (this.triBuffer) {
                gl.uniform1i(this.program.u_enableLighting, 1);
                gl.uniform1i(this.program.u_wireframe, 0);
                gl.enableVertexAttribArray(this.program.a_position);
                gl.enableVertexAttribArray(this.program.a_normal);
                gl.bindBuffer(gl.ARRAY_BUFFER, this.triBuffer);
                gl.vertexAttribPointer(this.program.a_position, 3, gl.FLOAT, false, 24, 0);
                gl.vertexAttribPointer(this.program.a_normal, 3, gl.FLOAT, false, 24, 12);
                gl.drawArrays(gl.TRIANGLES, 0, this.triBuffer.count);
            }

            // Draw wireframe
            if (this.lineBuffer) {
                gl.enable(gl.DEPTH_TEST);
                gl.enable(gl.BLEND);
                gl.uniform1i(this.program.u_enableLighting, 0);
                gl.uniform1i(this.program.u_wireframe, 1);
                gl.enableVertexAttribArray(this.program.a_position);
                gl.disableVertexAttribArray(this.program.a_normal);
                gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuffer);
                gl.vertexAttribPointer(this.program.a_position, 3, gl.FLOAT, false, 0, 0);
                gl.vertexAttribPointer(this.program.a_normal, 3, gl.FLOAT, false, 0, 0);
                gl.drawArrays(gl.LINES, 0, this.lineBuffer.count);
            }
        }
    };

    function extractAttribute(gl, buffer, version, attrib) {
        var data = buffer.constructVersion(gl, version);
        if (!data) {
            return null;
        }
        var dataBuffer = data.buffer ? data.buffer : data;

        var result = [];

        var byteAdvance = 0;
        switch (attrib.type) {
            case gl.BYTE:
            case gl.UNSIGNED_BYTE:
                byteAdvance = 1 * attrib.size;
                break;
            case gl.SHORT:
            case gl.UNSIGNED_SHORT:
                byteAdvance = 2 * attrib.size;
                break;
            default:
            case gl.FLOAT:
                byteAdvance = 4 * attrib.size;
                break;
        }
        var stride = attrib.stride ? attrib.stride : byteAdvance;
        var byteOffset = 0;
        while (byteOffset < data.byteLength) {
            var readView = null;
            switch (attrib.type) {
                case gl.BYTE:
                    readView = new Int8Array(dataBuffer, byteOffset, attrib.size);
                    break;
                case gl.UNSIGNED_BYTE:
                    readView = new Uint8Array(dataBuffer, byteOffset, attrib.size);
                    break;
                case gl.SHORT:
                    readView = new Int16Array(dataBuffer, byteOffset, attrib.size);
                    break;
                case gl.UNSIGNED_SHORT:
                    readView = new Uint16Array(dataBuffer, byteOffset, attrib.size);
                    break;
                default:
                case gl.FLOAT:
                    readView = new Float32Array(dataBuffer, byteOffset, attrib.size);
                    break;
            }

            // HACK: this is completely and utterly stupidly slow
            // TODO: speed up extracting attributes
            switch (attrib.size) {
                case 1:
                    result.push([readView[0], 0, 0, 0]);
                    break;
                case 2:
                    result.push([readView[0], readView[1], 0, 0]);
                    break;
                case 3:
                    result.push([readView[0], readView[1], readView[2], 0]);
                    break;
                case 4:
                    result.push([readView[0], readView[1], readView[2], readView[3]]);
                    break;
            }

            byteOffset += stride;
        }

        return result;
    };

    function buildTriangles(gl, drawState, start, count, positionData, indices) {
        var triangles = [];

        var end = start + count;

        // Emit triangles
        switch (drawState.mode) {
            case gl.TRIANGLES:
                if (indices) {
                    for (var n = start; n < end; n += 3) {
                        triangles.push([indices[n], indices[n + 1], indices[n + 2]]);
                    }
                } else {
                    for (var n = start; n < end; n += 3) {
                        triangles.push([n, n + 1, n + 2]);
                    }
                }
                break;
            case gl.TRIANGLE_FAN:
                if (indices) {
                    triangles.push([indices[start], indices[start + 1], indices[start + 2]]);
                    for (var n = start + 2; n < end; n++) {
                        triangles.push([indices[start], indices[n], indices[n + 1]]);
                    }
                } else {
                    triangles.push([start, start + 1, start + 2]);
                    for (var n = start + 2; n < end; n++) {
                        triangles.push([start, n, n + 1]);
                    }
                }
                break;
            case gl.TRIANGLE_STRIP:
                if (indices) {
                    for (var n = start; n < end - 2; n++) {
                        if (indices[n] == indices[n + 1]) {
                            // Degenerate
                            continue;
                        }
                        if (n % 2 == 0) {
                            triangles.push([indices[n], indices[n + 1], indices[n + 2]]);
                        } else {
                            triangles.push([indices[n + 2], indices[n + 1], indices[n]]);
                        }
                    }
                } else {
                    for (var n = start; n < end - 2; n++) {
                        if (n % 2 == 0) {
                            triangles.push([n, n + 1, n + 2]);
                        } else {
                            triangles.push([n + 2, n + 1, n]);
                        }
                    }
                }
                break;
        }

        return triangles;
    };

    // from tdl
    function normalize(a) {
        var r = [];
        var n = 0.0;
        var aLength = a.length;
        for (var i = 0; i < aLength; i++) {
            n += a[i] * a[i];
        }
        n = Math.sqrt(n);
        if (n > 0.00001) {
            for (var i = 0; i < aLength; i++) {
                r[i] = a[i] / n;
            }
        } else {
            r = [0, 0, 0];
        }
        return r;
    };

    // drawState: {
    //     mode: enum
    //     arrayBuffer: [value, version]
    //     position: { size: enum, type: enum, normalized: bool, stride: n, offset: n }
    //     elementArrayBuffer: [value, version]/null
    //     elementArrayType: UNSIGNED_BYTE/UNSIGNED_SHORT/null
    //     first: n (if no elementArrayBuffer)
    //     offset: n bytes (if elementArrayBuffer)
    //     count: n
    // }
    BufferPreview.prototype.setBuffer = function (drawState, force) {
        var self = this;
        var gl = this.gl;
        if (this.arrayBufferTarget) {
            this.arrayBuffer.deleteTarget(gl, this.arrayBufferTarget);
            this.arrayBufferTarget = null;
            this.arrayBuffer = null;
        }
        if (this.elementArrayBufferTarget) {
            this.elementArrayBuffer.deleteTarget(gl, this.elementArrayBufferTarget);
            this.elementArrayBufferTarget = null;
            this.elementArrayBuffer = null;
        }

        var maxPreviewBytes = 40000;
        if (drawState && !force && drawState.arrayBuffer[1].parameters[gl.BUFFER_SIZE] > maxPreviewBytes) {
            // Buffer is really big - delay populating
            this.expandLink.style.visibility = "visible";
            this.expandLink.onclick = function () {
                self.setBuffer(drawState, true);
                self.expandLink.style.visibility = "collapse";
            };
            this.drawState = null;
            this.draw();
        } else if (drawState) {
            if (drawState.arrayBuffer) {
                this.arrayBuffer = drawState.arrayBuffer[0];
                var version = drawState.arrayBuffer[1];
                this.arrayBufferTarget = this.arrayBuffer.createTarget(gl, version);
            }
            if (drawState.elementArrayBuffer) {
                this.elementArrayBuffer = drawState.elementArrayBuffer[0];
                var version = drawState.elementArrayBuffer[1];
                this.elementArrayBufferTarget = this.elementArrayBuffer.createTarget(gl, version);
            }

            // Grab all position data as a list of vec4
            var positionData = extractAttribute(gl, drawState.arrayBuffer[0], drawState.arrayBuffer[1], drawState.position);

            // Pull out indices (or null if none)
            var indices = null;
            if (drawState.elementArrayBuffer) {
                indices = drawState.elementArrayBuffer[0].constructVersion(gl, drawState.elementArrayBuffer[1]);
            }

            // Get interested range
            var start;
            var count = drawState.count;
            if (drawState.elementArrayBuffer) {
                // Indexed
                start = drawState.offset;
                switch (drawState.elementArrayType) {
                    case gl.UNSIGNED_BYTE:
                        start /= 1;
                        break;
                    case gl.UNSIGNED_SHORT:
                        start /= 2;
                        break;
                }
            } else {
                // Unindexed
                start = drawState.first;
            }

            // Get all triangles as a list of 3-set [v1,v2,v3] vertex indices
            var areTriangles = false;
            switch (drawState.mode) {
                case gl.TRIANGLES:
                case gl.TRIANGLE_FAN:
                case gl.TRIANGLE_STRIP:
                    areTriangles = true;
                    break;
            }
            if (areTriangles) {
                this.triangles = buildTriangles(gl, drawState, start, count, positionData, indices);
                var i;

                // Generate interleaved position + normal data from triangles as a TRIANGLES list
                var triData = new Float32Array(this.triangles.length * 3 * 3 * 2);
                i = 0;
                for (var n = 0; n < this.triangles.length; n++) {
                    var tri = this.triangles[n];
                    var v1 = positionData[tri[0]];
                    var v2 = positionData[tri[1]];
                    var v3 = positionData[tri[2]];

                    // a = v2 - v1
                    var a = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
                    // b = v3 - v1
                    var b = [v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]];
                    // a x b
                    var normal = normalize([a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]);

                    triData[i++] = v1[0]; triData[i++] = v1[1]; triData[i++] = v1[2];
                    triData[i++] = normal[0]; triData[i++] = normal[1]; triData[i++] = normal[2];
                    triData[i++] = v2[0]; triData[i++] = v2[1]; triData[i++] = v2[2];
                    triData[i++] = normal[0]; triData[i++] = normal[1]; triData[i++] = normal[2];
                    triData[i++] = v3[0]; triData[i++] = v3[1]; triData[i++] = v3[2];
                    triData[i++] = normal[0]; triData[i++] = normal[1]; triData[i++] = normal[2];
                }
                this.triBuffer = gl.createBuffer();
                this.triBuffer.count = this.triangles.length * 3;
                gl.bindBuffer(gl.ARRAY_BUFFER, this.triBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, triData, gl.STATIC_DRAW);

                // Generate LINES list for wireframe
                var lineData = new Float32Array(this.triangles.length * 3 * 2 * 3);
                i = 0;
                for (var n = 0; n < this.triangles.length; n++) {
                    var tri = this.triangles[n];
                    var v1 = positionData[tri[0]];
                    var v2 = positionData[tri[1]];
                    var v3 = positionData[tri[2]];
                    lineData[i++] = v1[0]; lineData[i++] = v1[1]; lineData[i++] = v1[2];
                    lineData[i++] = v2[0]; lineData[i++] = v2[1]; lineData[i++] = v2[2];
                    lineData[i++] = v2[0]; lineData[i++] = v2[1]; lineData[i++] = v2[2];
                    lineData[i++] = v3[0]; lineData[i++] = v3[1]; lineData[i++] = v3[2];
                    lineData[i++] = v3[0]; lineData[i++] = v3[1]; lineData[i++] = v3[2];
                    lineData[i++] = v1[0]; lineData[i++] = v1[1]; lineData[i++] = v1[2];
                }
                this.lineBuffer = gl.createBuffer();
                this.lineBuffer.count = this.triangles.length * 3 * 2;
                gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, lineData, gl.STATIC_DRAW);
            } else {
                this.triangles = null;
                this.triBuffer = null;
                this.lineBuffer = null;
            }

            // Determine the extents of the interesting region
            var minx = Number.MAX_VALUE; var miny = Number.MAX_VALUE; var minz = Number.MAX_VALUE;
            var maxx = Number.MIN_VALUE; var maxy = Number.MIN_VALUE; var maxz = Number.MIN_VALUE;
            if (indices) {
                for (var n = start; n < start + count; n++) {
                    var vec = positionData[indices[n]];
                    minx = Math.min(minx, vec[0]); maxx = Math.max(maxx, vec[0]);
                    miny = Math.min(miny, vec[1]); maxy = Math.max(maxy, vec[1]);
                    minz = Math.min(minz, vec[2]); maxz = Math.max(maxz, vec[2]);
                }
            } else {
                for (var n = start; n < start + count; n++) {
                    var vec = positionData[n];
                    minx = Math.min(minx, vec[0]); maxx = Math.max(maxx, vec[0]);
                    miny = Math.min(miny, vec[1]); maxy = Math.max(maxy, vec[1]);
                    minz = Math.min(minz, vec[2]); maxz = Math.max(maxz, vec[2]);
                }
            }
            var maxd = 0;
            var extents = [minx, miny, minz, maxx, maxy, maxz];
            for (var n = 0; n < extents.length; n++) {
                maxd = Math.max(maxd, Math.abs(extents[n]));
            }

            // Now have a bounding box for the mesh
            // TODO: set initial view based on bounding box
            this.camera.defaultDistance = maxd;
            this.resetCamera();

            this.drawState = drawState;
            this.draw();
        } else {
            this.drawState = null;
            this.draw();
        }
    };

    BufferPreview.prototype.setupDefaultInput = function () {
        var self = this;

        // Drag rotate
        var lastValueX = 0;
        var lastValueY = 0;
        function mouseMove(e) {
            var dx = e.screenX - lastValueX;
            var dy = e.screenY - lastValueY;
            lastValueX = e.screenX;
            lastValueY = e.screenY;

            var camera = self.camera;
            camera.rotx += dx * Math.PI / 180;
            camera.roty += dy * Math.PI / 180;
            self.draw();

            e.preventDefault();
            e.stopPropagation();
        };
        function mouseUp(e) {
            endDrag();
            e.preventDefault();
            e.stopPropagation();
        };
        function beginDrag() {
            self.document.addEventListener("mousemove", mouseMove, true);
            self.document.addEventListener("mouseup", mouseUp, true);
            self.canvas.style.cursor = "move";
            self.document.body.style.cursor = "move";
        };
        function endDrag() {
            self.document.removeEventListener("mousemove", mouseMove, true);
            self.document.removeEventListener("mouseup", mouseUp, true);
            self.canvas.style.cursor = "";
            self.document.body.style.cursor = "";
        };
        this.canvas.onmousedown = function (e) {
            beginDrag();
            lastValueX = e.screenX;
            lastValueY = e.screenY;
            e.preventDefault();
            e.stopPropagation();
        };

        // Zoom
        this.canvas.onmousewheel = function (e) {
            var delta = 0;
            if (e.wheelDelta) {
                delta = e.wheelDelta / 120;
            } else if (e.detail) {
                delta = -e.detail / 3;
            }
            if (delta) {
                var camera = self.camera;
                camera.distance -= delta * (camera.defaultDistance / 10.0);
                camera.distance = Math.max(camera.defaultDistance / 10.0, camera.distance);
                self.draw();
            }

            e.preventDefault();
            e.stopPropagation();
            e.returnValue = false;
        };
        this.canvas.addEventListener("DOMMouseScroll", this.canvas.onmousewheel, false);
    };

    ui.BufferPreview = BufferPreview;
})();
(function () {
    var ui = glinamespace("gli.ui");

    var TexturePreviewGenerator = function (canvas, useMirror) {
        this.useMirror = useMirror;

        if (canvas) {
            // Re-use the canvas passed in
        } else {
            // Create a canvas for previewing
            canvas = document.createElement("canvas");
            canvas.className = "gli-reset";

            // HACK: this gets things working in firefox
            var frag = document.createDocumentFragment();
            frag.appendChild(canvas);
        }
        this.canvas = canvas;

        var gl = this.gl = gli.util.getWebGLContext(canvas);

        var vsSource =
        'attribute vec2 a_position;' +
        'attribute vec2 a_uv;' +
        'varying vec2 v_uv;' +
        'void main() {' +
        '    gl_Position = vec4(a_position, 0.0, 1.0);' +
        '    v_uv = a_uv;' +
        '}';
        var fs2dSource =
        'precision highp float;' +
        'uniform sampler2D u_sampler0;' +
        'varying vec2 v_uv;' +
        'void main() {' +
        '    gl_FragColor = texture2D(u_sampler0, v_uv);' +
        '}';

        // Initialize shaders
        var vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vs, vsSource);
        gl.compileShader(vs);
        var fs2d = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs2d, fs2dSource);
        gl.compileShader(fs2d);
        var program2d = this.program2d = gl.createProgram();
        gl.attachShader(program2d, vs);
        gl.attachShader(program2d, fs2d);
        gl.linkProgram(program2d);
        gl.deleteShader(vs);
        gl.deleteShader(fs2d);
        gl.useProgram(program2d);
        program2d.u_sampler0 = gl.getUniformLocation(program2d, "u_sampler0");
        program2d.a_position = gl.getAttribLocation(program2d, "a_position");
        program2d.a_uv = gl.getAttribLocation(program2d, "a_uv");
        gl.useProgram(null);

        var vertices = new Float32Array([
            -1, -1, 0, 1,
             1, -1, 1, 1,
            -1, 1, 0, 0,
            -1, 1, 0, 0,
             1, -1, 1, 1,
             1, 1, 1, 0
        ]);
        var buffer = this.buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    };

    TexturePreviewGenerator.prototype.dispose = function() {
        var gl = this.gl;

        gl.deleteProgram(this.program2d);
        this.program2d = null;

        gl.deleteBuffer(this.buffer);
        this.buffer = null;

        this.gl = null;
        this.canvas = null;
    };

    TexturePreviewGenerator.prototype.draw = function (texture, version, targetFace, desiredWidth, desiredHeight) {
        var gl = this.gl;

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        if ((this.canvas.width != desiredWidth) || (this.canvas.height != desiredHeight)) {
            this.canvas.width = desiredWidth;
            this.canvas.height = desiredHeight;
        }

        gl.viewport(0, 0, this.canvas.width, this.canvas.height);

        gl.colorMask(true, true, true, true);
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        if (texture && version) {
            gl.disable(gl.CULL_FACE);
            gl.disable(gl.DEPTH_TEST);
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

            gl.useProgram(this.program2d);
            gl.uniform1i(this.program2d.u_sampler0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);

            gl.enableVertexAttribArray(0);
            gl.enableVertexAttribArray(1);
            gl.vertexAttribPointer(this.program2d.a_position, 2, gl.FLOAT, false, 16, 0);
            gl.vertexAttribPointer(this.program2d.a_uv, 2, gl.FLOAT, false, 16, 8);

            var gltex;
            if (this.useMirror) {
                gltex = texture.mirror.target;
            } else {
                gltex = texture.createTarget(gl, version, null, targetFace);
            }

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, gltex);

            gl.drawArrays(gl.TRIANGLES, 0, 6);

            if (!this.useMirror) {
                texture.deleteTarget(gl, gltex);
            }
        }
    };

    TexturePreviewGenerator.prototype.capture = function (doc) {
        var targetCanvas = doc.createElement("canvas");
        targetCanvas.className = "gli-reset";
        targetCanvas.width = this.canvas.width;
        targetCanvas.height = this.canvas.height;
        try {
            var ctx = targetCanvas.getContext("2d");
            if (doc == this.canvas.ownerDocument) {
                ctx.drawImage(this.canvas, 0, 0);
            } else {
                // Need to extract the data and copy manually, as doc->doc canvas
                // draws aren't supported for some stupid reason
                var srcctx = this.canvas.getContext("2d");
                if (srcctx) {
                    var srcdata = srcctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
                    ctx.putImageData(srcdata, 0, 0);
                } else {
                    var dataurl = this.canvas.toDataURL();
                    var img = doc.createElement("img");
                    img.onload = function() {
                        ctx.drawImage(img, 0, 0);
                    };
                    img.src = dataurl;
                }
            }
        } catch (e) {
            window.console.log('unable to draw texture preview');
            window.console.log(e);
        }
        return targetCanvas;
    };

    TexturePreviewGenerator.prototype.buildItem = function (w, doc, gl, texture, closeOnClick, useCache) {
        var self = this;

        var el = doc.createElement("div");
        el.className = "texture-picker-item";
        if (texture.status == gli.host.Resource.DEAD) {
            el.className += " texture-picker-item-deleted";
        }

        var previewContainer = doc.createElement("div");
        previewContainer.className = "texture-picker-item-container";
        el.appendChild(previewContainer);

        function updatePreview() {
            var preview = null;
            if (useCache && texture.cachedPreview) {
                // Preview exists - use it
                preview = texture.cachedPreview;
            }
            if (!preview) {
                // Preview does not exist - create it
                // TODO: pick the right version
                var version = texture.currentVersion;
                var targetFace;
                switch (texture.type) {
                    case gl.TEXTURE_2D:
                        targetFace = null;
                        break;
                    case gl.TEXTURE_CUBE_MAP:
                        targetFace = gl.TEXTURE_CUBE_MAP_POSITIVE_X; // pick a different face?
                        break;
                }
                var size = texture.guessSize(gl, version, targetFace);
                var desiredWidth = 128;
                var desiredHeight = 128;
                if (size) {
                    if (size[0] > size[1]) {
                        desiredWidth = 128;
                        desiredHeight = 128 / (size[0] / size[1]);
                    } else {
                        desiredHeight = 128;
                        desiredWidth = 128 / (size[1] / size[0]);
                    }
                }
                self.draw(texture, version, targetFace, desiredWidth, desiredHeight);
                preview = self.capture(doc);
                var x = (128 / 2) - (desiredWidth / 2);
                var y = (128 / 2) - (desiredHeight / 2);
                preview.style.marginLeft = x + "px";
                preview.style.marginTop = y + "px";
                if (useCache) {
                    texture.cachedPreview = preview;
                }
            }
            if (preview) {
                // TODO: setup
                preview.className = "";
                if (preview.parentNode) {
                    preview.parentNode.removeChild(preview);
                }
                while (previewContainer.hasChildNodes()) {
                    previewContainer.removeChild(previewContainer.firstChild());
                }
                previewContainer.appendChild(preview);
            }
        };

        updatePreview();

        var iconDiv = doc.createElement("div");
        iconDiv.className = "texture-picker-item-icon";
        switch (texture.type) {
            case gl.TEXTURE_2D:
                iconDiv.className += " texture-picker-item-icon-2d";
                break;
            case gl.TEXTURE_CUBE_MAP:
                iconDiv.className += " texture-picker-item-icon-cube";
                break;
        }
        el.appendChild(iconDiv);

        var titleDiv = doc.createElement("div");
        titleDiv.className = "texture-picker-item-title";
        titleDiv.textContent = texture.getName();
        el.appendChild(titleDiv);

        el.onclick = function (e) {
            w.context.ui.showTexture(texture);
            if (closeOnClick) {
                w.close(); // TODO: do this?
            }
            e.preventDefault();
            e.stopPropagation();
        };

        texture.modified.addListener(self, function (texture) {
            texture.cachedPreview = null;
            updatePreview();
        });
        texture.deleted.addListener(self, function (texture) {
            el.className += " texture-picker-item-deleted";
        });

        return el;
    };

    ui.TexturePreviewGenerator = TexturePreviewGenerator;
})();
(function () {
    var ui = glinamespace("gli.ui");
    var Tab = ui.Tab;

    var createInspector = function () {
      var inspector = Tab.inspector();
      inspector.classList.add("window-trace-inspector");
      // UI is created for each context (Issue #52), where contexts are created
      // first to test for WebGL support and never used while ...
      var inspectors = document.getElementsByClassName("gliTraceInspector");
      // ... the last one is usually the one used.
      var right = inspectors[inspectors.length - 1];
      right.insertBefore(inspector, right.firstChild);
      this.traceView.createInspector(right);
    };

    var TraceTab = function (w) {
        var outer = Tab.divClass("window-right-outer");
        var right = Tab.divClass("window-right");
        right.classList.add("gliTraceInspector");
        var traceOuter = Tab.divClass("window-trace-outer");
        var trace = Tab.divClass("window-trace");
        var left = Tab.windowLeft({ listing: "frame list", toolbar: "toolbar" });

        trace.appendChild(Tab.divClass("trace-minibar", "minibar"));
        trace.appendChild(Tab.divClass("trace-listing", "call trace"));
        traceOuter.appendChild(trace);
        right.appendChild(traceOuter);
        outer.appendChild(right);
        outer.appendChild(left);

        this.el.appendChild(outer);

        this.listing = new gli.ui.LeftListing(w, this.el, "frame", function (el, frame) {
            var canvas = document.createElement("canvas");
            canvas.className = "gli-reset frame-item-preview";
            canvas.style.cursor = "pointer";
            canvas.width = 80;
            canvas.height = frame.screenshot.height / frame.screenshot.width * 80;

            // Draw the data - hacky, but easiest?
            var ctx2d = canvas.getContext("2d");
            ctx2d.drawImage(frame.screenshot, 0, 0, canvas.width, canvas.height);

            el.appendChild(canvas);

            var number = document.createElement("div");
            number.className = "frame-item-number";
            number.textContent = frame.frameNumber;
            el.appendChild(number);
        });
        this.traceView = new gli.ui.TraceView(w, this.el);

        this.listing.valueSelected.addListener(this, function (frame) {
            this.traceView.setFrame(frame);
        });

        var scrollStates = {
            listing: null,
            traceView: null,
        };
        this.lostFocus.addListener(this, function () {
            scrollStates.listing = this.listing.getScrollState();
            scrollStates.traceView = this.traceView.getScrollState();
        });
        this.gainedFocus.addListener(this, function () {
            this.listing.setScrollState(scrollStates.listing);
            this.traceView.setScrollState(scrollStates.traceView);
        });

        var context = w.context;
        for (var n = 0; n < context.frames.length; n++) {
            var frame = context.frames[n];
            this.listing.appendValue(frame);
        }
        if (context.frames.length > 0) {
            this.listing.selectValue(context.frames[context.frames.length - 1]);
        }

        this.layout = function () {
            if (this.traceView.layout) this.traceView.layout();
        };

        this.createInspector = createInspector;
    };

    ui.TraceTab = TraceTab;
})();
(function () {
    var ui = glinamespace("gli.ui");

    var TraceMinibar = function (view, w, elementRoot) {
        var self = this;
        this.view = view;
        this.window = w;
        this.elements = {
            bar: elementRoot.getElementsByClassName("trace-minibar")[0]
        };
        this.buttons = {};
        this.toggles = {};

        this.controller = w.controller;

        this.controller.stepCompleted.addListener(this, function (callIndex) {
            if (callIndex == 0) {
                self.lastCallIndex = null;
            } else {
                self.lastCallIndex = callIndex - 1;
            }
        });

        var buttonHandlers = {};

        function addButton(bar, name, tip, callback) {
            var el = w.document.createElement("div");
            el.className = "trace-minibar-button trace-minibar-button-disabled trace-minibar-command-" + name;

            el.title = tip;
            el.textContent = " ";

            el.onclick = function () {
                if (el.className.indexOf("disabled") != -1) {
                    return;
                }
                callback.apply(self);
            };
            buttonHandlers[name] = callback;

            bar.appendChild(el);

            self.buttons[name] = el;
        };

        addButton(this.elements.bar, "run", "Playback entire frame (F9)", function () {
            this.controller.stepUntilEnd();
            this.refreshState();
        });
        addButton(this.elements.bar, "step-forward", "Step forward one call (F8)", function () {
            if (this.controller.stepForward() == false) {
                this.controller.reset();
                this.controller.openFrame(this.view.frame);
                this.controller.stepForward();
            }
            this.refreshState();
        });
        addButton(this.elements.bar, "step-back", "Step backward one call (F6)", function () {
            this.controller.stepBackward();
            this.refreshState();
        });
        addButton(this.elements.bar, "step-until-draw", "Skip to the next draw call (F7)", function () {
            this.controller.stepUntilDraw();
            this.refreshState();
        });
        /*
        addButton(this.elements.bar, "step-until-error", "Run until an error occurs", function () {
        alert("step-until-error");
        this.controller.stepUntilError();
        this.refreshState();
        });
        */
        addButton(this.elements.bar, "restart", "Restart from the beginning of the frame (F10)", function () {
            this.controller.openFrame(this.view.frame);
            this.controller.stepForward();
            this.refreshState();
        });

        // TODO: move to shared code
        function addToggle(bar, defaultValue, name, tip, callback) {
            var input = w.document.createElement("input");
            input.style.width = "inherit";
            input.style.height = "inherit";

            input.type = "checkbox";
            input.title = tip;
            input.checked = defaultValue;

            input.onchange = function () {
                callback.apply(self, [input.checked]);
            };

            var span = w.document.createElement("span");
            span.textContent = " " + name;

            span.onclick = function () {
                input.checked = !input.checked;
                callback.apply(self, [input.checked]);
            };

            var el = w.document.createElement("div");
            el.className = "trace-minibar-toggle";
            el.appendChild(input);
            el.appendChild(span);

            bar.appendChild(el);

            callback.apply(self, [defaultValue]);

            self.toggles[name] = input;
        };

        var traceCallRedundantBackgroundColor = "#FFFFD1";
        var redundantStylesheet = w.document.createElement("style");
        redundantStylesheet.type = "text/css";
        redundantStylesheet.appendChild(w.document.createTextNode(".trace-call-redundant { background-color: " + traceCallRedundantBackgroundColor + "; }"));
        w.document.getElementsByTagName("head")[0].appendChild(redundantStylesheet);
        var stylesheet = null;
        for (var n = 0; n < w.document.styleSheets.length; n++) {
            var ss = w.document.styleSheets[n];
            if (ss.ownerNode == redundantStylesheet) {
                stylesheet = ss;
                break;
            }
        }
        var redundantRule = null;
        // Grabbed on demand in case it hasn't loaded yet

        var defaultShowRedundant = gli.settings.session.showRedundantCalls;
        addToggle(this.elements.bar, defaultShowRedundant, "Redundant Calls", "Display redundant calls in yellow", function (checked) {
            if (!stylesheet) {
                return;
            }
            if (!redundantRule) {
                for (var n = 0; n < stylesheet.cssRules.length; n++) {
                    var rule = stylesheet.cssRules[n];
                    if (rule.selectorText == ".trace-call-redundant") {
                        redundantRule = rule;
                        break;
                    }
                }
            }

            if (checked) {
                redundantRule.style.backgroundColor = traceCallRedundantBackgroundColor;
            } else {
                redundantRule.style.backgroundColor = "transparent";
            }

            gli.settings.session.showRedundantCalls = checked;
            gli.settings.save();
        });

        w.document.addEventListener("keydown", function (event) {
            var handled = false;
            switch (event.keyCode) {
                case 117: // F6
                    buttonHandlers["step-back"].apply(self);
                    handled = true;
                    break;
                case 118: // F7
                    buttonHandlers["step-until-draw"].apply(self);
                    handled = true;
                    break;
                case 119: // F8
                    buttonHandlers["step-forward"].apply(self);
                    handled = true;
                    break;
                case 120: // F9
                    buttonHandlers["run"].apply(self);
                    handled = true;
                    break;
                case 121: // F10
                    buttonHandlers["restart"].apply(self);
                    handled = true;
                    break;
            };

            if (handled) {
                event.preventDefault();
                event.stopPropagation();
            }
        }, false);

        //this.update();
    };
    TraceMinibar.prototype.refreshState = function (ignoreScroll) {
        //var newState = new gli.StateCapture(this.replaygl);
        if (this.lastCallIndex != null) {
            this.view.traceListing.setActiveCall(this.lastCallIndex, ignoreScroll);
        }
        //this.window.stateHUD.showState(newState);
        //this.window.outputHUD.refresh();

        if (this.view.frame) {
            this.view.updateActiveFramebuffer();
        }
    };
    TraceMinibar.prototype.stepUntil = function (callIndex) {
        if (this.controller.callIndex > callIndex) {
            this.controller.reset();
            this.controller.openFrame(this.view.frame, true);
            this.controller.stepUntil(callIndex);
        } else {
            this.controller.stepUntil(callIndex);
        }
        this.refreshState();
    };
    TraceMinibar.prototype.reset = function () {
        this.update();
    };
    TraceMinibar.prototype.update = function () {
        var self = this;

        if (this.view.frame) {
            this.controller.reset();
            this.controller.runFrame(this.view.frame);
            this.controller.openFrame(this.view.frame);
        } else {
            this.controller.reset();
            // TODO: clear canvas
            //console.log("would clear canvas");
        }

        function toggleButton(name, enabled) {
            var el = self.buttons[name];
            if (el) {
                if (enabled) {
                    el.className = el.className.replace("trace-minibar-button-disabled", "trace-minibar-button-enabled");
                } else {
                    el.className = el.className.replace("trace-minibar-button-enabled", "trace-minibar-button-disabled");
                }
            }
        };

        for (var n in this.buttons) {
            toggleButton(n, false);
        }

        toggleButton("run", true);
        toggleButton("step-forward", true);
        toggleButton("step-back", true);
        toggleButton("step-until-error", true);
        toggleButton("step-until-draw", true);
        toggleButton("restart", true);

        this.refreshState();

        //this.window.outputHUD.refresh();
    };

    var TraceView = function (w, elementRoot) {
        var self = this;
        var context = w.context;
        this.window = w;
        this.elements = {};
        this.minibar = new TraceMinibar(this, w, elementRoot);
        this.traceListing = new gli.ui.TraceListing(this, w, elementRoot);
        this.frame = null;
    };

    TraceView.prototype.createInspector = function (elementRoot) {
        var w = this.window;
        var context = w.context;
        var self = this;
        this.inspectorElements = {
            "window-trace-outer": elementRoot.getElementsByClassName("window-trace-outer")[0],
            "window-trace": elementRoot.getElementsByClassName("window-trace")[0],
            "window-trace-inspector": elementRoot.getElementsByClassName("window-trace-inspector")[0],
            "trace-minibar": elementRoot.getElementsByClassName("trace-minibar")[0]
        };
        this.inspector = new gli.ui.SurfaceInspector(this, w, elementRoot, {
            splitterKey: 'traceSplitter',
            title: 'Replay Preview',
            selectionName: 'Buffer',
            selectionValues: null /* set later */
        });
        this.inspector.activeFramebuffers = [];
        this.inspector.querySize = function () {
            if (this.activeFramebuffers) {
                var framebuffer = this.activeFramebuffers[this.optionsList.selectedIndex];
                if (framebuffer) {
                    var gl = this.gl;
                    var originalFramebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING);
                    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer.mirror.target);
                    var texture = gl.getFramebufferAttachmentParameter(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME);
                    gl.bindFramebuffer(gl.FRAMEBUFFER, originalFramebuffer);
                    if (texture && texture.trackedObject) {
                        return texture.trackedObject.guessSize(gl);
                    }
                }
            }
            return [context.canvas.width, context.canvas.height];
        };
        this.inspector.reset = function () {
            this.layout();
            if (w.windows.pixelHistory) {
                if (w.windows.pixelHistory.isOpened()) {
                    w.windows.pixelHistory.clear();
                } else {
                    w.windows.pixelHistory.close();
                }
            }
            if (w.windows.drawInfo) {
                if (w.windows.drawInfo.isOpened()) {
                    w.windows.drawInfo.clear();
                } else {
                    w.windows.drawInfo.close();
                }
            }
        };
        this.inspector.inspectPixel = function (x, y, locationString) {
            if (!self.frame) {
                return;
            }
            gli.ui.PopupWindow.show(w.context, gli.ui.PixelHistory, "pixelHistory", function (popup) {
                popup.inspectPixel(self.frame, x, y, locationString);
            });
        };
        this.inspector.setupPreview = function () {
            if (this.previewer) {
                return;
            }
            this.previewer = new ui.TexturePreviewGenerator(this.canvas, true);
            this.gl = this.previewer.gl;
        };
        this.inspector.updatePreview = function () {
            this.layout();

            var gl = this.gl;
            gl.flush();

            // NOTE: index 0 is always null
            var framebuffer = this.activeFramebuffers[this.optionsList.selectedIndex];
            if (!framebuffer) {
                // Default framebuffer - redraw everything up to the current call (required as we've thrown out everything)
                this.canvas.width = context.canvas.width;
                this.canvas.height = context.canvas.height;
            }

            var controller = self.window.controller;
            var callIndex = controller.callIndex;
            controller.reset();
            controller.openFrame(self.frame, true);
            controller.stepUntil(callIndex - 1);

            if (framebuffer) {
                // User framebuffer - draw quad with the contents of the framebuffer
                var originalFramebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING);
                gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer.mirror.target);
                var texture = gl.getFramebufferAttachmentParameter(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME);
                gl.bindFramebuffer(gl.FRAMEBUFFER, originalFramebuffer);
                if (texture) {
                    texture = texture.trackedObject;
                }
                if (texture) {
                    var size = texture.guessSize(gl);
                    var desiredWidth = 1;
                    var desiredHeight = 1;
                    if (size) {
                        desiredWidth = size[0];
                        desiredHeight = size[1];
                        this.canvas.style.display = "";
                    } else {
                        this.canvas.style.display = "none";
                    }
                    this.previewer.draw(texture, texture.currentVersion, null, desiredWidth, desiredHeight);
                } else {
                    // ?
                    console.log("invalid framebuffer attachment");
                    this.canvas.style.display = "none";
                }
            }
        };

        var canvas = this.inspector.canvas;
        canvas.style.display = "";
        w.controller.setOutput(this.inspector.canvas);
        // TODO: watch for parent canvas size changes and update
        canvas.width = this.window.context.canvas.width;
        canvas.height = this.window.context.canvas.height;
    };

    TraceView.prototype.setInspectorWidth = function (newWidth) {
        //.window-trace-outer margin-left: -480px !important; /* -2 * window-inspector.width */
        //.window-trace margin-left: 240px !important;
        //.trace-minibar right: 240px; /* window-trace-inspector */
        //.trace-listing right: 240px; /* window-trace-inspector */
        this.inspectorElements["window-trace-outer"].style.marginLeft = (-2 * newWidth) + "px";
        this.inspectorElements["window-trace"].style.marginLeft = newWidth + "px";
        this.inspectorElements["window-trace-inspector"].style.width = newWidth + "px";
        this.inspectorElements["trace-minibar"].style.right = newWidth + "px";
        this.traceListing.elements.list.style.right = newWidth + "px";
    };

    TraceView.prototype.layout = function () {
        if (this.inspector) this.inspector.layout();
    };

    TraceView.prototype.reset = function () {
        this.frame = null;

        this.minibar.reset();
        this.traceListing.reset();
        this.inspector.reset();
    };

    TraceView.prototype.setFrame = function (frame) {
        var gl = this.window.context;

        this.reset();
        this.frame = frame;

        // Check for redundancy, if required
        gli.replay.RedundancyChecker.checkFrame(frame);

        // Find interesting calls
        var bindFramebufferCalls = [];
        var errorCalls = [];
        for (var n = 0; n < frame.calls.length; n++) {
            var call = frame.calls[n];
            if (call.name == "bindFramebuffer") {
                bindFramebufferCalls.push(call);
            }
            if (call.error) {
                errorCalls.push(call);
            }
        }

        // Setup support for multiple framebuffers
        var activeFramebuffers = [];
        if (bindFramebufferCalls.length > 0) {
            for (var n = 0; n < bindFramebufferCalls.length; n++) {
                var call = bindFramebufferCalls[n];
                var framebuffer = call.args[1];
                if (framebuffer) {
                    if (activeFramebuffers.indexOf(framebuffer) == -1) {
                        activeFramebuffers.push(framebuffer);
                    }
                }
            }
        }
        if (activeFramebuffers.length) {
            var names = [];
            // Index 0 is always default - push to activeFramebuffers to keep consistent
            activeFramebuffers.unshift(null);
            for (var n = 0; n < activeFramebuffers.length; n++) {
                var framebuffer = activeFramebuffers[n];
                if (framebuffer) {
                    names.push(framebuffer.getName());
                } else {
                    names.push("Default");
                }
            }
            this.inspector.setSelectionValues(names);
            this.inspector.elements.faces.style.display = "";
            this.inspector.optionsList.selectedIndex = 0;
        } else {
            this.inspector.setSelectionValues(null);
            this.inspector.elements.faces.style.display = "none";
        }
        this.inspector.activeOption = 0;
        this.inspector.activeFramebuffers = activeFramebuffers;

        // Print out errors to console
        if (errorCalls.length) {
            console.log(" ");
            console.log("Frame " + frame.frameNumber + " errors:");
            console.log("----------------------");
            for (var n = 0; n < errorCalls.length; n++) {
                var call = errorCalls[n];

                var callString = ui.populateCallString(this.window.context, call);
                var errorString = gli.info.enumToString(call.error);
                console.log(" " + errorString + " <= " + callString);

                // Stack (if present)
                if (call.stack) {
                    for (var m = 0; m < call.stack.length; m++) {
                        console.log("   - " + call.stack[m]);
                    }
                }
            }
            console.log(" ");
        }

        // Run the frame
        this.traceListing.setFrame(frame);
        this.minibar.update();
        this.traceListing.scrollToCall(0);
    };

    TraceView.prototype.guessActiveFramebuffer = function (callIndex) {
        // Can't trust the current state, so walk the calls to try to find a bindFramebuffer call
        for (var n = this.minibar.lastCallIndex - 1; n >= 0; n--) {
            var call = this.frame.calls[n];
            if (call.info.name == "bindFramebuffer") {
                return call.args[1];
                break;
            }
        }
        return null;
    };

    TraceView.prototype.updateActiveFramebuffer = function () {
        var gl = this.window.controller.output.gl;

        var callIndex = this.minibar.lastCallIndex - 1;
        var framebuffer = this.guessActiveFramebuffer(callIndex);

        if (this.inspector.activeFramebuffers.length) {
            for (var n = 0; n < this.inspector.activeFramebuffers.length; n++) {
                if (this.inspector.activeFramebuffers[n] == framebuffer) {
                    // Found in list at index n
                    if (this.inspector.optionsList.selectedIndex != n) {
                        // Differs - update to current
                        this.inspector.optionsList.selectedIndex = n;
                        this.inspector.activeOption = n;
                        this.inspector.updatePreview();
                    } else {
                        // Same - nothing to do
                        this.inspector.updatePreview();
                    }
                    break;
                }
            }
        }
    };

    TraceView.prototype.stepUntil = function (callIndex) {
        this.minibar.stepUntil(callIndex);
    };

    TraceView.prototype.getScrollState = function () {
        return {
            listing: this.traceListing.getScrollState()
        };
    };

    TraceView.prototype.setScrollState = function (state) {
        if (!state) {
            return;
        }
        this.traceListing.setScrollState(state.listing);
    };

    ui.TraceView = TraceView;
})();
(function () {
    var ui = glinamespace("gli.ui");

    var TraceListing = function (view, w, elementRoot) {
        var self = this;
        this.view = view;
        this.window = w;
        this.elements = {
            list: elementRoot.getElementsByClassName("trace-listing")[0]
        };

        this.calls = [];

        this.activeCall = null;
    };

    TraceListing.prototype.reset = function () {
        this.activeCall = null;
        this.calls.length = 0;

        // Swap out the element for faster clear
        var oldList = this.elements.list;
        var newList = document.createElement("div");
        newList.className = "trace-listing";
        newList.style.cssText = oldList.style.cssText;
        var parentNode = oldList.parentNode;
        parentNode.replaceChild(newList, oldList);
        this.elements.list = newList;
    };

    function addCall(listing, container, frame, call) {
        var document = listing.window.document;
        var gl = listing.window.context;

        // <div class="trace-call">
        //     <div class="trace-call-icon">
        //         &nbsp;
        //     </div>
        //     <div class="trace-call-line">
        //         hello world
        //     </div>
        //     <div class="trace-call-actions">
        //         ??
        //     </div>
        // </div>

        var el = document.createElement("div");
        el.className = "trace-call";

        var icon = document.createElement("div");
        icon.className = "trace-call-icon";
        el.appendChild(icon);

        var ordinal = document.createElement("div");
        ordinal.className = "trace-call-ordinal";
        ordinal.textContent = call.ordinal;
        el.appendChild(ordinal);

        // Actions must go before line for floating to work right
        var info = gli.info.functions[call.name];
        if (info.type == gli.FunctionType.DRAW) {
            var actions = document.createElement("div");
            actions.className = "trace-call-actions";

            var infoAction = document.createElement("div");
            infoAction.className = "trace-call-action trace-call-action-info";
            infoAction.title = "View draw information";
            actions.appendChild(infoAction);
            infoAction.onclick = function (e) {
                gli.ui.PopupWindow.show(listing.window.context, gli.ui.DrawInfo, "drawInfo", function (popup) {
                    popup.inspectDrawCall(frame, call);
                });
                e.preventDefault();
                e.stopPropagation();
            };

            var isolateAction = document.createElement("div");
            isolateAction.className = "trace-call-action trace-call-action-isolate";
            isolateAction.title = "Run draw call isolated";
            actions.appendChild(isolateAction);
            isolateAction.onclick = function (e) {
                listing.window.controller.runIsolatedDraw(frame, call);
                //listing.window.controller.runDepthDraw(frame, call);
                listing.view.minibar.refreshState(true);
                e.preventDefault();
                e.stopPropagation();
            };

            el.appendChild(actions);
        }

        var line = document.createElement("div");
        line.className = "trace-call-line";
        ui.populateCallLine(listing.window, call, line);
        el.appendChild(line);

        if (call.isRedundant) {
            el.className += " trace-call-redundant";
        }
        if (call.error) {
            el.className += " trace-call-error";

            var errorString = gli.info.enumToString(call.error);
            var extraInfo = document.createElement("div");
            extraInfo.className = "trace-call-extra";
            var errorName = document.createElement("span");
            errorName.textContent = errorString;
            extraInfo.appendChild(errorName);
            el.appendChild(extraInfo);

            // If there is a stack, add to tooltip
            if (call.stack) {
                var line0 = call.stack[0];
                extraInfo.title = line0;
            }
        }

        container.appendChild(el);

        var index = listing.calls.length;
        el.onclick = function () {
            listing.view.minibar.stepUntil(index);
        };

        listing.calls.push({
            call: call,
            element: el,
            icon: icon
        });
    };

    TraceListing.prototype.setFrame = function (frame) {
        this.reset();

        var container = document.createDocumentFragment();

        for (var n = 0; n < frame.calls.length; n++) {
            var call = frame.calls[n];
            addCall(this, container, frame, call);
        }

        this.elements.list.appendChild(container);

        this.elements.list.scrollTop = 0;
    };

    TraceListing.prototype.setActiveCall = function (callIndex, ignoreScroll) {
        if (this.activeCall == callIndex) {
            return;
        }

        if (this.activeCall != null) {
            // Clean up previous changes
            var oldel = this.calls[this.activeCall].element;
            oldel.className = oldel.className.replace("trace-call-highlighted", "");
            var oldicon = this.calls[this.activeCall].icon;
            oldicon.className = oldicon.className.replace("trace-call-icon-active", "");
        }

        this.activeCall = callIndex;

        this.calls[callIndex].element.classList.add("trace-call-highlighted");
        this.calls[callIndex].icon.classList.add("trace-call-icon-active");

        if (!ignoreScroll) {
            this.scrollToCall(callIndex);
        }
    };

    TraceListing.prototype.scrollToCall = function (callIndex) {
        var el = this.calls[callIndex].icon;
        scrollIntoViewIfNeeded(el);
    };

    TraceListing.prototype.getScrollState = function () {
        return {
            list: this.elements.list.scrollTop
        };
    };

    TraceListing.prototype.setScrollState = function (state) {
        this.elements.list.scrollTop = state.list;
    };

    ui.TraceListing = TraceListing;

})();
(function () {
    var ui = glinamespace("gli.ui");
    var Tab = ui.Tab;

    var TimelineTab = function (w) {
        var outer = Tab.divClass('window-right-outer');
        var right = Tab.divClass('window-right');

        right.appendChild(Tab.eleClasses('canvas', 'gli-reset', 'timeline-canvas'));
        outer.appendChild(right);
        outer.appendChild(Tab.divClass('window-left'));

        this.el.appendChild(outer);

        this.timelineView = new gli.ui.TimelineView(w, this.el);

        this.lostFocus.addListener(this, function () {
            this.timelineView.suspendUpdating();
        });
        this.gainedFocus.addListener(this, function () {
            this.timelineView.resumeUpdating();
        });
    };

    ui.TimelineTab = TimelineTab;
})();
(function () {
    var ui = glinamespace("gli.ui");

    var TimelineView = function (w, elementRoot) {
        var self = this;
        this.window = w;
        this.elements = {
            view: elementRoot.getElementsByClassName("window-right-outer")[0],
            left: elementRoot.getElementsByClassName("window-left")[0],
            right: elementRoot.getElementsByClassName("window-right")[0]
        };

        var statistics = this.window.context.statistics;

        this.displayCanvas = elementRoot.getElementsByClassName("timeline-canvas")[0];

        function appendKeyRow(keyRoot, counter) {
            var row = document.createElement("div");
            row.className = "timeline-key-row";
            if (counter.enabled) {
                row.className += " timeline-key-row-enabled";
            }

            var colorEl = document.createElement("div");
            colorEl.className = "timeline-key-color";
            colorEl.style.backgroundColor = counter.color;
            row.appendChild(colorEl);

            var nameEl = document.createElement("div");
            nameEl.className = "timeline-key-name";
            nameEl.textContent = counter.description;
            row.appendChild(nameEl);

            keyRoot.appendChild(row);

            row.onclick = function () {
                counter.enabled = !counter.enabled;
                if (!counter.enabled) {
                    row.className = row.className.replace(" timeline-key-row-enabled", "");
                } else {
                    row.className += " timeline-key-row-enabled";
                }

                gli.settings.session.counterToggles[counter.name] = counter.enabled;
                gli.settings.save();
            };
        };

        if (gli.settings.session.enableTimeline) {
            this.displayCanvas.width = 800;
            this.displayCanvas.height = 200;

            this.elements.left.style.overflow = "auto";

            this.canvases = [];
            for (var n = 0; n < 2; n++) {
                var canvas = document.createElement("canvas");
                canvas.className = "gli-reset";
                canvas.width = 800;
                canvas.height = 200;
                this.canvases.push(canvas);
            }
            this.activeCanvasIndex = 0;

            // Load enabled status
            var counterToggles = gli.settings.session.counterToggles;
            if (counterToggles) {
                for (var n = 0; n < statistics.counters.length; n++) {
                    var counter = statistics.counters[n];
                    var toggle = counterToggles[counter.name];
                    if (toggle === true) {
                        counter.enabled = true;
                    } else if (toggle === false) {
                        counter.enabled = false;
                    } else {
                        // Default
                    }
                }
            }

            var keyRoot = document.createElement("div");
            keyRoot.className = "timeline-key";
            for (var n = 0; n < statistics.counters.length; n++) {
                var counter = statistics.counters[n];
                appendKeyRow(keyRoot, counter);
            }
            this.elements.left.appendChild(keyRoot);

            // Install a frame watcher
            this.updating = false;
            var updateCount = 0;
            this.window.context.frameCompleted.addListener(this, function () {
                // TODO: hold updates for a bit? Could affect perf to do this every frame
                updateCount++;
                if (updateCount % 2 == 0) {
                    // Only update every other frame
                    self.appendFrame();
                }
            });
        } else {
            // Hide canvas
            this.displayCanvas.style.display = "none";
        }

        // Show help message
        var enableMessage = document.createElement("a");
        enableMessage.className = "timeline-enable-link";
        if (gli.settings.session.enableTimeline) {
            enableMessage.textContent = "Timeline enabled - click to disable";
        } else {
            enableMessage.textContent = "Timeline disabled - click to enable";
        }
        enableMessage.onclick = function (e) {
            gli.settings.session.enableTimeline = !gli.settings.session.enableTimeline;
            gli.settings.save();
            window.location.reload();
            e.preventDefault();
            e.stopPropagation();
        };
        this.elements.right.insertBefore(enableMessage, this.elements.right.firstChild);
    };

    TimelineView.prototype.suspendUpdating = function () {
        this.updating = false;
    };

    TimelineView.prototype.resumeUpdating = function () {
        this.updating = true;
    };

    TimelineView.prototype.appendFrame = function () {
        var statistics = this.window.context.statistics;

        var canvas = this.canvases[this.activeCanvasIndex];
        this.activeCanvasIndex = (this.activeCanvasIndex + 1) % this.canvases.length;
        var oldCanvas = this.canvases[this.activeCanvasIndex];

        var ctx = canvas.getContext("2d");

        // Draw old
        ctx.drawImage(oldCanvas, -1, 0);

        // Clear newly revealed line
        var x = canvas.width - 1;
        ctx.fillStyle = "rgb(255,255,255)";
        ctx.fillRect(x - 1, 0, 2, canvas.height);

        // Draw counter values
        for (var n = 0; n < statistics.counters.length; n++) {
            var counter = statistics.counters[n];
            if (!counter.enabled) {
                continue;
            }
            var v = Math.round(counter.value);
            var pv = Math.round(counter.previousValue);
            var y = canvas.height - v;
            var py = canvas.height - pv;
            ctx.beginPath();
            ctx.moveTo(x - 1, py + 0.5);
            ctx.lineTo(x, y + 0.5);
            ctx.strokeStyle = counter.color;
            ctx.stroke();
        }

        // Only do the final composite if we have focus
        if (this.updating) {
            var displayCtx = this.displayCanvas.getContext("2d");
            displayCtx.drawImage(canvas, 0, 0);
        }
    };

    TimelineView.prototype.refresh = function () {
        // 
    };

    ui.TimelineView = TimelineView;
})();
(function () {
    var ui = glinamespace("gli.ui");
    var divClass = ui.Tab.divClass;

    var StateTab = function (w) {
        var outer = divClass("window-whole-outer");
        var whole = divClass("window-whole");
        whole.appendChild(divClass("window-whole-inner", "scrolling contents"));
        outer.appendChild(whole);
        this.el.appendChild(outer);

        this.stateView = new gli.ui.StateView(w, this.el);

        this.stateView.setState();

        this.refresh = function () {
            this.stateView.setState();
        };
    };

    ui.StateTab = StateTab;
})();
(function () {
    var ui = glinamespace("gli.ui");

    var StateView = function (w, elementRoot) {
        var self = this;
        this.window = w;
        this.elements = {
            view: elementRoot.getElementsByClassName("window-whole-inner")[0]
        };
    };

    function generateStateDisplay(w, el, state) {
        var gl = w.context;

        var titleDiv = document.createElement("div");
        titleDiv.className = "info-title-master";
        titleDiv.textContent = "State Snapshot";
        el.appendChild(titleDiv);

        var table = document.createElement("table");
        table.className = "info-parameters";

        var stateParameters = gli.info.stateParameters;
        for (var n = 0; n < stateParameters.length; n++) {
            var param = stateParameters[n];
            gli.ui.appendStateParameterRow(w, gl, table, state, param);
        }

        el.appendChild(table);

        titleDiv = document.createElement("div");
        titleDiv.className = "info-title-master";
        titleDiv.textContent = "Canvas Attributes";
        el.appendChild(titleDiv);

        table = document.createElement("table");
        table.className = "info-parameters";
        var attribs = gl.getContextAttributes();
        Object.keys(attribs).forEach(function(key) {
            gli.ui.appendContextAttributeRow(w, gl, table, attribs, key);
        });

        el.appendChild(table);
    };

    StateView.prototype.setState = function () {
        var rawgl = this.window.context.rawgl;
        var state = null;
        switch (this.window.activeVersion) {
            case null:
                state = new gli.host.StateSnapshot(rawgl);
                break;
            case "current":
                state = this.window.controller.getCurrentState();
                break;
        }

        var node = this.elements.view;
        while (node.hasChildNodes()) {
          node.removeChild(node.firstChild);
        }

        if (state) {
            generateStateDisplay(this.window, this.elements.view, state);
        }

        this.elements.view.scrollTop = 0;
    };

    ui.StateView = StateView;
})();
(function () {
    var ui = glinamespace("gli.ui");
    var Tab = ui.Tab;

    var TexturesTab = function (w) {
        var outer = Tab.divClass('window-right-outer');
        var right = Tab.divClass('window-right');
        var inspector = Tab.divClass('window-inspector');
        inspector.classList.add('window-texture-inspector');
        var texture = Tab.divClass('window-texture-outer');

        inspector.appendChild(Tab.divClass('surface-inspector-toolbar', 'toolbar'));
        inspector.appendChild(Tab.divClass('surface-inspector-inner', 'inspector'));
        inspector.appendChild(Tab.inspector());
        texture.appendChild(Tab.divClass('texture-listing', 'call trace'));
        right.appendChild(inspector);
        right.appendChild(texture);
        outer.appendChild(right);
        outer.appendChild(Tab.windowLeft({ listing: 'frame list', toolbar: 'buttons'}));

        this.el.appendChild(outer);

        this.listing = new gli.ui.LeftListing(w, this.el, "texture", function (el, texture) {
            var gl = w.context;

            if (texture.status == gli.host.Resource.DEAD) {
                el.className += " texture-item-deleted";
            }

            switch (texture.type) {
                case gl.TEXTURE_2D:
                    el.className += " texture-item-2d";
                    break;
                case gl.TEXTURE_CUBE_MAP:
                    el.className += " texture-item-cube";
                    break;
            }

            var number = document.createElement("div");
            number.className = "texture-item-number";
            number.textContent = texture.getName();
            el.appendChild(number);

            var row = document.createElement("div");
            row.className = "texture-item-row";

            function updateSize() {
                switch (texture.type) {
                    case gl.TEXTURE_2D:
                        el.className = el.className.replace('-cube', '-2d');
                        break;
                    case gl.TEXTURE_CUBE_MAP:
                        el.className = el.className.replace('-2d', '-cube');
                        break;
                }
                var guessedSize = texture.guessSize(gl);
                if (guessedSize) {
                    row.textContent = guessedSize[0] + " x " + guessedSize[1];
                } else {
                    row.textContent = "? x ?";
                }
            };
            updateSize();

            if (!row.hasChildNodes()) {
                el.appendChild(row);
            }

            texture.modified.addListener(this, function (texture) {
                number.textContent = texture.getName();
                updateSize();
                // TODO: refresh view if selected
            });
            texture.deleted.addListener(this, function (texture) {
                el.className += " texture-item-deleted";
            });
        });

        this.listing.addButton("Browse All").addListener(this, function () {
            gli.ui.PopupWindow.show(w.context, gli.ui.TexturePicker, "texturePicker", function (popup) {
            });
        });

        this.textureView = new gli.ui.TextureView(w, this.el);

        this.listing.valueSelected.addListener(this, function (texture) {
            this.textureView.setTexture(texture);
        });

        var scrollStates = {};
        this.lostFocus.addListener(this, function () {
            scrollStates.listing = this.listing.getScrollState();
        });
        this.gainedFocus.addListener(this, function () {
            this.listing.setScrollState(scrollStates.listing);
        });

        // Append textures already present
        var context = w.context;
        var textures = context.resources.getTextures();
        for (var n = 0; n < textures.length; n++) {
            var texture = textures[n];
            this.listing.appendValue(texture);
        }

        // Listen for changes
        context.resources.resourceRegistered.addListener(this, function (resource) {
            if (glitypename(resource.target) == "WebGLTexture") {
                this.listing.appendValue(resource);
            }
        });

        this.layout = function () {
            this.textureView.layout();
        };

        this.refresh = function () {
            this.textureView.setTexture(this.textureView.currentTexture);
        };
    };

    ui.TexturesTab = TexturesTab;
})();
(function () {
    var ui = glinamespace("gli.ui");

    var TextureView = function (w, elementRoot) {
        var self = this;
        this.window = w;
        this.elements = {
            view: elementRoot.getElementsByClassName("window-right")[0],
            listing: elementRoot.getElementsByClassName("texture-listing")[0]
        };

        this.inspectorElements = {
            "window-texture-outer": elementRoot.getElementsByClassName("window-texture-outer")[0],
            "window-texture-inspector": elementRoot.getElementsByClassName("window-texture-inspector")[0],
            "texture-listing": elementRoot.getElementsByClassName("texture-listing")[0]
        };
        this.inspector = new ui.SurfaceInspector(this, w, elementRoot, {
            splitterKey: 'textureSplitter',
            title: 'Texture Preview',
            selectionName: 'Face',
            selectionValues: ["POSITIVE_X", "NEGATIVE_X", "POSITIVE_Y", "NEGATIVE_Y", "POSITIVE_Z", "NEGATIVE_Z"]
        });
        this.inspector.currentTexture = null;
        this.inspector.currentVersion = null;
        this.inspector.getTargetFace = function (gl) {
            var targetFace;
            switch (this.currentTexture.type) {
                case gl.TEXTURE_2D:
                    targetFace = null;
                    break;
                case gl.TEXTURE_CUBE_MAP:
                    targetFace = gl.TEXTURE_CUBE_MAP_POSITIVE_X + this.activeOption;
                    break;
            }
            return targetFace;
        };
        this.inspector.querySize = function () {
            var gl = this.gl;
            if (!this.currentTexture || !this.currentVersion) {
                return null;
            }
            var targetFace = this.getTargetFace(gl);
            return this.currentTexture.guessSize(gl, this.currentVersion, targetFace);
        };
        this.inspector.setupPreview = function () {
            if (this.previewer) {
                return;
            }
            this.previewer = new ui.TexturePreviewGenerator(this.canvas, false);
            this.gl = this.previewer.gl;
        };
        this.inspector.updatePreview = function () {
            var gl = this.gl;

            var targetFace = this.getTargetFace(gl);
            var size = this.currentTexture.guessSize(gl, this.currentVersion, targetFace);
            var desiredWidth = 1;
            var desiredHeight = 1;
            if (size) {
                desiredWidth = size[0];
                desiredHeight = size[1];
                this.canvas.style.display = "";
            } else {
                this.canvas.style.display = "none";
            }

            this.previewer.draw(this.currentTexture, this.currentVersion, targetFace, desiredWidth, desiredHeight);
        };
        this.inspector.setTexture = function (texture, version) {
            var gl = this.window.context;

            if (texture) {
                this.options.title = "Texture Preview: " + texture.getName();
            } else {
                this.options.title = "Texture Preview: (none)";
            }

            this.currentTexture = texture;
            this.currentVersion = version;
            this.activeOption = 0;
            this.optionsList.selectedIndex = 0;

            if (texture) {
                // Setup UI
                switch (texture.type) {
                    case gl.TEXTURE_2D:
                        this.elements.faces.style.display = "none";
                        break;
                    case gl.TEXTURE_CUBE_MAP:
                        this.elements.faces.style.display = "";
                        break;
                }
                this.updatePreview();
            } else {
                // Clear everything
                this.elements.faces.style.display = "none";
                this.canvas.width = 1;
                this.canvas.height = 1;
                this.canvas.style.display = "none";
            }

            this.reset();
            this.layout();
        };

        this.currentTexture = null;
    };

    TextureView.prototype.setInspectorWidth = function (newWidth) {
        //.window-texture-outer margin-left: -800px !important; /* -2 * window-texture-inspector.width */
        //.window-texture margin-left: 400px !important; /* window-texture-inspector.width */
        //.texture-listing right: 400px; /* window-texture-inspector */
        this.inspectorElements["window-texture-outer"].style.marginLeft = (-2 * newWidth) + "px";
        this.inspectorElements["window-texture-inspector"].style.width = newWidth + "px";
        this.inspectorElements["texture-listing"].style.right = newWidth + "px";
    };

    TextureView.prototype.layout = function () {
        this.inspector.layout();
    };

    function createImageDataFromPixels(gl, pixelStoreState, width, height, format, type, source) {
        var canvas = document.createElement("canvas");
        canvas.className = "gli-reset";
        var ctx = canvas.getContext("2d");
        var imageData = ctx.createImageData(width, height);

        // TODO: support all pixel store state
        //UNPACK_ALIGNMENT
        //UNPACK_COLORSPACE_CONVERSION_WEBGL
        //UNPACK_FLIP_Y_WEBGL
        //UNPACK_PREMULTIPLY_ALPHA_WEBGL
        var unpackAlignment = pixelStoreState["UNPACK_ALIGNMENT"];
        if (unpackAlignment === undefined) {
            unpackAlignment = 4;
        }
        if (pixelStoreState["UNPACK_COLORSPACE_CONVERSION_WEBGL"] !== gl.BROWSER_DEFAULT_WEBGL) {
            console.log("unsupported: UNPACK_COLORSPACE_CONVERSION_WEBGL != BROWSER_DEFAULT_WEBGL");
        }
        if (pixelStoreState["UNPACK_FLIP_Y_WEBGL"]) {
            console.log("unsupported: UNPACK_FLIP_Y_WEBGL = true");
        }
        if (pixelStoreState["UNPACK_PREMULTIPLY_ALPHA_WEBGL"]) {
            console.log("unsupported: UNPACK_PREMULTIPLY_ALPHA_WEBGL = true");
        }

        // TODO: implement all texture formats
        var sn = 0;
        var dn = 0;
        switch (type) {
            case gl.UNSIGNED_BYTE:
                switch (format) {
                    case gl.ALPHA:
                        var strideDiff = width % unpackAlignment;
                        for (var y = 0; y < height; y++) {
                            for (var x = 0; x < width; x++, sn += 1, dn += 4) {
                                imageData.data[dn + 0] = 0;
                                imageData.data[dn + 1] = 0;
                                imageData.data[dn + 2] = 0;
                                imageData.data[dn + 3] = source[sn];
                            }
                            sn += strideDiff;
                        }
                        break;
                    case gl.RGB:
                        var strideDiff = (width * 3) % unpackAlignment;
                        for (var y = 0; y < height; y++) {
                            for (var x = 0; x < width; x++, sn += 3, dn += 4) {
                                imageData.data[dn + 0] = source[sn + 0];
                                imageData.data[dn + 1] = source[sn + 1];
                                imageData.data[dn + 2] = source[sn + 2];
                                imageData.data[dn + 3] = 255;
                            }
                            sn += strideDiff;
                        }
                        break;
                    case gl.RGBA:
                        var strideDiff = (width * 4) % unpackAlignment;
                        for (var y = 0; y < height; y++) {
                            for (var x = 0; x < width; x++, sn += 4, dn += 4) {
                                imageData.data[dn + 0] = source[sn + 0];
                                imageData.data[dn + 1] = source[sn + 1];
                                imageData.data[dn + 2] = source[sn + 2];
                                imageData.data[dn + 3] = source[sn + 3];
                            }
                            sn += strideDiff;
                        }
                        break;
                    default:
                        console.log("unsupported texture format");
                        return null;
                }
                break;
            case gl.UNSIGNED_SHORT_5_6_5:
                if (format == gl.RGB) {
                    var strideDiff = (width * 4) % unpackAlignment, x, y, binval;
                    for (y = 0; y < height; y++) {
                        for (x = 0; x < width; x++, sn++, dn += 4) {
                            binval = source[sn];
                            imageData.data[dn + 0] = binval >> 11;
                            imageData.data[dn + 1] = (binval >> 5) & 63;
                            imageData.data[dn + 2] = binval & 31;
                            imageData.data[dn + 3] = 255;
                        }
                        sn += strideDiff;
                    }
                } else {
                    console.log("unsupported texture format");
                    return null;
                }
                return null;
            case gl.UNSIGNED_SHORT_4_4_4_4:
                if (format == gl.RGBA) {
                    var strideDiff = (width * 4) % unpackAlignment, x, y, binval;
                    for (y = 0; y < height; y++) {
                        for (x = 0; x < width; x++, sn++, dn += 4) {
                            binval = source[sn];
                            imageData.data[dn + 0] = binval >> 12;
                            imageData.data[dn + 1] = (binval >> 8) & 15;
                            imageData.data[dn + 2] = (binval >> 4) & 15;
                            imageData.data[dn + 3] = binval & 15;
                        }
                        sn += strideDiff;
                    }
                } else {
                    console.log("unsupported texture format");
                    return null;
                }
                break;
            case gl.UNSIGNED_SHORT_5_5_5_1:
                if (format == gl.RGBA) {
                    var strideDiff = (width * 4) % unpackAlignment, x, y, binval;
                    for (y = 0; y < height; y++) {
                        for (x = 0; x < width; x++, sn++, dn += 4) {
                            binval = source[sn];
                            imageData.data[dn + 0] = binval >> 11;
                            imageData.data[dn + 1] = (binval >> 6) & 31;
                            imageData.data[dn + 2] = (binval >> 1) & 31;
                            imageData.data[dn + 3] = binval & 1;
                        }
                        sn += strideDiff;
                    }
                } else {
                    console.log("unsupported texture format");
                    return null;
                }
                break;
            case gl.FLOAT:
                switch (format) {
                    case gl.ALPHA:
                        var strideDiff = width % unpackAlignment;
                        for (var y = 0; y < height; y++) {
                            for (var x = 0; x < width; x++, sn += 1, dn += 4) {
                                imageData.data[dn + 0] = 0;
                                imageData.data[dn + 1] = 0;
                                imageData.data[dn + 2] = 0;
                                imageData.data[dn + 3] = Math.floor(source[sn] * 255.0);
                            }
                            sn += strideDiff;
                        }
                        break;
                    case gl.RGB:
                        var strideDiff = (width * 3) % unpackAlignment;
                        for (var y = 0; y < height; y++) {
                            for (var x = 0; x < width; x++, sn += 3, dn += 4) {
                                imageData.data[dn + 0] = Math.floor(source[sn + 0] * 255.0);
                                imageData.data[dn + 1] = Math.floor(source[sn + 1] * 255.0);
                                imageData.data[dn + 2] = Math.floor(source[sn + 2] * 255.0);
                                imageData.data[dn + 3] = 255;
                            }
                            sn += strideDiff;
                        }
                        break;
                    case gl.RGBA:
                        var strideDiff = (width * 4) % unpackAlignment;
                        for (var y = 0; y < height; y++) {
                            for (var x = 0; x < width; x++, sn += 4, dn += 4) {
                                imageData.data[dn + 0] = Math.floor(source[sn + 0] * 255.0);
                                imageData.data[dn + 1] = Math.floor(source[sn + 1] * 255.0);
                                imageData.data[dn + 2] = Math.floor(source[sn + 2] * 255.0);
                                imageData.data[dn + 3] = Math.floor(source[sn + 3] * 255.0);
                            }
                            sn += strideDiff;
                        }
                        break;
                    default:
                        console.log("unsupported texture format");
                        return null;
                }
                break;
            case 0x83F0: // COMPRESSED_RGB_S3TC_DXT1_EXT
                console.log('todo: imagedata from COMPRESSED_RGB_S3TC_DXT1_EXT');
                break;
            case 0x83F1: // COMPRESSED_RGBA_S3TC_DXT1_EXT
                console.log('todo: imagedata from COMPRESSED_RGBA_S3TC_DXT1_EXT');
                break;
            case 0x83F2: // COMPRESSED_RGBA_S3TC_DXT3_EXT
                console.log('todo: imagedata from COMPRESSED_RGBA_S3TC_DXT3_EXT');
                break;
            case 0x83F3: // COMPRESSED_RGBA_S3TC_DXT5_EXT
                console.log('todo: imagedata from COMPRESSED_RGBA_S3TC_DXT5_EXT');
                break;
            default:
                console.log("unsupported texture type");
                return null;
        }

        return imageData;
    };

    function appendHistoryLine(gl, el, texture, version, call) {
        if (call.name == "pixelStorei") {
            // Don't care about these for now - maybe they will be useful in the future
            return;
        }

        gli.ui.appendHistoryLine(gl, el, call);

        if ((call.name == "texImage2D") || (call.name == "texSubImage2D") ||
            (call.name == "compressedTexImage2D") || (call.name == "compressedTexSubImage2D")) {
            // Gather up pixel store state between this call and the previous one
            var pixelStoreState = {};
            for (var i = version.calls.indexOf(call) - 1; i >= 0; i--) {
                var prev = version.calls[i];
                if ((prev.name == "texImage2D") || (prev.name == "texSubImage2D") ||
                    (prev.name == "compressedTexImage2D") || (prev.name == "compressedTexSubImage2D")) {
                    break;
                }
                var pname = gli.info.enumMap[prev.args[0]];
                pixelStoreState[pname] = prev.args[1];
            }

            // TODO: display src of last arg (either data, img, video, etc)
            var sourceArg = null;
            for (var n = 0; n < call.args.length; n++) {
                var arg = call.args[n];
                if (arg) {
                    if ((arg instanceof HTMLCanvasElement) ||
                        (arg instanceof HTMLImageElement) ||
                        (arg instanceof HTMLVideoElement)) {
                        sourceArg = gli.util.clone(arg);
                    } else if (glitypename(arg) == "ImageData") {
                        sourceArg = arg;
                    } else if (arg.length) {
                        // Likely an array of some kind
                        sourceArg = arg;
                    }
                }
            }

            // Fixup arrays by converting to ImageData
            if (sourceArg && sourceArg.length) {
                var width;
                var height;
                var format;
                var type;
                if (call.name == "texImage2D") {
                    width = call.args[3];
                    height = call.args[4];
                    format = call.args[6];
                    type = call.args[7];
                } else if (call.name == "texSubImage2D") {
                    width = call.args[4];
                    height = call.args[5];
                    format = call.args[6];
                    type = call.args[7];
                } else if (call.name == "compressedTexImage2D") {
                    width = call.args[3];
                    height = call.args[4];
                    format = call.args[2];
                    type = format;
                } else if (call.name == "compressedTexSubImage2D") {
                    width = call.args[4];
                    height = call.args[5];
                    format = call.args[6];
                    type = format;
                }
                sourceArg = createImageDataFromPixels(gl, pixelStoreState, width, height, format, type, sourceArg);
            }

            // Fixup ImageData
            if (sourceArg && glitypename(sourceArg) == "ImageData") {
                // Draw into a canvas
                var canvas = document.createElement("canvas");
                canvas.className = "gli-reset";
                canvas.width = sourceArg.width;
                canvas.height = sourceArg.height;
                var ctx = canvas.getContext("2d");
                ctx.putImageData(sourceArg, 0, 0);
                sourceArg = canvas;
            }

            if (sourceArg) {
                var dupeEl = sourceArg;

                // Grab the size before we muck with the element
                var size = [dupeEl.width, dupeEl.height];

                dupeEl.style.width = "100%";
                dupeEl.style.height = "100%";

                if (dupeEl.src) {
                    var srcEl = document.createElement("div");
                    srcEl.className = "texture-history-src";
                    srcEl.textContent = "Source: ";
                    var srcLinkEl = document.createElement("span");
                    srcLinkEl.className = "texture-history-src-link";
                    srcLinkEl.target = "_blank";
                    srcLinkEl.href = dupeEl.src;
                    srcLinkEl.textContent = dupeEl.src;
                    srcEl.appendChild(srcLinkEl);
                    el.appendChild(srcEl);
                }

                var dupeRoot = document.createElement("div");
                dupeRoot.className = "texture-history-dupe";
                dupeRoot.appendChild(dupeEl);
                el.appendChild(dupeRoot);

                // Resize on click logic
                var parentWidth = 512; // TODO: pull from parent?
                var parentHeight = Math.min(size[1], 128);
                var parentar = parentHeight / parentWidth;
                var ar = size[1] / size[0];

                var width;
                var height;
                if (ar * parentWidth < parentHeight) {
                    width = parentWidth;
                    height = (ar * parentWidth);
                } else {
                    height = parentHeight;
                    width = (parentHeight / ar);
                }
                dupeRoot.style.width = width + "px";
                dupeRoot.style.height = height + "px";

                var sizedToFit = true;
                dupeRoot.onclick = function (e) {
                    sizedToFit = !sizedToFit;
                    if (sizedToFit) {
                        dupeRoot.style.width = width + "px";
                        dupeRoot.style.height = height + "px";
                    } else {
                        dupeRoot.style.width = size[0] + "px";
                        dupeRoot.style.height = size[1] + "px";
                    }
                    e.preventDefault();
                    e.stopPropagation();
                };
            }
        }
    };

    function generateTextureHistory(gl, el, texture, version) {
        var titleDiv = document.createElement("div");
        titleDiv.className = "info-title-secondary";
        titleDiv.textContent = "History";
        el.appendChild(titleDiv);

        var rootEl = document.createElement("div");
        rootEl.className = "texture-history";
        el.appendChild(rootEl);

        for (var n = 0; n < version.calls.length; n++) {
            var call = version.calls[n];
            appendHistoryLine(gl, rootEl, texture, version, call);
        }
    };

    function generateTextureDisplay(gl, el, texture, version) {
        var titleDiv = document.createElement("div");
        titleDiv.className = "info-title-master";
        titleDiv.textContent = texture.getName();
        el.appendChild(titleDiv);

        var repeatEnums = ["REPEAT", "CLAMP_TO_EDGE", "MIRROR_REPEAT"];
        var filterEnums = ["NEAREST", "LINEAR", "NEAREST_MIPMAP_NEAREST", "LINEAR_MIPMAP_NEAREST", "NEAREST_MIPMAP_LINEAR", "LINEAR_MIPMAP_LINEAR"];
        gli.ui.appendParameters(gl, el, texture, ["TEXTURE_WRAP_S", "TEXTURE_WRAP_T", "TEXTURE_MIN_FILTER", "TEXTURE_MAG_FILTER"], [repeatEnums, repeatEnums, filterEnums, filterEnums]);
        gli.ui.appendbr(el);

        gli.ui.appendSeparator(el);

        generateTextureHistory(gl, el, texture, version);
        gli.ui.appendbr(el);

        var frame = gl.ui.controller.currentFrame;
        if (frame) {
            gli.ui.appendSeparator(el);
            gli.ui.generateUsageList(gl, el, frame, texture);
            gli.ui.appendbr(el);
        }
    };

    TextureView.prototype.setTexture = function (texture) {
        this.currentTexture = texture;

        var version = null;
        if (texture) {
            switch (this.window.activeVersion) {
                case null:
                    version = texture.currentVersion;
                    break;
                case "current":
                    var frame = this.window.controller.currentFrame;
                    if (frame) {
                        version = frame.findResourceVersion(texture);
                    }
                    version = version || texture.currentVersion; // Fallback to live
                    break;
            }
        }

        var node = this.elements.listing;
        while (node.hasChildNodes()) {
          node.removeChild(node.firstChild);
        }
        if (texture) {
            generateTextureDisplay(this.window.context, this.elements.listing, texture, version);
        }

        this.inspector.setTexture(texture, version);

        this.elements.listing.scrollTop = 0;
    };

    ui.TextureView = TextureView;
})();
(function () {
    var ui = glinamespace("gli.ui");

    var TexturePicker = function (context, name) {
        glisubclass(gli.ui.PopupWindow, this, [context, name, "Texture Browser", 610, 600]);
    };

    TexturePicker.prototype.setup = function () {
        var self = this;
        var context = this.context;
        var doc = this.browserWindow.document;
        var gl = context;

        this.previewer = new gli.ui.TexturePreviewGenerator();
        
        // Append textures already present
        var textures = context.resources.getTextures();
        for (var n = 0; n < textures.length; n++) {
            var texture = textures[n];
            var el = this.previewer.buildItem(this, doc, gl, texture, true, true);
            this.elements.innerDiv.appendChild(el);
        }

        // Listen for changes
        context.resources.resourceRegistered.addListener(this, this.resourceRegistered);
    };
    
    TexturePicker.prototype.dispose = function () {
        this.context.resources.resourceRegistered.removeListener(this);
    };
    
    TexturePicker.prototype.resourceRegistered = function (resource) {
        var doc = this.browserWindow.document;
        var gl = this.context;
        if (glitypename(resource.target) == "WebGLTexture") {
            var el = this.previewer.buildItem(this, doc, gl, resource, true);
            this.elements.innerDiv.appendChild(el);
        }
    };

    ui.TexturePicker = TexturePicker;
})();
(function () {
    var ui = glinamespace("gli.ui");
    var Tab = ui.Tab;

    var BuffersTab = function (w) {
        var outer = Tab.divClass("window-right-outer");
        var right = Tab.divClass("window-right");
        var inspector = Tab.divClass("window-inspector");
        inspector.classList.add("window-buffer-inspector");
        var buffer = Tab.divClass("window-buffer-outer");

        inspector.appendChild(Tab.divClass("surface-inspector-toolbar", "toolbar"));
        inspector.appendChild(Tab.divClass("surface-inspector-inner", "inspector"));
        inspector.appendChild(Tab.divClass("surface-inspector-statusbar"));
        buffer.appendChild(Tab.divClass("buffer-listing", "scrolling contents"));
        right.appendChild(inspector);
        right.appendChild(buffer);
        outer.appendChild(right);
        outer.appendChild(Tab.windowLeft({ listing: "frame list", toolbar: "buttons"}));

        this.el.appendChild(outer);

        this.listing = new gli.ui.LeftListing(w, this.el, "buffer", function (el, buffer) {
            var gl = w.context;

            if (buffer.status == gli.host.Resource.DEAD) {
                el.className += " buffer-item-deleted";
            }

            switch (buffer.type) {
                case gl.ARRAY_BUFFER:
                    el.className += " buffer-item-array";
                    break;
                case gl.ELEMENT_ARRAY_BUFFER:
                    el.className += " buffer-item-element-array";
                    break;
            }

            var number = document.createElement("div");
            number.className = "buffer-item-number";
            number.textContent = buffer.getName();
            el.appendChild(number);

            buffer.modified.addListener(this, function (buffer) {
                // TODO: refresh view if selected
                //console.log("refresh buffer row");

                // Type may have changed - update it
                el.className = el.className.replace(" buffer-item-array", "").replace(" buffer-item-element-array", "");
                switch (buffer.type) {
                    case gl.ARRAY_BUFFER:
                        el.className += " buffer-item-array";
                        break;
                    case gl.ELEMENT_ARRAY_BUFFER:
                        el.className += " buffer-item-element-array";
                        break;
                }
            });
            buffer.deleted.addListener(this, function (buffer) {
                el.className += " buffer-item-deleted";
            });
        });
        this.bufferView = new gli.ui.BufferView(w, this.el);

        this.listing.valueSelected.addListener(this, function (buffer) {
            this.bufferView.setBuffer(buffer);
        });

        var scrollStates = {};
        this.lostFocus.addListener(this, function () {
            scrollStates.listing = this.listing.getScrollState();
        });
        this.gainedFocus.addListener(this, function () {
            this.listing.setScrollState(scrollStates.listing);
        });

        // Append buffers already present
        var context = w.context;
        var buffers = context.resources.getBuffers();
        for (var n = 0; n < buffers.length; n++) {
            var buffer = buffers[n];
            this.listing.appendValue(buffer);
        }

        // Listen for changes
        context.resources.resourceRegistered.addListener(this, function (resource) {
            if (glitypename(resource.target) == "WebGLBuffer") {
                this.listing.appendValue(resource);
            }
        });

        // When we lose focus, reselect the buffer - shouldn't mess with things too much, and also keeps the DOM small if the user had expanded things
        this.lostFocus.addListener(this, function () {
            if (this.listing.previousSelection) {
                this.listing.selectValue(this.listing.previousSelection.value);
            }
        });

        this.layout = function () {
            this.bufferView.layout();
        };

        this.refresh = function () {
            this.bufferView.setBuffer(this.bufferView.currentBuffer);
        };
    };

    ui.BuffersTab = BuffersTab;
})();
(function () {
    var ui = glinamespace("gli.ui");

    function shouldShowPreview(gl, buffer, version) {
        return !!buffer && (buffer.type == gl.ARRAY_BUFFER) && !!version.structure && !!version.lastDrawState;
    }

    var BufferView = function (w, elementRoot) {
        var self = this;
        this.window = w;
        this.elements = {
            view: elementRoot.getElementsByClassName("window-right")[0],
            listing: elementRoot.getElementsByClassName("buffer-listing")[0]
        };

        this.inspectorElements = {
            "window-buffer-outer": elementRoot.getElementsByClassName("window-buffer-outer")[0],
            "window-buffer-inspector": elementRoot.getElementsByClassName("window-buffer-inspector")[0],
            "buffer-listing": elementRoot.getElementsByClassName("buffer-listing")[0]
        };
        this.inspector = new ui.SurfaceInspector(this, w, elementRoot, {
            splitterKey: 'bufferSplitter',
            title: 'Buffer Preview',
            selectionName: null,
            selectionValues: null,
            disableSizing: true,
            transparentCanvas: true,
            autoFit: true
        });
        this.inspector.currentBuffer = null;
        this.inspector.currentVersion = null;
        this.inspector.querySize = function () {
            var gl = this.gl;
            if (!this.currentBuffer || !this.currentVersion) {
                return null;
            }
            return [256, 256]; // ?
        };
        this.inspector.setupPreview = function () {
            var self = this;
            if (this.previewer) {
                return;
            }

            this.previewer = new ui.BufferPreview(this.canvas);
            this.gl = this.previewer.gl;

            this.canvas.width = 256;
            this.canvas.height = 256;

            this.previewer.setupDefaultInput();
        }
        this.inspector.updatePreview = function () {
            var gl = this.gl;

            this.previewer.draw();
        };
        this.inspector.setBuffer = function (buffer, version) {
            var gl = this.gl;

            var showPreview = shouldShowPreview(gl, buffer, version);
            if (showPreview) {
                // Setup UI
                this.canvas.width = 256;
                this.canvas.height = 256;
                this.canvas.style.display = "";
                this.updatePreview();
            } else {
                // Clear everything
                this.canvas.width = 1;
                this.canvas.height = 1;
                this.canvas.style.display = "none";
            }

            if (showPreview) {
                this.options.title = "Buffer Preview: " + buffer.getName();
            } else {
                this.options.title = "Buffer Preview: (none)";
            }

            this.currentBuffer = buffer;
            this.currentVersion = version;
            this.activeOption = 0;
            this.optionsList.selectedIndex = 0;

            this.reset();
            this.layout();

            if (showPreview) {
                this.previewer.setBuffer(buffer.previewOptions);
            }
        };

        this.currentBuffer = null;
    };

    BufferView.prototype.setInspectorWidth = function (newWidth) {
        //.window-buffer-outer margin-left: -800px !important; /* -2 * window-buffer-inspector.width */
        //.window-buffer margin-left: 400px !important; /* window-buffer-inspector.width */
        //.buffer-listing right: 400px; /* window-buffer-inspector */
        this.inspectorElements["window-buffer-outer"].style.marginLeft = (-2 * newWidth) + "px";
        this.inspectorElements["window-buffer-inspector"].style.width = newWidth + "px";
        this.inspectorElements["buffer-listing"].style.right = newWidth + "px";
    };

    BufferView.prototype.layout = function () {
        this.inspector.layout();
    };

    function appendHistoryLine(gl, el, buffer, call) {
        gli.ui.appendHistoryLine(gl, el, call);

        // TODO: other custom stuff?
    }

    function generateBufferHistory(gl, el, buffer, version) {
        var titleDiv = document.createElement("div");
        titleDiv.className = "info-title-secondary";
        titleDiv.textContent = "History";
        el.appendChild(titleDiv);

        var rootEl = document.createElement("div");
        rootEl.className = "buffer-history";
        el.appendChild(rootEl);

        for (var n = 0; n < version.calls.length; n++) {
            var call = version.calls[n];
            appendHistoryLine(gl, rootEl, buffer, call);
        }
    };

    function generateGenericArrayBufferContents(gl, el, buffer, version) {
        var data = buffer.constructVersion(gl, version);

        var table = document.createElement("table");
        table.className = "buffer-data";
        for (var n = 0, len = data.length; n < len; ++n) {
            var tr = document.createElement("tr");
            var tdkey = document.createElement("td");
            tdkey.className = "buffer-data-key";
            tdkey.textContent = n;
            tr.appendChild(tdkey);
            var tdvalue = document.createElement("td");
            tdvalue.className = "buffer-data-value";
            tdvalue.textContent = data[n];
            tr.appendChild(tdvalue);
            table.appendChild(tr);
        }
        el.appendChild(table);
    };

    function generateArrayBufferContents(gl, el, buffer, version) {
        if (!version.structure) {
            generateGenericArrayBufferContents(gl, el, buffer, version);
            return;
        }

        var data = buffer.constructVersion(gl, version);
        var datas = version.structure;
        var stride = datas[0].stride;
        if (stride == 0) {
            // Calculate stride from last byte
            for (var m = 0; m < datas.length; m++) {
                var byteAdvance = 0;
                switch (datas[m].type) {
                    case gl.BYTE:
                    case gl.UNSIGNED_BYTE:
                        byteAdvance = 1 * datas[m].size;
                        break;
                    case gl.SHORT:
                    case gl.UNSIGNED_SHORT:
                        byteAdvance = 2 * datas[m].size;
                        break;
                    default:
                    case gl.FLOAT:
                        byteAdvance = 4 * datas[m].size;
                        break;
                }
                stride = Math.max(stride, datas[m].offset + byteAdvance);
            }
        }

        var table = document.createElement("table");
        table.className = "buffer-data";
        var byteOffset = 0;
        var itemOffset = 0;
        while (byteOffset < data.byteLength) {
            var tr = document.createElement("tr");

            var tdkey = document.createElement("td");
            tdkey.className = "buffer-data-key";
            tdkey.textContent = itemOffset;
            tr.appendChild(tdkey);

            var innerOffset = byteOffset;
            for (var m = 0; m < datas.length; m++) {
                var byteAdvance = 0;
                var readView = null;
                var dataBuffer = data.buffer ? data.buffer : data;
                switch (datas[m].type) {
                    case gl.BYTE:
                        byteAdvance = 1 * datas[m].size;
                        readView = new Int8Array(dataBuffer, innerOffset, datas[m].size);
                        break;
                    case gl.UNSIGNED_BYTE:
                        byteAdvance = 1 * datas[m].size;
                        readView = new Uint8Array(dataBuffer, innerOffset, datas[m].size);
                        break;
                    case gl.SHORT:
                        byteAdvance = 2 * datas[m].size;
                        readView = new Int16Array(dataBuffer, innerOffset, datas[m].size);
                        break;
                    case gl.UNSIGNED_SHORT:
                        byteAdvance = 2 * datas[m].size;
                        readView = new Uint16Array(dataBuffer, innerOffset, datas[m].size);
                        break;
                    default:
                    case gl.FLOAT:
                        byteAdvance = 4 * datas[m].size;
                        readView = new Float32Array(dataBuffer, innerOffset, datas[m].size);
                        break;
                }
                innerOffset += byteAdvance;

                for (var i = 0; i < datas[m].size; i++) {
                    var td = document.createElement("td");
                    td.className = "buffer-data-value";
                    if ((m != datas.length - 1) && (i == datas[m].size - 1)) {
                        td.className += " buffer-data-value-end";
                    }
                    td.textContent = readView[i];
                    tr.appendChild(td);
                }
            }

            byteOffset += stride;
            itemOffset++;
            table.appendChild(tr);
        }
        el.appendChild(table);
    };

    function generateBufferDisplay(view, gl, el, buffer, version) {
        var titleDiv = document.createElement("div");
        titleDiv.className = "info-title-master";
        titleDiv.textContent = buffer.getName();
        switch (buffer.type) {
            case gl.ARRAY_BUFFER:
                titleDiv.textContent += " / ARRAY_BUFFER";
                break;
            case gl.ELEMENT_ARRAY_BUFFER:
                titleDiv.textContent += " / ELEMENT_ARRAY_BUFFER";
                break;
        }
        el.appendChild(titleDiv);

        gli.ui.appendParameters(gl, el, buffer, ["BUFFER_SIZE", "BUFFER_USAGE"], [null, ["STREAM_DRAW", "STATIC_DRAW", "DYNAMIC_DRAW"]]);
        gli.ui.appendbr(el);

        function updatePreviewSettings () {
            var options = buffer.previewOptions;

            // Draw options
            options.mode = gl.POINTS + modeSelect.selectedIndex;
            options.positionIndex = attributeSelect.selectedIndex;
            options.position = version.structure[options.positionIndex];

            // Element array buffer options
            if (elementArraySelect.selectedIndex === 0) {
                // Unindexed
                options.elementArrayBuffer = null;
            } else {
                var option = elementArraySelect.options[elementArraySelect.selectedIndex];
                var elid = parseInt(option.value, 10);
                var elbuffer = gl.resources.getResourceById(elid);
                options.elementArrayBuffer = [elbuffer, elbuffer.currentVersion];
            }
            switch (sizeSelect.selectedIndex) {
                case 0:
                    options.elementArrayType = gl.UNSIGNED_BYTE;
                    break;
                case 1:
                    options.elementArrayType = gl.UNSIGNED_SHORT;
                    break;
            }

            // Range options
            if (options.elementArrayBuffer) {
                options.offset = parseInt(startInput.value, 10);
            } else {
                options.first = parseInt(startInput.value, 10);
            }
            options.count = parseInt(countInput.value, 10);

            try {
                view.inspector.setBuffer(buffer, version);
            } catch (e) {
                view.inspector.setBuffer(null, null);
                console.log("exception while setting buffer preview: " + e);
            }
        };

        var showPreview = shouldShowPreview(gl, buffer, version);
        if (showPreview) {
            gli.ui.appendSeparator(el);

            var previewDiv = document.createElement("div");
            previewDiv.className = "info-title-secondary";
            previewDiv.textContent = "Preview Options";
            el.appendChild(previewDiv);

            var previewContainer = document.createElement("div");

            // Tools for choosing preview options
            var previewOptions = document.createElement("table");
            previewOptions.className = "buffer-preview";

            // Draw settings
            var drawRow = document.createElement("tr");
            {
                var col0 = document.createElement("td");
                var span0 = document.createElement("span");
                span0.textContent = "Mode: ";
                col0.appendChild(span0);
                drawRow.appendChild(col0);
            }
            {
                var col1 = document.createElement("td");
                var modeSelect = document.createElement("select");
                var modeEnums = ["POINTS", "LINE_STRIP", "LINE_LOOP", "LINES", "TRIANGLES", "TRIANGLE_STRIP", "TRIANGLE_FAN"];
                for (var n = 0; n < modeEnums.length; n++) {
                    var option = document.createElement("option");
                    option.textContent = modeEnums[n];
                    modeSelect.appendChild(option);
                }
                modeSelect.onchange = function () {
                    updatePreviewSettings();
                };
                col1.appendChild(modeSelect);
                drawRow.appendChild(col1);
            }
            {
                var col2 = document.createElement("td");
                var span1 = document.createElement("span");
                span1.textContent = "Position Attribute: ";
                col2.appendChild(span1);
                drawRow.appendChild(col2);
            }
            {
                var col3 = document.createElement("td");
                var attributeSelect = document.createElement("select");
                for (var n = 0; n < version.structure.length; n++) {
                    var attrInfo = version.structure[n];
                    var option = document.createElement("option");
                    var typeString;
                    switch (attrInfo.type) {
                        case gl.BYTE:
                            typeString = "BYTE";
                            break;
                        case gl.UNSIGNED_BYTE:
                            typeString = "UNSIGNED_BYTE";
                            break;
                        case gl.SHORT:
                            typeString = "SHORT";
                            break;
                        case gl.UNSIGNED_SHORT:
                            typeString = "UNSIGNED_SHORT";
                            break;
                        default:
                        case gl.FLOAT:
                            typeString = "FLOAT";
                            break;
                    }
                    option.textContent = "+" + attrInfo.offset + " / " + attrInfo.size + " * " + typeString;
                    attributeSelect.appendChild(option);
                }
                attributeSelect.onchange = function () {
                    updatePreviewSettings();
                };
                col3.appendChild(attributeSelect);
                drawRow.appendChild(col3);
            }
            previewOptions.appendChild(drawRow);

            // ELEMENT_ARRAY_BUFFER settings
            var elementArrayRow = document.createElement("tr");
            {
                var col0 = document.createElement("td");
                var span0 = document.createElement("span");
                span0.textContent = "Element Array: ";
                col0.appendChild(span0);
                elementArrayRow.appendChild(col0);
            }
            {
                var col1 = document.createElement("td");
                var elementArraySelect = document.createElement("select");
                var noneOption = document.createElement("option");
                noneOption.textContent = "[unindexed]";
                noneOption.value = null;
                elementArraySelect.appendChild(noneOption);
                var allBuffers = gl.resources.getBuffers();
                for (var n = 0; n < allBuffers.length; n++) {
                    var elBuffer = allBuffers[n];
                    if (elBuffer.type == gl.ELEMENT_ARRAY_BUFFER) {
                        var option = document.createElement("option");
                        option.textContent = elBuffer.getName();
                        option.value = elBuffer.id;
                        elementArraySelect.appendChild(option);
                    }
                }
                elementArraySelect.onchange = function () {
                    updatePreviewSettings();
                };
                col1.appendChild(elementArraySelect);
                elementArrayRow.appendChild(col1);
            }
            {
                var col2 = document.createElement("td");
                var span1 = document.createElement("span");
                span1.textContent = "Element Type: ";
                col2.appendChild(span1);
                elementArrayRow.appendChild(col2);
            }
            {
                var col3 = document.createElement("td");
                var sizeSelect = document.createElement("select");
                var sizeEnums = ["UNSIGNED_BYTE", "UNSIGNED_SHORT"];
                for (var n = 0; n < sizeEnums.length; n++) {
                    var option = document.createElement("option");
                    option.textContent = sizeEnums[n];
                    sizeSelect.appendChild(option);
                }
                sizeSelect.onchange = function () {
                    updatePreviewSettings();
                };
                col3.appendChild(sizeSelect);
                elementArrayRow.appendChild(col3);
            }
            previewOptions.appendChild(elementArrayRow);

            // Range settings
            var rangeRow = document.createElement("tr");
            {
                var col0 = document.createElement("td");
                var span0 = document.createElement("span");
                span0.textContent = "Start: ";
                col0.appendChild(span0);
                rangeRow.appendChild(col0);
            }
            {
                var col1 = document.createElement("td");
                var startInput = document.createElement("input");
                startInput.type = "text";
                startInput.value = "0";
                startInput.onchange = function () {
                    updatePreviewSettings();
                };
                col1.appendChild(startInput);
                rangeRow.appendChild(col1);
            }
            {
                var col2 = document.createElement("td");
                var span1 = document.createElement("span");
                span1.textContent = "Count: ";
                col2.appendChild(span1);
                rangeRow.appendChild(col2);
            }
            {
                var col3 = document.createElement("td");
                var countInput = document.createElement("input");
                countInput.type = "text";
                countInput.value = "0";
                countInput.onchange = function () {
                    updatePreviewSettings();
                };
                col3.appendChild(countInput);
                rangeRow.appendChild(col3);
            }
            previewOptions.appendChild(rangeRow);

            // Set all defaults based on draw state
            {
                var options = buffer.previewOptions;

                // Draw options
                modeSelect.selectedIndex = options.mode - gl.POINTS;
                attributeSelect.selectedIndex = options.positionIndex;

                // Element array buffer options
                if (options.elementArrayBuffer) {
                    // TODO: speed up lookup
                    for (var n = 0; n < elementArraySelect.options.length; n++) {
                        var option = elementArraySelect.options[n];
                        if (option.value == options.elementArrayBuffer[0].id) {
                            elementArraySelect.selectedIndex = n;
                            break;
                        }
                    }
                } else {
                    elementArraySelect.selectedIndex = 0; // unindexed
                }
                switch (options.elementArrayType) {
                    case gl.UNSIGNED_BYTE:
                        sizeSelect.selectedIndex = 0;
                        break;
                    case gl.UNSIGNED_SHORT:
                        sizeSelect.selectedIndex = 1;
                        break;
                }

                // Range options
                if (options.elementArrayBuffer) {
                    startInput.value = options.offset;
                } else {
                    startInput.value = options.first;
                }
                countInput.value = options.count;
            }

            previewContainer.appendChild(previewOptions);

            el.appendChild(previewContainer);
            gli.ui.appendbr(el);

            gli.ui.appendSeparator(el);
        }

        if (version.structure) {
            // TODO: some kind of fancy structure editor/overload?
            var attribs = version.structure;

            var structDiv = document.createElement("div");
            structDiv.className = "info-title-secondary";
            structDiv.textContent = "Structure (from last draw)";
            el.appendChild(structDiv);

            var table = document.createElement("table");
            table.className = "buffer-struct";

            var tr = document.createElement("tr");
            var td = document.createElement("th");
            td.textContent = "offset";
            tr.appendChild(td);
            td = document.createElement("th");
            td.textContent = "size";
            tr.appendChild(td);
            td = document.createElement("th");
            td.textContent = "type";
            tr.appendChild(td);
            td = document.createElement("th");
            td.textContent = "stride";
            tr.appendChild(td);
            td = document.createElement("th");
            td.textContent = "normalized";
            tr.appendChild(td);
            table.appendChild(tr);

            for (var n = 0; n < attribs.length; n++) {
                var attrib = attribs[n];

                var tr = document.createElement("tr");

                td = document.createElement("td");
                td.textContent = attrib.offset;
                tr.appendChild(td);
                td = document.createElement("td");
                td.textContent = attrib.size;
                tr.appendChild(td);
                td = document.createElement("td");
                switch (attrib.type) {
                    case gl.BYTE:
                        td.textContent = "BYTE";
                        break;
                    case gl.UNSIGNED_BYTE:
                        td.textContent = "UNSIGNED_BYTE";
                        break;
                    case gl.SHORT:
                        td.textContent = "SHORT";
                        break;
                    case gl.UNSIGNED_SHORT:
                        td.textContent = "UNSIGNED_SHORT";
                        break;
                    default:
                    case gl.FLOAT:
                        td.textContent = "FLOAT";
                        break;
                }
                tr.appendChild(td);
                td = document.createElement("td");
                td.textContent = attrib.stride;
                tr.appendChild(td);
                td = document.createElement("td");
                td.textContent = attrib.normalized;
                tr.appendChild(td);

                table.appendChild(tr);
            }

            el.appendChild(table);
            gli.ui.appendbr(el);
        }

        gli.ui.appendSeparator(el);

        generateBufferHistory(gl, el, buffer, version);
        gli.ui.appendbr(el);

        var frame = gl.ui.controller.currentFrame;
        if (frame) {
            gli.ui.appendSeparator(el);
            gli.ui.generateUsageList(gl, el, frame, buffer);
            gli.ui.appendbr(el);
        }

        gli.ui.appendSeparator(el);

        var contentsDiv = document.createElement("div");
        contentsDiv.className = "info-title-secondary";
        contentsDiv.textContent = "Contents";
        el.appendChild(contentsDiv);

        var contentsContainer = document.createElement("div");

        function populateContents() {
            while (contentsContainer.hasChildNodes()) {
              contentsContainer.removeChild(contentsContainer.firstChild);
            }
            var frag = document.createDocumentFragment();
            switch (buffer.type) {
                case gl.ARRAY_BUFFER:
                    generateArrayBufferContents(gl, frag, buffer, version);
                    break;
                case gl.ELEMENT_ARRAY_BUFFER:
                    generateGenericArrayBufferContents(gl, frag, buffer, version);
                    break;
            }
            contentsContainer.appendChild(frag);
        };

        if (buffer.parameters[gl.BUFFER_SIZE] > 40000) {
            // Buffer is really big - delay populating
            var expandLink = document.createElement("span");
            expandLink.className = "buffer-data-collapsed";
            expandLink.textContent = "Show buffer contents";
            expandLink.onclick = function () {
                populateContents();
            };
            contentsContainer.appendChild(expandLink);
        } else {
            // Auto-expand
            populateContents();
        }

        el.appendChild(contentsContainer);

        gli.ui.appendbr(el);
    }

    BufferView.prototype.setBuffer = function (buffer) {
        this.currentBuffer = buffer;

        var node = this.elements.listing;
        while (node.hasChildNodes()) {
          node.removeChild(node.firstChild);
        }
        if (buffer) {
            var version;
            switch (this.window.activeVersion) {
                case null:
                    version = buffer.currentVersion;
                    break;
                case "current":
                    var frame = this.window.controller.currentFrame;
                    if (frame) {
                        version = frame.findResourceVersion(buffer);
                    }
                    version = version || buffer.currentVersion; // Fallback to live
                    break;
            }

            // Setup user preview options if not defined
            var lastDrawState = version.lastDrawState;
            if (!buffer.previewOptions && lastDrawState) {
                var elementArrayBufferArray = null;
                if (lastDrawState.elementArrayBuffer) {
                    elementArrayBufferArray = [lastDrawState.elementArrayBuffer, null];
                    // TODO: pick the right version of the ELEMENT_ARRAY_BUFFER
                    elementArrayBufferArray[1] = elementArrayBufferArray[0].currentVersion;
                }

                // TODO: pick the right position attribute
                var positionIndex = 0;
                var positionAttr = version.structure[positionIndex];

                var drawState = {
                    mode: lastDrawState.mode,
                    arrayBuffer: [buffer, version],
                    positionIndex: positionIndex,
                    position: positionAttr,
                    elementArrayBuffer: elementArrayBufferArray,
                    elementArrayType: lastDrawState.elementArrayBufferType,
                    first: lastDrawState.first,
                    offset: lastDrawState.offset,
                    count: lastDrawState.count
                };

                buffer.previewOptions = drawState;
            }

            try {
                this.inspector.setBuffer(buffer, version);
            } catch (e) {
                this.inspector.setBuffer(null, null);
                console.log("exception while setting up buffer preview: " + e);
            }

            generateBufferDisplay(this, this.window.context, this.elements.listing, buffer, version);
        } else {
            this.inspector.setBuffer(null, null);
        }

        this.elements.listing.scrollTop = 0;
    };

    ui.BufferView = BufferView;
})();
(function () {
    var ui = glinamespace("gli.ui");

    var ProgramsTab = function (w) {
        var self = this;
        this.el.appendChild(gl.ui.Tab.genericLeftRightView());

        this.listing = new gli.ui.LeftListing(w, this.el, "program", function (el, program) {
            var gl = w.context;

            if (program.status == gli.host.Resource.DEAD) {
                el.className += " program-item-deleted";
            }

            var number = document.createElement("div");
            number.className = "program-item-number";
            number.textContent = program.getName();
            el.appendChild(number);

            var vsrow = document.createElement("div");
            vsrow.className = "program-item-row";
            el.appendChild(vsrow);
            var fsrow = document.createElement("div");
            fsrow.className = "program-item-row";
            el.appendChild(fsrow);

            function updateShaderReferences() {
                var vs = program.getVertexShader(gl);
                var fs = program.getFragmentShader(gl);
                vsrow.textContent = "VS: " + (vs ? ("Shader " + vs.id) : "[none]");
                fsrow.textContent = "FS: " + (fs ? ("Shader " + fs.id) : "[none]");
            }
            updateShaderReferences();

            program.modified.addListener(this, function (program) {
                updateShaderReferences();
                if (self.programView.currentProgram == program) {
                    self.programView.setProgram(program);
                }
            });
            program.deleted.addListener(this, function (program) {
                el.className += " program-item-deleted";
            });

        });
        this.programView = new gli.ui.ProgramView(w, this.el);

        this.listing.valueSelected.addListener(this, function (program) {
            this.programView.setProgram(program);
        });

        var scrollStates = {};
        this.lostFocus.addListener(this, function () {
            scrollStates.listing = this.listing.getScrollState();
        });
        this.gainedFocus.addListener(this, function () {
            this.listing.setScrollState(scrollStates.listing);
        });

        // Append programs already present
        var context = w.context;
        var programs = context.resources.getPrograms();
        for (var n = 0; n < programs.length; n++) {
            var program = programs[n];
            this.listing.appendValue(program);
        }

        // Listen for changes
        context.resources.resourceRegistered.addListener(this, function (resource) {
            if (glitypename(resource.target) == "WebGLProgram") {
                this.listing.appendValue(resource);
            }
        });

        this.refresh = function () {
            this.programView.setProgram(this.programView.currentProgram);
        };
    };

    ui.ProgramsTab = ProgramsTab;
})();
(function () {
    var ui = glinamespace("gli.ui");

    var ProgramView = function (w, elementRoot) {
        var self = this;
        this.window = w;
        this.elements = {
            view: elementRoot.getElementsByClassName("window-right-inner")[0]
        };

        this.currentProgram = null;
    };

    function prettyPrintSource(el, source, highlightLines) {
        var div = document.createElement("div");
        div.textContent = source;
        el.appendChild(div);

        var firstLine = 1;
        var firstChar = source.search(/./);
        if (firstChar > 0) {
            firstLine += firstChar;
        }

        SyntaxHighlighter.highlight({
            brush: 'glsl',
            'first-line': firstLine,
            highlight: highlightLines,
            toolbar: false
        }, div);
    };

    function generateShaderDisplay(gl, el, shader) {
        var shaderType = (shader.type == gl.VERTEX_SHADER) ? "Vertex" : "Fragment";

        var titleDiv = document.createElement("div");
        titleDiv.className = "info-title-secondary";
        titleDiv.textContent = shaderType + " " + shader.getName();
        el.appendChild(titleDiv);

        gli.ui.appendParameters(gl, el, shader, ["COMPILE_STATUS", "DELETE_STATUS"]);

        var highlightLines = [];
        if (shader.infoLog && shader.infoLog.length > 0) {
            var errorLines = shader.infoLog.match(/^ERROR: [0-9]+:[0-9]+: /gm);
            if (errorLines) {
                for (var n = 0; n < errorLines.length; n++) {
                    // expecting: 'ERROR: 0:LINE: '
                    var errorLine = errorLines[n];
                    errorLine = parseInt(errorLine.match(/ERROR: [0-9]+:([0-9]+): /)[1]);
                    highlightLines.push(errorLine);
                }
            }
        }

        var sourceDiv = document.createElement("div");
        sourceDiv.className = "shader-info-source";
        if (shader.source) {
            prettyPrintSource(sourceDiv, shader.source, highlightLines);
        } else {
            sourceDiv.textContent = "[no source uploaded]";
        }
        el.appendChild(sourceDiv);

        if (shader.infoLog && shader.infoLog.length > 0) {
            var infoDiv = document.createElement("div");
            infoDiv.className = "program-info-log";
            shader.infoLog.split("\n").forEach(function (line) {
              infoDiv.appendChild(document.createTextNode(line));
              infoDiv.appendChild(document.createElement("br"));
            });
            el.appendChild(infoDiv);
            gli.ui.appendbr(el);
        }
    };

    function appendTable(context, gl, el, program, name, tableData, valueCallback) {
        // [ordinal, name, size, type, optional value]
        var table = document.createElement("table");
        table.className = "program-attribs";

        var tr = document.createElement("tr");
        var td = document.createElement("th");
        td.textContent = "idx";
        tr.appendChild(td);
        td = document.createElement("th");
        td.className = "program-attribs-name";
        td.textContent = name + " name";
        tr.appendChild(td);
        td = document.createElement("th");
        td.textContent = "size";
        tr.appendChild(td);
        td = document.createElement("th");
        td.className = "program-attribs-type";
        td.textContent = "type";
        tr.appendChild(td);
        if (valueCallback) {
            td = document.createElement("th");
            td.className = "program-attribs-value";
            td.textContent = "value";
            tr.appendChild(td);
        }
        table.appendChild(tr);

        for (var n = 0; n < tableData.length; n++) {
            var row = tableData[n];

            var tr = document.createElement("tr");
            td = document.createElement("td");
            td.textContent = row[0];
            tr.appendChild(td);
            td = document.createElement("td");
            td.textContent = row[1];
            tr.appendChild(td);
            td = document.createElement("td");
            td.textContent = row[2];
            tr.appendChild(td);
            td = document.createElement("td");
            switch (row[3]) {
                case gl.FLOAT:
                    td.textContent = "FLOAT";
                    break;
                case gl.FLOAT_VEC2:
                    td.textContent = "FLOAT_VEC2";
                    break;
                case gl.FLOAT_VEC3:
                    td.textContent = "FLOAT_VEC3";
                    break;
                case gl.FLOAT_VEC4:
                    td.textContent = "FLOAT_VEC4";
                    break;
                case gl.INT:
                    td.textContent = "INT";
                    break;
                case gl.INT_VEC2:
                    td.textContent = "INT_VEC2";
                    break;
                case gl.INT_VEC3:
                    td.textContent = "INT_VEC3";
                    break;
                case gl.INT_VEC4:
                    td.textContent = "INT_VEC4";
                    break;
                case gl.BOOL:
                    td.textContent = "BOOL";
                    break;
                case gl.BOOL_VEC2:
                    td.textContent = "BOOL_VEC2";
                    break;
                case gl.BOOL_VEC3:
                    td.textContent = "BOOL_VEC3";
                    break;
                case gl.BOOL_VEC4:
                    td.textContent = "BOOL_VEC4";
                    break;
                case gl.FLOAT_MAT2:
                    td.textContent = "FLOAT_MAT2";
                    break;
                case gl.FLOAT_MAT3:
                    td.textContent = "FLOAT_MAT3";
                    break;
                case gl.FLOAT_MAT4:
                    td.textContent = "FLOAT_MAT4";
                    break;
                case gl.SAMPLER_2D:
                    td.textContent = "SAMPLER_2D";
                    break;
                case gl.SAMPLER_CUBE:
                    td.textContent = "SAMPLER_CUBE";
                    break;
            }
            tr.appendChild(td);

            if (valueCallback) {
                td = document.createElement("td");
                valueCallback(n, td);
                tr.appendChild(td);
            }

            table.appendChild(tr);
        }

        el.appendChild(table);
    };

    function appendUniformInfos(gl, el, program, isCurrent) {
        var tableData = [];
        var uniformInfos = program.getUniformInfos(gl, program.target);
        for (var n = 0; n < uniformInfos.length; n++) {
            var uniformInfo = uniformInfos[n];
            tableData.push([uniformInfo.index, uniformInfo.name, uniformInfo.size, uniformInfo.type]);
        }
        appendTable(gl, gl, el, program, "uniform", tableData, null);
    };

    function appendAttributeInfos(gl, el, program) {
        var tableData = [];
        var attribInfos = program.getAttribInfos(gl, program.target);
        for (var n = 0; n < attribInfos.length; n++) {
            var attribInfo = attribInfos[n];
            tableData.push([attribInfo.index, attribInfo.name, attribInfo.size, attribInfo.type]);
        }
        appendTable(gl, gl, el, program, "attribute", tableData, null);
    };

    function generateProgramDisplay(gl, el, program, version, isCurrent) {
        var titleDiv = document.createElement("div");
        titleDiv.className = "info-title-master";
        titleDiv.textContent = program.getName();
        el.appendChild(titleDiv);

        gli.ui.appendParameters(gl, el, program, ["LINK_STATUS", "VALIDATE_STATUS", "DELETE_STATUS", "ACTIVE_UNIFORMS", "ACTIVE_ATTRIBUTES"]);
        gli.ui.appendbr(el);

        if (program.parameters[gl.ACTIVE_UNIFORMS] > 0) {
            appendUniformInfos(gl, el, program, isCurrent);
            gli.ui.appendbr(el);
        }
        if (program.parameters[gl.ACTIVE_ATTRIBUTES] > 0) {
            appendAttributeInfos(gl, el, program);
            gli.ui.appendbr(el);
        }

        if (program.infoLog && program.infoLog.length > 0) {
            var infoDiv = document.createElement("div");
            infoDiv.className = "program-info-log";
            program.infoLog.split("\n").forEach(function (line) {
              infoDiv.appendChild(document.createTextNode(line));
              infoDiv.appendChild(document.createElement("br"));
            });
            el.appendChild(infoDiv);
            gli.ui.appendbr(el);
        }

        var frame = gl.ui.controller.currentFrame;
        if (frame) {
            gli.ui.appendSeparator(el);
            gli.ui.generateUsageList(gl, el, frame, program);
            gli.ui.appendbr(el);
        }

        var vertexShader = program.getVertexShader(gl);
        var fragmentShader = program.getFragmentShader(gl);
        if (vertexShader) {
            var vertexShaderDiv = document.createElement("div");
            gli.ui.appendSeparator(el);
            generateShaderDisplay(gl, el, vertexShader);
        }
        if (fragmentShader) {
            var fragmentShaderDiv = document.createElement("div");
            gli.ui.appendSeparator(el);
            generateShaderDisplay(gl, el, fragmentShader);
        }
    };

    ProgramView.prototype.setProgram = function (program) {
        this.currentProgram = program;

        var node = this.elements.view;
        while (node.hasChildNodes()) {
          node.removeChild(node.firstChild);
        }
        if (program) {

            var version;
            var isCurrent = false;
            switch (this.window.activeVersion) {
                case null:
                    version = program.currentVersion;
                    break;
                case "current":
                    var frame = this.window.controller.currentFrame;
                    if (frame) {
                        version = frame.findResourceVersion(program);
                        isCurrent = true;
                    }
                    version = version || program.currentVersion; // Fallback to live
                    break;
            }

            generateProgramDisplay(this.window.context, this.elements.view, program, version, isCurrent);
        }

        this.elements.view.scrollTop = 0;
    };

    ui.ProgramView = ProgramView;
})();
(function () {
    var ui = glinamespace("gli.ui");

    var ProgramsTab = function (w) {
        var self = this;
        this.el.appendChild(gli.ui.Tab.genericLeftRightView());

        this.listing = new gli.ui.LeftListing(w, this.el, "program", function (el, program) {
            var gl = w.context;

            if (program.status == gli.host.Resource.DEAD) {
                el.className += " program-item-deleted";
            }

            var number = document.createElement("div");
            number.className = "program-item-number";
            number.textContent = program.getName();
            el.appendChild(number);

            var vsrow = document.createElement("div");
            vsrow.className = "program-item-row";
            el.appendChild(vsrow);
            var fsrow = document.createElement("div");
            fsrow.className = "program-item-row";
            el.appendChild(fsrow);

            function updateShaderReferences() {
                var vs = program.getVertexShader(gl);
                var fs = program.getFragmentShader(gl);
                vsrow.textContent = "VS: " + (vs ? ("Shader " + vs.id) : "[none]");
                fsrow.textContent = "FS: " + (fs ? ("Shader " + fs.id) : "[none]");
            }
            updateShaderReferences();

            program.modified.addListener(this, function (program) {
                updateShaderReferences();
                if (self.programView.currentProgram == program) {
                    self.programView.setProgram(program);
                }
            });
            program.deleted.addListener(this, function (program) {
                el.className += " program-item-deleted";
            });

        });
        this.programView = new gli.ui.ProgramView(w, this.el);

        this.listing.valueSelected.addListener(this, function (program) {
            this.programView.setProgram(program);
        });

        var scrollStates = {};
        this.lostFocus.addListener(this, function () {
            scrollStates.listing = this.listing.getScrollState();
        });
        this.gainedFocus.addListener(this, function () {
            this.listing.setScrollState(scrollStates.listing);
        });

        // Append programs already present
        var context = w.context;
        var programs = context.resources.getPrograms();
        for (var n = 0; n < programs.length; n++) {
            var program = programs[n];
            this.listing.appendValue(program);
        }

        // Listen for changes
        context.resources.resourceRegistered.addListener(this, function (resource) {
            if (glitypename(resource.target) == "WebGLProgram") {
                this.listing.appendValue(resource);
            }
        });

        this.refresh = function () {
            this.programView.setProgram(this.programView.currentProgram);
        };
    };

    ui.ProgramsTab = ProgramsTab;
})();
(function () {
    var ui = glinamespace("gli.ui");

    var PerformanceView = function (w, elementRoot) {
        var self = this;
        this.window = w;
        this.elements = {
            view: elementRoot.getElementsByClassName("window-whole-inner")[0]
        };
    };

    ui.PerformanceView = PerformanceView;
})();
(function () {
    var ui = glinamespace("gli.ui");

    function padValue(v, l) {
        v = String(v);
        var n = v.length;
        while (n < l) {
            v = " " + v;
            n++;
        }
        return v;
    };

    var DrawInfo = function (context, name) {
        glisubclass(gli.ui.PopupWindow, this, [context, name, "Draw Info", 863, 600]);
    };

    DrawInfo.prototype.setup = function () {
        var self = this;
        var context = this.context;

        // TODO: toolbar buttons/etc
    };

    DrawInfo.prototype.dispose = function () {
        this.bufferCanvas = null;
        this.bufferCanvasOuter = null;
        if (this.bufferPreviewer) {
            this.bufferPreviewer.dispose();
            this.bufferPreviewer = null;
        }
        if (this.texturePreviewer) {
            this.texturePreviewer.dispose();
            this.texturePreviewer = null;
        }

        this.canvas = null;
        this.gl = null;
    };

    DrawInfo.prototype.demandSetup = function () {
        // This happens around here to work around some Chromium issues with
        // creating WebGL canvases in differing documents

        if (this.gl) {
            return;
        }

        var doc = this.browserWindow.document;

        // TODO: move to shared code
        function prepareCanvas(canvas) {
            var frag = document.createDocumentFragment();
            frag.appendChild(canvas);
            var gl = gli.util.getWebGLContext(canvas);
            return gl;
        };
        this.canvas = document.createElement("canvas");
        this.gl = prepareCanvas(this.canvas);

        this.texturePreviewer = new gli.ui.TexturePreviewGenerator();

        var bufferCanvas = this.bufferCanvas = doc.createElement("canvas");
        bufferCanvas.className = "gli-reset drawinfo-canvas";
        bufferCanvas.width = 256;
        bufferCanvas.height = 256;
        var bufferCanvasOuter = this.bufferCanvasOuter = doc.createElement("div");
        bufferCanvasOuter.style.position = "relative";
        bufferCanvasOuter.appendChild(bufferCanvas);

        this.bufferPreviewer = new gli.ui.BufferPreview(bufferCanvas);
        this.bufferPreviewer.setupDefaultInput();
    };

    DrawInfo.prototype.clear = function () {
        var doc = this.browserWindow.document;
        doc.title = "Draw Info";
        var node = this.elements.innerDiv;
        while (node.hasChildNodes()) {
          node.removeChild(node.firstChild);
        }
    };

    DrawInfo.prototype.addCallInfo = function (frame, call, drawInfo) {
        var self = this;
        var doc = this.browserWindow.document;
        var gl = this.gl;
        var innerDiv = this.elements.innerDiv;

        var panel = this.buildPanel();

        // Call line
        var callLine = doc.createElement("div");
        callLine.className = "drawinfo-call";
        gli.ui.appendCallLine(this.context, callLine, frame, call);
        panel.appendChild(callLine);

        // ELEMENT_ARRAY_BUFFER (if an indexed call)
        if (call.name == "drawElements") {
            var elementArrayLine = doc.createElement("div");
            elementArrayLine.className = "drawinfo-elementarray trace-call-line";
            elementArrayLine.style.paddingLeft = "42px";
            elementArrayLine.textContent = "ELEMENT_ARRAY_BUFFER: "
            gli.ui.appendObjectRef(this.context, elementArrayLine, drawInfo.args.elementArrayBuffer);
            panel.appendChild(elementArrayLine);
            gli.ui.appendClear(panel);
        }

        gli.ui.appendClear(innerDiv);
        gli.ui.appendbr(innerDiv);

        // Guess the position attribute
        var positionIndex = (function guessPositionIndex(attribInfos) {
            // Look for any attributes that sound like a position ('pos'/'position'/etc)
            // and have the right type (vec2/vec3/vec4)
            for (var n = 0; n < drawInfo.attribInfos.length; n++) {
                var attrib = drawInfo.attribInfos[n];
                if (attrib.name.toLowerCase().indexOf("pos") != -1) {
                    switch (attrib.type) {
                    case gl.INT_VEC2:
                    case gl.INT_VEC3:
                    case gl.INT_VEC4:
                    case gl.FLOAT_VEC2:
                    case gl.FLOAT_VEC3:
                    case gl.FLOAT_VEC4:
                        return n;
                    }
                }
            }

            // Look for the first vec3 attribute
            for (var n = 0; n < drawInfo.attribInfos.length; n++) {
                var attrib = drawInfo.attribInfos[n];
                if (attrib.type == gl.FLOAT_VEC3) {
                    return n;
                }
            }

            return -1;
        })(drawInfo.attribInfos);

        // Setup default preview options
        var previewOptions = null;
        if (positionIndex >= 0) {
            var positionBuffer = drawInfo.attribInfos[positionIndex].state.buffer;
            var indexBuffer = drawInfo.args.elementArrayBuffer;
            previewOptions = {
                mode: drawInfo.args.mode,
                arrayBuffer: [positionBuffer, positionBuffer.mirror.version],
                positionIndex: positionIndex,
                position: drawInfo.attribInfos[positionIndex].state,
                elementArrayBuffer: indexBuffer ? [indexBuffer, indexBuffer.mirror.version] : null,
                elementArrayType: drawInfo.args.elementArrayType,
                offset: drawInfo.args.offset,
                first: drawInfo.args.first,
                count: drawInfo.args.count
            };
        }

        // Buffer preview item
        var bufferDiv = doc.createElement("div");
        bufferDiv.className = "drawinfo-canvas-outer";
        bufferDiv.appendChild(this.bufferCanvasOuter);
        innerDiv.appendChild(bufferDiv);
        this.bufferPreviewer.setBuffer(previewOptions);
        this.bufferPreviewer.draw();

        // Frame preview item
        var frameDiv = doc.createElement("div");
        frameDiv.className = "drawinfo-canvas-outer";
        var cc = doc.createElement("canvas");
        cc.className = "gli-reset drawinfo-canvas drawinfo-canvas-trans";
        cc.width = 256;
        cc.height = 256;
        frameDiv.appendChild(cc);
        innerDiv.appendChild(frameDiv);

        // Isolated preview item
        var frameDiv = doc.createElement("div");
        frameDiv.className = "drawinfo-canvas-outer";
        var cc = doc.createElement("canvas");
        cc.className = "gli-reset drawinfo-canvas drawinfo-canvas-trans";
        cc.width = 256;
        cc.height = 256;
        frameDiv.appendChild(cc);
        innerDiv.appendChild(frameDiv);

        gli.ui.appendClear(innerDiv);
        gli.ui.appendbr(innerDiv);

        var optionsDiv = doc.createElement("div");
        optionsDiv.className = "drawinfo-options";

        var attributeSelect = doc.createElement("select");
        var maxAttribNameLength = 0;
        var maxBufferNameLength = 0;
        for (var n = 0; n < drawInfo.attribInfos.length; n++) {
            maxAttribNameLength = Math.max(maxAttribNameLength, drawInfo.attribInfos[n].name.length);
            var buffer = drawInfo.attribInfos[n].state.buffer;
            if (buffer) {
                maxBufferNameLength = Math.max(maxBufferNameLength, buffer.getName().length);
            }
        }
        for (var n = 0; n < drawInfo.attribInfos.length; n++) {
            var attrib = drawInfo.attribInfos[n];
            var option = doc.createElement("option");
            var typeString;
            switch (attrib.state.type) {
                case gl.BYTE:
                    typeString = "BYTE";
                    break;
                case gl.UNSIGNED_BYTE:
                    typeString = "UNSIGNED_BYTE";
                    break;
                case gl.SHORT:
                    typeString = "SHORT";
                    break;
                case gl.UNSIGNED_SHORT:
                    typeString = "UNSIGNED_SHORT";
                    break;
                default:
                case gl.FLOAT:
                    typeString = "FLOAT";
                    break;
            }
            option.textContent = padValue(attrib.name, maxAttribNameLength) + ": ";
            if (attrib.state.buffer) {
                option.textContent += padValue("[" + attrib.state.buffer.getName() + "]", maxBufferNameLength) + " " + padValue("+" + attrib.state.pointer, 4) + " / " + attrib.state.size + " * " + typeString;
            } else {
                option.textContent += gli.util.typedArrayToString(attrib.state.value);
            }
            attributeSelect.appendChild(option);
        }
        attributeSelect.selectedIndex = positionIndex;
        attributeSelect.onchange = function () {
            frame.switchMirrors("drawinfo");
            previewOptions.positionIndex = attributeSelect.selectedIndex;
            previewOptions.position = drawInfo.attribInfos[previewOptions.positionIndex].state;
            var positionBuffer = drawInfo.attribInfos[previewOptions.positionIndex].state.buffer;
            previewOptions.arrayBuffer = [positionBuffer, positionBuffer.mirror.version];
            try {
                self.bufferPreviewer.setBuffer(previewOptions);
            } catch (e) {
                console.log("error trying to preview buffer: " + e);
            }
            self.bufferPreviewer.draw();
            frame.switchMirrors();
        };
        optionsDiv.appendChild(attributeSelect);

        innerDiv.appendChild(optionsDiv);

        gli.ui.appendClear(innerDiv);
        gli.ui.appendbr(innerDiv);
    };

    DrawInfo.prototype.appendTable = function (el, drawInfo, name, tableData, valueCallback) {
        var doc = this.browserWindow.document;
        var gl = this.gl;

        // [ordinal, name, size, type, optional value]
        var table = doc.createElement("table");
        table.className = "program-attribs";

        var tr = doc.createElement("tr");
        var td = doc.createElement("th");
        td.textContent = "idx";
        tr.appendChild(td);
        td = doc.createElement("th");
        td.className = "program-attribs-name";
        td.textContent = name + " name";
        tr.appendChild(td);
        td = doc.createElement("th");
        td.textContent = "size";
        tr.appendChild(td);
        td = doc.createElement("th");
        td.className = "program-attribs-type";
        td.textContent = "type";
        tr.appendChild(td);
        if (valueCallback) {
            td = doc.createElement("th");
            td.className = "program-attribs-value";
            td.textContent = "value";
            tr.appendChild(td);
        }
        table.appendChild(tr);

        for (var n = 0; n < tableData.length; n++) {
            var row = tableData[n];

            var tr = doc.createElement("tr");
            td = doc.createElement("td");
            td.textContent = row[0];
            tr.appendChild(td);
            td = doc.createElement("td");
            td.textContent = row[1];
            tr.appendChild(td);
            td = doc.createElement("td");
            td.textContent = row[2];
            tr.appendChild(td);
            td = doc.createElement("td");
            switch (row[3]) {
                case gl.FLOAT:
                    td.textContent = "FLOAT";
                    break;
                case gl.FLOAT_VEC2:
                    td.textContent = "FLOAT_VEC2";
                    break;
                case gl.FLOAT_VEC3:
                    td.textContent = "FLOAT_VEC3";
                    break;
                case gl.FLOAT_VEC4:
                    td.textContent = "FLOAT_VEC4";
                    break;
                case gl.INT:
                    td.textContent = "INT";
                    break;
                case gl.INT_VEC2:
                    td.textContent = "INT_VEC2";
                    break;
                case gl.INT_VEC3:
                    td.textContent = "INT_VEC3";
                    break;
                case gl.INT_VEC4:
                    td.textContent = "INT_VEC4";
                    break;
                case gl.BOOL:
                    td.textContent = "BOOL";
                    break;
                case gl.BOOL_VEC2:
                    td.textContent = "BOOL_VEC2";
                    break;
                case gl.BOOL_VEC3:
                    td.textContent = "BOOL_VEC3";
                    break;
                case gl.BOOL_VEC4:
                    td.textContent = "BOOL_VEC4";
                    break;
                case gl.FLOAT_MAT2:
                    td.textContent = "FLOAT_MAT2";
                    break;
                case gl.FLOAT_MAT3:
                    td.textContent = "FLOAT_MAT3";
                    break;
                case gl.FLOAT_MAT4:
                    td.textContent = "FLOAT_MAT4";
                    break;
                case gl.SAMPLER_2D:
                    td.textContent = "SAMPLER_2D";
                    break;
                case gl.SAMPLER_CUBE:
                    td.textContent = "SAMPLER_CUBE";
                    break;
            }
            tr.appendChild(td);

            if (valueCallback) {
                td = doc.createElement("td");
                valueCallback(n, td);
                tr.appendChild(td);
            }

            table.appendChild(tr);
        }

        el.appendChild(table);
    };

    DrawInfo.prototype.appendUniformInfos = function (el, drawInfo) {
        var self = this;
        var doc = this.browserWindow.document;
        var gl = this.gl;

        var uniformInfos = drawInfo.uniformInfos;
        var tableData = [];
        for (var n = 0; n < uniformInfos.length; n++) {
            var uniformInfo = uniformInfos[n];
            tableData.push([uniformInfo.index, uniformInfo.name, uniformInfo.size, uniformInfo.type]);
        }
        this.appendTable(el, drawInfo, "uniform", tableData, function (n, el) {
            var uniformInfo = uniformInfos[n];
            if (uniformInfo.textureValue) {
                // Texture value
                var texture = uniformInfo.textureValue;

                var samplerDiv = doc.createElement("div");
                samplerDiv.className = "drawinfo-sampler-value";
                samplerDiv.textContent = "Sampler: " + uniformInfo.value;
                el.appendChild(samplerDiv);
                el.appendChild(document.createTextNode(" "));
                gli.ui.appendObjectRef(self.context, el, uniformInfo.textureValue);

                if (texture) {
                    var item = self.texturePreviewer.buildItem(self, doc, gl, texture, false, false);
                    item.className += " drawinfo-sampler-thumb";
                    el.appendChild(item);
                }
            } else {
                // Normal value
                switch (uniformInfo.type) {
                    case gl.FLOAT_MAT2:
                    case gl.FLOAT_MAT3:
                    case gl.FLOAT_MAT4:
                        gli.ui.appendMatrices(gl, el, uniformInfo.type, uniformInfo.size, uniformInfo.value);
                        break;
                    case gl.FLOAT:
                        el.textContent = " " + gli.ui.padFloat(uniformInfo.value);
                        break;
                    case gl.INT:
                    case gl.BOOL:
                        el.textContent = " " + gli.ui.padInt(uniformInfo.value);
                        break;
                    default:
                        if (uniformInfo.value.hasOwnProperty("length")) {
                            gli.ui.appendArray(el, uniformInfo.value);
                        } else {
                            // TODO: prettier display
                            el.textContent = uniformInfo.value;
                        }
                        break;
                }
            }
        });
    };

    DrawInfo.prototype.appendAttribInfos = function (el, drawInfo) {
        var self = this;
        var doc = this.browserWindow.document;
        var gl = this.gl;

        var attribInfos = drawInfo.attribInfos;
        var tableData = [];
        for (var n = 0; n < attribInfos.length; n++) {
            var attribInfo = attribInfos[n];
            tableData.push([attribInfo.index, attribInfo.name, attribInfo.size, attribInfo.type]);
        }
        this.appendTable(el, drawInfo, "attribute", tableData, function (n, el) {
            var attribInfo = attribInfos[n];
            if (attribInfo.state.buffer) {
                el.textContent = "Buffer: ";
                gli.ui.appendObjectRef(self.context, el, attribInfo.state.buffer);
                var typeString;
                switch (attribInfo.state.type) {
                    case gl.BYTE:
                        typeString = "BYTE";
                        break;
                    case gl.UNSIGNED_BYTE:
                        typeString = "UNSIGNED_BYTE";
                        break;
                    case gl.SHORT:
                        typeString = "SHORT";
                        break;
                    case gl.UNSIGNED_SHORT:
                        typeString = "UNSIGNED_SHORT";
                        break;
                    default:
                    case gl.FLOAT:
                        typeString = "FLOAT";
                        break;
                }
                var specifierSpan = doc.createElement("span");
                specifierSpan.textContent = " " + padValue("+" + attribInfo.state.pointer, 4) + " / " + attribInfo.state.size + " * " + typeString + (attribInfo.state.normalized ? " N" : "");
                el.appendChild(specifierSpan);
            } else {
                el.textContent = "Constant: ";
                // TODO: pretty print
                el.textContent += attribInfo.state.value;
            }
        });
    };

    DrawInfo.prototype.addProgramInfo = function (frame, call, drawInfo) {
        var doc = this.browserWindow.document;
        var gl = this.gl;
        var innerDiv = this.elements.innerDiv;

        var panel = this.buildPanel();

        // Name
        var programLine = doc.createElement("div");
        programLine.className = "drawinfo-program trace-call-line";
        var frag = document.createDocumentFragment();
        var b = document.createElement("b");
        b.textContent = "Program";
        frag.appendChild(b);
        frag.appendChild(document.createTextNode(": "));
        programLine.appendChild(frag);

        gli.ui.appendObjectRef(this.context, programLine, drawInfo.program);
        panel.appendChild(programLine);
        gli.ui.appendClear(panel);
        gli.ui.appendClear(innerDiv);
        gli.ui.appendbr(innerDiv);

        // Uniforms
        this.appendUniformInfos(innerDiv, drawInfo);
        gli.ui.appendbr(innerDiv);

        // Vertex attribs
        this.appendAttribInfos(innerDiv, drawInfo);
        gli.ui.appendbr(innerDiv);
    };

    DrawInfo.prototype.addStateInfo = function (frame, call, drawInfo) {
        var doc = this.browserWindow.document;
        var gl = this.gl;
        var innerDiv = this.elements.innerDiv;

        var panel = this.buildPanel();

        var programLine = doc.createElement("div");
        programLine.className = "drawinfo-program trace-call-line";
        var b = document.createElement("b");
        b.textContent = "State";
        programLine.appendChild(b);

        // TODO: link to state object
        panel.appendChild(programLine);
        gli.ui.appendClear(panel);
        gli.ui.appendClear(innerDiv);

        var vertexState = [
            "CULL_FACE",
            "CULL_FACE_MODE",
            "FRONT_FACE",
            "LINE_WIDTH"
        ];

        var fragmentState = [
            "BLEND",
            "BLEND_EQUATION_RGB",
            "BLEND_EQUATION_ALPHA",
            "BLEND_SRC_RGB",
            "BLEND_SRC_ALPHA",
            "BLEND_DST_RGB",
            "BLEND_DST_ALPHA",
            "BLEND_COLOR"
        ];

        var depthStencilState = [
            "DEPTH_TEST",
            "DEPTH_FUNC",
            "DEPTH_RANGE",
            "POLYGON_OFFSET_FILL",
            "POLYGON_OFFSET_FACTOR",
            "POLYGON_OFFSET_UNITS",
            "STENCIL_TEST",
            "STENCIL_FUNC",
            "STENCIL_REF",
            "STENCIL_VALUE_MASK",
            "STENCIL_FAIL",
            "STENCIL_PASS_DEPTH_FAIL",
            "STENCIL_PASS_DEPTH_PASS",
            "STENCIL_BACK_FUNC",
            "STENCIL_BACK_REF",
            "STENCIL_BACK_VALUE_MASK",
            "STENCIL_BACK_FAIL",
            "STENCIL_BACK_PASS_DEPTH_FAIL",
            "STENCIL_BACK_PASS_DEPTH_PASS"
        ];

        var outputState = [
            "VIEWPORT",
            "SCISSOR_TEST",
            "SCISSOR_BOX",
            "COLOR_WRITEMASK",
            "DEPTH_WRITEMASK",
            "STENCIL_WRITEMASK",
            "FRAMEBUFFER_BINDING"
        // TODO: RTT / renderbuffers/etc
        ];

        function generateStateTable(el, name, state, enumNames) {
            var titleDiv = doc.createElement("div");
            titleDiv.className = "info-title-master";
            titleDiv.textContent = name;
            el.appendChild(titleDiv);

            var table = doc.createElement("table");
            table.className = "info-parameters";

            var stateParameters = gli.info.stateParameters;
            for (var n = 0; n < enumNames.length; n++) {
                var enumName = enumNames[n];
                var param = stateParameters[enumName];
                gli.ui.appendStateParameterRow(this.window, gl, table, state, param);
            }

            el.appendChild(table);
        };

        generateStateTable(innerDiv, "Vertex State", drawInfo.state, vertexState);
        generateStateTable(innerDiv, "Fragment State", drawInfo.state, fragmentState);
        generateStateTable(innerDiv, "Depth/Stencil State", drawInfo.state, depthStencilState);
        generateStateTable(innerDiv, "Output State", drawInfo.state, outputState);
    };

    DrawInfo.prototype.captureDrawInfo = function (frame, call) {
        var gl = this.gl;

        var drawInfo = {
            args: {
                mode: 0,
                elementArrayBuffer: null,
                elementArrayType: 0,
                first: 0,
                offset: 0,
                count: 0
            },
            program: null,
            uniformInfos: [],
            attribInfos: [],
            state: null
        };

        // Args
        switch (call.name) {
            case "drawArrays":
                drawInfo.args.mode = call.args[0];
                drawInfo.args.first = call.args[1];
                drawInfo.args.count = call.args[2];
                break;
            case "drawElements":
                drawInfo.args.mode = call.args[0];
                drawInfo.args.count = call.args[1];
                drawInfo.args.elementArrayType = call.args[2];
                drawInfo.args.offset = call.args[3];
                var glelementArrayBuffer = gl.getParameter(gl.ELEMENT_ARRAY_BUFFER_BINDING);
                drawInfo.args.elementArrayBuffer = glelementArrayBuffer ? glelementArrayBuffer.trackedObject : null;
                break;
        }

        // Program
        var glprogram = gl.getParameter(gl.CURRENT_PROGRAM);
        drawInfo.program = glprogram ? glprogram.trackedObject : null;
        if (glprogram) {
            drawInfo.uniformInfos = drawInfo.program.getUniformInfos(gl, glprogram);
            drawInfo.attribInfos = drawInfo.program.getAttribInfos(gl, glprogram);
        }

        // Capture entire state for blend mode/etc
        drawInfo.state = new gli.host.StateSnapshot(gl);

        return drawInfo;
    };

    DrawInfo.prototype.inspectDrawCall = function (frame, drawCall) {
        var doc = this.browserWindow.document;
        doc.title = "Draw Info: #" + drawCall.ordinal + " " + drawCall.name;

        var innerDiv = this.elements.innerDiv;
        while (innerDiv.hasChildNodes()) {
          innerDiv.removeChild(innerDiv.firstChild);
        }

        this.demandSetup();

        // Prep canvas
        var width = frame.canvasInfo.width;
        var height = frame.canvasInfo.height;
        this.canvas.width = width;
        this.canvas.height = height;
        var gl = this.gl;

        // Prepare canvas
        frame.switchMirrors("drawinfo");
        frame.makeActive(gl, true, {
            ignoreTextureUploads: true
        });

        // Issue all calls (minus the draws we don't care about) and stop at our draw
        for (var n = 0; n < frame.calls.length; n++) {
            var call = frame.calls[n];

            if (call == drawCall) {
                // Call we want
            } else {
                // Skip other draws/etc
                switch (call.name) {
                    case "drawArrays":
                    case "drawElements":
                        continue;
                }
            }

            call.emit(gl);

            if (call == drawCall) {
                break;
            }
        }

        // Capture interesting draw info
        var drawInfo = this.captureDrawInfo(frame, drawCall);

        this.addCallInfo(frame, drawCall, drawInfo);
        this.addProgramInfo(frame, drawCall, drawInfo);
        this.addStateInfo(frame, drawCall, drawInfo);

        gli.ui.appendbr(innerDiv);

        // Restore all resource mirrors
        frame.switchMirrors(null);
    };

    ui.DrawInfo = DrawInfo;
})();
(function () {
    var ui = glinamespace("gli.ui");

    var PixelHistory = function (context, name) {
        glisubclass(gli.ui.PopupWindow, this, [context, name, "Pixel History", 926, 600]);
    };

    PixelHistory.prototype.setup = function () {
        var self = this;
        var context = this.context;
        var doc = this.browserWindow.document;

        var defaultShowDepthDiscarded = gli.settings.session.showDepthDiscarded;
        this.addToolbarToggle("Show Depth Discarded Draws", "Display draws discarded by depth test", defaultShowDepthDiscarded, function (checked) {
            gli.settings.session.showDepthDiscarded = checked;
            gli.settings.save();

            if (self.current) {
                var current = self.current;
                self.inspectPixel(current.frame, current.x, current.y, current.locationString);
            }
        });

        var loadingMessage = this.loadingMessage = doc.createElement("div");
        loadingMessage.className = "pixelhistory-loading";
        loadingMessage.textContent = "Loading... (this may take awhile)";

        // TODO: move to shared code
        function prepareCanvas(canvas) {
            var frag = doc.createDocumentFragment();
            frag.appendChild(canvas);
            var gl = gli.util.getWebGLContext(canvas, context.attributes, null);
            return gl;
        };
        this.canvas1 = doc.createElement("canvas");
        this.canvas2 = doc.createElement("canvas");
        this.gl1 = prepareCanvas(this.canvas1);
        this.gl2 = prepareCanvas(this.canvas2);
    };

    PixelHistory.prototype.dispose = function () {
        if (this.current) {
            var frame = this.current.frame;
            frame.switchMirrors("pixelhistory1");
            frame.cleanup(this.gl1);
            frame.switchMirrors("pixelhistory2");
            frame.cleanup(this.gl2);
            frame.switchMirrors();
        }
        this.current = null;
        this.canvas1 = this.canvas2 = null;
        this.gl1 = this.gl2 = null;
    };

    PixelHistory.prototype.clear = function () {
        this.current = null;

        this.browserWindow.document.title = "Pixel History";

        this.clearPanels();
    };

    PixelHistory.prototype.clearPanels = function () {
        var node = this.elements.innerDiv;
        node.scrollTop = 0;
        while (node.hasChildNodes()) {
          node.removeChild(node.firstChild);
        }
    };

    function addColor(doc, colorsLine, colorMask, name, canvas, subscript) {
        // Label
        // Canvas
        // rgba(r, g, b, a)

        var div = doc.createElement("div");
        div.className = "pixelhistory-color";

        var labelSpan = doc.createElement("span");
        labelSpan.className = "pixelhistory-color-label";
        labelSpan.textContent = name;
        div.appendChild(labelSpan);

        canvas.className = "gli-reset pixelhistory-color-canvas";
        div.appendChild(canvas);

        var rgba = getPixelRGBA(canvas.getContext("2d"));
        if (rgba) {
            var rgbaSpan = doc.createElement("span");
            rgbaSpan.className = "pixelhistory-color-rgba";
            var chanVals = {
                R: Math.floor(rgba[0] * 255),
                G: Math.floor(rgba[1] * 255),
                B: Math.floor(rgba[2] * 255),
                A: Math.floor(rgba[3] * 255),
            };
            Object.keys(chanVals).forEach(function (key, i) {
                var subscripthtml = document.createElement("sub");
                var strike = null;
                subscripthtml.textContent = subscript;
                rgbaSpan.appendChild(document.createTextNode(key));
                rgbaSpan.appendChild(subscripthtml);
                if (colorMask[i]) {
                    rgbaSpan.appendChild(document.createTextNode(": " + chanVals[key]));
                } else {
                    strike = document.createElement("strike");
                    strike.textContent = chanVals[key];
                    rgbaSpan.appendChild(document.createTextNode(": "));
                    rgbaSpan.appendChild(strike);
                }
                rgbaSpan.appendChild(document.createElement('br'));
            });
            div.appendChild(rgbaSpan);
        }

        colorsLine.appendChild(div);
    };

    PixelHistory.prototype.addPanel = function (gl, frame, call) {
        var doc = this.browserWindow.document;

        var panel = this.buildPanel();

        var callLine = doc.createElement("div");
        callLine.className = "pixelhistory-call";
        var callParent = callLine;
        if (call.history.isDepthDiscarded) {
            // If discarded by the depth test, strike out the line
            callParent = document.createElement("strike");
            callLine.appendChild(callParent);
        }
        gli.ui.appendCallLine(this.context, callParent, frame, call);
        panel.appendChild(callLine);

        // Only add color info if not discarded
        if (!call.history.isDepthDiscarded) {
            var colorsLine = doc.createElement("div");
            colorsLine.className = "pixelhistory-colors";
            addColor(doc, colorsLine, call.history.colorMask, "Source", call.history.self, "s");
            addColor(doc, colorsLine, [true, true, true, true], "Dest", call.history.pre, "d");
            addColor(doc, colorsLine, [true, true, true, true], "Result", call.history.post, "r");

            if (call.history.blendEnabled) {
                var letters = ["R", "G", "B", "A"];
                var rgba_pre = getPixelRGBA(call.history.pre.getContext("2d"));
                var rgba_self = getPixelRGBA(call.history.self.getContext("2d"));
                var rgba_post = getPixelRGBA(call.history.post.getContext("2d"));
                var hasPixelValues = rgba_pre && rgba_self && rgba_post;
                var a_pre, a_self, a_post;
                if (hasPixelValues) {
                    a_pre = rgba_pre[3];
                    a_self = rgba_self[3];
                    a_post = rgba_post[3];
                }

                function genBlendString(index) {
                    var letter = letters[index];
                    var blendColor = call.history.blendColor[index];
                    var blendEqu;
                    var blendSrc;
                    var blendDst;
                    switch (index) {
                        case 0:
                        case 1:
                        case 2:
                            blendEqu = call.history.blendEquRGB;
                            blendSrc = call.history.blendSrcRGB;
                            blendDst = call.history.blendDstRGB;
                            break;
                        case 3:
                            blendEqu = call.history.blendEquAlpha;
                            blendSrc = call.history.blendSrcAlpha;
                            blendDst = call.history.blendDstAlpha;
                            break;
                    }

                    var x_pre = rgba_pre ? rgba_pre[index] : undefined;
                    var x_self = rgba_self ? rgba_self[index] : undefined;
                    var x_post = rgba_post ? rgba_post[index] : undefined;
                    function genFactor(factor) {
                        switch (factor) {
                            case gl.ZERO:
                                return ["0", 0];
                            case gl.ONE:
                            default:
                                return ["1", 1];
                            case gl.SRC_COLOR:
                                return [letter + "<sub>s</sub>", x_self];
                            case gl.ONE_MINUS_SRC_COLOR:
                                return ["1 - " + letter + "<sub>s</sub>", 1 - x_self];
                            case gl.DST_COLOR:
                                return [letter + "<sub>d</sub>", x_pre];
                            case gl.ONE_MINUS_DST_COLOR:
                                return ["1 - " + letter + "<sub>d</sub>", 1 - x_pre];
                            case gl.SRC_ALPHA:
                                return ["A<sub>s</sub>", a_self];
                            case gl.ONE_MINUS_SRC_ALPHA:
                                return ["1 - A<sub>s</sub>", 1 - a_self];
                            case gl.DST_ALPHA:
                                return ["A<sub>d</sub>", a_pre];
                            case gl.ONE_MINUS_DST_ALPHA:
                                return ["1 - A<sub>d</sub>", 1 - a_pre];
                            case gl.CONSTANT_COLOR:
                                return [letter + "<sub>c</sub>", blendColor[index]];
                            case gl.ONE_MINUS_CONSTANT_COLOR:
                                return ["1 - " + letter + "<sub>c</sub>", 1 - blendColor[index]];
                            case gl.CONSTANT_ALPHA:
                                return ["A<sub>c</sub>", blendColor[3]];
                            case gl.ONE_MINUS_CONSTANT_ALPHA:
                                return ["1 - A<sub>c</sub>", 1 - blendColor[3]];
                            case gl.SRC_ALPHA_SATURATE:
                                if (index == 3) {
                                    return ["1", 1];
                                } else {
                                    return ["i", Math.min(a_self, 1 - a_pre)];
                                }
                        }
                    };
                    var sfactor = genFactor(blendSrc);
                    var dfactor = genFactor(blendDst);
                    var s = letter + "<sub>s</sub>(" + sfactor[0] + ")";
                    var d = letter + "<sub>d</sub>(" + dfactor[0] + ")";
                    function fixFloat(n) {
                        var s = (Math.round(n * 10000) / 10000).toString();
                        if (s.length === 1) {
                            s += ".0000";
                        }
                        while (s.length < 6) {
                            s += "0";
                        }
                        return s;
                    };
                    var largs = ["s", "d"];
                    var args = [s, d];
                    var equstr = "";
                    switch (blendEqu) {
                        case gl.FUNC_ADD:
                            equstr = "+";
                            break;
                        case gl.FUNC_SUBTRACT:
                            equstr = "-";
                            break;
                        case gl.FUNC_REVERSE_SUBTRACT:
                            equstr = "-";
                            largs = ["d", "s"];
                            args = [d, s];
                            break;
                    }
                    var str = letter + "<sub>r</sub> = " + args[0] + " " + equstr + " " + args[1];
                    var nstr;
                    if (hasPixelValues) {
                        var ns = fixFloat(x_self) + "(" + fixFloat(sfactor[1]) + ")";
                        var nd = fixFloat(x_pre) + "(" + fixFloat(dfactor[1]) + ")";
                        var nargs = [ns, nd];
                        switch (blendEqu) {
                            case gl.FUNC_ADD:
                            case gl.FUNC_SUBTRACT:
                                break;
                            case gl.FUNC_REVERSE_SUBTRACT:
                                nargs = [nd, ns];
                                break;
                        }
                        nstr = fixFloat(x_post) + " = " + nargs[0] + "&nbsp;" + equstr + "&nbsp;" + nargs[1] + "<sub>&nbsp;</sub>"; // last sub for line height fix
                    } else {
                        nstr = "";
                    }
                    return [str, nstr];
                };
                var rs = genBlendString(0);
                var gs = genBlendString(1);
                var bs = genBlendString(2);
                var as = genBlendString(3);
                var blendingLine2 = doc.createElement("div");
                blendingLine2.className = "pixelhistory-blending pixelhistory-blending-equ";
                blendingLine2.appendChild(this.blendingLineFrag(rs[0], gs[0], bs[0], as[0]));
                colorsLine.appendChild(blendingLine2);
                if (hasPixelValues) {
                    var blendingLine1 = doc.createElement("div");
                    blendingLine1.className = "pixelhistory-blending pixelhistory-blending-values";
                    blendingLine1.appendChild(this.blendingLineFrag(rs[1], gs[1], bs[1], as[1]));
                    colorsLine.appendChild(blendingLine1);
                }
            } else {
                var blendingLine = doc.createElement("div");
                blendingLine.className = "pixelhistory-blending";
                blendingLine.textContent = "blending disabled";
                colorsLine.appendChild(blendingLine);
            }

            gli.ui.appendClear(colorsLine);
            panel.appendChild(colorsLine);
        }

        return panel;
    };

    PixelHistory.prototype.blendingLineFrag = function () {
      var frag = document.createDocumentFragment();
      for (var i = 0, len = arguments.length; i < len; ++i) {
        frag.appendChild(this.stringSubTagReplace(arguments[i]));
        frag.appendChild(document.createElement("br"));
      }
      return frag;
    };

    PixelHistory.prototype.stringSubTagReplace = function (str) {
      var frag = document.createDocumentFragment();
      var strs = str.replace(/&nbsp;/g, " ").split("</sub>");
      for (var i = 0, len = strs.length; i < len; ++i) {
        var pair = strs[i].split("<sub>");
        frag.appendChild(document.createTextNode(pair[0]));
        var sub = document.createElement("sub");
        sub.textContent = pair[1];
        frag.appendChild(sub);
      }
      return frag;
    };

    PixelHistory.prototype.addClear = function (gl, frame, call) {
        var panel = this.addPanel(gl, frame, call);

        //
    };

    PixelHistory.prototype.addDraw = function (gl, frame, call) {
        var panel = this.addPanel(gl, frame, call);

        //
    };

    function clearColorBuffer(gl) {
        var oldColorMask = gl.getParameter(gl.COLOR_WRITEMASK);
        var oldColorClearValue = gl.getParameter(gl.COLOR_CLEAR_VALUE);
        gl.colorMask(true, true, true, true);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.colorMask(oldColorMask[0], oldColorMask[1], oldColorMask[2], oldColorMask[3]);
        gl.clearColor(oldColorClearValue[0], oldColorClearValue[1], oldColorClearValue[2], oldColorClearValue[3]);
    };

    function getPixelRGBA(ctx) {
        var imageData = null;
        try {
            imageData = ctx.getImageData(0, 0, 1, 1);
        } catch (e) {
            // Likely a security error due to cross-domain dirty flag set on the canvas
        }
        if (imageData) {
            var r = imageData.data[0] / 255.0;
            var g = imageData.data[1] / 255.0;
            var b = imageData.data[2] / 255.0;
            var a = imageData.data[3] / 255.0;
            return [r, g, b, a];
        } else {
            console.log("unable to read back pixel");
            return null;
        }
    };

    function readbackRGBA(canvas, gl, x, y) {
        // NOTE: this call may fail due to security errors
        var pixel = new Uint8Array(4);
        try {
            gl.readPixels(x, canvas.height - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
            return pixel;
        } catch (e) {
            console.log("unable to read back pixel");
            return null;
        }
    };

    function readbackPixel(canvas, gl, doc, x, y) {
        var readbackCanvas = doc.createElement("canvas");
        readbackCanvas.width = readbackCanvas.height = 1;
        var frag = doc.createDocumentFragment();
        frag.appendChild(readbackCanvas);
        var ctx = readbackCanvas.getContext("2d");

        // First attempt to read the pixel the fast way
        var pixel = readbackRGBA(canvas, gl, x, y);
        if (pixel) {
            // Fast - write to canvas and return
            var imageData = ctx.createImageData(1, 1);
            imageData.data[0] = pixel[0];
            imageData.data[1] = pixel[1];
            imageData.data[2] = pixel[2];
            imageData.data[3] = pixel[3];
            ctx.putImageData(imageData, 0, 0);
        } else {
            // Slow - blit entire canvas
            ctx.clearRect(0, 0, 1, 1);
            ctx.drawImage(canvas, x, y, 1, 1, 0, 0, 1, 1);
        }

        return readbackCanvas;
    };

    function gatherInterestingResources(gl, resourcesUsed) {
        var markResourceUsed = null;
        markResourceUsed = function (resource) {
            if (resourcesUsed.indexOf(resource) == -1) {
                resourcesUsed.push(resource);
            }
            if (resource.getDependentResources) {
                var dependentResources = resource.getDependentResources();
                for (var n = 0; n < dependentResources.length; n++) {
                    markResourceUsed(dependentResources[n]);
                }
            }
        };

        var currentProgram = gl.getParameter(gl.CURRENT_PROGRAM);
        if (currentProgram) {
            markResourceUsed(currentProgram.trackedObject);
        }

        var originalActiveTexture = gl.getParameter(gl.ACTIVE_TEXTURE);
        var maxTextureUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
        for (var n = 0; n < maxTextureUnits; n++) {
            gl.activeTexture(gl.TEXTURE0 + n);
            var tex2d = gl.getParameter(gl.TEXTURE_BINDING_2D);
            if (tex2d) {
                markResourceUsed(tex2d.trackedObject);
            }
            var texCube = gl.getParameter(gl.TEXTURE_BINDING_CUBE_MAP);
            if (texCube) {
                markResourceUsed(texCube.trackedObject);
            }
        }
        gl.activeTexture(originalActiveTexture);

        var indexBuffer = gl.getParameter(gl.ELEMENT_ARRAY_BUFFER_BINDING);
        if (indexBuffer) {
            markResourceUsed(indexBuffer.trackedObject);
        }

        var vertexBuffer = gl.getParameter(gl.ARRAY_BUFFER_BINDING);
        if (vertexBuffer) {
            markResourceUsed(vertexBuffer.trackedObject);
        }
        var maxVertexAttrs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
        for (var n = 0; n < maxVertexAttrs; n++) {
            vertexBuffer = gl.getVertexAttrib(n, gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING);
            if (vertexBuffer) {
                markResourceUsed(vertexBuffer.trackedObject);
            }
        }
    };

    PixelHistory.prototype.beginLoading = function () {
        var doc = this.browserWindow.document;
        doc.body.style.cursor = "wait !important";
        this.elements.innerDiv.appendChild(this.loadingMessage);
    };

    PixelHistory.prototype.endLoading = function () {
        var doc = this.browserWindow.document;
        doc.body.style.cursor = "";
        this.elements.innerDiv.removeChild(this.loadingMessage);
    };

    PixelHistory.prototype.inspectPixel = function (frame, x, y, locationString) {
        var self = this;
        var doc = this.browserWindow.document;
        doc.title = "Pixel History: " + locationString;

        this.current = {
            frame: frame,
            x: x,
            y: y,
            locationString: locationString
        };

        this.clearPanels();
        this.beginLoading();

        gli.host.setTimeout(function () {
            self.inspectPixelCore(frame, x, y);
        }, 20);
    };

    PixelHistory.prototype.inspectPixelCore = function (frame, x, y) {
        var doc = this.browserWindow.document;

        var width = frame.canvasInfo.width;
        var height = frame.canvasInfo.height;

        var canvas1 = this.canvas1;
        var canvas2 = this.canvas2;
        canvas1.width = width; canvas1.height = height;
        canvas2.width = width; canvas2.height = height;
        var gl1 = this.gl1;
        var gl2 = this.gl2;

        // Canvas 1: no texture data, faked fragment shaders - for draw detection
        // Canvas 2: full playback - for color information

        // Prepare canvas 1 and hack all the programs
        var pass1Shader =
            "precision highp float;" +
            "void main() {" +
            "    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);" +
            "}";
        canvas1.width = 1; canvas1.width = width;
        frame.switchMirrors("pixelhistory1");
        frame.makeActive(gl1, false, {
            ignoreTextureUploads: true,
            fragmentShaderOverride: pass1Shader
        });

        // Issue all calls, read-back to detect changes, and mark the relevant calls
        var writeCalls = [];
        var resourcesUsed = [];
        frame.calls.forEach(function (call) {
            var needReadback = false;
            switch (call.name) {
                case "clear":
                    // Only deal with clears that affect the color buffer
                    if (call.args[0] & gl1.COLOR_BUFFER_BIT) {
                        needReadback = true;
                    }
                    break;
                case "drawArrays":
                case "drawElements":
                    needReadback = true;
                    break;
            }
            // If the current framebuffer is not the default one, skip the call
            // TODO: support pixel history on other framebuffers?
            if (gl1.getParameter(gl1.FRAMEBUFFER_BINDING)) {
                needReadback = false;
            }

            if (needReadback) {
                // Clear color buffer only (we need depth buffer to be valid)
                clearColorBuffer(gl1);
            }

            function applyPass1Call() {
                var originalBlendEnable = null;
                var originalColorMask = null;
                var unmungedColorClearValue = null;
                if (needReadback) {
                    // Disable blending during draws
                    originalBlendEnable = gl1.isEnabled(gl1.BLEND);
                    gl1.disable(gl1.BLEND);

                    // Enable all color channels to get fragment output
                    originalColorMask = gl1.getParameter(gl1.COLOR_WRITEMASK);
                    gl1.colorMask(true, true, true, true);

                    // Clear calls get munged so that we make sure we can see their effects
                    if (call.name == "clear") {
                        unmungedColorClearValue = gl1.getParameter(gl1.COLOR_CLEAR_VALUE);
                        gl1.clearColor(1, 1, 1, 1);
                    }
                }

                // Issue call
                call.emit(gl1);

                if (needReadback) {
                    // Restore blend mode
                    if (originalBlendEnable != null) {
                        if (originalBlendEnable) {
                            gl1.enable(gl1.BLEND);
                        } else {
                            gl1.disable(gl1.BLEND);
                        }
                    }

                    // Restore color mask
                    if (originalColorMask) {
                        gl1.colorMask(originalColorMask[0], originalColorMask[1], originalColorMask[2], originalColorMask[3]);
                    }

                    // Restore clear color
                    if (unmungedColorClearValue) {
                        gl1.clearColor(unmungedColorClearValue[0], unmungedColorClearValue[1], unmungedColorClearValue[2], unmungedColorClearValue[3]);
                    }
                }
            };
            applyPass1Call();

            var isWrite = false;
            function checkForPass1Write(isDepthDiscarded) {
                var rgba = readbackRGBA(canvas1, gl1, x, y);
                if (rgba && (rgba[0])) {
                    // Call had an effect!
                    isWrite = true;
                    call.history = {};
                    call.history.isDepthDiscarded = isDepthDiscarded;
                    call.history.colorMask = gl1.getParameter(gl1.COLOR_WRITEMASK);
                    call.history.blendEnabled = gl1.isEnabled(gl1.BLEND);
                    call.history.blendEquRGB = gl1.getParameter(gl1.BLEND_EQUATION_RGB);
                    call.history.blendEquAlpha = gl1.getParameter(gl1.BLEND_EQUATION_ALPHA);
                    call.history.blendSrcRGB = gl1.getParameter(gl1.BLEND_SRC_RGB);
                    call.history.blendSrcAlpha = gl1.getParameter(gl1.BLEND_SRC_ALPHA);
                    call.history.blendDstRGB = gl1.getParameter(gl1.BLEND_DST_RGB);
                    call.history.blendDstAlpha = gl1.getParameter(gl1.BLEND_DST_ALPHA);
                    call.history.blendColor = gl1.getParameter(gl1.BLEND_COLOR);
                    writeCalls.push(call);

                    // Stash off a bunch of useful resources
                    gatherInterestingResources(gl1, resourcesUsed);
                }
            };
            if (needReadback) {
                checkForPass1Write(false);
            }

            if (needReadback) {
                // If we are looking for depth discarded pixels and we were not picked up as a write, try again
                // NOTE: we only need to do this if depth testing is enabled!
                var isDepthTestEnabled = gl1.isEnabled(gl1.DEPTH_TEST);
                var isDraw = false;
                switch (call.name) {
                    case "drawArrays":
                    case "drawElements":
                        isDraw = true;
                        break;
                }
                if (isDraw && isDepthTestEnabled && !isWrite && gli.settings.session.showDepthDiscarded) {
                    // Reset depth test settings
                    var originalDepthTest = gl1.isEnabled(gl1.DEPTH_TEST);
                    var originalDepthMask = gl1.getParameter(gl1.DEPTH_WRITEMASK);
                    gl1.disable(gl1.DEPTH_TEST);
                    gl1.depthMask(false);

                    // Call again
                    applyPass1Call();

                    // Restore depth test settings
                    if (originalDepthTest) {
                        gl1.enable(gl1.DEPTH_TEST);
                    } else {
                        gl1.disable(gl1.DEPTH_TEST);
                    }
                    gl1.depthMask(originalDepthMask);

                    // Check for write
                    checkForPass1Write(true);
                }
            }
        });

        // TODO: cleanup canvas 1 resources?

        // Find resources that were not used so we can exclude them
        var exclusions = [];
        // TODO: better search
        for (var n = 0; n < frame.resourcesUsed.length; n++) {
            var resource = frame.resourcesUsed[n];
            var typename = glitypename(resource.target);
            switch (typename) {
                case "WebGLTexture":
                case "WebGLProgram":
                case "WebGLShader":
                case "WebGLBuffer":
                    if (resourcesUsed.indexOf(resource) == -1) {
                        // Not used - exclude
                        exclusions.push(resource);
                    }
                    break;
            }
        }

        // Prepare canvas 2 for pulling out individual contribution
        canvas2.width = 1; canvas2.width = width;
        frame.switchMirrors("pixelhistory2");
        frame.makeActive(gl2, false, null, exclusions);

        for (var n = 0; n < frame.calls.length; n++) {
            var call = frame.calls[n];
            var isWrite = writeCalls.indexOf(call) >= 0;

            // Ignore things that don't affect this pixel
            var ignore = false;
            if (!isWrite) {
                switch (call.name) {
                    case "drawArrays":
                    case "drawElements":
                        ignore = true;
                        break;
                }
            }
            if (ignore) {
                continue;
            }

            var originalBlendEnable = null;
            var originalColorMask = null;
            if (isWrite) {
                // Clear color buffer only (we need depth buffer to be valid)
                clearColorBuffer(gl2);

                // Disable blending during draws
                originalBlendEnable = gl2.isEnabled(gl2.BLEND);
                gl2.disable(gl2.BLEND);

                // Enable all color channels to get fragment output
                originalColorMask = gl2.getParameter(gl2.COLOR_WRITEMASK);
                gl2.colorMask(true, true, true, true);
            }

            call.emit(gl2);

            if (isWrite) {
                // Restore blend mode
                if (originalBlendEnable != null) {
                    if (originalBlendEnable) {
                        gl2.enable(gl2.BLEND);
                    } else {
                        gl2.disable(gl2.BLEND);
                    }
                }

                // Restore color mask
                if (originalColorMask) {
                    gl2.colorMask(originalColorMask[0], originalColorMask[1], originalColorMask[2], originalColorMask[3]);
                }
            }

            if (isWrite) {
                // Read back the written fragment color
                call.history.self = readbackPixel(canvas2, gl2, doc, x, y);
            }
        }

        // Prepare canvas 2 for pulling out blending before/after
        canvas2.width = 1; canvas2.width = width;
        frame.makeActive(gl2, false, null, exclusions);

        for (var n = 0; n < frame.calls.length; n++) {
            var call = frame.calls[n];
            var isWrite = writeCalls.indexOf(call) >= 0;

            // Ignore things that don't affect this pixel
            var ignore = false;
            if (!isWrite) {
                switch (call.name) {
                    case "drawArrays":
                    case "drawElements":
                        ignore = true;
                        break;
                }
            }
            if (ignore) {
                continue;
            }

            if (isWrite) {
                // Read prior color
                call.history.pre = readbackPixel(canvas2, gl2, doc, x, y);
            }

            call.emit(gl2);

            if (isWrite) {
                // Read new color
                call.history.post = readbackPixel(canvas2, gl2, doc, x, y);
            }

            if (isWrite) {
                switch (call.name) {
                    case "clear":
                        this.addClear(gl2, frame, call);
                        break;
                    case "drawArrays":
                    case "drawElements":
                        this.addDraw(gl2, frame, call);
                        break;
                }
            }
        }

        // TODO: cleanup canvas 2 resources?

        // Restore all resource mirrors
        frame.switchMirrors(null);

        this.endLoading();
    };

    ui.PixelHistory = PixelHistory;
})();
