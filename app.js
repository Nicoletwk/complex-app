const express = require("express")
const session = require("express-session")
const MongoStore = require("connect-mongo")
const flash = require("connect-flash")
const markdown = require("marked")
const csrf = require("csurf")
const app = express()
const sanitizeHTML = require("sanitize-html")

app.use(express.urlencoded({extended: false}))
app.use(express.json())

app.use("/api", require("./router-api"))

let sessionOptions = session({
    secret: "secret",
    //by default it will store in memory, can override it with a new option
    store: MongoStore.create({client: require("./db")}),
    resave: false,
    saveUninitialized: false,
    cookie: {maxAge: 1000 * 60 * 60 * 24, httpOnly: true}
})

app.use(sessionOptions)
app.use(flash())

app.use(function(req, res, next){
    //make markdown function available from within ejs templates
    res.locals.filterUserHTML = function(content){
        return sanitizeHTML(markdown.parse(content), {allowedTags: ['p', 'br', 'ul', 'li', 'strong', 'bold', 'h1', 'h2', 'h3']})
    }

    //make all error and success flash messages available from all templates
    res.locals.errors = req.flash("errors")
    res.locals.success = req.flash("success")
    //make current user id available on the req object
    if (req.session.user) {req.visitorId = req.session.user._id} else {req.visitorId = 0}
    //make user session data available from within view templates
    res.locals.user = req.session.user
    next()
})

const router = require("./router")
const db = require("./db")
const { read } = require("fs")

app.use(express.static("public"))
app.set("views", "views")
app.set("view engine", "ejs")

//any of our requests will need to have a matching and valid csrf token
app.use(csrf())

//token value to be outputted
app.use(function(req, res, next) {
    res.locals.csrfToken = req.csrfToken()
    next()
})

app.use("/", router)

app.use(function(err, req, res, next) {
    if (err) {
        if (err.code == "EBADCSRFTOKEN") {
            req.flash("errors", "Cross site request forgery detected")
            req.session.save(() => res.redirect("/"))
        } else {
            res.render("404")
        }
    } 
})

//create a server using our express app as its handler 
const server = require("http").createServer(app)

//add socket functionality to the server, will tell our server to listen
const io = require("socket.io")(server)

//integrate express session package with socket io package
io.use(function(socket, next) {
    //runs any time there's a new transfer of data
    //makes express section data available from within the context of socket io
    sessionOptions(socket.request, socket.request.res, next)
})

io.on("connection",function (socket) {
    //only if the web browser that's opened a socket connection and logged in
    if (socket.request.session.user) {
        //storing basic things in the session data
        let user = socket.request.session.user 

        //runs when a new connection is established
        socket.emit("welcome", {username: user.username, avatar: user.avatar})

        socket.on("chatMessageFromBrowser", function(data) {
            //emit event to all browsers except the socket connection that sent it out
            //prevent malicious users in the chatlog
            socket.broadcast.emit("chatMessageFromServer", {message: sanitizeHTML(data.message, {allowedTags: [], allowedAttributes: {}}), username: user.username, avatar: user.avatar})
        })
    }
})

module.exports = server