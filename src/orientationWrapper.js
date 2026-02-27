import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Typography } from '@mui/material';
import { Constants } from './Constants';

const OrientationWrapper = ({ children }) => {
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);

  const checkOrientation = useCallback(() => {
    setIsPortrait(window.innerHeight > window.innerWidth);
  }, []);

  useEffect(() => {
    // Use resize event which fires on orientation change
    const handleResize = () => {
      // Delay to ensure accurate orientation detection
      setTimeout(checkOrientation, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('load', checkOrientation);
    
    // Also check periodically in case resize doesn't fire
    const interval = setInterval(checkOrientation, 500);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('load', checkOrientation);
      clearInterval(interval);
    };
  }, [checkOrientation]);

  // Memoize children to prevent re-creation on every render
  const memorizedChildren = useMemo(() => children, [children]);

  if (isPortrait) {
    return (
      <div style={styles.overlay}>
        <img src={Constants.rotateIcon} alt="Rotate Icon" style={styles.icon} />
        <Typography
          variant="h6"
          color="white"
          align="center"
          sx={{ mt: 2, px: 3 }} // Padding on the sides
        >
          Please rotate your device to landscape mode
        </Typography>
      </div>
    );
  }

  return <>{memorizedChildren}</>;
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'black',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    zIndex: 9999,
    padding: '0 16px', // Optional: padding for the whole overlay if you want
  },
  icon: {
    width: '100px',
    height: '100px',
  },
};

export default OrientationWrapper;
