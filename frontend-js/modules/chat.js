import DOMPurify from "dompurify"

export default class Chat {
    constructor() {
        this.openedYet = false
        this.chatWrapper = document.querySelector("#chat-wrapper")
        this.openIcon = document.querySelector(".header-chat-icon")
        //call method
        this.injectHTML()
        this.chatLog = document.querySelector("#chat")
        this.chatField = document.querySelector("#chatField")
        this.chatForm = document.querySelector("#chatForm")
        this.closeIcon = document.querySelector(".chat-title-bar-close")
        //call events
        this.events()
    }

    //Events
    events() {
        this.chatForm.addEventListener("submit", (e) => {
            //to prevent a hard reload
            e.preventDefault()
            this.sendMessageToServer()
        })
        //add eventlistenr for click on the chat icon
        //arrow function won't modify the this keyword , point towards our object instead of the thing clicked on
        this.openIcon.addEventListener("click", () => this.showChat())
        this.closeIcon.addEventListener("click", () => this.hideChat())
    } 

    //Methods

    sendMessageToServer() {
        //emit an event to the server from this.socket
        this.socket.emit("chatMessageFromBrowser", {message: this.chatField.value})
        this.chatLog.insertAdjacentHTML("beforeend", DOMPurify.sanitize(`
        <div class="chat-self">
        <div class="chat-message">
          <div class="chat-message-inner">
            ${this.chatField.value}
          </div>
        </div>
        <img class="chat-avatar avatar-tiny" src="${this.avatar}">
      </div>
        `))
        //allow the chat to automatically scroll, how far down the element to be scrolled, all the way to the bottom, scroll position = scroll height 
        this.chatLog.scrollTop = this.chatLog.scrollHeight
        //empty chatField
        this.chatField.value = ""
        //focus the field again
        this.chatField.focus()
    }

    showChat() {
        //first time of opening is set to false
        if (!this.openedYet) {
            this.openConnection()
        }
        this.openedYet = true
        this.chatWrapper.classList.add("chat--visible")
        this.chatField.focus()
    }

    openConnection(){
        //js file in the footer will make the function available to make a connection
        this.socket = io()
        this.socket.on("welcome", data => {
            //store the data in our object
            this.username = data.username
            this.avatar = data.avatar
        })
        this.socket.on("chatMessageFromServer", (data) => {
            this.displayMessageFromServer(data)
        })
    }

    displayMessageFromServer(data) {
        //select the chatlog div and append HTML
        //sanitising the message
        this.chatLog.insertAdjacentHTML("beforeend", DOMPurify.sanitize(`
        <div class="chat-other">
        <a href="/profile/${data.username}"><img class="avatar-tiny" src="${data.avatar}"></a>
        <div class="chat-message"><div class="chat-message-inner">
          <a href="/profile/${data.username}"><strong>${data.username}:</strong></a>
          ${data.message}
        </div></div>
      </div>
        `))
        this.chatLog.scrollTop = this.chatLog.scrollHeight
    }

    injectHTML() {
        this.chatWrapper.innerHTML = `
        <div class="chat-title-bar">Chat <span class="chat-title-bar-close"><i class="fas fa-times-circle"></i></span></div>
        <div id="chat" class="chat-log"> </div>
        <form id="chatForm" class="chat-form border-top">
            <input type="text" class="chat-field" id="chatField" placeholder="Type a message…" autocomplete="off">
        </form>
        `
    }

    hideChat() {
        this.chatWrapper.classList.remove("chat--visible")
    }
}