'use client'

import React from 'react'

export function Navbar({
  user,
  onOpenAuth,
  onLogout,
  theme,
  onToggleTheme,
  onNavigateProblems = () => {},
  onPickRandom,
}) {
  return (
    <div className="navbar-wrapper">
      {/* Main LeetCode-style Glass Navbar */}
      <header className="navbar-header" id="main-navigation">
        <div
          className="navbar-brand"
          id="brand-logo"
          onClick={onNavigateProblems}
        >
          <div className="brand-logo-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 18L22 12L16 6" stroke="#ff5500" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 6L2 12L8 18" stroke="#ff7700" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 4L10 20" stroke="#ffffff" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="brand-text-group">
            <span className="brand-title">CodeMentor</span>
            <span className="brand-ai-badge">AI</span>
          </div>
        </div>

        <nav className="navbar-center-links">
          <button
            type="button"
            className="nav-tab-btn active"
            onClick={onNavigateProblems}
          >
            Problems
          </button>
          {onPickRandom && (
            <button
              type="button"
              className="nav-tab-btn btn-pick-random"
              onClick={onPickRandom}
              title="Pick a random problem"
            >
              🎲 Pick One
            </button>
          )}
        </nav>

        <div className="navbar-right">
          {/* Dark / Light Theme Mode Toggle Button */}
          <button
            className="btn-theme-toggle"
            id="btn-theme-toggle"
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme mode"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {user ? (
            <div className="user-pill" id="user-profile-pill">
              <div className="user-avatar">{user.name?.charAt(0).toUpperCase() || 'U'}</div>
              <span className="user-name">{user.name}</span>
              <button className="btn-logout" id="btn-user-logout" onClick={onLogout}>
                Logout
              </button>
            </div>
          ) : (
            <div className="auth-buttons-group">
              <button className="btn-nav-login" onClick={onOpenAuth}>
                Log in
              </button>
              <button className="btn-auth-glowing" id="btn-open-auth-modal" onClick={onOpenAuth}>
                Sign Up
              </button>
            </div>
          )}
        </div>
      </header>
    </div>
  )
}
