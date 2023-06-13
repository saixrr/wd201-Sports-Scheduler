/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const flash = require("connect-flash");
const express = require('express');
var csrf = require("tiny-csrf");
const app = express();
const { Sport,User,Session,SessionPlayer } = require("./models");
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
const { user, password } = require("pg/lib/defaults");
const saltRounds=10;
const moment = require("moment");
const { where,Op ,Sequelize} = require("sequelize");
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

app.set("view engine", "ejs");
app.use(flash());
app.use(function(request, response, next) {
  response.locals.messages = request.flash();
  next();
});
app.use(passport.initialize());
app.use(passport.session());
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

    const isAdmin = (req, res, next) => {
      if (req.isAuthenticated()) {
        if (req.user.admin) {
          return next();
        } else {
          res.locals.messages = req.flash(
            "info",
            "You do not have authentication"
          );
          res.redirect("/admin");
        }
      } else {
        res.redirect("/sessions");
      }
    };

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
      res.render('create-sport.ejs', { sports,successMessage: req.flash('successMessage'), errorMessage: req.flash('errorMessage') ,csrfToken: req.csrfToken(), });
    } catch (error) {
      console.log(error);
      res.status(404).send("Error retrieving sports");
    }
  });
  

  app.post('/create-session',connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
    try {
      const userId = req.user.id;
      const name = req.body.sportName.toLowerCase();
  
      await Sport.createNewSport(userId, name);
  
      res.locals.messages = req.flash("success", "Sport successfully created");
      res.redirect('/create-session');
    } catch (error) {
      res.locals.messages = req.flash("error", error.message);
      res.redirect('/create-session');
    }
  });
  
app.get("/newsession/:sportId/:sportName",connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  const sportId = req.params.sportId;
  console.log(sportId)
  const sportName = req.params.sportName;
  const users=await User.findAll()
  console.log(sportName)
  res.render("sport-details.ejs", { sportId,sportName,users,csrfToken: req.csrfToken(), });
});

app.post("/newsession",connectEnsureLogin.ensureLoggedIn(), async (req, res) => { 
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
    res.redirect("/sports");
  }catch (error) {
    console.log(error);
    res.status(404).send("Error creating session");
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
      res.render('sessions.ejs', { userId: req.user.id,errorMessage: req.flash('errorMessage')});
    });
    
    
app.get("/admin", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  const userId = req.query.userId;
  const user = await User.findOne({ where: { id: userId } });
  if (user.admin) {
    console.log(userId);
    res.render("admin.ejs");
  } else {
    res.locals.messages = req.flash("error", "Sorry!! You are not having access to admin panel.Please proceed as a player");
    res.redirect("/sessions");
  }
});


   app.get("/sports/:sportName",connectEnsureLogin.ensureLoggedIn(),async (req,res)=>{
    const name=req.params.sportName
    const userId=req.userId;
    const user=await User.findOne({where:{id:userId}})
    const email=user.email
    const sessions=await Session.getlatestSessions(name)
    const message=req.flash('message');
    res.render("sportsessions.ejs",{sessions,name,message,email})
   })
app.get("/joinedsessions",connectEnsureLogin.ensureLoggedIn(),async(req,res)=>{
  try{
    const userId=req.userId;
    const user=await User.findOne({where:{id:userId}})
    const email=user.email
    const sessions=await Session.getJoinedSessions(email);
    res.render("joinedsessions.ejs",{sessions})
  }catch(error){
    console.error("error while displaying the joined sessions: ",error)
    res.status(500).send("An error while displaying the joinedsessions")
  }

})
app.get('/leavesession/:sessionId',connectEnsureLogin.ensureLoggedIn(),async(req,res)=>{
  const sessionid=req.params.sessionId;
 try{
  const userId=req.userId;
  const sessionplayer=await Session.findOne({where:{id: sessionid}});
  const user=await User.findOne({where:{id:userId}})
  await SessionPlayer.destroy({where:{
    sessionId:sessionplayer.id,
  }
  })
  await Session.leaveSession(user.email,sessionid);
  res.redirect("/sports")
 }catch(error){
  console.log("error while leaving a session:",error)
  res.status(500).send("An error occured while leaving a session")
 }

})
    

