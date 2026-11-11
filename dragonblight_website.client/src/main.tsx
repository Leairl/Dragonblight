import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
//import ArenaLadder3v3 from './components/arena-ladder-3v3/arena-ladder-3v3.tsx'
//import ArenaLadder2v2 from './components/arena-ladder-2v2/arena-ladder-2v2.tsx'
//import ArenaLadder5v5 from './components/arena-ladder-5v5/arena-ladder-5v5.tsx'
//import ArenaLadderRBG from './components/arena-ladder-rbg/arena-ladder-rbg.tsx'
import HomePage from './components/home-page/home-page.tsx'
import ProfilePage from './components/profile/profile.tsx'
import RegisterPage from './components/register/register.tsx'
import NavBar from './components/nav/nav-bar.tsx'
import { Theme } from '@radix-ui/themes'
import './index.css'
import { ensureFlavorInPath, getFlavor, installFlavorHeader } from './helpers/game-flavor.ts'
import { installItemStatFix } from './helpers/wowhead-item-stats.ts'
import RankingsPage from './components/rankings/rankings.tsx';
import LoginPage from './components/login/login.tsx';
import ActivityPage from "./components/activity/activity.tsx";
import { BlueTracker, BluePostPage } from "./components/news/blue-tracker";
import News from "./components/news/news.tsx";
import ClassAnalytics from './components/class-leaderboard-analytics/class-leaderboard-analytic.tsx';
import CutoffsPage from "./components/cutoffs-page/cutoffs-page.tsx";
import ProfileCompare from "./components/compare/compare.tsx";
import CompositionScorePage from "./components/composition-score/composition-score.tsx";
import { CookiePage, PrivacyPage, SupportPage, TermsPage } from "./components/site-footer/site-pages.tsx";
import ForeverHome, { ForeverLanding } from "./components/forever/forever-home.tsx";
import ForeverCharacter from "./components/forever/forever-character.tsx";
import ForeverStats from "./components/forever/forever-stats.tsx";
import ForeverGuild from "./components/forever/forever-guild.tsx";

// every /api/ call carries the current flavor
installFlavorHeader()
// item tooltips show the secondary stats Blizzard reports, not Wowhead's defaults
installItemStatFix()
ensureFlavorInPath()

// MoP Classic and retail share every page; the flavor only changes the data.
const ladderRoutes = (
  <Route path="/" element={<div><NavBar></NavBar><HomePage></HomePage></div>}>
    <Route index element={<News />} />
    <Route path="blue-tracker" element={<BlueTracker />} />
    <Route path="blue-tracker/:region/:postId" element={<BluePostPage />} />
    <Route path="profile/:region/:server/:characterName/:urlTab?" Component={ProfilePage} />
    <Route path="compare/:region/:server/:characterName" element={<ProfileCompare />} />
    <Route path="compare/:region/:server/:characterName/:region2/:server2/:characterName2" element={<ProfileCompare />} />
    <Route path="rankings/:URLregion/:URLbracket" element={<RankingsPage />} />
    <Route path="class-stats/:URLregion/:URLbracket" element={<ClassAnalytics />} />
    <Route path="class-stats" element={<ClassAnalytics />} />
    <Route path="rankings" element={<RankingsPage />} />
    <Route path="register" element={<RegisterPage />} />
    <Route path="login" element={<LoginPage />} />
    <Route path="activity/:URLregion/:URLbracket" element={<ActivityPage />} />
    <Route path='activity' element={<ActivityPage />}></Route>
    <Route path="cutoffs/:URLregion" element={<CutoffsPage />} />
    <Route path="cutoffs" element={<CutoffsPage />} />
    <Route path="composition-score" element={<CompositionScorePage />} />
    <Route path="terms" element={<TermsPage />} />
    <Route path="cookies" element={<CookiePage />} />
    <Route path="privacy" element={<PrivacyPage />} />
    <Route path="support" element={<SupportPage />} />
    <Route path="*" element={<div />} />
  </Route>
);

// WoW: Forever has its landing page, character and guild pages, the ruleset stats page and the
// footer pages so far. Every other Forever path goes back to the landing page rather than to a page
// with no Forever data.
const foreverRoutes = (
  <Route path="/" element={<div><NavBar></NavBar><ForeverHome></ForeverHome></div>}>
    <Route index element={<ForeverLanding />} />
    <Route path="character/:region/:characterSlug/:urlTab?" element={<ForeverCharacter />} />
    <Route path="stats" element={<ForeverStats />} />
    <Route path="guild/:region/:guildSlug" element={<ForeverGuild />} />
    <Route path="terms" element={<TermsPage />} />
    <Route path="cookies" element={<CookiePage />} />
    <Route path="privacy" element={<PrivacyPage />} />
    <Route path="support" element={<SupportPage />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Route>
);

let routes = ladderRoutes;
if (getFlavor() === "forever") {
  routes = foreverRoutes;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Theme accentColor="blue" radius="small" appearance='dark'>
      {/* the flavor is the first path segment; basename keeps every Link and
          navigate() relative to it, so routes and links stay flavor-free */}
      <BrowserRouter basename={`/${getFlavor()}`}>
        <Routes>
          {routes}
        </Routes>
      </BrowserRouter>

    </Theme>
  </React.StrictMode>,
)
