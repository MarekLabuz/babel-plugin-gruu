 const babelPluginSyntaxJSX = require('babel-plugin-syntax-jsx')

const componentExpression = t => properties => (
  t.callExpression(t.memberExpression(t.identifier('Gruu'), t.identifier('createComponent')), [
    t.objectExpression(properties)
  ])
)

const prepareChildren = t => children => children.reduce((acc, child) => {
  const item = child.expression || child
  return {
    dynamic: acc.dynamic || t.isFunction(item),
    items: [...acc.items, item]
  }
}, { items: [], dynamic: false })

const parseChildren = t => children => children.map(child => {
  if (t.isJSXText(child) || t.isStringLiteral(child)) {
    const string = child.value.replace(/^[\n ]*/g, '').replace(/[\n ]*$/g, '')
    return string ? t.stringLiteral(string) : null
  }

  if (t.isFunction(child)) {
    return componentExpression(t)([
      t.objectProperty(t.identifier('$children'), child)
    ])
  }

  if (t.isArrayExpression(child) || t.isCallExpression(child)) {
    return componentExpression(t)([
      t.objectProperty(t.identifier('children'), child)
    ])
  }

  return child
}).filter(v => v)

const excludedAttributes = ['_type', 'children', '$children']

module.exports = (babel) => {
  const t = babel.types
  return {
    inherits: babelPluginSyntaxJSX,
    visitor: {
      JSXElement (path) {
        const { openingElement, children } = path.node
        const { name: { name: componentType }, attributes } = openingElement

        const typeProperty = componentType !== '$'
          ? [t.objectProperty(t.identifier('_type'), t.stringLiteral(componentType))]
          : []

        const preparedChildren = prepareChildren(t)(children)
        const items = (parseChildren(t)(preparedChildren.items))
        const childrenProperty = items.length > 0 ? [t.objectProperty(
          t.identifier('children'),
          t.arrayExpression(items)
        )] : []

        path.replaceWith(componentExpression(t)([
          ...typeProperty,
          ...childrenProperty,
          ...attributes
            .filter(({ name }) => !excludedAttributes.includes(name.name))
            .map(({ name, value }) => (
              t.objectProperty(
                t.identifier(name.name),
                t.isStringLiteral(value) ? value : value.expression
              )
            ))
        ]))
      }
    }
  }
}
