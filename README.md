# socket.io-redis

[![Build Status](https://travis-ci.org/Automattic/socket.io-redis.svg?branch=master)](https://travis-ci.org/Automattic/socket.io-redis)
[![NPM version](https://badge.fury.io/js/socket.io-redis.svg)](http://badge.fury.io/js/socket.io-redis)

## How to use

```js
var io = require('socket.io')(3000);
var redis = require('socket.io-redis');
io.adapter(redis({ host: 'localhost', port: 6379 }));
```

By running socket.io with the `socket.io-redis` adapter you can run
multiple socket.io instances in different processes or servers that can
all broadcast and emit events to and from each other.

If you need to emit events to socket.io instances from a non-socket.io
process, you should use [socket.io-emitter](https:///github.com/Automattic/socket.io-emitter).

## API

### adapter(uri[, opts])

`uri` is a string like `localhost:6379` where your redis server
is located. For a list of options see below.

### adapter(opts)

The following options are allowed:

- `pubClient`: optional, the redis client to publish events on
- `subClient`: optional, the redis client to subscribe to events on
- `on_redis_error`: optional, callback for redis errors

see https://github.com/luin/ioredis/blob/master/API.md#new-redisport-host-options for other options. The uri/options are passed straight into ioredis, if clients
aren't explicitly passed in.


If you decide to supply `pubClient` and `subClient`, make sure you use
[ioredis](https://github.com/luin/ioredis) as a client or one
with an equivalent API.

### RedisAdapter

The redis adapter instances expose the following properties
that a regular `Adapter` does not

- `uid`
- `prefix`
- `pubClient`
- `subClient`

## Client error handling

Access the `pubClient` and `subClient` properties of the
Redis Adapter instance to subscribe to its `error` event:

```js
var redis = require('socket.io-redis');
var adapter = adapter('localhost:6379');
adapter.pubClient.on('error', function(){});
adapter.subClient.on('error', function(){});
```

Optionally, pass the `on_redis_error` option, which is
equivalent to:

```js
adapter.pubClient.on('error', opts.on_redis_error);
adapter.subClient.on('error', opts.on_redis_error);
```


## License

MIT
