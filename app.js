/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const flash = require("connect-flash");
const express = require('express');
var csrf = require("tiny-csrf");
const app = express();
const { Sport,User,Session } = require("./models");
const path = require('path');
const bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false}));
const passport = require('passport') 
const connectEnsureLogin= require('connect-ensure-login');
const session = require('express-session');
const LocalStartegy=require('passport-local');
const bcrypt = require('bcrypt');
const { request } = require("http");
const { user } = require("pg/lib/defaults");
const saltRounds=10;
const moment = require("moment");
const { where } = require("sequelize");
app.use(cookieParser("shh!some secret string"));
app.use(csrf("this_should_be_32_character_long",["POST","PUT","DELETE"]));


app.set('views', path.join(__dirname, '/views'));
app.use(express.static(path.join(__dirname,'public')));

app.use(session({
  secret:"my-super-secret-key-21728172615261653",
  cookie:{
    maxAge:24*60*60*1000
  }
}))
;
app.use(passport.initialize());
app.use(passport.session());

app.set("view engine", "ejs");
app.use(flash());
app.use(function(request, response, next) {
  response.locals.messages = request.flash();
  next();
});
const getUserIdMiddleware = (req, res, next) => {
  if (req.user) {
    req.userId = req.user.id;
  }
  next();
};
app.use(getUserIdMiddleware);

passport.use(new LocalStartegy({
  usernameField: 'email',
  passwordField: 'password'
}, (username, password, done) => {
  User.findOne({ where: { email: username } })
    .then(async function (user) {
      if (!user) { // Check if user is null
        return done(null, false, { message: "Invalid email or password" });
      }

      const result = await bcrypt.compare(password, user.password);
      if (result) {
        return done(null, user);
      } else {
        return done(null, false, { message: "Invalid password" });
      }
    })
    .catch((err) => {
      return done(err);
    });
}));

    passport.serializeUser((user,done)=>{
      console.log("serializing user in session",user.id)
      done(null,user.id)
    });
    passport.deserializeUser((id,done)=>{
      User.findByPk(id)
          .then(user=>{
            done(null,user)
          })
          .catch(error => {
            done(error,null)
          })
    }) ; 

app.get('/', (req, res) => {
    res.render("dashboard.ejs",{csrfToken: req.csrfToken()})
  });

  app.get("/signup", (req, res) => {
    res.render("signup.ejs", { title: "Signup",csrfToken: req.csrfToken(),});
  });
  

  app.get("/login",(request,response)=>{
    response.render("login.ejs",{title:"Signin",csrfToken: request.csrfToken(), })
  })
  app.get("/signout",(request,response)=>{
    request.logout((err)=> {
      if (err) {return next(err);}
      response.redirect("/");
    })
  })


  app.get("/create-session", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
    try {
      const userId = req.user.id;
      const sports = await Sport.findAll({ where: { userId } });
      res.render('create-sport.ejs', { sports,csrfToken: req.csrfToken(), });
    } catch (error) {
      console.log(error);
      res.status(404).send("Error retrieving sports");
    }
  });
  

app.post("/create-session", async (req, res) => {
  const sportName=req.body.sportName;
  console.log(sportName);
  const userId=req.userId;
  console.log(userId)
  try {
    const sport = await Sport.createNewSport(userId,sportName);
    res.redirect("/create-session");
  } catch (error) {
    console.log(error);
    res.status(404).send("Sport not found");
  }
});
app.get("/newsession/:sportId/:sportName", (req, res) => {
  const sportId = req.params.sportId;
  console.log(sportId)
  const sportName = req.params.sportName;
  console.log(sportName)
  res.render("sport-details.ejs", { sportId,sportName,csrfToken: req.csrfToken(), });
});

app.post("/newsession", async (req, res) => { 
  const sportId = req.body.sportId;
  console.log(sportId);
  sportName=req.body.sportName;
  console.log(sportName);
  const { venue, time, playerCount,membersList,remaining } = req.body;
  const date=req.body.date;
  console.log(req.userId)
  try{
    const session = await Session.createNewSession(req.userId, {
      venue,
      date: date,
      time: time, 
      membersList:membersList,
      count: playerCount,
      remaining
    }, Number(sportId), sportName);
    console.log(session.id)
    res.redirect("/session/"+session.id);
  }catch (error) {
    console.log(error);
    res.status(404).send("Error creating session");
  }
});
app.get("/session/:sessionid", async (req, res) => {
  const sessionId = req.params.sessionid;
  try {
    const session = await Session.findByPk(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    res.render("session-details.ejs", { session,});
  } catch (error) {
    console.log(error);
    res.status(404).send("Error retrieving session details");
  }
});


  app.post("/users",async(request,response)=>{
    const { firstName, lastName, email, password } = request.body;
    console.log(request.body.firstName)
  
    if (!firstName || !email) {
      request.flash("error", "First name and email are required");
      return response.redirect("/signup");
    }
      if (
        request.body.firstName.length != 0 &&
        request.body.email.length != 0 &&
        request.body.password.length == 0
      ) {
        request.flash("error", "Password must  be non-Empty");
          return response.redirect("/signup");
      }
      const hashedPwd =await bcrypt.hash(request.body.password,saltRounds)
      console.log(hashedPwd)
      try{
        const user=await User.create({
          firstName:request.body.firstName,
          lastName:request.body.lastName,
          email:request.body.email,
          password:hashedPwd
        });
        request.login(user,(err)=>{
          if(err) {
            console.log(err)
          }
          response.redirect("/login");
        })
      }catch(error) {
        request.flash("error","Email already registered");
        response.redirect("/signup");
        console.log(error);
      }
    });

    app.post(
      "/session",
      passport.authenticate("local", {
        successRedirect: "/sessions",
        failureRedirect: "/login",
        failureFlash: true,
      }),
      function (req, res, next) {
        req.flash("error", req.authInfo.message);
        next();
      }
    );
    

    app.get('/sessions', connectEnsureLogin.ensureLoggedIn(), (req, res) => {
      console.log(req.user.id)
      res.render('sessions.ejs', { userId: req.user.id, });
    });
    


app.get("/sessions/:sessionid", async (req, res) => {
  const sessionId = req.params.id;
  const session = await Session.getSessionById(sessionId);
  res.render("session-details.ejs", {
    session: session,
  });
});



    
    app.get("/admin",connectEnsureLogin.ensureLoggedIn(),(req,res)=>{
      const userId = req.query.userId;
      console.log(userId)
      res.render("admin.ejs",)
    })

   app.get("/sports/:sportName",connectEnsureLogin.ensureLoggedIn(),async (req,res)=>{
    const name=req.params.sportName
    const sessions=await Session.findAll({where:{
      sportName:name
    }
    })
    console.log(sessions)
    res.render("sportsessions.ejs",{sessions,})
   })

    

app.get("/sports",connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  const sports = await Sport.findAll();
  res.render("sport.ejs", {
    sports: sports,
  });
});

app.get('/delete-sport', async (req, res) => {
  try {
    const sportName = req.query.sport;
    const sport = await Sport.findOne({ where: { name: sportName } });

    if (!sport) {
      return res.status(404).send('Sport not found');
    }
    await sport.destroy();

    res.redirect('/create-session',);
  } catch (error) {
    console.error('Error deleting sport:', error);
    res.status(500).send('An error occurred while deleting the sport');
  }
});



    
  
module.exports = app;
