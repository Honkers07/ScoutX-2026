# ScoutX - FRC Robotics Scouting Application

## Project Overview

ScoutX is a comprehensive FIRST Robotics Competition (FRC) scouting application that allows teams to collect, analyze, and visualize match data from competitions. The application supports match scouting, pit scouting, video scouting, and data analytics.

## Tech Stack

- **Frontend**: React 18 with React Router
- **Backend**: Firebase (Firestore, Authentication, Hosting)
- **Build Tool**: Create React App
- **Assignment Generator**: Kotlin with Gradle
- **Video Processing**: Python with OpenCV

## Directory Structure

```
src/                          # React frontend application
├── components/               # React components
│   ├── pages/               # Page components
│   │   ├── DataVisualization/  # Analytics and data tables
│   │   └── videoscout/      # Video scouting components
│   └── *.js                 # Shared components
├── App.js                   # Main app component
├── Constants.js             # Application constants
├── Theme.js                 # Material-UI theme configuration
└── firebase.js              # Firebase configuration

assignment/generator/        # Kotlin-based assignment generator
├── src/main/kotlin/me/tyrus/generator/
│   ├── Api.kt              # API definitions
│   ├── Main.kt             # Main entry point
│   └── data/               # Data classes
└── build.gradle.kts         # Gradle build configuration

functions/                   # Firebase Cloud Functions
├── index.js                # Cloud functions entry point
└── package.json            # Node.js dependencies

video-processor/            # Python video processing
├── app.py                  # Main processing script
├── processors/             # Video processing modules
└── requirements.txt        # Python dependencies

plans/                      # Project planning documents
```

## Coding Conventions

### React/JavaScript
- Use functional components with hooks
- Follow React naming conventions (PascalCase for components, camelCase for functions)
- Use Material-UI components from `@material-ui/core`
- Prefer arrow functions for callbacks
- Use template literals for string interpolation
- Constants should be in UPPER_SNAKE_CASE

### Kotlin
- Follow Kotlin naming conventions
- Use data classes for immutable data structures
- Prefer val over var
- Use companion objects for static members

### Python
- Follow PEP 8 style guide
- Use snake_case for functions and variables
- Use type hints where appropriate

## Firebase Configuration

The project uses Firebase with the following services:
- **Firestore**: NoSQL database for storing match/scouting data
- **Authentication**: User authentication (if enabled)
- **Hosting**: Firebase hosting for the web application
- **Cloud Functions**: Serverless backend functions

### Firestore Collections
- `matchScoutData`: Match scouting data
- `fuelScoutData`: Fuel scouting data (to be added)
- `scouters`: Scouter information
- `teams`: Team data
- `pitData`: Pit scouting data
- `videoScoutData`: Video scouting submissions
- `assignments`: Match assignments

## Common Development Tasks

### Running the Development Server
```bash
npm start
```
Runs the React app in development mode.

### Building for Production
```bash
npm run build
```
Builds the React app for production deployment.

### Deploying to Firebase
```bash
firebase deploy
```
Deploys the app to Firebase Hosting.

### Running Firebase Functions Locally
```bash
cd functions && npm run serve
```

### Building the Assignment Generator
```bash
cd assignment/generator && ./gradlew build
```

## API Endpoints

The assignment generator exposes endpoints (typically on port 8080):
- `GET /api/scouters` - List all scouters
- `GET /api/matches` - Get match schedule
- `POST /api/assignments` - Generate assignments

## State Management

- React Context for global state (theme, user)
- Local component state with useState
- Firebase Realtime updates for live data
- MatchScoutData class for managing scouting data with Firestore integration

## UI/UX Guidelines

- Use the Material-UI theme defined in `Theme.js`
- Primary color: #1565C0 (Blue)
- Secondary color: #FF6F00 (Orange)
- Follow responsive design principles
- Use the `Page` component for consistent page layout

## Important Files

| File | Purpose |
|------|---------|
| [`src/Constants.js`](src/Constants.js:1) | Application-wide constants |
| [`src/Theme.js`](src/Theme.js:1) | Material-UI theme configuration |
| [`src/firebase.js`](src/firebase.js:1) | Firebase initialization |
| [`src/App.js`](src/App.js:1) | Main application routing |
| [`src/components/MatchScoutData.js`](src/components/MatchScoutData.js:1) | Data class for match scouting with Firestore submit |
| [`src/components/pages/FuelScout.js`](src/components/pages/FuelScout.js:1) | Fuel scouting page |
| [`src/components/pages/MatchScout.js`](src/components/pages/MatchScout.js:1) | Match scouting page |
| [`src/components/pages/MatchAssignments.js`](src/components/pages/MatchAssignments.js:1) | Admin match assignments page |
| [`src/components/pages/AssignmentConstants.js`](src/components/pages/AssignmentConstants.js:1) | Assignment constants (scouter pool, colors, verification codes) |
| [`src/components/pages/AssignmentHelpers.js`](src/components/pages/AssignmentHelpers.js:1) | Assignment utility functions |
| [`src/components/pages/AssignmentModals.js`](src/components/pages/AssignmentModals.js:1) | Reusable modal components |
| [`src/components/pages/Assignments.js`](src/components/pages/Assignments.js:1) | My Assignments page (scouter view) |
| [`src/components/pages/ScouterAssignments.js`](src/components/pages/ScouterAssignments.js:1) | Scouter assignments management |
| [`functions/index.js`](functions/index.js:1) | Cloud functions |
| [`assignment/generator/src/main/kotlin/me/tyrus/generator/Main.kt`](assignment/generator/src/main/kotlin/me/tyrus/generator/Main.kt:1) | Assignment generator entry |

