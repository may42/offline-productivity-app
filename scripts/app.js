;(function(global, $){
    "use strict";

    try {
        var statusInfoSpan = $("#status_info");
        var paper = Raphael("pom", 100, 100);
        var settings = { pomHeight: 5, pomWidth: 30, maxPom: 20 };
        var pm = new global.ProfileManager($("#profile_select"));
        pm.profileSwitchCallback = onProfileSwitch;
        $("#copy_btn").click(function() { copyTextToClipboard(ProfileManager.stringifyData(pm.currentProfile)); });
        var profileList = pm.profileArr.map(function(prof){ return prof.name; }).join(", ");
        onProfileSwitch(); // draw current profile data
        displayInfo("Successfully loaded profiles: " + profileList);
    } catch(err) { displayInfo(err); }

    var productivityApp = {
        paper: paper,
        displayInfo: displayInfo,
        profileManager: pm,
        copyTextToClipboard: copyTextToClipboard
    };
    global.productivityApp = productivityApp;
    return productivityApp;

    function displayInfo(info, consoleOnly) {
        if (info instanceof Error) {
            console.error(info);
            if (consoleOnly) return;
            statusInfoSpan.addClass("error");
            statusInfoSpan.text("error! " + info.message);
        } else {
            console.log(info);
            if (consoleOnly) return;
            statusInfoSpan.removeClass("error");
            statusInfoSpan.text(info);
        }
    }

    function onProfileSwitch(err) {
        if (err) {
            displayInfo(err);
            return;
        }
        paper.clear();
        try {
            drawBarGraph(paper, pm.currentProfile, settings);
            displayInfo("Bar graph has been drawn successfully. Profile: " + pm.currentProfile.name);
        }
        catch(err) { displayInfo(err); }
    }

    function drawBarGraph(paper, data, settings) {
        var s = expandSettings(settings); // omitted settings will result in default settings object
        stretchPaper(paper, s.weekWidth + s.sidesGap * 2, 1600);

        var curDate = new Date(),
            firDate = data.firstDateObj,
            year = firDate.getFullYear(),
            monthLengths = giveMothLengths(year++),
            month = firDate.getMonth(),
            daysLeft = monthLengths[month++] - firDate.getDate(),
            dayOfWeek = (firDate.getDay() + 6) % 7, // 0=mon ... 5=sat 6=sun
            amountOfDays = data.dataArr.length;
        if (curDate > firDate)
            amountOfDays = Math.max(amountOfDays, (curDate - firDate) / (1000 * 60 * 60 * 24) ^ 0);

        var xShift = s.sidesGap,
            yShift = s.baseline;

        for (var i = 0; i < amountOfDays; i++) {

            var val = data.dataArr[i];
            if (typeof val === "number" && isFinite(val)) {
                val = val ^ 0;
                if (val < 0 || val >= s.colors.length)
                    throw new Error("can't get color, illegal prod value: " + val);
                var color = s.colors[val],
                    x = xShift + dayOfWeek * s.pomWidth,
                    y = yShift,
                    w = s.pomWidth,
                    h = s.pomHeight * Math.min(val, s.maxPom) || 1;
                if (s.direction == -1) y -= h;
                paper.rect(x, y, w, h).attr({stroke: "none", fill: color});
            }
            dayOfWeek = (dayOfWeek + 1) % 7;
            if (dayOfWeek === 0 && i) {
                drawGrid();
                yShift += s.weekHeight;
            }
            if (daysLeft === 0) {
                if (month === 12) {
                    month = 0;
                    monthLengths = giveMothLengths(year++);
                }
                daysLeft = monthLengths[month++];
                // todo: month columns
                if (s.monthGap) {
                    drawGrid();
                    yShift += s.weekHeight;
                }
            }
            daysLeft--;

        }
        if (dayOfWeek) drawGrid();

        function drawGrid() {
            var strokeWidth = 1;
            var strokeColor = "#000";
            var x = xShift - s.sidesGap / 2;
            var y = yShift;
            var l = s.weekWidth + s.sidesGap;
            var h = s.pomHeight * s.direction;
            for (var i = 0; i < s.maxPom; i++, y+=h) {
                var opacity = i % 5 ? 0.1 : i % 10 ? 0.25 : 0.5;
                paper.path("M" + x + "," + y + " l" + l + ",0")
                    .attr({stroke: strokeColor, "stroke-width": strokeWidth, "stroke-opacity": opacity});
            }
        }

        function expandSettings(settings) {
            if (!settings || typeof settings !== "object") settings = {};
            var s = {}; // resulting settings object
            s.colors = settings.colors || ("#000000,#600000,#800000,#A80000,#D30000,#FF0000,#FF6400,#FF9400," +
                "#FFC800,#FFFF00,#A8FF00,#00FF00,#00DF00,#00BF00,#009700,#007000,#005A4A," +
                "#004088,#0020CC,#0000FF,#0064FF,#0094FF,#00CCFF,#00FFFF,#9FFFFF").split(",");
            s.pomHeight = settings.pomHeight || 5;
            s.pomWidth = settings.pomWidth || 5;
            s.maxPom = settings.maxPom || 25;
            s.direction = settings.direction || -1; // -1: from bottom to top, 1: from top to bottom
            s.monthGap = !!settings.monthGap; // vertical gap between months
            // todo:
            s.monthsColumn = settings.monthsColumn || -1; // 1: horizontal, n: months columns of size n, -1: vertical
            s.sidesGap = settings.sidesGap || s.pomWidth; // gaps to all 4 directions from the graph
            s.weekWidth = s.pomWidth * 7;
            s.weekHeight = s.pomHeight * s.maxPom;
            s.baseline = s.sidesGap + (s.direction == -1 ? s.weekHeight : 0);
            return s;
        }
    }

    function stretchPaper(paper, w, h) {
        paper.setSize(
            Math.max(w, paper.width),
            Math.max(h, paper.height)
        )
    }

    // must be initiated by a user action
    function copyTextToClipboard(text) {
        var t = $("<textarea>", {style:"position:fixed; left:-30px; width:10px; height:10px;"});
        var success = false;
        t.val(text).prependTo('body').select();
        try { success = document.execCommand('copy'); }
        catch (err) { console.log('Error occurred:', err); }
        t.remove();
        console.log(success ? "copied to clipboard: " + text :
                              "can't copy! check if function call is initiated by a user action");
    }

    function giveMothLengths(year) {
        // nDays = month === 1 ? 28 + leap : 31 - month % 7 & 1;
        var months = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        if (!(year % 4) && year % 100 || !(year % 400)) months[1]++;
        return months;
    }

})(window, window.jQuery);
