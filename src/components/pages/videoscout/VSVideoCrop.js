import {
  Box,
  Typography,
  Stack,
  Button,
  Slider,
  Paper,
  IconButton,
} from "@mui/material";
import { useState, useRef, useEffect } from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CropIcon from "@mui/icons-material/Crop";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";

// Default time crop duration in seconds (full match = 163s)
const DEFAULT_TIME_DURATION = 163;

// Helper function to format time with hundredths precision (MM:SS.xx)
const formatTimePrecise = (seconds) => {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toFixed(2).padStart(5, "0")}`;
};

export default function VSVideoCrop(props) {
  const { videoPreview, alliance, onConfirm, onBack } = props;

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Initial crop region - full video by default
  const [cropRegion, setCropRegion] = useState({
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [videoDimensions, setVideoDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [canvasScale, setCanvasScale] = useState(1);

  // Time range state for temporal cropping
  const [videoDuration, setVideoDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [startTimeWhole, setStartTimeWhole] = useState(0); // Whole seconds (0, 1, 2, 3...)
  const [startTimeFraction, setStartTimeFraction] = useState(0); // Hundredths (0.00 - 1.00)
  const [isPlaying, setIsPlaying] = useState(false);

  const allianceColor = alliance === "red" ? "#ef5350" : "#42a5f5";
  const allianceLabel = alliance === "red" ? "Red Alliance" : "Blue Alliance";

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      const handleLoadedMetadata = () => {
        setVideoDimensions({
          width: video.videoWidth,
          height: video.videoHeight,
        });
        setVideoDuration(video.duration);
        // Initialize start time to 0
        setStartTime(0);
        setStartTimeWhole(0);
        setStartTimeFraction(0);
      };

      video.addEventListener("loadedmetadata", handleLoadedMetadata);

      return () => {
        video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      };
    }
  }, [videoPreview]);

  // Draw crop overlay on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    const containerWidth = container.clientWidth;
    const scale = containerWidth / videoDimensions.width;
    setCanvasScale(scale);

    canvas.width = containerWidth;
    canvas.height = videoDimensions.height * scale;

    // Draw semi-transparent overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Clear the crop region (make it transparent)
    const scaledCrop = {
      x: cropRegion.x * scale * (videoDimensions.width / 100),
      y: cropRegion.y * scale * (videoDimensions.height / 100),
      width: cropRegion.width * scale * (videoDimensions.width / 100),
      height: cropRegion.height * scale * (videoDimensions.height / 100),
    };

    ctx.clearRect(
      scaledCrop.x,
      scaledCrop.y,
      scaledCrop.width,
      scaledCrop.height
    );

    // Draw crop border
    ctx.strokeStyle = allianceColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(
      scaledCrop.x,
      scaledCrop.y,
      scaledCrop.width,
      scaledCrop.height
    );

    // Draw corner handles
    const handleSize = 10;
    ctx.fillStyle = allianceColor;
    // Top-left
    ctx.fillRect(
      scaledCrop.x - handleSize / 2,
      scaledCrop.y - handleSize / 2,
      handleSize,
      handleSize
    );
    // Top-right
    ctx.fillRect(
      scaledCrop.x + scaledCrop.width - handleSize / 2,
      scaledCrop.y - handleSize / 2,
      handleSize,
      handleSize
    );
    // Bottom-left
    ctx.fillRect(
      scaledCrop.x - handleSize / 2,
      scaledCrop.y + scaledCrop.height - handleSize / 2,
      handleSize,
      handleSize
    );
    // Bottom-right
    ctx.fillRect(
      scaledCrop.x + scaledCrop.width - handleSize / 2,
      scaledCrop.y + scaledCrop.height - handleSize / 2,
      handleSize,
      handleSize
    );
  }, [cropRegion, videoDimensions, allianceColor, alliance]);

  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const deltaX =
      ((currentX - dragStart.x) / canvasScale / videoDimensions.width) * 100;
    const deltaY =
      ((currentY - dragStart.y) / canvasScale / videoDimensions.height) * 100;

    setCropRegion((prev) => ({
      ...prev,
      x: Math.max(0, Math.min(100 - prev.width, prev.x + deltaX)),
      y: Math.max(0, Math.min(100 - prev.height, prev.y + deltaY)),
    }));

    setDragStart({ x: currentX, y: currentY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle width change
  const handleWidthChange = (event, newValue) => {
    setCropRegion((prev) => ({
      ...prev,
      width: newValue,
      x: Math.min(prev.x, 100 - newValue),
    }));
  };

  // Handle height change
  const handleHeightChange = (event, newValue) => {
    setCropRegion((prev) => ({
      ...prev,
      height: newValue,
      y: Math.min(prev.y, 100 - newValue),
    }));
  };

  // Handle crop start time slider (whole seconds)
  const handleStartTimeWholeChange = (event, newValue) => {
    setStartTimeWhole(newValue);
    // Update combined start time
    const newStartTime = newValue + startTimeFraction;
    setStartTime(newStartTime);
    // Update video to play from this time
    if (videoRef.current) {
      videoRef.current.currentTime = newStartTime;
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  // Handle crop start time slider (fractional seconds - hundredths)
  const handleStartTimeFractionChange = (event, newValue) => {
    setStartTimeFraction(newValue);
    // Update combined start time
    const newStartTime = startTimeWhole + newValue;
    setStartTime(newStartTime);
    // Update video to play from this time
    if (videoRef.current) {
      videoRef.current.currentTime = newStartTime;
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  // Increment/decrement whole seconds by 1
  const adjustWholeSeconds = (delta) => {
    const maxWhole = Math.max(0, Math.floor(videoDuration - 1));
    const newWhole = Math.max(0, Math.min(startTimeWhole + delta, maxWhole));
    handleStartTimeWholeChange(null, newWhole);
  };

  // Increment/decrement hundredths by 0.01
  const adjustHundredths = (delta) => {
    const newFraction = Math.max(0, Math.min(startTimeFraction + delta, 0.99));
    handleStartTimeFractionChange(null, newFraction);
  };

  // Toggle play/pause for preview
  const togglePlayPause = () => {
    const video = videoRef.current;
    if (video) {
      if (isPlaying) {
        video.pause();
      } else {
        video.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Jump to crop start time
  const jumpToCropStart = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = startTime;
    }
  };

  // Update play state from video events
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);

      video.addEventListener("play", handlePlay);
      video.addEventListener("pause", handlePause);

      return () => {
        video.removeEventListener("play", handlePlay);
        video.removeEventListener("pause", handlePause);
      };
    }
  }, []);

  // Calculate end time (start + duration, but not beyond video duration)
  // Note: The default time duration is in video time, NOT real/scoreboard time
  // We pass this to the backend to determine how much video to process
  const endTime = Math.min(startTime + DEFAULT_TIME_DURATION, videoDuration);

  const handleConfirm = () => {
    // Validate video dimensions before calculating crop
    if (videoDimensions.width === 0 || videoDimensions.height === 0) {
      console.error(
        "[VSVideoCrop] Video dimensions not available - video may not be loaded"
      );
      return;
    }

    // Convert percentage to pixel values for spatial cropping
    const pixelCrop = {
      x: Math.round((cropRegion.x / 100) * videoDimensions.width),
      y: Math.round((cropRegion.y / 100) * videoDimensions.height),
      width: Math.round((cropRegion.width / 100) * videoDimensions.width),
      height: Math.round((cropRegion.height / 100) * videoDimensions.height),
    };

    // Pass both spatial crop and time range
    onConfirm({
      ...pixelCrop,
      startTime: startTime,
      endTime: endTime,
    });
  };

  return (
    <Box sx={{ width: "100%", mt: 2 }}>
      <Typography variant="h6" sx={{ mb: 2, color: allianceColor }}>
        Crop {allianceLabel} Score Region
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Drag to position the crop box over the {alliance} alliance score digits
      </Typography>

      {/* Video with crop overlay */}
      <Paper
        elevation={3}
        sx={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 2,
          backgroundColor: "#000",
        }}
        ref={containerRef}
      >
        <video
          ref={videoRef}
          src={videoPreview}
          style={{
            width: "100%",
            display: "block",
          }}
          muted
          playsInline
        />
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            cursor: isDragging ? "grabbing" : "grab",
          }}
        />
      </Paper>

      {/* Play/Pause button */}
      <Stack direction="row" justifyContent="center" sx={{ mt: 1 }}>
        <IconButton onClick={togglePlayPause} sx={{ color: allianceColor }}>
          {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
        </IconButton>
      </Stack>

      {/* Crop Start Time Selection - Two sliders for precise control */}
      <Box
        sx={{
          backgroundColor: "rgba(255,255,255,0.1)",
          borderRadius: 1,
          p: 2,
          mt: 2,
        }}
      >
        <Typography variant="subtitle2" color={allianceColor} sx={{ mb: 1 }}>
          Crop Start Time - Two sliders for precise control
        </Typography>

        {/* Whole seconds slider with +/- buttons */}
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconButton
            onClick={() => adjustWholeSeconds(-1)}
            sx={{ color: "white" }}
            size="small"
          >
            <RemoveIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="caption" color="white" sx={{ ml: 1 }}>
              Whole seconds: {startTimeWhole}s
            </Typography>
            <Slider
              value={startTimeWhole}
              onChange={handleStartTimeWholeChange}
              min={0}
              max={Math.max(0, Math.floor(videoDuration - 1))}
              step={1}
              sx={{ color: allianceColor }}
            />
          </Box>
          <IconButton
            onClick={() => adjustWholeSeconds(1)}
            sx={{ color: "white" }}
            size="small"
          >
            <AddIcon />
          </IconButton>
        </Stack>

        {/* Hundredths slider with +/- buttons */}
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconButton
            onClick={() => adjustHundredths(-0.01)}
            sx={{ color: "white" }}
            size="small"
          >
            <RemoveIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="caption" color="white" sx={{ ml: 1 }}>
              Hundredths: +{startTimeFraction.toFixed(2)}s
            </Typography>
            <Slider
              value={startTimeFraction}
              onChange={handleStartTimeFractionChange}
              min={0}
              max={0.99}
              step={0.01}
              sx={{ color: allianceColor }}
            />
          </Box>
          <IconButton
            onClick={() => adjustHundredths(0.01)}
            sx={{ color: "white" }}
            size="small"
          >
            <AddIcon />
          </IconButton>
        </Stack>

        <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
          <Typography variant="body2" color={allianceColor}>
            Total Start: {formatTimePrecise(startTime)}
          </Typography>
          <Typography variant="body2" color={allianceColor}>
            End: {formatTimePrecise(endTime)} (
            {formatTimePrecise(endTime - startTime)})
          </Typography>
        </Stack>

        {/* Preview button */}
        <Button
          variant="outlined"
          size="small"
          onClick={jumpToCropStart}
          sx={{ mt: 1, color: allianceColor, borderColor: allianceColor }}
        >
          Preview from crop start
        </Button>
      </Box>

      {/* Size sliders - width and height */}
      <Box sx={{ mt: 2, px: 1 }}>
        <Typography variant="body2" color="white" gutterBottom>
          Width: {cropRegion.width.toFixed(0)}%
        </Typography>
        <Slider
          value={cropRegion.width}
          onChange={handleWidthChange}
          min={1}
          max={100}
          sx={{ color: allianceColor }}
        />

        <Typography variant="body2" color="white" gutterBottom sx={{ mt: 2 }}>
          Height: {cropRegion.height.toFixed(0)}%
        </Typography>
        <Slider
          value={cropRegion.height}
          onChange={handleHeightChange}
          min={1}
          max={100}
          sx={{ color: allianceColor }}
        />
      </Box>

      {/* Crop info */}
      <Box
        sx={{
          backgroundColor: "rgba(255,255,255,0.1)",
          borderRadius: 1,
          p: 2,
          mt: 2,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Spatial Position: ({cropRegion.x.toFixed(0)}%,{" "}
          {cropRegion.y.toFixed(0)}%)
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Spatial Size: {cropRegion.width.toFixed(0)}% ×{" "}
          {cropRegion.height.toFixed(0)}%
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Time Range: {formatTimePrecise(startTime)} -{" "}
          {formatTimePrecise(endTime)} ({formatTimePrecise(endTime - startTime)}
          )
        </Typography>
      </Box>

      {/* Navigation buttons */}
      <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={onBack}
          fullWidth
        >
          Back
        </Button>
        <Button
          variant="contained"
          startIcon={<CropIcon />}
          onClick={handleConfirm}
          fullWidth
          sx={{
            backgroundColor: allianceColor,
            "&:hover": { backgroundColor: allianceColor },
          }}
        >
          Confirm Crop
        </Button>
      </Stack>
    </Box>
  );
}
