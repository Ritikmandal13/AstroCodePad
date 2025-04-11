import React from 'react';
import { Badge, Tooltip, OverlayTrigger } from 'react-bootstrap';

function ActiveUsers({ users }) {
  // Function to generate initials from username
  const getInitials = (username) => {
    return username
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Function to generate a consistent color based on username
  const getAvatarColor = (username) => {
    const colors = [
      '#4285F4', // Google Blue
      '#EA4335', // Google Red
      '#FBBC05', // Google Yellow
      '#34A853', // Google Green
      '#8E44AD', // Purple
      '#E67E22', // Orange
      '#16A085', // Teal
      '#D35400', // Dark Orange
      '#2980B9', // Blue
      '#C0392B', // Red
    ];
    
    // Simple hash function to get a consistent index
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="active-users-container">
      <div className="active-users-title">Active Users</div>
      <div className="active-users-list">
        {users.map((user) => (
          <OverlayTrigger
            key={user.username}
            placement="bottom"
            overlay={<Tooltip id={`tooltip-${user.username}`}>{user.username}</Tooltip>}
          >
            <div className="user-avatar-container">
              <div 
                className="user-avatar" 
                style={{ backgroundColor: getAvatarColor(user.username) }}
              >
                {getInitials(user.username)}
              </div>
              <div className="online-indicator"></div>
            </div>
          </OverlayTrigger>
        ))}
      </div>
    </div>
  );
}

export default ActiveUsers; 