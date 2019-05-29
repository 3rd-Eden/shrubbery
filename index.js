const ms = require('millisecond');
const { borked } = require('borked');

/**
 * Create a new Map() based plugin API.
 *
 * @param {Object} mapping An object with maps to use.
 * @param {Object} options Additional configuration.
 * @returns {Object} Our api, add, remove and exec.
 * @public
 */
module.exports = function shrubbery(mapping = {}, options = {}) {

  /**
   * Create or read a given map from the provided mapping.
   *
   * @param {String} name Name of the map
   * @returns {Map} The map to use.
   * @private
   */
  function creade(name) {
    if (name in mapping) return mapping[name];
    return (mapping[name] = new Map());
  }

  /**
   * Add a new plugin to their assigned mapping.
   *
   * @param {String} name Name of the map we should assign.
   * @param {String} key Key to store the function under.
   * @param {Function} fn Function to be invoked.
   * @param {Object} opts Plugin configuration.
   * @private
   */
  function add(name, key, fn, opts = {}) {
    const map = creade(name);
    const previous = map.get(key) || [];

    const { priority = 100, timeout } = opts;

    /**
     * Wrapper around the supplied function so we can execute the supplied
     * function in the correct execution context and suffix them with options.
     *
     * @param {...args} args All the args.
     * @returns {Promise} The users async/promise based function.
     * @private
     */
    function runner(...args) {
      return fn.apply(options.context, args.concat(opts));
    }

    /**
     * How long we allow the async function execute before we assume it's
     * dead.
     *
     * @type {Number}
     * @public
     */
    runner.timeout = ms(timeout || fn.timeout || options.timeout || '20 seconds');

    map.set(key, previous.concat({
      priority,
      runner,
      fn
    }).sort(function sort(a, b) {
      return b.priority - a.priority;
    }));
  }

  /**
   * Execute all assigned functions for the given map & method.
   *
   * @param {String} name Name of the plugin map we should run on.
   * @param {String} key Key who's functions we should execute.
   * @param {Object|Mixed} data Data the functions should receive.
   * @public
   */
  async function exec(name, key, data = {}, ...args) {
    let result = data;
    const map = creade(name);
    const keys = map.get(key);

    if (!Array.isArray(keys)) return result;

    for (let i = 0; i < keys.length; i++) {
      const runner = keys[i].runner;
      const name = runner.displayName || runner.name;

      try {
        result = await borked(runner(result, ...args), runner.timeout) || result;
      } catch (e) {
        if (typeof options.error === 'function') options.error(e);
        else throw e;
      }
    }

    return result;
  }

  /**
   * Remove a plugin from the map.
   *
   * @param {String} name Name of the map we should assign.
   * @param {String} key Key to remove the fn from.
   * @param {Function} [fn] Specific function to remove.
   * @public
   */
  function remove(name, key, fn) {
    const map = creade(name);
    const keys = map.get(key);

    if (!Array.isArray(keys)) return;

    const remaining = fn ? keys.filter((plugin) => plugin.fn !== fn) : [];

    if (remaining.length) map.set(key, remaining);
    else map.delete(key);
  }

  return {
    remove,
    exec,
    add
  }
}
