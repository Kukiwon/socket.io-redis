'use strict';
/**
 * Module dependencies.
 */

var uid2 = require('uid2');
var redis = require('redis').createClient;
var RedisAdapter = require('./RedisAdapter');
/**
 * Module exports.
 */

module.exports = adapter;

/**
 * Returns a redis Adapter class.
 *
 * @param {String} optional, redis uri
 * @return {RedisAdapter} adapter
 * @api public
 */

function adapter(uri, opts) {
  opts = opts || {};

  // handle options only
  if ('object' == typeof uri) {
    opts = uri;
    uri = null;
  }

  // handle uri string
  if (uri) {
    uri = uri.split(':');
    opts.host = uri[0];
    opts.port = uri[1];
  }

  // opts
  var host = opts.host || '127.0.0.1';
  var port = Number(opts.port || 6379);
  var pub = opts.pubClient;
  var sub = opts.subClient;
  var prefix = opts.key || 'socket.io';

  // init clients if needed
  if (!pub) pub = redis(port, host);
  if (!sub) sub = redis(port, host, {
    return_buffers: true
  });

  // Handle redis errors.
  if( opts.on_redis_error ){
    sub.on('error',opts.on_redis_error);
    pub.on('error',opts.on_redis_error);
  }
  // this server's key
  var uid = uid2(6);

  return RedisAdapter.bind(null, uid, prefix, pub, sub);
}
