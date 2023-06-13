/* eslint-disable no-useless-catch */
/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
'use strict';
const { password } = require('pg/lib/defaults');
const { Model, where } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate( models) {
      // Define associations here
      User.hasMany(models.Sport, { foreignKey: 'userId' });
    }

    static createNewUser(userData, isAdmin, hashedPassword) {
      const { firstName, lastName, email } = userData;
      return this.create({
        admin: isAdmin,
        firstName: capitalizeFirstLetter(firstName),
        lastName: capitalizeFirstLetter(lastName),
        email,
        password: hashedPassword,
      });
    }

    static updateuserbyId(userId, newfirstName,newlastName,newemail,newpassword) {
      return this.update(
        {
          firstName: newfirstName,
          lastName: newlastName,
          email:newemail,
          password:newpassword
        },
        {
          where: {
            id: userId,
          },
        }
      );
    }


    static async getUserById(userId) {
      try {
        const user = await User.findOne({
          attributes: ['id', 'firstName', 'lastName', 'email', 'admin', 'createdAt', 'updatedAt'],
          where: {
            id: userId,
          },
        });

        if (!user) {
          throw new Error('User not found');
        }

        return user;
      } catch (error) {
        throw error;
      }
    }

    static async getUserByEmail(email) {
      try {
        const user = await User.findOne({
          attributes: ['id', 'firstName', 'lastName', 'email', 'admin', 'createdAt', 'updatedAt'],
          where: {
            email: email,
          },
        });

        if (!user) {
          throw new Error('User not found');
        }

        return user;
      } catch (error) {
        throw error;
      }
    }
  }

  User.init(
    {
      admin: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      firstName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      lastName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'User',
    }
  );

  return User;
};

function capitalizeFirstLetter(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
