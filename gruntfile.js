/*
 *  SplitsBrowser - Grunt configuration.
 *  
 *  Copyright (C) 2000-2019 Dave Ryder, Reinhard Balling, Andris Strazdins,
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
module.exports = function(grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            options: {
                separator: '\n\n',
                stripBanners: true,
                banner: grunt.file.read('banner.txt')
            },
            data: {
                src: ['js/core.js',
                      'js/util.js',
                      'js/time.js',
                      'js/competitor.js',
                      'js/course-class.js',
                      'js/course.js',
                      'js/event.js',
                      'js/csv-reader.js',
                      'js/oe-reader.js',
                      'js/html-reader.js',
                      'js/alternative-csv-reader.js',
                      'js/iof-xml-reader.js',
                      'js/input.js'
                ],
                dest: '<%= pkg.name %>.data.js',
                nonull: true
            },
            dist: {
                src: ['js/core.js',
                      'js/messages.js',
                      'js/util.js',
                      'js/time.js',
                      'js/competitor.js',
                      'js/course-class.js',
                      'js/course-class-set.js',
                      'js/course.js',
                      'js/event.js',
                      'js/chart-types.js',
                      'js/competitor-selection.js',
                      'js/data-repair.js',
                      'js/csv-reader.js',
                      'js/oe-reader.js',
                      'js/html-reader.js',
                      'js/alternative-csv-reader.js',
                      'js/iof-xml-reader.js',
                      'js/input.js',
                      'js/competitor-list.js',
                      'js/language-selector.js',
                      'js/class-selector.js',
                      'js/comparison-selector.js',
                      'js/statistics-selector.js',
                      'js/chart-type-selector.js',
                      'js/original-data-selector.js',
                      'js/chart-popup-data.js',
                      'js/chart-popup.js',
                      'js/chart.js',
                      'js/results-table.js',
                      'js/query-string.js',
                      'js/warning-viewer.js',
                      'js/viewer.js'
                ],
                dest: '<%= pkg.name %>.js',
                nonull: true
            }
        },    
        uglify: {
            options: {
				banner: grunt.file.read("banner.txt"),
				output: {
					"ascii_only": true,
					"max_line_len": 32767,
					comments: "some"
				}
            },
            dist: {
                files: {
                    '<%= pkg.name %>.min.js': ['<%= pkg.name %>.js']
                }
            },
            data: {
                files: {
                    '<%= pkg.name %>.data.min.js': ['<%= pkg.name %>.data.js']
                }
            }
        },
        copy: {
            minjs: {
                files: [
                    { src: 'splitsbrowser*.min.js', dest: '../solv_website/static/js/' }
                ]
            }
        },
        qunit: {
            src: ['qunit-tests.html'],
            languages: ['qunit-languages-tests.html'],
            minified: ['qunit-tests-min.html'],
            "minified-data": ['qunit-tests-data-min.html']
        },
        jshint: {
            files: ['gruntfile.js', 'js/*.js', 'test/*.js'],
            options: {
                // options here to override JSHint defaults
                plusplus: true,
                eqeqeq: true,
                undef: true,
                unused: true,
                camelcase: true,
                curly: true,
                es3: true,
                forin: true,
                immed: true,
                indent: 4,
                globals: {
                    "$": false,
                    d3: false,
                    window: false,
                    document: false,
                    setTimeout: false,
                    clearTimeout: false,
                    alert: false,
                    SplitsBrowser: true,
                  
                    // QUnit globals
                    QUnit: false,
                    module: false,
                    expect: false,
                  
                    // Test namespace.
                    SplitsBrowserTest: true,
                    
                    // Required for PhantomJS polyfill in tests.
                    HTMLElement: false
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-qunit');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-copy');

    grunt.registerTask('deploy', ['concat', 'uglify:data', 'uglify:dist', 'copy:minjs']);
    grunt.registerTask('test', ['jshint', 'qunit:src', 'qunit:languages']);
    grunt.registerTask('data', ['jshint', 'qunit:src', 'concat:data', 'uglify:data', 'qunit:minified-data']);
    grunt.registerTask('default', ['jshint', 'qunit:src', 'qunit:languages', 'concat:dist', 'uglify:dist', 'qunit:minified']);
    grunt.registerTask('all', ['jshint', 'qunit:src', 'qunit:languages', 'concat:dist', 'uglify:dist', 'qunit:minified', 'concat:data', 'uglify:data', 'qunit:minified-data']);
};