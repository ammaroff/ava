'use strict';
var prettyMs = require('pretty-ms');
var figures = require('figures');
var Squeak = require('squeak');
var chalk = require('chalk');
var plur = require('plur');
var log = new Squeak({separator: ' '});
var x = module.exports;

function beautifyStack(stack) {
	var re = /(?:^(?! {4}at\b).{6})|(?:\((?:[A-Z]:)?(?:[\\\/](?:(?!node_modules[\\\/]ava[\\\/])[^:\\\/])+)+:\d+:\d+\))/;
	var found = false;

	return stack.split('\n').filter(function (line) {
		var relevant = re.test(line);
		found = found || relevant;
		return !found || relevant;
	}).join('\n');
}

x._beautifyStack = beautifyStack;

log.type('success', {
	color: 'green',
	prefix: figures.tick
});

log.type('error', {
	color: 'red',
	prefix: figures.cross
});

x.write = log.write.bind(log);
x.writelpad = log.writelpad.bind(log);
x.success = log.success.bind(log);
x.error = log.error.bind(log);

x.errors = function (tests) {
	var i = 0;

	tests.forEach(function (test) {
		i++;

		var title = test.error ? (i + '.' + test.title) : 'Unhandled Error';
		var description = test.error ? beautifyStack(test.error.stack) : JSON.stringify(test);

		log.writelpad(chalk.red(title));
		log.writelpad(chalk.red(description));
		log.write();
	});
};
