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
      <header className="navbar-header" id="main-navigation">
        <div
          className="navbar-brand"
          id="brand-logo"
          onClick={onNavigateProblems}
        >
          <div className="brand-logo-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 8L3 12L7 16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M17 8L21 12L17 16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 4L10 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="brand-text-group">
            <span className="brand-title">CodeMentor</span>
          </div>
        </div>

        <nav className="navbar-center-links">
          <button
            type="button"
            className="nav-tab-btn active"
            onClick={onNavigateProblems}
          >
            QUESTIONS
          </button>
          {onPickRandom && (
            <button
              type="button"
              className="nav-tab-btn"
              onClick={onPickRandom}
              title="Pick a random problem"
            >
              RANDOM
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
              <button className="btn-auth-primary" id="btn-open-auth-modal" onClick={onOpenAuth}>
                Sign Up
              </button>
            </div>
          )}
        </div>
      </header>
    </div>
  )
}
