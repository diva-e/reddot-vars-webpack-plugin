'use strict';

const path = require('path');
const fs = require('fs');

const _extends = function (target) {
  for (let i = 1; i < arguments.length; i++) {
    const source = arguments[i];
    for (const key in source) {
      target[key] = source[key];
    }
  }

  return target;
};

const regex = /[\/\*]+[\s]?[rdph:]+([\w\d\s]+)[\*\/]+'(.*)'[\/\*\*\/]+/gi;

const defaults = {
  prefix: ['<!IoRangePreExecute>', '<%'],
  postfix: ['%>', '<!/IoRangePreExecute>'],
  output: 'reddot/jsvars.txt',
};

function ReplaceRedDotVarsWebpackPlugin(options) {
  this.options = Object.assign(defaults, options);
};

ReplaceRedDotVarsWebpackPlugin.prototype = {
  constructor: ReplaceRedDotVarsWebpackPlugin,

  apply: function(compiler) {
    compiler.plugin('normal-module-factory', function(nmf) {
      nmf.plugin('after-resolve', (result, callback) => {
        if(!result) return callback();
        result.loaders.unshift({
          test: /\.js/,
          loader: path.join(__dirname, 'loader.js'),
        });
        return callback(null, result);
      });
    });

    compiler.plugin('emit', (compilation, callback) => {
      const content = buildFileContent(compilation.modules, this.options);

      compilation.assets[this.options.output] = {
        source: function() {
          return content;
        },
        size: function() {
          return content.length;
        }
      };

      callback();
    });
  }
};

const buildFileContent = (modules, options) => {
  let filelist = [];
  const variables = filterVariables([].concat.apply(
      [],
      modules.map(module => findVariables(module.resource))
    )
  );

  const longestAssignment = findLongestAssignment(variables);
  const longestContent = findLongesContent(variables);

  filelist = filelist.concat(options.prefix);

  variables.forEach(variable => {
    const assignmentPadding = Array(8 + longestAssignment-variable.assignment.length).join(' ');
    const contentPadding = Array(8 + longestContent - variable.content.length).join(' ');
    filelist.push([
        variable.assignment,
        assignmentPadding,
        '\' ', // VBScript comment
        variable.content,
        contentPadding,
        variable.file.replace(process.env.PWD, '')
    ].join(''))
  });

  filelist = filelist.concat(options.postfix);

  return filelist.join("\n");
}

const getFieldName = rawName => {
  var splitName = rawName.split('_'),
      fieldType = splitName.shift(),
      resultName = splitName
                    .join('_')
                    .toLowerCase()
                    .replace(/\-/g,'_');

  switch (fieldType) {
    case 'std':
    case 'anc':
    case 'info':
    case 'media':
    case 'img':
      return fieldType + '_' + resultName;
    default:
      return 'std_' + rawName;
  }
}

const getVariables = (content, file) => {
  const matches = [];
  let match;

  while (match = regex.exec(content)) {
    const fullText = match[0];
    const name = getFieldName(match[1]);
    const content = match[2];

    matches.push({ name, content, file });
  }

  return matches;
};

const findVariables = file => {
  const content = fs.readFileSync(file).toString();

  return filterVariables(
    getVariables(content, file).map(item => {
      item.assignment = `${item.name}="<%${item.name}%>"`;
      return item;
    })
  );
};

const filterVariables = variables => (
  variables.filter((item, pos, array) => {
    return array.map(mapItem => mapItem['name']).indexOf(item['name']) === pos;
  })
  .sort((a, b) => a.name > b.name)
)

const findLongestAssignment = variables => (
  variables.map(variable => variable.assignment.length).sort((a, b) => a < b)[0]
);

const findLongesContent = variables => (
  variables.map(variable => variable.content.length).sort((a, b) => a < b)[0]
);

exports.regex = regex;
exports.getFieldName = getFieldName;
exports['default'] = ReplaceRedDotVarsWebpackPlugin;

module.exports = _extends(exports['default'], exports);
