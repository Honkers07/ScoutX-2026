import {
  Box,
  Typography,
  Stack,
  Button,
  Slider,
  Paper,
} from "@mui/material";
import { useState, useRef, useEffect } from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CropIcon from "@mui/icons-material/Crop";

export default function VSVideoCrop(props) {
  const { videoPreview, alliance, onConfirm, onBack } = props;

  // Note: videoFile prop was removed as it was unused - only videoPreview is needed

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Initial crop region - flexible aspect ratio
  const initialWidth = 30;
  const initialHeight = 15;

  const [cropRegion, setCropRegion] = useState({
    x: 35,
    y: 35,
    width: initialWidth,
    height: initialHeight,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [videoDimensions, setVideoDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [canvasScale, setCanvasScale] = useState(1);

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

  const handleConfirm = () => {
    // Validate video dimensions before calculating crop
    if (videoDimensions.width === 0 || videoDimensions.height === 0) {
      console.error(
        "[VSVideoCrop] Video dimensions not available - video may not be loaded"
      );
      return;
    }

    // Convert percentage to pixel values for actual cropping
    const pixelCrop = {
      x: Math.round((cropRegion.x / 100) * videoDimensions.width),
      y: Math.round((cropRegion.y / 100) * videoDimensions.height),
      width: Math.round((cropRegion.width / 100) * videoDimensions.width),
      height: Math.round((cropRegion.height / 100) * videoDimensions.height),
    };
    onConfirm(pixelCrop);
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
          autoPlay
          loop
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

        <Typography
          variant="body2"
          color="white"
          gutterBottom
          sx={{ mt: 2 }}
        >
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
          Position: ({cropRegion.x.toFixed(0)}%, {cropRegion.y.toFixed(0)}%)
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Size: {cropRegion.width.toFixed(0)}% × {cropRegion.height.toFixed(0)}%
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
