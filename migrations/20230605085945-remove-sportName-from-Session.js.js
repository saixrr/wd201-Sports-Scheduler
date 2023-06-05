/* eslint-disable no-unused-vars */
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("Sessions", "sportName");
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("Sessions", "sportName", {
      type: Sequelize.DataTypes.STRING,
      allowNull: false,
    });
  }
};
