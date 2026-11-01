import { Component, StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { StillContext } from '../kit/reduced-motion'
import './preview.css'

const modules = Object.entries(import.meta.glob<{ default: React.ComponentType }>('../examples/*/index.tsx'))
class Boundary extends Component<{ children: ReactNode; onError: (message: string) => void }, { error: string | null }> {
  state = { error: null as string | null }
  static getDerivedStateFromError(error: Error) { return { error: error.message } }
  componentDidCatch(error: Error) { this.props.onError(error.message) }
  render() { return this.state.error ? <p role="alert">This example could not render: {this.state.error}. Check the console for details, then replay after fixing it.</p> : this.props.children }
}
export async function mount(name: string, still: boolean, onError: (message: string) => void = () => {}) {
  let Demo: React.ComponentType | undefined
  if (name === 'contrasts') {
    Demo = (await import('../teaching/contrasts')).default
  } else {
    // Select only from Vite's fixed build-time entries. The requested name is
    // compared with an entry key; it never indexes an object or names a method.
    for (const [path, load] of modules) {
      if (path === `../examples/${name}/index.tsx`) {
        Demo = (await load()).default
        break
      }
    }
  }
  if (!Demo) throw new Error(`Unknown example: ${name}`)
  createRoot(document.getElementById('root')!).render(<StrictMode><div id="example"><Boundary onError={onError}><StillContext.Provider value={still}><Demo /></StillContext.Provider></Boundary></div></StrictMode>)
}
