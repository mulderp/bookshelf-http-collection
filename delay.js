var delay = function(req, res, next) {
  var delay = parseFloat(req.headers['x-delay']);
  req.delay = delay;
  if (delay) {
    setTimeout(function() {
      next();
    }, delay);
  } else {
    next();
  }
};

module.exports = delay;
