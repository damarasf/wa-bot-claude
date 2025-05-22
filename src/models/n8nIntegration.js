const { Model, DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize) => {
  class N8nIntegration extends Model {
    static associate(models) {
      // define associations here
      N8nIntegration.belongsTo(models.User, { foreignKey: 'userId' });
    }
  }

  N8nIntegration.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
      allowNull: false
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    sessionExpiry: {
      type: DataTypes.DATE,
      allowNull: true
    },
    dailyLimit: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 50 // Default limit for regular users
    },
    usageCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },    lastResetDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE
    },
    updatedAt: {
      allowNull: false,
      type: DataTypes.DATE
    }
  }, {
    sequelize,
    modelName: 'N8nIntegration',
    tableName: 'n8n_integrations',
    timestamps: true
  });

  return N8nIntegration;
};
