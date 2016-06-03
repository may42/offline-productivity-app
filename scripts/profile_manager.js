;(function(global, $, ls){
    "use strict";

    var prefix = "opa_profile_";
    var example_profile = {
        name: "example_profile",
        firstDate: "2016.05.28",
        daySeparationTime: "4:00",
        dataArr: [0,20, 0,1,2,3,4,5,6, 7,8,9,10,11,12,13, 14,15,16,17,18,19,20, 0,null,1,null,2,null,3 ]
    };

    var ProfileManager = function(profileSelect) {
        var self = this;
        if (!ls) throw new Error("local storage is not supported in this browser");
        if (!(profileSelect instanceof $) || profileSelect.length !== 1 || !profileSelect.is("select"))
            throw new SyntaxError('profileSelect must be a jQuery object pointed on a single "select" html element');
        var profileArr = loadData();
        if (!profileArr.length) {
            console.log("no data is recorded in the local storage yet, loading example profile");
            writeData(example_profile);
            profileArr.push(example_profile);
        }
        for (var i = 0; i < profileArr.length; i++) {
            var profileName = profileArr[i].name;
            profileSelect.append($("<option>").val(profileName).text(profileName));
        }
        profileSelect.change(function() {
            var selectedName = profileSelect.val();
            for (var i = 0; i < profileArr.length; i++)
                if (profileArr[i].name === selectedName) {
                    self.currentProfile = profileArr[i];
                    self.profileSwitchCallback();
                    return;
                }
            // if non of the known profiles has name selectedName - error is passed into the profileSwitchCallback:
            self.profileSwitchCallback(new ReferenceError('unknown profile name "' + selectedName + '"'));
        });
        // todo: save currently selected profile name in the local storage and load it as a currentProfile
        self.profileArr = profileArr;
        self.currentProfile = profileArr[0];
        self.profileSwitchCallback = function(err){}; // function that will be called when profile is switched
    };

    // helper functions:
    //ProfileManager.loadData = loadData;
    //ProfileManager.writeData = writeData;
    ProfileManager.parseData = parseData;
    ProfileManager.stringifyData = stringifyData;
    global.ProfileManager = ProfileManager;
    return ProfileManager;

    function loadData() {
        // returns array of all profiles, saved in the localStorage
        var result = [];
        for (var key in ls) {
            // invalid keys are silently ignored
            if (!ls.hasOwnProperty(key)) continue;
            var prefixPart = key.slice(0, prefix.length);
            var name = key.slice(prefix.length);
            if (prefixPart !== prefix || !name || name !== name.trim()) continue;
            // all data with errors will be skipped without throwing error outside
            try { result.push(parseData(ls[key], name)); }
            catch(err) { console.error(name + " profile data contains errors. " + err.message + "\n" + ls[key]); }
        }
        return result;
    }

    function writeData(data) {
        // writes given profile data to the localStorage
        // data must be a single valid profile data object, or an array of valid data objects
        if (Array.isArray(data)) {
            for (var i in data)
                if (data.hasOwnProperty(i))
                    ls[prefix + data[i].name.trim()] = stringifyData(data[i]);
        } else ls[prefix + data.name.trim()] = stringifyData(data);
    }

    function checkAndNormalizeData(data, expectedName) {
        // expectedName is optional
        var res = {};

        if (!data || typeof data !== "object")
            throw new SyntaxError("data must be an object with key-value pairs");

        // if expectedName is provided - data.name must be equal to it
        if (typeof data.name !== "string" || !data.name.trim())
            throw new SyntaxError("data.name must be a non-whitespace string");
        res.name = data.name.trim();
        if (typeof expectedName === "string" && res.name !== expectedName)
            throw new SyntaxError('expected data.name to be "' + expectedName + '", instead got "' + res.name + '"');

        // daySeparationMs is a millisecond integer for internal purposes, and is not parsed by stringifyData function
        var daySeparationRequirements = 'data.daySeparationTime must be a timestring of form "hh:mm"';
        if (data.daySeparationTime === undefined) res.daySeparationMs = 0;
        else if (typeof data.daySeparationTime === "string") {
            res.daySeparationTime = data.daySeparationTime = data.daySeparationTime.trim();
            var match = data.daySeparationTime.match(/^(\d\d?):(\d\d)$/);
            if (!match || +match[1] > 23 || +match[2] > 59) throw new SyntaxError(daySeparationRequirements);
            res.daySeparationMs = (+match[1] * 60 + +match[2]) * 60 * 1000;
        } else throw new SyntaxError(daySeparationRequirements);

        var dataArrRequirements = "data.dataArr must be an array, containing positive integers or null-values";
        if (!Array.isArray(data.dataArr)) throw new SyntaxError(dataArrRequirements);
        var seg = giveTrimmedArraySegment(data.dataArr);
        res.dataArr = data.dataArr.slice(seg[0], seg[1]).map(function(x) {
            if (x == null) return null; // null or undefined
            if (typeof x === "string" && x.trim()) x = +x;
            if (typeof x !== "number" || !isFinite(x) || isNaN(x)) throw new SyntaxError(dataArrRequirements);
            return x; // float, negative and to big values will silently pass
        });

        // firstDateObj is a Date object for internal purposes, and is not parsed by stringifyData function
        var d = new Date(data.firstDate);
        incDate(d, seg[0]); // first seg[0] elements are skipped, so actual first date is later
        if (typeof data.firstDate !== "string" || isNaN(+d))
            throw new SyntaxError("data.firstDate must be a valid date string");
        res.firstDate = [d.getFullYear(), d.getMonth() + 1, d.getDate()].join(".");
        res.firstDateObj = d;

        return res;
    }

    function parseData(rawJSONString, expectedName) {
        // expectedName is optional
        return checkAndNormalizeData(JSON.parse(rawJSONString), expectedName);
    }

    function stringifyData(data) {
        // checkAndNormalizeData is not needed if we'll assume that data couldn't be broken INSIDE THE APP
        var filtered = {
            name: data.name,
            firstDate: data.firstDate,
            daySeparationTime: data.daySeparationTime,
            dataArr: data.dataArr
        };
        return JSON.stringify(filtered);
    }

    function incDate(d, n) {
        if (n === undefined) n = 1;
        d.setDate(d.getDate() + n);
        return d;
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

})(window, window.jQuery, window.localStorage);
