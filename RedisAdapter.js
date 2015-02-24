'use strict';

var Adapter = require('socket.io-adapter');
var msgpack = require('msgpack-js');
var Emitter = require('events').EventEmitter;
var async = require('async');
var debug = require('debug')('socket.io-redis');

/**
 * Adapter constructor.
 *
 * Will only be instanciated one time
 * @param {String} namespace instance
 * @api public
 */
function RedisAdapter(uid, prefix, pub, sub, namespace) {
  Adapter.call(this, namespace);
  this.uid = uid;
  this.prefix = prefix;
  this.pubClient = pub;
  this.subClient = sub;
  this.onmessage = this.onmessage.bind(this);
  this._subscribe();
}

/**
 * Inherits from `Adapter`.
 */
RedisAdapter.prototype.__proto__ = Adapter.prototype;

RedisAdapter.prototype._subscribe = function () {
  this.subClient.subscribe(this.prefix + '#' + this.nsp.name + '#', function onSubscribe(err) {
    if (err) this.emit('error', err);
  }.bind(this));
  this.subClient.on('message', this.onmessage);
};

/**
 * Dispose everything related to the adapter
 * @return {[type]} [description]
 */
RedisAdapter.prototype.dispose = function () {
  debug('disposing adapter');
  this.nsp = null;
  this.subClient.removeListener('message', this.onmessage);
  this.subClient = null;
  this.pubClient = null;
  this.rooms = {};
  this.sids = {};
};


/**
 * Called with a subscription message
 *
 * @api private
 */

RedisAdapter.prototype.onmessage = function (channel, msg) {
  var pieces = channel.split('#');
  var args = msgpack.decode(msg);
  var packet;

  if (this.uid == args.shift()) return debug('ignore same uid');

  packet = args[0];

  if (packet && packet.nsp === undefined) {
    packet.nsp = '/';
  }

  if (!packet || packet.nsp != this.nsp.name) {
    return debug('ignore different namespace');
  }

  args.push(true);

  this.broadcast.apply(this, args);
};

/**
 * Broadcasts a packet.
 *
 * @param {Object} packet to emit
 * @param {Object} options
 * @param {Boolean} whether the packet came from another node
 * @api public
 */

RedisAdapter.prototype.broadcast = function (packet, opts, remote) {
  Adapter.prototype.broadcast.call(this, packet, opts);
  if (!remote) {
    if (opts.rooms) {
      opts.rooms.forEach(function (room) {
        var chn = this.prefix + '#' + packet.nsp + '#' + room + '#';
        var msg = msgpack.encode([this.uid, packet, opts]);
        this.pubClient.publish(chn, msg);
      }, this);
    } else {
      var chn = this.prefix + '#' + packet.nsp + '#';
      var msg = msgpack.encode([this.uid, packet, opts]);
      this.pubClient.publish(chn, msg);
    }
  }
};

/**
 * Subscribe client to room messages.
 *
 * @param {String} client id
 * @param {String} room
 * @param {Function} callback (optional)
 * @api public
 */

RedisAdapter.prototype.add = function (id, room, fn) {
  debug('adding %s to %s ', id, room);
  this.sids[id] = this.sids[id] || {};
  this.sids[id][room] = true;
  this.rooms[room] = this.rooms[room] || {};
  this.rooms[room][id] = true;
  var channel = this.prefix + '#' + this.nsp.name + '#' + room + '#';
  this.subClient.subscribe(channel, function (err) {
    if (err) {
      this.emit('error', err);
      if (fn) fn(err);
      return;
    }
    if (fn) fn(null);
  }.bind(this));
};

/**
 * Unsubscribe client from room messages.
 *
 * @param {String} session id
 * @param {String} room id
 * @param {Function} callback (optional)
 * @api public
 */

RedisAdapter.prototype.del = function (id, room, fn) {
  debug('removing %s from %s', id, room);

  this.sids[id] = this.sids[id] || {};
  this.rooms[room] = this.rooms[room] || {};
  delete this.sids[id][room];
  delete this.rooms[room][id];

  if (this.rooms.hasOwnProperty(room) && !Object.keys(this.rooms[room]).length) {
    delete this.rooms[room];
    var channel = this.prefix + '#' + this.nsp.name + '#' + room + '#';
    this.subClient.unsubscribe(channel, function (err) {
      if (err) {
        this.emit('error', err);
        if (fn) fn(err);
        return;
      }
      if (fn) fn(null);
    });
  } else {
    if (fn) process.nextTick(fn.bind(null, null));
  }
};

/**
 * Unsubscribe client completely.
 *
 * @param {String} client id
 * @param {Function} callback (optional)
 * @api public
 */

RedisAdapter.prototype.delAll = function (id, fn) {
  debug('removing %s from all rooms', id);

  var rooms = this.sids[id];

  if (!rooms) return process.nextTick(fn.bind(null, null));

  async.forEach(Object.keys(rooms), function (room, next) {
    if (rooms.hasOwnProperty(room)) {
      delete this.rooms[room][id];
    }

    if (this.rooms.hasOwnProperty(room) && !Object.keys(this.rooms[room]).length) {
      delete this.rooms[room];
      var channel = this.prefix + '#' + this.nsp.name + '#' + room + '#';
      return this.subClient.unsubscribe(channel, function (err) {
        if (err) return this.emit('error', err);
        next();
      }.bind(this));
    } else {
      process.nextTick(next);
    }
  }.bind(this), function (err) {
    if (err) {
      this.emit('error', err);
      if (fn) fn(err);
      return;
    }
    delete this.sids[id];
    if (fn) fn(null);
  }.bind(this));
};

module.exports = RedisAdapter;
