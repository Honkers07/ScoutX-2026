import { useState, useEffect, useRef } from "react";
import HoldTimer from "./HoldTimer";

export default function Timer({ 
  showToggle = false, 
  onTimeSubmit,
  defaultMode = "toggle" // "toggle" or "hold"
}) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef(null);
  const [pauseTimes, setPauseTimes] = useState([]);
  const [startTime, setStartTime] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const startTimeRef = useRef(0);
  
  // Toggle between toggle mode and hold mode
  const [timerMode, setTimerMode] = useState(defaultMode);

  const startStopwatch = () => {
    setHasStarted(true);
    if (!hasStarted) {
      setElapsedTime(0);
    }
    clearInterval(timerRef.current);
    setIsRunning(true);
    const start = Date.now();
    startTimeRef.current = start;
    timerRef.current = setInterval(() => {
      setElapsedTime(Date.now() - start);
    }, 10);
  };

  const calculateElapsedTime = () => {
    let calculatedTime = 0;
    let i = 0;
    if (pauseTimes.length === 0) {
      return Date.now() - startTime;
    }
    pauseTimes.map((time) => {
      if (i == 0) {
        calculatedTime += (time - startTime);
      } else if (i % 2 == 0) {
        calculatedTime += time;
      } else if (i == time.length - 1) {
        calculatedTime += (Date.now() - time);
      } else {
        calculatedTime -= time;
      }
      i++;
    });
    return calculatedTime;
  };

  const stopStopwatch = () => {
    setHasStarted(false);
    setIsRunning(false);
    clearInterval(timerRef.current);
    const finalTime = elapsedTime;
    onTimeSubmit?.(finalTime);
  };

  const accumulatedTimeRef = useRef(0);

  const pauseStopwatch = () => {
    if (isRunning) {
      setPauseTimes([...pauseTimes, Date.now()]);
      accumulatedTimeRef.current = elapsedTime;
      clearInterval(timerRef.current);
    } else {
      const start = Date.now();
      setStartTime(start);
      timerRef.current = setInterval(() => {
        setElapsedTime(accumulatedTimeRef.current + (Date.now() - start));
      }, 10);
    }
    setIsRunning(!isRunning);
  };

  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  const formatTime = (time) => {
    const milliseconds = Math.floor((time % 1000) / 10);
    const seconds = Math.floor((time / 1000) % 60);
    return `${String(seconds).padStart(2, "0")}:${String(milliseconds).padStart(2, "0")}`;
  };

  const toggleTimerMode = () => {
    // Switch mode without resetting the timer
    // Timer continues running if it was running
    setTimerMode(prev => prev === "toggle" ? "hold" : "toggle");
  };

  // Render Hold Timer component
  if (timerMode === "hold") {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        gap: '15px',
        padding: '20px'
      }}>
        <HoldTimer 
          onTimeSubmit={onTimeSubmit}
          isHoldMode={true}
        />
        
        {showToggle && (
          <button
            onClick={toggleTimerMode}
            style={{
              padding: '10px 20px',
              fontSize: '0.9rem',
              borderRadius: '8px',
              border: '1px solid #bdc3c7',
              backgroundColor: '#ecf0f1',
              color: '#2c3e50',
              cursor: 'pointer',
              marginTop: '10px'
            }}
          >
            Switch to Toggle Mode
          </button>
        )}
      </div>
    );
  }

  // Render Toggle Timer component
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      gap: '15px',
      padding: '20px'
    }}>
      <div style={{
        fontSize: '2.5rem',
        fontWeight: 'bold',
        fontFamily: 'monospace',
        color: isRunning ? '#e74c3c' : '#2c3e50'
      }}>
        {formatTime(elapsedTime)}
      </div>
      
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={isRunning ? pauseStopwatch : startStopwatch}
          style={{
            padding: '15px 30px',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: isRunning ? '#f39c12' : '#27ae60',
            color: 'white',
            boxShadow: '0 4px 0 #219a52',
            transform: 'translateY(0)',
            transition: 'all 0.15s ease'
          }}
        >
          {hasStarted ? (isRunning ? 'Pause' : 'Resume') : 'Start'}
        </button>
        
        <button
          onClick={stopStopwatch}
          disabled={!hasStarted}
          style={{
            padding: '15px 30px',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            borderRadius: '8px',
            border: 'none',
            cursor: hasStarted ? 'pointer' : 'not-allowed',
            backgroundColor: hasStarted ? '#e74c3c' : '#bdc3c7',
            color: 'white',
            boxShadow: hasStarted ? '0 4px 0 #c0392b' : 'none',
            transform: 'translateY(0)',
            transition: 'all 0.15s ease'
          }}
        >
          Stop
        </button>
      </div>

      {showToggle && (
        <button
          onClick={toggleTimerMode}
          style={{
            padding: '10px 20px',
            fontSize: '0.9rem',
            borderRadius: '8px',
            border: '1px solid #bdc3c7',
            backgroundColor: '#ecf0f1',
            color: '#2c3e50',
            cursor: 'pointer',
            marginTop: '10px'
          }}
        >
          Switch to Hold Mode
        </button>
      )}
    </div>
  );
}

// Export HoldTimer for direct import if needed
export { HoldTimer };
