import React from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Modal,
  Fade,
  Backdrop,
  Divider,
  Stack,
  Chip,
} from "@mui/material";

// Password Modal Component
export const PasswordModal = ({
  open,
  passwordInput,
  passwordError,
  onPasswordChange,
  onPasswordSubmit,
  onKeyPress,
}) => (
  <Modal
    open={open}
    closeAfterTransition
    slots={{ backdrop: Backdrop }}
    slotProps={{
      backdrop: {
        timeout: 500,
      },
    }}
  >
    <Fade in={open}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 400,
          bgcolor: "background.paper",
          borderRadius: 2,
          p: 4,
          textAlign: "center",
        }}
      >
        <Typography variant="h5" gutterBottom>
          Admin Access Required
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Enter password to access Match Assignments
        </Typography>
        <TextField
          fullWidth
          type="password"
          label="Password"
          value={passwordInput}
          onChange={onPasswordChange}
          error={passwordError}
          helperText={passwordError ? "Incorrect password" : ""}
          onKeyPress={onKeyPress}
          sx={{ mb: 2 }}
        />
        <Button variant="contained" fullWidth onClick={onPasswordSubmit}>
          Submit
        </Button>
      </Box>
    </Fade>
  </Modal>
);

// Scouter Selection Modal Component
export const SelectionModal = ({
  open,
  selectedSlot,
  scouterPool,
  onClose,
  onAssign,
  onClear,
  isScouterAssignedInMatch,
}) => (
  <Modal
    open={open}
    onClose={onClose}
    closeAfterTransition
    slots={{ backdrop: Backdrop }}
    slotProps={{
      backdrop: {
        timeout: 500,
      },
    }}
  >
    <Fade in={open}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 400,
          maxHeight: "80vh",
          bgcolor: "background.paper",
          borderRadius: 2,
          p: 3,
          overflow: "auto",
        }}
      >
        <Typography variant="h6" gutterBottom>
          Select Scouter for {selectedSlot?.slot}
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {scouterPool.map((scouter) => {
            const isAssigned =
              selectedSlot &&
              isScouterAssignedInMatch(scouter, selectedSlot.matchNumber);
            return (
              <Chip
                key={scouter}
                label={scouter}
                onClick={() => {
                  if (!isAssigned && selectedSlot) {
                    onAssign(selectedSlot.matchNumber, selectedSlot.slot, scouter);
                  }
                }}
                disabled={isAssigned}
                color={isAssigned ? "default" : "primary"}
                variant={isAssigned ? "outlined" : "filled"}
                sx={{
                  m: 0.5,
                  cursor: isAssigned ? "not-allowed" : "pointer",
                  opacity: isAssigned ? 0.5 : 1,
                }}
              />
            );
          })}
        </Box>
        <Button
          fullWidth
          variant="outlined"
          sx={{ mt: 2 }}
          onClick={() => {
            if (selectedSlot) {
              onAssign(selectedSlot.matchNumber, selectedSlot.slot, null);
            }
          }}
        >
          Clear Assignment
        </Button>
      </Box>
    </Fade>
  </Modal>
);

// Add Scouter Modal Component
export const AddScouterModal = ({
  open,
  newScouterName,
  onNameChange,
  onAdd,
  onClose,
  onKeyPress,
}) => (
  <Modal
    open={open}
    onClose={onClose}
    closeAfterTransition
    slots={{ backdrop: Backdrop }}
    slotProps={{
      backdrop: {
        timeout: 500,
      },
    }}
  >
    <Fade in={open}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 350,
          bgcolor: "background.paper",
          borderRadius: 2,
          p: 3,
        }}
      >
        <Typography variant="h6" gutterBottom>
          Add New Scouter
        </Typography>
        <TextField
          fullWidth
          label="Scouter Name"
          value={newScouterName}
          onChange={onNameChange}
          onKeyPress={onKeyPress}
          sx={{ mb: 2 }}
        />
        <Stack direction="row" spacing={2}>
          <Button variant="contained" fullWidth onClick={onAdd}>
            Add
          </Button>
          <Button variant="outlined" fullWidth onClick={onClose}>
            Cancel
          </Button>
        </Stack>
      </Box>
    </Fade>
  </Modal>
);
