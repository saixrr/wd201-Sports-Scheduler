/* eslint-disable no-unused-vars */
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn("Sessions", "sportName", {
      type: Sequelize.DataTypes.STRING, // Adjust the data type if necessary
      allowNull: false,
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn("Sessions", "sportName");
  }
};
