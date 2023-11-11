const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose');
const { Schema } = mongoose;

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

var bodyParser = require('body-parser')
app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));

// connect to cluster_0 db db 'testdata'
mongoose.connect(process.env.MONGO_URI);

const userSchema = new Schema({
  username: { type: String, required: true },
}, { collection: 'exercise_users' })

const exerciseSchema = new Schema({
  user_id: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now }

}, { collection: 'exercise_log' })

let User = mongoose.model('User', userSchema);
let Exercise = mongoose.model('Exercise', exerciseSchema);

// POST create user
app.post("/api/users", async function(req, res) {

  const username = req.body.username;

  try {

    if (username == null || username == "") {
      console.log("no username provided")
      return res.json({
        error: "please provide a username"
      })
    }

    const userExists = await User.findOne({ username: username })

    // we have an already existing user - return
    if (userExists) {
      console.log("user already exists")
      return res.json({
        username: userExists.username,
        _id: userExists._id
      })
    }

    // we have a new user - create and save
    let newUser = new User({ username: req.body.username })
    const saveUser = await newUser.save();

    if (saveUser) {
      return res.json({
        username: username,
        _id: saveUser._id
      })
    } else {
      return res.json({
        error: "unable to create user"
      })
    }
    
  } catch (err) {
    console.log("error: " + req.method)
    return res.json({
      error: err
    })
  }

})

// POST create exercise
app.post("/api/users/:_id/exercises", async function(req, res) {
  const id = req.params._id;
  const description = req.body.description;
  const duration = req.body.duration;
  let date = req.body.date;

  try {

    if (date == null || date == "") {
      var aDate = new Date().toISOString();
      date = aDate;
    } else {
      date = new Date(date).toISOString();
    }

    const foundUser = await User.findById(id);

    if (foundUser) {
      console.log("user was found - exercise being added")

      let newExercise = new Exercise({
        user_id: id,
        description: description,
        duration: duration,
        date: date
      })

      const saveExercise = await newExercise.save();

      if (saveExercise) {
        console.log("exercise was saved")
        return res.json({
          _id: id,
          username: foundUser.username,
          date: new Date(saveExercise.date).toDateString(),
          duration: saveExercise.duration,
          description: saveExercise.description
        })

      } else {
        console.log("exercise could not be saved")
        return res.json({
          error: "exercise could not be saved"
        })
      }

    } else {
      console.log("no user was found - exercise could not be added")
      return res.json({
        error: "no user was found - exercise was not saved"
      })
    }
    
  } catch (err) {
    console.log("error: " + req.method)
    return res.json({
      error: err
    })
  }
})

// GET all users
app.get("/api/users", async function(req, res) {

  try {
    const allUsers = await User.find({});

    if(allUsers) {
      console.log("returning users")
      return res.json(allUsers)
    } else {
      console.log("no users to return")
      return res.json({
        error: "no users to return"
      })
    }
    
  } catch (err) {
    console.log("error: " + req.method)
    return res.json({
      error: err
    })
    
  }
  
})

// GET all exercises for user with specified id
app.get("/api/users/:_id/exercises", async function(req, res) {

  const id = req.params._id;
  const exercisesForUser = await Exercise.find({ user_id: id });

  try {

    if (exercisesForUser) {
      console.log("found exercises for the user")
      return res.json({
        exercises: exercisesForUser
      })
    } else {
      console.log("no excerices were found for the specified user ID")
      return res.json({
        error: "no excerices were found for the specified user ID"
      })
    }
    
  } catch (err) {
    console.log("error: " + req.method)
    return res.json({
      error: err
    })
  }

  

})

// GET a full exercise log of any user
app.get("/api/users/:_id/logs", async function(req, res) {
  const id = req.params._id;
  const from = req.query.from;
  const to = req.query.to;
  const limit = req.query.limit;

  try {

    const findUser = await User.findById(id);

    if(findUser) {

      let dateFilter = {}

      if (from) {

          dateFilter["$gte"] = new Date(from).toISOString();

      }
      if (to) {

          dateFilter["$lte"] = new Date(to).toISOString();
      }

      let filter = {
        user_id: id
      }

      if (from || to) {
        filter.date = dateFilter;
      }

      // with everything - dateFilterLooks like this
      // {"$gte": from, "$lte": to}
      // and the entire filter looks like this
      // {username: foundUser.username, date: {"$gte": from, "$lte": to}}}

      // query for all exercises that belong to user with id
      // ?? - returns its right hand values when the left hand value is null
      // so if limit is null then limit = 500
      const exercisesForUser = await Exercise.find(filter).limit(limit ?? 500);

      // for each element 'e' in exercisesForUser(parent array) im returning and adding an element to my new 'log' array with the
      // specified attributes
      const log = exercisesForUser.map(e => ({
        description: e.description,
        duration: e.duration,
        date: new Date(e.date).toDateString()
      }))

      return res.json({
        username: findUser.username,
        count: exercisesForUser.length,
        _id: findUser._id,
        log: log
      })

    } else {
      console.log("could not find user for exercise log")
      return res.json({
        error: "could not find user for exercise log"
      })
    }
    
  } catch (err) {
    console.log("error: " + req.method)
    return res.json({
      error: err
    })
  }
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

