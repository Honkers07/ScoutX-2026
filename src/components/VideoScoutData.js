import { doc, getFirestore, setDoc } from "firebase/firestore";


const defaultData = {
   match: '',
   scouterName: '',
   redScoreTimeline: [],
   blueScoreTimeline: [],
   redTotalScore: 0,
   blueTotalScore: 0,
   notes: '',
   timestamp: null,
};


export default class VideoScoutData {
   constructor(setAlert) {
       this.data = { ...defaultData };
       this.setAlert = setAlert;


       this.alert = {
           open: false,
           message: "",
           severity: "success",
       };
   }


   set(field, value) {
       this.data[field] = value;
   }


   get(field) {
       return this.data[field];
   }


   async submit() {
       const isIncomplete = this.data.match === '' ||
                           this.data.scouterName === '' ||
                           this.data.redScoreTimeline.length === 0 ||
                           this.data.blueScoreTimeline.length === 0;


       if (isIncomplete) {
           this.sendAlert("Incomplete Form - Please fill in all required fields and process both alliance videos", "error");
           return false;
       }


       this.setAlert({ open: false });
       const db = getFirestore();


       let firebaseData = {
           matchNumber: this.data.match,
           scouterName: this.data.scouterName,
           redScoreTimeline: this.data.redScoreTimeline,
           blueScoreTimeline: this.data.blueScoreTimeline,
           redTotalScore: this.data.redTotalScore,
           blueTotalScore: this.data.blueTotalScore,
           notes: this.data.notes || '',
           timestamp: Date.now(),
       };


       try {
           await setDoc(
               doc(db, "videoScoreData", this.data.match),
               firebaseData
           );
           return true;
       } catch (error) {
           console.error("Error submitting to Firebase:", error);
           this.sendAlert("Error submitting data: " + error.message, "error");
           return false;
       }
   }


   reset() {
       this.data = { ...defaultData };
   }


   sendAlert(message, severity) {
       this.setAlert({ open: true, message, severity });
   }
}
