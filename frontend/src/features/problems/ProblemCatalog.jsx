'use client'

import React, { useState } from 'react'

export function ProblemCatalog({
  problems = [],
  solvedProblemIds = new Set(),
  onSelectProblem,
  loading = false,
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

  return (
    <section className="catalog-section" id="problemset-catalog">
      {/* Clean LeetCode-style Problemset Header & Progress Summary */}
      <div className="problemset-header-bar">
        <div className="problemset-header-left">
          <div className="problemset-title-group">
            <h1 className="problemset-heading">Problemset</h1>
            <span className="problem-count-badge">{totalCount} Challenges</span>
          </div>
          <p className="problemset-subheading">
            Solve algorithmic problems with real-time Socratic AI hints directly in your workspace.
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
        {loading ? (
          <div className="empty-state">
            <div className="spinner-icon">⚡</div>
            <p>Loading algorithmic challenges from database...</p>
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
    </section>
  )
}
