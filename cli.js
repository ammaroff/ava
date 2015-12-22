#!/usr/bin/env node
'use strict';

var debug = require('debug')('ava');

// Prefer the local installation of AVA.
var resolveCwd = require('resolve-cwd');
var localCLI = resolveCwd('ava/cli');

if (localCLI && localCLI !== __filename) {
	debug('Using local install of AVA.');
	require(localCLI);
	return;
}

if (debug.enabled) {
	require('time-require');
}

var logUpdate = require('log-update');
var arrify = require('arrify');
var meow = require('meow');
var updateNotifier = require('update-notifier');
var chalk = require('chalk');
var Promise = require('bluebird');
var log = require('./lib/logger');
var tap = require('./lib/tap');
var Api = require('./api');

// Bluebird specific
Promise.longStackTraces();

var cli = meow([
	'Usage',
	'  ava [<file|folder|glob> ...]',
	'',
	'Options',
	'  --init       Add AVA to your project',
	'  --fail-fast  Stop after first test failure',
	'  --serial     Run tests serially',
	'  --require    Module to preload (Can be repeated)',
	'  --tap        Generate TAP output',
	'',
	'Examples',
	'  ava',
	'  ava test.js test2.js',
	'  ava test-*.js',
	'  ava --init',
	'  ava --init foo.js',
	'',
	'Default patterns when no arguments:',
	'test.js test-*.js test/*.js'
], {
	string: [
		'_',
		'require'
	],
	boolean: [
		'fail-fast',
		'serial',
		'tap'
	]
});

updateNotifier({pkg: cli.pkg}).notify();

if (cli.flags.init) {
	require('ava-init')();
	return;
}

if (cli.flags.tap) {
	console.log(tap.start());
}

var api = new Api(cli.input, {
	failFast: cli.flags.failFast,
	serial: cli.flags.serial,
	require: arrify(cli.flags.require)
});

var passCount = 0;
var failCount = 0;

api.on('test', function (test) {
	if (cli.flags.tap) {
		console.log(tap.test(test));
		return;
	}

	if (test.error) {
		failCount++;
	} else {
		passCount++;
	}

	var status = '\n';

	if (passCount > 0) {
		status += '  ' + chalk.green(passCount + ' passed');
	}

	if (failCount > 0) {
		status += '  ' + chalk.red(failCount + ' failed');
	}

	logUpdate.stderr(status);
});

api.on('error', function (data) {
	if (cli.flags.tap) {
		console.log(tap.unhandledError(data));
		return;
	}
});

api.run()
	.then(function () {
		if (cli.flags.tap) {
			console.log(tap.finish(api.passCount, api.failCount, api.rejectionCount, api.exceptionCount));
		} else {
			logUpdate.stderr.done();
			log.write();

			if (api.rejectionCount > 0) {
				log.writelpad(chalk.red(api.rejectionCount + ' rejections'));
			}

			if (api.exceptionCount > 0) {
				log.writelpad(chalk.red(api.exceptionCount + ' exceptions'));
			}

			if (api.rejectionCount > 0 || api.exceptionCount > 0) {
				log.write();
			}

			if (api.failCount > 0 || api.rejectionCount > 0 || api.exceptionCount > 0) {
				log.errors(api.errors);
			}
		}

		process.stdout.write('');
		flushIoAndExit(api.failCount > 0 || api.rejectionCount > 0 || api.exceptionCount > 0 ? 1 : 0);
	})
	.catch(function (err) {
		log.error(err.message);
		flushIoAndExit(1);
	});

function flushIoAndExit(code) {
	// TODO: figure out why this needs to be here to
	// correctly flush the output when multiple test files
	process.stdout.write('');
	process.stderr.write('');

	// timeout required to correctly flush IO on Node.js 0.10 on Windows
	setTimeout(function () {
		process.exit(code);
	}, process.env.AVA_APPVEYOR ? 500 : 0);
}
