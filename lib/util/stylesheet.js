'use strict';
/**
 * StyleSheets represents the StyleSheets found in the source code.
 * @constructor
 */
function StyleSheets() {
  this._styleSheets = {};
}

/**
 * Add adds a StyleSheet to our StyleSheets collections.
 *
 * @param {string} styleSheetName - The name of the StyleSheet.
 * @param {object} properties - The collection of rules in the styleSheet.
 */
StyleSheets.prototype.add = function (styleSheetName, properties) {
  this._styleSheets[styleSheetName] = properties;
};

/**
 * MarkAsUsed marks a rule as used in our source code by removing it from the
 * specified StyleSheet rules.
 *
 * @param {string} fullyQualifiedName - The fully qualified name of the rule.
 * for example 'styles.text'
 */
StyleSheets.prototype.markAsUsed = function (fullyQualifiedName) {
  const nameSplit = fullyQualifiedName.split('.');
  const styleSheetName = nameSplit[0];
  const styleSheetProperty = nameSplit[1];

  if (this._styleSheets[styleSheetName]) {
    this._styleSheets[styleSheetName] = this
        ._styleSheets[styleSheetName]
        .filter((property) => property.key.name !== styleSheetProperty);
  }
};

/**
 * GetUnusedReferences returns all collected StyleSheets and their
 * unmarked rules.
 */
StyleSheets.prototype.getUnusedReferences = function () {
  return this._styleSheets;
};

StyleSheets.prototype.addObjectExpressions = function (expressions) {
  if (!this._objectExpressions) {
    this._objectExpressions = [];
  }
  this._objectExpressions = this._objectExpressions.concat(expressions);
};

StyleSheets.prototype.getObjectExpressions = function () {
  return this._objectExpressions;
};


let _context;
const _getSourceCode = node => _context
  .getSourceCode(node)
  .getText(node)
;

