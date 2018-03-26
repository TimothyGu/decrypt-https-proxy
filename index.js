'use strict';

const { connect: tlsConnect } = require('tls');
const { Server: TCPServer } = require('net');
const pump = require('pump');

const tlsOptions = Symbol('tlsOptions');
const onConnection = Symbol('onConnection');
const nextID = Symbol('nextID');

const HTTPSToHTTPProxyServer = class HTTPSToHTTPProxyServer extends TCPServer {
  constructor(options) {
    super();
    if (typeof options !== 'object') {
      throw new TypeError('Options must be an object');
    }
    if (typeof options.host !== 'string') {
      throw new TypeError('Upstream server host must be a string');
    }
    if (typeof options.port !== 'number') {
      throw new TypeError('Upstream server port must be a port');
    }
    this[tlsOptions] = {
      host: options.host,
      port: options.port,
      session: undefined
    };
    this[nextID] = 0;
    this.on('connection', this[onConnection].bind(this));
  }

  [onConnection](tcpSocket) {
    const id = this[nextID]++;
    this.emit('proxyConnectionStart', id);
    const start = Date.now();
    const tlsSocket = tlsConnect(this[tlsOptions], () => {
      this.emit('proxyConnectionEstablished', id, Date.now() - start);
      this[tlsOptions].session = tlsSocket.getSession();
    });
    pump(tlsSocket, tcpSocket, err => {
      this.emit('proxyConnectionEnded', id);
      if (err) {
        this.emit('error', err);
      }
    });
    tcpSocket.pipe(tlsSocket);
  }
};

module.exports = HTTPSToHTTPProxyServer;
