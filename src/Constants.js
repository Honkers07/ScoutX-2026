import Home from "./components/pages/Home";
import Credits from "./components/pages/Credits";
import VideoScout from "./components/pages/VideoScout";
import Gambling from "./components/pages/Gambling";
import DataVisualizationDisplay from "./components/pages/DataVisualization/DataVisualizationDisplay"
import TimerPage from "./components/pages/TimerPage";
import FuelScout from "./components/pages/FuelScout";
import Assignments from "./components/pages/Assignments/Assignments";
import FlappyBird3D from "./components/pages/FlappyBird";


export const Constants = {

    pages: [
        // Change between Home v1 and Home v2
        {
            title: "Home",
            path: "/",
            component: Home,
        },
        {
            title: "Video Scout",
            path: "/videoScout",
            component: VideoScout,
        },
        {
            title: "Data Visualization",
            path: "/DataVisualizationDisplay",
            component: DataVisualizationDisplay,
        },
        {
            title: "Credits",
            path: "/credits",
            component: Credits,
        },
        {
            title: "Timer",
            path: "/timer",
            component: TimerPage,
        },
        {
            title: "Fuel Scout",
            path: "/fuelscout",
            component: FuelScout,
        },
        {
            title: "Assignments",
            path: "/assignments",
            component: Assignments,
        },
        {
            title: "FLAPPY BIRD",
            path: "/flappybird",
            component: FlappyBird3D,
        }
    ],


   field: require("./assets/field.png"),
   fieldFlipped: require("./assets/fieldFlipped.png"),
   fieldReef: require("./assets/fieldReef.png"),
   coralGamepiece: require ("./assets/CoralGamepiece.png"),
   algaeGamepiece: require ("./assets/AlgaeGamepiece.png"),
   cranberryAlarmBot: require ("./assets/CranberryAlarmbot.png"),
   WCPBot: require ("./assets/WCPBot.png"),
   kitBot: require ("./assets/KitBot.png"),
   tankDrive: require ("./assets/tankDrive.png"),
   swerveDrive: require ("./assets/swerveDrive.png"),
   oneoneonefrc: require ("./assets/111Frc.png"),
   credits: require ("./assets/credits.png"),
   dataAnalytics: require ("./assets/dataAnalytics.png"),
   pitScout: require ("./assets/pitScout.png"),
   matchScout: require ("./assets/matchScout.png"),
   humanPlayer: require ("./assets/humanPlayer.png"),
   rotateIcon: require ("./assets/rotateIcon.png"),
   backGround: require ("./assets/backGround.png"),


   developers: [
       {
           name: "Jacob Ericson",
           year: "Scouting App Lead - 1st Year",
           icon: require("./assets/jacob.jpeg"),
       },
       {
           name: "Maxwell Tan",
           year: "Developer - 4th Year",
           icon: require("./assets/field.png"),
       },
       {
           name: "Willy Han",
           year: "Developer - 2nd Year",
           icon: require("./assets/field.png"),
       },
   ],


   specialThanks: [
       {
           name: "Mentors",
           description: "Both technical, and non-technical",
       },
       {
           name: "Scouters",
           description: "Again, for giving purpose to this app",
       },
       {
           name: "Material UI React and React Recharts",
           description: "For making this app look passable",
       },
   ],


   previousYears: [
       {
           year: "2020",
           developers: [
               "Alan Sheu",
               "Pranav Tadepalli"
           ]
       },
       {
           year: "2022",
           developers: [
               "Richie Tan",
               "Ashir Rao"
           ]
       },
       {
           year: "2023",
           developers: [
               "Ashir Rao",
               "Elisa Pan",
               "Johann Jacob",
               "Edwin Hou"
           ]
       },
       {
           year: "2024",
           developers: [
               "Eric Hou",
               "Alisa Pan",
               "Ashir Rao",
               "Tyrus Chung"
           ]
       },
       {
            year: "2025",
            developers: [
                "Maxwell Tan",
                "Jacob Ericson",
                "Big Willy"
            ]
       }
   ],
}
