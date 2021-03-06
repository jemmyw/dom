/*eslint-disable */
'use strict';

var isArray = require('x-is-array');

// START Cycle.js-specific code >>>>>>>>
var h = require('./virtual-hyperscript');
// END Cycle.js-specific code <<<<<<<<<<

var SVGAttributeNamespace = require('virtual-dom/virtual-hyperscript/svg-attribute-namespace');
var attributeHook = require('virtual-dom/virtual-hyperscript/hooks/attribute-hook');

var SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const SupportedSvgTags = [
  'circle',
  'clipPath',
  'defs',
  'ellipse',
  'g',
  'image',
  'line',
  'linearGradient',
  'mask',
  'path',
  'pattern',
  'polygon',
  'polyline',
  'radialGradient',
  'rect',
  'stop',
  'svg',
  'text',
  'tspan',
]

module.exports = {
  svg: svg,
  SupportedSvgTags: SupportedSvgTags
}

function svg(tagName, properties, children) {
  if (!children && isChildren(properties)) {
    children = properties;
    properties = {};
  }

  properties = properties || {};

  // set namespace for svg
  properties.namespace = SVG_NAMESPACE;

  var attributes = properties.attributes || (properties.attributes = {});

  for (var key in properties) {
    if (!properties.hasOwnProperty(key)) {
      continue;
    }

    var namespace = SVGAttributeNamespace(key);

    if (namespace === undefined) { // not a svg attribute
      continue;
    }

    var value = properties[key];

    if (typeof value !== 'string' &&
      typeof value !== 'number' &&
      typeof value !== 'boolean'
    ) {
      continue;
    }

    if (namespace !== null) { // namespaced attribute
      properties[key] = attributeHook(namespace, value);
      continue;
    }

    attributes[key] = value
    properties[key] = undefined
  }

  return h(tagName, properties, children);
}

// START Cycle.js-specific code >>>>>>>>
function isObservable(x) {
  return x && typeof x.subscribe === 'function';
}

function isChildren(x) {
  return typeof x === 'string' || isArray(x) || isObservable(x);
}
// END Cycle.js-specific code <<<<<<<<<<
