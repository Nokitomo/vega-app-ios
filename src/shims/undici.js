'use strict';

const g = global;

function unsupported() {
  throw new Error('undici is not supported in React Native.');
}

const fetchFn = typeof g.fetch === 'function' ? g.fetch.bind(g) : unsupported;

module.exports = {
  fetch: fetchFn,
  request: unsupported,
  stream: unsupported,
  pipeline: unsupported,
  connect: unsupported,
  upgrade: unsupported,
  dispatch: unsupported,
  setGlobalDispatcher() {},
  getGlobalDispatcher() {
    return undefined;
  },
  Headers: g.Headers,
  Request: g.Request,
  Response: g.Response,
  FormData: g.FormData,
  File: g.File,
  Blob: g.Blob,
  WebSocket: g.WebSocket,
};

module.exports.default = module.exports;
