const babel = require('babel-core')
const plugin = require('../src/index')
const Gruu = require('gruujs')

const timer = () => new Promise(resolve => setTimeout(resolve))

const run = (funcString) => {
  const out = babel.transform(funcString, {
    plugins: [plugin]
  })
  const code = `return (\n${out.code}\n)()`
  return new Function('Gruu', code)
}

describe('counter app', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>'
  })

  const init = () => run(`function test () {
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
  }`)(Gruu)

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