/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
'use strict';
const { Model ,Op} = require('sequelize');
const moment = require("moment");
module.exports = (sequelize, DataTypes) => {
  class Session extends Model {
    static associate(models) {
      // Define associations here if needed
      Session.belongsTo(models.User, { foreignKey: 'creatorId' });
      Session.belongsTo(models.Sport, { foreignKey: 'sportId' });
    }
    static createNewSession(userId, body, sportId,sportName) {
      const { date, time, membersList, venue,count,remaining } = body;
    
      const [year, month, day] = date.split('-').map(Number);
      const [hour, minute] = time.split(':').map(Number);
    
      const formattedDate = new Date(year, month - 1, day, hour, minute, 0);
    
      const filteredMembersList = membersList
      .split(",")
      .filter((item) => item);
      const newMembersList = filteredMembersList.map((item) => item.trim());

      console.log(newMembersList)
      console.log(sportName)
      const session = {
        creatorId:userId,
        sportId: sportId,
        date: formattedDate,
        membersList: newMembersList,
        time:time,
        venue:venue,
        count:count,
        remaining:remaining,
        sportName:sportName,
      };
    
      return this.create(session);
    }
    
    static updateSession(sessionId, body) {
      const { date, time, membersList, ...otherProps } = body;
    
      const [year, month, day] = date.split('-').map(Number);
      const [hour, minute] = time.split(':').map(Number);
    
      const formattedDate = new Date(year, month - 1, day, hour, minute, 0);
    
      const uniqueMembersList = membersList
        .split(',')
    
      const updatedSession = {
        date: formattedDate,
        membersList: uniqueMembersList,
        ...otherProps
      };
    
      return this.findByIdAndUpdate(sessionId, updatedSession, { new: true });
    }

    static async getSessionById(sessionId) {
      const session = await this.findOne({
        where: {
          id: sessionId,
        },
        attributes: [
          "venue",
          "date",
          "membersList",
          "sportId",
          "creatorId",
          "cancelled",
          "reason",
        ],
      });
      if (!session) {
        throw new Error("Session not found");
      }
      return session.dataValues;
    }

    static async getallsessions(userId){
      const sessions = await this.findAll({
        where:{
          creatorId:userId,
          cancelled:false,
          date: {
            [Op.gte]:new Date()
          },
        },
        attributes:[
          "id",
          "venue",
          "date",
          "sportId",
          "creatorId",
        ]
      });
      return sessions.map((item)=>item.dataValues);  
    }

    static async getJoinedSessions(email) {
      const sessions = await this.findAll({
        where: {
          membersList: {
            [Op.contains]: [email],
          },
          date: {
            [Op.gte]: new Date(),
          },
        },
      });
      return sessions.map((item) => item.dataValues);
    }

    static async getCancelledSessions(email) {
      const sessions = await this.findAll({
        where: {
          membersList: {
            [Op.contains]: [email],
          },
          date: {
            [Op.gte]: new Date(),
          },
          cancel: true,
        },
      });
      return sessions.map((item) => item.dataValues);
    }


    static async getlatestSessions(name) {
      const latestSessions = await this.findAll({
        where: {
          [Op.or]: [
            {
              date: {
                [Op.gt]: moment().format("YYYY-MM-DD"),
              },
            },
            {
              date: moment().format("YYYY-MM-DD"),
              time: {
                [Op.gte]: moment().format("HH:mm"),
              },
            },
          ],
          sportName: name,
        },
      });
      return latestSessions.map((item) => item.dataValues);
    }
    

    static async cancelSession(id, reason) {
      const session = await this.findOne({
        where: {
          id: id,
        },
      });
      if (!session) {
        throw new Error("Session not found");
      }
      return this.update(
        {
          cancelled: true,
          reason: reason,
        },
        {
          where: {
            id: id,
          },
        }
      );
    }
    static async joinSession(email, sessionId) {
      const session = await this.getSessionById(sessionId);
      
      if (session.membersList.includes(email)) {
        return { success: false, message: 'Email is already joined.' };
      }
      session.membersList.push(email);
    
      await this.update(
        {
          membersList: session.membersList,
          remaining: session.remaining - 1,
        },
        {
          where: {
            id: sessionId,
          },
        }
      );
    
      return { success: true };
    }
    static async leaveSession(email, sessionId) {
      const session = await this.getSessionById(sessionId);
      const emailIndex = session.membersList.indexOf(email);
      if (emailIndex !== -1) {
        session.membersList.splice(emailIndex, 1);
        return this.update(
          {
            membersList: session.membersList,
            remaining: session.remaining + 1,
          },
          {
            where: {
              id: sessionId,
            },
          }
        );
      }
    }
    
  }
  Session.init(
    {
      sportId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      creatorId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      venue: {
        type: DataTypes.STRING,
        allowNull: false
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      time: {
        type: DataTypes.TIME,
        allowNull: false
      },
      count: {
        type: DataTypes.INTEGER,
      },
      membersList: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: false,
        defaultValue: []
      },
      
      cancelled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      reason: {
        type: DataTypes.STRING
      },
      sportName:{
        type:DataTypes.STRING
      }
    },
    {
      sequelize,
      modelName: 'Session',
    }
  );
  return Session;
};