app.get("/sports",connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  const sports = await Sport.findAll();
  const userId=req.userId;
  const user=await User.findOne({where:{id:userId}})
  res.render("sport.ejs", {
    sports: sports,user
  });
});
app.get("/usersessions",connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  const userId=req.userId;
  const sessions = await Session.findAll({where:{creatorId:userId}});
  res.render("usersessions.ejs", {sessions});
});
app.get('/cancelsession/:sessionId',connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  const sessionId=req.params.sessionId
  try {
    res.render('cancelreason.ejs',{sessionId,csrfToken:req.csrfToken()});
  } catch (error) {
    console.error('Error getiing reason for cancellation:', error);
    res.status(500).send('An error occurred while getiing reason for cancellation');
  }
});
app.post('/cancelsession/:sessionId/confirm',connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  const sessionId=req.params.sessionId;
  const reason = req.body.reason
  try {
    await Session.cancelSession(sessionId,reason);
    res.redirect('/usersessions');
  } catch (error) {
    console.error('Error cancelling Session:', error);
    res.status(500).send('An error occurred while cancelling the Session');
  }
});

app.get('/delete-sport',connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
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
app.get('/sessionplayer/:sessionId',connectEnsureLogin.ensureLoggedIn(),async(req,res)=>{
  const sessionid=req.params.sessionId;
 try{
  const userId=req.userId;
  const sessionplayer=await Session.findOne({where:{id: sessionid}});
  const user=await User.findOne({where:{id:userId}})
  await SessionPlayer.create({
    sessionId:sessionplayer.id,
    playername:user.firstName + user.lastName,
    userId:userId
  })
  await Session.joinSession(user.email,sessionid);
  res.redirect("/joinedsessions")
 }catch(error){
  console.log("error while joining a session:",error)
  res.status(500).send("An error occured while joining a session")
 }

});
app.get('/reports',connectEnsureLogin.ensureLoggedIn(),async(req,res)=>{
  res.render("report.ejs")
})

async function getReportData(startDate, endDate) {
  try {
    const sessionsCountQuery = await Session.findAll({
      where: {
        date: {
          [Op.gte]: startDate, // Greater than or equal to startDate
          [Op.lte]: endDate,   // Less than or equal to endDate
        }
      }
    });
    console.log(sessionsCountQuery)

    const sessionsCount = sessionsCountQuery.length;
    console.log(sessionsCount)

    const sportsPopularityQuery = await Session.findAll({
      attributes: ['sportName', [Sequelize.fn('COUNT', Sequelize.col('sportName')), 'popularity']],
      where: {
        date: {
          [Op.gte]: startDate,
          [Op.lte]: endDate,   
        }
      },
      group: ['sportName']
    });
    console.log(sportsPopularityQuery)

    const sportsPopularity = {};
    for (const row of sportsPopularityQuery) {
      sportsPopularity[row.sportName] = row.get('popularity');
    }

    return { sessionsCount, sportsPopularity };
  } catch (error) {
    console.log(error)
    throw new Error('Error retrieving report data');
  }
}


app.get('/api/reports',connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;

  try {
    const reportData = await getReportData(startDate, endDate);
    res.json(reportData);
  } catch (error) {
    console.error('Error retrieving report data:', error);
    res.status(500).json({ error: 'Error retrieving report data' });
  }
});
app.get('/edit-profile',connectEnsureLogin.ensureLoggedIn(),async(req,res)=>{
  userId=req.userId;
  const user=await User.findOne({where:{id:userId}})
  res.render("edit-profile.ejs",{user,csrfToken:req.csrfToken()})
})
app.post('/edit-profile', connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  const userId = req.userId;

  try {
    const user = await User.findOne({ where: { id: userId } });
    const isPasswordMatch = await bcrypt.compare(req.body.password, user.password);
    if (isPasswordMatch) {
      res.locals.messages = req.flash("error", "Old and New Passwords are the same");
      return res.redirect("/edit-profile");
    }

    const newpassword = await bcrypt.hash(req.body.password, saltRounds);
    const newfirstName = req.body.firstName;
    const newlastName = req.body.lastName;
    const newemail = req.body.email;

    await User.updateuserbyId(userId, newfirstName, newlastName, newemail, newpassword);

    res.locals.messages = req.flash("success", "Profile successfully updated");
    res.redirect("/sessions");
  } catch (error) {
    console.log(error);
    res.locals.messages = req.flash("error", error.message);
    res.redirect('/edit-profile');
  }

  
});





    
  
module.exports = app;
