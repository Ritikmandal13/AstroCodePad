import React, { useState, useEffect } from 'react';
import { Button, Modal, ListGroup, Form, Alert } from 'react-bootstrap';
import { FaShare, FaHistory, FaCopy } from 'react-icons/fa';
import axios from 'axios';

function SessionManager({ sessionId, onSessionChange, username }) {
  const [showShareModal, setShowShareModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [versions, setVersions] = useState([]);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    if (sessionId) {
      loadVersions();
      // Get the current URL without any query parameters
      const baseUrl = window.location.origin + window.location.pathname;
      setShareUrl(`${baseUrl}?session=${sessionId}`);
    }
  }, [sessionId]);

  const loadVersions = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/sessions/${sessionId}/versions`);
      setVersions(response.data);
    } catch (err) {
      setError('Failed to load version history');
      console.error(err);
    }
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleHistory = () => {
    setShowHistoryModal(true);
    loadVersions();
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const restoreVersion = async (versionIndex) => {
    try {
      const response = await axios.post(`http://localhost:5000/api/sessions/${sessionId}/restore`, {
        versionIndex
      });
      onSessionChange(response.data.code);
      setShowHistoryModal(false);
    } catch (err) {
      setError('Failed to restore version');
      console.error(err);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="session-manager">
      <Button
        variant="outline-primary"
        size="sm"
        className="me-2"
        onClick={handleShare}
      >
        <FaShare className="me-1" />
        Share
      </Button>
      
      <Button
        variant="outline-secondary"
        size="sm"
        onClick={handleHistory}
      >
        <FaHistory className="me-1" />
        History
      </Button>

      {/* Share Modal */}
      <Modal show={showShareModal} onHide={() => setShowShareModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Share Session</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Share this URL with others to collaborate:</p>
          <div className="d-flex align-items-center">
            <Form.Control
              type="text"
              value={shareUrl}
              readOnly
            />
            <Button
              variant="outline-primary"
              className="ms-2"
              onClick={copyToClipboard}
            >
              <FaCopy />
            </Button>
          </div>
          {copied && (
            <Alert variant="success" className="mt-2">
              URL copied to clipboard!
            </Alert>
          )}
          <Alert variant="info" className="mt-3">
            <strong>Note:</strong> Make sure both users are on the same network. If not, replace 'localhost' with the host computer's IP address.
          </Alert>
        </Modal.Body>
      </Modal>

      {/* History Modal */}
      <Modal show={showHistoryModal} onHide={() => setShowHistoryModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Version History</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          )}
          <ListGroup>
            {versions.map((version, index) => (
              <ListGroup.Item
                key={index}
                className="d-flex justify-content-between align-items-center"
              >
                <div>
                  <div className="fw-bold">{version.author}</div>
                  <small className="text-muted">{formatDate(version.timestamp)}</small>
                </div>
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => restoreVersion(index)}
                >
                  Restore
                </Button>
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default SessionManager; 