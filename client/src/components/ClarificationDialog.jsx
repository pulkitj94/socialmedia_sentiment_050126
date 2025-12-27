import React from 'react';
import './ClarificationDialog.css';

/**
 * ClarificationDialog Component
 *
 * Displays a modal dialog when the system needs clarification from the user.
 * Shows a question with multiple choice options for the user to select.
 *
 * @param {Object} props
 * @param {Object} props.clarification - Clarification object from backend
 * @param {string} props.clarification.question - The question to ask the user
 * @param {Array} props.clarification.options - Array of option objects
 * @param {Object} props.clarification.issue - The detected issue
 * @param {Function} props.onSelect - Callback when user selects an option
 * @param {Function} props.onCancel - Callback when user cancels/wants to rephrase
 * @param {boolean} props.isOpen - Whether the modal is open
 */
export default function ClarificationDialog({ clarification, onSelect, onCancel, isOpen }) {
  if (!isOpen || !clarification) return null;

  const handleOptionClick = (option) => {
    onSelect(option);
  };

  const handleBackdropClick = (e) => {
    // Close if clicking the backdrop (not the modal content)
    if (e.target.classList.contains('clarification-backdrop')) {
      onCancel();
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'high':
        return '#ef4444'; // red
      case 'medium':
        return '#f59e0b'; // orange
      case 'warning':
        return '#eab308'; // yellow
      default:
        return '#3b82f6'; // blue
    }
  };

  return (
    <div className="clarification-backdrop" onClick={handleBackdropClick}>
      <div className="clarification-modal">
        <div className="clarification-header">
          <div className="clarification-icon">🤔</div>
          <h3>Clarification Needed</h3>
          {clarification.issue && (
            <div
              className="clarification-severity"
              style={{ backgroundColor: getSeverityColor(clarification.issue.severity) }}
            >
              {clarification.issue.severity?.toUpperCase()}
            </div>
          )}
        </div>

        <div className="clarification-content">
          <p className="clarification-question">{clarification.question}</p>

          {clarification.issue && (
            <div className="clarification-issue">
              <strong>Issue Detected:</strong>
              <p>{clarification.issue.message || clarification.issue.specificIssue}</p>
            </div>
          )}

          <div className="clarification-options">
            <p className="options-label">Please choose an option:</p>
            {clarification.options.map((option, index) => (
              <button
                key={index}
                className="clarification-option-btn"
                onClick={() => handleOptionClick(option)}
              >
                <span className="option-number">{index + 1}</span>
                <span className="option-label">{option.label || option}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="clarification-footer">
          <button className="clarification-cancel-btn" onClick={onCancel}>
            ✏️ Let me rephrase my question
          </button>
        </div>
      </div>
    </div>
  );
}
