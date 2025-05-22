const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add seed data for testing if needed
    await queryInterface.bulkInsert('users', [
      {
        id: uuidv4(),
        phoneNumber: '6281234567890', // Example Indonesian number format
        isAdmin: true, // This user will be an admin
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        phoneNumber: '6287654321098', // Another example number
        isAdmin: false, // Regular user
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove seed data
    await queryInterface.bulkDelete('users', {
      phoneNumber: {
        [Sequelize.Op.in]: ['6281234567890', '6287654321098']
      }
    });
  }
};
