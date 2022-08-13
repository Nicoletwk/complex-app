const { ObjectID } = require("bson")
const { promiseImpl } = require("ejs")

const usersCollection = require("../db").db().collection("users")
const followsCollection = require("../db").db().collection("follows")
const ObjectId = require("mongodb").ObjectId
const User = require("./User")


let Follow = function(followedUsername, authorId) {
    this.followedUsername = followedUsername
    this.authorId = authorId
    this.errors = []
}

Follow.prototype.cleanUp = async function() {
    if (typeof(this.followedUsername) != "string") {this.followedUsername = ""}
}

Follow.prototype.validate = async function(action) {
    //followedUsername must exist in database
    let followedAccount = await usersCollection.findOne({username: this.followedUsername})
    if (followedAccount){
        this.followedId = followedAccount._id
    } else {
        this.errors.push("No user found!")
    }

    let doesFollowAlreadyExist = await followsCollection.findOne({followedId: this.followedId, authorId: new ObjectID(this.authorId)})
    if(action == "create") {
        if (doesFollowAlreadyExist) {this.errors.push("You are already following this user")}
    }
    if(action == "delete") {
        if (!doesFollowAlreadyExist) {this.errors.push("Invalid action")}
    }

    //should not be able to follow yourself
    if (this.followedId.equals(this.authorId)) {this.errors.push("You cannot follow yourself")}
}

Follow.prototype.create = function(){
    return new Promise(async (resolve, reject) => {
        this.cleanUp()
        await this.validate("create")
        if(!this.errors.length){
            await followsCollection.insertOne({followedId: this.followedId, authorId: new ObjectID(this.authorId)})
            resolve()
        } else {
            reject(this.errors)
        }
    })
}

Follow.prototype.delete = function(){
    return new Promise(async (resolve, reject) => {
        this.cleanUp()
        await this.validate("delete")
        if(!this.errors.length){
            await followsCollection.deleteOne({followedId: this.followedId, authorId: new ObjectID(this.authorId)})
            resolve()
        } else {
            reject(this.errors)
        }
    })
}

Follow.isVisitorFollowing = async function(followedId, visitorId) {
    let followDoc = await followsCollection.findOne({followedId: followedId, authorId: new ObjectID(visitorId)})
    if (followDoc){
        return true
    } else {
        return false
    }
}

Follow.getFollowersById = function(id) {
    return new Promise( async (resolve, reject) => {
        try {
            let followers = await followsCollection.aggregate([
                {$match: {followedId: id}},
                //object returned will have another field of property that's an array of objects
                {$lookup: {from: "users", localField: "authorId", foreignField: "_id", as: "userDoc"}},
                //spell out what should exist in the object that is returned, opt-in approach
                {$project: {
                    username: {$arrayElemAt: ["$userDoc.username", 0]},
                    email: {$arrayElemAt: ["$userDoc.email", 0]}
                }}
            ]).toArray()
            followers = followers.map(function(follower) {
                let user = new User(follower, true)
                return {username: follower.username, avatar: user.avatar}
            })
            resolve(followers)
        } catch {
            reject()      
        }
    })
}

Follow.getFollowingById = function(id) {
    return new Promise( async (resolve, reject) => {
        try {
            let followers = await followsCollection.aggregate([
                {$match: {authorId: id}},
                //object returned will have another field of property that's an array of objects
                {$lookup: {from: "users", localField: "followedId", foreignField: "_id", as: "userDoc"}},
                //spell out what should exist in the object that is returned, opt-in approach
                {$project: {
                    username: {$arrayElemAt: ["$userDoc.username", 0]},
                    email: {$arrayElemAt: ["$userDoc.email", 0]}
                }}
            ]).toArray()
            followers = followers.map(function(follower) {
                let user = new User(follower, true)
                return {username: follower.username, avatar: user.avatar}
            })
            resolve(followers)
        } catch {
            reject()      
        }
    })
}

Follow.countFollowersByAuthor = function(id) {
    //return a promise
    return new Promise(async (resolve, reject)=> {
        //create a variable, go into the mongoDb collection and call a mongoDb method countDocuments, within the () give an object, followedId field matches the id passed into the function, returns a promise
        let followerCount = await followsCollection.countDocuments({followedId: id})
        resolve(followerCount)
    })
    }

    Follow.countFollowingByAuthor = function(id) {
        //return a promise
        return new Promise(async (resolve, reject)=> {
            //create a variable, go into the mongoDb collection and call a mongoDb method countDocuments, within the () give an object, followedId field matches the id passed into the function, returns a promise
            let count = await followsCollection.countDocuments({authorId: id})
            resolve(count)
        })
        }    

module.exports = Follow