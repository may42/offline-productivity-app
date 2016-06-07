;(function(global, $){
    "use strict";

    var incDate = global.utilFunctions.incDate,
        stretchPaper = global.utilFunctions.stretchPaper,
        giveMothLengths = global.utilFunctions.giveMothLengths;

    function BarGraph(paper, profile, settings) {
        // if settings argument is an empty object - it will result in default settings object
        // todo: argument verification

        var self = this;

        self.paper = paper;
        self.profile = profile;
        self.settings = BarGraph.expandSettings(settings);
        self.selectedDay = undefined; // used for storing link to currently selected day raphael object
        self.selection = undefined; // used for storing selection rectangle

        self.resetAccumulatedShift = function(){
            self.settings.accumulatedX = self.settings.x;
            self.settings.accumulatedY = self.settings.y;
        };

        self.draw = function() {
            self.resetAccumulatedShift();
            drawDays.call(self); // will draw all available days, staring from ind 0
        };

        self.drawNextWeek = function() {
            // todo: turn this function into "addDays", that will take number of days as an argument
            drawNextNDays.call(self, 7); // will add 7 more empty days to the calendar
        };

        self.selectDay = selectDay;
        self.moveSelection = moveSelection;
        self.setSelectedDayValue = setSelectedDayValue;
        self.incSelectedDayValue = incSelectedDayValue;
    }

    BarGraph.expandSettings = function(settings) {
        if (!settings || typeof settings !== "object") settings = {};
        var s = {}; // resulting settings object
        s.x = settings.x || 0;
        s.y = settings.y || 0;
        s.colors = settings.colors || ("#000000,#600000,#800000,#A80000,#D30000,#FF0000,#FF6400," +
            "#FF9400,#FFC800,#FFFF00,#A8FF00,#00FF00,#00DF00,#00BF00,#009700,#007000,#005A4A," +
            "#004088,#0020CC,#0000FF,#0064FF,#0094FF,#00CCFF,#00FFFF,#9FFFFF").split(",");
        s.maxPom = settings.maxPom || 25;
        s.pomWidth = settings.pomWidth || 5;
        s.pomHeight = settings.pomHeight || 5;
        s.direction = settings.direction || -1; // -1: from bottom to top, 1: from top to bottom
        s.sidesGap = settings.sidesGap || settings.pomWidth; // gaps to all 4 directions from the graph
        s.monthGap = !!settings.monthGap; // vertical gap between months
        // todo: s.monthsColumn = settings.monthsColumn || -1; // 1: horizontal, n: months columns of size n, -1: vertical

        // additional values:
        s.weekWidth = s.pomWidth * 7;
        s.weekHeight = s.pomHeight * s.maxPom;
        s.baseline = s.sidesGap + (s.direction === -1 ? s.weekHeight : 0);
        s.accumulatedX = s.x;
        s.accumulatedY = s.y;
        s.prevDrawEndInd = 0;
        return s;
    };
    global.BarGraph = BarGraph;
    return BarGraph;

    function drawNextNDays(n) {
        // n - is the number of days, that need to drawn
        //     by default is equal to 0
        var self = this, // must be a BarGraph instance
            startInd = self.settings.prevDrawEndInd; // continue from the point, where ended last time
        drawDays.call(self, startInd, startInd + n - 1);
    }

    function drawDays(startInd, endInd) {
        // startInd - is an index in the dataArr, that drawing need to start from
        //     by default is equal to 0
        // endInd - is an index in the dataArr, that drawing need to end on
        //     by default is equal to Math.max(currentDayInd, dataArr.length - 1)

        var self = this, // must be a BarGraph instance
            s = self.settings,
            paper = self.paper,
            dataArr = self.profile.dataArr,
            startDate = new Date(self.profile.firstDateObj);

        if (startInd === undefined) startInd = 0; // start from the beginning
        incDate(startDate, startInd);
        var year = startDate.getFullYear(),
            monthLengths = giveMothLengths(year++),
            month = startDate.getMonth(),
            daysLeft = monthLengths[month++] - startDate.getDate(), // number of days before the current month ends
            dayOfWeek = (startDate.getDay() + 6) % 7; // 0=mon ... 5=sat 6=sun

        var currentDayInd = (new Date() - startDate) / (1000 * 60 * 60 * 24) ^ 0;
        if (currentDayInd < 0) currentDayInd = 0;
        if (endInd === undefined) {
            endInd = Math.max(dataArr.length - 1, currentDayInd);
            endInd += 6 - (dayOfWeek + endInd - startInd) % 7; // additionally increase endInd to fill the last week
        }

        stretchPaper(paper, s.accumulatedX + s.weekWidth + s.sidesGap * 2, 1600);
        var xShift = s.sidesGap + s.accumulatedX,
            yShift = s.baseline + s.accumulatedY;

        for (var i = startInd; i <= endInd; i++) {

            var color = "transparent",
                x = xShift + dayOfWeek * s.pomWidth,
                y = yShift,
                w = s.pomWidth,
                h = s.pomHeight * s.maxPom;

            if (dataArr[i] === undefined) dataArr[i] = null;
            var val = dataArr[i];
            if (typeof val === "number" && isFinite(val)) {
                val = val ^ 0;
                if (val in s.colors) color = s.colors[val];
                else throw new Error("can't get color, illegal prod value: " + val);
                if (val < s.maxPom) h = s.pomHeight * val || 1;
            } else val = null;
            if (s.direction === -1) y -= h;
            var rect = paper.rect(x, y, w, h)
                .attr({stroke: "none", fill: color})
                .data("dayInd", i);
            if (i === currentDayInd)
                var dayToBeSelected = rect; // raphael object, that will be selected after the loop

            dayOfWeek = (dayOfWeek + 1) % 7;
            if (dayOfWeek === 0) {
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
        if (dayToBeSelected)
            self.selectDay(dayToBeSelected);
        // preserved current xShift and yShift:
        s.accumulatedX = xShift - s.sidesGap;
        s.accumulatedY = yShift - s.baseline;
        s.prevDrawEndInd = i;

        function drawGrid() {
            // todo: make grid width variable (needed wor proper month splitting)
            var strokeWidth = 1,
                strokeColor = "#000",
                x = xShift - s.sidesGap / 2,
                y = yShift,
                l = s.weekWidth + s.sidesGap,
                h = s.pomHeight * s.direction;
            for (var i = 0; i < s.maxPom; i++, y+=h) {
                var opacity = i % 5 ? 0.1 : i % 10 ? 0.25 : 0.5;
                paper.path("M" + x + "," + y + " l" + l + ",0")
                     .attr({stroke: strokeColor, "stroke-width": strokeWidth, "stroke-opacity": opacity});
            }
        }
    }

    function selectDay(day) {
        // visually selects given rect element
        // day argument accepts SVG rect Elements, raphael rect objects, jquery rect objects

        var self = this; // must be a BarGraph instance
        var errorMsg = "day argument must be a rect element (SVGElement, jQuery object or Raphael object)";

        if (!day || typeof day !== "object") throw new SyntaxError(errorMsg);
        if (day.constructor.prototype == Raphael.el) day = day.node;
        if (day instanceof $) day = day.get(0);
        if (!(day instanceof global.SVGElement) || day.nodeName !== "rect") throw new SyntaxError(errorMsg);
        if (typeof day.raphaelid !== "number")
            throw new SyntaxError("day rect element must be bound to some Raphael paper");

        self.selectedDay = day;
        if (self.selection) self.selection.remove();
        // self.selection object is a rect element clone, that is automatically moved to the top by Raphael
        self.selection = self.paper.getById(self.selectedDay.raphaelid).clone()
                                   .attr({stroke: "#e3d", fill: "rgba(240,50,220,.3)", "stroke-width": "3px"});
    }

    function moveSelection(dist) {
        // dist accepts 1 and -1, for next and previous day respectively
        // todo: accept any integer

        var self = this; // must be a BarGraph instance

        var rectGroup;
        var leadingRectangles = 0;
        var trailingRectangles = 1; // 1 is for selection rect itself
        if (dist === -1) {
            rectGroup = $(self.selectedDay).prevAll("rect");
            if (leadingRectangles >= rectGroup.length) return;
        } else if (dist === 1) {
            rectGroup = $(self.selectedDay).nextAll("rect");
            if (trailingRectangles >= rectGroup.length) {
                self.drawNextWeek();
                if (self.selection) self.selection.remove();
                rectGroup = $(self.selectedDay).nextAll("rect"); // capture new rect elements
            }
        } else throw new SyntaxError("x argument must be equal to -1 or 1");
        self.selectDay(rectGroup.get(0)); // selects next/prev day only if it exists
    }

    function setSelectedDayValue(val) {
        var self = this; // must be a BarGraph instance

        if (val != null && (typeof val !== "number" || !isFinite(val)))
            throw new TypeError("val must be an integer, undefined or null");
        var raphaelObj = self.paper.getById(self.selectedDay.raphaelid);
        if (!raphaelObj)
            throw new ReferenceError("selectedDay element must be bound to some Raphael paper");
        var s = self.settings;
        var dataArr = self.profile.dataArr;
        var dayInd = raphaelObj.data("dayInd");
        if (!(dayInd in dataArr))
            throw new Error("can't find such dayInd in current profile dataArr: " + dayInd);

        var oldHeight = raphaelObj.attr("height"),
            oldYPos = raphaelObj.attr("y");
        if (s.direction === -1) oldYPos += oldHeight; // restore old y origin point

        var color = "transparent", // rgba(0,0,0,0)
            y = oldYPos,
            h = s.pomHeight * s.maxPom;

        if (val < 0) val = null;
        if (val != null) {
            val = val ^ 0;
            var maxVal = s.colors.length - 1;
            if (val > maxVal) {
                console.log("can't exceed value " + maxVal + " with current settings");
                val = maxVal;
            }
            color = s.colors[val];
            if (val < s.maxPom) h = s.pomHeight * val || 1;
        }
        if (s.direction === -1) y -= h;

        if (color !== "transparent") // reset the transparent element
            $(raphaelObj.node).removeAttr("fill-opacity");
        raphaelObj.attr({y: y, height: h, fill: color});

        dataArr[dayInd] = val;
        self.selectDay(raphaelObj);
        self.profile.save();
    }

    function incSelectedDayValue(n) {
        var self = this; // must be a BarGraph instance
        if (n === 0) return;
        if (typeof n !== "number" || !isFinite(n))
            throw new TypeError("n must be an integer");
        var raphaelObj = self.paper.getById(self.selectedDay.raphaelid);
        if (!raphaelObj)
            throw new ReferenceError("selectedDay element must be bound to some Raphael paper");
        var oldValue = self.profile.dataArr[raphaelObj.data("dayInd")];
        self.setSelectedDayValue(+oldValue + n);
    }

})(window, window.jQuery);