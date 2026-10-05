import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from "react-router";
//import ArenaLadder3v3 from './components/arena-ladder-3v3/arena-ladder-3v3.tsx'
//import ArenaLadder2v2 from './components/arena-ladder-2v2/arena-ladder-2v2.tsx'
//import ArenaLadder5v5 from './components/arena-ladder-5v5/arena-ladder-5v5.tsx'
//import ArenaLadderRBG from './components/arena-ladder-rbg/arena-ladder-rbg.tsx'
import HomePage from './components/home-page/home-page.tsx'
import ProfilePage from './components/profile/profile.tsx'
import RegisterPage from './components/register/register.tsx'
import NavBar from './components/nav/nav-bar.tsx'
import { Theme } from '@radix-ui/themes'
import '@radix-ui/themes/styles.css'
import './index.css'
import { ensureFlavorInPath, getFlavor, installFlavorHeader } from './helpers/game-flavor.ts'
import RankingsPage from './components/rankings/rankings.tsx';
import LoginPage from './components/login/login.tsx';
import ActivityPage from "./components/activity/activity.tsx";
import News from "./components/news/news.tsx";
import ClassAnalytics from './components/class-leaderboard-analytics/class-leaderboard-analytic.tsx';

// every /api/ call carries the current flavor
installFlavorHeader()
ensureFlavorInPath()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Theme accentColor="blue" radius="small" appearance='dark'>
      {/* the flavor is the first path segment; basename keeps every Link and
          navigate() relative to it, so routes and links stay flavor-free */}
      <BrowserRouter basename={`/${getFlavor()}`}>
      <Routes>
        <Route path="/" element={ <div><NavBar></NavBar><HomePage></HomePage></div> }>
          <Route index element={<News/>} />
          <Route path="profile/:region/:server/:characterName/:urlTab?" Component={ProfilePage} />
          <Route path="rankings/:URLregion/:URLbracket" element={<RankingsPage/>} />
          <Route path="class-stats/:URLregion/:URLbracket" element={<ClassAnalytics/>} />
          <Route path="class-stats" element={<ClassAnalytics/>} />
          <Route path="rankings" element={<RankingsPage/>} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="login" element={<LoginPage/>} />
          <Route path="activity/:URLregion/:URLbracket" element={<ActivityPage/>} />
          <Route path='activity' element={<ActivityPage/>}></Route>
          <Route path="*" element={<div/>} />
        </Route>
      </Routes>
    </BrowserRouter>

    </Theme>
  </React.StrictMode>,
)
