const User = require("../models/User")
const Post = require("../models/Post")
const Follow = require("../models/Follow")
const jwt = require("jsonwebtoken")
const { readFile } = require("@babel/core/lib/gensync-utils/fs")


exports.apiGetPostsByUsername = async function (req, res) {
    try {
        let authorDoc = await User.findByUsername(req.params.username)
        let posts = await Post.findByAuthorId(authorDoc._id)
        res.json(posts)
    } catch {
        res.json("Sorry, invalid user requested")
    }
}
exports.apiMustBeLoggedIn = function (req, res, next) {
    try {
        //if verified that it's a valid token, store the value
        req.apiUser = jwt.verify(req.body.token, process.env.JWTSECRET)
        next()
    } catch {
        res.json("Sorry, please provide a valid token")
    }
}

exports.sharedProfileData = async function (req, res, next) {
    //all profile-related routes call this function
    let isVisitorsProfile = false
    let isFollowing = false
    if (req.session.user) {
        isVisitorsProfile = req.profileUser._id.equals(req.session.user._id)
        isFollowing = await Follow.isVisitorFollowing(req.profileUser._id, req.visitorId)
    }
    req.isVisitorsProfile = isVisitorsProfile
    req.isFollowing = isFollowing
    //retrieve post, follower and following counts
    //Post model, create a method, all are promises, but all three can run independently, so we do not need to await
    let postCountPromise = Post.countPostsByAuthor(req.profileUser._id)
    let followerCountPromise = Follow.countFollowersByAuthor(req.profileUser._id)
    let followingCountPromise = Follow.countFollowingByAuthor(req.profileUser._id)
    //resolve all three promises to complete before moving on, the all method returns an array, use results to record
    //use square brackets to destructure the array
    let [postCount, followerCount, followingCount] = await Promise.all([postCountPromise, followerCountPromise, followingCountPromise])
    
    req.postCount = postCount
    req.followerCount = followerCount
    req.followingCount = followingCount

    next()
}

exports.mustBeLoggedIn = function(req, res, next){
    if (req.session.user) {
        next()
    } else {
        req.flash("errors", "You must be logged in to create a post.")
        req.session.save(function(){
            res.redirect("/")
        })
    }
}

exports.login = function(req,res){
    let user = new User(req.body)
    user.login().then(function(result){
     //adding a new session object (user) to the request object that is unqie per browser visitor   
        req.session.user = {avatar: user.avatar, username: user.data.username, _id: user.data._id}
        req.session.save(function(){
            res.redirect("/")
        })
    }).catch(function(e){
        req.flash("errors", e)
        //adding a new flash session object, req.session.flash.errors = [e]
        req.session.save(function(){
            res.redirect("/")
        })
    })
}

exports.apiLogin = function(req,res){
    let user = new User(req.body)
    user.login().then(function(result){
        //by default the token will never expire, set expiration date manually, store data into the token, verify with the sign in JWT verify with a secret signature
        res.json(jwt.sign({_id: user.data._id}, process.env.JWTSECRET, {expiresIn: "30d"}))
    }).catch(function(e){
        res.json("sorry, try again")
    })
}

exports.logout = function(req, res){
    req.session.destroy(function(){
        res.redirect("/")
    })
}

exports.register = function(req, res){
    let user = new User(req.body)
    user.register().then(()=> {
        req.session.user = {username: user.data.username, avatar: user.avatar, _id: user.data._id}
        req.session.save(function(){
            res.redirect("/")
        })
    }).catch((regErrors)=>{
        regErrors.forEach(function(error){
            req.flash("regErrors", error)
        })
        req.session.save(function(){
            res.redirect("/")
        })
    })
    
}

exports.doesUsernameExist = function (req, res) {
    //returns a promise, we want it to return true/false
    User.findByUsername(req.body.username).then(function() {
        res.json(true)
    }).catch(function() {
        res.json(false)
    })
}

exports.doesEmailExist = async function (req, res) {
    //create a method that returns a promise that resolves with T/F, async
    let emailBool = await User.doesEmailExist(req.body.email)
    res.json(emailBool)
}

exports.home = async function(req, res){
    //whether the visitor or broswer has session data associated to them   
    if(req.session.user){
        //fetch feed of posts for current user
        //create a method with Post model, pass in the user, returns a promise
        let posts = await Post.getFeed(req.session.user._id)
        res.render("home-dashboard", {posts: posts})
    } else {
        res.render("home-guest", {regErrors: req.flash("regErrors")})
    }
}

exports.ifUserExists = function(req, res, next){
    User.findByUsername(req.params.username).then(function(userDocument){
        req.profileUser = userDocument
        next()
    }).catch(function(){
        res.render("404")
    })
}

exports.profilePostsScreen = function(req, res){
    //ask our post model for posts by a certain author id
    Post.findByAuthorId(req.profileUser._id).then(function(posts){
        res.render("profile", {
            title: `Profile for ${req.profileUser.username}`,
            currentPage: "posts",
            posts: posts,
            profileUsername: req.profileUser.username,
            profileAvatar: req.profileUser.avatar,
            isFollowing: req.isFollowing,
            isVisitorsProfile: req.isVisitorsProfile,
            counts: {postCount: req.postCount, followerCount: req.followerCount, followingCount: req.followingCount}
        })
    }).catch(function(){
        res.render("404")
    })

    
}

exports.profileFollowersScreen = async function(req, res) {
    try {
        let followers = await Follow.getFollowersById(req.profileUser._id)
    res.render("profile-followers", {
        currentPage: "followers",
        followers: followers,
        profileUsername: req.profileUser.username,
        profileAvatar: req.profileUser.avatar,
        isFollowing: req.isFollowing,
        isVisitorsProfile: req.isVisitorsProfile,
        counts: {postCount: req.postCount, followerCount: req.followerCount, followingCount: req.followingCount}
    })
    } catch {
        res.render("404")
    }
}

exports.profileFollowingScreen = async function(req, res) {
    try {
        let following = await Follow.getFollowingById(req.profileUser._id)
    res.render("profile-following", {
        currentPage: "following",
        following: following,
        profileUsername: req.profileUser.username,
        profileAvatar: req.profileUser.avatar,
        isFollowing: req.isFollowing,
        isVisitorsProfile: req.isVisitorsProfile,
        counts: {postCount: req.postCount, followerCount: req.followerCount, followingCount: req.followingCount}
    })
    } catch {
        res.render("404")
    }
}