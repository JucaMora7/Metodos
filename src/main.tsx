import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import Landing from './landing/Landing'
import './index.css'

/** Enrutado por hash: "#/calculadora" abre la calculadora; cualquier otro valor muestra la landing. */
function Root() {
  const [hash, setHash] = useState(window.location.hash)
  useEffect(() => {
    const onChange = () => {
      setHash(window.location.hash)
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash === '#/calculadora' ? <App /> : <Landing />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
