'use client'

import React, { useState } from 'react'

export function ProblemCatalog({
  problems = [],
  solvedProblemIds = new Set(),
  onSelectProblem,
  loading = false,
  error = null,
  onRetry,
}) {
  const [selectedDifficulty, setSelectedDifficulty] = useState('All')
  const [selectedTopic, setSelectedTopic] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 25

  const handleDifficultyChange = (diff) => {
    setSelectedDifficulty(diff)
    setCurrentPage(1)
  }

  const handleTopicChange = (topic) => {
    setSelectedTopic(topic)
    setCurrentPage(1)
  }

  const handleSearchChange = (val) => {
    setSearchQuery(val)
    setCurrentPage(1)
  }

  // Gather unique topics across problems
  const allTopics = ['All', ...Array.from(new Set(problems.flatMap((p) => p.topics || [])))]

  // Calculate student stats
  const totalCount = problems.length
  const solvedCount = problems.filter((p) => solvedProblemIds.has(p.id)).length
  const solvedPercentage = totalCount > 0 ? Math.round((solvedCount / totalCount) * 100) : 0

  const easyCount = problems.filter((p) => p.difficulty?.toLowerCase() === 'easy').length
  const easySolved = problems.filter((p) => p.difficulty?.toLowerCase() === 'easy' && solvedProblemIds.has(p.id)).length

  const medCount = problems.filter((p) => p.difficulty?.toLowerCase() === 'medium').length
  const medSolved = problems.filter((p) => p.difficulty?.toLowerCase() === 'medium' && solvedProblemIds.has(p.id)).length

  const hardCount = problems.filter((p) => p.difficulty?.toLowerCase() === 'hard').length
  const hardSolved = problems.filter((p) => p.difficulty?.toLowerCase() === 'hard' && solvedProblemIds.has(p.id)).length

  // Filter problems
  const filteredProblems = problems.filter((p) => {
    const matchesDiff =
      selectedDifficulty === 'All' || p.difficulty?.toLowerCase() === selectedDifficulty.toLowerCase()
    const matchesTopic =
      selectedTopic === 'All' || (p.topics && p.topics.includes(selectedTopic))
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.topics && p.topics.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())))
    return matchesDiff && matchesTopic && matchesSearch
  })

  const totalPages = Math.max(1, Math.ceil(filteredProblems.length / pageSize))
  const paginatedProblems = filteredProblems.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const todaysProblem = problems.length > 0 ? problems[0] : null

  const handleScrollToTable = () => {
    const el = document.getElementById('catalog-content-area')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section className="catalog-section" id="problemset-catalog">
      {/* =========================================================
          HERO: Centered Technical Developer Showcase (TrenTorch Aesthetic)
          ========================================================= */}
      <div className="trentorch-hero">
        {/* Today's Problem Top Pill */}
        {todaysProblem && (
          <button
            type="button"
            className="hero-daily-pill"
            onClick={() => onSelectProblem(todaysProblem)}
            title="Solve today's featured problem"
          >
            <span className="pill-dot">⚡</span>
            <span className="pill-label">Today's Problem:</span>
            <span className="pill-title">{todaysProblem.title.toUpperCase()}</span>
            <span className={`pill-diff ${todaysProblem.difficulty?.toLowerCase()}`}>
              {todaysProblem.difficulty}
            </span>
            <span className="pill-arrow">→</span>
          </button>
        )}

        {/* Centered Circular Emblem */}
        <div className="hero-emblem-badge">
          <div className="hero-emblem-inner">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 7L3 12L8 17" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 7L21 12L16 17" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 4L10 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        {/* Hero Title & Subtitles */}
        <h1 className="hero-brand-heading">CodeMentor</h1>
        <h2 className="hero-tagline">Master algorithms by building them.</h2>
        <p className="hero-description">
          500+ LeetCode problems, coded from scratch, evaluated with instant Big-O asymptotic analysis and real-time Socratic AI hints directly in your browser.
        </p>

        {/* Hero Call to Action Buttons */}
        <div className="hero-cta-group">
          <button
            type="button"
            className="btn-hero-primary"
            onClick={handleScrollToTable}
          >
            <span>Questions</span>
          </button>
          <a
            href="https://github.com/ApurvaHindukaje/CodeMentor"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-hero-secondary"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            <span>View on GitHub</span>
          </a>
        </div>

        {/* Minimalist Stats Counter Card */}
        <div className="hero-stats-card">
          <div className="stat-card-col">
            <span className="stat-number">{totalCount}</span>
            <span className="stat-label">Questions</span>
          </div>
          <div className="stat-card-divider" />
          <div className="stat-card-col">
            <span className="stat-number">20</span>
            <span className="stat-label">Tracks</span>
          </div>
          <div className="stat-card-divider" />
          <div className="stat-card-col">
            <span className="stat-number">100%</span>
            <span className="stat-label">Free</span>
          </div>
        </div>

        {/* Company Strip */}
        <div className="hero-company-strip">
          <span className="company-strip-title">Learners practicing for top engineering companies</span>
          <div className="company-logo-list">
            <span className="company-pill">Google</span>
            <span className="company-pill">Meta</span>
            <span className="company-pill">Uber</span>
            <span className="company-pill">Amazon</span>
            <span className="company-pill">Apple</span>
            <span className="company-pill">Netflix</span>
            <span className="company-pill">Microsoft</span>
            <span className="company-pill-muted">and more</span>
          </div>
        </div>
      </div>

      {/* =========================================================
          CATALOG SECTION: Clean Problemset Table & Filters
          ========================================================= */}
      <div id="catalog-content-area" className="catalog-content-wrapper">
        <div className="problemset-header-bar">
          <div className="problemset-header-left">
            <div className="problemset-title-group">
              <h2 className="problemset-heading">Problemset</h2>
              <span
                className={`problem-count-badge ${
                  loading && totalCount === 0 ? 'loading-pulse' : error && totalCount === 0 ? 'badge-error' : ''
                }`}
              >
                {loading && totalCount === 0
                  ? 'Loading Challenges...'
                  : error && totalCount === 0
                  ? 'Connection Error'
                  : `${totalCount} Challenges`}
              </span>
            </div>
            <p className="problemset-subheading">
              Select any problem to open the interactive IDE with live test execution and Socratic mentor.
            </p>
          </div>

          {/* Compact Progress Widget */}
          <div className="compact-progress-widget">
            <div className="progress-top-row">
              <span className="progress-main-stat">
                <strong>{solvedCount}</strong> / {totalCount} Solved
              </span>
              <span className="progress-pct-badge">{solvedPercentage}%</span>
            </div>
            <div className="compact-progress-bar">
              <div
                className="compact-progress-fill"
                style={{ width: `${Math.max(solvedPercentage, totalCount > 0 && solvedCount > 0 ? (solvedCount / totalCount) * 100 : 0)}%` }}
              />
            </div>
            <div className="progress-diff-pills">
              <span className="diff-stat easy">
                Easy: <strong>{easySolved}/{easyCount}</strong>
              </span>
              <span className="diff-stat medium">
                Med: <strong>{medSolved}/{medCount}</strong>
              </span>
              <span className="diff-stat hard">
                Hard: <strong>{hardSolved}/{hardCount}</strong>
              </span>
            </div>
          </div>
        </div>

      {/* Topic Filter Chips */}
      <div className="topic-chips-bar">
        {allTopics.slice(0, 18).map((topic) => (
          <button
            key={topic}
            className={`topic-chip ${selectedTopic === topic ? 'active' : ''}`}
            onClick={() => handleTopicChange(topic)}
          >
            {topic === 'All' ? 'All Topics' : topic}
          </button>
        ))}
      </div>

      {/* Control Bar: Difficulty Tabs & Search */}
      <div className="catalog-controls">
        <div className="difficulty-tabs">
          {['All', 'Easy', 'Medium', 'Hard'].map((diff) => (
            <button
              key={diff}
              id={`tab-diff-${diff.toLowerCase()}`}
              className={`diff-btn ${selectedDifficulty === diff ? 'active' : ''}`}
              onClick={() => handleDifficultyChange(diff)}
            >
              {diff}
            </button>
          ))}
        </div>

        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            id="search-problems-input"
            className="search-input"
            type="text"
            placeholder="Search problems by title or topic..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button className="search-clear-btn" onClick={() => handleSearchChange('')}>✕</button>
          )}
        </div>
      </div>

      {/* High-Density LeetCode Table */}
      <div className="table-container">
        {loading && filteredProblems.length === 0 ? (
          <div className="empty-state">
            <div className="spinner-icon">⚡</div>
            <p>Loading algorithmic challenges from database...</p>
          </div>
        ) : error && filteredProblems.length === 0 ? (
          <div className="empty-state catalog-error-state">
            <div className="error-state-icon">⚠️</div>
            <h3 className="error-state-title">Unable to connect to database</h3>
            <p className="error-state-msg">{error}</p>
            {onRetry && (
              <button type="button" className="btn-catalog-retry" onClick={() => onRetry()}>
                ↻ Try Again
              </button>
            )}
          </div>
        ) : filteredProblems.length === 0 ? (
          <div className="empty-state">
            <p>No coding problems found matching your criteria.</p>
          </div>
        ) : (
          <>
            <table className="problem-table" id="problemset-table">
              <thead>
                <tr>
                  <th style={{ width: '60px', textAlign: 'center' }}>Status</th>
                  <th style={{ width: '60px' }}>#</th>
                  <th>Title</th>
                  <th>Category Topics</th>
                  <th style={{ width: '130px' }}>Difficulty</th>
                  <th style={{ width: '120px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProblems.map((prob, idx) => {
                  const isSolved = solvedProblemIds.has(prob.id)
                  const displayIndex = (currentPage - 1) * pageSize + idx + 1
                  return (
                    <tr
                      key={prob.id}
                      className="problem-row"
                      id={`problem-row-${prob.id}`}
                      onClick={() => onSelectProblem(prob)}
                    >
                      <td style={{ textAlign: 'center' }}>
                        <span className={`status-indicator ${isSolved ? 'solved' : 'unsolved'}`} title={isSolved ? 'Solved' : 'Not yet solved'}>
                          {isSolved ? '✓' : '○'}
                        </span>
                      </td>
                      <td className="col-number">{prob.id || displayIndex}</td>
                      <td className="col-title">
                        <span className="problem-link">{prob.title}</span>
                      </td>
                      <td className="col-topics">
                        <div className="table-topic-tags">
                          {prob.topics && prob.topics.map((t, i) => (
                            <span key={i} className="mini-topic-pill">
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span className={`difficulty-badge ${prob.difficulty?.toLowerCase()}`}>
                          {prob.difficulty}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn-solve-row"
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelectProblem(prob)
                          }}
                        >
                          {isSolved ? 'Review' : 'Solve'} →
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div className="catalog-pagination">
              <div className="pagination-info">
                Showing{' '}
                <strong>{(currentPage - 1) * pageSize + 1}</strong> to{' '}
                <strong>{Math.min(currentPage * pageSize, filteredProblems.length)}</strong> of{' '}
                <strong>{filteredProblems.length}</strong> challenges
              </div>

              <div className="pagination-actions">
                <button
                  className="btn-page-nav"
                  disabled={currentPage <= 1}
                  onClick={() => {
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                >
                  ← Prev
                </button>

                <div className="page-numbers">
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let pageNum = i + 1
                    if (totalPages > 7) {
                      if (currentPage > 4 && currentPage < totalPages - 2) {
                        pageNum = currentPage - 3 + i
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 6 + i
                      }
                    }
                    return (
                      <button
                        key={pageNum}
                        className={`page-num-btn ${currentPage === pageNum ? 'active' : ''}`}
                        onClick={() => {
                          setCurrentPage(pageNum)
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>

                <button
                  className="btn-page-nav"
                  disabled={currentPage >= totalPages}
                  onClick={() => {
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                >
                  Next →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  </section>
)
}
