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
          <a
            href="#topics-section"
            className="nav-tab-btn"
            onClick={(e) => {
              const el = document.getElementById('problemset-catalog')
              if (el) {
                e.preventDefault()
                el.scrollIntoView({ behavior: 'smooth' })
              }
            }}
          >
            TOPICS
          </a>
        </nav>

        <div className="navbar-right">
          {/* GitHub Star Badge */}
          <a
            href="https://github.com/ApurvaHindukaje/CodeMentor"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-github-badge"
            title="Star on GitHub"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            <span>GitHub</span>
            <span className="github-star-count">★ 500</span>
          </a>

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
