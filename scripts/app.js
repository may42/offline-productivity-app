;(function(global, $){
    "use strict";

    try {
        var statusInfoSpan = $("#status_info");
        var paper = Raphael("apo", 100, 100);
        var settings = { pomHeight: 5, pomWidth: 30, maxPom: 20 };
        var pm = new global.ProfileManager($("#profile_select"));
        pm.profileSwitchCallback = onProfileSwitch;
        $("#copy_btn").click(function() {
            copyTextToClipboard(ProfileManager.stringifyData(pm.currentProfile));
        });
        $("body").keydown(function(ev) {
            if (ev.keyCode === 37) moveSelection(-1);
            if (ev.keyCode === 39) moveSelection(1);
        });
        var profileList = pm.profileArr.map(function(prof){ return prof.name; }).join(", ");
        var selectedDay; // used for storing link to currently selected day raphael object
        var selection; // used for storing selection rectangle
        onProfileSwitch(); // draw current profile data
        displayInfo("Successfully loaded profiles: " + profileList);
    } catch(err) { displayInfo(err); }

    var productivityApp = {
        paper: paper,
        profileManager: pm,
        displayInfo: displayInfo,
        selectDay: selectDay,
        moveSelection: moveSelection,
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
            amountOfDays = data.dataArr.length || 1,
            currentDayInd = (curDate - firDate) / (1000 * 60 * 60 * 24) ^ 0,
            dayToBeSelected; // variable to store raphael object, that will be selected after the loop
        if (curDate > firDate && currentDayInd >= amountOfDays)
            amountOfDays = currentDayInd + 1;
        if (currentDayInd < 0) currentDayInd = 0;

        var xShift = s.sidesGap,
            yShift = s.baseline;

        for (var i = 0; i < amountOfDays; i++) {

            var color = "transparent",
                x = xShift + dayOfWeek * s.pomWidth,
                y = yShift,
                w = s.pomWidth,
                h = s.pomHeight * s.maxPom;

            var val = data.dataArr[i];
            if (typeof val === "number" && isFinite(val)) {
                val = val ^ 0;
                if (val < 0 || val >= s.colors.length)
                    throw new Error("can't get color, illegal prod value: " + val);
                color = s.colors[val];
                if (val < s.maxPom) h = s.pomHeight * val || 1;
            } else val = null;
            if (s.direction == -1) y -= h;
            var rect = paper.rect(x, y, w, h)
                 .attr({stroke: "none", fill: color})
                 .data("value", val);
            if (i === currentDayInd) dayToBeSelected = rect;

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
        selectDay(dayToBeSelected);

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

    function selectDay(newDay) {
        // newDay accepts SVG rect Elements, raphael rect objects, jquery rect objects
        // todo: accept date string or Date object

        var errorMsg = "newDay argument must be a rect element (SVGElement, $ or Raphael object)";

        if (!newDay || typeof newDay !== "object") throw new SyntaxError(errorMsg);
        if (newDay.constructor.prototype == Raphael.el) newDay = newDay.node;
        if (newDay instanceof $) newDay = newDay.get(0);
        if (!(newDay instanceof SVGElement) || newDay.nodeName !== "rect") throw new SyntaxError(errorMsg);
        if (typeof newDay.raphaelid !== "number")
            throw new SyntaxError("newDay rect element must be bound to some Raphael paper");

        selectedDay = newDay;
        if (selection) selection.remove();
        selection = paper.getById(selectedDay.raphaelid).clone()
                         .attr({stroke: "#e3d", fill: "rgba(240,50,220,.3)", "stroke-width": "3px"});
    }

    function moveSelection(x) {
        // x accepts 1 and -1, for next and previous day respectively
        // todo: accept any integer

        var rectGroup;
        var leadingIgnoredRectangles = 0;
        var trailingIgnoredRectangles = 1; // 1 is for selection rect itself
        if (x === -1) {
            rectGroup = $(selectedDay).prevAll("rect");
            if (rectGroup.length <= leadingIgnoredRectangles) return;
        } else if (x === 1) {
            rectGroup = $(selectedDay).nextAll("rect");
            if (rectGroup.length <= trailingIgnoredRectangles) return;
            // todo: generate new week, when trying to select next day of the last day
        } else throw new SyntaxError("x argument must be equal to -1 or 1");
        selectDay(rectGroup.get(0)); // selects next/prev day only if it exists
    }

})(window, window.jQuery);
