var HTTPCollection = require('./httpCollection');

var url = 'http://0.0.0.0:3000/';
var MoviesDB = HTTPCollection.extend({
  url: url,
  delay: 100
});

var moviesDB = new MoviesDB();

moviesDB.fetch()
        .then(function(movies) { console.log(movies) })
        .catch(function(err) { console.log(err) });

