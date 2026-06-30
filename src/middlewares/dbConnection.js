import Institution from '../models/Institution.js';
import { getInstitutionConnection, createInstitutionModels } from '../services/dbService.js';

/**
 * Middleware to set up institution-specific database connection
 * This middleware should be used for routes that need to access institution-specific data
 */
export async function setupInstitutionDb(req, res, next) {
  try {
    const { institutionId } = req.params;
    
    if (!institutionId) {
      return res.status(400).json({ message: 'Institution ID is required' });
    }
    
    // Check if institution exists in master database
    const institution = await Institution.findById(institutionId);
    if (!institution) {
      return res.status(404).json({ message: 'Institution not found' });
    }
    
    // Check if institution database has been created
    if (!institution.dbCreated) {
      return res.status(400).json({ 
        message: 'Institution database has not been properly initialized' 
      });
    }
    
    // Get connection to institution database
    const connection = await getInstitutionConnection(institutionId);
    
    // Create models for this connection
    const models = createInstitutionModels(connection);
    
    // Attach models to request object for use in controllers
    req.institutionDb = {
      connection,
      models,
      institution
    };
    
    next();
  } catch (error) {
    console.error('Error in setupInstitutionDb middleware:', error);
    res.status(500).json({ message: 'Database connection error' });
  }
}