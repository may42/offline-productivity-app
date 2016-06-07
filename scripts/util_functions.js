;(function(global, $){
    "use strict";

    global.utilFunctions = {
        incDate: incDate,
        stretchPaper: stretchPaper,
        giveMothLengths: giveMothLengths,
        copyTextToClipboard: copyTextToClipboard,
        giveTrimmedArraySegment: giveTrimmedArraySegment
    };
    return global.utilFunctions;

    function incDate(d, n) {
        if (n === undefined) n = 1;
        d.setDate(d.getDate() + n);
        return d;
    }

    function stretchPaper(paper, w, h) {
        if (paper.width > w) w = paper.width;
        if (paper.height > h) h = paper.height;
        paper.setSize(w, h);
    }

    function giveMothLengths(year) {
        // nDays = month === 1 ? 28 + leap : 31 - month % 7 & 1;
        var months = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        if (!(year % 4) && year % 100 || !(year % 400)) months[1]++;
        return months;
    }

    function copyTextToClipboard(text) {
        // must be initiated by a user action
        var t = $("<textarea>", {style:"position:fixed; left:-30px; width:10px; height:10px;"});
        var success = false;
        t.val(text).prependTo('body').select();
        try { success = document.execCommand('copy'); }
        finally { t.remove(); }
        if (success) return "successfully copied to the clipboard: " + text;
        else throw new Error("can't copy! check if function call is initiated by a user action");
    }

    function giveTrimmedArraySegment(arr) {
        // returns starting end ending indices of array fragment, without leading and trailing null/undefined elements
        // for example: [null,1,null,2,undefined,null] -> [1,4]
        var elem, i = -1, j = arr.length;
        do elem = arr[++i];
        while (elem == null && i < j); // null or undefined
        if (i === j) return [0, 0]; // the only case when segment[0] === segment[1]
        do elem = arr[--j];
        while (elem == null && j > -1);
        if (j < 0 || j < i) throw new Error("contradiction");
        return [i, j + 1];
    }

})(window, window.jQuery);
