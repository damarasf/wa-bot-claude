/**
 * Simple test script to verify the note functionality with the database
 */
require('dotenv').config();
const db = require('../models');
const noteHandler = require('../handlers/noteHandler');
const { v4: uuidv4 } = require('uuid');

// Test user ID (will be generated)
let testUserId;

// Test note IDs
let testNoteId;

// Test the note functionality
const testNotes = async () => {
  try {
    console.log('Testing note functionality...');
    
    // Initialize database connection
    await db.sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Create a test user for notes (if users table exists)
    try {      const testUser = await db.User.create({
        phoneNumber: '9876543210',
        isAdmin: false
      });
      
      testUserId = testUser.id;
      console.log('Created test user with ID:', testUserId);
    } catch (error) {
      // If this fails, generate a UUID to use
      console.log('Could not create test user, using generated UUID');
      testUserId = uuidv4();
    }
    
    // 1. Test creating a note
    console.log('\n1. Testing note creation...');
    const createResult = await noteHandler.createNote(
      testUserId,
      'Test Note',
      'This is a test note content for testing purposes.',
      ['test', 'important']
    );
    
    if (!createResult.success) {
      throw new Error(`Failed to create note: ${createResult.message}`);
    }
    
    console.log('Note created successfully:', createResult.note.id);
    testNoteId = createResult.note.id;
    
    // 2. Test getting all notes for user
    console.log('\n2. Testing get all notes...');
    const allNotesResult = await noteHandler.getUserNotes(testUserId);
    
    if (!allNotesResult.success) {
      throw new Error(`Failed to get notes: ${allNotesResult.message}`);
    }
    
    console.log(`Found ${allNotesResult.count} notes for user`);
    
    // 3. Test getting a single note by ID
    console.log('\n3. Testing get note by ID...');
    const getNoteResult = await noteHandler.getNoteById(testNoteId, testUserId);
    
    if (!getNoteResult.success) {
      throw new Error(`Failed to get note: ${getNoteResult.message}`);
    }
    
    console.log('Retrieved note:', getNoteResult.note.title);
    
    // 4. Test updating a note
    console.log('\n4. Testing note update...');
    const updateResult = await noteHandler.updateNote(
      testNoteId,
      testUserId,
      {
        title: 'Updated Test Note',
        content: 'This note content has been updated.',
        tags: ['test', 'important', 'updated']
      }
    );
    
    if (!updateResult.success) {
      throw new Error(`Failed to update note: ${updateResult.message}`);
    }
    
    console.log('Note updated successfully:', updateResult.note.title);
    
    // 5. Test searching for notes
    console.log('\n5. Testing note search...');
    const searchResult = await noteHandler.searchNotes(testUserId, 'updated');
    
    if (!searchResult.success) {
      throw new Error(`Failed to search notes: ${searchResult.message}`);
    }
    
    console.log(`Found ${searchResult.count} notes matching search query`);
    
    // 6. Test deleting a note
    console.log('\n6. Testing note deletion...');
    const deleteResult = await noteHandler.deleteNote(testNoteId, testUserId);
    
    if (!deleteResult.success) {
      throw new Error(`Failed to delete note: ${deleteResult.message}`);
    }
    
    console.log('Note deleted successfully');
    
    // Verify the note is deleted
    console.log('\nVerifying note deletion...');
    const verifyDeletion = await noteHandler.getNoteById(testNoteId, testUserId);
    
    if (verifyDeletion.success) {
      throw new Error('Note still exists after deletion!');
    } else {
      console.log('Verified note was deleted:', verifyDeletion.message);
    }
    
    console.log('\nNote test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Close database connection
    await db.sequelize.close();
    process.exit(0);
  }
};

// Run the test
testNotes();
