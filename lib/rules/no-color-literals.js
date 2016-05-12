/**
 * @fileoverview Detects color literals
 * @author Aaron Greenwald
 */
'use strict';
const Components = require('../util/Components');
const styleSheet = require('../util/stylesheet');
const util = require('util');
const StyleSheets = styleSheet.StyleSheets;
const astHelpers = styleSheet.astHelpers;

module.exports = Components.detect((context, components) => {
  const styleSheets = new StyleSheets();

  function reportColorLiterals(inlineStyles) {
    inlineStyles.forEach(style => {
      if (!style) {
        return;
      }
      const expression = util.inspect(style.expression);
      context.report({
        node: style.node,
        message: 'Color literal detected: {{expression}}',
        data: { expression: expression },
      });
    });
  }

  return {
    VariableDeclarator: function (node) {
      if (astHelpers.isStyleSheetDeclaration(node)) {
        const styleSheetName = astHelpers.getStyleSheetName(node);
        const styles = astHelpers.getStyleDeclarations(node);
        styleSheets.add(styleSheetName, styles);

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
      const list = components.list();
      if (Object.keys(list).length > 0) {
        reportColorLiterals(styleSheets.getColorLiterals());
      }
    },
  };
});

module.exports.schema = [];
