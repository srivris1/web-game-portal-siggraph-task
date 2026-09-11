const firebaseConfig = {
  apiKey: "AIzaSyCXNsTPstmqc-uNDAvDHcZyWewRmN82Ot4",
  authDomain: "task-done-f3841.firebaseapp.com",
  projectId: "task-done-f3841",
  storageBucket: "task-done-f3841.firebasestorage.app",
  messagingSenderId: "68308440615",
  appId: "1:68308440615:web:dc0dd91848afd1ab1d2002"
};

let firebaseReady = false;
let firestoreDB = null;

try {
  if (typeof firebase !== 'undefined' && firebase.initializeApp) {
    const app = firebase.initializeApp(firebaseConfig);
    firestoreDB = firebase.firestore();
    firebaseReady = true;
  }
} catch (e) {
  firebaseReady = false;
}
