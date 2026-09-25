'use client'

import React, { useState } from 'react'

export function InterviewScorecardModal({ scorecard, problemTitle, onClose }) {
  const [copied, setCopied] = useState(false)

  if (!scorecard) return null

  const {
    verdict = 'Hire',
    overall_summary = '',
    scores = {},
    strengths = [],
    areas_for_improvement = [],
    complexity_verdict = {}
  } = scorecard

  const verdictClass = verdict.toLowerCase().replace(/\s+/g, '-')

  const copyReportToClipboard = () => {
    const reportText = `
# FAANG Technical Interview Evaluation Report
**Problem:** ${problemTitle}
**Final Verdict:** ${verdict}
**Overall Summary:** ${overall_summary}

## 📊 Core Pillar Ratings (Out of 5.0)
- **Communication & Articulation:** ${scores.communication ?? 4.0}/5.0
- **Problem Solving & Big-O:** ${scores.problem_solving ?? 4.0}/5.0
- **Code Quality & Syntax:** ${scores.code_quality ?? 4.0}/5.0
- **Verification & Edge Cases:** ${scores.verification ?? 4.0}/5.0

## ⏱️ Asymptotic Complexity Analysis
- Optimal Target: Time: ${complexity_verdict.optimal_time || 'O(N)'}, Space: ${complexity_verdict.optimal_space || 'O(1)'}
- Assessed Candidate: Time: ${complexity_verdict.candidate_time || 'O(N)'}, Space: ${complexity_verdict.candidate_space || 'O(1)'}

## ✅ Candidate Strengths
${strengths.map(s => `- ${s}`).join('\n')}

## 💡 Areas for Improvement
${areas_for_improvement.map(a => `- ${a}`).join('\n')}
    `.trim()

    navigator.clipboard.writeText(reportText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <div className="scorecard-modal-backdrop" id="faang-scorecard-modal">
      <div className="scorecard-modal-content">
        {/* Header */}
        <div className="scorecard-header-bar">
          <div className="scorecard-title-group">
            <h2>🏆 FAANG Hiring Committee Scorecard</h2>
            <p>Comprehensive algorithmic & communication evaluation for: <strong>{problemTitle}</strong></p>
          </div>
          <button className="scorecard-close-x" onClick={onClose} title="Close Scorecard">✕</button>
        </div>

        {/* Verdict Banner */}
        <div className={`verdict-banner-card ${verdictClass}`}>
          <p className="verdict-summary-text">{overall_summary}</p>
          <span className="verdict-pill-tag">{verdict}</span>
        </div>

        {/* 4 Pillars Grid */}
        <div className="four-pillars-grid">
          <div className="pillar-score-card">
            <div className="pillar-header-row">
              <span>🗣️ Communication</span>
              <span className="pillar-score-val">{scores.communication ?? 4.0} / 5.0</span>
            </div>
            <div className="pillar-progress-track">
              <div
                className="pillar-progress-fill"
                style={{ width: `${((scores.communication ?? 4.0) / 5) * 100}%` }}
              />
            </div>
          </div>

          <div className="pillar-score-card">
            <div className="pillar-header-row">
              <span>🧠 Problem Solving</span>
              <span className="pillar-score-val">{scores.problem_solving ?? 4.0} / 5.0</span>
            </div>
            <div className="pillar-progress-track">
              <div
                className="pillar-progress-fill"
                style={{ width: `${((scores.problem_solving ?? 4.0) / 5) * 100}%` }}
              />
            </div>
          </div>

          <div className="pillar-score-card">
            <div className="pillar-header-row">
              <span>💻 Code Quality</span>
              <span className="pillar-score-val">{scores.code_quality ?? 4.0} / 5.0</span>
            </div>
            <div className="pillar-progress-track">
              <div
                className="pillar-progress-fill"
                style={{ width: `${((scores.code_quality ?? 4.0) / 5) * 100}%` }}
              />
            </div>
          </div>

          <div className="pillar-score-card">
            <div className="pillar-header-row">
              <span>🔍 Verification & Edge Cases</span>
              <span className="pillar-score-val">{scores.verification ?? 4.0} / 5.0</span>
            </div>
            <div className="pillar-progress-track">
              <div
                className="pillar-progress-fill"
                style={{ width: `${((scores.verification ?? 4.0) / 5) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Strengths & Improvements */}
        <div className="feedback-columns-grid">
          <div className="feedback-column-card strengths">
            <h4>✨ Key Strengths</h4>
            <ul className="feedback-bullet-list">
              {(strengths.length > 0 ? strengths : ['Good initial problem decomposition', 'Communicated continuously while coding']).map((s, idx) => (
                <li key={idx}>{s}</li>
              ))}
            </ul>
          </div>

          <div className="feedback-column-card improvements">
            <h4>🎯 Focus Areas for Improvement</h4>
            <ul className="feedback-bullet-list">
              {(areas_for_improvement.length > 0 ? areas_for_improvement : ['Trace null/empty inputs proactively before submitting', 'Clearly quantify Big-O bounds early']).map((a, idx) => (
                <li key={idx}>{a}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="scorecard-footer-actions">
          <button className="btn-secondary-flat" onClick={onClose}>
            Close & Continue Coding
          </button>
          <button className="btn-primary-gradient" onClick={copyReportToClipboard}>
            {copied ? '✓ Report Copied to Clipboard!' : '📋 Copy Full Evaluation Report'}
          </button>
        </div>
      </div>
    </div>
  )
}
