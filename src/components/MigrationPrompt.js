import React, { useEffect } from 'react';

const MigrationPrompt = ({ onComplete }) => {
  // Bypass migration prompt entirely
  useEffect(() => {
    if (onComplete) {
      onComplete();
    }
  }, [onComplete]);

  // Return null to not render anything
  return null;
};

export default MigrationPrompt; 