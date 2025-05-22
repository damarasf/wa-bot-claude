// filepath: d:\Coding\wa-bot-claude\src\commands\noteCommand.js
const noteHandler = require('../handlers/noteHandler');
const userHandler = require('../handlers/userHandler');
const logger = require('../utils/logger');
const formatter = require('../utils/formatter');
const validator = require('../utils/validator');

/**
 * Add a new note
 * @param {object} client - The WhatsApp client
 * @param {object} message - The message object
 * @returns {Promise<void>}
 */
const addNote = async (client, message) => {
  try {
    const { body, from, id } = message;
    const phoneNumber = message.sender.id.split('@')[0];
    
    // Format: !note add Title | Content | tag1, tag2
    const args = body.substring(body.indexOf(' ')).trim();
    
    // Split by the first pipe character
    const parts = args.split('|');
    
    if (parts.length < 2) {
      await client.reply(
        from,
        formatter.error(
          'Invalid format', 
          'Use: !note add Title | Content | tag1, tag2\n\nThe tags section is optional.'
        ),
        id
      );
      return;
    }
    
    const title = parts[0].replace('add', '').trim();
    const content = parts[1].trim();
    const tags = parts.length > 2 ? parts[2].split(',').map(tag => tag.trim()) : [];
    
    if (title.length < 3 || title.length > 100) {
      await client.reply(
        from,
        formatter.error(
          'Invalid title', 
          'Title must be between 3 and 100 characters.'
        ),
        id
      );
      return;
    }
    
    if (content.length < 1 || content.length > 1000) {
      await client.reply(
        from,
        formatter.error(
          'Invalid content', 
          'Content must be between 1 and 1000 characters.'
        ),
        id
      );
      return;
    }
    
    // Get user from phone number
    const user = await userHandler.isUserRegistered(phoneNumber);
    
    if (!user) {
      await client.reply(
        from,
        formatter.error(
          'Not registered', 
          'You need to be registered to use this feature. Use !register to register.'
        ),
        id
      );
      return;
    }
    
    // Create note
    const result = await noteHandler.createNote(user.id, title, content, tags);
    
    if (result.success) {
      await client.reply(
        from,
        formatter.success(
          'Note added', 
          {
            'Title': title,
            'Content': content.length > 50 ? `${content.substring(0, 50)}...` : content,
            'Tags': tags.length > 0 ? tags.join(', ') : 'None',
            'ID': result.note.id
          }
        ),
        id
      );
      
      logger.logCommand(phoneNumber, 'note add', true);
    } else {
      await client.reply(
        from,
        formatter.error('Failed to add note', result.message),
        id
      );
      
      logger.logCommand(phoneNumber, 'note add', false, result.message);
    }
    
  } catch (error) {
    logger.logError('noteCommand.addNote', error);
    
    await client.reply(
      message.from,
      formatter.error('Error', 'Failed to add note. Please try again.'),
      message.id
    );
  }
};

/**
 * List all notes for the user
 * @param {object} client - The WhatsApp client
 * @param {object} message - The message object
 * @returns {Promise<void>}
 */
const listNotes = async (client, message) => {
  try {
    const { from, id } = message;
    const phoneNumber = message.sender.id.split('@')[0];
    
    // Get user from phone number
    const user = await userHandler.isUserRegistered(phoneNumber);
    
    if (!user) {
      await client.reply(
        from,
        formatter.error(
          'Not registered', 
          'You need to be registered to use this feature. Use !register to register.'
        ),
        id
      );
      return;
    }
    
    // Get all notes for the user
    const result = await noteHandler.getUserNotes(user.id);
    
    if (!result.success) {
      await client.reply(
        from,
        formatter.error('Failed to retrieve notes', result.message),
        id
      );
      return;
    }
    
    if (result.notes.length === 0) {
      await client.reply(
        from,
        formatter.info('No notes', 'You have not added any notes yet.'),
        id
      );
      return;
    }
    
    // Format the notes for display
    let notesList = '';
    result.notes.forEach((note, index) => {
      if (index < 15) { // Limit to 15 notes to avoid too long messages
        notesList += `${index + 1}. *${note.title}*\n`;
        
        // Show a snippet of content
        const contentSnippet = note.content.length > 40 
          ? `${note.content.substring(0, 40)}...` 
          : note.content;
        
        notesList += `   ${contentSnippet}\n`;
        
        // Show tags if any
        if (note.tags.length > 0) {
          notesList += `   📌 ${note.tags.join(', ')}\n`;
        }
        
        notesList += `   🆔 ${note.id}\n\n`;
      }
    });
    
    // Add a message if not all notes are shown
    if (result.notes.length > 15) {
      notesList += `_...and ${result.notes.length - 15} more notes._\n\n`;
    }
    
    // Add instruction for viewing a specific note
    notesList += 'To view a specific note, use !note [id]';
    
    await client.reply(
      from,
      formatter.info(
        `📋 Your Notes (${result.notes.length})`,
        notesList
      ),
      id
    );
    
    logger.logCommand(phoneNumber, 'note list', true);
  } catch (error) {
    logger.logError('noteCommand.listNotes', error);
    
    await client.reply(
      message.from,
      formatter.error('Error', 'Failed to list notes. Please try again.'),
      message.id
    );
  }
};

