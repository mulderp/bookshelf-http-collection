var _ = require('underscore');
var Promise = require('bluebird');
var request = require('request');
var ModelBase = require('./base/model');
var CollectionBase = require('./base/collection');

Promise.promisifyAll(request);

var Sync = function(syncing, options) {
  this.syncing = syncing;
  this.url = syncing.url;
  this.delay = syncing.delay;
}

_.extend(Sync.prototype, {
  findAll: Promise.method(function() {
    var sync = this;
    return Promise.bind(this).then(function() {
      return request.getAsync({url: sync.url, headers: {'x-delay': sync.delay}})
        .then(function(resp) {
          return resp[1];
        });
    })
  })
});

// Copied over from Backbone.
var setOptions = {add: true, remove: true, merge: true};

var HTTPCollection = CollectionBase.extend({
  sync: function(options) {
    return new Sync(this, options);
  },

  fetch: Promise.method(function() {
    this.trigger('fetching');
    return this.sync()
             .findAll()
             .bind(this)
             .tap(function(resp) {
               if (!resp || resp.length === 0) {
                 return Promise.reject(0);
               }
             })
             .tap(function(movies) {
               console.log(movies);
               console.log('....');
               this.set(JSON.parse(movies));
             })
     }),

  // A simplified version of Backbone's `Collection#set` method,
  // removing the comparator, and getting rid of the temporary model creation,
  // since there's *no way* we'll be getting the data in an inconsistent
  // form from the database.
  set: function(models, options) {
    options = _.defaults({}, options, setOptions);
    if (options.parse) models = this.parse(models, options);
    if (!_.isArray(models)) models = models ? [models] : [];

    var i, l, id, model, attrs, existing;
    var at = options.at;
    var targetModel = this.model || ModelBase;
    var toAdd = [], toRemove = [], modelMap = {};
    var add = options.add, merge = options.merge, remove = options.remove;
    var order = add && remove ? [] : false;

    // Turn bare objects into model references, and prevent invalid models
    // from being added.
    for (i = 0, l = models.length; i < l; i++) {
      attrs = models[i];
      if (attrs instanceof ModelBase) {
        id = model = attrs;
      } else {
        id = attrs[targetModel.prototype.idAttribute];
      }

      // If a duplicate is found, prevent it from being added and
      // optionally merge it into the existing model.
      if (existing = this.get(id)) {
        if (remove) {
          modelMap[existing.cid] = true;
          continue;
        }
        if (merge) {
          attrs = attrs === model ? model.attributes : attrs;
          if (options.parse) attrs = existing.parse(attrs, options);
          existing.set(attrs, options);
        }

        // This is a new model, push it to the `toAdd` list.
      } else if (add) {
        console.log(attrs);
        if (!(model = this._prepareModel(attrs, options))) continue;
        toAdd.push(model);

        // Listen to added models' events, and index models for lookup by
        // `id` and by `cid`.
        model.on('all', this._onModelEvent, this);
        this._byId[model.cid] = model;
        if (model.id != null) this._byId[model.id] = model;
      }
      if (order) order.push(existing || model);
    }

    // Remove nonexistent models if appropriate.
    if (remove) {
      for (i = 0, l = this.length; i < l; ++i) {
        if (!modelMap[(model = this.models[i]).cid]) toRemove.push(model);
      }
      if (toRemove.length) this.remove(toRemove, options);
    }

    // See if sorting is needed, update `length` and splice in new models.
    if (toAdd.length || (order && order.length)) {
      this.length += toAdd.length;
      if (at != null) {
        splice.apply(this.models, [at, 0].concat(toAdd));
      } else {
        if (order) this.models.length = 0;
        push.apply(this.models, order || toAdd);
      }
    }

    if (options.silent) return this;

    // Trigger `add` events.
    for (i = 0, l = toAdd.length; i < l; i++) {
      (model = toAdd[i]).trigger('add', model, this, options);
    }
    return this;
  },
})

var extend = function(protoProps, staticProps) {

  var parent = this;
  var child;

  // construct child
  if (protoProps && _.has(protoProps, 'constructor')) {
    child = protoProps.constructor;
  } else {
    child = function(){ return parent.apply(this, arguments); };
  }

  // copy parent onto child
  _.extend(child, parent, staticProps);

  var Surrogate = function(){ this.constructor = child; };
    Surrogate.prototype = parent.prototype;
    child.prototype = new Surrogate;

  if (protoProps) _.extend(child.prototype, protoProps);

  // inherit prototype
  child.__super__ = parent.prototype;

  // return child
  return child;
}


module.exports = HTTPCollection;
