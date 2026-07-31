import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { logVisit } from './lib/tracking'
import './styles.css'

// 착지 1회 기록. 라우터·StrictMode 바깥에서 부른다 —
// utm은 최초 진입 URL에만 있고, StrictMode 안에서는 이펙트가 두 번 돈다.
logVisit()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
