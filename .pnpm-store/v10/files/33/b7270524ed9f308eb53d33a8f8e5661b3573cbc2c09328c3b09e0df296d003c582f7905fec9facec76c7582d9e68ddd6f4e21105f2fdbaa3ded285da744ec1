import 'module';
/*#__PURE__*/ import.meta.url;
var UNKNOWN_FUNCTION = '<unknown>';
function parse(stackString) {
    var lines = stackString.split('\n');
    return lines.reduce(function(stack, line) {
        var parseResult = parseChrome(line) || parseWinjs(line) || parseGecko(line) || parseNode(line) || parseJSC(line);
        if (parseResult) stack.push(parseResult);
        return stack;
    }, []);
}
var chromeRe = /^\s*at (.*?) ?\(((?:file|https?|blob|chrome-extension|native|eval|webpack|rsc|<anonymous>|\/|[a-z]:\\|\\\\).*?)(?::(\d+))?(?::(\d+))?\)?\s*$/i;
var chromeEvalRe = /\((\S*)(?::(\d+))(?::(\d+))\)/;
function parseChrome(line) {
    var parts = chromeRe.exec(line);
    if (!parts) return null;
    var isNative = parts[2] && 0 === parts[2].indexOf('native');
    var isEval = parts[2] && 0 === parts[2].indexOf('eval');
    var submatch = chromeEvalRe.exec(parts[2]);
    if (isEval && null != submatch) {
        parts[2] = submatch[1];
        parts[3] = submatch[2];
        parts[4] = submatch[3];
    }
    return {
        file: isNative ? null : parts[2],
        methodName: parts[1] || UNKNOWN_FUNCTION,
        arguments: isNative ? [
            parts[2]
        ] : [],
        lineNumber: parts[3] ? +parts[3] : null,
        column: parts[4] ? +parts[4] : null
    };
}
var winjsRe = /^\s*at (?:((?:\[object object\])?.+) )?\(?((?:file|ms-appx|https?|webpack|rsc|blob):.*?):(\d+)(?::(\d+))?\)?\s*$/i;
function parseWinjs(line) {
    var parts = winjsRe.exec(line);
    if (!parts) return null;
    return {
        file: parts[2],
        methodName: parts[1] || UNKNOWN_FUNCTION,
        arguments: [],
        lineNumber: +parts[3],
        column: parts[4] ? +parts[4] : null
    };
}
var geckoRe = /^\s*(.*?)(?:\((.*?)\))?(?:^|@)((?:file|https?|blob|chrome|webpack|rsc|resource|\[native).*?|[^@]*bundle)(?::(\d+))?(?::(\d+))?\s*$/i;
var geckoEvalRe = /(\S+) line (\d+)(?: > eval line \d+)* > eval/i;
function parseGecko(line) {
    var parts = geckoRe.exec(line);
    if (!parts) return null;
    var isEval = parts[3] && parts[3].indexOf(' > eval') > -1;
    var submatch = geckoEvalRe.exec(parts[3]);
    if (isEval && null != submatch) {
        parts[3] = submatch[1];
        parts[4] = submatch[2];
        parts[5] = null;
    }
    return {
        file: parts[3],
        methodName: parts[1] || UNKNOWN_FUNCTION,
        arguments: parts[2] ? parts[2].split(',') : [],
        lineNumber: parts[4] ? +parts[4] : null,
        column: parts[5] ? +parts[5] : null
    };
}
var javaScriptCoreRe = /^\s*(?:([^@]*)(?:\((.*?)\))?@)?(\S.*?):(\d+)(?::(\d+))?\s*$/i;
function parseJSC(line) {
    var parts = javaScriptCoreRe.exec(line);
    if (!parts) return null;
    return {
        file: parts[3],
        methodName: parts[1] || UNKNOWN_FUNCTION,
        arguments: [],
        lineNumber: +parts[4],
        column: parts[5] ? +parts[5] : null
    };
}
var nodeRe = /^\s*at (?:((?:\[object object\])?[^\\/]+(?: \[as \S+\])?) )?\(?(.*?):(\d+)(?::(\d+))?\)?\s*$/i;
function parseNode(line) {
    var parts = nodeRe.exec(line);
    if (!parts) return null;
    return {
        file: parts[2],
        methodName: parts[1] || UNKNOWN_FUNCTION,
        arguments: [],
        lineNumber: +parts[3],
        column: parts[4] ? +parts[4] : null
    };
}
export { parse };
