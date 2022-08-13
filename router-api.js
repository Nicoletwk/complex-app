const apiRouter = require("express").Router()

//import controller files
const userController = require("./controllers/userController")
const postController = require("./controllers/postController")
const followController = require("./controllers/followController")
const cors = require("cors")

//configure all the routes below to set the cross origin resource policy
apiRouter.use(cors())

apiRouter.post("/login", userController.apiLogin)
apiRouter.post("/create-post", userController.apiMustBeLoggedIn, postController.apiCreate)
apiRouter.delete("/post/:id", userController.apiMustBeLoggedIn, postController.apiDelete)
apiRouter.get("/postsByAuthor/:username", userController.apiGetPostsByUsername)

//token
//login "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2MmNhZDE0Y2IwNDJiYWRmYzk5YTU2NGUiLCJpYXQiOjE2NjAzMTU2NDQsImV4cCI6MTY2MjkwNzY0NH0.J54lJ6Mgi9hNjHugnfW11FKuiHwNdKFObAW7zpVbafU"

module.exports = apiRouter