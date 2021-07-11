export default {
    //helps to generate random url
    generateRandomString(){
        return Math.random().toString(36).slice(2).substring(0, 15);
    },

   // remove video of participant
    closeVideo(elemId){
        if(document.getElementById(elemId)){
            document.getElementById(elemId).remove();
        }
    },

    //check if browser window is active
    pageHasFocus(){
        return !(document.hidden || document.onfocusout || window.onpagehide || window.onblur);
    },

//split url
    getQString(url='', keyToReturn=''){
        url = url ? url : location.href;
        let queryStrings = decodeURIComponent(url).split('#', 2)[0].split('?', 2)[1];
        
        if(queryStrings){
            let splittedQStrings = queryStrings.split('&');
            
            if(splittedQStrings.length){
                let queryStringObj = {};
                
                splittedQStrings.forEach(function(keyValuePair){
                    let keyValue = keyValuePair.split('=', 2);
                    
                    if(keyValue.length){
                        queryStringObj[keyValue[0]] = keyValue[1];
                    }
                });            
                
                return keyToReturn ? (queryStringObj[keyToReturn] ? queryStringObj[keyToReturn] : null) : queryStringObj;
            }
            
            return null;
        }
        
        return null;
    },

//get user media after it is available via browser
    userMediaAvailable(){
        return !!(navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);
    },

// request browser to allow using camera, microphone, screen etc.
    getUserMedia(){
        if(this.userMediaAvailable()){
            return navigator.mediaDevices.getUserMedia({
                video: true, 
                audio: {
                    echoCancellation: true
                }
               
            });
        }

        else{
            throw new Error('User media not available');
        }
    },

 //ICE SERVER CREDENTIALS
    getIceServer(){
        return {iceServers: [{
   urls: [ "stun:bn-turn1.xirsys.com" ]
}, {
   username: "AtLvSyZXkyGA73-6EkLXjWU3fYwPmhSCthtg2c_1k8dhsUeHleAyeybupMJzZq7mAAAAAGDoKXZzbmVoYWEyMjk2",
   credential: "2e84796c-e0a3-11eb-b5f7-0242ac140004",
   urls: [
       "turn:bn-turn1.xirsys.com:80?transport=udp",
       "turn:bn-turn1.xirsys.com:3478?transport=udp",
       "turn:bn-turn1.xirsys.com:80?transport=tcp",
       "turn:bn-turn1.xirsys.com:3478?transport=tcp",
       "turns:bn-turn1.xirsys.com:443?transport=tcp",
       "turns:bn-turn1.xirsys.com:5349?transport=tcp"
   ]
}]};
    },
    
    //add a chat to the chat messages section
    addChat(data, senderType){
        let chatMsgDiv = document.querySelector('#chat-messages');
        let contentAlign = 'justify-content-end';
        let senderName = 'You';
        let msgBg = 'bg-white';
      //change color according to sender
        if(senderType === 'remote'){
            contentAlign = 'justify-content-start';
            senderName = data.sender;
            msgBg = '';

            this.toggleChatNotificationBadge();
        }
        //create and render a message element
        let infoDiv = document.createElement('div');
        infoDiv.className = 'sender-info';
        infoDiv.innerHTML = `${senderName} , ${moment().format('h:mm a')}`;

        let colDiv = document.createElement('div');
        colDiv.className = `col-10 card chat-card msg ${msgBg}`;
        colDiv.innerHTML =  data.msg;

        let rowDiv = document.createElement('div');
        rowDiv.className = `row ${contentAlign} mb-2`;


        colDiv.appendChild(infoDiv);
        rowDiv.appendChild(colDiv);

        chatMsgDiv.appendChild(rowDiv);

        /**
         * Move focus to the newly added message but only if:
         * 1. Page has focus
         * 2. User has not moved scrollbar upward. This is to prevent moving the scroll position if user is reading previous messages.
         */
        if(this.pageHasFocus){
            rowDiv.scrollIntoView();
        }
    },

 //toggle chat badge, on opening the "New" badge disappear.
    toggleChatNotificationBadge(){
        if(document.querySelector('#chat-pane').classList.contains('chat-opened')){
            document.querySelector('#new-chat-notification').setAttribute('hidden', true);
            
        }

        else{
            document.querySelector('#new-chat-notification').removeAttribute('hidden');
            
        }
    }
};