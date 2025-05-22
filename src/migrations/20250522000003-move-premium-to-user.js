'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add isPremium column to users table
    await queryInterface.addColumn('users', 'isPremium', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    
    // Move any existing premium status from n8n_integrations to users
    await queryInterface.sequelize.query(`
      UPDATE users
      SET "isPremium" = true
      FROM n8n_integrations
      WHERE users.id = n8n_integrations."userId"
      AND n8n_integrations."isPremium" = true
    `);
    
    // Remove isPremium column from n8n_integrations table
    await queryInterface.removeColumn('n8n_integrations', 'isPremium');
    
    // Remove isPremium column from n8n_groups table as it's no longer needed
    await queryInterface.removeColumn('n8n_groups', 'isPremium');
  },

  async down(queryInterface, Sequelize) {
    // Add back isPremium columns to n8n tables
    await queryInterface.addColumn('n8n_integrations', 'isPremium', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    
    await queryInterface.addColumn('n8n_groups', 'isPremium', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    
    // Copy premium status from users back to n8n_integrations
    await queryInterface.sequelize.query(`
      UPDATE n8n_integrations
      SET "isPremium" = true
      FROM users
      WHERE n8n_integrations."userId" = users.id
      AND users."isPremium" = true
    `);
    
    // Remove isPremium column from users table
    await queryInterface.removeColumn('users', 'isPremium');
  }
};
