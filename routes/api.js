'use strict'
const log = console.log
const express = require('express')
const bcrypt = require('bcrypt')
const router = express.Router()

const { mongoose } = require('../db/mongoose')
const { ObjectID } = require('mongodb')
const { User } = require('../db/user')

const bodyParse = require('body-parser')
router.use(bodyParse.json())

function isMongoError (error) {
  return typeof error === 'object' && error !== null && error.name === 'MongoNetworkError'
}

const mongoChecker = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    log('Issue with mongoose connection')
    res.status(500).send('Internal server error')
    return false
  } else {
    next()
  }
}

const idChecker = async (req, res, next) => {
  if (!ObjectID.isValid(req.params.id)) {
    log('invalid id')
    res.status(404).send()
    return
  }
  next()
}

const mealIdChecker = async (req, res, next) => {
  if (!ObjectID.isValid(req.params.mealId)) {
    log('invalid id')
    res.status(404).send()
    return
  }
  next()
}

const ingredientIdChecker = async (req, res, next) => {
  if (!ObjectID.isValid(req.params.ingredientId)) {
    log('invalid id')
    res.status(404).send()
    return
  }
  next()
}

router.get('/api/users', mongoChecker, (req, res) => {
  User.find().then(result => {
    res.send(result)
  }).catch(error => {
    log(error)
    if (isMongoError(error)) {
      res.status(500).send('internal server error')
    } else {
      res.status(400).send('bad request')
    }
  })
})

// create user
// expects:
// {
//   email: 'email',
//   password: 'password'
// }
router.post('/api/users', mongoChecker, (req, res) => {
  const user = new User({
    email: req.body.email,
    password: req.body.password,
    meals: [],
    ingredients: []
  })

  user.save().then(result => {
    res.send(result)
  }).catch(error => {
    log(error)
    if (isMongoError(error)) {
      res.status(500).send('internal server error')
    } else {
      res.status(400).send('bad request')
    }
  })
})

// login user
// expects:
// {
//   email: 'email',
//   password: 'password'
// }
router.post('/api/login', mongoChecker, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email })
    if (user && await bcrypt.compare(user.password, req.body.password)) {
      res.send(user)
    } else if (user) {
      res.status(401).send('forbidden')
    } else {
      res.status(404).send('resource not found')
    }
  } catch (error) {
    log(error)
    if (isMongoError(error)) {
      res.status(500).send('internal server error')
    } else {
      res.status(400).send('bad request')
    }
  }
})

// Add meal
// expects:
// {
//   name: 'meal name',
//   ingredients: [{ name: 'name', qty: qty }],
//   date: 'yyyy-mm-dd',
//   mealNum: num,
//   description: 'description of meal' // optional
// }
router.post('/api/users/:id/meals', mongoChecker, idChecker, (req, res) => {
  const ingredients = []
  req.body.ingredients.forEach(element => {
    ingredients.push({
      name: element.name,
      qty: element.qty
    })
  })
  const meal = {
    name: req.body.name,
    ingredients: req.body.ingredients,
    date: req.body.date,
    mealNum: req.body.mealNum,
    description: req.body.description || ''
  }
  User.findById(req.params.id).then(result => {
    if (result) {
      result.meals.push(meal)
      result.save()
      res.send(result)
    } else {
      res.status(404).send('resource not found')
    }
  }).catch(error => {
    log(error)
    if (isMongoError(error)) {
      res.status(500).send('internal server error')
    } else {
      res.status(400).send('bad request')
    }
  })
})

// Add ingredients
// expects:
// {
//   name: 'name',
//   qty: 'qty'
// }
router.post('/api/users/:id/ingredients', mongoChecker, idChecker, (req, res) => {
  const ingredient = {
    name: req.body.name,
    qty: req.body.qty
  }
  User.findById(req.params.id).then(result => {
    if (result) {
      result.ingredients.push(ingredient)
      result.save()
      res.send(result)
    } else {
      res.status(404).send('resource not found')
    }
  }).catch(error => {
    log(error)
    if (isMongoError(error)) {
      res.status(500).send('internal server error')
    } else {
      res.status(400).send('bad request')
    }
  })
})

// Delete meal by mealId
router.delete('/api/users/:id/meals/:mealId', mongoChecker, idChecker, mealIdChecker, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user) {
      res.status(404).send('resource not found')
      return
    }
    const meal = user.meals.id(req.params.mealId)
    if (!meal) {
      res.status(404).send('resource not found')
      return
    }
    user.meals = user.meals.filter(element => element._id.toString() !== req.params.mealId)
    await user.save()
    res.send(user)
  } catch (error) {
    log(error)
    if (isMongoError(error)) {
      res.status(500).send('internal server error')
    } else {
      res.status(400).send('bad request')
    }
  }
})

// Delete ingredient by in ingredientsId
router.delete('/api/users/:id/ingredients/:ingredientId', mongoChecker, idChecker, ingredientIdChecker, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user) {
      res.status(404).send('resource not found')
      return
    }
    const ingredient = user.ingredients.id(req.params.ingredientId)
    if (!ingredient) {
      res.status(404).send('resource not found')
      return
    }
    user.ingredients = user.ingredients.filter(element => element._id.toString() !== req.params.ingredientId)
    await user.save()
    res.send(user)
  } catch (error) {
    log(error)
    if (isMongoError(error)) {
      res.status(500).send('internal server error')
    } else {
      res.status(400).send('bad request')
    }
  }
})