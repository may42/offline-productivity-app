/**
 * Created by RenCa on 13.05.2016.
 */
"use strict";

var x = null;
var myData = {
    name: "example_data",
    firstDay: "2016.05.28",
    daySeparationTime: "4:00", // unused yet
    dataArr: [0,20, 0,1,2,3,4,5,6, 7,8,9,10,11,12,13, 14,15,16,17,18,19,20, 0,x,1,x,2,x,3 ]
};

var settings = {
    colors: ("#000000,#600000,#800000,#A80000,#D30000,#FF0000,#FF6400,#FF9400,#FFC800,#FFFF00,#A8FF00,#00FF00,#00DF00,"+
        "#00BF00,#009700,#007000,#005A4A,#004088,#0020CC,#0000FF,#0064FF,#0094FF,#00CCFF,#00FFFF,#9FFFFF").split(","),
    pomHeight: 5,
    pomWidth: 30,
    avMaxPomAmount: 20,
    direction: -1, // -1: from bottom to top, 1: from top to bottom
    verticalMonthGap: false, // vertical gap between months
    monthsColumnSize: -1 // 1: horizontal layout, n: months columns are of size n, -1: vertical layout // todo
};
settings.sidesGap = settings.pomWidth; // gaps to all 4 directions from the graph
settings.weekWidth = settings.pomWidth * 7;
settings.weekHeight = settings.pomHeight * settings.avMaxPomAmount;
settings.baseline = settings.sidesGap + (settings.direction == -1 ? settings.weekHeight : 0);

var paper = Raphael('pom', settings.weekWidth + settings.sidesGap * 2, 1600);
renderBarGraph(myData, settings);

function renderBarGraph(data, settings) {
    var s = settings;
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
            console.log("path", x0, y0, l, opacity, y);
            paper.path("M" + x0 + "," + y + " l " + l + ",0")
                .attr({stroke: strokeColor, "stroke-width": strokeWidth, "stroke-opacity": opacity});
        }
    }
}

function incDate(d, n) {
    d.setDate(d.getDate() + (n || 1));
    return d;
}

function copyTextToClipboard(text) {
    var t = $("<textarea>", {style:"position:fixed; left:-30px; width:10px; height:10px;"});
    t.val(text).prependTo('body').select();
    try { console.log(document.execCommand('copy') ? "copied to clipboard: " + text : "can't copy!"); }
    catch (err) { console.log('Error occurred:', err); }
    t.remove();
}
$('#copy_btn').click(function(){ copyTextToClipboard(JSON.stringify(myData)); });