/**
 * View a specific note
 * @param {object} client - The WhatsApp client
 * @param {object} message - The message object
 * @param {string} noteId - The note ID
 * @returns {Promise<void>}
 */
const viewNote = async (client, message, noteId) => {
  try {
    const { from, id } = message;
    const phoneNumber = message.sender.id.split('@')[0];
    
    // Get user from phone number
    const user = await userHandler.isUserRegistered(phoneNumber);
    
    if (!user) {
      await client.reply(
        from,
        formatter.error(
          'Not registered', 
          'You need to be registered to use this feature. Use !register to register.'
        ),
        id
      );
      return;
    }
    
    // Get the specific note
    const result = await noteHandler.getNoteById(noteId, user.id);
    
    if (!result.success) {
      await client.reply(
        from,
        formatter.error('Note not found', 'The requested note does not exist or you do not have access to it.'),
        id
      );
      return;
    }
    
    const { note } = result;
    
    // Format the note display
    const noteInfo = {
      'Title': note.title,
      'Content': note.content,
      'Tags': note.tags.length > 0 ? note.tags.join(', ') : 'None',
      'Created': new Date(note.createdAt).toLocaleString(),
      'Last updated': new Date(note.updatedAt).toLocaleString()
    };
    
    await client.reply(
      from,
      formatter.info(`📝 Note: ${note.title}`, noteInfo),
      id
    );
    
    logger.logCommand(phoneNumber, 'note view', true);
  } catch (error) {
    logger.logError('noteCommand.viewNote', error);
    
    await client.reply(
      message.from,
      formatter.error('Error', 'Failed to retrieve note. Please try again.'),
      message.id
    );
  }
};

/**
 * Delete a specific note
 * @param {object} client - The WhatsApp client
 * @param {object} message - The message object
 * @param {string} noteId - The note ID
 * @returns {Promise<void>}
 */
const deleteNote = async (client, message, noteId) => {
  try {
    const { from, id } = message;
    const phoneNumber = message.sender.id.split('@')[0];
    
    // Get user from phone number
    const user = await userHandler.isUserRegistered(phoneNumber);
    
    if (!user) {
      await client.reply(
        from,
        formatter.error(
          'Not registered', 
          'You need to be registered to use this feature. Use !register to register.'
        ),
        id
      );
      return;
    }
    
    // Delete the note
    const result = await noteHandler.deleteNote(noteId, user.id);
    
    if (!result.success) {
      await client.reply(
        from,
        formatter.error('Failed to delete note', result.message),
        id
      );
      return;
    }
    
    await client.reply(
      from,
      formatter.success('Note deleted', 'The note has been deleted successfully.'),
      id
    );
    
    logger.logCommand(phoneNumber, 'note delete', true);
  } catch (error) {
    logger.logError('noteCommand.deleteNote', error);
    
    await client.reply(
      message.from,
      formatter.error('Error', 'Failed to delete note. Please try again.'),
      message.id
    );
  }
};

/**
 * Search notes
 * @param {object} client - The WhatsApp client
 * @param {object} message - The message object
 * @param {string} query - The search query
 * @returns {Promise<void>}
 */
