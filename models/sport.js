/* eslint-disable no-useless-catch */
/* eslint-disable no-undef */
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Sport extends Model {
    static associate(models) {
      Sport.belongsTo(models.User, { foreignKey: 'userId' });
    }

    static async createNewSport(userId, name) {
      const existingSport = await this.findOne({ where: { name } });
      if (existingSport) {
        throw new Error('This sport is already available.');
      }
    
      return this.create({
        userId,
        name,
      });
    }
    

    static async updatesportbyid(sportId,name){
      return await this.update({
        sport:name,
      },
      {
        where:{
          id:sportId,
        },
      }
      );
    }

    static async getAllsports(){
      const sports= await this.findAll({
        attributes:["id","name"],
      });
      return sports.map((sp)=>sp.dataValues);
    }

    static async getSportById(userId) {
      return this.findAll({
        where: { userId },
      });
    } 

    static async getSportByName(name) {
      try {
        const sport = await this.findOne({
          where: {
            name,
          },
        });
        if (!sport) {
          throw new Error('Sport not found');
        }
        return sport;
      } catch (error) {
        throw error;
      }
    }

    
  }
  Sport.init(
    {
      name: {
        type: DataTypes.STRING,
      },
    },
    {
      sequelize,
      modelName: 'Sport',
    }
  );

  return Sport;
};
