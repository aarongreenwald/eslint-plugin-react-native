/**
 * @fileoverview Detects inline styles
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

  function reportInlineStyles(inlineStyles) {
    inlineStyles.forEach(style => {
      if (!style) {
        return;
      }
      const expression = util.inspect(style.expression);
      context.report({
        node: style.node,
        message: 'Inline style detected: {{expression}}',
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
      }
    },

    JSXAttribute: function (node) {
      if (astHelpers.isStyleAttribute(node)) {
        const styles = astHelpers.collectStyleObjectExpressions(node.value, context);
        styleSheets.addObjectExpressions(styles);
      }
    },

    'Program:exit': function () {
      const list = components.list();
      if (Object.keys(list).length > 0) {
        reportInlineStyles(styleSheets.getObjectExpressions());
      }
    },
  };
});

module.exports.schema = [];
