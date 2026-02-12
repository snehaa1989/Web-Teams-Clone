import functions from './functions.js';
window.addEventListener('load', ()=>{
    const toggleChatPane = document.querySelector('#toggle-chat-pane');
    if (toggleChatPane) {
        toggleChatPane.addEventListener('click', (e)=>{
            const chatPane = document.querySelector('#chat-pane');
            const chatInput = document.querySelector('#chat-input');
            if (chatPane && chatInput) {
                chatPane.classList.toggle('chat-opened');
                setTimeout(()=>{
                    if(chatPane.classList.contains('chat-opened')){
                        chatPane.removeAttribute('hidden');
                        chatInput.removeAttribute('hidden');
                        functions.toggleChatNotificationBadge();
                    }
                    else
                    {
                        chatPane.setAttribute('hidden', true);
                        chatInput.setAttribute('hidden', true);
                    }
                }, 300);
            }
        });
    }
    const toggleDarkMode = document.querySelector('#toggle-darkmode');
    if (toggleDarkMode) {
        toggleDarkMode.addEventListener('click', (e)=>{
            const darkMode = document.querySelector('#dark-mode');
            if (darkMode) {
                if(darkMode.getAttribute('class')=='bg-dark')
                {   darkMode.removeAttribute('class','bg-dark');
                }
                else{
                    darkMode.setAttribute('class','bg-dark');
                }
            }
        });
    }
    const localVideo = document.getElementById('local');
    if (localVideo) {
        localVideo.addEventListener('click', ()=>{
            if (!document.pictureInPictureElement) {
                localVideo.requestPictureInPicture()
                .catch(error => {
                    console.error(error);
                });
            } 
            else {
                document.exitPictureInPicture()
                .catch(error => {
                    console.error(error);
                });
            }
        });
    }
    const createRoomBtn = document.getElementById('create-room');
    if (createRoomBtn) {
        createRoomBtn.addEventListener('click', (e)=>{
            e.preventDefault();
            let roomName = document.querySelector('#room-name').value;
            let yourName = document.querySelector('#your-name').value;
            if(roomName && yourName){
                document.querySelector('#err-msg').innerHTML = "";
                sessionStorage.setItem('username', yourName);
            sessionStorage.setItem('username', yourName);
            let roomLink = `${location.origin}?room=${roomName.trim().replace(' ', '_')}_${functions.generateRandomString()}`;
            document.querySelector('#room-created').innerHTML = ` <a href='${roomLink}'>JOIN MEETING</a>.`;
                document.querySelector('#room-created').removeAttribute('hidden');
            document.querySelector('#room-name').value = '';
            document.querySelector('#your-name').value = '';
        }
        else{
            document.querySelector('#err-msg').innerHTML = "please fill all feilds";
        }
    });
    }
    const enterRoomBtn = document.getElementById('enter-room');
    if (enterRoomBtn) {
        enterRoomBtn.addEventListener('click', function(e) {
            e.preventDefault();
            let name = document.querySelector('#username').value;
            if(name) {
                document.querySelector('#err-msg-username').innerHTML = "";
                sessionStorage.setItem('username', name);
                location.reload();
            }
            else{
                document.querySelector('#err-msg-username').innerHTML = "Please input your name";
            }
        });
    }
});
