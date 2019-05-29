# shrubbery

Shrubbery provides a simple, async, map based plugin/hook registry. You can
[add](#add), [remove](#remove), and [exec](#exec) plugins/hooks.

## Installation

The plugin is released in the public npm registry and can be installed by
running:

```bash
npm install --save shrubbery
```

## Usage

The module expose our `shrubbery` function. The function accepts the following
arguments:

- `mapping` A object that contains the `Map()` instances we should use.
- `options` Options to configure the behavior of the returned methods.
  - `context` The `this` value for the plugin functions.
  - `timeout` Default timeout applied to the each plugin.
  - `error` A global error handler for when plugin fails to execute, if none
    is provided our `exec` function would re-throw the captured errors.

```js
import shrubbery from 'shrubbery';

const pluginAPI = shrubbery({
  foo: new Map(),
  bar: new Map()
}, { /* options here */ })
```

If you don't want to provide references to the maps, and want to generate
those on the fly, that is also possible.

```js
const pluginAPI = shrubbery();
const pluginAPI = shrubbery({});
```

We generate maps automatically if they do not exist. The returned plugin API
has the following methods:

- [add](#add)
- [remove](#remove)
- [exec](#exec)

### add

Adds a new plugin to a given map. The function accepts the following arguments:

- `name` The name of the map, should be the name of the maps you provided to
  the `shrubbery` function. If the name does not exist, it will be created.
- `key` The key we should store the function under.
- `fn` The actual plugin function, we assume that this is an **async** function
  or a function that returns a `promise`.
- `options` Additional plugin configuration
  - `priority` Allows you to control the order of execution. Defaults to 100.
    The highest value will be executed first, and lowest as last.
  - `timeout` Time in milliseconds (or as human readable string) that the
    function is allowed to execute. We will forcefully reject if the function
    takes longer. Defaults to `20 seconds`.

```js
const pluginAPI = shrubbery({ foo: new Map() });

pluginAPI.add('foo', 'bar', async function () {});

//
// This function will execute before the function that we specified above while
// it was specified later. This is because it has a higher priority.
//
pluginAPI.add('foo', 'bar', async function () {}, {
  priority: 101
});

//
// Will create a new map, as `wut` was not specified in our shrubbery.
//
plugin.add('wut', 'bar', async function () {

});
```

### remove

Removes a previously registered function, or all functions for a given key. The
function accepts the following arguments:

- `name` The name of the map, should be the name of the maps you provided to
  the `shrubbery` function. If the name does not exist, it will be created.
- `key` The key we should stored the function under.
- `fn` The actual plugin function. All identical functions will be removed. If
  no function is supplied we will remove **all** functions for the given `key`.

```js
const pluginAPI = shrubbery({ foo: new Map() });

async function foo() {}
async function bar() {}

pluginAPI.add('foo', 'bar', foo);
pluginAPI.add('foo', 'bar', bar);

//
// Remove the foo function, this means that our `bar` function
// can still be executed.
//
pluginAPI.remove('foo', 'bar', foo);

//
// Every function is now removed.
//
pluginAPI.remove('foo', 'bar');
```

### exec

Executes all the function that are specified a given map/key combination. The
function accepts the following arguments:

- `name` The name of the map, should be the name of the maps you provided to
  the `shrubbery` function. If the name does not exist, it will be created.
- `key` The key who's function should be executed.
- `data` The data that should be passed to each function. This is data a plugin
  can modify. Each modification will be accessible by the next function. When
  a plugin returns a different value, it will be used as new `data` source.
  Once all functions are executed the final result will be returned. You can
  basically see each plugin function as an async map operation.
- `...args` The rest arguments that are always passed to the plugin, not
  intended to be modified, and also not returned.

```js
const example = {};
const pluginAPI = shrubbery({}, {
  context: example
});

pluginAPI.add('example', 'modify', async function (data, options) {
  console.log(options);               // { options: 'here', priority: 9000 }
  console.log(this === example);      // true

  data.bar = 'wat';
}, { options: 'here', priority: 9000 });

pluginAPI.add('example', 'modify', async function (data) {
  console.log(data);                  // { foo: 'bar', bar: 'wat' }

  return 'different';
});

const result = await pluginAPI.exec('example', 'modify', { foo: 'bar' });
console.log(result);                  // `different`
```

## License

[MIT](LICENSE)
