#### _**WEB-TEAMS-CLONE**_ -
MICROSOFT ENGAGE 2021 CHALLENGE - Build a Microsoft Teams clone
Your solution should be a fully functional prototype with at least one mandatory functionality - a minimum of two participants should be able connect with each other using your product to have a video conversation. 

Key features of project:
•	Multi-participants video chat
•	Toggling of video stream
•	Toggling of audio stream (mute & unmute)
•	Text chat, display username, date and time
•	display names of participants during chat and topic of meeting
•	Dark mode, copy link


## Getting Started
•	fork this repository or download the code.
In the terminal, make sure you are in root folder and run script
•   `npm i express`
•	`npm i socket.io`
•	`nodemon app.js`

## File structure
#### `/` - ROOT FOLDER
- #### `css` - This holds all of our css files
    - #### `app.css` - This holds styles of our ejs file.
- #### `js` - This holds all of our js files
    - #### `events.js` - This handles some events of our ejs file.
    - #### `functions.js` - This holds helper functions.
    - #### `stream.js` - This holds common code for communication between server and client for each connection.
    - #### `webrtc.js` - This holds webrtc and socket io methods for implementing videochat and text chat.
- #### `app.js` - uses our static files and routes.
- #### `index.html` - main html document.
- #### `package.json` - Defines npm behaviors and packages.

## Available Scripts

In the project directory, you can run:

### `nodemon app.js`

##  BLOGS AND RESOURCES

•	https://socket.io/docs/v4
•	https://www.w3schools.com/bootstrap/bootstrap_grid_examples.asp, https://momentjs.com/, https://webrtc.org/getting-started/media-devices
•	https://dev.to/arjhun777/video-chatting-and-screen-sharing-with-react-node-webrtc-peerjs-18fg

