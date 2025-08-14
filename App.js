import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import './style.css';  // Import the CSS file
import Prism from 'prismjs';  // Syntax highlighting library
import 'prismjs/themes/prism-tomorrow.css';  // Syntax highlighting theme

const socket = io('http://localhost:3001'); // backend URL

function App() {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);  // Loading state
  const [cursorPositions, setCursorPositions] = useState({});  // Track cursor positions
  const docId = 'default-doc'; // Static doc ID for demo purposes
  const textareaRef = useRef();
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Join the document room
    socket.emit('joinDoc', docId);

    // Load document content on join
    socket.on('loadDoc', (docContent) => {
      setContent(docContent);
      setIsLoading(false);
    });

    // Receive real-time changes from others
    socket.on('receiveChanges', (newContent) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      // Save cursor position before updating content
      const cursorPos = textarea.selectionStart;

      setContent(newContent);

      // Restore cursor position after DOM update
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = cursorPos;
      }, 0);
    });

    // Listen for cursor positions of other users
    socket.on('cursorPosition', (userId, position) => {
      setCursorPositions((prev) => ({ ...prev, [userId]: position }));
    });

    return () => {
      socket.off('loadDoc');
      socket.off('receiveChanges');
      socket.off('cursorPosition');
    };
  }, []);

  // Handle changes in the text area
  function handleChange(e) {
    const newVal = e.target.value;
    setContent(newVal);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      socket.emit('sendChanges', { docId, content: newVal });
    }, 300); // 300ms debounce
  }

  // Save content (you can add your save logic here)
  function saveDocument() {
    alert('Document saved!');
  }

  // Clear the document
  function clearDocument() {
    setContent('');
    socket.emit('sendChanges', { docId, content: '' });
  }

  // Send cursor position
  function handleCursorChange(e) {
    const cursorPos = e.target.selectionStart;
    socket.emit('cursorPosition', docId, cursorPos);
  }

  return (
    <div className="editor-container">
      <div className="toolbar">
        <button onClick={saveDocument}>Save</button>
        <button onClick={clearDocument}>Clear</button>
      </div>

      <h2>Real-Time Collaborative Document Editor</h2>

      {isLoading && <div className="loading-spinner"></div>} {/* Show loading spinner */}

      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        onKeyUp={handleCursorChange}  // Update cursor position on key press
        rows={20}
        className="editor-textarea"
      />

      {/* Cursor positioning for other users */}
      <div className="user-cursors">
        {Object.entries(cursorPositions).map(([userId, position]) => (
          <div key={userId} style={{ position: 'absolute', top: position, left: 10, color: 'red' }}>
            {userId} typing...
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
