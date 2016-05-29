/**
 * Created by RenCa on 13.05.2016.
 */
;(function(global){
    "use strict";

    var example_data = {
        name: "example_data",
        firstDay: "2016.05.28",
        daySeparationTime: "4:00", // unused yet
        dataArr: [0,20, 0,1,2,3,4,5,6, 7,8,9,10,11,12,13, 14,15,16,17,18,19,20, 0,null,1,null,2,null,3 ]
    };

    var paper = Raphael('pom', 100, 100);
    drawBarGraph(paper, example_data, { pomHeight: 5, pomWidth: 30, avMaxPomAmount: 20 });
    console.log('successfully drew bar graph for data "' + example_data.name + '"');

    $('#copy_btn').click(function(){ copyTextToClipboard(JSON.stringify(example_data)); });

    function drawBarGraph(paper, data, settings) {
        var s = expandSettings(settings); // omitted settings will result in default settings object
        stretchPaper(paper, s.weekWidth + s.sidesGap * 2, 1600);
        var currentDate = new Date();
        var firstDate = new Date(data.firstDay);
        var lastDate = incDate(new Date(data.firstDay), data.dataArr.length); // get date of the last recorded day
        if (currentDate > lastDate) lastDate = currentDate; // if current day is bigger than last recorded day

        var dayOfWeek = (firstDate.getDay() + 6) % 7; // 0=mon ... 5=sat 6=sun
        //var weekNumber = (firstDate.getDate() - dayOfWeek + 5) / 7 ^ 0; // week row in the calendar. don't ask me how
        var weekNumber = 0;
        var monthNumber = 0;
        var xShift = s.sidesGap;
        var yShift = s.baseline; // + weekNumber * s.weekHeight;

        for (var d = new Date(firstDate), i = 0; d < lastDate; incDate(d), i++) {

            var prodValue = data.dataArr[i];
            //var dayOfWeek = (d.getDay() + 6) % 7; // 0=mon ... 5=sat 6=sun
            //var weekNumber = (d.getDate() - dayOfWeek + 5) / 7 ^ 0; // week row in the month. don't ask me how
            //weekNumber += monthXShift;

            if (typeof prodValue === "number") {
                if (prodValue < 0 || prodValue >= s.colors.length)
                    throw new Error("can't get color, illegal prod value: " + prodValue);
                var color = s.colors[prodValue];
                //var x = s.sidesGap + dayOfWeek * s.pomWidth;
                var x = xShift + dayOfWeek * s.pomWidth;
                //var y = s.baseline + weekNumber * s.weekHeight;
                var y = yShift;
                var w = s.pomWidth;
                var h = s.pomHeight * prodValue || 1;
                if (s.direction == -1) y -= h;
                paper.rect(x, y, w, h).attr({stroke: "none", fill: color});
            }
            //dayOfWeek = (dayOfWeek + 1) % 7;
            dayOfWeek = (dayOfWeek + 1) % 7;
            if (dayOfWeek === 0 && i) {
                drawGrid(weekNumber);
                weekNumber++;
                yShift += s.weekHeight;
            }
            if (d.getDate() === 1 && i) {
                monthNumber++;
                if (s.monthsColumnSize > 1 && monthNumber % s.monthsColumnSize === 0) {
                    // next month column
                    drawGrid(weekNumber);
                    weekNumber = 0;
                    yShift = s.baseline;
                    xShift += s.sidesGap + s.weekWidth;
                } else if (s.verticalMonthGap) {
                    drawGrid(weekNumber);
                    weekNumber++;
                    yShift += s.weekHeight;
                }
            }
        }
        function drawGrid(weekNum) {
            var strokeWidth = 1;
            var strokeColor = "#000";
            var x0 = s.sidesGap / 2;
            var y0 = (s.baseline + weekNum * s.weekHeight);
            var l = s.weekWidth + s.sidesGap;
            for (var i = 0; i < s.avMaxPomAmount; i++) {
                var opacity = i % 5 ? 0.1 : i % 10 ? 0.25 : 0.5;
                var y = y0 + s.pomHeight * s.direction * i;
                paper.path("M" + x0 + "," + y + " l " + l + ",0")
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
            s.avMaxPomAmount = settings.avMaxPomAmount || 25; // todo: add truncation
            s.direction = settings.direction || -1; // -1: from bottom to top, 1: from top to bottom
            s.verticalMonthGap = !!settings.verticalMonthGap; // vertical gap between months
            s.monthsColumnSize = settings.monthsColumnSize || -1; // 1: horizontal layout, n: months columns are of size n, -1: vertical layout // todo
            s.sidesGap = settings.sidesGap || s.pomWidth; // gaps to all 4 directions from the graph

            s.weekWidth = s.pomWidth * 7;
            s.weekHeight = s.pomHeight * s.avMaxPomAmount;
            s.baseline = s.sidesGap + (s.direction == -1 ? s.weekHeight : 0);

            return s;
        }
    }

    function incDate(d, n) {
        d.setDate(d.getDate() + (n || 1));
        return d;
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

    var productivityApp = {
        paper: paper,
        copyTextToClipboard: copyTextToClipboard
    };
    global.productivityApp = productivityApp;
    return productivityApp;

})(window);
