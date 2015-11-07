'use strict';
/**
 * Module dependencies.
 */

var uid2 = require('uid2');
var redis = require('ioredis');

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

  if ('object' == typeof uri) {
    opts = uri;
    uri = null;
  }

  var pub = opts.pubClient;
  var sub = opts.subClient;
  var prefix = opts.key || 'socket.io';

  // init clients if needed
  if (!pub) {
    pub = uri ? new redis(uri, opts) : new redis(opts);
  }
  if (!sub) {
    sub = uri ? new redis(uri, opts) : new redis(opts);
  }

  // Handle redis errors.
  if( opts.on_redis_error ){
    sub.on('error',opts.on_redis_error);
    pub.on('error',opts.on_redis_error);
  }
  // this server's key
  var uid = uid2(6);

  return RedisAdapter.bind(null, uid, prefix, pub, sub);
}
