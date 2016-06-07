;(function(global, $, ls){
    "use strict";

    var giveTrimmedArraySegment = global.utilFunctions.giveTrimmedArraySegment,
        incDate = global.utilFunctions.incDate;

    var prefix = "opa_profile_";
    var example_profile = {
        name: "example_profile",
        firstDate: "2016.05.28",
        daySeparationTime: "4:00",
        dataArr: [0,20, 0,1,2,3,4,5,6, 7,8,9,10,11,12,13, 14,15,16,17,18,19,20, 0,null,1,null,2,null,3 ]
    };

    var ProfileManager = function(profileSelect, onchange) {
        // onchange argument is a function, that called every time the profile changes
        //    this function must take one optional argument - err, for handling possible errors
        var self = this;
        if (!ls) throw new Error("local storage is not supported in this browser");
        if (!(profileSelect instanceof $) || profileSelect.length !== 1 || !profileSelect.is("select"))
            throw new SyntaxError('profileSelect must be a jQuery object pointed on a single "select" html element');
        if (typeof onchange !== "function" || onchange.length !== 1)
            throw new SyntaxError('onchange must be a function that takes one argument');
        var profileArr = loadData();
        if (!profileArr.length) {
            console.log("no data is recorded in the local storage yet, loading example profile");
            var exampleProfile = checkAndNormalizeData(example_profile);
            exampleProfile.save();
            profileArr.push(exampleProfile);
        }
        var profileNames = profileArr.map(function(p){ return p.name });
        profileNames.forEach(function(name){
            profileSelect.append($("<option>").val(name).text(name));
        });
        profileSelect.change(function(ev) {
            $(ev.target).blur();
            var selectedName = profileSelect.val(),
                errMsg = 'unknown profile name "' + selectedName + '"',
                i = profileNames.indexOf(selectedName);
            if (~i) {
                self.currentProfile = profileArr[i];
                onchange();
            } else onchange(new ReferenceError(errMsg));
        });
        // todo: save currently selected profile name in the local storage and load it as a currentProfile
        self.profileArr = profileArr;
        self.profileNames = profileNames;
        self.currentProfile = profileArr[0];
    };

    ProfileManager.parseData = parseData;
    ProfileManager.checkAndNormalizeData = checkAndNormalizeData;
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

    function parseData(rawJSONString, expectedName) {
        // expectedName is optional
        return checkAndNormalizeData(JSON.parse(rawJSONString), expectedName);
    }

    function checkAndNormalizeData(data, expectedName) {
        // expectedName argument is optional
        var profile = {};

        if (!data || typeof data !== "object")
            throw new SyntaxError("data must be an object with key-value pairs");

        // if expectedName is provided - data.name must be equal to it
        if (typeof data.name !== "string" || !data.name.trim())
            throw new SyntaxError("data.name must be a non-whitespace string");
        profile.name = data.name.trim();
        if (typeof expectedName === "string" && profile.name !== expectedName)
            throw new SyntaxError('expected data.name to be "' + expectedName +
                                  '", instead got "' + profile.name + '"');

        // daySeparationMs is a millisecond integer for internal purposes, and is not parsed by stringifyData function
        var daySeparationRequirements = 'data.daySeparationTime must be a timestring of form "hh:mm"';
        if (data.daySeparationTime === undefined) profile.daySeparationMs = 0;
        else if (typeof data.daySeparationTime === "string") {
            profile.daySeparationTime = data.daySeparationTime = data.daySeparationTime.trim();
            var match = data.daySeparationTime.match(/^(\d\d?):(\d\d)$/);
            if (!match || +match[1] > 23 || +match[2] > 59) throw new SyntaxError(daySeparationRequirements);
            profile.daySeparationMs = (+match[1] * 60 + +match[2]) * 60 * 1000;
        } else throw new SyntaxError(daySeparationRequirements);

        var dataArrRequirements = "data.dataArr must be an array, containing positive integers or null-values";
        var seg = [0, 0]; // used to remove leading and trailing null/undefined elements from the array
        if (data.dataArr !== undefined) {
            if (!Array.isArray(data.dataArr)) throw new SyntaxError(dataArrRequirements);
            seg = giveTrimmedArraySegment(data.dataArr);
            profile.dataArr = data.dataArr.slice(seg[0], seg[1]).map(function(x) {
                if (x == null) return null; // null or undefined
                if (typeof x === "string" && x.trim()) x = +x;
                if (typeof x !== "number" || !isFinite(x) || isNaN(x)) throw new SyntaxError(dataArrRequirements);
                return x; // float, negative and to big values will silently pass
            });
        } else profile.dataArr = [];

        // profile.firstDateObj is a Date object for internal purposes, and is not parsed by stringifyData function
        if (data.firstDate !== undefined) {
            var dateComp = data.firstDate.split(".");
            var d = new Date(dateComp[0], dateComp[1] - 1, dateComp[2]);
            incDate(d, seg[0]); // first seg[0] elements are skipped, so actual first date is later
            if (typeof data.firstDate !== "string" || isNaN(+d))
                throw new SyntaxError("data.firstDate must be a valid date string");
        } else {
            d = new Date();
            if (profile.dataArr.length) incDate(d, 1 - profile.dataArr.length);
        }
        profile.firstDate = [d.getFullYear(), d.getMonth() + 1, d.getDate()].join(".");
        profile.firstDateObj = d;

        profile.save = saveProfile;
        profile.stringify = stringifyProfile;

        return profile;
    }

    // profile methods:

    function saveProfile() {
        var profile = this; // this - must be a profile object
        ls[prefix + profile.name.trim()] = profile.stringify();
    }

    function stringifyProfile() {
        // checkAndNormalizeData is not needed if we'll assume that data couldn't be broken INSIDE THE APP
        var profile = this; // this - must be a profile object
        var seg = giveTrimmedArraySegment(profile.dataArr);
        var filtered = {
            name: profile.name,
            firstDate: profile.firstDate,
            daySeparationTime: profile.daySeparationTime,
            dataArr: profile.dataArr.slice(seg[0], seg[1])
        };
        return JSON.stringify(filtered);
    }

})(window, window.jQuery, window.localStorage);
