const router = require("express").Router();
const { checkUsernameExists, validateRoleName } = require('./auth-middleware');
const { JWT_SECRET } = require("../secrets"); // use this secret!
const model = require("../users/users-model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const errProcess = (res, where) => err => res.status(500).json({where, message:err.message, stack:err.stack, error:err});

router.post("/register", validateRoleName, (req, res, next) => {
  /**
    [POST] /api/auth/register { "username": "anna", "password": "1234", "role_name": "angel" }

    response:
    status 201
    {
      "user"_id: 3,
      "username": "anna",
      "role_name": "angel"
    }
   */
  const { username, role_name } = req.body;
  const password = bcrypt.hashSync(req.body.password);
  const newUser = {username, password, role_name};

  model.add(newUser).then(user => res.status(201).json(user))
    .catch(errProcess(res, "adding user"));
});

router.post("/login", checkUsernameExists, (req, res, next) => {
  /**
    [POST] /api/auth/login { "username": "sue", "password": "1234" }

    response:
    status 200
    {
      "message": "sue is back!",
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ETC.ETC"
    }

    The token must expire in one day, and must provide the following information
    in its payload:

    {
      "subject"  : 1       // the user_id of the authenticated user
      "username" : "bob"   // the username of the authenticated user
      "role_name": "admin" // the role of the authenticated user
    }
   */
  const { username, password } = req.body;

  model.findBy({ username }).first()
    .then(user => {
      if(user && bcrypt.compareSync(password, user.password)) {
        const token = jwt.sign({subject: user.user_id, username, role_name: user.role_name}, JWT_SECRET, {expiresIn:"1d"});
        res.status(200).json({message:`${username} is back!`, token});
      } else {
        res.status(401).json({message:"Invalid credentials"});
      }
    })
    .catch(errProcess(res, "finding user"));
});

module.exports = router;
