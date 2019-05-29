const { describe, it } = require('mocha');
const ms = require('millisecond');
const assume = require('assume');
const shrubbery = require('./');

describe('shrubbery', function () {
  async function foo() {}
  async function bar() {}
  async function baz() {}

  it('is exported as a function', function () {
    assume(shrubbery).is.a('function');
  });

  it('returns the plugin API', function () {
    const shrub = shrubbery();

    assume(shrub).is.length(3);
    assume(shrub.exec).is.a('asyncfunction');
    assume(shrub.add).is.a('function');
    assume(shrub.remove).is.a('function');
  });

  describe('#add', function () {
    it('adds the function to the specified map', function () {
      const map = new Map();
      const shrub = shrubbery({ map });

      shrub.add('map', 'example', foo);

      const example = map.get('example');

      assume(example).is.a('array');
      assume(example).is.length(1);
      assume(example[0].fn).equals(foo);
      assume(example[0].runner).is.a('function');
      assume(example[0].priority).equals(100);
    });

    it('creates its own map if none is found', function () {
      const maps = {};
      const shrub = shrubbery(maps);

      shrub.add('map', 'example', foo);

      assume(maps.map).is.a('map');

      const example = maps.map.get('example');

      assume(example).is.a('array');
      assume(example).is.length(1);
      assume(example[0].fn).equals(foo);
      assume(example[0].runner).is.a('function');
      assume(example[0].priority).equals(100);
    });

    it('adds multiple functions', function () {
      const map = new Map();
      const shrub = shrubbery({ map });

      shrub.add('map', 'example', foo);
      shrub.add('map', 'example', bar);

      const example = map.get('example');

      assume(example).is.a('array');
      assume(example).is.length(2);

      assume(example[0].fn).equals(foo);
      assume(example[0].runner).is.a('function');
      assume(example[0].priority).equals(100);

      assume(example[1].fn).equals(bar);
      assume(example[1].runner).is.a('function');
      assume(example[1].priority).equals(100);
    });

    it('sorts the functions based on priority', function () {
      const map = new Map();
      const shrub = shrubbery({ map });

      shrub.add('map', 'example', foo, { priority: 90 });
      shrub.add('map', 'example', bar, { priority: 120 });
      shrub.add('map', 'example', baz);

      const example = map.get('example');

      assume(example).is.a('array');
      assume(example).is.length(3);

      assume(example[0].fn).equals(bar);
      assume(example[0].runner).is.a('function');
      assume(example[0].priority).equals(120);

      assume(example[1].fn).equals(baz);
      assume(example[1].runner).is.a('function');
      assume(example[1].priority).equals(100);

      assume(example[2].fn).equals(foo);
      assume(example[2].runner).is.a('function');
      assume(example[2].priority).equals(90);
    });

    it('applies the default timeout', function () {
      const map = new Map();
      const shrub = shrubbery({ map });

      async function delay() {}

      shrub.add('map', 'example', delay);

      const example = map.get('example');
      assume(example[0].runner).is.a('function');
      assume(example[0].runner.timeout).equals(ms('20 seconds'));
    });

    it('applies the fn.timeout to the runner', function () {
      const map = new Map();
      const shrub = shrubbery({ map });

      async function delay() {}
      delay.timeout = '2 seconds';

      shrub.add('map', 'example', delay);

      const example = map.get('example');
      assume(example[0].runner).is.a('function');
      assume(example[0].runner.timeout).equals(2000);
    });

    it('applies the global timeout to the runner', function () {
      const map = new Map();
      const shrub = shrubbery({ map }, { timeout: '5 seconds' });

      async function delay() {}

      shrub.add('map', 'example', delay);

      const example = map.get('example');
      assume(example[0].runner).is.a('function');
      assume(example[0].runner.timeout).equals(5000);
    });

    it('applies the timeout from the option', function () {
      const map = new Map();
      const shrub = shrubbery({ map });

      async function delay() {}

      shrub.add('map', 'example', delay, {
        timeout: 1337
      });

      const example = map.get('example');
      assume(example[0].runner).is.a('function');
      assume(example[0].runner.timeout).equals(1337);
    });
  });

  describe('#remove', function () {
    it('removes the added function', function () {
      const map = new Map();
      const shrub = shrubbery({ map });

      shrub.add('map', 'example', foo);
      shrub.add('map', 'different', foo);
      shrub.add('map', 'example', bar);

      shrub.remove('map', 'example', foo);

      const example = map.get('example');

      assume(example).is.length(1);
      assume(example[0].runner).is.a('function');
      assume(example[0].fn).equals(bar);
      assume(map.has('different')).is.true();
    });

    it('removes the key from the map if there are no more fns', function () {
      const map = new Map();
      const shrub = shrubbery({ map });

      shrub.add('map', 'example', foo);
      shrub.add('map', 'example', bar);

      shrub.remove('map', 'example', foo);

      const example = map.get('example');
      assume(example).is.length(1);

      shrub.remove('map', 'example', bar);
      assume(map.has('example')).is.false();
    });

    it('removes all functions if no function is given', function () {
      const map = new Map();
      const shrub = shrubbery({ map });

      shrub.add('map', 'example', foo);
      shrub.add('map', 'example', bar);
      shrub.add('map', 'different', bar);

      shrub.remove('map', 'example');

      assume(map.has('example')).is.false();
      assume(map.has('different')).is.true();
    });

    it('can delete nothing', function () {
      const map = new Map();
      const shrub = shrubbery({ map });

      shrub.remove('map', 'example');
    });
  });

  describe('#exec', function () {
    it('executes our given plugin map', async function () {
      const done = assume.plan(6);
      const shrub = shrubbery();

      shrub.add('map', 'example', async function example(data) {
        assume(data).is.a('object');

        assume(data).is.length(1);
        assume(data.foo).equals('bar');

        return data;
      });

      const result = await shrub.exec('map', 'example', {
        foo: 'bar'
      });

      assume(result).is.a('object');
      assume(result).is.length(1);
      assume(result.foo).equals('bar');

      done();
    });

    it('always returns a object', async function () {
      const shrub = shrubbery();
      assume(await shrub.exec('whatever', 'foo')).deep.equals({});
    });

    it('receives the additional args', async function () {
      const shrub = shrubbery();
      const options = { foo: 'bar', priority: 12 };

      shrub.add('map', 'example', async function example(data, ...args) {
        assume(data).is.a('object');

        assume(data).is.length(1);
        assume(data.foo).equals('bar');

        assume(args).is.length(4);
        assume(args[0]).equals('another');
        assume(args[1]).equals('arg');
        assume(args[2]).equals('lol');
        assume(args[3]).equals(options);

        return data;
      }, options);

      const result = await shrub.exec('map', 'example', {
        foo: 'bar'
      }, 'another', 'arg', 'lol');
    });

    it('executes the functions in order', async function () {
      const results = [];
      const shrub = shrubbery();

      shrub.add('map', 'example', async function example() {
        results.push('last');
      }, { priority: 95 });

      shrub.add('map', 'example', async function example() {
        results.push('first');
      }, { priority: 195 });

      shrub.add('map', 'example', async function example() {
        results.push('middle');
      });

      const data = await shrub.exec('map', 'example', {
        foo: 'bar'
      });

      assume(results).deep.equals(['first', 'middle', 'last']);
      assume(data).deep.equals({ foo: 'bar' });
    });

    it('executed function can change the result', async function () {
      const done = assume.plan(3);
      const shrub = shrubbery();

      shrub.add('map', 'example', async function example(data) {
        assume(data).deep.equals({ send: 'help' });
      }, { priority: 95 });

      shrub.add('map', 'example', async function example(data) {
        assume(data.foo).equals('bar');
        data.foo = 'baz';

        return data;
      }, { priority: 195 });

      shrub.add('map', 'example', async function example(data) {
        assume(data.foo).equals('baz');

        return { send: 'help' };
      });

      const data = await shrub.exec('map', 'example', {
        foo: 'bar'
      });

      done();
      assume(data).deep.equals({ send: 'help' });
    });

    it('fails when a plugin throws', async function () {
      const shrub = shrubbery();
      const done = assume.plan(2);

      shrub.add('map', 'example', async function example(data) {
        throw new Error('I should not be causing any harm');
      });

      try { await shrub.exec('map', 'example'); }
      catch (e) {
        assume(e).is.a('error');
        assume(e.message).equals('I should not be causing any harm');
      }

      done();
    });

    it('fails silently so a plugin can not break our core', async function () {
      const done = assume.plan(2);
      const shrub = shrubbery({}, {
        error: function (e) {
          assume(e).is.a('error');
          assume(e.message).equals('I should not be causing any harm');
        }
      });

      shrub.add('map', 'example', async function example(data) {
        throw new Error('I should not be causing any harm');
      });

      const data = await shrub.exec('map', 'example', {
        foo: 'bar'
      });

      assume(data).deep.equals({ foo: 'bar' });
    });
  });
});
