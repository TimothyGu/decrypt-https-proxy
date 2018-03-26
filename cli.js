#!/usr/bin/env node
'use strict';

const { URL } = require('url');

const portfinder = require('portfinder');
const yargs = require('yargs');

const HTTPSToHTTPProxyServer = require('./index.js');

const argv =
  yargs
    .usage('$0 -ua <https-address> [-up <https-port>] [-la <http-address>] [-lp <http-port>]')
    .option('ua', {
      alias: 'upstream-address',
      describe: 'Upstream HTTPS address',
      demandOption: true,
      requiresArg: true,
      type: 'string'
    })
    .option('up', {
      alias: 'upstream-port',
      describe: 'Upstream HTTPS port',
      requiresArg: true,
      default: 443,
      type: 'number'
    })
    .option('la', {
      alias: 'local-address',
      describe: 'Local HTTP listening address',
      requiresArg: true,
      default: '0.0.0.0',
      type: 'string'
    })
    .option('lp', {
      alias: 'local-port',
      describe: 'Local HTTP listening port',
      requiresArg: true,
      default: `first available port after ${portfinder.basePort}`,
      type: 'number'
    })
    .option('q', {
      alias: 'quiet',
      describe: 'Print minimal information',
      type: 'boolean'
    })
    .option('s', {
      alias: 'silent',
      describe: 'Print no information',
      type: 'boolean',
      implies: 'quiet'
    })
    .argv;

// argv.localPort defaults to a string.
if (typeof argv.localPort === 'number' && Number.isNaN(argv.localPort) ||
    Number.isNaN(argv.upstreamPort)) {
  throw new TypeError('Port must be a number')
}

const portPromise =
  typeof argv.localPort === 'number' ?
    Promise.resolve(argv.localPort) :
    portfinder.getPortPromise();

const server = new HTTPSToHTTPProxyServer({
  host: argv.upstreamAddress,
  port: argv.upstreamPort
});
// Error handler must be specified regardless of --silent, since if not the
// process would crash upon receiving a pipe error.
server.on('error', err => {
  console.error(err.stack || err.message || err);
});
if (!argv.quiet) {
  server.on('proxyConnectionStart', id => {
    console.log(`connect ${id}`);
  });
  server.on('proxyConnectionEstablished', (id, dur) => {
    console.log(`connected ${id}: ${dur / 1000}`);
  });
  server.on('proxyConnectionEnded', id => {
    console.log(`finished ${id}`);
  });
}

portPromise.then(port => {
  server.listen(port, argv.localAddress, () => {
    let { address, port } = server.address();
    address = address === '0.0.0.0' ? '127.0.0.1' : address;
    if (!argv.silent) {
      console.info(`Listening on http://${address}:${port}`);
    }
  });
});