const astHelpers = {
  containsStyleSheetObject: function (node) {
    return Boolean(
      node &&
      node.init &&
      node.init.callee &&
      node.init.callee.object &&
      node.init.callee.object.name === 'StyleSheet'
    );
  },

  containsCreateCall: function (node) {
    return Boolean(
      node &&
      node.init &&
      node.init.callee &&
      node.init.callee.property &&
      node.init.callee.property.name === 'create'
    );
  },

  isStyleSheetDeclaration: function (node) {
    return Boolean(
      astHelpers.containsStyleSheetObject(node) &&
      astHelpers.containsCreateCall(node)
    );
  },

  getStyleSheetName: function (node) {
    if (
      node &&
      node.id
    ) {
      return node.id.name;
    }
  },

  getStyleDeclarations: function (node) {
    if (
      node &&
      node.init &&
      node.init.arguments &&
      node.init.arguments[0] &&
      node.init.arguments[0].properties
    ) {
      return node
        .init
        .arguments[0]
        .properties;
    }

    return [];
  },

  isStyleAttribute: function (node) {
    return Boolean(
      node.type === 'JSXAttribute' &&
      node.name &&
      node.name.name &&
      node.name.name.toLowerCase().includes('style')
    );
  },

  collectStyleObjectExpressions: function (node, context) {
    _context = context;
    if (astHelpers.hasArrayOfStyleReferences(node)) {
      const styleReferenceContainers = node
        .expression
        .elements;

      return astHelpers.collectStyleObjectExpressionFromContainers(
        styleReferenceContainers
      );
    }

    return astHelpers.getStyleObjectExpressionFromNode(node.expression);
  },

  collectStyleReferences: function (node) {
    if (astHelpers.hasArrayOfStyleReferences(node)) {
      const styleReferenceContainers = node
        .expression
        .elements;

      return astHelpers.collectStyleReferencesFromContainers(
        styleReferenceContainers
      );
    }

    return astHelpers.getStyleReferenceFromNode(node.expression);
  },

  collectStyleObjectExpressionFromContainers: function (nodes) {
    let objectExpressions = [];
    nodes.forEach((node) => {
      objectExpressions = objectExpressions
        .concat(astHelpers.getStyleObjectExpressionFromNode(node));
    });


    return objectExpressions;
  },

  collectStyleReferencesFromContainers: function (nodes) {
    let styleReferences = [];
    nodes.forEach((node) => {
      styleReferences = styleReferences.concat(astHelpers.getStyleReferenceFromNode(node));
    });
    return styleReferences;
  },

  getStyleObjectExpressionFromNode: function (node) {
    let leftStyleObjectExpression;
    let rightStyleObjectExpression;

    if (!node) {
      return [];
    }

    if (node.type === 'ObjectExpression') {
      return [astHelpers.getStyleObjectFromExpression(node)];
    }

    switch (node.type) {
      case 'LogicalExpression':
        leftStyleObjectExpression = astHelpers.getStyleObjectExpressionFromNode(node.left);
        rightStyleObjectExpression = astHelpers.getStyleObjectExpressionFromNode(node.right);
        return [].concat(leftStyleObjectExpression).concat(rightStyleObjectExpression);
      case 'ConditionalExpression':
        leftStyleObjectExpression = astHelpers.getStyleObjectExpressionFromNode(node.consequent);
        rightStyleObjectExpression = astHelpers.getStyleObjectExpressionFromNode(node.alternate);
        return [].concat(leftStyleObjectExpression).concat(rightStyleObjectExpression);
      default:
        return [];
    }
  },

  getStyleReferenceFromNode: function (node) {
    let styleReference;
    let leftStyleReferences;
    let rightStyleReferences;

    if (!node) {
      return [];
    }

    switch (node.type) {
      case 'MemberExpression':
        styleReference = astHelpers.getStyleReferenceFromExpression(node);
        return [styleReference];
      case 'LogicalExpression':
        leftStyleReferences = astHelpers.getStyleReferenceFromNode(node.left);
        rightStyleReferences = astHelpers.getStyleReferenceFromNode(node.right);
        return [].concat(leftStyleReferences).concat(rightStyleReferences);
      case 'ConditionalExpression':
        leftStyleReferences = astHelpers.getStyleReferenceFromNode(node.consequent);
        rightStyleReferences = astHelpers.getStyleReferenceFromNode(node.alternate);
        return [].concat(leftStyleReferences).concat(rightStyleReferences);
      default:
        return [];
    }
  },

  hasArrayOfStyleReferences: function (node) {
    return Boolean(
      node.type === 'JSXExpressionContainer' &&
      node.expression &&
      node.expression.type === 'ArrayExpression'
    );
  },

  getStyleObjectFromExpression: function (node) {
    const obj = {};
    let invalid = false;
    if (node.properties && node.properties.length) {
      node.properties.forEach(p => {
        if (p.value.type === 'Literal') {
          invalid = true;
          obj[p.key.name] = p.value.value;
        } else if (p.value.type === 'ConditionalExpression') {
          const innerNode = p.value;
          if (innerNode.consequent.type === 'Literal' || innerNode.alternate.type === 'Literal') {
            invalid = true;
            obj[p.key.name] = _getSourceCode(innerNode);
          }
        }
      });
    }
    return invalid ? { expression: obj, node: node } : undefined;
  },

  getStyleReferenceFromExpression: function (node) {
    const result = [];
    const name = astHelpers.getObjectName(node);
    if (name) {
      result.push(name);
    }

    const property = astHelpers.getPropertyName(node);
    if (property) {
      result.push(property);
    }

    return result.join('.');
  },

  getObjectName: function (node) {
    if (
      node &&
      node.object &&
      node.object.name
    ) {
      return node.object.name;
    }
  },

  getPropertyName: function (node) {
    if (
      node &&
      node.property &&
      node.property.name
    ) {
      return node.property.name;
    }
  },
};

module.exports.astHelpers = astHelpers;
module.exports.StyleSheets = StyleSheets;
