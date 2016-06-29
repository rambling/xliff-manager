var fs = require('fs');
var path = require('path');
var argv = require('argv');
var xml2js = require('xml2js');
var Promise = require('promise');
var parser = new xml2js.Parser();
var builder = new xml2js.Builder();


function getCommandLineParameter() {
    argv.option([{
        name: 'target',
        short: 't',
        type: 'path',
        description: 'Target xliff file (will be translate)'
    }, {
        name: 'source',
        short: 's',
        type: 'path',
        description: 'Translation xliff file (has translation)'
    }, ]);

    var args = argv.run();

    if (!args.options.target || !args.options.source) {
        argv.help();
        args = null;
    }

    return args;
}

var args;
var targetXliff, sourceXliff;
var targetXliffJson, sourceXliffJson;

var promise = new Promise(function(resolve, reject) {
        // get command line parameter
        args = getCommandLineParameter();

        if (!args) reject("Require options.");
        else resolve();
    })
    .then(function() {
        console.log('read : ' + args.options.target);
        targetXliff = fs.readFileSync(args.options.target, 'utf-8');
        console.log('read : ' + args.options.source);
        sourceXliff = fs.readFileSync(args.options.source, 'utf-8');
    })
    .then(function() {
        console.log('parse xliff to json - ' + path.basename(args.options.target));
        parser.parseString(targetXliff, function(err, result) {
            if (err) {
                console.error('Fail to parse source xliff.');
                console.error(err);
                process.exit(-1);
            }
            targetXliffJson = result;
        });
    })
    .then(function() {
        console.log('parse xliff to json - ' + path.basename(args.options.source));
        parser.parseString(sourceXliff, function(err, result) {
            if (err) {
                console.error('Fail to parse source xliff.');
                console.error(err);
                process.exit(-1);
            }
            sourceXliffJson = result;
        });
    })
    .then(function() {
        //console.log(JSON.stringify(targetXliffJson));
    })
    .then(function() {
        console.log('merge....');
        // merge translation
        var files = targetXliffJson.xliff.file; // files <-- locales

        files.forEach(function(file, fileIndex) {
            var locale = file.$['target-language'];
            var body = file.body;
            var transUnits = body[0]['trans-unit'];

            transUnits.forEach(function(transUnit, transUnitindex) {
                var source = transUnit.source[0];
                var translation = getTranslation(locale, source);
                // get translation
                console.log(locale + ' : ' + source + ' - ' + translation);

                if (translation) {
                    targetXliffJson.xliff.file[fileIndex].body[0]['trans-unit'][transUnitindex].target[0] = translation;
                }
            });
        });
    })
    .then(function() {
        console.log('write output');

        var outXml = builder.buildObject(targetXliffJson);

        fs.writeFile(__dirname + '/out.xml', outXml, function(err, result) {
            if (err) console.error(err);
            console.log(result);
        });
    })
    .catch(function(err) {
        console.error(err);
    });


function getTranslation(locale, source) {
    var localeMatchedFiles = [];
    var files = sourceXliffJson.xliff.file;
    var detected = false;
    var translation = null;

    files.forEach(function(file, index) {
        if (locale == file.$['target-language']) {
            localeMatchedFiles.push(index);
        }
    });

    localeMatchedFiles.forEach(function(idx, index) {
        if (detected) return;

        files[idx].body[0]['trans-unit'].forEach(function(transUnit, transUnitIndex) {
            if (detected) return;

            if (transUnit.source[0] === source) {
                detected = true;
                translation = transUnit.target[0];
            }
        });
    });

    return translation;
}
