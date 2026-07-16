import { Routes, Route, NavLink } from 'react-router-dom'
import Battle from './pages/Battle'
import Submit from './pages/Submit'
import Ranking from './pages/Ranking'
import Fame from './pages/Fame'
import Studio from './pages/Studio'
import Privacy from './pages/Privacy'
import { OPEN_CHAT_URL } from './lib/config'

export default function App() {
  return (
    <div className="wrap">
      <header className="header">
        <NavLink to="/" className="logo">
          짠내배틀 <span className="tag">눈물의 국밥 증정</span>
        </NavLink>
        <nav className="nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>배틀</NavLink>
          <NavLink to="/submit" className={({ isActive }) => (isActive ? 'active' : '')}>사연 접수</NavLink>
          <NavLink to="/ranking" className={({ isActive }) => (isActive ? 'active' : '')}>이번 주 순위</NavLink>
          <NavLink to="/fame" className={({ isActive }) => (isActive ? 'active' : '')}>명예의 전당</NavLink>
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<Battle />} />
        <Route path="/submit" element={<Submit />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/fame" element={<Fame />} />
        <Route path="/studio" element={<Studio />} />
        <Route path="/privacy" element={<Privacy />} />
      </Routes>

      <footer className="footer">
        짠내배틀은 웃을 수 있는 불행만 접수합니다. 진짜 힘든 순간엔 배틀 말고 주변에 손을 내밀어 주세요.
        <div className="footer-links">
          <a href={OPEN_CHAT_URL} target="_blank" rel="noreferrer">본부 오픈채팅</a>
          <NavLink to="/privacy">개인정보처리방침</NavLink>
        </div>
      </footer>
    </div>
  )
}
