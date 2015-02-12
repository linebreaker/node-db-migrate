var recursive = require('final-fs').readdirRecursive;
var fs = require('fs');
var driver = require('./lib/driver');
var path = require('path');
var Migrator = require('./lib/migrator');

exports.dataType = require('./lib/data_type');
exports.config = require('./lib/config');

exports.connect = function(config, callback) {
  driver.connect(config, function(err, db) {
    if (err) { callback(err); return; }

    if(global.migrationMode)
    {
      var dirPath = path.resolve(__dirname, config['migrations-dir'] || 'migrations');

      if(global.migrationMode !== 'all')
      {
        global.locTitle = global.migrationMode;
        callback(null, new Migrator(db, config['migrations-dir']));
      }
      else
      {
      recursive(dirPath, false, config['migrations-dir'] || 'migrations')
      .then(function(files) {
          var oldClose = db.close;

          files = files.filter(function (file) {
            return file !== 'migrations' && fs.statSync(file).isDirectory();
          });

          files.push('');

          db.close = function(cb) { migrationFiles(files, callback, config, db, oldClose, cb); };

          db.close();
        });
      }
    }
    else
      callback(null, new Migrator(db, config['migrations-dir']));

  });
};

function migrationFiles(files, callback, config, db, close, cb) {
  var file;

  if(files.length === 1)
  {
    db.close = close;
  }

  file = files.pop();

  global.matching = file.substr(file.indexOf(config['migrations-dir'] || 'migrations') +
      (config['migrations-dir'] || 'migrations').length + 1);

  if(global.matching.length === 0)
    global.matching = '';


  global.locTitle = global.matching;
  callback(null, new Migrator(db, config['migrations-dir']));

  if(typeof(cb) === 'function')
    cb();
}

exports.createMigration = function(migration, callback) {
  migration.write(function(err) {
	if (err) { callback(err); return; }
	callback(null, migration);
  });
};
