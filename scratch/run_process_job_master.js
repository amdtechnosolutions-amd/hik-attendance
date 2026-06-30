import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { processSyncJob } from '/home/amdtechno/projects/hik-attendance/src/services/syncJobService.js';
import { connectMaster, getInstitutionConnection, createInstitutionModels } from '/home/amdtechno/projects/hik-attendance/src/services/dbService.js';

dotenv.config({ path: '/home/amdtechno/projects/hik-attendance/.env' });

async function runProcessJob() {
  const institutionId = '68e0e148f633a16a99a9df2e';
  const jobId = '69f065441acf93832f36a8f7';
  
  try {
    console.log('Connecting to master DB...');
    await connectMaster();
    
    console.log(`Connecting to institution DB for ${institutionId}...`);
    const connection = await getInstitutionConnection(institutionId);
    const models = createInstitutionModels(connection);
    
    const job = await models.SyncJob.findById(jobId);
    if (!job) {
      console.log('Job not found');
      return;
    }
    
    console.log(`Processing job ${jobId}...`);
    await processSyncJob(job, models);
    console.log('Job processing finished.');
    
    await connection.close();
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

runProcessJob();
