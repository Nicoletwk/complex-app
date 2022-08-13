import axios from "axios"

export default class RegistrationForm {
    constructor() {
        //grabs csrf value from hidden inputs, store in a new property
        this._csrf = document.querySelector('[name="_csrf"]').value
        this.form = document.querySelector("#registration-form")
        //returns an array
        this.allFields = document.querySelectorAll("#registration-form .form-control")
        this.insertValidationElements()
        this.username = document.querySelector("#username-register")
        this.username.previousValue = ""
        this.email = document.querySelector("#email-register")
        this.email.previousValue = ""
        this.password = document.querySelector("#password-register")
        this.password.previousValue = ""
        this.username.isUnique = false
        this.email.isUnique = false
        this.events()
    }

    //Events
    events() {
        //only submit request to server when all fields are complete
        this.form.addEventListener("submit", (e) => {
            e.preventDefault()
            this.formSubmitHandler()
        })

        this.username.addEventListener("keyup", () => {
            this.isDifferent(this.username, this.usernameHandler)
        })
        this.email.addEventListener("keyup", () => {
            this.isDifferent(this.email, this.emailHandler)
        })
        this.password.addEventListener("keyup", () => {
            this.isDifferent(this.password, this.passwordHandler)
        })

        //blur, loses focus, prevent the bypassing of tab 
        this.username.addEventListener("blur", () => {
            this.isDifferent(this.username, this.usernameHandler)
        })
        this.email.addEventListener("blur", () => {
            this.isDifferent(this.email, this.emailHandler)
        })
        this.password.addEventListener("blur", () => {
            this.isDifferent(this.password, this.passwordHandler)
        })
    }

    //Methods
    formSubmitHandler() {
        //run all validation checks
        this.usernameImmediately()
        this.usernameAfterDelay()
        this.emailAfterDelay()
        this.passwordImmediately()
        this.passwordAfterDelay()

        //no errors
        if (
            this.username.isUnique && 
            !this.username.errors && 
            this.email.isUnique &&
            !this.email.errors &&
            !this.password.errors
            ){
            this.form.submit()
        }
    }

    isDifferent(el, handler) {
        if(el.previousValue != el.value){
            handler.call(this)
        }
        el.previousValue = el.value
    }

    usernameHandler() {
        //giving users a clean slate
        this.username.errors = false
        //validation checks that runs immediately
        this.usernameImmediately()
        //timeout, new property
        clearTimeout(this.username.timer)
        this.username.timer = setTimeout(()=> this.usernameAfterDelay(), 800)
    }

    emailHandler() {
        //giving users a clean slate
        this.email.errors = false
        //timeout, new property
        clearTimeout(this.email.timer)
        this.email.timer = setTimeout(()=> this.emailAfterDelay(), 800)
    }

    emailAfterDelay() {
        //check email format, evaluates to true or false
        if (!/^\S+@\S+$/.test(this.email.value)) {
            this.showValidationError(this.email, "You must provide a valid email address")
        }
        //valid email then send off request
        if(!this.email.errors) {
            axios.post("/doesEmailExist", {_csrf: this._csrf, email: this.email.value}).then((response) => {
                if (response.data) {
                    this.email.isUnqiue = false
                    this.showValidationError(this.email, "This email is already in use.")
                } else {
                    this.email.isUnique = true
                    this.hideValidationError(this.email)

                }
            }).catch(() => {
                console.log("error")
            })
        }
    }

    passwordHandler() {
        //giving users a clean slate
        this.password.errors = false
        //validation checks that runs immediately
        this.passwordImmediately()
        //timeout, new property
        clearTimeout(this.password.timer)
        this.password.timer = setTimeout(()=> this.passwordAfterDelay(), 800)
    }

    passwordImmediately() {
        if (this.password.value.length > 20) {
            this.showValidationError(this.password, "Password cannot exceed 20 characters")
        }

        if (!this.password.errors) {
            this.hideValidationError(this.password)
        }
    }

    passwordAfterDelay () {
        if (this.password.value.length < 10) {
            this.showValidationError(this.password, "Password must be at least 10 characters")
        }
    }

    usernameImmediately() {
        //check if the value is blank and doesn't contain non-alpha-numeric characters with regular expression
        if (this.username.value != "" && !/^([a-zA-Z0-9]+)$/.test(this.username.value)) {
            this.showValidationError(this.username, "Username can only contain letters and numbers.")
        }
        
        if (this.username.value.length > 20) {
            this.showValidationError(this.username, "Username cannot exceed 20 characters")
        }

        if (!this.username.errors) {
            //no errors, hide the rectange
            this.hideValidationError(this.username)
        }

    }

    hideValidationError(el) {
        el.nextElementSibling.classList.remove("liveValidateMessage--visible")
    }

    showValidationError(el, message){
        el.nextElementSibling.innerHTML = message
        el.nextElementSibling.classList.add("liveValidateMessage--visible")
        //if there's an error, display the message
        el.errors = true
    }

    usernameAfterDelay() {
        if (this.username.value.length < 4) {
            this.showValidationError(this.username, "Username must be at least 4 characters")
        }

        //only send request to server if there's no errors
        if (!this.username.errors) {
            //include the csrf token
            axios.post("/doesUsernameExist", {_csrf: this._csrf, username: this.username.value}).then((response) => {
                //responds with true - username exists, show red error
                if (response.data) {
                    this.showValidationError(this.username, "Username already exists.")
                    //will not let username submit response
                    this.username.isUnique = false
                } else {
                    //username available
                    this.username.isUnique = true
                }
            }).catch(() => {
                console.log("Please try again later")
            })
        }
    }

    insertValidationElements() {
        this.allFields.forEach(function(el){
            //add html after each form field
            el.insertAdjacentHTML("afterend", '<div class ="alert alert-danger small liveValidateMessage"></div>')
        })
    }

}