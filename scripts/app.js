;(function(global, $){
    "use strict";

    var ProfileManager = global.ProfileManager,
        BarGraph = global.BarGraph,
        copyTextToClipboard = global.utilFunctions.copyTextToClipboard;

    try {
        var statusInfoSpan = $("#status_info");
        var paper = Raphael("apo", 100, 100);
        var initialSettings = { pomHeight: 5, pomWidth: 30, maxPom: 20 };
        var pm = new ProfileManager($("#profile_select"), onProfileSwitch);
        var profileNames = pm.profileArr.map(function(prof){ return prof.name; });

        $("#copy_btn").click(onCopyBtnClick);
        $("body").keydown(onKeyDown);
        onProfileSwitch(); // draw current profile data

        if (pm.currentProfile.barGraph) // if BarGraph throws an error - currentProfile.barGraph will be undefined
            displayInfo("Successfully loaded profiles: " + profileNames.join(", "));
    } catch(err) { displayInfo(err); }

    global.productivityApp = {
        paper: paper,
        profileManager: pm,
        displayInfo: displayInfo
    };

    function onProfileSwitch(err) {
        if (err) {
            displayInfo(err);
            return;
        }
        paper.clear();
        try {
            var profile = pm.currentProfile;
            if (!profile.barGraph) profile.barGraph = new BarGraph(paper, profile, initialSettings);
            profile.barGraph.draw();
            displayInfo("Bar graph has been drawn successfully. Profile: " + profile.name);
        }
        catch(err) { displayInfo(err); }
    }

    function onCopyBtnClick() {
        try {
            copyTextToClipboard(pm.currentProfile.stringify());
            displayInfo("successfully copied JSON data to the clipboard!");
        } catch(err) { displayInfo(err); }
    }

    function onKeyDown(ev) {
        var g = pm.currentProfile.barGraph;
        try {
            if (ev.keyCode >= 37 && ev.keyCode <= 40) ev.preventDefault(); // any arrow
            if (ev.keyCode === 37) g.moveSelection(-1); // left arrow
            if (ev.keyCode === 39) g.moveSelection(1); // right arrow
            if (ev.keyCode === 38) g.incSelectedDayValue(1); // up arrow
            if (ev.keyCode === 40) g.incSelectedDayValue(-1); // down arrow
            if (ev.altKey) {
                if (ev.keyCode === 46) g.setSelectedDayValue(null); // Alt Del
                if (ev.keyCode >= 48 && ev.keyCode <= 57)
                    g.setSelectedDayValue(ev.keyCode - 48); // Alt DIGIT
                //if (ev.keyCode === 189) g.incSelectedDayValue(-1); // Alt -
                //if (ev.keyCode === 187) g.incSelectedDayValue(1); // Alt +
            }
        } catch(err) { displayInfo(err); }
    }

    function displayInfo(info, consoleOnly) {
        var isError = info instanceof Error;
        if (isError) console.error(info);
        else console.log(info);
        if (consoleOnly) return;
        statusInfoSpan.toggleClass("error", isError);
        statusInfoSpan.text(isError ? "error! " + info.message : info);
    }

})(window, window.jQuery);
