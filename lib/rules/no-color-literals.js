/**
 * @fileoverview Detects color literals
 * @author Aaron Greenwald
 */
'use strict';
const util = require('util');
const Components = require('../util/Components');
const styleSheet = require('../util/stylesheet');
const StyleSheets = styleSheet.StyleSheets;
const astHelpers = styleSheet.astHelpers;

module.exports = Components.detect(context => {
  const styleSheets = new StyleSheets();

  function reportColorLiterals(colorLiterals) {
    if (colorLiterals) {
      colorLiterals.forEach(style => {
        if (style) {
          const expression = util.inspect(style.expression);
          context.report({
            node: style.node,
            message: 'Color literal: {{expression}}',
            data: { expression: expression },
          });
        }
      });
    }
  }

  return {
    VariableDeclarator: function (node) {
      if (astHelpers.isStyleSheetDeclaration(node)) {
        const styles = astHelpers.getStyleDeclarations(node);

        if (styles) {
          styles.forEach(style => {
            const literals = astHelpers.collectColorLiterals(style.value, context);
            styleSheets.addColorLiterals(literals);
          });
        }
      }
    },

    JSXAttribute: function (node) {
      if (astHelpers.isStyleAttribute(node)) {
        const styles = astHelpers.collectColorLiterals(node.value, context);
        styleSheets.addColorLiterals(styles);
      }
    },

    'Program:exit': function () {
      reportColorLiterals(styleSheets.getColorLiterals());
    },
  };
});

module.exports.schema = [];
