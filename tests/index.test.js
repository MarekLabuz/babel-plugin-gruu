const babel = require('babel-core')
const plugin = require('../src/index')
const Gruu = require('gruujs')

const timer = () => new Promise(resolve => setTimeout(resolve))

const codeGen = funcString => babel.transform(funcString, {
  plugins: [plugin]
}).code

const run = (out) => {
  const code = `return (\n${out}\n)()`
  return new Function('Gruu', code)
}

describe('counter app', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>'
  })

  const init = () => {
    const code = codeGen(`function test () {
      const store = <$ state={{ counter: 0 }} />
  
      const button = <button onclick={() => store.state.counter + 1}>CLICK</button>
      
      const div = <div>{() => store.state.counter}</div>
      
      const main = (
        <div>
          {button}
          {div}
        </div>
      )
      
      const container = document.querySelector('#root')
      Gruu.renderApp(container, [main])
      
      return { store }
    }`)
    return run(code)(Gruu)
  }

  test('renders correctly', () => {
    init()
    expect(document.body.innerHTML).toBe('<div id="root"><div><button>CLICK</button><div>0</div></div></div>')
  })

  test('changes counter on click', async () => {
    const { store } = init()
    store.state.counter += 1
    await timer()
    expect(document.body.innerHTML).toBe('<div id="root"><div><button>CLICK</button><div>1</div></div></div>')
  }, 150)
})

describe('parser', () => {
  test('assigns attributes', () => {
    const code = codeGen(`
      <div
        style={{
          color: 'blue',
          border: '1px solid black'
        }}
        textContent="text"
        className="test"
        state={{
          counter: 10
        }}
      >
      </div>`
    )

    expect(code.replace(/\s/g, '')).toBe((`
      Gruu.createComponent({
        _type: 'div',
        style: {
          color: 'blue',
          border: '1px solid black'
        },
        textContent: 'text',
        className: 'test',
        state: {
          counter: 10
        }
      });`
    ).replace(/\s/g, ''))
  })

  test('omits _type, children and $children', () => {
    const code = codeGen(`
      <div
        _type="span"
        textContent="text"
        className="test"
        children={['children']}
        $children={() => ['children']}
      >
      </div>`
    )

    expect(code.replace(/\s/g, '')).toBe((`
      Gruu.createComponent({
        _type: "div",
        textContent: "text",
        className: "test"
      });`
    ).replace(/\s/g, ''))
  })

  test('renders children correctly', () => {
    const code = codeGen(`
      <div>
        {'text #1'}
        text #2
        {span}
        {() => store.state.counter}
        {['text #3', <p>text #4</p>]}
      </div>`
    )

    expect(code.replace(/\s/g, '')).toBe((`
      Gruu.createComponent({
        _type: 'div',
        children: ['text #1', 'text #2', span, Gruu.createComponent({
          $children: () => store.state.counter
        }), Gruu.createComponent({
          children: ['text #3', Gruu.createComponent({
            _type: 'p',
            children: ['text #4']
          })]
        })]
      });`
    ).replace(/\s/g, ''))

  })
})
