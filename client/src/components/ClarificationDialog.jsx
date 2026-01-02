import { useState } from 'react';
import './ClarificationDialog.css';

/**
 * V4.3 DIAGNOSTIC VERSION
 * Logs everything to help debug option display issues
 */
function ClarificationDialog({ clarification, onSelect, onCancel, isOpen }) {
  const [isClosing, setIsClosing] = useState(false);

  // Don't render if not open or no clarification data
  if (!isOpen || !clarification) {
    return null;
  }

  // ═══════════════════════════════════════════════════════════
  // DIAGNOSTIC LOGGING - REMOVE AFTER DEBUGGING
  // ═══════════════════════════════════════════════════════════
  console.log('🔍 ClarificationDialog Debug:');
  console.log('Raw clarification object:', JSON.stringify(clarification, null, 2));
  console.log('clarification.options:', clarification.options);
  console.log('clarification.alternatives:', clarification.alternatives);
  console.log('clarification.suggestedOptions:', clarification.suggestedOptions);
  console.log('clarification.suggestedQueries:', clarification.suggestedQueries);
  // ═══════════════════════════════════════════════════════════

  // Handle both V4.2 (simple) and V4.3 (rich) formats
  const isRichFormat = clarification.alternatives || clarification.dataAvailable;

  // Get the main question/reason
  const mainQuestion = clarification.question || clarification.reason || clarification.clarificationNeeded;

  // Get options (handle multiple formats)
  let options = [];

  if (clarification.options && Array.isArray(clarification.options)) {
    console.log('✅ Using clarification.options');
    // V4.2 simple format or V4.3 options array
    options = clarification.options.map(opt => {
      if (typeof opt === 'string') {
        return { label: opt };
      } else if (typeof opt === 'object') {
        return {
          label: opt.label || opt.option || opt.query || 'Unknown option',
          description: opt.description || opt.category,
          reasoning: opt.reasoning
        };
      }
      return { label: 'Unknown option' };
    });
  } else if (clarification.alternatives && Array.isArray(clarification.alternatives)) {
    console.log('✅ Using clarification.alternatives');
    // V4.3 alternatives format
    options = clarification.alternatives.map(alt => ({
      label: alt.option || alt.label || 'Unknown alternative',
      description: alt.description,
      reasoning: alt.reasoning
    }));
  } else if (clarification.suggestedOptions && Array.isArray(clarification.suggestedOptions)) {
    console.log('✅ Using clarification.suggestedOptions');
    // V4.2 suggestedOptions format
    options = clarification.suggestedOptions.map(opt => {
      if (typeof opt === 'string') {
        return { label: opt };
      } else if (typeof opt === 'object') {
        return {
          label: opt.label || opt.option || 'Unknown option',
          description: opt.description
        };
      }
      return { label: 'Unknown option' };
    });
  } else if (clarification.suggestedQueries && Array.isArray(clarification.suggestedQueries)) {
    console.log('✅ Using clarification.suggestedQueries');
    // V4.2 suggestedQueries format (for out-of-scope queries)
    options = clarification.suggestedQueries.map(sq => ({
      label: sq.query || sq.label || 'Unknown query',
      description: sq.category || sq.description
    }));
  }

  console.log('📊 Final options array:', options);
  console.log('📊 Options count:', options.length);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onCancel();
    }, 200);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleOptionClick = (option) => {
    console.log('Option clicked:', option);
    // Extract the text to send back
    const selectedText = typeof option === 'string' ? option : (option.label || option.option || option.query);
    console.log('Sending selection:', selectedText);
    onSelect(selectedText);
  };

  return (
    <div
      className={`clarification-overlay ${isClosing ? 'closing' : ''}`}
      onClick={handleBackdropClick}
    >
      <div className={`clarification-modal ${isClosing ? 'closing' : ''}`}>
        {/* Header */}
        <div className="clarification-header">
          <span className="clarification-icon">😳</span>
          <h3 className="clarification-title">Clarification Needed</h3>
        </div>

        {/* Body */}
        <div className="clarification-body">
          {/* Main Question */}
          {mainQuestion && (
            <p className="clarification-question">{mainQuestion}</p>
          )}

          {/* Explanation (V4.3) */}
          {clarification.explanation && (
            <div className="clarification-explanation">
              {clarification.explanation}
            </div>
          )}

          {/* Data Availability (V4.3) */}
          {(clarification.dataAvailable || clarification.dataNotAvailable) && (
            <div className="clarification-data-info">
              {clarification.dataAvailable && clarification.dataAvailable.length > 0 && (
                <div className="data-available">
                  <strong>✅ Data Available:</strong>
                  <ul>
                    {clarification.dataAvailable.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {clarification.dataNotAvailable && clarification.dataNotAvailable.length > 0 && (
                <div className="data-not-available">
                  <strong>❌ Data NOT Available:</strong>
                  <ul>
                    {clarification.dataNotAvailable.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Suggested Actions (V4.3) */}
          {clarification.suggestedActions && clarification.suggestedActions.length > 0 && (
            <div className="suggested-actions">
              <strong>💡 Suggested Actions:</strong>
              <ul>
                {clarification.suggestedActions.map((action, idx) => (
                  <li key={idx}>{action}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Options */}
          <div className="clarification-options-section">
            <p className="clarification-prompt">PLEASE CHOOSE AN OPTION:</p>

            {options.length === 0 ? (
              <div className="no-options-error">
                ⚠️ No options available. This is a bug - please report it.
                <br />
                <small>Debug info: Check browser console for details</small>
              </div>
            ) : (
              <div className="clarification-options">
                {options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleOptionClick(option)}
                    className={`clarification-option ${isRichFormat ? 'rich-option' : ''}`}
                  >
                    <div className="option-number">{index + 1}</div>
                    <div className="option-content">
                      <div className="option-label">
                        {option.label || 'No label'}
                      </div>
                      {option.description && (
                        <div className="option-description">
                          → {option.description}
                        </div>
                      )}
                      {option.reasoning && (
                        <div className="option-reasoning">
                          <em>Why relevant:</em> {option.reasoning}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Helpful Context (V4.3) */}
          {clarification.helpfulContext && (
            <div className="helpful-context">
              💭 {clarification.helpfulContext}
            </div>
          )}

          {/* Suggestion (V4.2 legacy) */}
          {clarification.suggestion && !clarification.helpfulContext && (
            <div className="clarification-suggestion">
              💡 {clarification.suggestion}
            </div>
          )}

          {/* Alternative Query (V4.2 legacy) */}
          {clarification.alternativeQuery && (
            <div className="clarification-alternative">
              🔄 {clarification.alternativeQuery}
            </div>
          )}

          {/* Available Platforms (V4.2 legacy) */}
          {clarification.availablePlatforms && clarification.availablePlatforms.length > 0 && (
            <div className="available-platforms">
              <strong>Available platforms:</strong>
              <div className="platform-list">
                {clarification.availablePlatforms.map((platform, idx) => (
                  <span key={idx} className="platform-badge">{platform}</span>
                ))}
              </div>
            </div>
          )}

          {/* Rephrase Button */}
          <button
            onClick={handleClose}
            className="clarification-rephrase-button"
          >
            ✏️ Let me rephrase my question
          </button>
        </div>
      </div>
    </div>
  );
}

export default ClarificationDialog;