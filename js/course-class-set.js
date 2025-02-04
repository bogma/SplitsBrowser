/*
 *  SplitsBrowser Course-Class Set - A collection of selected course classes.
 *  
 *  Copyright (C) 2000-2018 Dave Ryder, Reinhard Balling, Andris Strazdins,
 *                          Ed Nash, Luke Woodward
 *
 *  This program is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation; either version 2 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License along
 *  with this program; if not, write to the Free Software Foundation, Inc.,
 *  51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 */
(function () {
    "use strict";
    
    var isNotNull = SplitsBrowser.isNotNull;
    var isNaNStrict = SplitsBrowser.isNaNStrict;
    var isNotNullNorNaN = SplitsBrowser.isNotNullNorNaN;
    var throwInvalidData = SplitsBrowser.throwInvalidData; 
    var compareCompetitors = SplitsBrowser.Model.compareCompetitors;
    
    /**
    * Utility function to merge the lists of all competitors in a number of
    * classes.  All classes must contain the same number of controls.
    * @param {Array} classes - Array of CourseClass objects.
    * @return {Array} Merged array of competitors.
    */
    function mergeCompetitors(classes) {
        if (classes.length === 0) {
            return [];
        }
        
        var allCompetitors = [];
        var expectedControlCount = classes[0].numControls;
        classes.forEach(function (courseClass) {
            if (courseClass.numControls !== expectedControlCount) {
                throwInvalidData("Cannot merge classes with " + expectedControlCount + " and " + courseClass.numControls + " controls");
            }
            
            courseClass.competitors.forEach(function (comp) {
                if (!comp.isNonStarter) { 
                    allCompetitors.push(comp);
                }
            });
        });

        allCompetitors.sort(compareCompetitors);
        return allCompetitors;
    }

    /**
    * Given an array of numbers, return a list of the corresponding ranks of those
    * numbers.
    * @param {Array} sourceData - Array of number values.
    * @returns Array of corresponding ranks.
    */
    function getRanks(sourceData) {
        // First, sort the source data, removing nulls.
        var sortedData = sourceData.filter(isNotNullNorNaN);
        sortedData.sort(d3.ascending);
        
        // Now construct a map that maps from source value to rank.
        var rankMap = new d3.map();
        sortedData.forEach(function(value, index) {
            if (!rankMap.has(value)) {
                rankMap.set(value, index + 1);
            }
        });
        
        // Finally, build and return the list of ranks.
        var ranks = sourceData.map(function(value) {
            return isNotNullNorNaN(value) ? rankMap.get(value) : value;
        });
        
        return ranks;
    }
    
    /**
    * An object that represents the currently-selected classes.
    * @constructor
    * @param {Array} classes - Array of currently-selected classes.
    */
    function CourseClassSet(classes) {
        this.allCompetitors = mergeCompetitors(classes);
        this.classes = classes;
        this.numControls = (classes.length > 0) ? classes[0].numControls : null;
        this.computeRanks();
    }
    
    /**
    * Returns whether this course-class set is empty, i.e. whether it has no
    * competitors at all.
    * @return {boolean} True if the course-class set is empty, false if it is not
    *     empty.
    */    
    CourseClassSet.prototype.isEmpty = function () {
        return this.allCompetitors.length === 0;
    };
    
    /**
    * Returns the course used by all of the classes that make up this set.  If
    * there are no classes, null is returned instead.
    * @return {?SplitsBrowser.Model.Course} The course used by all classes.
    */
    CourseClassSet.prototype.getCourse = function () {
        return (this.classes.length > 0) ? this.classes[0].course : null;
    };
    
    /**
    * Returns the name of the 'primary' class, i.e. that that has been
    * chosen in the drop-down list.  If there are no classes, null is returned
    * instead.
    * @return {?String} Name of the primary class.
    */
    CourseClassSet.prototype.getPrimaryClassName = function () {
        return (this.classes.length > 0) ? this.classes[0].name : null;
    };
    
    /**
    * Returns the number of classes that this course-class set is made up of.
    * @return {Number} The number of classes that this course-class set is
    *     made up of.
    */
    CourseClassSet.prototype.getNumClasses = function () {
        return this.classes.length;
    };
    
    /**
    * Returns whether any of the classes within this set have data that
    * SplitsBrowser can identify as dubious.
    * @return {boolean} True if any of the classes within this set contain
    *     dubious data, false if none of them do.
    */
    CourseClassSet.prototype.hasDubiousData = function () {
        return this.classes.some(function (courseClass) { return courseClass.hasDubiousData; });
    };

    /**
    * Return a list of objects that describe when the given array of times has
    * null or NaN values.  This does not include trailing null or NaN values.
    * @param {Array} times - Array of times, which may include NaNs and nulls.
    * @param {boolean} includeEnd - Whether to include a blank range that ends
    *    at the end of the array.
    * @return {Array} Array of objects that describes when the given array has
    *    ranges of null and/or NaN values.
    */
    function getBlankRanges(times, includeEnd) {
        var blankRangeInfo = [];
        var startIndex = 1;
        while (startIndex + 1 < times.length) {
            if (isNotNullNorNaN(times[startIndex])) {
                startIndex += 1;
            } else {
                var endIndex = startIndex;
                while (endIndex + 1 < times.length && !isNotNullNorNaN(times[endIndex + 1])) {
                    endIndex += 1;
                }
                
                if (endIndex + 1 < times.length || includeEnd) {
                    blankRangeInfo.push({start: startIndex - 1, end: endIndex + 1});
                }
                
                startIndex = endIndex + 1;
            }
        }
        
        return blankRangeInfo;
    }

    /**
    * Fill in any NaN values in the given list of cumulative times by doing
    * a linear interpolation on the missing values.
    * @param {Array} cumTimes - Array of cumulative times.
    * @return {Array} Array of cumulative times with NaNs replaced.
    */
    function fillBlankRangesInCumulativeTimes(cumTimes) {
        cumTimes = cumTimes.slice(0);
        var blankRanges = getBlankRanges(cumTimes, false);
        for (var rangeIndex = 0; rangeIndex < blankRanges.length; rangeIndex += 1) {
            var range = blankRanges[rangeIndex];
            var timeBefore = cumTimes[range.start];
            var timeAfter = cumTimes[range.end];
            var avgTimePerControl = (timeAfter - timeBefore) / (range.end - range.start);
            for (var index = range.start + 1; index < range.end; index += 1) {
                cumTimes[index] = timeBefore + (index - range.start) * avgTimePerControl;
            }
        }
        
        var lastNaNTimeIndex = cumTimes.length;
        while (lastNaNTimeIndex >= 0 && isNaNStrict(cumTimes[lastNaNTimeIndex - 1])) {
            lastNaNTimeIndex -= 1;
        }
        
        if (lastNaNTimeIndex > 0) {
            for (var timeIndex = lastNaNTimeIndex; timeIndex < cumTimes.length; timeIndex += 1) {
                cumTimes[timeIndex] = cumTimes[timeIndex - 1] + ((timeIndex === cumTimes.length - 1) ? 60 : 180);
            }
        }
        
        return cumTimes;
    }
    
    /**
    * Returns an array of the cumulative times of the winner of the set of
    * classes.
    * @return {Array} Array of the winner's cumulative times.
    */
    CourseClassSet.prototype.getWinnerCumTimes = function () {
        if (this.allCompetitors.length === 0) {
            return null;
        }
        
        var firstCompetitor = this.allCompetitors[0];
        return (firstCompetitor.completed()) ? fillBlankRangesInCumulativeTimes(firstCompetitor.cumTimes) : null;
    };

    /**
    * Return the imaginary competitor who recorded the fastest time on each leg
    * of the class.
    * If at least one control has no competitors recording a time for it, null
    * is returned.  If there are no classes at all, null is returned.
    * @returns {?Array} Cumulative splits of the imaginary competitor with
    *           fastest time, if any.
    */
    CourseClassSet.prototype.getFastestCumTimes = function () {
        return this.getFastestCumTimesPlusPercentage(0);
    };
    
    /**
    * Return the imaginary competitor who recorded the fastest time on each leg
    * of the given classes, with a given percentage of their time added.
    * If at least one control has no competitors recording a time for it, null
    * is returned.  If there are no classes at all, null is returned.
    * @param {Number} percent - The percentage of time to add.
    * @returns {?Array} Cumulative splits of the imaginary competitor with
    *           fastest time, if any, after adding a percentage.
    */
    CourseClassSet.prototype.getFastestCumTimesPlusPercentage = function (percent) {
        if (this.numControls === null) {
            return null;
        }
    
        var ratio = 1 + percent / 100;
        
        var fastestSplits = new Array(this.numControls + 1);
        fastestSplits[0] = 0;
        
        for (var controlIdx = 1; controlIdx <= this.numControls + 1; controlIdx += 1) {
            var fastestForThisControl = null;
            for (var competitorIdx = 0; competitorIdx < this.allCompetitors.length; competitorIdx += 1) {
                var thisTime = this.allCompetitors[competitorIdx].getSplitTimeTo(controlIdx);
                if (isNotNullNorNaN(thisTime) && (fastestForThisControl === null || thisTime < fastestForThisControl)) {
                    fastestForThisControl = thisTime;
                }
            }
            
            fastestSplits[controlIdx] = fastestForThisControl;
        }
     
        if (!fastestSplits.every(isNotNull)) {
            // We don't have fastest splits for every control, so there was one
            // control that either nobody punched or everybody had a dubious
            // split for.
            
            // Find the blank-ranges of the fastest times.  Include the end
            // of the range in case there are no cumulative times at the last
            // control but there is to the finish.
            var fastestBlankRanges = getBlankRanges(fastestSplits, true);
            
            // Find all blank-ranges of competitors.
            var allCompetitorBlankRanges = [];
            this.allCompetitors.forEach(function (competitor) {
                var competitorBlankRanges = getBlankRanges(competitor.getAllCumulativeTimes(), false);
                competitorBlankRanges.forEach(function (range) {
                    allCompetitorBlankRanges.push({
                        start: range.start,
                        end: range.end,
                        size: range.end - range.start,
                        overallSplit: competitor.getCumulativeTimeTo(range.end) - competitor.getCumulativeTimeTo(range.start)
                    });
                });
            });
            
            // Now, for each blank range of the fastest times, find the
            // size of the smallest competitor blank range that covers it,
            // and then the fastest split among those competitors.
            fastestBlankRanges.forEach(function (fastestRange) {
                var coveringCompetitorRanges = allCompetitorBlankRanges.filter(function (compRange) {
                    return compRange.start <= fastestRange.start && fastestRange.end <= compRange.end + 1;
                });
                
                var minSize = null;
                var minOverallSplit = null;
                coveringCompetitorRanges.forEach(function (coveringRange) {
                    if (minSize === null || coveringRange.size < minSize) {
                        minSize = coveringRange.size;
                        minOverallSplit = null;
                    }
                    
                    if (minOverallSplit === null || coveringRange.overallSplit < minOverallSplit) {
                        minOverallSplit = coveringRange.overallSplit;
                    }
                });
                
                // Assume that the fastest competitor across the range had
                // equal splits for all controls on the range.  This won't
                // always make sense but it's the best we can do.
                if (minSize !== null && minOverallSplit !== null) {
                    for (var index = fastestRange.start + 1; index < fastestRange.end; index += 1) {
                        fastestSplits[index] = minOverallSplit / minSize;
                    }
                }
            });
        }
                
        if (!fastestSplits.every(isNotNull)) {
            // Could happen if the competitors are created from split times and
            // the splits are not complete, and also if nobody punches the
            // final few controls.  Set any remaining missing splits to 3
            // minutes for intermediate controls and 1 minute for the finish.
            for (var index = 0; index < fastestSplits.length; index += 1) {
                if (fastestSplits[index] === null) {
                    fastestSplits[index] = (index === fastestSplits.length - 1) ? 60 : 180;
                }
            }
        }
        
        var fastestCumTimes = new Array(this.numControls + 1);
        fastestSplits.forEach(function (fastestSplit, index) {
            fastestCumTimes[index] = (index === 0) ? 0 : fastestCumTimes[index - 1] + fastestSplit * ratio;
        });

        return fastestCumTimes;
    };

    /**
    * Returns the cumulative times for the competitor with the given index,
    * with any runs of blanks filled in.
    * @param {Number} competitorIndex - The index of the competitor.
    * @return {Array} Array of cumulative times.
    */
    CourseClassSet.prototype.getCumulativeTimesForCompetitor = function (competitorIndex) {
        return fillBlankRangesInCumulativeTimes(this.allCompetitors[competitorIndex].getAllCumulativeTimes());
    };

    /**
    * Compute the ranks of each competitor within their class.
    */
    CourseClassSet.prototype.computeRanks = function () {
        if (this.allCompetitors.length === 0) {
            // Nothing to compute.
            return;
        }
        
        var splitRanksByCompetitor = [];
        var cumRanksByCompetitor = [];
        
        this.allCompetitors.forEach(function () {
            splitRanksByCompetitor.push([]);
            cumRanksByCompetitor.push([]);
        });
        
        d3.range(1, this.numControls + 2).forEach(function (control) {
            var splitsByCompetitor = this.allCompetitors.map(function(comp) { return comp.getSplitTimeTo(control); });
            var splitRanksForThisControl = getRanks(splitsByCompetitor);
            this.allCompetitors.forEach(function (_comp, idx) { splitRanksByCompetitor[idx].push(splitRanksForThisControl[idx]); });
        }, this);
        
        d3.range(1, this.numControls + 2).forEach(function (control) {
            // We want to null out all subsequent cumulative ranks after a
            // competitor mispunches.
            var cumSplitsByCompetitor = this.allCompetitors.map(function (comp, idx) {
                // -1 for previous control, another -1 because the cumulative
                // time to control N is cumRanksByCompetitor[idx][N - 1].
                if (control > 1 && cumRanksByCompetitor[idx][control - 1 - 1] === null) {
                    // This competitor has no cumulative rank for the previous
                    // control, so either they mispunched it or mispunched a
                    // previous one.  Give them a null time here, so that they
                    // end up with another null cumulative rank.
                    return null;
                } else {
                    return comp.getCumulativeTimeTo(control);
                }
            });
            var cumRanksForThisControl = getRanks(cumSplitsByCompetitor);
            this.allCompetitors.forEach(function (_comp, idx) { cumRanksByCompetitor[idx].push(cumRanksForThisControl[idx]); });
        }, this);
        
        this.allCompetitors.forEach(function (comp, idx) {
            comp.setSplitAndCumulativeRanks(splitRanksByCompetitor[idx], cumRanksByCompetitor[idx]);
        });
    };
    
    /**
    * Returns the best few splits to a given control.
    *
    * The number of splits returned may actually be fewer than that asked for,
    * if there are fewer than that number of people on the class or who punch
    * the control.
    *
    * The results are returned in an array of 2-element arrays, with each child
    * array containing the split time and the name.  The array is returned in
    * ascending order of split time.
    *
    * @param {Number} numSplits - Maximum number of split times to return.
    * @param {Number} controlIdx - Index of the control.
    * @return {Array} Array of the fastest splits to the given control.
    */
    CourseClassSet.prototype.getFastestSplitsTo = function (numSplits, controlIdx) {
        if (typeof numSplits !== "number" || numSplits <= 0) {
            throwInvalidData("The number of splits must be a positive integer");
        } else if (typeof controlIdx !== "number" || controlIdx <= 0 || controlIdx > this.numControls + 1) {
            throwInvalidData("Control " + controlIdx + " out of range");
        } else {
            // Compare competitors by split time at this control, and, if those
            // are equal, total time.
            var comparator = function (compA, compB) {
                var compASplit = compA.getSplitTimeTo(controlIdx);
                var compBSplit = compB.getSplitTimeTo(controlIdx);
                return (compASplit === compBSplit) ? d3.ascending(compA.totalTime, compB.totalTime) : d3.ascending(compASplit, compBSplit);
            };
            
            var competitors = this.allCompetitors.filter(function (comp) { return comp.completed() && !isNaNStrict(comp.getSplitTimeTo(controlIdx)); });
            competitors.sort(comparator);
            var results = [];
            for (var i = 0; i < competitors.length && i < numSplits; i += 1) {
                results.push({name: competitors[i].name, split: competitors[i].getSplitTimeTo(controlIdx)});
            }
            
            return results;
        }
    };    

    /**
    * Return data from the current classes in a form suitable for plotting in a chart.
    * @param {Array} referenceCumTimes - 'Reference' cumulative time data, such
    *            as that of the winner, or the fastest time.
    * @param {Array} currentIndexes - Array of indexes that indicate which
    *           competitors from the overall list are plotted.
    * @param {Object} chartType - The type of chart to draw.
    * @returns {Object} Array of data.
    */
    CourseClassSet.prototype.getChartData = function (referenceCumTimes, currentIndexes, chartType) {
        if (typeof referenceCumTimes === "undefined") {
            throw new TypeError("referenceCumTimes undefined or missing");
        } else if (typeof currentIndexes === "undefined") {
            throw new TypeError("currentIndexes undefined or missing");
        } else if (typeof chartType === "undefined") {
            throw new TypeError("chartType undefined or missing");
        }

        var competitorData = this.allCompetitors.map(function (comp) { return chartType.dataSelector(comp, referenceCumTimes); });
        var selectedCompetitorData = currentIndexes.map(function (index) { return competitorData[index]; });

        var xMin = d3.min(referenceCumTimes);
        var xMax = d3.max(referenceCumTimes);
        var yMin;
        var yMax;
        if (currentIndexes.length === 0) {
            // No competitors selected.  
            if (this.isEmpty()) {
                // No competitors at all.  Make up some values.
                yMin = 0;
                yMax = 60;
            } else {
                // Set yMin and yMax to the boundary values of the first competitor.
                var firstCompetitorTimes = competitorData[0];
                yMin = d3.min(firstCompetitorTimes);
                yMax = d3.max(firstCompetitorTimes);
            }
        } else {
            yMin = d3.min(selectedCompetitorData.map(function (values) { return d3.min(values); }));
            yMax = d3.max(selectedCompetitorData.map(function (values) { return d3.max(values); }));
        }

        if (Math.abs(yMax - yMin) < 1e-8) {
            // yMin and yMax will be used to scale a y-axis, so we'd better
            // make sure that they're not equal, optionally give-or-take some
            // floating-point noise.
            yMax = yMin + 1;
        }
        
        var controlIndexAdjust = (chartType.skipStart) ? 1 : 0;
        var dubiousTimesInfo = currentIndexes.map(function (competitorIndex) {
            var indexPairs = chartType.indexesAroundDubiousTimesFunc(this.allCompetitors[competitorIndex]);
            return indexPairs.filter(function (indexPair) { return indexPair.start >= controlIndexAdjust; })
                             .map(function (indexPair) { return { start: indexPair.start - controlIndexAdjust, end: indexPair.end - controlIndexAdjust }; });
        }, this);

        var cumulativeTimesByControl = d3.transpose(selectedCompetitorData);
        var xData = (chartType.skipStart) ? referenceCumTimes.slice(1) : referenceCumTimes;
        var zippedData = d3.zip(xData, cumulativeTimesByControl);
        var competitorNames = currentIndexes.map(function (index) { return this.allCompetitors[index].name; }, this);
        return {
            dataColumns: zippedData.map(function (data) { return { x: data[0], ys: data[1] }; }),
            competitorNames: competitorNames,
            numControls: this.numControls,
            xExtent: [xMin, xMax],
            yExtent: [yMin, yMax],
            dubiousTimesInfo: dubiousTimesInfo
        };
    };
    
    SplitsBrowser.Model.CourseClassSet = CourseClassSet;
})();