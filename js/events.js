import functions from './functions.js';

window.addEventListener('load', ()=>{
    
    //When the chat icon is clicked
    document.querySelector('#toggle-chat-pane').addEventListener('click', (e)=>{
        document.querySelector('#chat-pane').classList.toggle('chat-opened');

        //remove the 'New' badge on chat icon (if any) once chat is opened, also toggle chat pane
        setTimeout(()=>{
            if(document.querySelector('#chat-pane').classList.contains('chat-opened')){
                document.querySelector('#chat-pane').removeAttribute('hidden');
                document.querySelector('#chat-input').removeAttribute('hidden');
                functions.toggleChatNotificationBadge();
            }
            else
            {
                document.querySelector('#chat-pane').setAttribute('hidden', true);
                document.querySelector('#chat-input').setAttribute('hidden', true);
            }
        }, 300);
    });
    //dark-mode toggle
    document.querySelector('#toggle-darkmode').addEventListener('click', (e)=>{
        
       //change bgcolor to secondary/dark
        if(document.querySelector('#dark-mode').getAttribute('class')=='bg-dark')
        {   document.querySelector('#dark-mode').removeAttribute('class','bg-dark');
            

        }
        else{
            document.querySelector('#dark-mode').setAttribute('class','bg-dark');
           
           
        }
    
    });


    //When the video frame is clicked. This will enable picture-in-picture mode
    document.getElementById('local').addEventListener('click', ()=>{
        if (!document.pictureInPictureElement) {
            document.getElementById('local').requestPictureInPicture()
            .catch(error => {
                // Video failed to enter Picture-in-Picture mode.
                console.error(error);
            });
        } 
          
        else {
            document.exitPictureInPicture()
            .catch(error => {
                // Video failed to leave Picture-in-Picture mode.
                console.error(error);
            });
        }
    });
    

    //When the 'Create room" is button is clicked
    document.getElementById('create-room').addEventListener('click', (e)=>{
        e.preventDefault();

        let roomName = document.querySelector('#room-name').value;
        let yourName = document.querySelector('#your-name').value;

        if(roomName && yourName){
            //remove error message, if any
            document.querySelector('#err-msg').innerHTML = "";
            
            //save the user's name in sessionStorage
            sessionStorage.setItem('username', yourName);

            //create meeting url
            let roomLink = `${location.origin}?room=${roomName.trim().replace(' ', '_')}_${functions.generateRandomString()}`;

            //show message with link to room
            document.querySelector('#room-created').innerHTML = ` <a href='${roomLink}'>JOIN MEETING</a>.`;
                document.querySelector('#room-created').removeAttribute('hidden');
            //empty the values
            document.querySelector('#room-name').value = '';
            document.querySelector('#your-name').value = '';
            
        }

        else{
            document.querySelector('#err-msg').innerHTML = "please fill all feilds";
        }
    });
  

    //When the 'Enter room' button is clicked.
    document.getElementById('enter-room').addEventListener('click', (e)=>{
        e.preventDefault();

        let name = document.querySelector('#username').value;

        if(name){
            //remove error message, if any
            document.querySelector('#err-msg-username').innerHTML = "";

            //save the new user's name in sessionStorage
            sessionStorage.setItem('username', name);

            //reload room
            location.reload();
        }
           //throw error if all feild not filled
        else{
            document.querySelector('#err-msg-username').innerHTML = "Please input your name";
        }
    });
})