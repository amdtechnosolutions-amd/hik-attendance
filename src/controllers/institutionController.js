import Institution from '../models/Institution.js';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { getInstitutionConnection, createInstitutionModels, closeConnection } from '../services/dbService.js';

export async function createInstitution(req, res) {
  try {
    const { name, shortName, email, password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    
    // First create the institution record in the master database
    const inst = await Institution.create({ 
      name, 
      shortName, 
      email, 
      passwordHash: hash,
      dbCreated: false,
      dbName: null
    });
    
    // Now create a separate database for this institution
    try {
      // Generate database name using institution's shortName
      const dbName = `ves_${shortName.toLowerCase()}`;
      
      // Create a connection to the new database
      const connection = await getInstitutionConnection(inst._id.toString());
      
      // Create the models in the new database
      const models = createInstitutionModels(connection);
      
      // Update the institution record to mark database as created
      await Institution.findByIdAndUpdate(inst._id, {
        dbCreated: true,
        dbName: dbName
      });
      
      // Return the updated institution data
      const updatedInst = await Institution.findById(inst._id).select('-passwordHash');
      res.json(updatedInst);
    } catch (dbError) {
      console.error('Error creating institution database:', dbError);
      
      // If database creation fails, delete the institution record
      await Institution.findByIdAndDelete(inst._id);
      
      throw new Error('Failed to create institution database: ' + dbError.message);
    }
  } catch (err) {
    console.error('Error in createInstitution:', err);
    res.status(500).json({ message: err.message });
  }
}

export async function listInstitutions(req, res) {
  const list = await Institution.find().select('-passwordHash');
  res.json(list);
}

export async function updateInstitution(req, res) {
  const { id } = req.params;
  const { name, email, password } = req.body;
  const update = {};
  if (name) update.name = name;
  if (email) update.email = email;
  if (password) update.passwordHash = await bcrypt.hash(password, 10);

  const inst = await Institution.findByIdAndUpdate(id, update, { new: true }).select('-passwordHash');
  res.json(inst);
}

export async function deleteInstitution(req, res) {
  try {
    const { id } = req.params;
    
    // Find the institution to get its database name
    const institution = await Institution.findById(id);
    if (!institution) {
      return res.status(404).json({ message: 'Institution not found' });
    }
    
    // If the institution has a database, drop it
    if (institution.dbCreated && institution.dbName) {
      try {
        // Get the connection to the institution database
        const connection = await getInstitutionConnection(id);
        
        // Drop the database
        await connection.dropDatabase();
        console.log(`Dropped database ${institution.dbName}`);
        
        // Close and remove the connection using the closeConnection function
        await closeConnection(id);
      } catch (dbError) {
        console.error(`Error dropping database for institution ${id}:`, dbError);
        // Continue with deletion even if dropping the database fails
      }
    }
    
    // Delete the institution from the master database
    await Institution.findByIdAndDelete(id);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error in deleteInstitution:', error);
    res.status(500).json({ message: error.message });
  }
}

export default { createInstitution, listInstitutions, updateInstitution, deleteInstitution };
