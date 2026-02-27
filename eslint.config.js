import js from '@eslint/js'
import globals from 'globals'
import eslintReact from '@eslint-react/eslint-plugin'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

const disallowedClassMatchers = [
  /^ms-auto$/,
  /^me-auto$/,
  /^mx-auto$/,
  /^my-auto$/,
  /^m-.+$/,
  /^mt-.+$/,
  /^mb-.+$/,
  /^ms-.+$/,
  /^me-.+$/,
  /^mx-.+$/,
  /^my-.+$/,
  /^p-.+$/,
  /^pt-.+$/,
  /^pb-.+$/,
  /^ps-.+$/,
  /^pe-.+$/,
  /^px-.+$/,
  /^py-.+$/,
  /^gap-.+$/,
  /^d-flex$/,
  /^justify-content-.+$/,
  /^align-items-.+$/,
  /^w-.+$/,
  /^h-.+$/,
]

function getElementName(nameNode) {
  if (!nameNode) {
    return 'component'
  }

  if (nameNode.type === 'JSXIdentifier') {
    return nameNode.name
  }

  if (nameNode.type === 'JSXMemberExpression') {
    return `${getElementName(nameNode.object)}.${getElementName(nameNode.property)}`
  }

  if (nameNode.type === 'JSXNamespacedName') {
    return `${nameNode.namespace.name}:${nameNode.name.name}`
  }

  return 'component'
}

function getClassText(attributeNode) {
  const valueNode = attributeNode.value
  if (!valueNode) {
    return null
  }

  if (valueNode.type === 'Literal' && typeof valueNode.value === 'string') {
    return valueNode.value
  }

  if (valueNode.type !== 'JSXExpressionContainer') {
    return null
  }

  const expression = valueNode.expression
  if (expression.type === 'Literal' && typeof expression.value === 'string') {
    return expression.value
  }

  if (expression.type === 'TemplateLiteral' && expression.expressions.length === 0) {
    return expression.quasis.map((quasi) => quasi.value.cooked ?? '').join('')
  }

  return null
}

const localRulesPlugin = {
  rules: {
    'no-style-utility-classes': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Disallow style-instruction utility classes in JSX className values',
        },
        schema: [],
      },
      create(context) {
        return {
          JSXAttribute(node) {
            if (node.name.type !== 'JSXIdentifier') {
              return
            }

            if (node.name.name !== 'className' && node.name.name !== 'class') {
              return
            }

            const classText = getClassText(node)
            if (!classText) {
              return
            }

            const tokens = classText.split(/\s+/).filter(Boolean)
            const elementName = getElementName(node.parent?.name)

            for (const token of tokens) {
              if (!disallowedClassMatchers.some((matcher) => matcher.test(token))) {
                continue
              }

              context.report({
                node,
                message: `Disallowed class "${token}" on <${elementName}>. Use semantic/contextual Bootstrap component classes instead.`,
              })
            }
          },
        }
      },
    },
  },
}

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      eslintReact.configs['recommended-typescript'],
      eslintReact.configs['recommended-type-checked'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json', './cloudflare/tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      local: localRulesPlugin,
    },
    rules: {
      '@typescript-eslint/no-misused-promises': [
        'error',
        {
          checksVoidReturn: {
            attributes: false,
          },
        },
      ],
      'local/no-style-utility-classes': 'error',
    },
  },
])
