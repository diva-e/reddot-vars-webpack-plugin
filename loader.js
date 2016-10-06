'use strict';

const Plugin = require('./index.js');

module.exports = function(source) {
  return source.replace(Plugin.regex, (string, name) => {
    return `"<!IoRangePreExecute><%=${Plugin.getFieldName(name)}%><!/IoRangePreExecute>"`;
  });
};