const searchNotes = async (client, message, query) => {
  try {
    const { from, id } = message;
    const phoneNumber = message.sender.id.split('@')[0];
    
    if (!query || query.trim().length < 2) {
      await client.reply(
        from,
        formatter.error('Invalid query', 'Search query must be at least 2 characters long.'),
        id
      );
      return;
    }
    
    // Get user from phone number
    const user = await userHandler.isUserRegistered(phoneNumber);
    
    if (!user) {
      await client.reply(
        from,
        formatter.error(
          'Not registered', 
          'You need to be registered to use this feature. Use !register to register.'
        ),
        id
      );
      return;
    }
    
    // Search for notes
    const result = await noteHandler.searchNotes(user.id, query.trim());
    
    if (!result.success) {
      await client.reply(
        from,
        formatter.error('Search failed', result.message),
        id
      );
      return;
    }
    
    if (result.notes.length === 0) {
      await client.reply(
        from,
        formatter.info('No results', `No notes found matching "${query}".`),
        id
      );
      return;
    }
    
    // Format the search results
    let notesList = '';
    result.notes.forEach((note, index) => {
      if (index < 10) { // Limit to 10 results
        notesList += `${index + 1}. *${note.title}*\n`;
        
        // Show a snippet of content
        const contentSnippet = note.content.length > 40 
          ? `${note.content.substring(0, 40)}...` 
          : note.content;
        
        notesList += `   ${contentSnippet}\n`;
        
        // Show tags if any
        if (note.tags.length > 0) {
          notesList += `   📌 ${note.tags.join(', ')}\n`;
        }
        
        notesList += `   🆔 ${note.id}\n\n`;
      }
    });
    
    // Add a message if not all results are shown
    if (result.notes.length > 10) {
      notesList += `_...and ${result.notes.length - 10} more results._\n\n`;
    }
    
    // Add instruction for viewing a specific note
    notesList += 'To view a specific note, use !note [id]';
    
    await client.reply(
      from,
      formatter.info(
        `🔍 Search Results for "${query}" (${result.notes.length})`,
        notesList
      ),
      id
    );
    
    logger.logCommand(phoneNumber, 'note search', true);
  } catch (error) {
    logger.logError('noteCommand.searchNotes', error);
    
    await client.reply(
      message.from,
      formatter.error('Error', 'Failed to search notes. Please try again.'),
      message.id
    );
  }
};

/**
 * Main handler for note commands
 * @param {object} client - The WhatsApp client
 * @param {object} message - The message object
 * @returns {Promise<void>}
 */
const handleNoteCommand = async (client, message) => {
  try {
    const { body, from, id } = message;
    const parts = body.trim().split(' ');
    
    // Format: !note action [params]
    if (parts.length < 2) {
      await client.reply(
        from,
        formatter.error(
          'Invalid format', 
          'Use one of the following commands:\n\n' +
          '!note add Title | Content | tag1, tag2\n' +
          '!note list\n' +
          '!note [note-id]\n' +
          '!note delete [note-id]\n' +
          '!note search [query]'
        ),
        id
      );
      return;
    }
    
    const subCommand = parts[1].toLowerCase();
    
    switch (subCommand) {
      case 'add':
        await addNote(client, message);
        break;
        
      case 'list':
        await listNotes(client, message);
        break;
        
      case 'delete':
        if (parts.length < 3) {
          await client.reply(
            from,
            formatter.error('Invalid format', 'Use: !note delete [note-id]'),
            id
          );
          return;
        }
        await deleteNote(client, message, parts[2]);
        break;
        
      case 'search':
        if (parts.length < 3) {
          await client.reply(
            from,
            formatter.error('Invalid format', 'Use: !note search [query]'),
            id
          );
          return;
        }
        
        const searchQuery = parts.slice(2).join(' ');
        await searchNotes(client, message, searchQuery);
        break;
        
      default:
        // If it's not a known command, assume it's a note ID for viewing
        await viewNote(client, message, subCommand);
    }
  } catch (error) {
    logger.logError('noteCommand.handleNoteCommand', error);
    
    await client.reply(
      message.from,
      formatter.error('Error', 'An error occurred while processing your command.'),
      message.id
    );
  }
};

module.exports = {
  handleNoteCommand
};
