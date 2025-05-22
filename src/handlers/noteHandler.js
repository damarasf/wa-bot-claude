const db = require('../models');
const { Op } = require('sequelize');

/**
 * Create a new note for a user
 * @param {string} userId - The user ID
 * @param {string} title - The note title
 * @param {string} content - The note content
 * @param {Array<string>} tags - Optional tags for the note
 * @returns {Promise<Object>} - Created note object or error message
 */
const createNote = async (userId, title, content, tags = []) => {
  try {
    // Create the note
    const note = await db.Note.create({
      userId,
      title,
      content,
      tags: tags.map(tag => tag.trim())
    });

    return {
      success: true,
      message: 'Note created successfully',
      note
    };
  } catch (error) {
    console.error('Error creating note:', error);
    return {
      success: false,
      message: 'Failed to create note',
      error: error.message
    };
  }
};

/**
 * Get all notes for a user
 * @param {string} userId - The user ID
 * @returns {Promise<Object>} - Notes array or error message
 */
const getUserNotes = async (userId) => {
  try {
    const notes = await db.Note.findAll({
      where: { userId },
      order: [['updatedAt', 'DESC']]
    });

    return {
      success: true,
      count: notes.length,
      notes
    };
  } catch (error) {
    console.error('Error getting user notes:', error);
    return {
      success: false,
      message: 'Failed to get notes',
      error: error.message
    };
  }
};

/**
 * Get a specific note by ID
 * @param {string} noteId - The note ID
 * @param {string} userId - The user ID (for verification)
 * @returns {Promise<Object>} - Note object or error message
 */
const getNoteById = async (noteId, userId) => {
  try {
    const note = await db.Note.findOne({
      where: { 
        id: noteId,
        userId // Ensure the note belongs to this user
      }
    });

    if (!note) {
      return {
        success: false,
        message: 'Note not found or you do not have access to it'
      };
    }

    return {
      success: true,
      note
    };
  } catch (error) {
    console.error('Error getting note:', error);
    return {
      success: false,
      message: 'Failed to get note',
      error: error.message
    };
  }
};

/**
 * Update an existing note
 * @param {string} noteId - The note ID
 * @param {string} userId - The user ID (for verification)
 * @param {Object} updates - The fields to update
 * @returns {Promise<Object>} - Updated note or error message
 */
const updateNote = async (noteId, userId, updates) => {
  try {
    // Find the note and make sure it belongs to this user
    const note = await db.Note.findOne({
      where: { 
        id: noteId,
        userId
      }
    });

    if (!note) {
      return {
        success: false,
        message: 'Note not found or you do not have access to it'
      };
    }

    // Update the note
    await note.update(updates);

    return {
      success: true,
      message: 'Note updated successfully',
      note
    };
  } catch (error) {
    console.error('Error updating note:', error);
    return {
      success: false,
      message: 'Failed to update note',
      error: error.message
    };
  }
};

/**
 * Delete a note
 * @param {string} noteId - The note ID
 * @param {string} userId - The user ID (for verification)
 * @returns {Promise<Object>} - Success message or error
 */
const deleteNote = async (noteId, userId) => {
  try {
    // Find the note and make sure it belongs to this user
    const note = await db.Note.findOne({
      where: { 
        id: noteId,
        userId
      }
    });

    if (!note) {
      return {
        success: false,
        message: 'Note not found or you do not have access to it'
      };
    }

    // Delete the note
    await note.destroy();

    return {
      success: true,
      message: 'Note deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting note:', error);
    return {
      success: false,
      message: 'Failed to delete note',
      error: error.message
    };
  }
};

/**
 * Search for notes by title, content or tags
 * @param {string} userId - The user ID
 * @param {string} query - The search query
 * @returns {Promise<Object>} - Matching notes or error message
 */
const searchNotes = async (userId, query) => {
  try {
    const notes = await db.Note.findAll({
      where: {
        userId,
        [Op.or]: [
          { title: { [Op.iLike]: `%${query}%` } },
          { content: { [Op.iLike]: `%${query}%` } },
          { tags: { [Op.contains]: [query] } }
        ]
      },
      order: [['updatedAt', 'DESC']]
    });

    return {
      success: true,
      count: notes.length,
      notes
    };
  } catch (error) {
    console.error('Error searching notes:', error);
    return {
      success: false,
      message: 'Failed to search notes',
      error: error.message
    };
  }
};

module.exports = {
  createNote,
  getUserNotes,
  getNoteById,
  updateNote,
  deleteNote,
  searchNotes
};