## Default Scouter Pool

The application uses the following default scouter names:
- Sophia, Catie, Aiden Y, Aarav, Eileen, Ethan H, Adrian, Andrew, Nova, Ammar
- David, Brian, Anthony, Ty, Cyrus, Nolan, Dylan, Aditya, Alexander, Ethan M
- Logan M, Timofei, Saara, Shaurya, Elana, Charlie, Avyank, Wesley, Dylan X, Eric Y

## Autofill + Verification + Assignment Completion System

### Assignment Data Model

Assignments are stored in Firestore with the following structure:

```
assignments/{scouterName}
```

Each document contains an array of assignment objects:

```javascript
{
  scouterName: "Alex",
  matchNumber: 12,
  teamNumber: 254,
  alliance: "Red",
  position: 1,
  verificationCode: "AX12R",
  completed: false
}
```

### Verification Code Generation

Verification codes are generated using:

```javascript
verificationCode = generateVerificationCode(scouterName, matchNumber, alliance)
// Output format: [initials][match suffix][alliance char]
// Example: Alex + Match 12 + Red → AX12R
```

### Prematch Autofill Flow

1. Scouter enters their name in the MatchScout prematch page
2. System queries assignments for that scouter
3. If assignments exist, fields are autofilled:
   - Match Number
   - Team Number
   - Alliance
   - Position
   - Verification Code
4. "Load Next" button loads the next pending assignment

### Assignment Completion Flow

1. Scouter submits match data
2. System marks the assignment as completed in:
   - localStorage (matchAssignments)
   - Firestore (assignments collection)
3. Assignments page updates in real-time
4. Next assignment can be loaded for the scouter

### Key Functions

| Function | Purpose |
|----------|--------|
| `getAssignmentForScouter(name, match)` | Get specific assignment |
| `getNextAssignment(name)` | Get next pending assignment |
| `markAssignmentComplete(name, match)` | Mark assignment as done |
| `generateVerificationCode(name, match, alliance)` | Generate verification code |

## Constraints

1. **No breaking changes to Firebase schema** - Data consistency is critical
2. **Maintain backward compatibility** - Existing scouting data must remain accessible
3. **No sensitive data in commits** - Use `.env` for API keys and secrets
4. **Follow FRC game rules** - Understand the current year's game mechanics
5. **Mobile-first design** - Scouting often happens on mobile devices

## Shift Management Features

### Generating Shifts

1. Import matches from The Blue Alliance
2. Click "Auto Generate (Shift-Based)"
3. System creates multiple shifts based on scouter pool size

### Editing Shift Groups

When shifts are generated, a new "Shift Groups" panel appears:

1. Each shift shows the match range (e.g., "Shift 1 (Matches 1-15)")
2. Each position has a dropdown to select a scouter
3. Changes automatically update all matches in that shift
4. Click "Save Changes" to persist

### How It Works

- **Multiple shifts**: 30 scouters = 5 shifts of 6 each
- **Match distribution**: 75 matches / 5 shifts = 15 matches per shift
- **Automatic updates**: Editing a shift immediately updates all its match assignments
- **No placeholders**: Only uses actual scouters from the scouter pool

## Data Submission Pattern

To submit data to Firestore, use the `MatchScoutData` class which provides a `submit()` method:

```javascript
import MatchScoutData from "../MatchScoutData";

// In component:
const [alert, setAlert] = useState({ open: false, message: "", severity: "success" });
let data = useMemo(() => new MatchScoutData(setAlert), []);

// Submit to Firestore:
const handleSubmit = async () => {
    const success = await data.submit();
    if (success) {
        // Navigate to next page or show success
    }
};
```

The submit method saves to the `matchScoutData` collection with document ID: `team_match`

## Testing

- Manual testing on multiple devices (phones, tablets, laptops)
- Test with Firebase emulators for local development
- Verify video processing works with various video formats

## External Resources

- FRC Game Manual: https://www.firstinspires.org/robotics/frc/game-and-season
- Firebase Documentation: https://firebase.google.com/docs
- Material-UI: https://mui.com/
- React Documentation: https://react.dev/
